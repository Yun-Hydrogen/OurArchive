import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type {
  PackageBackground,
  PackageBackgroundCategory,
  PackageCharacter,
  PackageContent,
  PackageMusic,
  PackageSkeleton,
  PackageSkeletonItem,
  PackageSound,
  PackageSoundCategory,
  ResourcePackage,
} from '@our-archive/shared';
import { getStoragePaths, type StoragePaths } from './paths.js';

/**
 * 跨端 DTO 统一由 `@our-archive/shared` 提供，服务端只做读取与派生。
 * 这里重新导出，让 `routes/` 与文档不必记住两个来源。
 */
export type {
  PackageBackground,
  PackageBackgroundCategory,
  PackageCharacter,
  PackageContent,
  PackageMusic,
  PackageSkeleton,
  PackageSkeletonItem,
  PackageSound,
  PackageSoundCategory,
  ResourcePackage,
} from '@our-archive/shared';

/** 资源包清单文件名：`res/<包名>/package.yml` */
export const PACKAGE_MANIFEST_FILE_NAME = 'package.yml';

/** hasCharacter 分类的缺省索引文件与头像目录 */
export const DEFAULT_CHARACTER_INDEX = 'characters.json';
export const DEFAULT_AVATAR_DIR = 'avatars';

/** BackgroundMusic 分类的曲目索引：`<path>/index/music_info.json` */
export const MUSIC_INDEX_DIR = 'index';
export const MUSIC_INDEX_FILE = 'music_info.json';

/** Sounds 分类的音效索引与类别映射：`<path>/index/sound_info.json` / `categories.json` */
export const SOUND_INDEX_DIR = 'index';
export const SOUND_INFO_FILE = 'sound_info.json';
export const SOUND_CATEGORIES_FILE = 'categories.json';

/** Backgrounds 分类的类别清单：`<path>/index/category.yml` */
export const BACKGROUND_INDEX_DIR = 'index';
export const BACKGROUND_CATEGORY_FILE = 'category.yml';

/** 未分类（直接放在背景目录根下一层的图片）的展示名 */
export const BACKGROUND_UNCATEGORIZED_LABEL = '未分类';

/**
 * 资源包内静态资源的访问前缀。
 * 与 `routes/packages.ts` 里挂载的路由保持一致。
 */
export function buildAssetUrl(
  packageId: string,
  kind: 'avatar' | 'skeleton' | 'music' | 'sounds' | 'backgrounds',
  relative: string
): string {
  const encoded = relative
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/api/packages/${encodeURIComponent(packageId)}/${kind}/${encoded}`;
}

/**
 * package.yml 中已知的内容分类 → 中文展示名。
 *
 * 分类键是**外载格式**：骨骼 / 表情 / 音效 / 背景 / 背景音乐为 PascalCase，
 * 角色为 camelCase `hasCharacter`。这里原样匹配、**不做大小写归一**，
 * 新增分类先加约定再往这里加条目。
 */
export const PACKAGE_CONTENT_LABELS: Record<string, string> = {
  Emotions: '表情',
  Sounds: '音效',
  Skeletons: '骨骼',
  Backgrounds: '背景',
  BackgroundMusic: '背景音乐',
  hasCharacter: '角色',
};

function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return asText(value).toLowerCase() === 'true';
}

/** 数一个目录**根下一层**的图片文件数（不递归、不算子目录） */
function countImagesInDir(dir: string): number {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(
        (entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ).length;
  } catch {
    return 0;
  }
}

/**
 * 背景图片计数：有 `index/category.yml` 时把清单里各分类目录的图片也数上，
 * 再加根目录下的松散图片。只读目录项，不 `stat`。
 */
function countBackgroundImages(root: string): number {
  let total = 0;
  const seen = new Set<string>();
  const categoryFile = path.join(root, BACKGROUND_INDEX_DIR, BACKGROUND_CATEGORY_FILE);

  try {
    const parsed = parseYaml(
      fs.readFileSync(categoryFile, 'utf-8').replace(/^\uFEFF/, '')
    ) as { category?: unknown } | null;
    const list = parsed?.category;
    if (Array.isArray(list)) {
      for (const raw of list) {
        if (!raw || typeof raw !== 'object') {
          continue;
        }
        const record = raw as Record<string, unknown>;
        const relativePath = asText(record.path) || asText(record.id);
        if (!relativePath) {
          continue;
        }
        const target = path.resolve(root, relativePath);
        if (seen.has(target) || !fs.existsSync(target)) {
          continue;
        }
        seen.add(target);
        total += countImagesInDir(target);
      }
    }
  } catch {
    // 清单缺失或坏了就只数根目录
  }

  total += countImagesInDir(root);
  return total;
}

/**
 * 统计某个内容目录的条目数：
 * - `hasCharacter`：优先读目录下的 characters.json，返回角色条目数
 * - 其它：返回一级条目数（骨骼 = 立绘目录数）
 */
function countEntries(dir: string, key: string): { exists: boolean; count: number } {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return { exists: false, count: 0 };
  }

  if (key === 'hasCharacter') {
    const indexFile = entries.find(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json')
    );
    if (indexFile) {
      try {
        const parsed = JSON.parse(
          fs.readFileSync(path.join(dir, indexFile.name), 'utf-8').replace(/^\uFEFF/, '')
        );
        if (Array.isArray(parsed)) {
          return { exists: true, count: parsed.length };
        }
      } catch {
        // 索引坏了就退回目录条目数
      }
    }
  }

  // 背景音乐按曲目索引计条目数，不把 index/ 与音频文件混起来数
  if (key === 'BackgroundMusic') {
    const musicIndex = path.join(dir, MUSIC_INDEX_DIR, MUSIC_INDEX_FILE);
    try {
      const parsed = JSON.parse(fs.readFileSync(musicIndex, 'utf-8').replace(/^\uFEFF/, ''));
      if (Array.isArray(parsed)) {
        return { exists: true, count: parsed.length };
      }
    } catch {
      // 没有索引文件就退回目录条目数
    }
  }

  // 音效按音效索引计条目数，不把 index/ 与音频文件混起来数
  if (key === 'Sounds') {
    const soundIndex = path.join(dir, SOUND_INDEX_DIR, SOUND_INFO_FILE);
    try {
      const parsed = JSON.parse(fs.readFileSync(soundIndex, 'utf-8').replace(/^\uFEFF/, ''));
      if (Array.isArray(parsed)) {
        return { exists: true, count: parsed.length };
      }
    } catch {
      // 没有索引文件就退回目录条目数
    }
  }

  // 背景按图片数计（有 category.yml 时逐个分类目录数），不把 index/ 与子目录算进去
  if (key === 'Backgrounds') {
    const total = countBackgroundImages(dir);
    if (total > 0) {
      return { exists: true, count: total };
    }
  }

  return { exists: true, count: entries.length };
}

/** package_content 条目里除内容类型以外的字段 */
const CONTENT_RESERVED_KEYS = new Set(['supported', 'path', 'index', 'avatar', 'name', 'description']);

function buildPackageContent(packageRoot: string, key: string, config: Record<string, unknown>): PackageContent {
  const relativePath = asText(config.path).replace(/^[/\\]+/, '');
  const supported = asBool(config.supported);

  // 路径只允许落在资源包目录内部
  const resolved = relativePath ? path.resolve(packageRoot, relativePath) : '';
  const inside = Boolean(resolved) && (resolved === packageRoot || resolved.startsWith(packageRoot + path.sep));
  const stats = supported && inside ? countEntries(resolved, key) : { exists: false, count: 0 };

  return {
    key,
    label: PACKAGE_CONTENT_LABELS[key] ?? key,
    supported,
    path: relativePath,
    index: asText(config.index) || (key === 'hasCharacter' ? DEFAULT_CHARACTER_INDEX : ''),
    avatar: asText(config.avatar) || (key === 'hasCharacter' ? DEFAULT_AVATAR_DIR : ''),
    exists: stats.exists,
    count: stats.count,
  };
}

/**
 * 解析 package_content。两种写法都支持：
 *
 * ```yaml
 * # 扁平写法（当前默认包使用的写法）
 * - Emotions:
 *   supported: false
 *   path: emotions
 *
 * # 嵌套写法
 * - Emotions:
 *     supported: false
 *     path: emotions
 * ```
 */
function parsePackageContents(packageDir: string, raw: unknown): PackageContent[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const root = path.resolve(packageDir);
  const contents: PackageContent[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    let hasNested = false;

    for (const [key, value] of Object.entries(record)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }
      contents.push(buildPackageContent(root, key, value as Record<string, unknown>));
      hasNested = true;
    }

    if (hasNested) {
      continue;
    }

    const typeKey = Object.keys(record).find((key) => !CONTENT_RESERVED_KEYS.has(key));
    if (!typeKey) {
      continue;
    }

    // 形如 `- Emotions: emotions` 时把值当作路径
    const typeValue = record[typeKey];
    const config = typeof typeValue === 'string' ? { ...record, path: record.path ?? typeValue } : record;
    contents.push(buildPackageContent(root, typeKey, config));
  }

  return contents;
}


function readResourcePackage(packageDir: string, id: string): ResourcePackage | null {
  const manifest = path.join(packageDir, PACKAGE_MANIFEST_FILE_NAME);
  if (!fs.existsSync(manifest)) {
    return null;
  }

  const base: ResourcePackage = {
    id,
    name: id,
    description: '',
    version: '',
    author: '',
    updatedAt: '',
    valid: false,
    contents: [],
  };

  try {
    base.updatedAt = fs.statSync(manifest).mtime.toISOString();
  } catch {
    // 取不到时间就不显示
  }

  let parsed: unknown;
  try {
    // package.yml 由开发者手写，可能带 BOM
    const content = fs.readFileSync(manifest, 'utf-8').replace(/^\uFEFF/, '');
    parsed = parseYaml(content);
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!Array.isArray(parsed)) {
    return { ...base, error: 'package.yml 顶层应为列表' };
  }

  let info: Record<string, unknown> | null = null;
  let contentRaw: unknown;

  for (const item of parsed) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (record.package_info && typeof record.package_info === 'object') {
      info = record.package_info as Record<string, unknown>;
    }
    if ('package_content' in record) {
      contentRaw = record.package_content;
    }
  }

  if (!info) {
    return { ...base, error: '缺少 package_info 段' };
  }

  return {
    ...base,
    name: asText(info.name) || id,
    description: asText(info.description),
    version: asText(info.version),
    author: asText(info.author),
    valid: true,
    contents: parsePackageContents(packageDir, contentRaw),
  };
}

/**
 * 扫描资源目录（`<root>/res`），把每个带 `package.yml` 的一级子目录识别为资源包。
 *
 * 只做文件索引：不校验内容完整性、不加载资源本体。
 */
export function scanResourcePackages(paths: StoragePaths = getStoragePaths()): ResourcePackage[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(paths.resDir, { withFileTypes: true });
  } catch {
    // 资源目录还没建立时前端显示空列表即可
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => readResourcePackage(path.join(paths.resDir, entry.name), entry.name))
    .filter((pkg): pkg is ResourcePackage => pkg !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/* ------------------------------ 单包读取 ------------------------------ */

/**
 * 校验资源包 id 并解析成绝对路径。
 * id 只允许一级目录名，任何分隔符都视为非法。
 */
export function resolvePackageDir(
  id: string,
  paths: StoragePaths = getStoragePaths()
): string | null {
  const safeId = String(id ?? '').trim();
  if (!safeId || safeId === '.' || safeId === '..' || /[\\/]/.test(safeId)) {
    return null;
  }

  const dir = path.join(paths.resDir, safeId);
  if (!fs.existsSync(path.join(dir, PACKAGE_MANIFEST_FILE_NAME))) {
    return null;
  }
  return dir;
}

/**
 * 把资源包内的相对路径解析成绝对路径，越界一律返回 null。
 */
export function resolveInside(baseDir: string, relativePath: string): string | null {
  const cleaned = String(relativePath ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (!cleaned || cleaned.split('/').includes('..')) {
    return null;
  }

  const base = path.resolve(baseDir);
  const target = path.resolve(base, cleaned);
  if (target !== base && !target.startsWith(base + path.sep)) {
    return null;
  }
  return target;
}

/**
 * 角色索引里的一条记录（`characters.json` 的原始字段）。
 *
 * ⚠️ 字段名是**外载格式**：`name_id` 为 snake_case，`spine` 指的是「立绘 id 列表」
 * （目录名，如 `fuuka_spr`），与前端语义「骨骼 / skeleton」等价。
 * 代码里一律用 `skeleton` 表述，仅此处保留外载原名。
 */
export interface PackageCharacterSource {
  name_id: string;
  name: string;
  school: string;
  club: string;
  avatar: string;
  spine: string[];
}

/** 从 package_content 里找某个分类的配置 */
function getContent(pkg: ResourcePackage, key: string): PackageContent | undefined {
  return pkg.contents.find((item) => item.key === key);
}

/**
 * 读取资源包的角色索引（`hasCharacter` 分类）。
 *
 * 索引文件名与头像目录名都来自 `package.yml`，缺省回退 `characters.json` / `avatars`。
 */
export function readPackageCharacters(
  packageDir: string,
  pkg: ResourcePackage
): PackageCharacter[] {
  const content = getContent(pkg, 'hasCharacter');
  if (!content || !content.supported) {
    return [];
  }

  const indexDir = resolveInside(packageDir, content.path);
  if (!indexDir) {
    return [];
  }

  const indexFile = resolveInside(
    indexDir,
    asText(content.index) || DEFAULT_CHARACTER_INDEX
  );
  if (!indexFile || !fs.existsSync(indexFile)) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(indexFile, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const avatarDirName = asText(content.avatar) || DEFAULT_AVATAR_DIR;
  const avatarDir = resolveInside(indexDir, avatarDirName);
  const skeletonContent = getContent(pkg, 'Skeletons');
  const skeletonDir = skeletonContent?.supported
    ? resolveInside(packageDir, skeletonContent.path)
    : null;

  const entries: PackageCharacter[] = [];

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const nameId = asText(record.name_id);
    if (!nameId) {
      continue;
    }

    const avatarFile = asText(record.avatar);
    const avatarPath = avatarDir && avatarFile ? resolveInside(avatarDir, avatarFile) : null;
    const hasAvatar = Boolean(avatarPath && fs.existsSync(avatarPath));

    const spines = (Array.isArray(record.spine) ? record.spine : [])
      .map((item) => asText(item))
      .filter(Boolean)
      .map((id) => {
        const spineDir = skeletonDir ? resolveInside(skeletonDir, id) : null;
        return { id, exists: Boolean(spineDir && fs.existsSync(spineDir)) };
      });

    entries.push({
      name_id: nameId,
      name: asText(record.name),
      school: asText(record.school),
      club: asText(record.club),
      avatar: hasAvatar ? avatarFile : '',
      avatarUrl: hasAvatar ? buildAssetUrl(pkg.id, 'avatar', avatarFile) : '',
      spine: spines.map((item) => item.id),
      spines,
      hasSkeleton: spines.some((item) => item.exists),
    });
  }

  return entries.sort((a, b) => a.name_id.localeCompare(b.name_id));
}

const AUDIO_EXTENSIONS = new Set([
  '.ogg',
  '.oga',
  '.mp3',
  '.wav',
  '.m4a',
  '.m4b',
  '.aac',
  '.flac',
  '.opus',
  '.webm',
  '.weba',
  '.aif',
  '.aiff',
]);

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
  '.gif',
  '.avif',
]);

/** 音频时长的轻量解析结果（秒，整数）；解析失败为 -1 */
const UNKNOWN_DURATION = -1;

/**
 * 从文件内容算音频时长（秒，保留整数）。
 *
 * 只覆盖 `packages.ts` 里 `AUDIO_EXTENSIONS` 常见的几种：
 * - WAV（PCM / WAVE_FORMAT_EXTENSIBLE）：解析 RIFF 的 `fmt ` 块拿采样率 / 位深 / 通道数，
 *   `data` 块给出字节数，时长 = 字节数 / (采样率 × 通道数 × 位深/8)。
 * - Ogg / Opus：按 Ogg 容器 + OpusHead（本包实际的格式）解析；非 Opus 直接回 -1，
 *   这里是「前端能显示时长」，不是要完整解码。
 *
 * 返回 -1 表示「现在算不出」，前端只会显示「时长未知」，不影响播放。
 */
function parseAudioDuration(filePath: string): number {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return UNKNOWN_DURATION;
  }

  // WAV
  if (buffer.length > 44 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    return parseWavDuration(buffer);
  }

  // Ogg / Opus
  if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === 'OggS') {
    return parseOggDuration(buffer);
  }

  // 其余格式回「未知」，前端不显示而不是 0
  return UNKNOWN_DURATION;
}

/**
 * 扫描 WAV 的 RIFF 块，算时长（秒，整数）。
 * fmt 块在前、data 块在后（有些文件还带 fact 块，这里按 8 字节头逐块走）。
 */
function parseWavDuration(buffer: Buffer): number {
  let offset = 12;
  let fmt: Buffer | null = null;
  let dataBytes = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === 'fmt ') {
      fmt = buffer.subarray(chunkDataStart, chunkDataStart + Math.min(chunkSize, 64));
    } else if (chunkId === 'data') {
      dataBytes = chunkSize;
      break;
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!fmt || fmt.length < 16 || dataBytes <= 0) {
    return UNKNOWN_DURATION;
  }

  const channels = fmt.readUInt16LE(2);
  const sampleRate = fmt.readUInt32LE(4);
  const byteRate = fmt.readUInt32LE(8);
  const blockAlign = fmt.readUInt16LE(12);
  const bitsPerSample = fmt.readUInt16LE(14) || 16;

  // 有些 mono WAV 把通道数写成了 0，按单通道兜底，不让时长误判回 -1。
  const safeChannels = channels > 0 && channels <= 64 ? channels : 1;
  const safeBits = bitsPerSample > 0 && bitsPerSample <= 64 ? bitsPerSample : 16;

  if (sampleRate <= 0) {
    return UNKNOWN_DURATION;
  }

  // 优先用 ByteRate（fmt 块写死的每秒字节数，最准）；没有时用
  // SampleRate * BlockAlign，BlockAlign = Channels * bitsPerSample / 8
  const bytesPerSecond =
    byteRate > 0
      ? byteRate
      : blockAlign > 0
        ? sampleRate * blockAlign
        : sampleRate * safeChannels * (safeBits / 8);

  if (bytesPerSecond <= 0) {
    return UNKNOWN_DURATION;
  }

  const seconds = dataBytes / bytesPerSecond;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return UNKNOWN_DURATION;
  }

  // 小数秒要保留一位小数的前端展示（0.6s 这种别塌成 0）
  return Math.max(0, Math.floor(seconds * 10) / 10);
}

/** OpusHead 路径：按 Ogg 容器 + OpusHead 解析时长（只覆盖 Opus，非 Opus 回 -1） */
function parseOggDuration(buffer: Buffer): number {
  // OpusHead 前 5 字节: "OpusHe" (0xOpusHead)
  const opusHeadIdx = buffer.indexOf(Buffer.from('OpusHead'));
  if (opusHeadIdx === -1) {
    return UNKNOWN_DURATION;
  }

  // 找 GranulePosition 在页面头
  const granuleOffset = opusHeadIdx > 22 ? 22 : 0;
  const granule = buffer.readBigUInt64LE(granuleOffset);
  const sampleRate = buffer.readUInt32LE(opusHeadIdx + 8);
  if (sampleRate <= 0) {
    return UNKNOWN_DURATION;
  }

  // 一页 granule 单位采样数，换算秒时会向上取补齐
  const seconds = Number(granule) / sampleRate;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return UNKNOWN_DURATION;
  }

  return Math.max(0, Math.floor(seconds));
}

/**
 * 读取 BackgroundMusic 分类的曲目列表。
 *
 * 约定：`<path>/index/music_info.json` 是曲目索引，音频文件直接放在 `<path>/` 下。
 * 索引里的 `original_filename` 决定播放哪个文件；缺失时退回「同名 + 任意音频后缀」。
 */
export function readPackageMusic(
  packageDir: string,
  pkg: ResourcePackage
): PackageMusic[] {
  const content = getContent(pkg, 'BackgroundMusic');
  if (!content || !content.supported) {
    return [];
  }

  const audioDir = resolveInside(packageDir, content.path);
  if (!audioDir) {
    return [];
  }

  const indexFile = resolveInside(audioDir, `${MUSIC_INDEX_DIR}/${MUSIC_INDEX_FILE}`);
  if (!indexFile || !fs.existsSync(indexFile)) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(indexFile, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  // 目录里的音频文件清单，用于「只给了 name_id」时兜底匹配
  let audioFiles: string[] = [];
  try {
    audioFiles = fs
      .readdirSync(audioDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name);
  } catch {
    audioFiles = [];
  }

  /** 在磁盘上找实际音频：优先 original_filename，否则按 name_id 模糊匹配 */
  function resolveAudio(nameId: string, filename: string): string | null {
    const candidates = [
      filename,
      `${nameId}${path.extname(filename) || '.ogg'}`,
      ...audioFiles.filter(
        (name) => name.toLowerCase() === `${nameId}${path.extname(name)}`.toLowerCase()
      ),
      ...audioFiles.filter(
        (name) => name.toLowerCase().startsWith(`${nameId.toLowerCase()}.`)
      ),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const full = resolveInside(audioDir, candidate);
      if (full && fs.existsSync(full)) {
        return candidate;
      }
    }
    return null;
  }

  const entries: PackageMusic[] = [];

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const nameId = asText(record.name_id);
    if (!nameId) {
      continue;
    }

    const declared = asText(record.original_filename);
    const resolved = resolveAudio(nameId, declared);
    const filename = resolved ?? declared;

    entries.push({
      name_id: nameId,
      filename,
      title: asText(record.title) || nameId,
      artist: asText(record.artist),
      description: asText(record.description),
      url: resolved ? buildAssetUrl(pkg.id, 'music', resolved) : '',
      exists: Boolean(resolved),
      duration: resolved ? parseAudioDuration(path.join(audioDir, resolved)) : UNKNOWN_DURATION,
    });
  }

  return entries;
}

/** 在 BackgroundMusic 目录里定位一个音频文件，越界或不存在返回 null */
export function resolveMusicFile(
  packageDir: string,
  pkg: ResourcePackage,
  filename: string
): string | null {
  const content = getContent(pkg, 'BackgroundMusic');
  if (!content || !content.supported) {
    return null;
  }

  const audioDir = resolveInside(packageDir, content.path);
  if (!audioDir) {
    return null;
  }

  const target = resolveInside(audioDir, filename);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return null;
  }
  if (!AUDIO_EXTENSIONS.has(path.extname(target).toLowerCase())) {
    return null;
  }
  return target;
}

/**
 * 读取 Sounds 分类的音效列表与类别映射。
 *
 * 约定：`<path>/index/sound_info.json` 是音效索引，`<path>/index/categories.json`
 * 是类别键 → 中文名映射；音频文件直接放在 `<path>/` 下。
 * 索引里的 `original_filename` 决定播放哪个文件；缺失时退回「同名 + 任意音频后缀」。
 * 类别在索引里不存在时，`categoryLabel` 回退为类别键本身（前端只分类不丢条目）。
 */
export function readPackageSounds(
  packageDir: string,
  pkg: ResourcePackage
): { sounds: PackageSound[]; categories: PackageSoundCategory[] } {
  const content = getContent(pkg, 'Sounds');
  if (!content || !content.supported) {
    return { sounds: [], categories: [] };
  }

  const audioDir = resolveInside(packageDir, content.path);
  if (!audioDir) {
    return { sounds: [], categories: [] };
  }

  const indexFile = resolveInside(audioDir, `${SOUND_INDEX_DIR}/${SOUND_INFO_FILE}`);
  if (!indexFile || !fs.existsSync(indexFile)) {
    return { sounds: [], categories: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(indexFile, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return { sounds: [], categories: [] };
  }
  if (!Array.isArray(parsed)) {
    return { sounds: [], categories: [] };
  }

  // 类别映射：key 是索引里的 category，value 是展示名
  const categoryLabels = new Map<string, string>();
  const categoriesFile = resolveInside(audioDir, `${SOUND_INDEX_DIR}/${SOUND_CATEGORIES_FILE}`);
  if (categoriesFile && fs.existsSync(categoriesFile)) {
    try {
      const rawCategories = JSON.parse(
        fs.readFileSync(categoriesFile, 'utf-8').replace(/^\uFEFF/, '')
      );
      if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) {
        for (const [key, value] of Object.entries(rawCategories)) {
          const label = asText(value);
          if (key && label) {
            categoryLabels.set(key, label);
          }
        }
      }
    } catch {
      // 映射坏了就只回退类别键本身，不阻断列表
    }
  }

  // 目录里的音频文件清单，用于「只给了 id_name」时兜底匹配
  let audioFiles: string[] = [];
  try {
    audioFiles = fs
      .readdirSync(audioDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name);
  } catch {
    audioFiles = [];
  }

  /** 在磁盘上找实际音频：优先 original_filename，否则按 id_name 模糊匹配 */
  function resolveAudio(idName: string, filename: string): string | null {
    const candidates = [
      filename,
      `${idName}${path.extname(filename) || '.ogg'}`,
      ...audioFiles.filter(
        (name) => name.toLowerCase() === `${idName}${path.extname(name)}`.toLowerCase()
      ),
      ...audioFiles.filter(
        (name) => name.toLowerCase().startsWith(`${idName.toLowerCase()}.`)
      ),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const full = resolveInside(audioDir, candidate);
      if (full && fs.existsSync(full)) {
        return candidate;
      }
    }
    return null;
  }

  const sounds: PackageSound[] = [];
  const categoryCounts = new Map<string, number>();
  const categoryDurations = new Map<string, number>();

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const idName = asText(record.id_name);
    if (!idName) {
      continue;
    }

    const category = asText(record.category);
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    const declared = asText(record.original_filename);
    const resolved = resolveAudio(idName, declared);
    const duration = resolved ? parseAudioDuration(path.join(audioDir, resolved)) : UNKNOWN_DURATION;
    if (duration !== UNKNOWN_DURATION) {
      const key = category || 'Other';
      categoryDurations.set(key, (categoryDurations.get(key) ?? 0) + duration);
    }

    sounds.push({
      id_name: idName,
      original_filename: resolved ?? declared,
      description: asText(record.description),
      category: category || 'Other',
      categoryLabel: categoryLabels.get(category) ?? (category || 'Other'),
      url: resolved ? buildAssetUrl(pkg.id, 'sounds', resolved) : '',
      exists: Boolean(resolved),
      duration,
    });
  }

  // 只有被引用的类别才下发；排序与前端分类标签一致（按 label 排，键作平局）
  const categories: PackageSoundCategory[] = [...categoryCounts.entries()]
    .map(([id, count]) => ({
      id,
      label: categoryLabels.get(id) ?? id,
      count,
      duration: categoryDurations.get(id) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN') || a.id.localeCompare(b.id));

  return { sounds, categories };
}

/** 在 Sounds 目录里定位一个音频文件，越界或不存在返回 null */
export function resolveSoundFile(
  packageDir: string,
  pkg: ResourcePackage,
  filename: string
): string | null {
  const content = getContent(pkg, 'Sounds');
  if (!content || !content.supported) {
    return null;
  }

  const audioDir = resolveInside(packageDir, content.path);
  if (!audioDir) {
    return null;
  }

  const target = resolveInside(audioDir, filename);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return null;
  }
  if (!AUDIO_EXTENSIONS.has(path.extname(target).toLowerCase())) {
    return null;
  }
  return target;
}

/**
 * 列出某个背景目录**根下一层**的图片（不递归）。
 *
 * 返回的文件名相对 `dir`，`prefix` 用于拼出相对背景根目录的路径（分类子目录名）。
 */
function listBackgroundImages(
  packageId: string,
  dir: string,
  prefix: string
): PackageBackground[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const images: PackageBackground[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      continue;
    }

    let size = 0;
    try {
      size = fs.statSync(path.join(dir, entry.name)).size;
    } catch {
      // 读不到体积记 0，不影响列表
    }

    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    images.push({
      name: entry.name,
      path: relative,
      ext,
      size,
      url: buildAssetUrl(packageId, 'backgrounds', relative),
    });
  }

  return images.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

/**
 * 读取 Backgrounds 分类的背景图与分类。
 *
 * 两种布局都支持：
 * 1. `<path>/index/category.yml` 存在 → 按 `category[].path` 逐个目录读图，按清单顺序下发；
 * 2. 没有 `category.yml` → 只读 `<path>/` 根下一层的图片。
 * 两种情况里，直接放在 `<path>/` 根下的图片都归到「未分类」（`id: ''`），排在最后。
 */
export function readPackageBackgrounds(
  packageDir: string,
  pkg: ResourcePackage
): PackageBackgroundCategory[] {
  const content = getContent(pkg, 'Backgrounds');
  if (!content || !content.supported) {
    return [];
  }

  const root = resolveInside(packageDir, content.path);
  if (!root || !fs.existsSync(root)) {
    return [];
  }

  const categories: PackageBackgroundCategory[] = [];
  const seenDirs = new Set<string>();

  const categoryFile = resolveInside(
    root,
    `${BACKGROUND_INDEX_DIR}/${BACKGROUND_CATEGORY_FILE}`
  );

  if (categoryFile && fs.existsSync(categoryFile)) {
    let parsed: unknown;
    try {
      parsed = parseYaml(fs.readFileSync(categoryFile, 'utf-8').replace(/^\uFEFF/, ''));
    } catch {
      parsed = null;
    }

    const list = (parsed as { category?: unknown } | null)?.category;
    if (Array.isArray(list)) {
      for (const raw of list) {
        if (!raw || typeof raw !== 'object') {
          continue;
        }
        const record = raw as Record<string, unknown>;
        const id = asText(record.id);
        const relativePath = asText(record.path) || id;
        const dir = relativePath ? resolveInside(root, relativePath) : null;

        // 清单里可能出现同一个目录 / 根目录，跳过避免重复计数
        const key = dir ?? '';
        if (!dir || seenDirs.has(key)) {
          continue;
        }
        seenDirs.add(key);

        const images = listBackgroundImages(pkg.id, dir, relativePath.replace(/\\/g, '/'));
        if (!images.length) {
          continue;
        }

        categories.push({
          id: id || relativePath,
          label: asText(record.name) || id || relativePath,
          description: asText(record.description),
          count: images.length,
          images,
        });
      }
    }
  }

  // 根目录下的松散图片：无论有没有 category.yml 都归「未分类」
  const loose = listBackgroundImages(pkg.id, root, '');
  if (loose.length) {
    categories.push({
      id: '',
      label: BACKGROUND_UNCATEGORIZED_LABEL,
      description: '',
      count: loose.length,
      images: loose,
    });
  }

  return categories;
}

/** 在 Backgrounds 目录里定位一张图片，越界或不存在返回 null */
export function resolveBackgroundFile(
  packageDir: string,
  pkg: ResourcePackage,
  relative: string
): string | null {
  const content = getContent(pkg, 'Backgrounds');
  if (!content || !content.supported) {
    return null;
  }

  const root = resolveInside(packageDir, content.path);
  if (!root) {
    return null;
  }

  const target = resolveInside(root, relative);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return null;
  }
  if (!IMAGE_EXTENSIONS.has(path.extname(target).toLowerCase())) {
    return null;
  }
  return target;
}

/** 读取某个立绘目录下的文件；目录不存在或不是骨骼分类时返回 null */
export function readSkeletonFiles(
  packageDir: string,
  pkg: ResourcePackage,
  skeletonId: string
): PackageSkeletonItem[] | null {
  const content = getContent(pkg, 'Skeletons');
  if (!content || !content.supported) {
    return null;
  }

  const skeletonRoot = resolveInside(packageDir, content.path);
  if (!skeletonRoot) {
    return null;
  }

  const dir = resolveInside(skeletonRoot, skeletonId);
  if (!dir || !fs.existsSync(dir)) {
    return null;
  }

  return readSkeletonDir(pkg.id, skeletonId, dir);
}

/** 读一个立绘目录里的文件（含体积），失败返回 null */
function readSkeletonDir(packageId: string, skeletonId: string, dir: string): PackageSkeletonItem[] | null {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const files: PackageSkeletonItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    let size = 0;
    try {
      size = fs.statSync(path.join(dir, entry.name)).size;
    } catch {
      // 读不到体积就当 0，不影响列表
    }

    const dot = entry.name.lastIndexOf('.');
    files.push({
      name: entry.name,
      ext: dot < 0 ? '' : entry.name.slice(dot).toLowerCase(),
      size,
      url: buildAssetUrl(packageId, 'skeleton', `${skeletonId}/${entry.name}`),
    });
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 列出资源包里全部立绘目录（`skeletons/` 的一级子目录）。
 *
 * 一次把文件清单和体积都算好下发给前端：631 个目录大约 2500 次 stat，
 * 在本地磁盘上是几十毫秒量级，换来前端展开时不用再发请求。
 */
export function readPackageSkeletons(
  packageDir: string,
  pkg: ResourcePackage
): PackageSkeleton[] {
  const content = getContent(pkg, 'Skeletons');
  if (!content || !content.supported) {
    return [];
  }

  const root = resolveInside(packageDir, content.path);
  if (!root) {
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: PackageSkeleton[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dir = path.join(root, entry.name);
    const files = readSkeletonDir(pkg.id, entry.name, dir) ?? [];
    const exts = new Set(files.map((file) => file.ext));

    results.push({
      id: entry.name,
      files,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      complete:
        (exts.has('.skel') || exts.has('.json')) &&
        exts.has('.atlas') &&
        (exts.has('.png') || exts.has('.webp') || exts.has('.jpg') || exts.has('.jpeg')),
    });
  }

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

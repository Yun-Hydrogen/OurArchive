/**
 * 资源包清单（`package.yml`）解析、目录约定与内容分类元数据。
 *
 * 这里是资源包模块的「底座」：角色 / 音频 / 表情 / 背景 / 立绘各 Provider
 * 都从这里取常量、路径校验（`resolveInside`）与 `getContent()`，
 * 依赖方向固定为「内容 Provider → 清单」，不反向引用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { PackageContent, ResourcePackage } from '@/modules/API/types';
import { getStoragePaths, type StoragePaths } from '@/modules/Initializer/paths.server';
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

/** Emotions 分类的表情索引：`<path>/index/emotions.yml` */
export const EMOTION_INDEX_DIR = 'index';
export const EMOTION_INDEX_FILE = 'emotions.yml';

/** 未分类（直接放在背景目录根下一层的图片）的展示名 */
export const BACKGROUND_UNCATEGORIZED_LABEL = '未分类';

/**
 * 资源包内静态资源的访问前缀。
 * 与 `routes/packages.ts` 里挂载的路由保持一致。
 */
export function buildAssetUrl(
  packageId: string,
  kind: 'avatar' | 'skeleton' | 'music' | 'sounds' | 'backgrounds' | 'emotions',
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


export function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function asBool(value: unknown): boolean {
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

  // 表情按 index/emotions.yml 的条目数计，不把 images/ sounds/ index/ 当条目
  if (key === 'Emotions') {
    const emotionsIndex = path.join(dir, EMOTION_INDEX_DIR, EMOTION_INDEX_FILE);
    try {
      const parsed = parseYaml(
        fs.readFileSync(emotionsIndex, 'utf-8').replace(/^\uFEFF/, '')
      ) as { emotions?: unknown } | null;
      if (Array.isArray(parsed?.emotions)) {
        return { exists: true, count: parsed.emotions.length };
      }
    } catch {
      // 没有索引文件就退回目录条目数
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

/** 从 package_content 里找某个分类的配置 */
export function getContent(pkg: ResourcePackage, key: string): PackageContent | undefined {
  return pkg.contents.find((item) => item.key === key);
}

export const AUDIO_EXTENSIONS = new Set([
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

export const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
  '.gif',
  '.avif',
]);

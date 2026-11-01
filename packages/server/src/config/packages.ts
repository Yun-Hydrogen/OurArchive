import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { getStoragePaths, type StoragePaths } from './paths.js';

/** 资源包清单文件名：`res/<包名>/package.yml` */
export const PACKAGE_MANIFEST_FILE_NAME = 'package.yml';

/** hasCharacter 分类的缺省索引文件与头像目录 */
export const DEFAULT_CHARACTER_INDEX = 'characters.json';
export const DEFAULT_AVATAR_DIR = 'avatars';

/**
 * 资源包内静态资源的访问前缀。
 * 与 `routes/packages.ts` 里挂载的路由保持一致。
 */
export function buildAssetUrl(packageId: string, kind: 'avatar' | 'skeleton', relative: string): string {
  const encoded = relative
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/api/packages/${encodeURIComponent(packageId)}/${kind}/${encoded}`;
}

/**
 * package.yml 中已知的内容分类 → 中文展示名。
 * 未收录的自定义键直接回退成键名本身。
 */
export const PACKAGE_CONTENT_LABELS: Record<string, string> = {
  Emotions: '表情',
  Sounds: '音效',
  Skeletons: '骨骼',
  Backgrounds: '背景',
  BackgroundMusic: '背景音乐',
  hasCharacter: '角色',
};

export interface PackageContent {
  /** package.yml 里的键，如 Skeletons / hasCharacter */
  key: string;
  /** 展示名，如 骨骼 / 角色 */
  label: string;
  /** 作者是否声明包含该类资源 */
  supported: boolean;
  /** 相对资源包根目录的路径 */
  path: string;
  /** 索引文件名（仅 hasCharacter 使用，缺省 characters.json） */
  index: string;
  /** 图片子目录（仅 hasCharacter 使用，缺省 avatars） */
  avatar: string;
  /** 声明为包含且目录存在 */
  exists: boolean;
  /** 目录下的一级条目数（仅在 supported 时统计） */
  count: number;
}

export interface ResourcePackage {
  /** 资源包目录名，同时作为唯一标识 */
  id: string;
  /** package_info.name */
  name: string;
  /** package_info.description */
  description: string;
  /** package_info.version */
  version: string;
  /** package_info.author */
  author: string;
  /** package.yml 的最后修改时间（ISO 字符串） */
  updatedAt: string;
  /** package.yml 是否可解析出 package_info */
  valid: boolean;
  /** 解析失败时的原因 */
  error?: string;
  /** package_content 声明的内容分类（按清单顺序） */
  contents: PackageContent[];
}

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

  return { exists: true, count: entries.length };
}

/** package_content 条目里除内容类型以外的字段 */
const CONTENT_RESERVED_KEYS = new Set(['supported', 'path', 'index', 'avatar', 'name', 'description']);

function buildContent(packageRoot: string, key: string, config: Record<string, unknown>): PackageContent {
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
function parseContents(packageDir: string, raw: unknown): PackageContent[] {
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
      contents.push(buildContent(root, key, value as Record<string, unknown>));
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
    contents.push(buildContent(root, typeKey, config));
  }

  return contents;
}


function readPackage(packageDir: string, id: string): ResourcePackage | null {
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
    contents: parseContents(packageDir, contentRaw),
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
    .map((entry) => readPackage(path.join(paths.resDir, entry.name), entry.name))
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

/** 角色索引里的一条记录（characters.json 的原始字段） */
export interface PackageCharacterSource {
  name_id: string;
  name: string;
  school: string;
  club: string;
  avatar: string;
  spine: string[];
}

/** 给前端用的角色条目：补上资源 URL 与骨骼存在性 */
export interface PackageCharacterEntry extends Omit<PackageCharacterSource, 'spine'> {
  /** 头像可访问 URL；没有头像时为空串 */
  avatarUrl: string;
  /** 资源包内绑定的立绘 id 列表 */
  spine: string[];
  /** 每条立绘是否真的存在于 skeletons/ 下 */
  spines: Array<{ id: string; exists: boolean }>;
  /** 是否至少有一条立绘可用 */
  hasSkeleton: boolean;
}

/** 从 package_content 里找某个分类的配置 */
function contentOf(pkg: ResourcePackage, key: string): PackageContent | undefined {
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
): PackageCharacterEntry[] {
  const content = contentOf(pkg, 'hasCharacter');
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
  const skeletonContent = contentOf(pkg, 'Skeletons');
  const skeletonDir = skeletonContent?.supported
    ? resolveInside(packageDir, skeletonContent.path)
    : null;

  const entries: PackageCharacterEntry[] = [];

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

/**
 * 列出某个资源包内某个立绘目录下的全部文件。
 */
export function readSkeletonFiles(
  packageDir: string,
  pkg: ResourcePackage,
  skeletonId: string
): Array<{ name: string; url: string }> | null {
  const content = contentOf(pkg, 'Skeletons');
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

  let names: string[];
  try {
    names = fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return null;
  }

  return names.sort().map((name) => ({
    name,
    url: buildAssetUrl(pkg.id, 'skeleton', `${skeletonId}/${name}`),
  }));
}

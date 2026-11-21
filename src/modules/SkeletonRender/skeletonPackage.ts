/**
 * 骨骼资源包的收集与识别。
 *
 * 支持两种目录约定：
 * - Spine：`*.skel`（或 Spine JSON）+ `*.atlas` + 贴图
 * - DragonBones：`*_ske.json` + `*_tex.json` + `*_tex.png`
 *
 * 目录选择（`webkitdirectory`）与拖拽文件夹都会带上相对路径，
 * 因此可以一次丢进整个 `skeletons/` 根目录，再在这里按目录拆成多个角色。
 */
import type { SkeletonFile, SkeletonSource } from './skeletonTypes';

export type { SkeletonFile, SkeletonSource } from './skeletonTypes';

export const TEXTURE_EXTENSIONS = ['.png', '.webp', '.jpg', '.jpeg'] as const;
export const SPINE_SKELETON_EXTENSIONS = ['.skel', '.json'] as const;

const ATLAS_EXTENSION = '.atlas';

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

function baseName(path: string): string {
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return slash < 0 ? path : path.slice(slash + 1);
}

function dirName(path: string): string {
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return slash < 0 ? '' : path.slice(0, slash);
}

function isDragonBonesSkeleton(name: string): boolean {
  return /_ske\.(json|dbbin)$/i.test(name);
}

function isDragonBonesTextureJson(name: string): boolean {
  return /_tex\.json$/i.test(name);
}

function isDragonBonesTexture(name: string): boolean {
  return /_tex\.(png|webp|jpe?g)$/i.test(name);
}

/** 读取 `<input type="file">` 的结果，补上相对路径 */
export function toSkeletonFiles(files: FileList | File[]): SkeletonFile[] {
  return Array.from(files).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

interface DirectoryEntry {
  dir: string;
  files: SkeletonFile[];
}

function groupByDirectory(entries: SkeletonFile[]): DirectoryEntry[] {
  const groups = new Map<string, SkeletonFile[]>();
  for (const entry of entries) {
    const dir = dirName(entry.path);
    const bucket = groups.get(dir);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(dir, [entry]);
    }
  }
  return [...groups.entries()].map(([dir, files]) => ({ dir, files }));
}

function detectDragonBones(entry: DirectoryEntry): SkeletonSource | null {
  const skeleton = entry.files.find((item) => isDragonBonesSkeleton(item.path));
  const textureJson = entry.files.find((item) => isDragonBonesTextureJson(item.path));
  if (!skeleton || !textureJson) {
    return null;
  }

  const textures = entry.files
    .filter((item) => (TEXTURE_EXTENSIONS as readonly string[]).includes(extensionOf(item.path)))
    .map((item) => item.file);
  if (!textures.length) {
    return null;
  }

  // 优先使用与 `_tex.json` 同前缀的贴图
  const textureStem = baseName(textureJson.path).replace(/_tex\.json$/i, '');
  const matchedTexture =
    entry.files.find((item) => {
      const name = baseName(item.path);
      return isDragonBonesTexture(name) && name.toLowerCase().startsWith(textureStem.toLowerCase());
    })?.file ?? textures[0];

  return {
    id: entry.dir ? baseName(entry.dir) : skeleton.file.name.replace(/_ske\.(json|dbbin)$/i, ''),
    kind: 'dragonbones',
    skeleton: skeleton.file,
    textureJson: textureJson.file,
    textures: [matchedTexture, ...textures.filter((file) => file !== matchedTexture)],
    armatureName: entry.dir ? baseName(entry.dir) : undefined,
  };
}

function detectSpine(entry: DirectoryEntry): SkeletonSource | null {
  const atlasFiles = entry.files.filter((item) => extensionOf(item.path) === ATLAS_EXTENSION);
  if (atlasFiles.length !== 1) {
    return null;
  }

  const skeletonFiles = entry.files.filter((item) => {
    const ext = extensionOf(item.path);
    const name = baseName(item.path);
    if (!(SPINE_SKELETON_EXTENSIONS as readonly string[]).includes(ext)) {
      return false;
    }
    // 排除 DragonBones 的 `_ske.json` / `_tex.json`
    return !isDragonBonesSkeleton(name) && !isDragonBonesTextureJson(name);
  });

  const textures = entry.files
    .filter((item) => (TEXTURE_EXTENSIONS as readonly string[]).includes(extensionOf(item.path)))
    .map((item) => item.file);

  if (!skeletonFiles.length || !textures.length) {
    return null;
  }

  // 同一目录里 `.skel` 与 `.json` 并存时优先二进制骨骼，体积更小且解析更快
  const skeleton =
    skeletonFiles.find((item) => extensionOf(item.path) === '.skel')?.file ??
    skeletonFiles[0].file;

  return {
    id: entry.dir
      ? baseName(entry.dir)
      : skeleton.name.replace(/\.(skel|json)$/i, ''),
    kind: 'spine',
    skeleton,
    atlas: atlasFiles[0].file,
    textures,
  };
}

/** 把平铺的文件列表按目录拆成候选骨骼包（顺序稳定，便于列表展示） */
export function toSkeletonSources(entries: SkeletonFile[]): SkeletonSource[] {
  const sources: SkeletonSource[] = [];
  for (const entry of groupByDirectory(entries)) {
    // DragonBones 的命名比 Spine 更明确，先判断，避免 `_ske.json` 被当成 Spine JSON
    const source = detectDragonBones(entry) ?? detectSpine(entry);
    if (source) {
      sources.push(source);
    }
  }
  return sources.sort((a, b) => a.id.localeCompare(b.id, 'zh-Hans-CN'));
}

/** 图集页名 → 贴图文件；找不到同名时退化为「唯一的贴图」或「前缀匹配」 */
export function matchTexture(textures: File[], pageName: string): File | null {
  const target = baseName(pageName).toLowerCase();
  const exact = textures.find((file) => file.name.toLowerCase() === target);
  if (exact) {
    return exact;
  }
  if (textures.length === 1) {
    return textures[0];
  }
  const stem = target.replace(/\.(png|webp|jpe?g)$/i, '');
  return (
    textures.find((file) => file.name.toLowerCase().replace(/\.(png|webp|jpe?g)$/i, '') === stem) ??
    null
  );
}

/* ------------------------------ 拖拽文件夹 ------------------------------ */

interface FSDirectoryReader {
  readEntries: (cb: (entries: FileSystemEntry[]) => void, err: (e: unknown) => void) => void;
}

/** 浏览器只把 file() / createReader() 挂在具体子类型上，这里合并成一个可判定的结构 */
interface FSNode extends FileSystemEntry {
  file?: (cb: (file: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => FSDirectoryReader;
}

function readEntry(entry: FSNode, prefix: string): Promise<SkeletonFile[]> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile && entry.file) {
    return new Promise((resolve) => {
      entry.file!(
        (file) => resolve([{ file, path }]),
        () => resolve([])
      );
    });
  }
  if (!entry.isDirectory || !entry.createReader) {
    return Promise.resolve([]);
  }
  const reader = entry.createReader();
  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve) => reader.readEntries(resolve, () => resolve([])));

  return (async () => {
    const collected: SkeletonFile[] = [];
    // readEntries 一次最多返回 100 条，必须读到空数组为止
    for (;;) {
      const batch = await readBatch();
      if (!batch.length) {
        break;
      }
      for (const child of batch) {
        collected.push(...(await readEntry(child as FSNode, path)));
      }
    }
    return collected;
  })();
}

/** 从拖放事件里递归取文件（支持整个文件夹） */
export async function toSkeletonFilesFromDrop(transfer: DataTransfer): Promise<SkeletonFile[]> {
  const items = Array.from(transfer.items ?? []);
  const entries = items
    .map((item) => (item.kind === 'file' ? ((item.webkitGetAsEntry() as FSNode | null) ?? null) : null))
    .filter((entry): entry is FSNode => Boolean(entry));

  if (!entries.length) {
    // 老浏览器 / 非 Chromium：退回平铺 FileList
    return toSkeletonFiles(transfer.files);
  }

  const collected: SkeletonFile[] = [];
  for (const entry of entries) {
    collected.push(...(await readEntry(entry, '')));
  }
  return collected;
}

/* ------------------------------ 服务端资源包 ------------------------------ */

/**
 * 从已安装的资源包直接装配一个骨骼包（无需用户选文件）。
 *
 * 后端只给出文件清单与 URL，这里把每个文件下载成 Blob 再包成 `File`，
 * 这样渲染管线与「手动上传」完全共用同一条路径。
 */
export async function loadSkeletonFromPackage(
  packageId: string,
  skeletonId: string
): Promise<SkeletonSource> {
  // 动态引入，避免 skeletonPackage 被纯本地场景也拖上网络依赖
  const { fetchSkeletonFiles } = await import('@/modules/API/packagesApi');
  const files = await fetchSkeletonFiles(packageId, skeletonId);

  if (!files.length) {
    throw new Error(`立绘目录为空或不存在：${skeletonId}`);
  }

  const entries: SkeletonFile[] = [];
  await Promise.all(
    files.map(async (item) => {
      const res = await fetch(item.url);
      if (!res.ok) {
        throw new Error(`下载失败：${item.name}`);
      }
      const blob = await res.blob();
      entries.push({ file: new File([blob], item.name), path: item.name });
    })
  );

  const [source] = toSkeletonSources(entries);
  if (!source) {
    throw new Error('这个立绘目录缺少可识别的骨骼文件：Spine 需要 .skel/.json + .atlas + 贴图，DragonBones 需要 _ske.json + _tex.json + 贴图。');
  }

  return { ...source, id: skeletonId };
}

/* ------------------------------ 兼容旧命名 ------------------------------ */

/** @deprecated 使用 `SkeletonFile` */
export type SpineFile = SkeletonFile;
/** @deprecated 使用 `SkeletonSource` */
export type SpineCharacter = SkeletonSource;
/** @deprecated 使用 `toSkeletonFiles` */
export const toSpineFiles = toSkeletonFiles;
/** @deprecated 使用 `toSkeletonSources` */
export const toSpineCharacters = toSkeletonSources;
/** @deprecated 使用 `toSkeletonFilesFromDrop` */
export const toSpineFilesFromDrop = toSkeletonFilesFromDrop;
/** @deprecated 使用 `loadSkeletonFromPackage` */
export const loadSpineCharacterFromPackage = loadSkeletonFromPackage;

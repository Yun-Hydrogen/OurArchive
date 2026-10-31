/**
 * Spine 立绘资源包的收集与识别。
 *
 * 一个「立绘包」= 一个目录，里面同时有：
 *   - 骨骼：`*.skel`（Spine 二进制）或 `*.json`（Spine JSON 导出）
 *   - 图集：`*.atlas`
 *   - 贴图：`*.png` / `*.webp` / `*.jpg`（图集页）
 *
 * 目录选择（`webkitdirectory`）与拖拽文件夹都会带上相对路径，
 * 因此可以一次丢进整个 `skeletons/` 根目录，再在这里按目录拆成多个角色。
 */

/** 带相对路径的本地文件 */
export interface OASpineFile {
  file: File;
  /** 相对路径（含文件名），无路径信息时就是文件名 */
  path: string;
}

/** 识别出的一个立绘包 */
export interface OASpineCharacter {
  /** 目录名，也就是角色 id（如 `shiroko_spr`） */
  id: string;
  skeleton: File;
  atlas: File;
  textures: File[];
}

export const SKELETON_EXTENSIONS = ['.skel', '.json'] as const;
export const TEXTURE_EXTENSIONS = ['.png', '.webp', '.jpg', '.jpeg'] as const;

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

/** 读取 `<input type="file">` 的结果，补上相对路径 */
export function toSpineFiles(files: FileList | File[]): OASpineFile[] {
  return Array.from(files).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

/** 把平铺的文件列表按目录拆成候选立绘包（顺序稳定，便于列表展示） */
export function toSpineCharacters(entries: OASpineFile[]): OASpineCharacter[] {
  const groups = new Map<string, OASpineFile[]>();
  for (const entry of entries) {
    const dir = dirName(entry.path);
    const bucket = groups.get(dir);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(dir, [entry]);
    }
  }

  const characters: OASpineCharacter[] = [];
  for (const [dir, files] of groups) {
    const atlasFiles = files.filter((item) => extensionOf(item.path) === ATLAS_EXTENSION);
    const skeletonFiles = files.filter((item) =>
      (SKELETON_EXTENSIONS as readonly string[]).includes(extensionOf(item.path))
    );
    const textures = files
      .filter((item) => (TEXTURE_EXTENSIONS as readonly string[]).includes(extensionOf(item.path)))
      .map((item) => item.file);

    if (atlasFiles.length !== 1 || skeletonFiles.length === 0 || textures.length === 0) {
      continue;
    }

    // 同一目录里 `.skel` 与 `.json` 并存时优先二进制骨骼，体积更小且解析更快
    const skeleton =
      skeletonFiles.find((item) => extensionOf(item.path) === '.skel')?.file ??
      skeletonFiles[0].file;

    characters.push({
      id: dir ? baseName(dir) : skeleton.name.replace(/\.(skel|json)$/i, ''),
      skeleton,
      atlas: atlasFiles[0].file,
      textures,
    });
  }

  return characters.sort((a, b) => a.id.localeCompare(b.id, 'zh-Hans-CN'));
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

function readEntry(entry: FSNode, prefix: string): Promise<OASpineFile[]> {
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
    const collected: OASpineFile[] = [];
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
export async function toSpineFilesFromDrop(transfer: DataTransfer): Promise<OASpineFile[]> {
  const items = Array.from(transfer.items ?? []);
  const entries = items
    .map((item) => (item.kind === 'file' ? ((item.webkitGetAsEntry() as FSNode | null) ?? null) : null))
    .filter((entry): entry is FSNode => Boolean(entry));

  if (!entries.length) {
    // 老浏览器 / 非 Chromium：退回平铺 FileList
    return toSpineFiles(transfer.files);
  }

  const collected: OASpineFile[] = [];
  for (const entry of entries) {
    collected.push(...(await readEntry(entry, '')));
  }
  return collected;
}

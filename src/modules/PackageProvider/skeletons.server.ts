/**
 * 立绘目录（`Skeletons` 分类）的文件扫描。
 *
 * 一次把目录里每个文件的体积都算好下发，前端展开时不必再请求。
 */
import fs from 'node:fs';
import path from 'node:path';
import type {
  PackageSkeleton,
  PackageSkeletonItem,
  PackageSkeletonKind,
  ResourcePackage,
} from '@/modules/API/types';
import { buildAssetUrl, getContent, resolveInside } from './packageManifest.server';

const TEXTURE_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);

function isDragonBonesSkeleton(name: string): boolean {
  return /_ske\.(json|dbbin)$/i.test(name);
}

function isDragonBonesTextureJson(name: string): boolean {
  return /_tex\.json$/i.test(name);
}

/** 根据目录里的文件名判断骨骼类型与可预览性 */
function detectSkeletonKind(files: PackageSkeletonItem[]): {
  kind: PackageSkeletonKind;
  complete: boolean;
} {
  const names = files.map((file) => file.name);
  const exts = new Set(files.map((file) => file.ext));
  const hasTexture = [...TEXTURE_EXTENSIONS].some((ext) => exts.has(ext));

  const hasDragonBonesSkeleton = names.some(isDragonBonesSkeleton);
  const hasDragonBonesTextureJson = names.some(isDragonBonesTextureJson);
  const hasDragonBonesJson = names.some((name) => /_ske\.json$/i.test(name));

  // DragonBones 的 `_ske` / `_tex` 命名优先级高于 Spine 的通用 `.json`
  if (hasDragonBonesSkeleton || hasDragonBonesTextureJson) {
    return {
      kind: 'dragonbones',
      // 第一版只支持 JSON 骨架；`.dbbin` 识别为 DragonBones 但暂不可预览
      complete: hasDragonBonesJson && hasDragonBonesTextureJson && hasTexture,
    };
  }

  const hasAtlas = exts.has('.atlas');
  const hasSpineSkeleton =
    exts.has('.skel') ||
    names.some(
      (name) =>
        name.toLowerCase().endsWith('.json') &&
        !isDragonBonesSkeleton(name) &&
        !isDragonBonesTextureJson(name)
    );

  if (hasAtlas || hasSpineSkeleton) {
    return { kind: 'spine', complete: hasAtlas && hasSpineSkeleton && hasTexture };
  }

  return { kind: 'unknown', complete: false };
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
    const detected = detectSkeletonKind(files);

    results.push({
      id: entry.name,
      files,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      kind: detected.kind,
      complete: detected.complete,
    });
  }

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

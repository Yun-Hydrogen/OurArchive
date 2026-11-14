/**
 * 背景图解析：`index/category.yml` 有分类就按分类读，没有就只读根下一层。
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { PackageBackground, PackageBackgroundCategory, ResourcePackage } from '@/modules/API/types';
import {
  BACKGROUND_CATEGORY_FILE,
  BACKGROUND_INDEX_DIR,
  BACKGROUND_UNCATEGORIZED_LABEL,
  IMAGE_EXTENSIONS,
  asText,
  buildAssetUrl,
  getContent,
  resolveInside,
} from '@/modules/PackageProvider/packageManifest.server';
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

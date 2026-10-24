import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import {
  resolvePreloadAssetsPath,
  getStoragePaths,
  type StoragePaths,
} from './paths.js';

export interface PreloadAssetItem {
  /** 资源唯一标识，全小写字母 */
  id: string;
  /** 以 preload 为起始项的相对路径 */
  file: string;
  /** 资源类型，如 sound / image */
  fileType: string;
  /** 解析后的绝对路径 */
  resolvedPath: string;
  /** 磁盘上是否存在该文件 */
  exists: boolean;
}

export interface PreloadCheckResult {
  /** 清单配置文件的路径（若找到） */
  manifestFile: string | null;
  /** 总配置项数 */
  total: number;
  /** 已就绪项数 */
  loaded: number;
  /** 缺失项数 */
  missing: number;
  /** 是否全部完整就绪 */
  isComplete: boolean;
  /** 全部资源项清单 */
  items: PreloadAssetItem[];
  /** 缺失的资源项 */
  missingItems: PreloadAssetItem[];
  /** 警告提示文案（不完整时提供） */
  warningMessage?: string;
}

export const PRELOAD_INCOMPLETE_WARNING =
  'preload不完整，可能影响体验，请从第三方分发处重新下载并安装preload资源。';

let cachedPreloadResult: PreloadCheckResult | null = null;

/**
 * 获取最近一次校验的预加载资源清单结果
 */
export function getPreloadCheckResult(): PreloadCheckResult | null {
  return cachedPreloadResult;
}

/**
 * 读取随代码打包分发的 preload_assets.yml，对照检查用户资源目录下的 preload/ 文件夹。
 *
 * 1. 查找随程序分发的 preload_assets.yml
 * 2. 读取开发者维护的资源清单
 * 3. 逐项比对用户资源文件夹（<root>/preload/）下文件是否存在
 * 4. 若资源缺失，返回不完整状态并附带警示文案
 */
export function loadPreloadAssets(
  currentDir: string,
  paths: StoragePaths = getStoragePaths()
): PreloadCheckResult {
  const manifestFile = resolvePreloadAssetsPath(currentDir);

  if (!manifestFile || !fs.existsSync(manifestFile)) {
    const result: PreloadCheckResult = {
      manifestFile: null,
      total: 0,
      loaded: 0,
      missing: 0,
      isComplete: false,
      items: [],
      missingItems: [],
      warningMessage: PRELOAD_INCOMPLETE_WARNING,
    };
    cachedPreloadResult = result;
    return result;
  }

  let parsed: unknown;
  try {
    const content = fs.readFileSync(manifestFile, 'utf-8');
    parsed = parseYaml(content);
  } catch (error) {
    console.warn(
      `[Our Archive] 解析预加载资源清单失败: ${manifestFile}`,
      error instanceof Error ? error.message : error
    );
    const result: PreloadCheckResult = {
      manifestFile,
      total: 0,
      loaded: 0,
      missing: 0,
      isComplete: false,
      items: [],
      missingItems: [],
      warningMessage: PRELOAD_INCOMPLETE_WARNING,
    };
    cachedPreloadResult = result;
    return result;
  }

  const rawList = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).assets))
      ? (parsed as Record<string, unknown>).assets
      : [];

  const items: PreloadAssetItem[] = [];
  const missingItems: PreloadAssetItem[] = [];
  const rootResolved = path.resolve(paths.rootDir);

  for (const rawItem of rawList) {
    if (!rawItem || typeof rawItem !== 'object') {
      continue;
    }

    const record = rawItem as Record<string, unknown>;
    const id = String(record.id ?? '').trim().toLowerCase();
    const rawFile = String(record.file ?? '').trim();
    if (!id || !rawFile) {
      continue;
    }

    // 兼容 file_type 与用户手误的 file_tpye
    const fileType = String(
      record.file_type ?? record.file_tpye ?? record.type ?? 'unknown'
    ).trim().toLowerCase();

    // 规范化文件路径：剥离前导斜杠，确保安全解析
    const cleanRelative = rawFile.replace(/^[/\\]+/, '');
    const resolvedPath = cleanRelative.startsWith('preload')
      ? path.resolve(paths.rootDir, cleanRelative)
      : path.resolve(paths.preloadDir, cleanRelative);

    // 防止路径穿越出根目录
    const isSafe = resolvedPath.startsWith(rootResolved);
    const exists = isSafe && fs.existsSync(resolvedPath);

    const assetItem: PreloadAssetItem = {
      id,
      file: cleanRelative,
      fileType,
      resolvedPath,
      exists,
    };

    items.push(assetItem);
    if (!exists) {
      missingItems.push(assetItem);
    }
  }

  const total = items.length;
  const loaded = total - missingItems.length;
  const missing = missingItems.length;
  const isComplete = total > 0 && missing === 0;

  const result: PreloadCheckResult = {
    manifestFile,
    total,
    loaded,
    missing,
    isComplete,
    items,
    missingItems,
    warningMessage: isComplete ? undefined : PRELOAD_INCOMPLETE_WARNING,
  };

  cachedPreloadResult = result;
  return result;
}

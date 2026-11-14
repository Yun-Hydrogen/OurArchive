/**
 * 全局配置（`config/global_config.yml`）的读取、合并与落盘。
 *
 * 只负责「配置这一件事」；资源根目录与目录创建在 `Initializer/storage.server.ts`。
 * 旧布局迁移也在这里：它本质是「把旧配置文件搬到新位置」，属于配置的一部分。
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import { getStoragePaths, type StoragePaths } from '@/modules/Initializer/paths.server';
import { DEFAULT_SPINE_RENDERER, isSpineRendererMode } from './rendererMode';

export type GlobalConfig = Record<string, unknown>;
const DEFAULT_CONFIG_CONTENT =
  '# Our Archive 全局配置 (global_config.yml)\nmain_bgm_volume: 50\npreview_volume: 60\nspine_renderer: stable\n';

/**
 * 兼容旧版本布局：
 * 1. 早期使用 <root>/configs/
 * 2. 早期配置文件名为 global_settings.yml，迁移至 global_config.yml
 */
export function migrateLegacyConfigDir(paths: StoragePaths) {
  // 迁移 configs 目录
  const legacyDir = path.join(paths.rootDir, 'configs');
  if (fs.existsSync(legacyDir)) {
    const legacyFile = path.join(legacyDir, 'global_settings.yml');
    if (!fs.existsSync(paths.configFile) && fs.existsSync(legacyFile)) {
      try {
        fs.copyFileSync(legacyFile, paths.configFile);
      } catch (error) {
        console.warn(
          `[Our Archive] 旧配置迁移失败: ${legacyFile}`,
          error instanceof Error ? error.message : error
        );
      }
    }
    try {
      fs.rmSync(legacyDir, { recursive: true, force: true });
    } catch {
      // 忽略
    }
  }

  // 迁移 config/global_settings.yml -> config/global_config.yml
  const legacySettingsFile = path.join(paths.configDir, 'global_settings.yml');
  if (!fs.existsSync(paths.configFile) && fs.existsSync(legacySettingsFile)) {
    try {
      fs.copyFileSync(legacySettingsFile, paths.configFile);
    } catch (error) {
      console.warn(
        `[Our Archive] 旧配置文件迁移失败: ${legacySettingsFile}`,
        error instanceof Error ? error.message : error
      );
    }
  }
}

/**
 * 首次启动（及之后每次启动）的存储初始化：
 * 1. 创建资源根目录及 res / preload / config / plugins 子目录
 * 2. 若全局配置文件不存在则创建空配置
 * 3. 读取并返回全局配置
 */

/**
 * 读取全局配置。文件缺失或解析失败时返回默认配置。
 */
export function loadGlobalConfig(paths: StoragePaths = getStoragePaths()): GlobalConfig {
  const defaults: GlobalConfig = {
    main_bgm_volume: 50,
    preview_volume: 60,
    spine_renderer: DEFAULT_SPINE_RENDERER,
  };

  if (!fs.existsSync(paths.configFile)) {
    return defaults;
  }

  try {
    const parsed = parseYaml(fs.readFileSync(paths.configFile, 'utf-8'));
    if (parsed && typeof parsed === 'object') {
      const merged: GlobalConfig = {
        ...defaults,
        ...(parsed as GlobalConfig),
      };
      // 音量项统一收敛到 0-100 的整数
      for (const key of ['main_bgm_volume', 'preview_volume'] as const) {
        const value = merged[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          merged[key] = defaults[key];
        } else {
          merged[key] = Math.max(0, Math.min(100, Math.round(value)));
        }
      }
      if (!isSpineRendererMode(merged.spine_renderer)) {
        merged.spine_renderer = DEFAULT_SPINE_RENDERER;
      }
      return merged;
    }
  } catch (error) {
    console.warn(
      `[Our Archive] 配置文件解析失败，将使用默认配置: ${paths.configFile}`,
      error instanceof Error ? error.message : error
    );
  }

  return defaults;
}

/**
 * 合并写入全局配置。
 */
export function saveGlobalConfig(
  config: GlobalConfig,
  paths: StoragePaths = getStoragePaths()
): GlobalConfig {
  const merged = { ...loadGlobalConfig(paths), ...config };

  fs.mkdirSync(paths.configDir, { recursive: true });
  fs.writeFileSync(
    paths.configFile,
    stringifyYaml(merged, { indent: 2, lineWidth: -1, noRefs: true }),
    'utf-8'
  );

  return merged;
}

/**
 * 确保配置文件存在（首次启动时写入默认内容）。
 * 只有「写一份默认配置」这一件事，目录创建在 `Initializer/storage.server.ts`。
 */
export function ensureConfigFile(paths: StoragePaths = getStoragePaths()): void {
  if (fs.existsSync(paths.configFile)) {
    return;
  }
  fs.mkdirSync(paths.configDir, { recursive: true });
  fs.writeFileSync(paths.configFile, DEFAULT_CONFIG_CONTENT, 'utf-8');
}
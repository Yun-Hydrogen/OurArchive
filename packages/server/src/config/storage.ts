import fs from 'node:fs';
import path from 'node:path';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import { getStoragePaths, SETTINGS_FILE_NAME, type StoragePaths } from './paths.js';

export type GlobalSettings = Record<string, unknown>;

export interface StorageInitResult {
  paths: StoragePaths;
  /** 本次启动是否为首次创建资源根目录 */
  firstRun: boolean;
  settings: GlobalSettings;
}

const DEFAULT_CONFIG_CONTENT =
  '# Our Archive 全局配置 (global_config.yml)\nmain_bgm_volume: 50\npreview_volume: 60\nspine_renderer: stable\n';

/** 立绘渲染器模式，与客户端 `SpineRendererMode` 保持一致 */
export const SPINE_RENDERER_MODES = ['aggressive', 'stable', 'conservative'] as const;
export type SpineRendererMode = (typeof SPINE_RENDERER_MODES)[number];
export const DEFAULT_SPINE_RENDERER: SpineRendererMode = 'stable';

export function isSpineRendererMode(value: unknown): value is SpineRendererMode {
  return SPINE_RENDERER_MODES.includes(value as SpineRendererMode);
}

/**
 * 兼容旧版本布局：
 * 1. 早期使用 <root>/configs/
 * 2. 早期配置文件名为 global_settings.yml，迁移至 global_config.yml
 */
function migrateLegacyConfigDir(paths: StoragePaths) {
  // 迁移 configs 目录
  const legacyDir = path.join(paths.rootDir, 'configs');
  if (fs.existsSync(legacyDir)) {
    const legacyFile = path.join(legacyDir, 'global_settings.yml');
    if (!fs.existsSync(paths.settingsFile) && fs.existsSync(legacyFile)) {
      try {
        fs.copyFileSync(legacyFile, paths.settingsFile);
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
  if (!fs.existsSync(paths.settingsFile) && fs.existsSync(legacySettingsFile)) {
    try {
      fs.copyFileSync(legacySettingsFile, paths.settingsFile);
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
 * 1. 创建资源根目录及 res / preload / config 三个子目录
 * 2. 若全局配置文件不存在则创建空配置
 * 3. 读取并返回全局配置
 */
export function initializeStorage(): StorageInitResult {
  const paths = getStoragePaths();
  const firstRun = !fs.existsSync(paths.rootDir);

  const dirs = [paths.rootDir, paths.resDir, paths.preloadDir, paths.configDir];
  for (const dir of dirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      throw new Error(
        `无法创建资源目录: ${dir}\n` +
        `请确认该路径可写，或通过环境变量 OUR_ARCHIVE_DATA_DIR 指定其他位置。\n` +
        `原因: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  migrateLegacyConfigDir(paths);

  if (!fs.existsSync(paths.settingsFile)) {
    fs.writeFileSync(paths.settingsFile, DEFAULT_CONFIG_CONTENT, 'utf-8');
  }

  return {
    paths,
    firstRun,
    settings: loadSettings(paths),
  };
}

/**
 * 读取全局配置。文件缺失或解析失败时返回默认配置。
 */
export function loadSettings(paths: StoragePaths = getStoragePaths()): GlobalSettings {
  const defaults: GlobalSettings = {
    main_bgm_volume: 50,
    preview_volume: 60,
    spine_renderer: DEFAULT_SPINE_RENDERER,
  };

  if (!fs.existsSync(paths.settingsFile)) {
    return defaults;
  }

  try {
    const parsed = parseYaml(fs.readFileSync(paths.settingsFile, 'utf-8'));
    if (parsed && typeof parsed === 'object') {
      const merged: GlobalSettings = {
        ...defaults,
        ...(parsed as GlobalSettings),
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
      `[Our Archive] 配置文件解析失败，将使用默认配置: ${paths.settingsFile}`,
      error instanceof Error ? error.message : error
    );
  }

  return defaults;
}

/**
 * 合并写入全局配置。
 */
export function saveSettings(
  settings: GlobalSettings,
  paths: StoragePaths = getStoragePaths()
): GlobalSettings {
  const merged = { ...loadSettings(paths), ...settings };

  fs.mkdirSync(paths.configDir, { recursive: true });
  fs.writeFileSync(
    paths.settingsFile,
    stringifyYaml(merged, { indent: 2, lineWidth: -1, noRefs: true }),
    'utf-8'
  );

  return merged;
}

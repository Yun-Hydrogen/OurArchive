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

const EMPTY_SETTINGS = '{}\n';

/**
 * 兼容旧版本布局：早期使用 <root>/configs/global_settings.yml，
 * 现在统一为 <root>/config/global_settings.yml。存在旧文件时迁移其内容。
 */
function migrateLegacyConfigDir(paths: StoragePaths) {
  const legacyDir = path.join(paths.rootDir, 'configs');
  if (!fs.existsSync(legacyDir)) {
    return;
  }

  const legacyFile = path.join(legacyDir, SETTINGS_FILE_NAME);
  const hasNewFile = fs.existsSync(paths.settingsFile);

  if (!hasNewFile && fs.existsSync(legacyFile)) {
    try {
      fs.copyFileSync(legacyFile, paths.settingsFile);
    } catch (error) {
      console.warn(
        `[Our Archive] 旧配置迁移失败，将使用空配置: ${legacyFile}`,
        error instanceof Error ? error.message : error
      );
      return;
    }
  }

  try {
    fs.rmSync(legacyDir, { recursive: true, force: true });
  } catch {
    // 迁移失败不影响启动
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
    fs.writeFileSync(paths.settingsFile, EMPTY_SETTINGS, 'utf-8');
  }

  return {
    paths,
    firstRun,
    settings: loadSettings(paths),
  };
}

/**
 * 读取全局配置。文件缺失或解析失败时返回空配置。
 */
export function loadSettings(paths: StoragePaths = getStoragePaths()): GlobalSettings {
  if (!fs.existsSync(paths.settingsFile)) {
    return {};
  }

  try {
    const parsed = parseYaml(fs.readFileSync(paths.settingsFile, 'utf-8'));
    if (parsed && typeof parsed === 'object') {
      return parsed as GlobalSettings;
    }
  } catch (error) {
    console.warn(
      `[Our Archive] 配置文件解析失败，将使用空配置: ${paths.settingsFile}`,
      error instanceof Error ? error.message : error
    );
  }

  return {};
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

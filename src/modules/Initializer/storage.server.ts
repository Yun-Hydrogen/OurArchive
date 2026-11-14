/**
 * 资源根目录的初始化：创建 res / preload / config / plugins 子目录。
 *
 * 只负责「目录存在性」；配置的读写与旧布局迁移在 `ConfigProvider/configStore.server.ts`。
 */
import fs from 'node:fs';
import { getStoragePaths, type StoragePaths } from '@/modules/Initializer/paths.server';
import {
  ensureConfigFile,
  loadGlobalConfig,
  migrateLegacyConfigDir,
  type GlobalConfig,
} from '@/modules/ConfigProvider/configStore.server';

export interface StorageInitResult {
  paths: StoragePaths;
  /** 本次启动是否为首次创建资源根目录 */
  firstRun: boolean;
  config: GlobalConfig;
}
export function initializeStorage(): StorageInitResult {
  const paths = getStoragePaths();
  const firstRun = !fs.existsSync(paths.rootDir);

  const dirs = [
    paths.rootDir,
    paths.resDir,
    paths.preloadDir,
    paths.configDir,
    paths.pluginsDir,
    paths.spinePluginDir,
  ];
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

  ensureConfigFile(paths);

  return {
    paths,
    firstRun,
    config: loadGlobalConfig(paths),
  };
}

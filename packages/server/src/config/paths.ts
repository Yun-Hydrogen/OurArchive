import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export type SupportedPlatform = 'windows' | 'linux' | 'android' | 'macos' | 'unknown';

/**
 * 资源根目录下的三个固定子目录
 * - res:     资源文件
 * - preload: 预加载内容
 * - config:  配置
 */
export const STORAGE_DIRS = {
  res: 'res',
  preload: 'preload',
  config: 'config',
} as const;

export const SETTINGS_FILE_NAME = 'global_config.yml';
export const PRELOAD_ASSETS_FILE_NAME = 'preload_assets.yml';

export interface StoragePaths {
  platform: SupportedPlatform;
  /** 资源根目录，例如 Windows 的 <用户文档>/OurArchive */
  rootDir: string;
  resDir: string;
  preloadDir: string;
  configDir: string;
  settingsFile: string;
}

/**
 * 识别运行平台（含 Termux 等 Android 终端环境）
 */
export function detectPlatform(): SupportedPlatform {
  if (process.platform === 'win32') {
    return 'windows';
  }

  if (
    process.platform === 'android' ||
    Boolean(process.env.TERMUX_VERSION) ||
    Boolean(process.env.ANDROID_ROOT)
  ) {
    return 'android';
  }

  if (process.platform === 'linux') {
    return 'linux';
  }

  if (process.platform === 'darwin') {
    return 'macos';
  }

  return 'unknown';
}

/**
 * 各平台的默认资源根目录：
 * - Windows: <用户文档>/OurArchive  （优先 Documents，其次 OneDrive/Documents）
 * - Linux:   /home/<用户名>/OurArchive
 * - Android: /sdcard/OurArchive
 */
export function getDefaultRootDir(): string {
  switch (detectPlatform()) {
    case 'windows': {
      const home = os.homedir();
      const candidates = [
        path.join(home, 'Documents'),
        path.join(home, 'OneDrive', 'Documents'),
      ];
      const docsDir = candidates.find((dir) => fs.existsSync(dir)) ?? home;
      return path.join(docsDir, 'OurArchive');
    }

    case 'android':
      return '/sdcard/OurArchive';

    case 'linux':
    case 'macos':
    case 'unknown':
    default:
      return path.join(os.homedir(), 'OurArchive');
  }
}

/**
 * 资源根目录。可通过环境变量 OUR_ARCHIVE_DATA_DIR 覆盖（便于开发与测试）。
 */
export function getStorageRootDir(): string {
  const override = process.env.OUR_ARCHIVE_DATA_DIR;
  return override ? path.resolve(override) : getDefaultRootDir();
}

/**
 * 解析完整的存储路径结构。
 */
export function getStoragePaths(): StoragePaths {
  const rootDir = getStorageRootDir();

  return {
    platform: detectPlatform(),
    rootDir,
    resDir: path.join(rootDir, STORAGE_DIRS.res),
    preloadDir: path.join(rootDir, STORAGE_DIRS.preload),
    configDir: path.join(rootDir, STORAGE_DIRS.config),
    settingsFile: path.join(rootDir, STORAGE_DIRS.config, SETTINGS_FILE_NAME),
  };
}

/**
 * 解析随代码一同分发的预加载资源清单 preload_assets.yml 路径。
 * 优先级：
 * 1. 运行目录同级（Windows 单文件 exe 打包根目录）
 * 2. 运行目录父级（Linux / Android 的 server/ 上级打包根目录）
 * 3. 项目根目录（开发与构建环境）
 */
export function resolvePreloadAssetsPath(currentDir: string): string | null {
  const candidates = [
    path.resolve(currentDir, PRELOAD_ASSETS_FILE_NAME),
    path.resolve(currentDir, '..', PRELOAD_ASSETS_FILE_NAME),
    path.resolve(process.cwd(), PRELOAD_ASSETS_FILE_NAME),
    path.resolve(currentDir, '../../', PRELOAD_ASSETS_FILE_NAME),
    path.resolve(currentDir, '../../../', PRELOAD_ASSETS_FILE_NAME),
    path.resolve(process.cwd(), 'resources', PRELOAD_ASSETS_FILE_NAME),
  ];

  return candidates.find((filePath) => fs.existsSync(filePath)) ?? null;
}

# 存储与配置

覆盖：[config/paths.ts](../../packages/server/src/config/paths.ts)（路径解析）、[config/storage.ts](../../packages/server/src/config/storage.ts)（初始化与读写）

只管**用户数据目录**；项目自带美术 / 音频随前端打包，见 [app-shell.md](../client/app-shell.md)。

## 目录规范

| 平台 | 资源根目录 |
| --- | --- |
| Windows | `C:\Users\<用户>\Documents\OurArchive`（无 `Documents` 时回退 `OneDrive\Documents`，再退回 `$HOME`） |
| Linux | `/home/<用户>/OurArchive` |
| Android | `/sdcard/OurArchive` |
| macOS / 未知 | `~/OurArchive` |

```
<root>/
├── res/                      # 资源（剧本引用的图片、音频）
├── preload/                  # 预加载内容
└── config/global_settings.yml
```

首次启动后的 `global_settings.yml` 内容为 `{}`，不写入任何业务数据。

## paths.ts

导出：`STORAGE_DIRS`（`{res, preload, config}`）、`SETTINGS_FILE_NAME`（`global_settings.yml`）、`StoragePaths`、`detectPlatform()`、`getDefaultRootDir()`、`getStorageRootDir()`、`getStoragePaths()`。

```ts
interface StoragePaths {
  platform: SupportedPlatform;  // windows | linux | android | macos | unknown
  rootDir: string; resDir: string; preloadDir: string; configDir: string;
  settingsFile: string;         // <root>/config/global_settings.yml
}
```

平台判定顺序：`win32` → windows；`process.platform === 'android'` 或存在 `TERMUX_VERSION` / `ANDROID_ROOT` → android（Termux 下 `process.platform` 仍是 `linux`，必须靠环境变量识别）；`linux` → linux；`darwin` → macos；其余 unknown。**不探测 `/sdcard` 是否存在**，避免普通 Linux 挂载点误判。

根目录：`OUR_ARCHIVE_DATA_DIR` 优先（`path.resolve` 后使用），否则取平台默认值。`paths.ts` 是纯函数、不碰磁盘，可随时调用。

## storage.ts

导出：`GlobalSettings`（`Record<string, unknown>`）、`StorageInitResult`（`{ paths, firstRun, settings }`）、`initializeStorage()`、`loadSettings(paths?)`、`saveSettings(settings, paths?)`。

`initializeStorage()` 顺序：

1. `firstRun = !fs.existsSync(rootDir)`；
2. `mkdirSync(recursive: true)` 创建根目录 + 三个子目录（已存在则跳过）；
3. 迁移旧布局（见下）；
4. `global_settings.yml` 不存在时写入 `{}\n`；
5. 读取并返回配置。

失败策略：目录创建失败 → 抛出**带路径 + 原因 + 解决建议**的错误，由启动流程 `exit(1)`；配置解析失败 → 只告警并返回 `{}`，保证服务能起来。

旧布局迁移：早年配置在 `<root>/configs/`（复数），现统一 `config/`。旧文件存在且新文件不存在时复制，新文件已存在则**不覆盖**；复制失败仅告警；迁移后尝试删除旧目录（失败忽略）。**迁移失败不阻断启动**。

配置读写：`js-yaml` 的 `load`，非对象一律 `{}`；`saveSettings()` 为浅合并 `{ ...loadSettings(), ...patch }` 后 `dump`（`indent: 2`、`lineWidth: -1`、`noRefs: true`），写入前确保 `configDir` 存在。

## 扩展

| 需求 | 做法 |
| --- | --- |
| 新增配置项 | 直接 `saveSettings({ key: value })`，无 schema |
| 需要类型安全 | 在 `GlobalSettings` 上定义接口并在读取后校验，不要改 `loadSettings()` |
| 需要原子写入 | 改为「写临时文件 + rename」 |
| 新增子目录 | 同步改 `STORAGE_DIRS` / `StoragePaths` / `getStoragePaths()` 与 `initializeStorage()` 的目录数组 |

- 业务代码**不要拼路径**，一律 `getStoragePaths()`。
- `resources/OurArchive/LICENSE`：该目录资产为 CC BY-NC-ND 4.0，不在 AGPLv3 覆盖范围内。

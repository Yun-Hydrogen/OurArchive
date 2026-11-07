关联后端文件：
`packages/server/src/config/paths.ts` — 路径解析（纯函数，不碰磁盘）
`packages/server/src/config/storage.ts` — 初始化与 `global_config.yml` 读写
`packages/server/src/config/preload.ts` — 预加载清单校验与缓存
`packages/server/src/config/packages.ts` — 资源包索引与单包读取
`packages/server/src/config/server.ts` — 端口与监听地址（见 `startup.md`）
`packages/server/src/config/publicUrl.ts` — 对外地址（见 `startup.md`）
`packages/server/src/routes/preload.ts` — 预加载资源 API

用法：

### `getStoragePaths()` / `resolvePreloadAssetsPath(currentDir)`

1. 作用：全后端取路径的唯一入口；2. `getStoragePaths()` 返回 `StoragePaths`（`rootDir` / `resDir` / `preloadDir` / `configDir` / `configFile`）；3. `resolvePreloadAssetsPath` 按优先级找随分发的 `preload_assets.yml`（运行目录同级 → 父级 → 仓库根 → 客户端 `resources/`）。
2. 输入：`getStoragePaths()` 无参；`resolvePreloadAssetsPath(currentDir: string)`。
3. 注意事项：`paths.ts` 是纯函数，**可以随时调用**；业务代码不要拼路径，一律走 `getStoragePaths()`。资源根目录可用 `OUR_ARCHIVE_DATA_DIR` 覆盖。

### `detectPlatform()`

1. 作用：识别平台（`windows` / `linux` / `android` / `macos` / `unknown`）；2. **Termux 下 `process.platform` 仍是 `linux`**，必须靠 `TERMUX_VERSION` / `ANDROID_ROOT` 环境变量识别 Android；3. 不要探测 `/sdcard` 是否存在——普通 Linux 挂载点会误判。
2. 输入：无；输出：`SupportedPlatform`。
3. 注意事项：平台决定资源根目录默认值（Windows 优先 `Documents`，其次 `OneDrive/Documents`，再回退 home；Android 为 `/sdcard/OurArchive`）。

### `loadGlobalConfig(paths?)` / `saveGlobalConfig(config, paths?)`

1. 作用：读 / 写 `global_config.yml`；2. 读时以默认值打底再浅合并文件内容，音量项统一钳制 0–100 整数，`spine_renderer` 只接受 `aggressive | stable | conservative`，非法值回退 `stable`；3. 写时先 `loadGlobalConfig()` 合并再 `dump`（`indent: 2`、`lineWidth: -1`、`noRefs: true`）。
2. 输入输出：`GlobalConfig`（字段即 yml 的键，snake_case）。
3. 注意事项：文件缺失或解析失败时返回默认值并 `console.warn`（带 `[Our Archive]` 前缀），**不抛错**；写文件前先 `mkdirSync(configDir)`。

### `loadPreloadAssets(currentDir, paths?)` / `getPreloadCheckResult()`

1. 作用：读随分发的清单，逐项比对用户 `preload/` 下文件是否存在；2. 清单 `assets` 数组每项：`id`（全小写）、`file`（以 `preload` 开头的相对路径）、`file_type`（只认这一种拼写，不兜底 `file_tpye` / `type`）；3. 结果缓存到模块级 `cachedPreloadResult`，`getPreloadCheckResult()` 供路由与横幅读取。
2. 输入：当前目录与 `StoragePaths`；输出：`PreloadCheckResult`（`total` / `loaded` / `missing` / `isComplete` / `items` / `missingItems` / `warningMessage?`）。
3. 注意事项：清单找不到、空、解析失败都返回「不完整」并带 `PRELOAD_INCOMPLETE_WARNING`，不会抛错；`id` 统一小写化后再比对。

### `scanResourcePackages(paths?)` / `resolvePackageDir(id)`

1. 作用：`res/` 下每个带 `package.yml` 的一级目录是一个资源包；2. `resolvePackageDir` 校验 id 只允许一级目录名（`.`、`..`、含分隔符一律非法），并要求清单存在。
2. 输入输出：`ResourcePackage[]` / `string | null`。
3. 注意事项：**只做文件索引**，不校验内容完整性、不加载资源本体；`resDir` 还没建立时返回 `[]`（前端显示空列表）。

### `readResourcePackage(packageDir, id)`（内部函数）

1. 作用：解析单个 `package.yml`；2. 顶层必须是列表，列表项里找 `package_info` 段与 `package_content` 段，缺 `package_info` 即 `valid: false` 并带 `error`；3. `updatedAt` 取清单的 `mtime`（取不到就不填）。
2. 输入输出：`packageDir`、`id` → `ResourcePackage | null`（无清单返回 `null`，即不是资源包）。
3. 注意事项：读文件前剥离 BOM（`replace(/^\uFEFF/, '')`），手写文件常带 BOM；解析失败返回带 `error` 的包而不是抛错，前端据此显示「解析失败」。

### `resolveInside(baseDir, relativePath)`

1. 作用：把相对路径解析成绝对路径，越界返回 `null`；2. 归一化：反斜杠转正斜杠、去前导斜杠、含 `..` 直接拒绝；3. 再用 `path.resolve` 与 `startsWith(base + sep)` 双重校验。
2. 输入输出：`string, string → string | null`。
3. 注意事项：**所有下发文件的路径都必须经过它**，不要直接 `path.join` 拼用户可控路径。

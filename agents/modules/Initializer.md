# Initializer — 服务端初始化、路径解析、存储就绪、Spine 插件与静态托管

> 源码：`src/modules/Initializer/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `paths.server.ts` | 平台探测（含 Termux 识别）、路径常量与全后端统一的路径解析（纯函数，服务端专用） |
| `storage.server.ts` | `initializeStorage()`：创建基础目录、判定首次运行 `firstRun`、触发旧配置迁移（服务端专用） |
| `preload.server.ts` | `loadPreloadAssets()`：校验随程序分发的预加载资源清单与用户本地文件完整性（服务端专用） |
| `spinePlugin.server.ts` | `ensureSpineRuntime()`：Spine 运行时文件存在性检查、交互询问与按需下载（服务端专用） |
| `port.server.ts` | 服务监听端口与 `0.0.0.0` 绑定配置（服务端专用） |
| `publicUrl.server.ts` | 启动展示用的本地 / 局域网访问地址解析（服务端专用） |
| `mountClient.server.ts` | 前端构建产物定位、静态资源托管与 SPA fallback（服务端专用） |
| `banner.server.ts` | 启动完成控制台 ASCII 横幅与运行状态输出（服务端专用） |

## 职责边界

- 做：服务端冷启动阶段的一切初始化工作——跨平台存储路径探测、基础目录创建与首次运行判定、预加载清单校验、Spine 运行时检测与交互下载、端口与访问地址解析、前端产物托管与启动横幅打印。
- 不做：配置的业务语义与读写规则（交由 `ConfigProvider` 处理）、API 端点业务逻辑（交由 `API` 与各 `Provider` 处理）。

## 关键实现

### `getStoragePaths()` / `detectPlatform()`（`paths.server.ts`）

1. 作用：全后端获取存储路径的唯一真源；`detectPlatform()` 识别 `windows` / `linux` / `android` / `macos` / `unknown`。
2. 输入输出：`detectPlatform(): SupportedPlatform`；`getStoragePaths(): StoragePaths`，包含 `rootDir`、`resDir`、`preloadDir`、`configDir`、`configFile`、`pluginsDir`、`spinePluginDir`。
3. 平台根目录默认规则：
   - Windows：`<用户主目录>/Documents/OurArchive`，若不存在则候选 `<用户主目录>/OneDrive/Documents/OurArchive`，再回退至 `<用户主目录>/OurArchive`。
   - Android：`/sdcard/OurArchive`。
   - Linux / macOS / unknown：`<用户主目录>/OurArchive`。
4. 注意事项：Termux 环境下 `process.platform` 仍然为 `'linux'`，必须依靠 `TERMUX_VERSION` 或 `ANDROID_ROOT` 环境变量判断为 `'android'`（见 [NeedNotice](../NeedNotice.md) 条目 08）；禁止通过判断 `/sdcard` 存在性来识别，避免 Linux 挂载点误判；可通过环境变量 `OUR_ARCHIVE_DATA_DIR` 覆盖根目录。

### `resolvePreloadAssetsPath(currentDir)`（`paths.server.ts`）

1. 作用：按固定优先级查找随包分发的预加载清单文件 `preload_assets.yml`。
2. 候选查找顺序：
   - `path.resolve(currentDir, 'preload_assets.yml')`（单文件 exe：清单与可执行文件同级）
   - `path.resolve(currentDir, '..', 'preload_assets.yml')`（发行包：`server/` 的上级打包根目录）
   - `path.resolve(currentDir, '../../', 'preload_assets.yml')`（生产环境 `dist/server/` 上两级；开发环境 `src/` 上一级）
   - `path.resolve(process.cwd(), 'preload_assets.yml')`
   - `path.resolve(process.cwd(), 'dist', 'preload_assets.yml')`
3. 注意事项：候选顺序严格代表优先级，不得擅自调整，确保三种打包与运行形态都能命中清单（见 [NeedNotice](../NeedNotice.md) 条目 09）。

### `initializeStorage()`（`storage.server.ts`）

1. 作用：启动阶段最先执行；创建根目录及 `res`、`preload`、`config`、`plugins`、`plugins/spine` 5 个子目录，判定 `firstRun`，执行旧配置迁移并确保默认配置存在。
2. 输入输出：无参；返回 `StorageInitResult`（包含 `paths`、`firstRun`、`config`）。
3. 注意事项：任何基础子目录创建失败时，直接抛出携带修复建议的详细 Error，导致主进程退出（`process.exit(1)`），这是系统冷启动时**唯一允许抛错退出的阻断路径**。旧配置迁移委托给 `ConfigProvider/configStore.server.ts` 执行。

### `loadPreloadAssets(currentDir, paths?)`（`preload.server.ts`）

1. 作用：读取随代码分发的 `preload_assets.yml`，对照检查用户 `<root>/preload/` 下文件是否存在并全局缓存校验结果。
2. 输入输出：`(currentDir: string, paths?: StoragePaths): PreloadCheckResult`；配套导出 `getPreloadCheckResult()` 供路由及横幅随时读取。
3. 清单与比对口径：
   - 清单项结构：`id`（唯一标识，比对时统一转小写）、`file`（以 `preload` 为起点的相对路径）、`file_type`。
   - 字段校验：资产类型严格只认 `file_type` 字段（不兜底手误拼写的 `file_tpye` 或 `type`，见 [NeedNotice](../NeedNotice.md) 条目 11）。
   - 路径解析与安全：剥离前导斜杠，以 `preload` 开头的相对路径拼入 `rootDir`，否则拼入 `preloadDir`；使用 `startsWith(rootDir)` 严防路径穿越。
4. 注意事项：清单缺失、内容为空或解析失败时，记录警告并返回 `isComplete: false` 附带警告提示，绝不抛错阻断服务启动。

### `ensureSpineRuntime(paths)`（`spinePlugin.server.ts`）

1. 作用：检查 `<root>/plugins/spine/` 下三个必需文件（`spine-webgl.mjs`、`spine-canvas.mjs`、`LICENSE`，版本 `4.2.120`）。缺失时展示许可协议并引导用户选择。
2. 输入输出：`(paths: StoragePaths): Promise<SpineRuntimeStatus>`。
3. 交互模式与自动化：
   - 模式选项：`auto`（自动从 jsDelivr / unpkg 下载 ESM 产物至本地并落盘）、`manual`（输出目标目录及 CDN 地址，指导用户手动放置）、`none`（强制跳过，立绘预览报不可用）。
   - 非阻塞保证：选择 `manual`、`none`、无 TTY / 等待选择超时 30 秒默认回退 `manual`，以及下载失败后降级 `manual`，**均正常启动后端**，绝不退出进程。
   - 环境变量优先：可由环境变量 `OUR_ARCHIVE_SPINE_MODE=auto|manual|none` 直接指定模式；兼容历史变量 `OUR_ARCHIVE_SPINE_DOWNLOAD=1` 映射为 `auto`。
   - 管道 stdin 交互兼容：开发环境下 `concurrently` 管道转发导致 `isTTY` 为 false，通过 `OUR_ARCHIVE_INTERACTIVE=1` 允许进入控制台询问（见 [NeedNotice](../NeedNotice.md) 条目 07）。

### `resolveClientDistPath(currentDir)` / `mountClient(app, clientDistPath)`（`mountClient.server.ts`）

1. 作用：定位前端静态产物目录并挂载 SPA fallback。
2. 候选路径顺序：`currentDir/client` → `currentDir/../client` → `cwd/client` → `currentDir/../dist/client` → `currentDir/../../dist/client` → `cwd/dist/client` → `cwd/dist`。以第一个包含 `index.html` 的目录为准（见 [NeedNotice](../NeedNotice.md) 条目 20）。
3. SPA 路由规则：
   - `express.static(clientDistPath, { index: false })` 托管文件。
   - `GET *` 处理单页回退下发 `index.html` 前，必须前置拦截：若 `req.path === '/api'` 或以 `'/api/'` 开头，或者 `req.path === '/plugins'` 或以 `'/plugins/'` 开头，一律调用 `next()` 穿透至 404 处理，严禁为未知 API 或缺失插件脚本返回 HTML（见 [NeedNotice](../NeedNotice.md) 条目 19、22）。
4. 兜底保护：当 `clientDistPath` 为 null 时，根路由返回简易 HTML 页面提示先运行 `npm run build`。

### `resolvePort()` / `printStartupInfo(info)`（`port.server.ts` / `banner.server.ts`）

1. 作用：确定监听端口并格式化输出启动成功信息。
2. 端口逻辑：生产环境默认使用 `5173`（后端自行托管前端）；开发环境由 Vite 占用 5173，后端由启动脚本将环境变量 `PORT` 置为 `3000`。监听地址固定为 `0.0.0.0`。
3. 输出细节：横幅中标签固定为英文（`Local:`、`Network:`、`Storage:`、`Dirs:` 等），内容显示中文；子目录路径通过 `path.relative` 相对化输出，避免冗长绝对路径。

## 注意事项

- 必须保持纯净依赖：`paths.server.ts` 是无副作用纯函数，业务代码严禁手动拼路径，统一使用 `getStoragePaths()`。
- 启动初始化顺序严格固定：`initializeStorage()` → `loadPreloadAssets()` → `ensureSpineRuntime()` → 注册 `/plugins` 静态托管与各 API 路由 → `mountClient()` → `app.listen()` → `printStartupInfo()`。
- `/plugins` 托管必须配置 `setHeaders`，显式为 `.mjs` 声明 `Content-Type: text/javascript; charset=utf-8`。

## 相关文档

- [ConfigProvider](./ConfigProvider.md)
- [API](./API.md)
- [NeedNotice](../NeedNotice.md)

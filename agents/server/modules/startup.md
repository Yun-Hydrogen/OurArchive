关联后端文件：
`packages/server/src/index.ts` — 启动编排（唯一入口）
`packages/server/src/config/server.ts` — 端口与监听地址
`packages/server/src/config/publicUrl.ts` — 对外访问地址（本地 / 局域网）
`packages/server/src/config/spine.ts` — Spine 运行时检测与按需下载
`packages/server/src/app/mountClient.ts` — 静态托管与 SPA fallback
`packages/server/src/utils/banner.ts` — 启动横幅输出

用法：

### `initializeStorage()`

1. 作用：首次启动与每次启动都跑；创建 `<root>/{res,preload,config,plugins,plugins/spine}`，迁移旧布局，写入默认 `global_config.yml`，返回路径与配置内容。
2. 输入：无；输出：`StorageInitResult`（`paths`、`firstRun`、`config`）。
3. 注意事项：目录创建失败时抛错并在 `index.ts` 里 `process.exit(1)`——**这是唯一要退出的路径**；旧布局迁移（`configs/`、`global_settings.yml`）失败只 `console.warn`，不阻断启动。

### `resolvePort()`

1. 作用：监听端口；2. 优先 `PORT`（开发脚本设为 3000），其次 `DEFAULT_PORT = 5173`（生产后端自己托管前端）；3. `SERVER_HOST = '0.0.0.0'`，便于局域网访问。
2. 输入：无；输出：`number`。
3. 注意事项：开发时 Vite 占 5173，`PORT` 必须由 dev 脚本显式设置，否则会“静默换端口”。

### `resolvePublicPort()` / `resolvePublicUrl()` / `resolveNetworkUrl()`

1. 作用：决定启动横幅上打印的对外地址；2. `resolvePublicPort` 优先 `OUR_ARCHIVE_PUBLIC_PORT`，回落 5173；3. `resolveNetworkUrl` 遍历网卡找第一个非内网 IPv4，找不到返回 `null`（横幅里不打印 Network 一行）。
2. 输入输出：均为无参，返回 `number` / `string` / `string | null`。
3. 注意事项：横幅上的地址是告知用，不参与监听。

### `ensureSpineRuntime(paths)`

1. 作用：启动时在监听端口前检查 `plugins/spine/`，缺失则展示协议并给出三种选择（`auto` 自动下载 / `manual` 手动放入 / `none` 强制无 Spine）；2. 选择 `auto` 时下载三个文件（`spine-webgl.mjs` / `spine-canvas.mjs` / `LICENSE`），然后返回 `SpineRuntimeStatus`；3. 手动放置、强制无 Spine、非 TTY 或下载失败都只打印提示，**不 `exit`、不阻断启动**。
2. 输入：`StoragePaths`；输出：`Promise<SpineRuntimeStatus>`。
3. 注意事项：这是唯一的联网路径；`npm run dev` 的 `concurrently` 已加 `--handle-input --default-input-target SERVER`，server 的 dev 脚本使用 `node --watch --import tsx`（`tsx watch` 会吞掉 stdin），并由根脚本设置 `OUR_ARCHIVE_INTERACTIVE=1`；无 TTY 且无输入时 30 秒后默认 `manual`，也可用 `OUR_ARCHIVE_SPINE_MODE=auto|manual|none` 直接指定。

### `resolveClientDistPath(currentDir)`

1. 作用：找前端构建产物（`client/dist` 里的 `index.html`）；2. 候选路径按序试——单文件 exe 打包后、Linux/Android 的 `server/` 上级、开发时的 `packages/client/dist`；3. 找不到返回 `null`，由 `mountClient` 兜底成最小提示页。
2. 输入：`currentDir: string`（`index.ts` 的目录）；输出：`string | null`。
3. 注意事项：候选顺序即优先级，不要随意改顺序；单文件 exe 靠前是刻意设计。

### `mountClient(app, clientDistPath)`

1. 作用：挂载静态资源与 SPA fallback；2. `express.static(clientDistPath, { index: false })` 只服务静态文件；`GET *` 时先判断是否以 `/api/` 或 `/plugins/` 开头（是则 `next()`，避免未知 API / 缺失插件返回 HTML），否则下发 `index.html`；3. 产物缺失时返回最小提示页，说明后端已启动。
2. 输入：`Express`、`string | null`；输出：无（在 `app` 上挂路由）。
3. 注意事项：`index.ts` 里必须在 `app.use('/api/...')` **之后**才 `mountClient`，否则 API 会被 fallback 吞掉；`/plugins` 的静态托管在 `mountClient` 之前挂载。

### `printStartupInfo(info)`

1. 作用：打印启动横幅（Local / Network / Server / 平台 / Storage / Dirs / Config / Spine / Preload / 警告）；2. 参数 `StartupInfo` 含 `port`、`publicUrl`、`networkUrl?`、`storage`、`firstRun`、`configCount`、`clientDistPath`、`preload?`、`spine?`。
3. 注意事项：标签英文 + 内容中文是刻意设计（对齐常见 dev server 输出），不要「顺手」统一语言；`rel()` 用 `path.relative(rootDir, target)` 相对化显示，别打印绝对路径。

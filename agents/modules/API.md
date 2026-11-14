# API — 客户端网络通信底座、数据传输类型与服务端路由

> 源码：`src/modules/API/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `request.ts` | 客户端统一请求封装（`apiGet` / `apiPut`）、统一包络校验与 `ApiError` 异常体系 |
| `types.ts` | 跨端共享 DTO 类型契约（`ResourcePackage` / `PackageCharacter` / `PackageSkeleton` / `PackageMusic` 等） |
| `configApi.ts` | 客户端全局配置 API（`fetchGlobalConfig` / `saveGlobalConfig`） |
| `packagesApi.ts` | 客户端资源包 API（获取列表、详情、角色、骨骼、曲目、音效、背景图、表情） |
| `configRoutes.server.ts` | 服务端全局配置端点（`GET /api/config`、`PUT /api/config`，服务端专用） |
| `preloadRoutes.server.ts` | 服务端预加载清单及资源流端点（`GET /api/preload/assets`、`GET /api/preload/asset/:id`，服务端专用） |
| `packagesRoutes.server.ts` | 服务端资源包与下发静态资源全部路由（共 15 个端点，服务端专用） |

## 职责边界

- 做：前后端数据通信底座：统一的客户端 JSON 请求拦截和异常包装、跨端 DTO 类型契约，以及服务端的配置、预加载和资源包核心路由与文件下发。
- 不做：资源底层文件的解析与目录物理扫描（分别由 `PackageProvider`、`CharacterProvider`、`AudioProvider`、`BackgroundProvider`、`EmotionProvider` 承担）。

## 关键实现

### 服务端全部 API 端点表

| 方法 | 路径 | 响应内容 / 说明 |
| --- | --- | --- |
| `GET` | `/api/config` | 获取全局配置（`main_bgm_volume`、`preview_volume`、`spine_renderer`） |
| `PUT` | `/api/config` | 提交配置变更补丁，音量钳制在 0–100，渲染模式受守卫校验 |
| `GET` | `/api/preload/assets` | 获取所有预加载资源的校验清单与元数据状态 |
| `GET` | `/api/preload/asset/:id` | 获取指定预加载资源的文件内容本体（音频流 / 图片等） |
| `GET` | `/api/packages` | 扫描 `res/` 根目录列出全部资源包及总数 |
| `GET` | `/api/packages/:id` | 获取单个资源包的完整清单详情 |
| `GET` | `/api/packages/:id/characters` | 获取该包角色索引列表（含头像 URL 及立绘存在性判定） |
| `GET` | `/api/packages/:id/skeletons` | 获取该包全部立绘目录元数据（文件清单、体积、三件套完整度） |
| `GET` | `/api/packages/:id/skeleton/:skeletonId` | 获取指定立绘目录内的文件清单与体积 |
| `GET` | `/api/packages/:id/skeleton/:skeletonId/:file(*)` | 下发立绘文件本体（`.skel` / `.atlas` / `.png` 等） |
| `GET` | `/api/packages/:id/avatar/:file(*)` | 下发角色头像图片本体 |
| `GET` | `/api/packages/:id/music` | 获取背景音乐曲目列表（读取 `index/music_info.json`） |
| `GET` | `/api/packages/:id/music/:file(*)` | 下发背景音乐音频本体（带 Range 支持） |
| `GET` | `/api/packages/:id/sounds` | 获取音效列表与类别映射（读 `sound_info.json` + `categories.json`） |
| `GET` | `/api/packages/:id/sounds/:file(*)` | 下发音效音频本体（带 Range 支持） |
| `GET` | `/api/packages/:id/backgrounds` | 获取背景图列表与分类（读取 `index/category.yml`） |
| `GET` | `/api/packages/:id/backgrounds/:file(*)` | 下发背景图图片本体 |
| `GET` | `/api/packages/:id/emotions` | 获取表情清单列表（读取 `index/emotions.yml`） |
| `GET` | `/api/packages/:id/emotions/:file(*)` | 下发表情引用的图片或音效文件本体 |

### `apiGet<T>(url)` / `apiPut<T>(url, body)`（`request.ts`）

1. 作用：所有前端 JSON 交互必须通过此底座发起，严禁裸调 `fetch`。
2. 规范契约：
   - 成功响应体：`{ success: true, ...payload }`，`apiGet` / `apiPut` 解包后直接返回 payload 自身。
   - 失败响应体：`{ success: false, error: string }`，解析后抛出携带 HTTP 状态码的 `ApiError` 实例。
   - 异常捕获辅助：`apiErrorMessage(error, fallback)` 提取错误信息优先用于 UI 提示。
3. 输入输出：`apiGet<T>(url: string): Promise<T>`；`apiPut<T>(url: string, body: unknown): Promise<T>`。
4. 注意事项：图片、音频等二进制文件流不走此函数，直接由 `<img>`、`<audio>` 或原生 `fetch().blob()` 消费。

### 路由挂载顺序与通配符拦截（`packagesRoutes.server.ts`）

1. 作用：注册资源包相关端点，避免 Express 路由解析冲突。
2. 挂载原则：**路由挂载顺序严格固定**——带 `:file(*)` 通配符的静态文件端点必须注册在同前缀的列表端点**之后**。
   - 例如：`GET /:id/music` 必须在前，`GET /:id/music/:file(*)` 必须在后（若颠倒，访问曲目列表会被通配符抢先匹配导致解析错误，见 [NeedNotice](../NeedNotice.md) 条目 18）。
   - 音效（`sounds`）、背景图（`backgrounds`）、表情（`emotions`）与骨骼立绘（`skeleton`）均严格遵循此排布顺序。

### `sendFile(res, target)`（静态文件安全守卫）

1. 作用：全后端下发包内静态文件的统一守卫函数。
2. 输入输出：`(res: Response, target: string | null): void`。
3. 安全闸门与下发策略：
   - 路径越界阻断：必须经由 `resolveInside()` 校验安全路径，禁止路径穿越。
   - 文件存在性检查：目标必须物理存在且为普通文件（`statSync(target).isFile()`）。
   - 类型白名单过滤：必须在 `MIME_BY_EXTENSION` 扩展名白名单内（含 `.png/.jpg/.jpeg/.webp/.bmp/.gif/.avif`、`.skel`、`.atlas`、`.json` 以及 `.ogg/.opus/.mp3/.wav/.flac/.aac/.m4a` 等），非白名单一律返回 404（见 [NeedNotice](../NeedNotice.md) 条目 21）。
   - 响应头注入：统一注入 `Cache-Control: no-cache`。
   - 字节流下发：统一调用 Express 的 `res.sendFile(target)`，原生支持 HTTP 206 Range，这是前端音频播放可拖动 seek 的必要条件。

### `failNotFound` 与 `failInternal` 错误出口

1. 作用：收敛服务端 API 响应包络。
2. 注意事项：每个路由 handler 内部必须使用 `try ... catch` 捕获异常，调用 `failInternal(res, error)` 响应 500 JSON。严禁让未捕获异常冒泡至 Express 默认中间件，防止向客户端返回 HTML 错误页面。

## 注意事项

- 所有 API 路由处理函数必须包裹在 `try ... catch` 中，异常统一使用 `failInternal(res, error)` 返回 `{ success: false, error }` JSON，绝对不能让异常冒泡导致 Express 返回默认 HTML 错误页。
- 客户端未匹配的未知 `/api/*` 请求在 `mountClient` SPA fallback 中通过 `next()` 放行，返回纯粹的 404 响应，绝不能回退为前端的 `index.html`（见 [NeedNotice](../NeedNotice.md) 条目 19）。

## 相关文档

- [Initializer](./Initializer.md)
- [ConfigProvider](./ConfigProvider.md)
- [AudioPlayer](./AudioPlayer.md)
- [NeedNotice](../NeedNotice.md)

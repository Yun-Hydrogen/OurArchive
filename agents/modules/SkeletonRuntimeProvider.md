# SkeletonRuntimeProvider — Spine 官方 ESM 运行时动态加载与契约类型

> 源码：`src/modules/SkeletonRuntimeProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `runtime.ts` | 浏览器端动态加载器（从 `/plugins/spine/*.mjs` 懒加载运行时模块） |
| `spineTypes.ts` | Spine 运行时的最小结构类型声明（不复制官方源码、不打进依赖） |

## 职责边界

- 做什么：以单例 Promise 动态拉取服务端静态托管的 Spine WebGL / Canvas 运行时文件，提供纯浏览器端的运行时加载能力，并定义调用方所需的最小接口契约。
- 不做什么：不包含 Spine 核心代码与算法、不将 Spine 打包进前端 npm 依赖、不负责运行时的服务端下载与磁盘写入（服务端由 `Initializer/spinePlugin.server.ts` 处理）、不参与具体的画布绘制。

## 关键实现

### `loadSpineWebglRuntime()` / `loadSpineCanvasRuntime()`（`runtime.ts`）

1. 作用：动态按需加载对应的 Spine ESM 模块。
   - `SPINE_RUNTIME_BASE = '/plugins/spine'`：运行时静态托管基础路径。
   - WebGL 文件：`spine-webgl.mjs`（导出 `SpineWebglRuntime`）。
   - Canvas 文件：`spine-canvas.mjs`（导出 `SpineCanvasRuntime`）。
2. 输入输出：无入参；返回 `Promise<SpineWebglRuntime>` / `Promise<SpineCanvasRuntime>`。
3. 注意事项：
   - 动态 `import()` 必须标注 `/* @vite-ignore */`，避免 Vite 在构建时尝试静态解析第三方运行时（见 [NeedNotice](../NeedNotice.md) 条目 45）。
   - 单例 Promise 缓存机制：若加载失败，会清空内部 `pending` 引用，允许用户在后端补齐插件后无刷新重新触发加载，而不会永久卡在 reject 态。
   - 抛出的错误为中文友好提示，指导用户核对服务端 `plugins/spine/` 目录。

### `SPINE_RUNTIME_BASE` / 运行时部署契约

1. 作用：约定运行时的网络分发与本地存储路径。
2. 架构链路：
   - 服务端启动阶段：由 `Initializer/spinePlugin.server.ts` 检测 `<root>/plugins/spine/` 目录，在交互终端提供三种策略（`auto` 自动联网拉取、`manual` 手动放置、`none` 禁用 Spine），写入 `spine-webgl.mjs`、`spine-canvas.mjs` 与 `LICENSE`。
   - 服务端静态挂载：由 `Initializer/mountClient.server.ts` 将 `plugins/` 目录挂载到 `/plugins`，在 SPA fallback 规则中对 `/plugins` 显式避开 HTML 兜底。
   - 前端动态获取：前端仅持相对 URL 经浏览器 ES Module 机制原生载入。
3. 注意事项：
   - 本地 `plugins/spine/` 产物切勿提交进 Git 仓库，分发包与源码均不含 Spine 运行时代码。
   - 依赖解耦：Spine 官方 SDK 不进 package.json，避免许可协议冲突与打包膨胀。

### `spineTypes.ts`（最小接口声明）

1. 作用：由于项目未安装 `@esotericsoftware/*` npm 包，构建阶段无官方类型定义，此文件声明业务逻辑用到的最简骨架。
2. 包含结构：
   - 核心契约：`SpineCoreRuntime`（提供 `Physics`、`AttachmentTimeline`、`TextureAtlas`、`AtlasAttachmentLoader`、`SkeletonJson`、`SkeletonBinary`、`Skeleton`、`AnimationStateData`、`AnimationState`）。
   - WebGL 扩展：`SpineWebglRuntime`、`SpineGlContext`、`SpineShader`、`SpinePolygonBatcher`、`SpineGlTexture`、`SpineMatrix4` 等。
   - Canvas 扩展：`SpineCanvasRuntime`、`SpineCanvasTexture`、`SpineCanvasSkeletonRenderer` 等。
   - 骨骼与动画：`SpineSkeleton`、`SpineSkeletonData`、`SpineSlot`、`SpineSkin`、`SpineAnimation`、`SpineBounds`。
3. 注意事项：
   - 严禁为了补齐类型而将官方代码全部拷贝进来或安装依赖，只需在升级 Spine 版本时对照本文件核对接口兼容性（见 [NeedNotice](../NeedNotice.md) 条目 51）。
   - 声明仅涵盖本系统用到的核心属性与生命周期方法，不模拟完整 SDK 类型树。

## 注意事项

- Spine 运行时许可协议约束：禁止将 Spine 运行时打包进构建物或 npm 依赖中，分发时必须由最终用户或服务端按需加载（见 [NeedNotice](../NeedNotice.md) 条目 51）。
- WebGL 与 Canvas 独立包各自打包了一份 spine-core，各自的类名互非同一构造函数，因此**解析数据与绘制骨骼必须严格使用同一份 runtime**，切勿混用（见 [NeedNotice](../NeedNotice.md) 条目 45、52）。
- 运行时服务路径由后端以 `/plugins` 路由公开托管，静态回退逻辑中对 `/plugins` 前缀禁用了 SPA 的 HTML 兜底，防止资源丢失时返回 200 HTML 导致 MIME 解析崩溃（见 [NeedNotice](../NeedNotice.md) 条目 22）。
- 若网络受限且未手动放置运行时，前端调用时会捕获异常并抛出详尽指引，提示查看后端控制台说明。
- 升级 Spine 运行时版本时必须对照 `spineTypes.ts` 逐项验证构造器与字段签名。

## 相关文档

- [SkeletonRender](./SkeletonRender.md)
- [NeedNotice](../NeedNotice.md)

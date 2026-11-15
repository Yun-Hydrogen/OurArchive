# SkeletonRuntimeProvider — Spine Pixi 运行时动态加载与契约类型

> 源码：`src/modules/SkeletonRuntimeProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `runtime.ts` | 浏览器端动态加载器（从 `/plugins/spine/spine-pixi.js` 懒加载运行时模块） |
| `spineTypes.ts` | Spine Pixi 运行时的最小结构类型声明（不复制官方源码、不打进依赖） |

## 职责边界

- 做什么：以单例 Promise 动态拉取服务端静态托管的 Spine Pixi 运行时文件（`spine-pixi.js`），注入全局 `window.PIXI` 供其内部 require-shim 使用，绑定 `window.spine`，并定义调用方所需的最小接口契约。
- 不做什么：不把 Spine 官方运行时硬打进前端 npm 依赖、不负责运行时的服务端下载与磁盘写入（服务端由 `Initializer/spinePlugin.server.ts` 处理）、不参与具体的画布绘制。

## 关键实现

### `loadSpinePixiRuntime()`（`runtime.ts`）

1. 作用：动态按需加载对应的 Spine Pixi 运行时。
   - `SPINE_RUNTIME_BASE = '/plugins/spine'`：运行时静态托管基础路径。
   - 文件名：`spine-pixi.js`（导出 `SpinePixiRuntime` 并注入 `window.spine`）。
2. 输入输出：无入参；返回 `Promise<SpinePixiRuntime>`。
3. 机制：
   - 全局桥接：在加载前将 Vue/Vite 端安装的 `* as PIXI` 挂在 `window.PIXI`，保证 `spine-pixi-v7` 的 IIFE 包能顺利绑定 Pixi 扩展；
   - 动态脚本注入：通过 `<script>` 标签拉取 `/plugins/spine/spine-pixi.js`，加载完成后校验 `window.spine`；
   - 单例 Promise 缓存机制：若加载失败，会清空内部 `pendingLoader` 引用，允许用户在后端补齐插件后无刷新重新触发加载。

### `spineTypes.ts`（最小接口声明）

1. 包含结构：
   - 场景图与挂载：`SpineInstance`（继承自 `PIXI.Container`，持有 `skeleton` 与 `state`）。
   - 核心契约：`SpinePixiRuntime`（提供 `Spine`、`SpineTexture`、`SpineDebugRenderer`、`TextureAtlas`、`AtlasAttachmentLoader`、`SkeletonJson`、`SkeletonBinary`、`Skeleton`、`AnimationStateData`、`AnimationState`、`Physics`、`AttachmentTimeline`）。
   - 骨骼与动画：`SpineSkeleton`、`SpineSkeletonData`、`SpineSlot`、`SpineSkin`、`SpineAnimation`、`SpineBounds`。

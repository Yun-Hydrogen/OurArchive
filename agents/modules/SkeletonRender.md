# SkeletonRender — Spine 立绘渲染（Pixi.js 体系）与舞台交互

> 源码：`src/modules/SkeletonRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `backend.ts` | Pixi.js 舞台后端契约 `createSpineBackend`，初始化 `PIXI.Application` 与 PMA 纹理绑定 |
| `spinePackage.ts` | 立绘文件识别（三件套拆包、拖拽展开、服务端立绘组装） |
| `useSpineStage.ts` | 舞台交互调度：Spine 实例生命周期、差分覆盖、动作播放、平移缩放、暴露 `spineInstance` 与 `metrics` |
| `OASpineViewer.vue` | 预览舞台与控制面板组件（缩放/动作/差分/调试） |
| `OASpineUploader.vue` | 骨骼文件与文件夹拖拽/选择上传组件 |

## 职责边界

- 画什么：解析 Spine 二进制或 JSON 骨骼、装配图集与贴图、利用 Pixi.js + `spine-pixi-v7` 渲染树呈现立绘与差分/动作、支持平移缩放交互，并向外暴露 `spineInstance` 供表情系统（`EmotionRender`）直接挂载。
- 不做什么：不把 Spine 官方运行时内置打包进 npm 依赖（由 `SkeletonRuntimeProvider` 从 `/plugins/spine/spine-pixi.js` 动态加载，符合官方许可再分发协议）、不直接读写持久化配置（通过 `ConfigProvider`）、不管理页面跳转路由。

## 关键实现

### `createSpineBackend(canvas)`（`backend.ts`）

1. 作用：加载 `loadSpinePixiRuntime`，创建并初始化 `PIXI.Application`，统一管理 WebGL 舞台与纹理生命周期。
2. 纹理与 PMA：
   - 贴图通过 `createImageBitmap(file, { premultiplyAlpha: 'premultiply' })` 解码；
   - 包装为 `PIXI.BaseTexture` 时显式指定 `alphaMode: PIXI.ALPHA_MODES.PMA`，解决 BA 图集全黑透明区导致缩放发黑变粗的问题；
   - 挂载为 `runtime.SpineTexture.from(baseTexture)` 传递给图集页（SpineTexture 内部依赖 `baseTexture.resource.source`）。

### `useSpineStage(canvas, rendererMode)`（`useSpineStage.ts`）

1. 作用：管理骨骼加载、Pixi 场景图挂载、差分与动作播放；计算舞台包围盒、缩放与视口变换；输出 `spineInstance` 与 `metrics`。
2. 暴露接口：`status`、`error`、`info`、`variants`、`activeVariant`、`actions`、`activeAction`、`backendKind`、`canvasKey`、`zoom`、`metrics`、`spineInstance`、`pixiApp`、`debugRendering`、`load`、`setVariant`、`setAction`、`setZoom`、`resetView`、指针及滚轮事件等。
3. 关键机制：
   - 实例化：`new runtime.Spine({ skeletonData })`，直接加入 `app.stage.addChild(inst)`。
   - 容器属性：Spine 实例继承自 `PIXI.Container`，`position.set(x, y)` 与 `scale.set(scale)` 直接受 Pixi 矩阵管线管理。
   - 差分机制：BA 纯数字动画（`00`–`99`）通过 `AttachmentTimeline` 瞬时覆盖 slot。
   - 动作与更新：通过 `inst.state.setAnimation(0, name, true)` 播放动作；设置 `inst.autoUpdate` 自动同步 Pixi Ticker。
   - 表情挂载接口：暴露 `spineInstance`，表情系统可直接通过 `spineInstance.addChild(container)` 挂载，彻底摆脱外部浮动坐标带来的抖动和延迟。

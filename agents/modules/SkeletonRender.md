# SkeletonRender — Spine 立绘渲染、双后端适配与舞台交互

> 源码：`src/modules/SkeletonRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `backend.ts` | 后端契约 `SpineBackend` / `SpineBackendHandle`、模式分发与 WebGL 能力探测 |
| `webglBackend.ts` | WebGL 渲染后端：`PolygonBatcher` 合批 + 预乘 alpha（PMA）与 mipmap 管道 |
| `canvasBackend.ts` | Canvas 2D 渲染后端：`spine-canvas` 三角形渲染兜底 |
| `spinePackage.ts` | 立绘文件识别（三件套拆包、拖拽展开、服务端立绘组装） |
| `useSpineStage.ts` | 舞台交互调度：生命周期、差分覆盖、动作播放、视口投影、按需重绘 |
| `OASpineViewer.vue` | 预览舞台与控制面板组件（缩放/动作/差分/调试） |
| `OASpineUploader.vue` | 骨骼文件与文件夹拖拽/选择上传组件 |

## 职责边界

- 画什么：解析 Spine 二进制或 JSON 骨骼、装配图集与贴图、在 `<canvas>` 上绘制立绘与差分/动作、支持平移缩放交互，并向外暴露表情叠加所需的头顶锚点度量。
- 不做什么：不内置 Spine 官方运行时（由 `SkeletonRuntimeProvider` 从 `/plugins/spine/*.mjs` 动态加载）、不直接读写持久化配置（通过 `ConfigProvider`）、不管理页面跳转路由。

## 关键实现

### `createSpineBackend(canvas, mode)` / `canUseWebGL()`（`backend.ts`）

1. 作用：按 `spine_renderer` 配置项（`aggressive` / `stable` / `conservative`）创建对应后端，并带回同源的 `runtime` core API。
2. 输入输出：`canvas: HTMLCanvasElement`、`mode: SpineRendererMode`；返回 `Promise<SpineBackendHandle>`（`backend` + `runtime`）。
3. 注意事项：先用一次性临时 canvas 探测 WebGL 上下文，探测成功立刻调用 `loseContext()` 释放；绝不能直接在正式画布上试错，否则一旦占满或锁死上下文将导致无法退回 2D（见 [NeedNotice](../NeedNotice.md) 条目 44）。

### `webglBackend.ts` 与 `canvasBackend.ts`

1. 作用：WebGL 后端利用 `PolygonBatcher` 合批渲染高密度网格；Canvas 2D 后端作为兼容兜底。
2. 输入输出：实现 `SpineBackend` 接口（`kind`、`bindTextures`、`setViewport`、`render`、`dispose`）。
3. 注意事项：
   - 核心成本差异：Canvas 2D 成本与三角形数线性正比，阿罗娜 5863 个三角形在 Canvas 下每帧数千次 clip+drawImage 会直接跌至个位数帧率，WebGL 仅需 1~2 次 draw call（见 [NeedNotice](../NeedNotice.md) 条目 42）。
   - PMA 管道：直通图集透明区 RGB 多为黑，WebGL 必须走预乘 alpha 管道，三处开关必须同时匹配——① `createImageBitmap(file, { premultiplyAlpha: 'premultiply' })`；② `GLTexture.DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL = true`（注意语义为反向：置 true 阻止 GL 二次预乘）；③ `renderer.premultipliedAlpha = true`。只有 PMA 齐备时才开启 `USE_MIPMAPS = true`，否则细线发黑变粗（见 [NeedNotice](../NeedNotice.md) 条目 43）。
   - Canvas 2D 只能接收直通 alpha，贴图由后端在 `bindTextures` 内自行解码。

### `toSpineCharacters()` / `toSpineFilesFromDrop()` / `loadSpineCharacterFromPackage()`（`spinePackage.ts`）

1. 作用：把平铺文件识别为完整立绘包，或从服务端资源包按需拉取打包。
2. 输入输出：
   - 一个完整立绘包定义：同一目录下必须同时有骨骼（`.skel` 优先于 `.json`）、图集（`.atlas` 恰好 1 个）、贴图（`.png/.webp/.jpg/.jpeg` 至少 1 个）。
   - `loadSpineCharacterFromPackage(packageId, skeletonId)`：下载 Blob 包装成 `File` 走同一套拆包逻辑。
3. 注意事项：`toSpineFilesFromDrop` 递归遍历目录时，`readEntries` 一次最多返回 100 条，必须循环读取直至返回空数组，否则大目录严重丢文件（见 [NeedNotice](../NeedNotice.md) 条目 48）。

### `useSpineStage(canvas, rendererMode)`（`useSpineStage.ts`）

1. 作用：管理骨骼加载、每帧更新与绘制循环；计算舞台包围盒、缩放与视口变换；输出表情对齐坐标。
2. 暴露接口：`status`、`error`、`info`、`variants`、`activeVariant`、`actions`、`activeAction`、`backendKind`、`canvasKey`、`zoom`、`metrics`、`debugRendering`、`load`、`setVariant`、`setAction`、`setZoom`、`resetView`、指针及滚轮事件等。
3. 关键运算与约束：
   - 骨骼采用 y 轴向上坐标系，通过 `skeleton.scaleY = -scale` 映射到画布，切勿在外层做二次 Y 翻转（见 [NeedNotice](../NeedNotice.md) 条目 47）。
   - 暴露 `metrics`（`charHeight`、`unit = charHeight / 1012`、`anchorX`、`anchorY`），头顶锚点为包围盒顶端。
   - 差分机制：BA 纯数字动画（`00`–`99`）通过 `AttachmentTimeline` 瞬时覆盖 slot，每帧按「复位 → 动作应用 → 差分覆盖 → 更新世界变换 → 渲染」固定顺序执行。
   - 快速切角色维护 `loadToken`，每个异步点后比对 token 丢弃过期回调（见 [NeedNotice](../NeedNotice.md) 条目 49）。
   - 静态模式（无动画）依赖 `needsRedraw` 脏标记按需绘制，避免空转耗电（见 [NeedNotice](../NeedNotice.md) 条目 50）。
   - 同一画布不能跨 WebGL 与 2D 上下文热切，通过 `canvasKey` 驱动模板重新挂载全新 `<canvas>`。

### `OASpineViewer.vue` / `OASpineUploader.vue`

1. 作用：`OASpineViewer` 承载舞台画布、缩放滑条、动作与差分下拉、调试开关；`OASpineUploader` 提供文件选择与拖拽区域。
2. 注意事项：`webkitdirectory` 非标准属性，需在 `onMounted` 动态 `setAttribute`；画布事件捕获指针（`setPointerCapture`）保障拖拽平滑。

## 注意事项

- Spine 运行时不能作为 npm 依赖打包，core 与后端类必须同源，禁止混用（见 [NeedNotice](../NeedNotice.md) 条目 45、51、52）。
- Spine 4.2 的 `TextureAtlas` 只收文本，必须逐页显式调用 `page.setTexture()`，漏调会导致渲染器空指针崩溃（见 [NeedNotice](../NeedNotice.md) 条目 46）。
- `disposeStage()` 必须全面清理定时器、`ResizeObserver`、WebGL 着色器与贴图，避免上下文泄漏。

## 相关文档

- [SkeletonRuntimeProvider](./SkeletonRuntimeProvider.md)
- [EmotionRender](./EmotionRender.md)
- [NeedNotice](../NeedNotice.md)

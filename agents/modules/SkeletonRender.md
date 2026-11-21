# SkeletonRender — Pixi 骨骼舞台（Spine + DragonBones）

> 源码：`src/modules/SkeletonRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `skeletonTypes.ts` | 统一类型：`SkeletonKind`、`SkeletonSource`、`SkeletonRenderer` |
| `skeletonPackage.ts` | 文件分组与类型识别（Spine / DragonBones）、拖拽展开、服务端立绘装配 |
| `stageBackend.ts` | Pixi `Application` 生命周期、视口、WebGL / Canvas 模式 |
| `spineRenderer.ts` | Spine 运行时加载、图集绑定、差分 / 动作 / 调试 / 包围盒 |
| `dragonBonesRenderer.ts` | DragonBones 运行时懒加载、`_ske.json` + `_tex.json`、动作 / 调试 / 包围盒 |
| `useSkeletonStage.ts` | 统一舞台：fit / pan / zoom、脏渲染、按类型分发渲染器、表情覆盖层 |
| `OASpineViewer.vue` | 预览舞台与控制面板（骨骼类型、差分、动作、缩放、调试、表情） |
| `OASpineUploader.vue` | 骨骼文件 / 文件夹拖拽与选择 |

## 职责边界

- 画什么：解析 Spine 或 DragonBones 骨骼、装配贴图、用 Pixi 渲染角色，支持差分 / 动作 / 平移缩放。
- 不做什么：不把 Spine 官方运行时打进 npm 依赖（仍从 `/plugins/spine/spine-pixi.js` 动态加载）；不读写持久化配置；不管理路由。

## 关键实现

### `SkeletonRenderer`（`skeletonTypes.ts`）

所有渲染器实现同一契约：

```ts
load(source, app): Promise<void>
update(deltaSeconds): void
setAction(name): void
setVariant(name): void
setDebug(enabled): void
getInfo(): SkeletonInfo
getActions(): string[]
getVariants(): SkeletonVariant[]
getBounds(): PIXI.Rectangle
getMountRoot(): PIXI.Container
getHeadAnchor(): { x: number; y: number }
destroy(): void
```

`getMountRoot()` 必须返回 **raw Pixi 容器**，不能是 Vue `readonly` 深代理，否则 `addChild` 会静默失败。

### `createStageBackend(canvas, mode)`（`stageBackend.ts`）

1. 按 `spine_renderer` 配置创建 Pixi Application：
   - `aggressive`：仅 WebGL，失败直接报错；
   - `stable`：优先 WebGL，失败回退 Canvas；
   - `conservative`：强制 Canvas。
2. `autoStart: false`、`sharedTicker: false`，由 `useSkeletonStage` 统一驱动，避免双 ticker。
3. 统一处理 DPR（最多 2）、resize 与销毁。

### `useSkeletonStage(canvas, rendererMode)`（`useSkeletonStage.ts`）

1. 根据 `source.kind` 实例化 `SpineRenderer` 或 `DragonBonesRenderer`，用 `loadToken` 防止旧加载覆盖新角色。
2. 计算 fit / zoom / pan，把变换直接写到 `getMountRoot()`。
3. 单 RAF 循环：
   - 有动作时调用 `renderer.update(dt)`；
   - 只有 `needsRedraw` 时才 `backend.render()`，静态模式不空转。
4. 覆盖层：`overlayRoot` 始终位于角色之上，供表情挂载。
5. 对外暴露：
   - `getMountRoot()`、`getHeadAnchor()`、`getDesignUnit()`；
   - `getOverlayRoot()`、`getHeadGlobalAnchor()`、`getDesignScale()`；
   - `invalidate()`。

### `SpineRenderer`（`spineRenderer.ts`）

- 从 `SkeletonRuntimeProvider` 动态加载 `spine-pixi-v7`。
- `createImageBitmap(..., { premultiplyAlpha: 'premultiply' })` + `PIXI.ALPHA_MODES.PMA`，避免 BA 图集透明区发黑。
- BA 纯数字动画（`00`–`99`）通过 `AttachmentTimeline` 覆盖 slot，作为差分。
- `setAnimation(0, name, true)` 播放动作；舞台负责 `update(dt)`。
- 头顶锚点优先找 `Head` / `head` 骨骼，其次 `halo` / `Halo`，最后用包围盒顶部中心（表情已不再使用，留作其他用途）。
- 表情定位走 `framePoint(nx, ny)`（相对角色包围盒的 0–1 比例），
  贴图尺寸按 540 设计框换算（`0.45 * 540 / texture.width`），不要写死像素缩放。

### `DragonBonesRenderer`（`dragonBonesRenderer.ts`）

- 懒加载 `pixi-dragonbones-runtime@7.0.0`（MIT，peer `pixi.js@7`）。
- 使用 `new PixiFactory(null, false)`，由舞台调用 `PixiFactory.advanceTime(dt)`，不使用共享 ticker。
- 解析 `*_ske.json` + `*_tex.json` + 贴图；`.dbbin` 暂不支持，会给出明确错误。
- 动作来自 `display.animation.animationNames`；默认播放名称含 `idle` 的动作。
- 差分暂不暴露（返回空数组），后续可基于插槽显示帧实现。
- 头顶锚点优先找 `Head` / `head` 骨骼，其次 `halo` / `Halo`，否则用包围盒顶部中心。

## 已知坑

- Pixi 对象不能被 Vue `readonly` / `deepReadonly` 包住；用 `shallowRef` / `markRaw` / 普通变量。
- 覆盖层必须在每次加载后重新 `addChild` 到 `app.stage` 末尾，否则新角色会盖住表情。
- DragonBones Pixi 7 必须用 `pixi-dragonbones-runtime@7.x`，不要装 8.x。

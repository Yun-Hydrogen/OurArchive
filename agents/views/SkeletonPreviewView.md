# SkeletonPreviewView — 立绘骨骼预览：Spine 角色两段式载入、差分动作与多后端渲染

> 路由：`/tools/skeleton`
> 源码：`src/views/SkeletonPreviewView.vue`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/SkeletonPreviewView.vue` | 预览页外壳：文件选择/自动装配状态机、页头参数解析与定向返回跳转 |
| `src/modules/SkeletonRender/OASpineUploader.vue` | 手动选择立绘文件或文件夹拖拽上传组件 |
| `src/modules/SkeletonRender/OASpineViewer.vue` | 渲染舞台宿主、差分/动作/缩放控制侧栏面板 |
| `src/modules/SkeletonRender/spinePackage.ts` | 立绘文件识别过滤、多文件递归提取与资源包立绘自动装配 |
| `src/modules/SkeletonRender/useSpineStage.ts` | 骨骼渲染舞台核心生命周期（WebGL/Canvas 后端切换、帧循环与视口交互） |
| `src/modules/ViewsManager/OAPageHeader.vue` | 统一页头组件：标题、副标题、返回按钮（`backPosition="start"`） |
| `src/modules/ViewsManager/routes.ts` | 关联路由常量：`tools`、`packageDetail`、`packageCharacter` |
| `src/modules/Shell/shellTiming.ts` | `SHELL_TIMING`：页面退场动画等待延时常量 |

## 页面结构

- 页头：挂载 `modules/ViewsManager/OAPageHeader.vue`，标题为 `立绘骨骼预览`，副标题为 `载入立绘包（骨骼 + 图集 + 贴图），预览立绘并切换差分`；`back-position="start"`（左侧紧凑返回）；返回标签根据进入来源动态切换：来自角色详情显示 `角色详情`，来自资源包显示 `资源包`，直接进入显示 `工具`。
- 主体分区（`.oa-skel-preview__body`）：
  - 采用 `<Transition name="oa-swap" mode="out-in">` 驱动的三态切换：
    1. 自动载入中（`isAutoLoading`）：展示居中进度条。
    2. 已加载立绘（`character !== null`）：挂载 `<OASpineViewer :character="character">`。
    3. 未加载立绘（`character === null`）：挂载 `<OASpineUploader>`，若有自动装配错误则顶部附带 `rizui_infobox`。

## 关键实现

### `autoLoad()`

1. 作用：检测路由 query 中的 `packageId` 与 `skeletonId`，若存在则跳过手动上传，直接从资源包后端拉取装配立绘。
2. 输入输出：读取 `route.query`；异常时置 `autoLoadError`。
3. 注意事项：记录 `sourcePackageId` 与 `sourceCharacterId`（`nameId`），通过 `loadSpineCharacterFromPackage()` 下载文件 Blob 包裹为 `File`，与手动拖入立绘走完全一致的解析渲染流水线。

### `backToSource()`

1. 作用：智能返回进入立绘预览前的页面。
2. 输入输出：无参；无返回值。
3. 判定顺序：
   - 若 `!sourcePackageId`：返回工具页 `ROUTE_NAMES.tools`。
   - 若存在 `sourceCharacterId`：返回角色详情 `ROUTE_NAMES.packageCharacter`（携带 `packageId` 与 `nameId`）。
   - 否则：返回资源包详情 `ROUTE_NAMES.packageDetail`（携带 `packageId`）。

### `handleSpineReselect()`

1. 作用：点击控制面板中的「重新选择」按钮回到上传选择界面。
2. 输入输出：无参；无返回值。
3. 注意事项：清空当前 `character`、`sourcePackageId`、`sourceCharacterId`，并执行 `router.replace({ name: ROUTE_NAMES.skeletonPreview })` 清空地址栏 query 参数，重置状态机。

## 交互与状态

- **两段式状态机**：页面由 `character` 变量作为主状态分流：无角色时渲染上传选择器，有角色时挂载渲染舞台与控制栏；更换角色通过 `:key="character.id-..."` 触发 `OASpineViewer` 完全重建。
- **定向离场过渡**：返回上一页时激活 `isLeaving = true`，页头与主体同时运行 `oa-panel-out var(--cards-exit, 260ms)` 向下平移 22px 缩小淡出，等待 320ms 后执行路由跳转，避免与上级页面生硬硬切。

## 注意事项

- 必须通过 `loadSpineCharacterFromPackage` 将网络下发资源转换为同构的 `File` 对象，保证资源包快速预览与本地目录拖入复用完全相同的核心渲染管线。
- 骨骼立绘完整性必须同时满足「骨骼（`.skel` 或 `.json`）+ 图集（`.atlas`）+ 至少一张贴图」三件套，缺少任一项均会导致管线崩溃，见 [NeedNotice](../NeedNotice.md) 条目 17。
- 渲染必须由 `createSpineBackend` 返回的统一 `runtime` 驱动，绝对禁止混用 WebGL 与 Canvas 两个 bundle 的 Spine-core 类，见 [NeedNotice](../NeedNotice.md) 条目 46。
- 动态导入运行时文件 `/plugins/spine/*.mjs` 必须包含 `/* @vite-ignore */`，防止 Vite 构建期解析报错，见 [NeedNotice](../NeedNotice.md) 条目 45。
- 画布缩放只允许通过骨骼自身的 `skeleton.scaleY = -scale` 实现 Y 轴对齐，严禁在外层 context 额外执行 `scale(1, -1)`，见 [NeedNotice](../NeedNotice.md) 条目 48。
- 静态差分预览模式下必须利用 `needsRedraw` 脏标记跳过空转绘制，避免无动作播放时过度消耗 GPU/CPU，见 [NeedNotice](../NeedNotice.md) 条目 51。

## 相关文档

- [ToolsView](./ToolsView.md)
- [PackageView](./PackageView.md)
- [PackageCharacterView](./PackageCharacterView.md)
- [SkeletonRender](../modules/SkeletonRender.md)
- [SkeletonRuntimeProvider](../modules/SkeletonRuntimeProvider.md)
- [NeedNotice](../NeedNotice.md)

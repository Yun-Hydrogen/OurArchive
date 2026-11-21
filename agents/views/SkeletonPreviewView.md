# SkeletonPreviewView — 立绘骨骼预览：Spine / DragonBones 两段式载入

> 路由：`/tools/skeleton`
> 源码：`src/views/SkeletonPreviewView.vue`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/SkeletonPreviewView.vue` | 预览页外壳：文件选择 / 自动装配状态机、页头参数解析与定向返回 |
| `src/modules/SkeletonRender/OASpineUploader.vue` | 手动选择或拖拽 Spine / DragonBones 文件 |
| `src/modules/SkeletonRender/OASpineViewer.vue` | 渲染舞台宿主、差分 / 动作 / 缩放 |
| `src/modules/SkeletonRender/skeletonPackage.ts` | 文件识别、类型判断、资源包自动装配 |
| `src/modules/SkeletonRender/useSkeletonStage.ts` | Pixi 舞台：fit / pan / zoom、脏渲染、渲染器分发、表情覆盖层 |
| `src/modules/ViewsManager/OAPageHeader.vue` | 统一页头组件 |
| `src/modules/Shell/shellTiming.ts` | `SHELL_TIMING` 页面退场时序 |

## 页面结构

- 页头：标题 `立绘骨骼预览`，副标题 `载入 Spine / DragonBones 骨骼包，预览立绘、差分与动作`；返回标签按来源显示 `角色详情` / `资源包` / `工具`。
- 主体三态：
  1. `isAutoLoading`：进度条；
  2. `character !== null`：`<OASpineViewer>`；
  3. 否则：`<OASpineUploader>`，自动装配失败时显示 `rizui_infobox`。

## 关键实现

### `autoLoad()`

1. 读取 `route.query.packageId`、`skeletonId`、`nameId`。
2. `loadSkeletonFromPackage()`：下载立绘文件 Blob 并包成 `File`。
3. 结果写入 `character`，交给 `OASpineViewer`。
4. 失败时清空 `sourcePackageId` 并显示错误，用户仍可手动选文件。

### `backToSource()`

- 无 `sourcePackageId` → 工具页；
- 有 `sourceCharacterId` → 角色详情；
- 否则 → 资源包详情。

### `handleSpineReselect()`

清空角色与来源状态，`router.replace({ name: 'skeletonPreview' })` 去掉 query。

## 交互与状态

- `character` 是主状态：无角色显示上传器，有角色显示舞台。
- 更换角色通过 `:key="character.id-skeleton.name"` 重建 `OASpineViewer`。
- 本页**不承载表情预览**；表情在资源包详情 → 表情分类的独立舞台上播放（见 [EmotionRender](../modules/EmotionRender.md)）。

## 注意事项

- 网络资源必须转成 `File`，与本地拖入复用同一条解析管线。
- 完整性按类型判断：Spine 要骨骼 + `.atlas` + 贴图；DragonBones 要 `_ske.json` + `_tex.json` + 贴图。
- 舞台对 `rendererMode` 的处理在 `stageBackend.ts`：激进仅 WebGL、稳定可回退 Canvas、保守强制 Canvas。
- 静态模式依赖 `needsRedraw` 脏标记，不播放动作时不空转渲染。

## 相关文档

- [ToolsView](./ToolsView.md)
- [PackageView](./PackageView.md)
- [PackageCharacterView](./PackageCharacterView.md)
- [SkeletonRender](../modules/SkeletonRender.md)
- [EmotionRender](../modules/EmotionRender.md)

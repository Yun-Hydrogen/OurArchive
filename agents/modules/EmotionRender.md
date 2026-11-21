# EmotionRender — 表情脚本宿主与舞台预览

> 源码：`src/modules/EmotionRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `emotionScript.ts` | 动态 `import()` 资源包脚本、导出解析、Context 类型 |
| `useEmotionPlayer.ts` | 预载贴图、挂载覆盖层、播放 / 停止、清理 |
| `OAEmotionStage.vue` | 独立表情舞台：按 `packageId` / `skeletonId` 装配骨骼，暴露 `playEmotion()` / `stopEmotion()` |

表情预览**不再**嵌在骨骼预览页里。资源包详情 → 表情分类采用「舞台 + 右侧列表」两栏布局：
左边是 `OAEmotionStage`，右边是表情列表（独立滚动），通过 `ResourcePicker` 选择角色 / 骨骼作为底图，
选中的骨骼 id 变化时舞台重新加载并清空正在播放的表情。

## 关键实现

### 挂载坐标

- 舞台提供 `getOverlayRoot()`：始终位于角色之上的 Pixi 容器。
- `getHeadGlobalAnchor()`：头顶锚点的舞台全局坐标。
- `getDesignScale()`：1 设计像素对应的舞台全局像素。
- `getCharacterFrame()` / `getHeadAnchor()`：角色本地包围盒与头顶锚点，用于 `framePoint`。
- `framePoint(nx, ny)` 把角色包围盒的 0–1 比例坐标换算成容器内设计坐标，
  与 BA-Story 的 `startPositionOffset` 语义一致（BA 使用固定 540×1012 设计框，
  而不是直接拿 `Head` 骨骼世界坐标）。
- `useEmotionPlayer` 创建 `anchorHost`，位置设为头顶全局坐标，缩放设为设计比例；
  脚本内部坐标使用 **540 × 1012 设计像素**。

### 播放流程

1. 预载 `images` 为 `PIXI.Texture`，按文件名与 URL 建立索引。
2. 创建 `anchorHost` / `container`，挂到覆盖层。
3. 构造 `EmotionScriptContext`（`container`、`textures`、`audio`、`PIXI`、`gsap`、`ticker`、`signal`、`framePoint`）。
4. `import(/* @vite-ignore */ scriptUrl)`，按 `export` / `default` 取工厂函数并执行。
5. 没有 `script` 的表情直接拒绝播放（`error = '该表情没有脚本，无法播放'`）——宿主不再有内置兜底动画。
6. 停止时：abort、取消 RAF、执行清理函数、移除并销毁容器、恢复 BGM。

### 脚本信任

当前版本**未实现**脚本信任/沙箱，资源包脚本会直接执行；相关机制后续再补。

## 已知坑

- 不能把 Pixi 对象交给 Vue `readonly` 深代理；`stage` 用 `markRaw` 传递。
- 覆盖层必须在角色加载后重新提到 `app.stage` 末尾，否则表情会被角色盖住。
- 脚本返回的时间轴必须在 `onCleanup` 里 `kill()`，否则切换表情会残留。
- 表情列表与舞台是两个独立滚动区：舞台固定、列表单独滚动，避免滑到列表底部时错过表情播放。

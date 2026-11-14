# EmotionRender — 角色表情关键帧播放与预览舞台

> 源码：`src/modules/EmotionRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `OAEmotionPlayer.vue` | 通用表情关键帧解释器与 Web Animations 播放层（挂载于头顶锚点） |
| `OAEmotionPreview.vue` | 表情预览容器组件：整合 Spine 立绘舞台、表情选择面板与缩放视口控制 |

## 职责边界

- 画什么 / 播什么：以 Web Animations API 执行 `PackageEmotion` 定义的多层关键帧动画，驱动音效播放并联动主界面 BGM 淡入淡出；整合底层立绘与头顶锚点动态追踪。
- 不做什么：不解析磁盘或网络 YAML 资源（由 `EmotionProvider` / `packagesApi` 处理）、不负责角色立绘源文件的拉取与下载。

## 关键实现

### `OAEmotionPlayer.vue`

1. 作用：解释资源包配置的多层 PNG 动画与关键帧补间，按层级结构渲染，播完自动销毁。
2. 输入输出：
   - Props：
     - `unit: number`：设计基准宽度对应的屏幕像素换算比例（`unit = 角色屏幕高度 / 1012`）。
     - `anchorX: number`、`anchorY: number`：头顶锚点在容器内的像素坐标。
   - `defineExpose` 暴露：`play(emotion: PackageEmotion): void`、`stop(): void`、`playingName: Ref<string>`。
3. 核心机制与注意事项：
   - 设计基准常数：`DESIGN_WIDTH = 540`、`DESIGN_HEIGHT = 1012`。
   - 坐标换算体系：根层宽度为 `scale × 540 × unit`；子层宽度为 `scale × 父层宽度`；`position` 根层按 `540 × unit` 换算，子层按父层宽度换算（x/y 均乘以宽度）。关键帧中的 `x/y` 基于 540 设计单位。
   - **图层容器必须是 `div`**：`<img>` 属于替换元素（replaced element），子节点不参与渲染且尺寸为 0，多层表情（如气球+爱心、气球+灯泡+光圈）的子层必须 append 到父层 `div` 中（见 [NeedNotice](../NeedNotice.md) 条目 27）。
   - **关键帧 `offset` 严格递增**：Web Animations 要求 `offset` 严格单调递增，重复 offset 会抛错；组件内部已做递增去重，并在尾部不足 1 时补全末帧。
   - 音效与 BGM 互斥：播放带音效表情时调用 `useBackgroundMusic().suspend()` 压低主界面 BGM，使用 `config.preview_volume` 控制音量，动画结束或停止时恢复 BGM。
   - 补间状态继承：未显式指定的属性沿用上一帧（`opacity`、`zoom`、`x`、`y`、`rotate`），形成连续平滑过渡。

### `OAEmotionPreview.vue`

1. 作用：表情预览集成组件。左侧运行 `useSpineStage` 渲染底座立绘，右侧网格列出表情列表；动态将舞台度量暴露给 `OAEmotionPlayer`。
2. 输入输出：
   - Props：
     - `character: SpineCharacter | null`：当前选中的预览立绘。
     - `emotions: PackageEmotion[]`：表情列表。
     - `loading: boolean`：表情加载态。
     - `error: string`：加载异常信息。
     - `characterLabel: string`：当前立绘标题文案。
   - Emits：`pick`（未选立绘或点击更换角色时触发，请求上层打开选择弹窗）。
   - `defineExpose` 暴露：`stop(): void`（代理内部播放层的停止方法）。
3. 布局与样式注意事项：
   - **舞台高度必须固定确定值**：`.oa-emo__stage` 必须赋予确定高度（`height: clamp(300px, 52vh, 620px)`），禁止依赖 `flex: 1` 撑开，否则内部 canvas 的 `height: 100%` 在包含块高度不确定时会退化为下限高度，导致角色被裁切、头顶锚点算错（见 [NeedNotice](../NeedNotice.md) 条目 28）。
   - **响应式媒体查询 `@media (max-width: 900px)`**：当容器由水平 flex 切换为 `flex-direction: column` 时，`.oa-emo__stage-box` 必须从 `flex: 3 1 0` 重置为 `flex: 0 0 auto`，否则由于纵向主轴空间不足，`flex-basis: 0` 会把舞台压扁成 0 高度（见 [NeedNotice](../NeedNotice.md) 条目 54）。
   - 空底座保护：当未选择立绘点击表情时，主动 emit `pick` 唤起选择框，防止界面点击无响应。
   - 视图状态与重置：切换或重选角色时，重置当前高亮的表情 ID，并自动停止上一次正在播放的动画。

## 注意事项

- 表情配置语法、坐标系换算、图层层级规范参考 [emotions.md](../../docs/configs_doc/emotions.md)。
- 第三方参考播放器逆向与技术分析详见 [emotionstodo.md](../emotionstodo.md)。
- 组件卸载时 `onBeforeUnmount` 自动执行 `clear()`，清理 Web Animations 句柄、DOM 节点、音效并还原 BGM，防止内存泄漏或幽灵声音。
- 表情完整性校验：若某表情引用的部分图层文件缺失（`layer.exists === false`），界面 Chip 会以虚线标注并在点击时容错展示，同时面板底部汇总缺失数量提示。

## 相关文档

- [SkeletonRender](./SkeletonRender.md)
- [ResourcePicker](./ResourcePicker.md)
- [表情配置写法](../../docs/configs_doc/emotions.md)
- [第三方表情逆向记录](../emotionstodo.md)
- [NeedNotice](../NeedNotice.md)

# 立绘骨骼预览

覆盖：[views/SkeletonPreviewView.vue](../../packages/client/src/views/SkeletonPreviewView.vue)、[components/tools/OASpineUploader.vue](../../packages/client/src/components/tools/OASpineUploader.vue)、[components/tools/OASpineViewer.vue](../../packages/client/src/components/tools/OASpineViewer.vue)、[composables/useSpinePackage.ts](../../packages/client/src/composables/useSpinePackage.ts)、[composables/useSpineStage.ts](../../packages/client/src/composables/useSpineStage.ts)

`/tools/skeleton`：从「工具页」进入，读取使用者本地提供的 Spine 立绘包（骨骼 + 图集 + 贴图），在 canvas 上渲染并切换立绘差分。工具页本身见 [tools.md](./tools.md)。

页面是两段式状态机（`SkeletonPreviewView` 的 `character`）：为空时显示上传区，选中后换成预览器；`更换文件` 把它清回 `null`。

从工具页进来时整页做一次 420/520ms 的淡入上浮（`oa-panel-in`），避免工具卡收起后直接出现一页静态内容。

## 立绘包识别（useSpinePackage）

一个「立绘包」= 一个目录，必须同时具备：

| 文件 | 判定 |
| --- | --- |
| 骨骼 | `*.skel`（优先）或 `*.json` |
| 图集 | `*.atlas`，目录内必须恰好 1 个 |
| 贴图 | `*.png` / `*.webp` / `*.jpg` / `*.jpeg`，至少 1 个 |

- `toSpineFiles()` 读取 `<input type="file">` 结果并补 `webkitRelativePath`；隐藏 input 的 `webkitdirectory` 由 `onMounted` 里 `setAttribute` 补上（模板里直接写会让 Volar 报未知属性）。
- `toSpineFilesFromDrop()` 用 `DataTransferItem.webkitGetAsEntry()` 递归展开文件夹。**`readEntries` 一次最多返回 100 条，必须循环读到空数组**，否则大目录会静默丢文件。
- `toSpineCharacters()` 按目录分组后过滤，按 id 排序 —— 所以**整个 `skeletons/` 根目录可以直接拖进来**，会拆成几百个角色供选。
- 手动多选（没有相对路径）时所有文件归入同一组，一旦混入多个角色的 `.atlas` 就会识别失败并给出提示。
- `matchTexture()` 按图集页名匹配贴图，退化顺序：同名 → 唯一贴图 → 去掉扩展名后的前缀匹配。

## 载入与渲染（useSpineStage）

运行时是 `@esotericsoftware/spine-canvas@4.2`（**只支持 4.2 二进制**），随本路由的异步 chunk 一起加载，首屏不含这部分体积。许可声明见 [docs/third-party-notices.md](../../docs/third-party-notices.md)。

载入顺序：`new TextureAtlas(text)` → 逐页 `page.setTexture(new CanvasTexture(await createImageBitmap(file)))` → `AtlasAttachmentLoader` → `SkeletonBinary` / `SkeletonJson` → `Skeleton` + `AnimationState`。

两个必须知道的细节：

- `TextureAtlas` 在 4.2 **只接受 atlas 文本**，贴图要自己 `setTexture()`。漏了这步 region 的 `texture` 是 `null`，`SkeletonRenderer.drawImages` 会崩在 `region.texture.getImage()`。
- 骨骼是 y 轴向上的坐标系，靠 `skeleton.scaleY = -scale` 翻到画布；**不要**在外层再 `ctx.scale(1, -1)`，region 内部已经自带一次 `scale(1, -1)`，会被抵消成上下颠倒。

每帧顺序固定：

```ts
skeleton.setToSetupPose();          // 复位，避免上一条差分的 attachment 残留
if (state && activeAction) {        // 可选的动作（Idle_01 等）
  state.update(delta);
  state.apply(skeleton);
}
applyVariantLayers();               // 差分永远最后覆盖，保证生效
skeleton.updateWorldTransform(Physics.update);
renderer.draw(skeleton);
```

包围盒用 `getBoundsRect()` 在载入时量一次（量之前把 `x / y / scaleX / scaleY` 清干净，否则上一次渲染的变换会混进包围盒）。每帧只算相机：

```
scale      = min(w * 0.94 / bounds.width, h * 0.94 / bounds.height) * zoom
skeleton.x = w / 2 + panX - (bounds.x + bounds.width / 2) * scale
skeleton.y = h / 2 + panY + (bounds.y + bounds.height / 2) * scale
```

画布按 `devicePixelRatio`（上限 2）放大缓冲区，`ctx.setTransform(dpr, …)` 每帧设一次，之后都用 CSS 像素坐标。

## 立绘差分

BA 立绘的「拆分部」不是 skin，而是**纯数字动画**：

```
动画 00 → slot「00_default」的 attachment 换成 "00_default"
动画 03 → slot「00_default」的 attachment 换成 "03_smile"
动画 99 → 换脸 + 把 eyeclose slot 置空（闭眼）
```

所以差分**不跑时间轴**，直接把 `AttachmentTimeline` 记录的 `{slotIndex, attachmentName}` 覆盖到 slot 上，切换是瞬时的。

- `extractVariants()`：只收 `/^\d+$/` 的动画，汇总其中所有 `AttachmentTimeline` 的**首帧**附件名；按图层签名去重（`99` 常与 `00` 同层，会被合并）。
- 标签：取附件名去掉编号后的词（`03_smile` → `微笑`，走 `EXPRESSION_LABELS`）。角色自身名字（`data.name` 拆出的 `ako` / `spr` 之类）会进「噪声词表」，命中就跳过 —— 否则 `07`~`16` 会全部显示成「07 · Ako」，且真正有用的 `eyeclose` 永远轮不到。
- `extractActions()`：非数字动画作为动作项（`Idle_01`、`Eye_Close_01` 等），默认优先选带 `idle` 的；`静态` 表示不播放动作，只按当前差分布帧。

## 面板与交互

角色 id + `Spine 版本 / 骨骼数 / 槽位数 / 动画数`、差分 chips（可滚动）、动作 chips、缩放、骨骼调试开关、重置视角 / 更换文件 / 返回工具。

控件除 chips 外全部走 RizUI（`theme="Light"`）：`rizui_cfgrow` 做行、`rizui_slider` 做缩放（20%–300%）、`rizui_switch` 直连 `SkeletonRenderer.debugRendering`、`rizui_progress` 做载入不定进度、`rizui_infobox` 做空态与错误、`rizui_button` 做全部按钮。

- **动作用 chips 而不是 `rizui_dropdown`**：后者的弹层是普通绝对定位（非 teleport），在 `overflow-y: auto` 的侧栏里会被裁掉；动作项只有 2~3 个，横排胶囊更直观，也和差分 chips 统一。
- 画布拖拽平移、滚轮缩放，`touch-action: none` 避免移动端滚动冲突。
- `load()` 用自增 `loadToken` 丢弃过期结果，避免快速换角色时旧载入覆盖新状态；`onBeforeUnmount` 自增 token 并 `disposeStage()` 停掉 `requestAnimationFrame` 与 `ResizeObserver`。
- 失败态显示具体原因（如「图集页 xxx 缺少对应贴图」）并提供「重新选择文件」。

## 已知边界

- 只支持 Spine 4.2 二进制 / JSON；3.8 及更早、4.3 骨骼会解析失败并落到错误态。
- 贴图页名必须能对上（BA 原始包天然满足）；重命名过的文件走前缀 / 唯一贴图兜底。
- 图集贴图常为 2048²，`createImageBitmap` 结果留在内存里，换角色时旧图不显式释放（`CanvasTexture.dispose()` 是空实现）。

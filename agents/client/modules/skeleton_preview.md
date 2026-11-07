关联前端文件：
`packages/client/src/views/SkeletonPreviewView.vue` — 骨骼预览页（两段式状态机 + 两种入口）
`packages/client/src/components/tools/OASpineUploader.vue` — 文件选择 / 拖拽上传
`packages/client/src/components/tools/OASpineViewer.vue` — 预览舞台 + 面板（差分 / 动作 / 缩放 / 调试）
`packages/client/src/spinePackage.ts` — 骨骼 / 图集 / 贴图识别（非 composable）
`packages/client/src/composables/useSpineStage.ts` — 渲染舞台（坐标系与生命周期）
`packages/client/src/spine/backend.ts` — 渲染后端工厂与模式
`packages/client/src/spine/webglBackend.ts` — WebGL 后端（`PolygonBatcher` 合批）
`packages/client/src/spine/canvasBackend.ts` — canvas 2D 后端（兜底）
`packages/client/src/spine/mode.ts` — 渲染器模式（三种）

用法：

### `toSpineCharacters(entries)`

1. 作用：把平铺的文件列表按目录拆成立绘包；2. 一个「立绘包」= 同一目录下**同时有** 骨骼（`*.skel` 优先于 `*.json`）、图集（`.atlas`，恰好 1 个）、贴图（`.png/.webp/.jpg/.jpeg` 至少 1 个）；3. 结果按 id 排序。
2. 输入：`SpineFile[]`（`{ file, path }`，含相对路径）；输出：`SpineCharacter[]`（`id` 为目录名，另有 `skeleton` / `atlas` / `textures`）。
3. 注意事项：整个 `skeletons/` 根目录可以直接拖入；手动多选（没有相对路径）时所有文件归入同一个目录，一旦混入多个角色的 `.atlas` 就会识别失败——报错文案会说明。

### `toSpineFilesFromDrop(transfer)` / `toSpineFiles(files)`

1. 作用：拖拽文件夹递归展开 / 读取 `<input type=file>` 并补 `webkitRelativePath`；2. `readEntries` 一次最多返回 100 条，**必须读到空数组为止**，否则大目录静默丢文件；3. 非 Chromium 回退平铺 `FileList`。
2. 输入：`DataTransfer` / `FileList | File[]`；输出：`SpineFile[]`。
3. 注意事项：`elements/attributes` 里的 `webkitdirectory` 不是标准 DOM 属性，模板里直接写会让类型检查报未知属性——`OASpineUploader.vue` 在 `onMounted` 里用 `setAttribute` 补上。

### `matchTexture(textures, pageName)`

1. 作用：图集页名 → 贴图文件；2. 退化顺序：同名 → 唯一的贴图 → 去掉扩展名后的前缀匹配。
2. 输入输出：`File[], string → File | null`。
3. 注意事项：图集页名对不上的会走这条退化，但结果不可保证；重命名过的文件要先对上。

### `loadSpineCharacterFromPackage(packageId, skeletonId)`

1. 作用：从资源包直接装配立绘包；2. 后端只给文件清单与 URL，这里把每个文件下载成 `Blob` 包成 `File`，再走 `toSpineCharacters`——**与手动上传共用同一条渲染管线**；3. 动态 `import('@/api/packages')`，避免纯本地场景拖进网络依赖。
2. 输入：两个 id 字符串；输出：`Promise<SpineCharacter>`（失败抛错，文案直给用户看）。
3. 注意事项：跳过时 query 键为 `packageId` / `skeletonId` / `nameId`。

### `useSpineStage(canvas, rendererMode)` / `load(character)`

1. 作用：把立绘包丢进渲染后端；2. 载入顺序：`TextureAtlas(text)` → 逐页校验贴图存在 → `await backend.bindTextures(atlas, pageName => File)`（**贴图由后端自己解码**）→ `AtlasAttachmentLoader` → `SkeletonBinary` / `SkeletonJson` → `Skeleton` + `AnimationState`；3. `loadToken` 丢弃过期载入，避免快速换角色时旧结果覆盖新状态。
2. 返回：`{ status, error, info, variants, activeVariant, actions, activeAction, backendKind, canvasKey, zoom, debugRendering, load, setVariant, setAction, setZoom, resetView, onPointerDown/Move/Up, onWheel }`（状态只读）。
3. 注意事项：`TextureAtlas` 在 4.2 只接受文本，贴图必须自己 `setTexture()`，漏了会崩在 `region.texture.getImage()`；骨骼是 y 轴向上坐标系，靠 `skeleton.scaleY = -scale` 翻到画布，**不要再外层 `ctx.scale(1, -1)`**（region 内部已自带一次）。

### `setVariant(name)`（立绘差分）

1. 作用：BA 立绘的「差分」是纯数字动画（`00`–`99`），每条只做一次 `AttachmentTimeline` 换图；2. 直接把记录的 `{ slotIndex, attachmentName }` 覆盖到 slot 上，**不跑时间轴**，切换是瞬时的；3. 按图层签名去重（`99` 常与 `00` 同层，会被合并）。
2. 输入：差分编号字符串；输出：无。
3. 注意事项：每帧顺序固定为 `setToSetupPose → 应用动作 → 覆盖差分 → updateWorldTransform → 绘制`，保证差分永远生效且不残留上一次的 attachment；标签取附件名去掉编号后的词（`03_smile` → 「微笑」），角色自身名进噪声词表避免全是「Ako」。

### `createSpineBackend(canvas, mode)`（`spine/backend.ts`）

1. 作用：按设置项 `spine_renderer` 选渲染路径——`aggressive` 仅 WebGL（不可用直接报错）、`stable` 优先 WebGL 失败回退、`conservative` 仅 canvas 2D。
2. 输入：`HTMLCanvasElement`、`SpineRendererMode`；输出：`SpineBackend`（`kind` / `bindTextures` / `setViewport` / `render` / `dispose`）。
3. 注意事项：WebGL 能力先用一次性 canvas 探测，绝不在正式画布上试错；同一张 canvas 拿过 WebGL 上下文后拿不到 `2d`，所以换模式走 `canvasKey` 换画布重载。

### `onWheel(event)`（滚轮缩放）

1. 作用：画布滚轮缩放，步进 `×0.92 / ×1.08`，`zoom` 钳制在 0.2–5。
2. 输入：`WheelEvent`（调用方 `preventDefault`）。
3. 注意事项：静态模式（`activeAction` 为空）靠 `needsRedraw` 脏标记按需重绘，缩放 / 平移 / 差分 / 调试开关变化时必须置位。

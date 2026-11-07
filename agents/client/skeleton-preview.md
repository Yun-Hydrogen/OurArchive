# 立绘骨骼预览

覆盖：[views/SkeletonPreviewView.vue](../../packages/client/src/views/SkeletonPreviewView.vue)、[components/tools/OASpineUploader.vue](../../packages/client/src/components/tools/OASpineUploader.vue)、[components/tools/OASpineViewer.vue](../../packages/client/src/components/tools/OASpineViewer.vue)、[composables/useSpinePackage.ts](../../packages/client/src/composables/useSpinePackage.ts)、[composables/useSpineStage.ts](../../packages/client/src/composables/useSpineStage.ts)、[composables/spine/](../../packages/client/src/composables/spine/)（渲染后端）

`/tools/skeleton`：从「工具页」或资源包里的角色 / 骨骼条目进入，读取使用者的 Spine 立绘包（骨骼 + 图集 + 贴图），渲染并切换立绘差分。工具页本身见 [tools.md](./tools.md)。

## 页面状态

两段式状态机（`SkeletonPreviewView` 的 `character`）：

- **空**：显示 `OASpineUploader`（拖入文件夹 / 手动选文件）。
- **已选**：换成 `OASpineViewer`；「更换文件」把它清回 `null` 并 `router.replace` 回不带 query 的地址。

入口决定「返回」目标：

| 来源 | query | 返回 |
| --- | --- | --- |
| 工具页 | 无 | `/tools` |
| 资源包骨骼列表 | `?package=&skeleton=` | `/resources/:packageId` |
| 角色详情里的骨骼 | `?package=&skeleton=&character=` | `/resources/:packageId/character/:nameId` |

带 `?package=&skeleton=` 时 `onMounted` 直接 `loadSpineCharacterFromPackage()`：后端只给文件清单与 URL，这里逐个下载成 `Blob` 再包成 `File`，**与手动上传共用同一条渲染管线**；下载失败会在上传区显示具体原因。

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

## 渲染后端（composables/spine/）

渲染被拆成两条可切换的路径，舞台（`useSpineStage`）只做坐标系与生命周期，两边共用同一套「包围盒居中 + 缩放 + 平移」算式，所以画面一致。

### 两条路径与文件职责

| 文件 | 作用 |
| --- | --- |
| [spine/mode.ts](../../packages/client/src/composables/spine/mode.ts) | `SpineRendererMode`、`SPINE_RENDERER_OPTIONS`、`normalizeSpineRendererMode()`。**故意不导入渲染器**，否则设置项会把两套 runtime 拖进首屏 chunk |
| [spine/backend.ts](../../packages/client/src/composables/spine/backend.ts) | `SpineBackend` 接口（`bindTextures` / `setViewport` / `render` / `dispose`）+ `createSpineBackend(canvas, mode)` + WebGL 能力探测 |
| [spine/webglBackend.ts](../../packages/client/src/composables/spine/webglBackend.ts) | `spine-webgl` 的 `PolygonBatcher`，按「贴图 + 混合模式」合批；预乘 alpha + mipmap |
| [spine/canvasBackend.ts](../../packages/client/src/composables/spine/canvasBackend.ts) | `spine-canvas` 的三角形渲染（直通 alpha）+ `SpineCanvasLockedError` |

### 模式与选择

模式来自设置项 `spine_renderer`（见 [storage.md](../server/storage.md)），改完下次载入生效：

| 模式 | 行为 |
| --- | --- |
| `aggressive` 激进 | 只用 WebGL；不可用直接报错，便于暴露环境问题 |
| `stable` 稳定（默认） | 优先 WebGL，初始化失败回退 Canvas 2D |
| `conservative` 保守 | 只用 Canvas 2D；兼容性最好但高密度立绘掉帧 |

### 为什么必须换 WebGL

`spine-canvas` 的 `triangleRendering` 对**每个三角形**做一次 `save + transform + clip + drawImage(整页贴图) + restore`，成本与三角形数线性相关。全库 631 个骨骼的实测分布：

| 立绘 | 骨骼数 | 绘制附件 | 三角形/帧 |
| --- | --- | --- | --- |
| `arona_spr` 阿罗娜 | 202 | 80 | **5863** |
| `np0035_spr` 普拉娜 | 315 | 89 | **5463** |
| `np0186_spr`（第三名） | 14 | 17 | 377 |
| 全库平均 | 3~7 | 5~10 | **126** |

也就是说只有这两个「真动态」立绘是平均值 / 其他角色的 40~80 倍，Canvas 2D 下每帧要发 5000+ 次 clip+drawImage，必然掉到个位数帧率。WebGL 路径把它们合成 1~2 个 draw call，贴图只上传一次，并且可以安全地用 mipmap 做缩小采样（前提是预乘，见下）。

### 通道约定（预乘 alpha，改一个就要全改）

WebGL 路径走的是**预乘 alpha（PMA）**管道，这是唯一能让「缩小采样」不产生色边的组合。三条必须同时成立：

1. 解码：`createImageBitmap(file, { premultiplyAlpha: 'premultiply' })`，让半透明像素的 RGB **先乘上 alpha**。直通 alpha 图里一个 `A=0.3` 的边缘像素 RGB 仍是满强度颜色；预乘后变成 `0.3×颜色`，和 alpha 匹配，mipmap 平均出来的结果才不会「颜色比 alpha 亮」；
2. 上传：`GLTexture.DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL = true`，让 GL 只上传、**不二次预乘**（这个静态属性名是反着的：置 true 才会 `pixelStorei(UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)`）；
3. 渲染：`SkeletonRenderer.premultipliedAlpha = true`，混合变成 `ONE / ONE_MINUS_SRC_ALPHA`，加法（光环）是 `ONE / ONE`，顶点色也按预乘。

为什么非预乘不行：实测 `arona_spr.png`（2048²）里**透明像素的 RGB 基本是纯黑**（采样 421 257 个全透明像素，23.7% 精确为 `(0,0,0)`，其余全是近黑）。若把 mipmap 建在直通 alpha 的图上，每级 mip 都会把「透明黑」平均进半透明边缘，腮红 / 发丝这类细线就「变粗、发黑」；图集区域只有 1px 留边，还会跨区域串色。改成预乘后这两个问题一起消失。

其他容易踩的点：

- **`premultipliedAlpha: true` 是 canvas 上下文属性**，指「画布自身的合成方式」，与上面的顶点色开关不是同一个东西，但两者都必须是 true 才自洽。
- **canvas 2d 后端不能吃预乘贴图**，所以 `bindTextures` 的契约是「页名 → 文件」，由各后端自己解码。
- `PolygonBatcher` / `SkeletonRenderer` 的 `twoColorTint` 必须同为 `false`，配套 `Shader.newColoredTextured()`；`twoColorTint` 错配会让顶点步长与着色器对不上。
- 投影用 `Matrix4.ortho(0, canvas.width, canvas.height, 0, 1, -1)`：设备像素、y 轴向下，和 `gl.viewport` 同坐标系；舞台仍然用 CSS 像素算 `skeleton.x/y/scale`。
- `skeleton.scaleY = -scale` 会翻转三角形绕序。`PolygonBatcher.disableCulling` 默认 `false`（不碰 `CULL_FACE`），WebGL 默认不开启背面剔除，所以安全；**不要在别处 `gl.enable(CULL_FACE)`**。
- mipmap 由 `USE_MIPMAPS` 控制：WebGL2 下任意尺寸都能建，WebGL1 只有 2 的幂尺寸才建（`isPowerOfTwo()`）。**前提是上面的 PMA 三条都成立**，否则就是色边复现器。

### 模式热切换

同一张 `<canvas>` 拿过 WebGL 上下文后就再也拿不到 `2d` 上下文，所以：

1. `rendererMode` 变化 → `canvasKey++` → 模板上的 `:key` 让 Vue 换一张全新 `<canvas>`；
2. `watch(canvas, …, { flush: 'post' })` 等新元素挂上后再 `load(lastCharacter)`；
3. 若「稳定」模式下 WebGL 初始化失败但画布已被占用（`SpineCanvasLockedError`），也走同一条换画布重试路径，并用 `lastLockedKey` 保证只重试一次，避免无限循环。

WebGL 能力先用一次性 canvas 探测（`canUseWebGL()`），绝不在正式画布上试错。

## 载入与绘制（useSpineStage）

两套 runtime 都是 `@esotericsoftware/spine-webgl@4.2.120` + `@esotericsoftware/spine-canvas@4.2`（**只支持 4.2 二进制**），二者共享同一份 `spine-core@4.2.120`（版本必须锁死 4.2.x，跨大版本会导致 `instanceof` 判型失效）。随本路由的异步 chunk 一起加载，首屏不含这部分体积。许可声明见 [docs/third-party-notices.md](../../docs/third-party-notices.md)。

### 载入

载入顺序：`new TextureAtlas(text)` → 逐个图集页校验贴图存在 → `await backend.bindTextures(atlas, pageName => File)`（**贴图由后端自己解码**：WebGL 走预乘 + mipmap，canvas 2d 走直通）→ `AtlasAttachmentLoader` → `SkeletonBinary` / `SkeletonJson` → `Skeleton` + `AnimationState`。

两个必须知道的细节：

- `TextureAtlas` 在 4.2 **只接受 atlas 文本**，贴图要自己 `setTexture()`（由 backend 按自己的 Texture 类型完成）。漏了这步 region 的 `texture` 是 `null`，两条路径都会崩。
- 骨骼是 y 轴向上的坐标系，靠 `skeleton.scaleY = -scale` 翻到画布；**不要**在外层再 `ctx.scale(1, -1)`，region 内部已经自带一次 `scale(1, -1)`，会被抵消成上下颠倒。

### 每帧顺序与相机

每帧顺序固定：

```ts
skeleton.setToSetupPose();          // 复位，避免上一条差分的 attachment 残留
if (state && activeAction) {        // 可选的动作（Idle_01 等）
  state.update(delta);
  state.apply(skeleton);
}
applyVariantLayers();               // 差分永远最后覆盖，保证生效
skeleton.updateWorldTransform(Physics.update);
backend.render(skeleton, debug);    // 只负责画，位置已经算好
```

包围盒用 `getBoundsRect()` 在载入时量一次（量之前把 `x / y / scaleX / scaleY` 清干净，否则上一次渲染的变换会混进包围盒）。每帧只算相机：

```
scale      = min(w * 0.94 / bounds.width, h * 0.94 / bounds.height) * zoom
skeleton.x = w / 2 + panX - (bounds.x + bounds.width / 2) * scale
skeleton.y = h / 2 + panY + (bounds.y + bounds.height / 2) * scale
```

### 尺寸与重绘

- 画布后备缓冲按 `devicePixelRatio`（上限 2）放大，尺寸同步只在 **`ResizeObserver` / `window.resize` / 载入完成**时做（`applySize()`），CSS 宽高缓存进 `viewWidth / viewHeight`。**不要再放回 `requestAnimationFrame` 里** —— 每帧读 `clientWidth` 会强制同步布局。
- 选「静态（不播放动作）」时靠 `needsRedraw` 脏标记按需重绘；差分、动作、缩放、平移、调试开关、尺寸变化都会置位。播放动作时每帧照常 `state.update()`。

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

角色 id + `Spine 版本 / 骨骼数 / 槽位数 / 动画数 / 当前渲染器`、差分 chips（可滚动）、动作 chips、缩放、骨骼调试开关、重置视角 / 更换文件 / 返回工具。

控件除 chips 外全部走 RizUI（全局亮色，无需 `theme` 属性）：`rizui_cfgrow` 做行、`rizui_slider` 做缩放（20%–300%）、`rizui_switch` 控制骨骼调试（WebGL 下走 `SkeletonDebugRenderer`，canvas 下走 `SkeletonRenderer.debugRendering`）、`rizui_progress` 做载入不定进度、`rizui_infobox` 做空态与错误、`rizui_button` 做全部按钮。

- **动作用 chips 而不是 `rizui_dropdown`**：后者的弹层是普通绝对定位（非 teleport），在 `overflow-y: auto` 的侧栏里会被裁掉；动作项只有 2~3 个，横排胶囊更直观，也和差分 chips 统一。
- 画布拖拽平移、滚轮缩放，`touch-action: none` 避免移动端滚动冲突。
- `load()` 用自增 `loadToken` 丢弃过期结果，避免快速换角色时旧载入覆盖新状态；`onBeforeUnmount` 自增 token 并 `disposeStage()` 停掉 `requestAnimationFrame` 与 `ResizeObserver`。
- 失败态显示具体原因（如「图集页 xxx 缺少对应贴图」）并提供「重新选择文件」。

## 已知边界

- 只支持 Spine 4.2 二进制 / JSON；3.8 及更早、4.3 骨骼会解析失败并落到错误态。`spine-webgl` / `spine-canvas` / `spine-core` **必须锁在 4.2.x**（`spine-webgl` 用精确版本 `4.2.120`，`^4.2.120` 会解析到 4.3 而装上第二份 core）。
- 贴图页名必须能对上（BA 原始包天然满足）；重命名过的文件走前缀 / 唯一贴图兜底。
- 图集贴图常为 2048²：canvas 路径靠 `CanvasTexture`（`dispose()` 是空实现，换角色时旧图不显式释放）；WebGL 路径由 backend 的 `dispose()` 逐个 `GLTexture.dispose()` 回收。
- **PMA 管道的三个开关必须一起维护**（解码 `premultiplyAlpha` / `DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL` / `renderer.premultipliedAlpha`）。只改其中一个的表现是：整体偏暗、边缘发黑、或半透明细节变粗。
- 掉帧只可能来自「保守」模式 + 高密度立绘（阿罗娜 / 普拉娜）。遇到其他角色掉帧先看面板里的渲染器标注是否仍为 Canvas 2D。

## 扩展

| 需求 | 做法 |
| --- | --- |
| 加一条渲染路径（比如 WebGPU） | 实现 `SpineBackend`，在 `createSpineBackend()` 里按模式分支；舞台不用改 |
| 换贴图采样策略 | 只动 `webglBackend` 的 `USE_MIPMAPS` / `GLTexture` 参数，但**不要破坏 PMA 三条** |
| 新增差分标签 | 往 `EXPRESSION_LABELS` 里加词条；噪声过滤在 `extractVariants()` 的 `noise` 集合 |
| 支持 Spine 4.3 骨骼 | 三个 `@esotericsoftware/*` 包必须**同时**升到同一 4.3.x，否则 `instanceof` 会失效 |
| 新增预览工具 | 在 `config/tools.ts` 加 `TOOL_ENTRIES` + 新路由，页面内复用 `useSpineStage` |

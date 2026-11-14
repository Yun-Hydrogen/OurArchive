# BackgroundRender — 背景宫格排布与大图灯箱预览

> 源码：`src/modules/BackgroundRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `OABackgroundGrid.vue` | 背景缩略图自适应网格展示组件 |
| `OABackgroundLightbox.vue` | 背景大图预览弹窗组件（RizUI Dialog 封装） |

## 职责边界

- 画什么：将给定的背景图片列表自适应排列为卡片网格，支持懒加载、比例裁剪与标题尺寸摘要展示；提供全尺寸大图查看、体积显示与新标签页跳转。
- 不做什么：不负责背景分类索引与文件扫描（由 `BackgroundProvider` 负责）、不发起背景列表的网络请求、不管理多级分类与选中过滤状态（由使用方页面如 `PackageView` 编排）。

## 关键实现

### `OABackgroundGrid.vue`

1. 作用：根据传入的背景图片列表自适应铺满卡片网格，并在点击单项时向上派发选定事件。
2. 输入输出：
   - Props：
     - `images: PackageBackground[]`（背景对象列表，含 `name`、`path`、`url`、`size` 等字段）。
   - Emits：
     - `(e: 'select', image: PackageBackground): void`（用户点击某张图片卡片时触发）。
3. 注意事项：
   - 布局采用 CSS Grid 自适应网格：`grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))`，网格间距为 8px，卡片宽度自适应容器分配。
   - 缩略图容器维持 16:9 固定纵横比（`aspect-ratio: 16 / 9`），图片统一采用 `object-fit: cover` 与 `object-position: center` 居中填充。
   - 占位背景色：在图片加载前提供浅蓝渐变占位（`linear-gradient(180deg, #eaf6ff 0%, #d6ecfc 100%)`）。
   - 图片开启原生懒加载与异步解码：`<img loading="lazy" decoding="async" />`，有效减轻超大资源包背景列表初次渲染的压力。
   - 卡片悬浮提供 subtle 的位移与投影反馈（`transform: translateY(-1px)`），聚焦态提供标准 `--oa-blue` 轮廓高亮。
   - 标题与体积：单项带有完整 `title` 气泡提示（`${image.name} · ${formatBytes(image.size)}`），底部单行文字单行截断并展示省略号。

### `OABackgroundLightbox.vue`

1. 作用：提供大图灯箱预览对话框，展示背景大图、文件全名、文件大小及原图在新标签页打开的外链。
2. 输入输出：
   - Props：
     - `show: boolean`（灯箱可见性开关）。
     - `image: PackageBackground | null`（当前展示的背景对象）。
   - Emits：
     - `(e: 'update:show', value: boolean): void`（弹窗关闭或更新可见状态）。
3. 注意事项：
   - 弹窗使用 `rizui_dialog`，宽度限制为 `min(1080px, 92vw)`，大图纵向限高 `min(70vh, 720px)`，使用 `object-fit: contain` 完整包含不拉伸。
   - **`show` 与 `image` 状态解耦**：父级在遮罩淡出关闭时，应保留 `image` 的引用而不要立刻置 `null`，避免遮罩尚未完成淡出过渡前大图先瞬间消失破损（见组件顶部注释）。
   - 外链跳转使用 `target="_blank" rel="noopener noreferrer"` 确保安全隔离。
   - 支持遮罩层点击关闭（`mask-close`），关闭时通过可写计算属性 `model` 派发 `update:show` 事件。
   - 弹窗标题动态回退：若当前 `image` 未就绪或无名称，默认回退显示「背景预览」。

### 典型使用模式与集成示例

1. 在 `PackageView` 中，背景分类（`OAPackageBackgrounds.vue`）持有 `activeImage: PackageBackground | null` 与 `showLightbox: boolean`。
2. 用户点击网格项触发 `handleSelect(image)`，将 `activeImage` 赋值并置 `showLightbox = true`。
3. 用户关闭弹窗时仅将 `showLightbox = false`，不抹掉 `activeImage`，待弹窗完全淡出后数据自然回收。

## 注意事项

- 本模块各组件均为纯渲染件，可直接复用于未来的剧情播放器或场景选择器。
- 背景图体积展示使用统一的 `formatBytes` 工具函数，保持全站量纲规范。
- 背景多分类子条目切换时，定位与滚动到对应区域由上层视图配合 `getBoundingClientRect` 差值计算，组件内部不干涉页面级滚动条。
- 图像资源全量通过静态 URL 交付，组件不干预任何缓存策略，充分利用浏览器自身 HTTP 缓存。

## 相关文档

- [PackageView](../views/PackageView.md)
- [NeedNotice](../NeedNotice.md)

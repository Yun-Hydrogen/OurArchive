# PackageView — 资源包详情：侧边栏导航、多类内容按需加载与表情选角

> 路由：`/resources/:packageId`
> 源码：`src/views/package/PackageView.vue`（+ `OAPackage*.vue`、`usePackagePreviewAudio.ts`、`package.css`）

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/package/PackageView.vue` | 资源包大卡片宿主：页头、侧边栏宽度装配、分类按需加载、搜索代理与表情选角流程 |
| `src/views/package/package.css` | 整页样式（`oa-pkg*`），unscoped，供 6 个同级分类组件共用页面原语 |
| `src/views/package/OAPackageNav.vue` | 侧边栏包装：基于 `rizui_sidebar`，响应尺寸并转发选中与折叠展开事件 |
| `src/views/package/OAPackageCharacters.vue` | 角色分类：学院分组折叠、内容懒挂载、搜索强制展开、侧边栏联动定位 |
| `src/views/package/OAPackageSkeletons.vue` | 骨骼分类：立绘目录列表、文件清单折叠、完整性校验、直接跳骨骼预览 |
| `src/views/package/OAPackageMusic.vue` | 背景音乐分类：曲目列表、试听播放器、两行折叠与完整描述弹窗 |
| `src/views/package/OAPackageSounds.vue` | 音效分类：按 `categories.json` 中文标签分组、试听播放器与进度条 |
| `src/views/package/OAPackageBackgrounds.vue` | 背景分类：按 `category.yml` 分组、网格与灯箱大图预览 |
| `src/views/package/OAPackageEmotions.vue` | 表情分类：立绘底座信息与工具栏排布，复用 `OAEmotionPreview` |
| `src/views/package/usePackagePreviewAudio.ts` | 音乐/音效私有试听逻辑：各自持有 `<audio>`，与主界面 BGM 互斥 |
| `src/modules/ResourcePicker/useCharacterPicker.ts` | 表情预览角色选择器单例（Promise API） |
| `src/modules/ResourcePicker/OACharacterPickerDialog.vue` | 角色选择器对话框渲染组件 |
| `src/modules/PackageProvider/usePackageContent.ts` | 单资源包聚合数据 Provider（详情、角色、骨骼、音乐、音效、背景、表情） |
| `src/modules/ViewsManager/OAPageHeader.vue` | 通用页头组件：标题、副标题、返回「资源管理」按钮、搜索插槽 |

## 页面结构

- 页头：挂载 `modules/ViewsManager/OAPageHeader.vue`，标题为 `pkg?.name || packageId`，副标题为资源包描述，`back-label="资源管理"`，返回触发 `backToResources`；`#actions` 插槽渲染分类代理搜索框（`.oa-pkg__search--head`）。
- 主体容器（`.oa-pkg__card`）：
  - 高度设为 `clamp(420px, calc(95vh - 60px), 1400px)`，自适应占满整屏且不顶出页面外滚动条。
  - 左侧：`<OAPackageNav>` 侧边栏，宽度由卡片 `ResizeObserver` 动态计算传入。
  - 右侧：`.oa-pkg__content` 独立纵向滚动区，根据 `activeSection` 渲染对应的子组件或占位说明。
- 根节点并列挂载 `<OACharacterPickerDialog />`，供表情分类流程随时唤起选角对话框。

## 关键实现

### `package.css` 的 unscoped 设计

1. 作用：提供 `oa-pkg__toolbar`、`oa-pkg__summary`、`oa-pkg__state`、`oa-pkg__empty`、`oa-pkg__placeholder` 等全页共享原语。
2. 原理：页面被拆分为 1 个外壳 + 6 个同级分类子组件，各组件内均包含工具栏、状态条与空态结构。若采用 scoped 样式会导致选择器哈希隔离，迫使各子组件重复拷贝样式规则。因此集中到 unscoped 的 `package.css` 并以 `oa-pkg` 块名前缀约束作用域。

### `navModel` 写入闸门与父条目展开

1. 作用：`OAPackageNav` 将 `rizui_sidebar` 的 `v-model` 与 `navModel` 绑定。当用户点击学院（`school:`）、音效分类（`sound:`）或背景分类（`bg:`）子条目时，`rizui_sidebar` 会将选中的子条目 ID 赋予 `modelValue`。
2. 输入输出：`navModel` 的 `setter` 拦截并过滤掉空值及带有上述前缀的子条目 ID，保证 `activeSection` 始终锁定在顶层大分类常量上。
3. 联动机制：`handleNavToggle` 在展开父条目时（`expanded === true`），顺带将 `activeSection` 切到对应分类，防止「展开了音效侧栏但右侧仍停留在角色」的脱节现象。见 [NeedNotice](../NeedNotice.md) 条目 37。

### `focusSchool` 与 `opened` 握手定位机制

1. 作用：在任意分类下点击侧边栏的具体学院子条目，均能准确定位并展开该学院。
2. 输入输出：`focusSchool(school)` 记录 `{ school, token: ++schoolToken }` 并作为 `focus` prop 传给 `OAPackageCharacters`。子组件内通过 `watch(() => props.focus?.token, ..., { immediate: true })` 展开并懒挂载该学院内容后，触发 `emit('opened', school)`。
3. 页面处理：页面接收到 `opened` 后触发 `handleSchoolOpened`，清空 `schoolFocus`（防重挂载时重复触发），并调用 `scrollToBlock()` 计算 `getBoundingClientRect` 差值平滑滚动，最后执行 `highlightSchool(school)` 高亮 1200ms。见 [NeedNotice](../NeedNotice.md) 条目 53。

### 各分类按需加载（`watch(activeSection)`）

1. 作用：骨骼包含数百个立绘目录、音效包含数千条音频，进页面全量请求会严重拖慢首屏。
2. 实现：页面初始仅拉取基础详情与角色；通过 `watch(activeSection, (section) => { ... }, { immediate: true })`，仅在切到 `SECTION_SKELETONS`、`SECTION_MUSIC`、`SECTION_SOUNDS`、`SECTION_BACKGROUNDS`、`SECTION_EMOTIONS` 时才按需调用对应的 `load*()` 方法。各分类在 Provider 内部均拥有独立的 loading、error 与 loaded 去重标志。见 [NeedNotice](../NeedNotice.md) 条目 24。

### `usePackagePreviewAudio` 私有试听状态

1. 作用：背景音乐与音效各自在模板中挂载独立的 `<audio ref="audioEl">` 元素，共用 `usePackagePreviewAudio` 状态机。
2. 试听控制：`toggle(track)` 播放时调用 `suspendMainBgm()` 暂停全局主界面 BGM；当点击暂停、音频自然播放结束（`@ended`）或组件卸载（`stop()`）时调用 `resumeMainBgm()` 恢复。
3. 状态隔离：单实例只维护一份 `playingId`。切换分类或条目时必须释放前一个音频；自然播完必须将 `playingId` 置空且重置 `currentTime = 0`，避免状态假死。见 [NeedNotice](../NeedNotice.md) 条目 25、26。

### 表情分类选角流程（`pick` 事件流转）

1. 作用：表情预览需要指定一套立绘作为底座，选角与立绘装配流程集中在 `PackageView` 页面管理。
2. 流转：`OAPackageEmotions` 点击「选择预览角色」触发 `emit('pick')`；页面捕获后执行 `pickEmotionCharacter()`，调用 `buildCharacterChoices()` 组装已绑定骨骼角色与独立立绘目录清单；唤起 `openCharacterPicker()` 对话框；选定后调用 `loadSpineCharacterFromPackage()` 加载立绘模型并将 `emotionCharacter` 传回子组件驱动预览。

### `OAPackageCharacters.vue`（学院分组与展开状态）

1. 作用：渲染角色卡片网格，提供全部展开/收起、学院表头点击折叠与搜索联动。
2. 内部状态：维护 `expandedSchools`（当前展开）与 `mountedSchools`（懒挂载缓存）。`isOpen(school)` 与 `isMountedContent(school)` 在处于搜索态时（`isSearching`）强制全部展开与挂载。
3. 表头点击代理：由于 `rizui_card` 头部非按钮，在 `handleGroupClick` 中利用 `event.target.closest('.ct-card-head')` 代理判定表头点击。折叠动画采用 CSS Grid `grid-template-rows: 0fr -> 1fr` 配合内层 `overflow: hidden; min-height: 0`。见 [NeedNotice](../NeedNotice.md) 条目 38。

### `OAPackageMusic.vue` / `OAPackageSounds.vue`（媒体列表与详情）

1. 作用：背景音乐与音效的列表渲染、试听播放器接入与时间轴拖拽（seek）。
2. 音乐详情弹窗：`hasMoreDescription(item)`（长度 > 42 或含换行）判定是否展示「查看详细」按钮，通过 `rizui_dialog` 展示完整描述文本。
3. 音效类别映射：按 `categories.json` 的中文标签归类分组，由父组件传入 `activeCategory` 过滤。

### `OAPackageBackgrounds.vue` / `OAPackageSkeletons.vue`

1. 作用：背景分类展示网格与灯箱大图（复用 `BackgroundRender`）；骨骼列表展示立绘文件清单与完整性校验。
2. 骨骼完整性：仅当立绘目录包含完整骨骼三件套时（`item.complete`），才允许点击「预览」按钮触发 `previewSkeleton` 跳转；否则禁用并提示警告。

### `OAPackageNav.vue`（侧边栏封装）

1. 作用：作为 `rizui_sidebar` 的薄封装层，将页面计算好的像素宽度 `:width="width"` 传入组件。
2. 事件透传：负责把侧栏内部的 `update:modelValue`、`select` 与 `toggle` 事件原样向父页面抛出。

### 常量定义与分类约定

1. 分类 ID 常量：`SECTION_CHARACTERS = 'characters'`、`SECTION_SKELETONS = 'Skeletons'`、`SECTION_MUSIC = 'BackgroundMusic'`、`SECTION_SOUNDS = 'Sounds'`、`SECTION_BACKGROUNDS = 'Backgrounds'`、`SECTION_EMOTIONS = 'Emotions'`。
2. 前缀常量：`SCHOOL_PREFIX = 'school:'`、`SOUND_CATEGORY_PREFIX = 'sound:'`、`BACKGROUND_CATEGORY_PREFIX = 'bg:'`（空串分别代表全部音效或未分类背景）；兜底学院名常量 `UNKNOWN_SCHOOL = '未知学院'`。
3. 辅助转换函数：`navIdOf(key)` 处理键名映射（仅 `hasCharacter` 映射为 `SECTION_CHARACTERS`，其余原样透传）。

## 交互与状态

- **卡片自适应缩放**：通过 `watch(cardEl, { flush: 'post' })` 绑定 `ResizeObserver`，卡片重挂载时重新计算宽度，将侧边栏像素宽度限制在 `clamp(150px, 20%, 226px)`。见 [NeedNotice](../NeedNotice.md) 条目 23、36。
- **动态搜索框代理**：页头搜索框绑定可写计算属性 `activeKeyword`，按当前 `activeSection` 分别读写 `keyword`、`skeletonKeyword`、`musicKeyword`、`soundKeyword`、`backgroundKeyword`，分类切换互不污染。
- **页面退场**：点击返回「资源管理」或点击具体项进入「角色详情」「骨骼预览」均走 `leaveTo()` 统一管道，置 `isLeaving = true`，等待 `SHELL_TIMING.cardsExitWait`（320ms）后执行路由跳转。

## 注意事项

- `package.css` 必须保持 unscoped，严禁随意给页面块级样式增加局部 scope，确保各子组件类名生效。
- `rizui_sidebar` 宽度 `:width` 必须传入纯数字像素值，严禁传入百分比字符串，见 [NeedNotice](../NeedNotice.md) 条目 36。
- 绝不能将 `v-model` 直接双向绑定到 `activeSection`，必须使用带有过滤闸门的 `navModel`，见 [NeedNotice](../NeedNotice.md) 条目 37。
- 侧边栏学院定位必须使用 `focus` prop 与 `opened` 事件的两段式握手，不可直接同步调用子组件方法，见 [NeedNotice](../NeedNotice.md) 条目 53。
- 试听 `<audio>` 标签必须就地放置在 `OAPackageMusic` 与 `OAPackageSounds` 模板分支内，不得提升至顶层，见 [NeedNotice](../NeedNotice.md) 条目 26。
- 音频 `@pause` 事件中不得恢复全局 BGM，恢复逻辑仅允许在暂停操作、`@ended` 与 `stop()` 中显式调用，见 [NeedNotice](../NeedNotice.md) 条目 25。
- 页面卸载前必须调用 `disposeCharacterPicker()` 并清理所有定时器与 `ResizeObserver`。

## 相关文档

- [ResourcesView](./ResourcesView.md)
- [PackageCharacterView](./PackageCharacterView.md)
- [SkeletonPreviewView](./SkeletonPreviewView.md)
- [PackageProvider](../modules/PackageProvider.md)
- [ResourcePicker](../modules/ResourcePicker.md)
- [NeedNotice](../NeedNotice.md)

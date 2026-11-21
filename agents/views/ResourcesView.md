# ResourcesView — 资源管理：资源包/工程/存档/插件列表与索引扫描

> 路由：`/resources`
> 源码：`src/views/ResourcesView.vue`、`src/views/OAPackageCard.vue`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/ResourcesView.vue` | 资源管理单容器视图：标题区（OAPageHeader）、一级选项卡（`TABS`）、分类胶囊 + 排序 / 视图工具、内容区（网格 / 列表 / 三个占位面板）与底部状态栏 |
| `src/views/OAPackageCard.vue` | 资源包卡片：标题 + 作者 + 定高资源清单 + 「详细信息 / 管理」两个动作（不再整卡可点） |
| `src/views/OAPackageDetailDialog.vue` | 资源包「详细信息」弹窗：描述、作者 / 更新时间 / 资源总数 / 分类数、分类明细表与解析异常提示 |
| `src/modules/PackageProvider/useResourcePackages.ts` | 资源包列表索引状态管理（`packages`、`resourcesDir`、`loading`、`refresh`） |
| `src/modules/ViewsManager/OAPageHeader.vue` | 通用统一页头组件：标题、副标题、返回主界面按钮、`#actions` 插槽 |
| `src/modules/ViewsManager/useEnterAnimation.ts` | 页面入场动画控制：等待扫描就绪后再播卡片入场 |
| `src/modules/ViewsManager/routes.ts` | 路由名称常量：`ROUTE_NAMES.home`、`ROUTE_NAMES.packageDetail` |
| `src/modules/Shell/shellTiming.ts` | `SHELL_TIMING`：外壳与卡片离场等待时长常量 |
| `src/utils/format.ts` | 数据格式化纯函数：`formatDateTime` |

## 页面结构：单容器 + 顶部选项卡

整页只有一张大卡片（`.oa-res__explorer`，圆角 22px、`overflow: hidden`、顶部一条主题光带），
标题、选项卡、工具栏、内容、状态栏全部收在里面，页面本身保持透明（底色与气泡仍由 App 外壳提供）。

1. **标题区（`.oa-res__hero`）**：挂 `OAPageHeader`（标题「资源管理」+ 副标题 + 「主界面」返回），
   `#actions` 里放 `rizui_text` 检索框（仅资源包分区显示）与 `rizui_button`（primary）刷新按钮。
2. **一级选项卡（`.oa-res__tabs`）**：`role="tablist"` 的胶囊分段器，四项来自常量 `TABS`
   ——资源包 / 剧本工程 / 游戏存档 / 扩展插件；资源包带数量徽标，其余三项带 `DEV` 角标。
   窄屏下整条横向滚动（隐藏滚动条），不换行、不堆叠。
3. **筛选与工具（`.oa-res__toolbar`）**：左侧是分类胶囊 `FILTER_CHIPS`（全部 / 角色立绘 / 骨骼立绘 /
   背景音乐 / 音效音频 / 场景背景 / 表情，各带 `filterCounts` 计数），右侧是排序 `rizui_dropdown`
   与「平铺 / 列表」双模切换；只在资源包分区渲染。
4. **内容区（`.oa-res__body`）**：唯一的滚动容器（`flex: 1; min-height: 0; overflow-y: auto`），
   内部按选项卡切换 `.oa-res__panel`；工程 / 存档 / 插件三个占位面板用 `.oa-res__panel--narrow` 收窄到 780px。
5. **状态栏（`.oa-res__status`）**：项目数 / 可点击复制的存储路径 / 就绪状态灯；扫描中状态灯变蓝并脉冲。

> 侧边栏目录树（旧 `rizui_sidebar` + `NavItem` 模型）已整体移除：分类筛选上移到胶囊行，
> 分区切换交给选项卡，页面不再需要 `navItems` / `navModel` / `currentBreadcrumb` 三套派生状态。

## 关键实现

### `useEnterAnimation(() => !loading.value, 1800)`

1. 作用：控制卡片入场动画时序，等待后端资源包扫描完毕、进度条完全消失后才触发卡片飞入。
2. 输入输出：就绪判断函数 `() => !loading.value`，动画总预算时长 1800ms；返回 `{ isEntering }`。
3. 注意事项：避免本地扫描过快或网络延迟时，进度条刚消失卡片就生硬瞬间插入。见 [NeedNotice](../NeedNotice.md) 条目 52。

### `cardDelay(step)`

1. 作用：计算资源包卡片的入场错峰延迟。
2. 输入输出：`step: number`（卡片 index）；返回 `${30 + Math.min(step, 8) * 60}ms`。
3. 注意事项：延迟最多计算到第 8 张卡片，防止资源包过多时末尾卡片等待过久。

### `openPackage(pkg)`

1. 作用：点击卡片或列表行进入对应资源包大卡片详情页。
2. 输入输出：`pkg: ResourcePackage`；无返回值。
3. 注意事项：置 `isLeaving = true` 防连击，等待 `SHELL_TIMING.cardsExitWait`（320ms）离场动画播完后跳转 `ROUTE_NAMES.packageDetail`，传参 `{ packageId: pkg.id }`。

## 交互与状态

- **核心容器进退场**：`.oa-res__explorer` 带有 `oa-panel-in` 与 `oa-panel-out` 平滑升降动画。
- **卡片动作**：`OAPackageCard` 不再整卡可点，只保留「详细信息」→ `emit('details')` 打开 `OAPackageDetailDialog`，「管理」→ `emit('open')` 进入资源包页。卡片内只放标题、作者、定高资源清单（`.oa-pkg-card__chips` 高 78px、超出在面板内滚动），描述 / 时间 / 解析状态等完整信息全部收进弹窗。
- **详细信息弹窗**：`detailPackage` ref 既当开关又当数据源（`null` = 关闭）；`rizui_dialog` 的 `#footer` 有「关闭 / 进入管理」，后者携带 `pkg` 发 `open`，父级直接 `openPackage(pkg)`，**不要**在关闭事件里清空后再读 `detailPackage`（会读到 null）。
- **选项卡联动**：`activeTab` 驱动 `.oa-res__tabs` 的选中态与内容面板切换（外层 `oa-res-tab-fade` 淡入淡出），资源包分区额外显示筛选胶囊与工具行。
- **筛选胶囊**：`activeFilter` + `filterCounts` 决定「全部 / 角色立绘 / 骨骼立绘 / 背景音乐 / 音效音频 / 场景背景 / 表情」的选中态与计数；搜索无结果时给出重置入口。
- **平铺/列表双模**：`viewMode` 记忆用户喜好，列表模式下支持行内直接点击打开。
- **外壳让位**：本页（以及资源包详情、角色详情）属于「沉浸外壳」，App 层会收起 banner 与右上角设置，设置按钮改为贴右缘的竖向把手，见 [Shell](../modules/Shell.md)。

## 注意事项

- 必须通过 `useEnterAnimation` 绑定 `!loading.value` 来触发入场动画，严禁在 `onMounted` 中直接计时，见 [NeedNotice](../NeedNotice.md) 条目 52。
- 离开页面前必须等待 `SHELL_TIMING.cardsExitWait`（320ms）动画完成，严禁同步调用 `router.push`，见 [NeedNotice](../NeedNotice.md) 条目 33。
- 进退场与位移样式必须挂在 `.oa-slot` 容器层上，不得在 `.oa-pkg-card` 卡片本体上直接覆盖进场 `transform`，以保护卡片的 hover 浮动与 `:focus-visible` 焦点环，见 [NeedNotice](../NeedNotice.md) 条目 29。
- 数字与日期格式化必须直接调用 `utils/format.ts` 的 `formatDateTime`，严禁在组件内部就地书写重复的格式化逻辑。
- 内容区 `.oa-res__body` 是**唯一**的滚动容器：`flex: 1` 必须配 `min-height: 0`，否则长列表会把大卡片撑出视口、状态栏被挤出屏幕。
- 状态栏用负外边距贴到卡片左右边缘（`margin-inline: calc(-1 * padding)`），改 `.oa-res__explorer` 的水平内边距时两处要一起改。
- 组件卸载前（`onBeforeUnmount`）必须清除 `leaveTimer` 与 `copyTimer`，防止异步竞态与内存泄漏。

## 相关文档

- [HomeView](./HomeView.md)
- [PackageView](./PackageView.md)
- [PackageProvider](../modules/PackageProvider.md)
- [ViewsManager](../modules/ViewsManager.md)
- [NeedNotice](../NeedNotice.md)

# ResourcesView — 资源管理：资源包/工程/存档/插件列表与索引扫描

> 路由：`/resources`
> 源码：`src/views/ResourcesView.vue`、`src/views/OAPackageCard.vue`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/ResourcesView.vue` | 资源管理页组件：页头分类标签、扫描状态、卡片网格与占位面板 |
| `src/views/OAPackageCard.vue` | 资源包展示卡片：名称/描述/作者/更新时间/内容分类 chip/缺失提示 |
| `src/modules/PackageProvider/useResourcePackages.ts` | 资源包列表索引状态管理（`packages`、`resourcesDir`、`loading`、`refresh`） |
| `src/modules/ViewsManager/OAPageHeader.vue` | 通用统一页头组件：标题、副标题、返回主界面按钮、`#actions` 插槽 |
| `src/modules/ViewsManager/useEnterAnimation.ts` | 页面入场动画控制：等待扫描就绪后再播卡片入场 |
| `src/modules/ViewsManager/routes.ts` | 路由名称常量：`ROUTE_NAMES.home`、`ROUTE_NAMES.packageDetail` |
| `src/modules/Shell/shellTiming.ts` | `SHELL_TIMING`：外壳与卡片离场等待时长常量 |
| `src/utils/format.ts` | 数据格式化纯函数：`formatCount`、`formatDateTime` |

## 页面结构

- 页头：挂载 `modules/ViewsManager/OAPageHeader.vue`，属性 `title="资源管理"`、`subtitle="老师可以在此处管理资源包/工程/存档/插件哦~"`、`back-label="主界面"`，监听 `@back="backHome"`；通过 `#actions` 插槽嵌入全圆角分类胶囊标签栏（`.oa-res__tabs`）。
- 主体分区（`.oa-res__body`）：
  - 采用 `<Transition name="oa-res-tab-fade" mode="out-in">` 包裹 `.oa-res__panel`，实现标签切换时的 180ms 淡入上移过渡。
  - 数据来源于 `useResourcePackages()`，提供 `packages`、`resourcesDir`、`loading`、`error` 与 `refresh()`。
  - 「资源包」标签激活时：顶部展示工具栏（`.oa-res__toolbar`），含资源包统计、目录路径与「刷新」按钮；下方通过 `<Transition name="oa-swap" mode="out-in">` 切换「扫描中（进度条）」/「错误提示」/「空列表提示」/「卡片网格（`.oa-res__grid`）」。
  - 「工程/存档/插件」等未就绪标签激活时：展示 `.oa-res__placeholder` 占位面板（含「未完成」徽标、标签名与说明文字）。

## 关键实现

### `useEnterAnimation(() => !loading.value, 1800)`

1. 作用：控制卡片入场动画时序，等待后端资源包扫描完毕、进度条完全消失后才触发卡片飞入。
2. 输入输出：就绪判断函数 `() => !loading.value`，动画总预算时长 1800ms；返回 `{ isEntering }`。
3. 注意事项：避免本地扫描过快或网络延迟时，进度条刚消失卡片就生硬瞬间插入。见 [NeedNotice](../NeedNotice.md) 条目 52。

### `cardDelay(step)`

1. 作用：计算资源包卡片的入场错峰延迟。
2. 输入输出：`step: number`（卡片 index）；返回 `${60 + Math.min(step, 8) * 90}ms`。
3. 注意事项：延迟最多计算到第 8 张卡片（封顶 780ms），防止资源包过多时末尾卡片等待过久。

### `openPackage(pkg)`

1. 作用：点击卡片进入对应资源包大卡片详情页。
2. 输入输出：`pkg: ResourcePackage`；无返回值。
3. 注意事项：置 `isLeaving = true` 防连击，等待 `SHELL_TIMING.cardsExitWait`（320ms）离场动画播完后跳转 `ROUTE_NAMES.packageDetail`，传参 `{ packageId: pkg.id }`。

### `activeContents(pkg)`（在 `OAPackageCard.vue` 内）

1. 作用：筛选出当前资源包中已声明支持的内容分类（`pkg.contents.filter(item => item.supported)`）。
2. 输入输出：`pkg: ResourcePackage`；返回 `PackageContent[]`。
3. 注意事项：未声明支持的分类直接不予渲染；若声明支持但目录实际不存在（`!item.exists`），在 UI 上标记为黄色「缺失」徽标。

## 交互与状态

- **分类标签切换**：由 `activeTab`（`packages` / `projects` / `saves` / `plugins`）驱动，`TABS` 常量数组中 `ready: false` 的标签在模板中打上 `oa-res__tab__badge`（未完成），切换时通过 `oa-res-tab-fade` 交叉淡入。
- **扫描与刷新**：组件挂载时在 `onMounted` 自动调用 `refresh()`；点击「刷新」按钮重扫磁盘资源。扫描期间「刷新」按钮置灰禁用，卡片区域展示 `rizui_progress` 不定长进度条。
- **页面退场动效**：返回主界面（`backHome`）与进入资源包详情（`openPackage`）均复用 `isLeaving` 闸门，卡片通过 `.oa-slot` 运行 `oa-card-out` 向下坠落平移 52px（`--exit-y: 52px`），播完后执行路由切换。

## 注意事项

- 必须通过 `useEnterAnimation` 绑定 `!loading.value` 来触发入场动画，严禁在 `onMounted` 中直接计时，见 [NeedNotice](../NeedNotice.md) 条目 52。
- 离开页面前必须等待 `SHELL_TIMING.cardsExitWait`（320ms）动画完成，严禁同步调用 `router.push`，见 [NeedNotice](../NeedNotice.md) 条目 33。
- 进退场与位移样式必须挂在 `.oa-slot` 容器层上，不得写在 `.oa-pkg-card` 卡片本体上，以保护卡片的 hover 浮动与 `:focus-visible` 焦点环，见 [NeedNotice](../NeedNotice.md) 条目 29。
- 数字与日期格式化必须直接调用 `utils/format.ts` 的 `formatCount` 与 `formatDateTime`，严禁在组件内部就地书写重复的格式化逻辑。
- 组件卸载前（`onBeforeUnmount`）必须清除 `leaveTimer`，防止异步路由跳转竞态与内存泄漏。

## 相关文档

- [HomeView](./HomeView.md)
- [PackageView](./PackageView.md)
- [PackageProvider](../modules/PackageProvider.md)
- [ViewsManager](../modules/ViewsManager.md)
- [NeedNotice](../NeedNotice.md)

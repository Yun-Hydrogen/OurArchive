# ViewsManager — 路由表、入口闸门、共用页头与「数据就绪后才播」的入场计时

> 源码：`src/modules/ViewsManager/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `routes.ts` | `ROUTE_NAMES` / `ROUTE_PATHS`：路由名与路径的唯一真源 |
| `router.ts` | `router` 实例（7 条懒加载路由 + 兜底重定向）、入口闸门与会话记忆 |
| `access.ts` | 入口闸门状态 + 会话保持：`unlockApp()` / `isAppUnlocked()` / `rememberRoute()` / `canRestoreSession()` |
| `useEnterAnimation.ts` | 页面入场开关：等数据就绪后再播、到点撤 class |
| `OAPageHeader.vue` | 统一页头：标题 / 副标题 / 返回按钮 / `actions` 插槽 |

## 职责边界

- 做：页面之间的连接（路径常量、跳转许可、未知路径兜底），以及 5 个内层页面共用的页头与「进度条消失后才播入场」的计时。
- 不做：外壳状态与 banner 停靠（`Shell`）、页面自己的卡片布局与离场动画（各页面自己写 `isLeaving` + `SHELL_TIMING.cardsExitWait`）。

## 关键实现

### `ROUTE_NAMES` / `ROUTE_PATHS`（`routes.ts`）

1. 作用：路由名与路径的唯一真源，避免到处硬编码字符串；默认（不带路径）访问即 splash。
2. 内容：7 条 —— `splash: '/'`、`home: '/home'`、`tools: '/tools'`、`skeletonPreview: '/tools/skeleton'`、`resources: '/resources'`、`packageDetail: '/resources/:packageId'`、`packageCharacter: '/resources/:packageId/character/:nameId'`；`packageId` 就是 `res/` 下的目录名。
3. 注意事项：`App.vue`、`views/homeMenu.ts`、`views/tools.ts`、各页面都从这里取常量，新增页面先加常量再注册路由；`skeletonPreview` 嵌在 `tools` 路径下，别拆成平级路径。

### `router`（`router.ts`）

1. 作用：`createWebHistory()` + 7 条**懒加载**路由（每条带 `meta.title`，分别是 `Our Archive` / `- 主界面` / `- 工具` / `- 立绘骨骼预览` / `- 资源管理` / `- 资源包` / `- 角色详情`），加一条兜底 `'/:pathMatch(.*)*'` 重定向。
2. 输入输出：由 `main.ts` 里 `app.use(router)` 注入；页面用 `useRouter()` 拿实例 `push`。
3. 注意事项：兜底的 `redirect` 是函数式 `() => ROUTE_PATHS.splash`，保证深层错地址不会落在一个空页面上；页面组件全部 `() => import(...)`，新增路由不要写成静态引入。

### `access.ts`（闸门 + 会话保持）

1. 作用：入口闸门状态 + 「刷新保留当前界面」。
2. 输入输出：
   - `unlockApp()`：splash 首次点击后调用，同时把 `oa:unlocked` 写进 `sessionStorage`；
   - `isAppUnlocked(): boolean`：内存态；
   - `rememberRoute(fullPath)` / `rememberedRoute()`：`afterEach` 里记录上一页（只记非 `/`）；
   - `canRestoreSession(): boolean`：会话保持开启 + 本会话解锁过 + 有记录，三者同时成立；
   - `setKeepSession(enabled)`：把配置项 `keep_session` 同步进 `localStorage`（`oa:keep-session`），
     关闭时顺带清掉记录，保证下一次刷新回到引导页。
3. 注意事项：
   - 闸门本身仍在内存里（`isUnlocked`）；会话恢复是**显式开关**，不再靠内存态硬拦刷新。
   - 路由守卫在配置请求返回前就要判断，所以开关另存了一份 `localStorage` 镜像，默认开启。
   - 关闭会话保持后，`oa:last-route` 与 `oa:unlocked` 会被清掉，行为回到「刷新必回引导页」。

### 入口闸门（`router.beforeEach` / `afterEach`）

1. 作用：`splash` 直接放行；已解锁放行；未解锁但满足 `canRestoreSession()` 时，
   调用 `unlockApp()` + `useAppShell().enterSession()` 后放行（刷新恢复，不跳转）；否则重定向回 splash。
2. `afterEach`：非 splash 路由写入 `rememberRoute(to.fullPath)`，供刷新恢复。
3. 注意事项：必须用 `replace` 而不是 `push`——`push` 会在历史栈里塞一条马上又被重定向的死链。
   会话保持开启时，直接在地址栏打开深层页面（同一会话内）也会被放行；关闭时回到「刷新即回引导页」的老行为。

### `useEnterAnimation(isReady, duration)`

1. 作用：把「卡片入场」的计时从组件挂载挪到「内容真的能显示」的那一刻——数据没回来时一直保持 `isEntering = true`，等进度条淡出、内容挂上之后再跑 CSS 动画，避免「进度条一走完，卡片就硬切进来」。
2. 输入输出：`isReady: () => boolean`（通常是 `() => !loading.value`）、`duration: number`（入场动画总时长，必须覆盖错峰延迟 + 动画时长）；返回 `{ isEntering }`。
3. 注意事项：内部是 `watch(isReady, …, { immediate: true })`，一旦重新进入加载态就立刻把 `isEntering` 挂回去；`onBeforeUnmount` 清定时器。返回的是裸 `ref`（技术上可写），按只读用。现有调用方与时长：`ResourcesView` 1800ms、`PackageView` 900ms、`PackageCharacterView` 900ms（`SkeletonPreviewView` 只用了 `oa-fade` 退场，没接入这个 hook）。见 NeedNotice 条目 52。

### `OAPageHeader`（`title` / `subtitle` / `backLabel` / `backPosition`）

1. 作用：把 7 个页面各写一份的 `.oa-xxx__head` 收成一处，只保留文案与「返回按钮在左还是在右」两个决定项。
2. 输入输出：props `title: string`、`subtitle?: string`（默认 `''`）、`backLabel?: string`（不传则不渲染返回按钮）、`backPosition?: 'start' | 'end'`（默认 `'end'`）；`emit('back')`；具名插槽 `actions` 放右侧标签/搜索等。
3. 注意事项：`backPosition="start"` 目前只有 `PackageCharacterView`、`SkeletonPreviewView` 用（返回在标题旁），其余页面在右；页头自带 `padding-right: var(--oa-page-head-reserve, clamp(64px, 6vw, 80px))`，默认值是为 `position: fixed` 的常驻设置按钮让位；资源库这类把设置改成右缘把手的沉浸页，在页面根节点把该变量覆盖为 `0px` 即可收回这块留白。改窄会让窄窗口下的返回键被挡住点不到；副标题默认单行省略，≤620px 才允许换行。

## 注意事项

- 新增页面的完整顺序：`routes.ts` 加常量 → `router.ts` 注册懒加载路由 → 页面用 `OAPageHeader` 并引用 `SHELL_TIMING`。
- 闸门只管「能不能进」，不管「进来之后停在哪」；返回键路径由各页面的 `backHome` / 离场动画决定。
- 「加载态 ↔ 内容」的切换用各页面自己的 `<Transition name="oa-swap" mode="out-in">`（绝对定位遮罩用 `oa-fade`），`useEnterAnimation` 只负责入场 class 的开关。
- 未接页面的入口（编辑模式 / 阅读模式 / 3D场景）没有 `route`，不要为了「点了有反应」给它们补一条空路由。

## 相关文档

- [Shell](../modules/Shell.md)
- [SplashView](../views/SplashView.md)
- [HomeView](../views/HomeView.md)
- [ToolsView](../views/ToolsView.md)
- [NeedNotice](../NeedNotice.md)

# HomeView — 主界面：模式卡叠放切换、功能卡导航与卡片进退场动效

> 路由：`/home`
> 源码：`src/views/HomeView.vue`、`src/views/homeMenu.ts`、`src/views/OACardArt.vue`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/HomeView.vue` | 主界面：双列网格布局、左侧模式叠卡、右侧功能卡、进退场动画与时序 |
| `src/views/homeMenu.ts` | `HOME_MENU`：主页入口数据源（标题、副标题、插画变体、目标路由） |
| `src/views/OACardArt.vue` | 内联 SVG 插画组件，按 variant 选图 |
| `src/modules/Shell/shellTiming.ts` | `SHELL_TIMING`：卡片入场基准延时与离场等待常量 |
| `src/modules/AudioPlayer/useBackgroundMusic.ts` | 全局 BGM 单例：`ensurePlaying()` 维持播放 |
| `src/modules/ConfigProvider/useGlobalConfig.ts` | 全局配置拉取：`fetchConfig()` |

## 页面结构

- 无页头：主界面不使用 `modules/ViewsManager/OAPageHeader.vue`。
- 页面本身透明，底色由 App 外壳 `.oa-shell__bg.is-home` 承载，右上角设置按钮由 Shell 常驻。
- 主体双列网格（`.oa-home__grid`，最大宽 1040px）：
  - 左侧模式卡叠放区（`.oa-home__modes`）：由 `HOME_MENU.modes` 驱动的编辑模式与阅读模式卡片，叠在同一网格（`grid-area: 1 / 1`）。
  - 右侧功能卡区（`.oa-home__side`）：上排双列功能卡（`HOME_MENU.features`，3D场景与资源管理），下排通栏宽卡（`HOME_MENU.more`，更多功能）。

## 关键实现

### `handleModeClick(index)`

1. 作用：切换左侧当前置顶的模式卡。
2. 输入输出：`index: number`（模式卡索引，0 为编辑模式，1 为阅读模式）；无返回值。
3. 注意事项：未置顶卡向右偏移 `--peek` 并在插画上微倾斜 1.2deg，点击露出侧边切换；分层由 CSS `z-index` 控制（激活卡 2，非激活卡 1），严禁为压在底层的卡设置 `pointer-events: none`。见 [NeedNotice](../NeedNotice.md) 条目 32。

### `openEntry(route?)`

1. 作用：导航进入子页面入口。
2. 输入输出：`route?: string`（`ROUTE_NAMES` 常量值，缺省表示未接路由占位）；无返回值。
3. 注意事项：带 `isLeaving` 幂等守卫；先置 `isLeaving = true` 触发卡片整体向上收缩飞出动画，等待 `SHELL_TIMING.cardsExitWait`（320ms）后再执行 `router.push({ name: route })`。未配置 `route` 的卡片（`.is-placeholder`）不触发跳转。见 [NeedNotice](../NeedNotice.md) 条目 33。

### `enterDelay(step)`

1. 作用：计算各卡片的入场动画错峰延迟时间。
2. 输入输出：`step: number`；返回 `${SHELL_TIMING.cardsEnterBase + step}ms`。
3. 注意事项：基准延时 `SHELL_TIMING.cardsEnterBase` 为 120ms。模式卡 step 为 `index * 110`（120ms、230ms），功能卡为 `220 + index * 90`（340ms、430ms），宽卡为 `400`（520ms）。`--enter-delay` 必须仅作用于 `animation-delay`，严禁写成 `transition-delay`。见 [NeedNotice](../NeedNotice.md) 条目 31。

### `resumeBgmOnce()`

1. 作用：从直链访问或刷新进入 `/home` 时维持背景音乐播放。
2. 输入输出：无参；无返回值。
3. 注意事项：先调用 `ensurePlaying()`，若因缺失用户激活手势被拦截，则监听窗口一次性 `pointerdown` 事件补全激活后恢复播放。

## 交互与状态

- **卡片入场（`isEntering`）**：挂载时置 true，卡槽跑 `oa-slot-in 780ms cubic-bezier(0.16, 1, 0.3, 1) backwards`，从下方 58px 飞入并放大至基准；1500ms 定时器触发后撤除 class，防止后续切换受干扰。
- **模式卡叠放切换**：置顶卡 `--peek-x: 0px; --peek-s: 1; z-index: 2`；未置顶卡 `--peek-x: var(--peek); --peek-s: 0.98; z-index: 1`，覆一层 34% 白纱。插画在 `0.62s cubic-bezier(0.34, 1.32, 0.44, 1)` 缓动下过冲换位。
- **离场动画（`isLeaving`）**：卡槽跑 `oa-slot-out 260ms cubic-bezier(0.4, 0, 0.8, 0.24) forwards`，向上收缩 46px 并缩小淡出，错峰延迟压缩为 `calc(var(--enter-delay) * 0.2)`，320ms 后路由跳转。

## 注意事项

- 叠卡位移与进退场动画必须挂在 `.oa-slot`，严禁挂在 `.oa-card`，否则 transform 会被子元素覆盖破坏，见 [NeedNotice](../NeedNotice.md) 条目 29。
- `--peek-s` 与 `--peek-x` 必须写进 `oa-slot-in` / `oa-slot-out` 关键帧的首尾帧，否则动画结束撤除 class 时被压住的卡会发生跳变，见 [NeedNotice](../NeedNotice.md) 条目 30。
- `--enter-delay` 仅用于 `animation-delay`，绝不能写在 `.oa-slot` 的 `transition-delay` 上，否则会导致后续叠卡切换产生迟滞，见 [NeedNotice](../NeedNotice.md) 条目 31。
- 被压住的底层模式卡不能设 `pointer-events: none` 也不能提升 `z-index`，层级依赖自然层叠，见 [NeedNotice](../NeedNotice.md) 条目 32。
- 离场先播放 `oa-slot-out` 并在定时器等待 `SHELL_TIMING.cardsExitWait`（320ms）后再 `router.push`，避免动画被立即切断，见 [NeedNotice](../NeedNotice.md) 条目 33。
- `.oa-slot` 常驻 `transform: translateZ(0)` 与 `-webkit-font-smoothing: antialiased` 独立合成层，防止动画移除时图层重绘和字体闪烁，见 [NeedNotice](../NeedNotice.md) 条目 34。

## 相关文档

- [Shell](../modules/Shell.md)
- [ViewsManager](../modules/ViewsManager.md)
- [ToolsView](./ToolsView.md)
- [NeedNotice](../NeedNotice.md)

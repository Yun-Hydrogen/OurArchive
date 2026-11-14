# ToolsView — 工具导航页：更多功能与扩展工具卡片列表

> 路由：`/tools`
> 源码：`src/views/ToolsView.vue`、`src/views/tools.ts`、`src/views/OAToolArt.vue`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/ToolsView.vue` | 工具页组件：统一页头、工具卡片自适应网格、定向离场动效 |
| `src/views/tools.ts` | `TOOL_ENTRIES`：工具列表配置（id、title、subtitle、art、route） |
| `src/views/OAToolArt.vue` | 内联 SVG 插画组件，按 variant 选图 |
| `src/modules/ViewsManager/OAPageHeader.vue` | 统一通用页头：标题、副标题、返回主界面按钮 |
| `src/modules/ViewsManager/routes.ts` | `ROUTE_NAMES`：工具路由（`tools` / `skeletonPreview` / `home`） |
| `src/modules/Shell/shellTiming.ts` | `SHELL_TIMING`：卡片离场时长与等待延时常量 |

## 页面结构

- 使用统一页头：挂载 `modules/ViewsManager/OAPageHeader.vue`，属性 `title="更多功能"`、`subtitle="更多辅助剧情写作/播放的使用工具"`、`back-label="主界面"`，监听 `@back="backHome"`。
- 页面本身透明，复用 App 外壳的底色、气泡与停靠 banner。
- 主体为工具卡片网格（`.oa-tools__grid`，最大宽 1080px）：
  - 采用 `grid-template-columns: repeat(auto-fill, minmax(268px, 1fr))` 自适应排布。
  - 数据由 `TOOL_ENTRIES` 数组驱动，每个条目渲染为一个 `.oa-slot` 包裹的 `.oa-tool-card` 按钮。
  - 卡片内部自上而下包含插画容器（`.oa-tool-card__frame`，内嵌 `<OAToolArt>`）、标题与单行省略副标题。

## 关键实现

### `openTool(tool)`

1. 作用：点击工具卡深入进入具体工具子页面（如立绘骨骼预览）。
2. 输入输出：`tool: ToolEntry`；无返回值。
3. 注意事项：调用 `leaveTo({ name: tool.route }, '-46px')`，令卡片离场动画向上收起（`-46px`），模拟层级深入的视觉效果。

### `backHome()`

1. 作用：点击页头返回按钮返回主界面。
2. 输入输出：无参；无返回值。
3. 注意事项：调用 `leaveTo({ name: ROUTE_NAMES.home }, '52px')`，令卡片离场动画向下坠落（`52px`），与主界面卡片从下方飞入的动线反向衔接。

### `leaveTo(target, offset)`

1. 作用：统一处理带有方向感的卡片离场跳转。
2. 输入输出：`target: { name: string }`，`offset: string`（CSS 长度，如 `'-46px'` 或 `'52px'`）；无返回值。
3. 注意事项：带 `isLeaving` 幂等守卫；动态设置 CSS 变量 `--exit-y: offset` 并激活 `isLeaving = true`；通过 `setTimeout` 等待 `SHELL_TIMING.cardsExitWait`（320ms）后调用 `router.push(target)`。见 [NeedNotice](../NeedNotice.md) 条目 33。

### `cardDelay(step)`

1. 作用：计算工具卡片的入场错峰延迟。
2. 输入输出：`step: number`（卡片索引 index）；返回 `${60 + step * 90}ms`。
3. 注意事项：采用与主界面一致的递增步长（90ms），确保跨页面过渡节奏统一。

## 交互与状态

- **卡片入场（`isEntering`）**：挂载时激活，`.oa-slot` 运行 `oa-card-in 720ms cubic-bezier(0.16, 1, 0.3, 1) backwards`，自下方 52px 飞入并放大；900ms 后定时器清除 class。
- **定向离场（`isLeaving`）**：`.oa-slot` 运行 `oa-card-out var(--cards-exit, 260ms) forwards`，错峰延迟按 `calc(var(--enter-delay) * 0.3)` 压缩。
  - 进入内层（深入）：`--exit-y: -46px`，卡片向上平移缩小。
  - 返回主页（上层）：`--exit-y: 52px`，卡片向下平移缩小。
- **悬浮反馈**：`.oa-tool-card` 在 hover 时伴有 `translateY(-2px)` 上浮与投影加深（`0 16px 32px rgba(...)`），提供微互动。

## 注意事项

- 页头必须使用通用组件 `OAPageHeader`，自带向右让位 `padding-right` 给常驻设置按钮，禁止在此页面额外重写页头。
- 进退场动画必须挂在 `.oa-slot` 层，保证卡片内部的 hover 浮动与 focus 环不被动画 `transform` 冲刷覆盖，见 [NeedNotice](../NeedNotice.md) 条目 29。
- 离场跳转必须等待 `SHELL_TIMING.cardsExitWait`（320ms）动画播完后再调用 `router.push`，严禁直接跳转，见 [NeedNotice](../NeedNotice.md) 条目 33。
- 组件卸载时（`onBeforeUnmount`）必须清理 `enterTimer` 和 `leaveTimer`，防止快速切换导致未决定时器触发内存泄漏或幽灵跳转。
- 新增工具卡片应仅在 `src/views/tools.ts` 中注册 `ToolEntry` 并在 `router.ts` 中登记路由，不要直接修改页面模板。

## 相关文档

- [Shell](../modules/Shell.md)
- [ViewsManager](../modules/ViewsManager.md)
- [HomeView](./HomeView.md)
- [NeedNotice](../NeedNotice.md)

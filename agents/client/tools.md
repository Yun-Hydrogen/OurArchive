# 工具页

覆盖：[views/ToolsView.vue](../../packages/client/src/views/ToolsView.vue)、[components/tools/OAToolArt.vue](../../packages/client/src/components/tools/OAToolArt.vue)、[config/tools.ts](../../packages/client/src/config/tools.ts)

主界面「更多功能」→ `/tools` 的工具列表。页面只负责列出工具卡并跳转，具体工具见 [skeleton-preview.md](./skeleton-preview.md)。

## 路由与外壳

| 路由名 | 路径 | 组件 |
| --- | --- | --- |
| `tools` | `/tools` | `ToolsView.vue` |

入口闸门见 [app-shell.md](./app-shell.md#入口闸门)。`App.vue` 只把路由同步到 `splash` / `home` 两个阶段，`tools` 不匹配任何分支，所以 `stage` 保持不变：底色仍是浅蓝、banner 仍停靠在左下角、气泡与 `main_bgm` 延续。

## TOOL_ENTRIES

`config/tools.ts` 是唯一数据源：

```ts
interface ToolEntry {
  id: string;        // 唯一标识，同时作为插画语义
  title: string;
  subtitle: string;  // 一句话说明能做什么
  art: ToolArtVariant;
  route: string;     // 目标路由名
}
```

卡片沿用主界面 `.oa-card` 的质感（白→浅蓝渐变 + 双层阴影），插画走 `OAToolArt.vue` 的内联 SVG。渐变 / pattern 的 ID 带 `variant` 前缀，同页多卡不会互相污染。

新增工具：`TOOL_ENTRIES` 追加一项 → `config/routes.ts` 登记名字与路径 → `router/index.ts` 挂组件 → 在 `OAToolArt` 的 `ART_LABELS` 与模板里补插画变体。

## 卡片进出场

两个卡片页共用一套动效语言，切换时不是硬切：

| 阶段 | 选择器 | 关键帧 |
| --- | --- | --- |
| 主页 → 工具页 | `HomeView` 的 `.oa-home.is-leaving .oa-slot` | `oa-slot-out`：向上 46px、缩到 0.96、淡出 |
| 工具页挂载 | `.oa-tools.is-entering .oa-slot` | `oa-card-in`：从下方 52px、缩到 0.95 飞入 |
| 工具页 → 内层工具 | `.oa-tools.is-leaving .oa-slot` | `oa-card-out` 向上 46px（`--exit-y`） |
| 工具页 → 主页 | 同上，`--exit-y: 52px` | 向下坠，接上主页卡片飞入的起点 |

- 离场**先播完再 `router.push`**：没有跨路由过渡容器，提前跳转会截断动画。延迟取 `SHELL_TIMING.cardsExitWait`，必须略大于「`cardsExit` + 最大错峰延迟」。
- 错峰沿用 `--enter-delay`：入场 `60 + 90n`，离场 `calc(var(--enter-delay) * 0.3)`（离场要快）。
- `isEntering` 900ms 后自动撤掉；`isLeaving` 是幂等闸门，连点只跳一次。
- 主页那一侧的离场细节见 [home.md](./home.md#离场动画去工具页)。

# Home — 主界面

`/home`，由 splash 的 TOUCH TO START 进入。**不能直接访问 `/home`**：入口闸门会在未经过 splash gate 时把它 `replace` 回 `/`，详见 [app-shell.md](./app-shell.md#入口闸门)。

| 文件 | 职责 |
| --- | --- |
| [views/HomeView.vue](../../packages/client/src/views/HomeView.vue) | 主界面结构、卡槽叠放与入场动画、全部样式 |
| [components/home/OACardArt.vue](../../packages/client/src/components/home/OACardArt.vue) | 卡片插图组件：现代软件界面的平面/扁平化矢量设计 (SVG) |
| [config/home.ts](../../packages/client/src/config/home.ts) | `HOME_MENU`（入口 id、标题与插画变体） |
| [composables/useBackgroundMusic.ts](../../packages/client/src/composables/useBackgroundMusic.ts) | 全应用单例的 `main_bgm` 播放控制 |

## 布局

本页**不画背景、不放 banner 与设置按钮**——它们都在 App 外壳上（见 [app-shell.md](./app-shell.md#应用外壳)），切页时保持不变。页内只剩一个居中容器：

- `.oa-home__content`：`flex` 居中，左右留白 `clamp(30px, 5.2vw, 108px)`、上下 `clamp(16px, 3.2vh, 44px) / clamp(24px, 4.4vh, 66px)`，网格上限 `min(1040px, 100%)`。

网格 `0.95fr : 1fr`（1536×864 下：模式卡 445、功能卡 249、宽卡 516）：

| 区域 | 内容 |
| --- | --- |
| 左列 `.oa-home__modes` | 编辑模式 / 阅读模式，两张卡叠放 |
| 右列 `.oa-home__side` | 上排 3D场景 + 资源管理（`1fr 1fr`），下排更多功能宽卡 |

背景（浅蓝渐变 + 气泡）由 App 外壳提供，见 [app-shell.md](./app-shell.md#应用外壳)。

## 卡槽 `.oa-slot`

**所有卡片的位移与入场动画都落在 `.oa-slot` 这一层，`.oa-card` 自身不带任何 hover 位移**。这样叠卡 transform 不会被覆盖，鼠标划过也不会让卡片跳动。

```
--peek: clamp(44px, 4vw, 64px)
.oa-slot--mode            grid-area: 1/1; width: calc(100% - var(--peek))
                          transform: translateX(var(--peek-x)) scale(var(--peek-s))
.is-active                z-index: 2; --peek-x: 0;     --peek-s: 1
:not(.is-active)          z-index: 1; --peek-x: peek;  --peek-s: .98
```

被压住的卡整体右移并缩小 2%，右侧露出约 46px 窄边（1536 宽）；点击该窄边即完成切换，过渡 `transform .62s cubic-bezier(.34, 1.32, .44, 1)`（轻微过冲，比线性更像卡牌翻面）。同时在 `.oa-slot--mode::after` 上盖一层 34% 白色蒙层，被压住的卡因此显得“退后一层”，切到前景时蒙层淡出。

必须注意的三点：

1. **不要给 `.oa-card` 加叠卡位移或 hover 位移**。任何 `transform` 都会覆盖叠卡的 `translateX`；卡片交互只保留 `cursor: pointer` 与 `:focus-visible` 焦点环。
2. **入场动画必须用 `animation` + `backwards` 填充**（见下节），不能用 transition，否则延迟会一并拖慢后续切换。
3. **命中区依赖 z-index 分层**。被压住的卡若加了 `pointer-events: none` 或提高 `z-index`，点击会落到前景卡上，切换失效。

点击置顶卡当前不做任何事：只有「更多功能」接了真实路由（`router.push({ name: 'tools' })` → `/tools`，见 [tools.md](./tools.md)），其余四个入口仍是占位。接入模块时在 `config/routes.ts` 增加路由，再给对应入口补跳转。

## 入场动画

从 splash 的 TOUCH TO START 进入时：

1. splash 先 `enterHome()`：外壳的 banner 收缩停靠到左下角、底色淡入浅蓝，splash 的版权文字同时向下飞出；520ms 后才 `router.push`，卡片是在 banner 快到位时才开始进入的。
2. HomeView 挂载即带 `is-entering`：`.oa-home.is-entering .oa-slot` 跑 `oa-slot-in 780ms`，`animation-fill-mode: backwards`（延迟期间保持透明、下移 58px、缩到 0.94），关键帧首尾都带 `translateX(var(--peek-x)) scale(var(--peek-s, 1) * k)`：**`--peek-s` 必须进关键帧的尾帧**，否则被压住的卡会在动画结束的瞬间从 `scale(1)` 跳回 `scale(.98)`，看起来就是「动画结束后重绘了一下」。
3. 延迟 `--enter-delay = cardsEnterBase + 步进`（`config/transition.ts`，基准 120ms）：模式卡 120 / 230ms，功能卡 340 / 430ms，宽卡 520ms。1500ms 后移除 `is-entering`。

`--enter-delay` 只写在 `animation-delay` 上，**不能写成 `.oa-slot` 的 `transition-delay`**，否则之后每次切换叠卡都会被延迟拖慢。

## 离场动画（去工具页）

点「更多功能」不直接 `router.push`：先 `isLeaving = true`，让 `.oa-home.is-leaving .oa-slot` 跑 `oa-slot-out`（`SHELL_TIMING.cardsExit`，向上 46px + 缩到 0.96 + 淡出，`forwards` 保持末帧），`animation-delay: calc(var(--enter-delay) * 0.2)` 让错峰压缩到 80ms 内；`SHELL_TIMING.cardsExitWait`（320ms）后才真正切路由。

- 离场关键帧同样要带 `translateX(var(--peek-x)) scale(var(--peek-s) * k)`，否则被压住的卡会先弹回原位再飞走。
- `isLeaving` 是幂等闸门，连点只跳一次；`onBeforeUnmount` 清掉 `leaveTimer`。
- 目标页 `ToolsView` 用同一套缓动与错峰重新飞入，两页串起来像同一组卡在移动；反向（工具页 → 主页）时主页的 `is-entering` 会自然接上。

## 背景音乐

`main_bgm` 由 splash 首次手势触发淡入播放，`useBackgroundMusic` 把 `HTMLAudioElement` 与播放状态放在**模块作用域**，因此：

- 路由从 `/` 切到 `/home` 不会重建音频，播放不中断、进度不重置（已实测 `currentTime` 跨路由连续递增）；
- 换页不会重新触发淡入（`fadeIn` 只在 splash 首次点击时调用一次）；
- `ensurePlaying()` 是兜底：若音频已被暂停（例如浏览器回收了播放），在首次 `pointerdown` 时恢复，不重置进度；正常从 splash 进入时它直接返回 true，不做任何事；
- 设置面板改动 `main_bgm_volume` 时，`useBackgroundMusic` 内的 `watch` 立即同步音量（淡入过程中则改写目标音量而不中断动画）。

`splash` 的标题音效仍然用 `useSplashAudio`（单次播放、不循环），两者互不影响。

## 视觉要点

- 卡片结构只有三个元素：`.oa-card__frame`（插画）+ `.oa-card__title`（标题）+ `.oa-card__subtitle`（一行说明）。没有图钉、标签、按键提示之类的装饰；副标题用 `white-space: nowrap` + `text-overflow: ellipsis`，保证永远只占一行、不把卡片撑高。
- `.oa-card`：白→浅蓝纵向渐变底、`border-radius: 10px`、一层柔和投影；**无 hover 效果**（不改 transform / 阴影 / 颜色），只有 `:focus-visible` 的焦点环。
- `.oa-card__frame`：圆角 6px、`overflow: hidden`、底色 `#eaf6ff`，靠 `flex: 1 1 auto` 撑满卡片剩余高度，因此同一行卡片高度自动对齐。
- 插图采用现代软件界面的平面/扁平化矢量设计（内联纯 SVG，零位图资源包袱）：
  - `editor`：现代故事节点图编辑器（Node Graph Editor），包含起点节点、贝塞尔曲线流、对话节点卡片与分支选项卡。
  - `reader`：现代视觉小说剧场播放器，包含 16:9 取景框角标、对白浮动框、说话人名牌、进度条与播放控制。
  - `scene3d`：现代三维空间视口与摄影机编排，包含等轴测地面网格、微缩包围盒、XYZ 三色变换手柄（Gizmo）与投影虚线。
  - `assets`：现代多轨数字资产管理器，包含分类标签、音频均衡器波形条谱、图像卡片与数据文件夹。
  - `more`：现代模块化工具仪表盘，包含精密齿轮设置、Toggle 拨动开关、插件连接与实时性能遥测图。
  - 插画基于 `viewBox="0 0 400 280"` 与 `preserveAspectRatio="xMidYMid slice"`，渐变及图案 ID 均通过 `uid` 隔离。
- 被压住的模式卡插画反向微倾 1.2°，强化“两张卡叠在一起”的视觉。
- `prefers-reduced-motion` 下关闭入场动画与叠卡过渡。

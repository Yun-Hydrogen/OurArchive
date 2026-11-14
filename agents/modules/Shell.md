# Shell — 常驻外壳：底色、气泡、banner、设置入口与全局鼠标特效

> 源码：`src/modules/Shell/`（挂载点是根组件 `src/App.vue`）

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `useAppShell.ts` | 外壳共享状态单例：`stage` / `gatePassed` / `bannerPlayToken` + 4 个动作 |
| `shellTiming.ts` | `SHELL_TIMING`：banner 停靠与卡片进退场的毫秒常量 |
| `OABannerDock.vue` | banner 停靠容器：舞台中央 ↔ 左下角；停靠态点击打开「贡献与感谢」 |
| `OABannerSvg.vue` | 内联的动画版横幅 SVG（约 34 KB），只能靠 `:key` 重挂来重播 |
| `OABubbles.vue` | 气泡背景：10 个蓝点柔光圆，`active` 控制整体淡入 |
| `OASettingsButton.vue` | 右上角设置按钮；弹窗开关 `isOpen` 就留在它内部 |
| `OASettingsModal.vue` | 设置弹窗：主界面 BGM 音量、预览音量、立绘渲染器 |
| `OAAboutModal.vue` | 「贡献与感谢」弹窗，由 banner 停靠态的点击打开 |
| `OAMouseSpark.vue` | 鼠标特效的 canvas 宿主，把 props 透传给 `useMouseSpark` |
| `useMouseSpark.ts` | 点击波纹 / 光弧 / 星芒 / 拖尾的粒子引擎 |

## 职责边界

- 做：所有跨路由存活的元素（底色、气泡、banner、设置入口、关于弹窗、鼠标特效）与驱动它们的共享状态。
- 不做：页面内容与页面级进场动画（各页面自己管）、路由表与入口闸门（在 `ViewsManager`）。
- 新页面**不要自己画背景、不要自己放 banner、不要自己放设置按钮**——它们已经常驻在 App 层，重复实现会出现两份且切页闪断。

## 关键实现

### `App.vue` 的外壳装配（消费方）

1. 结构：`.oa-shell`（flex 纵向）内含 `.oa-shell__bg`（`position: fixed; inset: 0; z-index: 0`，`::after` 承载浅蓝渐变，`.is-home` 时 `opacity: 1`）→ `<OABubbles>` → `<OABannerDock>` → `.oa-shell__settings`（`z-index: 40`，`top: clamp(14px, 2.4vh, 26px)` / `right: clamp(20px, 3vw, 42px)`）→ `.oa-shell__view`（`z-index: 10`，放 `<router-view>`）；`<OAAboutModal>` 与 `<OAMouseSpark>` 挂在外壳之外。
2. 路由 → 阶段：`watch(() => route.name, …, { immediate: true })`，进 `home` 调 `enterHome()`、回 `splash` 调 `enterSplash()`，**其它路由不改 `stage`**（banner 继续停在左下角），这就是「新页面只要不处理就自动延续外壳」的约定。
3. 注意事项：底色交叉淡入的 `620ms` 是写在 `.oa-shell__bg::after` 上的**硬编码**，与 `SHELL_TIMING.bannerMorph` 数值一致但不同源，改停靠时长时记得两处一起改。

### `useAppShell()`（模块唯一入口）

1. 作用：暴露外壳状态与动作；`stage` 只有 `'splash' | 'home'` 两个值。
2. 输入输出：无参，返回 `{ stage, isHome, gatePassed, bannerPlayToken, enterHome(), enterSplash(), markGatePassed(), playBannerAnimation() }`。三个 ref 都经 `readonlyRef()` 包装成对外只读，`isHome` 是 `stage === 'home'` 的 computed。
3. 注意事项：状态是**模块级 `ref`（单例）**，不是 `provide/inject`，也不要在组件里重新定义；`enterSplash()` 会把 `gatePassed` 一起复位为 `false`，让 banner 先藏起来、避免压在白屏上。见 NeedNotice 条目 03。

### `SHELL_TIMING`（`shellTiming.ts`）

1. 作用：外壳与卡片进退场的唯一时间源（毫秒）。
2. 内容：`bannerMorph: 620`（banner 从窗口中央缩到左下角的时长）、`bannerCrossfade: 300`、`bannerCrossfadeDelay: 340`（等缩放到位再交叉淡入）、`cardsEnterBase: 120`（跳转后卡片入场起始延迟）、`cardsExit: 260`（卡片离场动画时长）、`cardsExitWait: 320`（离场动画播完后等多久再切路由）。
3. 注意事项：`cardsExitWait` 必须略大于「`cardsExit` + 最大错峰延迟」，否则最后一张卡会被路由切换截断；主界面 / 工具页 / 资源页都引用这一份，不要各写各的。见 NeedNotice 条目 33。

### `OABannerDock`（`docked` / `visible` / `playToken`）

1. 作用：banner 在「舞台中央」与「左下角小尺寸品牌标记」之间做连续变形；停靠后变成可点击按钮（`role="button"`、`tabindex`、`aria-label`，Enter/Space 也能触发），点击 `emit('click')` → `App.vue` 打开关于弹窗。
2. 输入输出：props `docked: boolean`、`visible: boolean`（过 gate 后才显示）、`playToken: number`（递增 → 内部 `<OABannerSvg :key="playToken">` 重挂）；事件 `click`。
3. 注意事项：两个状态的 `transform` 函数结构**完全一致**（`translate(-50%,-50%) translate(x,y) scale(s)`），只换参数，否则插值退化成矩阵分解、中途会斜飘变形（见 NeedNotice 条目 05）；`updateGeometry()` 混用 `window.innerWidth/Height` 与 `documentElement.clientWidth/Height`（`left/top: 50%` 的百分比不含滚动条，`vw/vh` 含），只监听 `resize` 与 `watch(docked, { flush: 'post' })`，**没有 `ResizeObserver`**；几何常量要与 CSS 对齐：舞台 `min(46vw, 620px)`、停靠宽 `clamp(76px, 6.2vw, 104px)`、左边距 `clamp(20px, 3vw, 42px)`、下边距 `clamp(14px, 2.8vh, 30px)`；hover / active 只缩放 `1.05` / `0.97`，全程只动 `transform`（合成层）。

### `OABubbles`（`active`）

1. 作用：10 个柔光圆做漂浮背景；`active` 只切换整体 `opacity`（`transition: opacity 1.6s ease`），由 `gatePassed` 驱动——首次点击后淡入，之后跨路由一直存在。
2. 输入输出：props `active?: boolean`（默认 `true`）；无事件、无插槽。
3. 注意事项：气泡由 `BUBBLES` 常量数组 × `.oa-bubbles__bub--1` ~ `--10` 修饰类生成，每个各写一条 `width/height`（180~200px）、`top/left`、`--dur`（34~42s）、负 `--delay` 与 `opacity`（0.10~0.15），漂浮关键帧是 `oa-bubbles__bub-float`；容器固定 `filter: blur(12px)`，切 `active` 时不要动几何；`prefers-reduced-motion: reduce` 下关掉动画。

### `OASettingsButton` / `OASettingsModal`

1. 作用：右上角 44×44 的齿轮按钮，内部 `isOpen` 控制 `OASettingsModal`；弹窗里是「背景音效」（主界面 BGM 音量、预览音频/音效音量，均 0–100）与「立绘渲染」（`SPINE_RENDERER_OPTIONS` 三档 + 一条 Canvas 2D 掉帧提示）。
2. 输入输出：`OASettingsButton` 无 props；`OASettingsModal` 接受 `visible`，`emit('update:visible')` / `emit('close')`，每次打开时 `fetchConfig()` 重新拉配置。
3. 注意事项：两个页面共用同一份外壳按钮，不要在页面里再放一个；渲染器切换立即写回配置，但**下次载入立绘才生效**（提示文案已写明），不要为它去重建舞台。

### `OAAboutModal`（`visible` + `update:visible` / `close`）

1. 作用：`rizui_dialog` 形式的「贡献与感谢」弹窗，头部直接用 `OurArchiveBanner-tp-tight-svg.svg` 当图片（静态图当 `<img>` 用没问题，动画版才不行）；内容是 BASpark（MIT）与基沃托斯古书馆两条致谢。
2. 输入输出：props `visible: boolean`；事件 `update:visible`（配合 `v-model:visible`）与 `close`；内容区 `max-height: min(65vh, 480px)`，可滚动。
3. 注意事项：这里用的是静态 SVG，不要换成 `OABannerSvg`（动画版会跟着重播，体积与开销都不划算）。

### `useMouseSpark(canvasRef, options)` / `MouseSparkOptions`

1. 作用：Canvas 上的「点击冲击波 + 旋转锥形光弧 + 飞散星芒 + Catmull-Rom 拖尾」，复刻《蔚蓝档案》鼠标特效；监听 window 上的 `PointerEvent`（含触屏）。
2. 输入输出：`(canvasRef: Ref<HTMLCanvasElement | null>, options?: MouseSparkOptions)`，返回 `{ createClickEffect(x, y) }`；`MouseSparkOptions` = `color`（默认 `'45,175,255'`）、`scale`（默认 `1.3`）、`opacity`（默认 `1.0`）、`clickSpeed`（默认 `1.0`）、`trailSpeed`（默认 `1.0`）、`enableTrail`（默认 `true`）。内部还有 `FILLED_CIRCLE_CFG` / `RINGS_ANIM_CFG` / `CREATE_CLICK_CFG` 三组常量（`maxLife` 16 / 23、`segs` 10、线宽 0.4~3.3、单击 4 颗星芒）。
3. 注意事项：无活跃粒子时 `renderLoop` 只清一次画布并停掉 `requestAnimationFrame`（闲置 0% CPU）；粒子走 `wavesPool` / `sparksPool` 对象池复用；拖尾点数上限 20、相邻采样距离 > 2px 才记录、移动时 30% 概率散出微粒子；尺寸按 DPR 放大后 `ctx.setTransform(dpr, …)`；混合模式是 `'lighter'`（排版描边会叠加发光）；`onBeforeUnmount` 摘掉 5 个监听并 `cancelAnimationFrame`。

### `OAMouseSpark`

1. 作用：把 `MouseSparkOptions` 当作 props 接收（`withDefaults` 补默认值），创建一张全屏 canvas 并调 `useMouseSpark`。
2. 输入输出：props 即 `MouseSparkOptions` 的六个字段；无事件。
3. 注意事项：canvas 必须 `pointer-events: none` 且 `z-index: 99999`，否则会挡住所有页面交互；它是全站唯一实例，挂在 `App.vue` 里 `<OAAboutModal>` 之后。

## 注意事项

- 外壳元素一律 `position: fixed` + 明确层级：底色 0、气泡 0、banner 30、内容区 10、设置 40、鼠标特效 99999；调层级只能动页面自己那一层。
- `playBannerAnimation()`（自增 `bannerPlayToken`）是「重播 banner」的唯一开关，页面不要直接操作 `OABannerSvg`。
- 动画版横幅只能内联成 Vue 组件并靠 `:key` 重挂（见 NeedNotice 条目 02、03）；停靠到位后显示的是静态 SVG，交叉淡入由 `bannerCrossfade` / `bannerCrossfadeDelay` 控制。
- 鼠标特效没有「按设备降级」的开关，要关只能改 `OAMouseSpark` 的 props 默认值或注释掉实例。
- 改 `SHELL_TIMING` 后要同时检查 `App.vue` 里硬编码的 620ms 底色过渡。

## 相关文档

- [ViewsManager](../modules/ViewsManager.md)
- [SplashView](../views/SplashView.md)
- [HomeView](../views/HomeView.md)
- [ToolsView](../views/ToolsView.md)
- [NeedNotice](../NeedNotice.md)

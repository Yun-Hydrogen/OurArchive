# Splash — 启动画面

访问 `/`（不带路径）即进入。**整页只有 `SplashView.vue` 一个文件**，白屏引导、提示按钮、版权声明全部内联；子组件只有横幅 SVG、共用的气泡背景与设置按钮。

| 文件 | 职责 |
| --- | --- |
| [views/SplashView.vue](../../packages/client/src/views/SplashView.vue) | 页面结构、白屏引导、TOUCH TO START、版权声明、全部样式 |
| [components/splash/OABannerSvg.vue](../../packages/client/src/components/splash/OABannerSvg.vue) | 内联 SVG 动画（34KB 矢量资源，与页面逻辑无关，故独立） |
| [components/common/OABubbles.vue](../../packages/client/src/components/common/OABubbles.vue) | 漂浮气泡背景（挂在 App 外壳上，切页不重建） |
| [components/common/OABannerDock.vue](../../packages/client/src/components/common/OABannerDock.vue) | banner 停靠动画（舞台中央 ↔ 左下角） |
| [composables/useAppShell.ts](../../packages/client/src/composables/useAppShell.ts) | 外壳状态：stage、gatePassed、banner 重播计数 |
| [composables/useBannerSequence.ts](../../packages/client/src/composables/useBannerSequence.ts) | 阶段状态机 `idle → animating → ready` |
| [composables/useSplashAudio.ts](../../packages/client/src/composables/useSplashAudio.ts) | 一次性音效播放（标题音效专用，不循环） |
| [composables/useBackgroundMusic.ts](../../packages/client/src/composables/useBackgroundMusic.ts) | 全应用单例的 `main_bgm` 播放控制（淡入、循环、动态音量） |
| [composables/useGlobalConfig.ts](../../packages/client/src/composables/useGlobalConfig.ts) | 全局配置加载与持久化同步（/api/config） |
| [config/splash.ts](../../packages/client/src/config/splash.ts) | 时序与音量常量（banner 时长、淡入延时、BGM 淡入时长） |

## 时序

```
idle       白屏遮罩 +「点击任意位置开始」，同时预加载音效（不播放）+ 预取 HomeView chunk
  ↓ 用户点击任意位置（获得手势，解锁音频、解锁路由闸门）
animating  外壳显示气泡与 banner 并播放 banner 动画 + 标题音效 + main_bgm 2000ms 淡入 + 右上角设置按钮出现
  ↓ bannerDuration(2500ms) + promptRevealDelay(350ms)
ready      TOUCH TO START 淡入（700ms）
  ↓ 点击 TOUCH TO START（不换页、不重建背景）
leaving    · banner 由外壳收缩并平移到左下角（620ms）
           · 底色由纯白淡入浅蓝渐变（620ms）
           · 底部版权文字整块向下飞出（460ms）
           · TOUCH TO START 淡出下移（300ms）
  ↓ exitDuration(520ms) 后才 router.push('/home')
/home      卡片错峰飞入；气泡、banner、背景都在原处，没有重建
```

`handleStart()` 是首次入口，获得用户手势后：
1. `unlockApp()` 解开路由闸门（此后才允许访问 `/home` 等页面），`markGatePassed()` 让外壳显示气泡 / banner / 设置按钮；
2. 首次播放背景音乐 `main_bgm`（`/api/preload/asset/main_bgm`），在 2000ms（`SPLASH_TIMING.bgmFadeInDuration`）内从音量 0 平滑二次缓出淡入至 `main_bgm_volume` 并保持循环；
3. `playBannerAnimation()` 递增 `bannerPlayToken`，外壳重挂 banner SVG 从头播放，同时播标题音效。
`handleActivate()` 是唯一出口：`isLeaving = true` + `enterHome()`（触发 banner 停靠、底色渐变），**等 `SPLASH_TIMING.exitDuration` 再 `router.push`**，让位移动画先跑起来；背景音乐不重置也不重播。
音效 2.85s 比动画 2.5s 长 0.35s，与 `promptRevealDelay` 衔接；**更换 banner 或音效资源必须重核这两个常量**。

## 五个关键坑

1. **音频必须由真实手势触发**。浏览器自动播放策略会拒绝无手势的 `play()`，`useSplashAudio.play()` 捕获异常返回 `false`，因此首屏必须有白屏引导层先拿到点击。
2. **banner 不能用 `<img src="x.svg">`**。图片内 SVG 的动画在解码阶段就开始播（常已播完），且无法重置。`OABannerSvg.vue` 是把 SVG 内联成 Vue 组件，并把原 SVG 内部的 `<style>` 提到 SFC 顶层 `<style>`，否则 Vue 编译会丢掉 keyframes。
3. **重播靠 `:key="bannerPlayToken"` 重挂**。`useAppShell().playBannerAnimation()` 自增 token，`OABannerDock` 内的 SVG 随之卸载重挂，动画从头开始；动画版 SVG 只在外壳里存在一份，splash 只负责触发。
4. **居中不要用 `left:50% + translateX(-50%)`**。入场动画的 `transform` 会覆盖它，导致按钮偏移。改用全宽的 `.splash-screen__prompt-dock` 做 flex 居中，按钮自身只做 `translateY` 动画。
5. **提示与版权层必须脱离文档流**。`v-show` 切换若参与布局会顶动 banner，因此 prompt 与 legal 都是 `position: absolute`，并设 `pointer-events: none`，只在按钮上恢复 `auto`。
6. **入场动画用 `backwards` 而不是 `both`**。`.splash-legal` 靠 `transition` 做离场（`opacity` + `translateY(96px)`），而 `animation-fill-mode: both` 会把 `legal-fade-in` 的末帧永久锁在元素上 —— CSS 动画优先级高于 `transition`，离场就完全不动。改成 `backwards` 后动画结束即交还属性，离场过渡恢复正常。（`.splash-prompt` 没这个问题：它的离场位移写在父级 `.splash-screen__prompt-dock` 上。）

## 布局数值

| 元素 | 定位 |
| --- | --- |
| Banner | 在 App 外壳的 `OABannerDock` 里：舞台位为窗口正中、中心再上移 3vh，宽 `min(46vw, 620px)`；splash 不再自己渲染 banner |
| 设置按钮 | 在 App 外壳的 `.oa-shell__settings`：`top: clamp(14px, 2.4vh, 26px); right: clamp(20px, 3vw, 42px);`，过 gate 后常显 |
| TOUCH TO START | `.splash-screen__prompt-dock` 的 `bottom: clamp(106px, 19vh, 170px)` |
| 版权声明 | `.splash-legal` 的 `bottom: clamp(12px, 2.2vh, 24px)`，三行 9–11px 小字 |

## 视觉要点

- 页面自身透明、不画背景：底色与气泡都由 App 外壳提供（气泡是 10 个 `var(--oa-blue)` 圆，`filter: blur(12px)`，`active` 由 `gatePassed` 控制，切到主界面后同一实例继续存在）。
- TOUCH TO START：白底 + `1.5px` 深色描边 + `border-radius: 14px`，悬停反色；`letter-spacing` 配 `text-indent` 补偿保证视觉居中。
- 所有文字用 `var(--oa-font)`；`prefers-reduced-motion` 下关闭全部动画。
- 不做竖屏适配，仅保留一条 `max-width: 640px` 的尺寸收缩。

## 出口

`handleActivate()` 是 splash 的唯一出口：

```ts
function handleActivate() {
  if (isLeaving.value) return;
  isLeaving.value = true;
  enterHome();                       // 外壳：banner 停靠 + 底色渐变
  setTimeout(() => router.push({ name: ROUTE_NAMES.home }), SPLASH_TIMING.exitDuration);
}
```

**没有整页淡出、没有白色蒙层**：`.splash-screen` 的背景是透明的，白色由 App 外壳的底色层提供；离场只让页面内属于自己的内容动起来（版权文字下坠、提示按钮淡出），背景与 banner 由外壳接着演。详见 [app-shell.md](./app-shell.md#应用外壳)。

`onMounted` 会 `void import('@/views/HomeView.vue')` 预取主界面 chunk，避免点击 TOUCH TO START 时才加载造成空档。

背景音乐是模块级单例，跳转不重建音频，播放进度与音量原样带入主界面；详见 [home.md](./home.md#背景音乐)。

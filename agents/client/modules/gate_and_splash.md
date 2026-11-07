关联前端文件：
`packages/client/src/views/SplashView.vue` — 白屏引导与 TOUCH TO START（本文件模板是全宽 flex 容器 + 绝对定位的提示/版权层）
`packages/client/src/router/access.ts` — 入口闸门（内存态）
`packages/client/src/composables/useAppShell.ts` — 外壳共享状态（单例）
`packages/client/src/composables/useBannerSequence.ts` — 入场时序状态机
`packages/client/src/composables/useSplashAudio.ts` — 单次音效播放

用法：

### `handleStart()`（白屏引导首次点击）

1. 作用：拿到用户手势 → 解锁音频 / 路由闸门 / 外壳气泡 + banner，重播 banner 动画并淡入 `main_bgm`；2. 幂等：`gatePassed` 已为真时直接返回，不会重复触发；3. 目标音量取设置里的 `main_bgm_volume / 100`，淡入时长 2000ms。
2. 输入：无（事件由模板 `@click` / `@keydown` 触发）；输出：无返回值，副作用是把 `gatePassed` 置 true、`unlockApp()`、调用 `fadeInMainBgm` 与 `playBanner`。
3. 注意事项：音频必须在此处首次触发（自动播放策略）；`playBannerAnimation()` 与 `playBanner()` 是两套不同机制，不要混用。

### `playBannerAnimation()`

1. 作用：让外壳的 banner 从头重播；2. 方式：自增 `bannerPlayToken`，`OABannerDock` 内的 `OABannerSvg` 靠 `:key` 卸载重挂；3. 到达 `ready` 阶段后，`TOUCH TO START` 才出现。
2. 输入：无；输出：无（只递增 token）。
3. 注意事项：banner 始终是外壳里唯一一份，splash 不渲染自己的 banner。

### `handleActivate()`（TOUCH TO START）

1. 作用：本页唯一出口；2. 先 `enterHome()` 让 banner 开始停靠、底色渐变、版权下坠；3. 等 `SPLASH_TIMING.exitDuration`（520ms）后 `router.push` 到 `home`。
2. 输入：无；输出：无。
3. 注意事项：**没有整页淡出、没有白屏蒙层**——背景与 banner 归外壳演，页面只动自己的内容；离场位移写在父级 `.oa-splash__prompt-dock` 上，避免子元素 `animation` 覆盖父级 transform 触发重绘。

### `unlockApp()` / `isAppUnlocked()`

1. 作用：入口闸门；2. 状态只在内存里（`ref`），**不落 sessionStorage**；3. `router.beforeEach` 拦截所有非 splash 路由，未解锁即 `{ name: 'splash', replace: true }`。
2. 输入输出：`unlockApp()` 无参；`isAppUnlocked(): boolean`。
3. 注意事项：刷新 `/home`、直链、外部链接进入都会被换回 `/`；返回键从 `/home` 回即回 `/`。splash 的首次点击（拿到手势）是唯一解锁点。

### `useBannerSequence()`

1. 作用：阶段状态机 `idle → animating → ready`；2. `play()` 把 phase 置 `animating`，`bannerDuration + promptRevealDelay` 后置 `ready`；3. `isIdle` 控制白屏引导层，`isReady` 控制 TOUCH TO START 出现。
2. 返回：`phase`（只读）、`isIdle` / `isAnimating` / `isReady`（computed）、`play()`。
3. 注意事项：`playToken` 已由外壳的 `bannerPlayToken` 接管，不要再拿时序里的 token 做 `:key`；卸载时要清定时器（见 `onBeforeUnmount`）。

### `useSplashAudio(src, options)`

1. 作用：一次性音效（标题音），不循环；2. 从头播放、被自动播放拦截时返回 `false` 并置 `needsGesture`；3. `fadeIn()` 用二次缓动（`ease = 1-(1-p)^2`）做音量渐入。
2. 输入：`src: string`，`options` 有 `volume`（0–1，默认 `SPLASH_SOUND_VOLUME = 0.75`）、`loop`（默认 false）；返回 `{ isPlaying, needsGesture, isReady, preload, play, fadeIn, stop, setVolume, dispose }`。
3. 注意事项：`preload()` 只预载不播放；更换音效资源后记得同步 `SPLASH_TIMING`（见下方）。

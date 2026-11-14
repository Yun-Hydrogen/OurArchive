# SplashView — 启动页：白屏手势引导、标题音效与 BGM 淡入、TOUCH TO START 入口

> 路由：`/`
> 源码：`src/views/SplashView.vue`、`src/views/splashTiming.ts`、`src/views/useBannerSequence.ts`、`src/views/useSplashAudio.ts`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/SplashView.vue` | 启动页：白屏引导遮罩、TOUCH TO START 悬浮按钮、底部法律声明 |
| `src/views/splashTiming.ts` | `SPLASH_TIMING` 与 `SPLASH_SOUND_VOLUME`：启动时序与音量常量 |
| `src/views/useBannerSequence.ts` | 横幅入场阶段状态机（`idle` → `animating` → `ready`） |
| `src/views/useSplashAudio.ts` | 标题单次音效加载、自动播放拦截捕获与淡入播放器 |
| `src/modules/ViewsManager/access.ts` | 内存入口闸门：`unlockApp()` |
| `src/modules/ViewsManager/routes.ts` | `ROUTE_NAMES.home` 目标路由名 |
| `src/modules/Shell/useAppShell.ts` | 外壳状态机：`gatePassed`、`enterHome()`、`markGatePassed()`、`playBannerAnimation()` |
| `src/modules/AudioPlayer/useBackgroundMusic.ts` | 全局背景音乐淡入播放控制 |

## 页面结构

- 无页头：启动流程不使用 `modules/ViewsManager/OAPageHeader.vue`。
- 页面全宽透明 flex 容器，底色与横幅由 `Shell` 外壳常驻承载。
- 内部三层绝对定位结构：
  - 白屏引导遮罩（`.oa-splash__gate`）：`v-if="isIdle"`，全屏白底 `#ffffff` 配合 `gate-pulse` 脉冲文字，捕获首次点击/键盘手势。
  - 悬浮启动按钮（`.oa-splash__prompt-dock`）：`v-show="isReady"`，全宽 flex 居中容器包裹 `.oa-splash__prompt`（`TOUCH TO START`），下距底部 `clamp(106px, 19vh, 170px)`。
  - 底部版权与声明（`.oa-splash__legal`）：`v-show="gatePassed"`，非官方同人与 AGPLv3 声明文本，离场时向下飞出。

## 关键实现

### `handleStart()`

1. 作用：白屏引导点击响应。获取合法用户手势，解锁外壳与音频系统，重播横幅动画并淡入背景音乐。
2. 输入输出：无入参；无返回值。内部置 `markGatePassed()`、`playBannerAnimation()`、`unlockApp()`，以 `SPLASH_TIMING.bgmFadeInDuration`（2000ms）淡入 `main_bgm`，并 `await playSound()`。
3. 注意事项：幂等守卫（`gatePassed.value` 为真直接 return）。浏览器要求音效与 BGM 必须在用户手势回调内触发。见 [NeedNotice](../NeedNotice.md) 条目 01、06。

### `handleActivate()`

1. 作用：`TOUCH TO START` 点击响应，启动退场动画并切入主界面。
2. 输入输出：无入参；无返回值。
3. 注意事项：置 `isLeaving = true` 防连击；先调用 `enterHome()` 驱动横幅停靠与底色渐变，等待 `SPLASH_TIMING.exitDuration`（520ms）后执行 `router.push({ name: ROUTE_NAMES.home })`，避免页与页之间硬切。

### `useBannerSequence()`

1. 作用：启动页三阶段时序状态机（`idle` → `animating` → `ready`）。
2. 输入输出：无入参；返回 `{ phase, playToken, isIdle, isAnimating, isReady, play }`。
3. 注意事项：调用 `play()` 启动定时器，等待 `SPLASH_TIMING.bannerDuration`（2500ms）+ `promptRevealDelay`（350ms）后进入 `ready` 状态；组件卸载时在 `onBeforeUnmount` 清除定时器。

### `useSplashAudio(src, options)`

1. 作用：管理单次标题音效加载、自动播放拦截捕获与二次曲线平滑淡入。
2. 输入输出：入参 `src: string`，`options?: { volume?: number, loop?: boolean }`；返回 `{ isPlaying, needsGesture, isReady, preload, play, fadeIn, stop, setVolume, dispose }`。
3. 注意事项：`preload()` 在 `onMounted` 预加载音效资源；`play()` 遇浏览器拦截捕获异常并标记 `needsGesture = true`，不中断程序流程。

## 交互与状态

- **白屏引导阶段（`isIdle`）**：捕获点击或 Enter/Space 键，淡出遮罩（`oa-gate-fade` 0.6s），进入 `animating`。
- **横幅展示阶段（`isAnimating`）**：横幅动画播放约 2.5s，此阶段隐藏 `TOUCH TO START`。
- **就绪阶段（`isReady`）**：`TOUCH TO START` 以 `oa-splash__prompt-in var(--fade-in, 700ms)` 淡入并微移上浮。
- **离场阶段（`isLeaving`）**：版权区向下平移 96px 并淡出（`cubic-bezier(0.4, 0, 1, 1)` 460ms），按钮容器下浮 18px 淡出，延迟 520ms 后跳 `/home`。
- **预加载优化**：`onMounted` 中主动 `void import('@/views/HomeView.vue')` 提前拉取主页 chunk。

## 注意事项

- 浏览器自动播放限制：音频与 BGM 必须由用户真实手势在 `handleStart()` 中解锁，见 [NeedNotice](../NeedNotice.md) 条目 01。
- 横幅重播靠外壳 `bannerPlayToken` 重挂 `<OABannerSvg :key="bannerPlayToken">`，启动页自身不渲染 banner，见 [NeedNotice](../NeedNotice.md) 条目 02、03。
- 版权声明 `.oa-splash__legal` 的入场动画必须使用 `animation-fill-mode: backwards`，绝不能用 `both`，否则末帧样式锁定会导致离场 `transition` 的 `translateY(96px)` 完全失效，见 [NeedNotice](../NeedNotice.md) 条目 04。
- `TOUCH TO START` 离场位移挂在父级 `.oa-splash__prompt-dock` 上，防止子元素按钮关键帧覆盖父级 transform。
- 路由闸门状态 `isUnlocked` 纯内存存储、不落持久化，刷新重置到 `/`，跳转必须用 `replace`，见 [NeedNotice](../NeedNotice.md) 条目 06。

## 相关文档

- [Shell](../modules/Shell.md)
- [ViewsManager](../modules/ViewsManager.md)
- [HomeView](./HomeView.md)
- [NeedNotice](../NeedNotice.md)

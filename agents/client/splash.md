# Splash — 启动画面

访问 `/`（不带路径）即进入。**整页只有 `SplashView.vue` 一个文件**，白屏引导、气泡、提示按钮、版权声明全部内联；唯一子组件是横幅 SVG。

| 文件 | 职责 |
| --- | --- |
| [views/SplashView.vue](../../packages/client/src/views/SplashView.vue) | 页面结构、白屏引导、气泡、TOUCH TO START、版权声明、设置入口、全部样式 |
| [components/splash/OABannerSvg.vue](../../packages/client/src/components/splash/OABannerSvg.vue) | 内联 SVG 动画（34KB 矢量资源，与页面逻辑无关，故独立） |
| [components/common/OASettingsModal.vue](../../packages/client/src/components/common/OASettingsModal.vue) | 基于 RizUI 的全局设置弹窗（包含背景音效卡片与主界面 BGM 音量滑块） |
| [composables/useBannerSequence.ts](../../packages/client/src/composables/useBannerSequence.ts) | 阶段状态机 `idle → animating → ready` |
| [composables/useSplashAudio.ts](../../packages/client/src/composables/useSplashAudio.ts) | 音效与背景音乐播放控制（含二次缓出淡入与动态音量调节） |
| [composables/useGlobalConfig.ts](../../packages/client/src/composables/useGlobalConfig.ts) | 全局配置加载与持久化同步（/api/config） |
| [config/splash.ts](../../packages/client/src/config/splash.ts) | 时序与音量常量（banner 时长、淡入延时、BGM 淡入时长） |

## 时序

```
idle       白屏遮罩 +「点击任意位置开始」，同时预加载音效（不播放）
  ↓ 用户点击任意位置（获得手势，解锁音频）
animating  播放标题音效 + 循环播放 preload main_bgm + 挂载 banner 播放 SVG 动画 + 气泡淡入 + 露出右上角设置按钮
  ↓ bannerDuration(2500ms) + promptRevealDelay(350ms)
ready      TOUCH TO START 淡入（700ms）
  ↓ 点击 TOUCH TO START
animating  重播动画与音效（main_bgm 保持循环）
```

`handleStart()` 是首次入口，获得用户手势后：
1. 首次播放背景音乐 `main_bgm`（`/api/preload/asset/main_bgm`），在 2000ms（`SPLASH_TIMING.bgmFadeInDuration`）内从音量 0 平滑二次缓出淡入至目标音量并保持循环；
2. 触发 `startSequence()` 播放横幅动画与标题音效；
3. 淡入右上角设置按钮（SVG）。
`handleActivate()` 是重播入口，两者都走 `startSequence()`。
音效 2.85s 比动画 2.5s 长 0.35s，与 `promptRevealDelay` 衔接；**更换 banner 或音效资源必须重核这两个常量**。

## 五个关键坑

1. **音频必须由真实手势触发**。浏览器自动播放策略会拒绝无手势的 `play()`，`useSplashAudio.play()` 捕获异常返回 `false`，因此首屏必须有白屏引导层先拿到点击。
2. **banner 不能用 `<img src="x.svg">`**。图片内 SVG 的动画在解码阶段就开始播（常已播完），且无法重置。`OABannerSvg.vue` 是把 SVG 内联成 Vue 组件，并把原 SVG 内部的 `<style>` 提到 SFC 顶层 `<style>`，否则 Vue 编译会丢掉 keyframes。
3. **重播靠 `:key="playToken"` 重挂**。`useBannerSequence.play()` 自增 `playToken`，Vue 卸载旧节点、插入新节点，SVG 动画从头开始。
4. **居中不要用 `left:50% + translateX(-50%)`**。入场动画的 `transform` 会覆盖它，导致按钮偏移。改用全宽的 `.splash-screen__prompt-dock` 做 flex 居中，按钮自身只做 `translateY` 动画。
5. **提示与版权层必须脱离文档流**。`v-show` 切换若参与布局会顶动 banner，因此 prompt 与 legal 都是 `position: absolute`，并设 `pointer-events: none`，只在按钮上恢复 `auto`。

## 布局数值

| 元素 | 定位 |
| --- | --- |
| Banner | `.splash-screen__center` 双向居中，`padding-bottom: calc(32px + 9vh)` 整体上移；宽 `min(46vw, 620px)`，小于 640px 时 `min(76vw, 420px)` |
| 设置按钮 | `.splash-settings-btn` 位于右上角 `top: clamp(16px, 3vh, 28px); right: clamp(16px, 3vw, 32px);`，`44x44px` 圆角按钮 |
| TOUCH TO START | `.splash-screen__prompt-dock` 的 `bottom: clamp(106px, 19vh, 170px)` |
| 版权声明 | `.splash-legal` 的 `bottom: clamp(12px, 2.2vh, 24px)`，三行 9–11px 小字 |

## 视觉要点

- 背景纯白；气泡为 10 个 `var(--oa-blue)` 圆，`filter: blur(12px)`，各自尺寸 / 位置 / 周期在 `.b1`–`.b10` 定义。
- TOUCH TO START：白底 + `1.5px` 深色描边 + `border-radius: 14px`，悬停反色；`letter-spacing` 配 `text-indent` 补偿保证视觉居中。
- 所有文字用 `var(--oa-font)`；`prefers-reduced-motion` 下关闭全部动画。
- 不做竖屏适配，仅保留一条 `max-width: 640px` 的尺寸收缩。

## 接入主流程

`handleActivate()` 是 splash 的唯一出口：

```ts
function handleActivate() {
  router.push({ name: ROUTE_NAMES.home });  // 新页面按 app-shell.md 注册
}
```

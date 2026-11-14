# AudioPlayer — 背景音乐单例生命周期、平滑淡入淡出与独占让位

> 源码：`src/modules/AudioPlayer/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `useBackgroundMusic.ts` | 主界面背景音乐（BGM）播放器 Composable，全应用常驻单例，控制淡入、循环、动态音量与独占让位 |

## 职责边界

- 做：管理全站全局唯一的背景音乐（资源标识 `main_bgm`，端点 `/api/preload/asset/main_bgm`）生命周期，提供缓动音量渐变（淡入、淡出、让位暂停与恢复）及与 `ConfigProvider` 的音量联动。
- 不做：资源包内部的音乐与音效预览（由具体视图组件或预览器独立负责）、非背景音乐类音频解码。

## 关键实现

### `useBackgroundMusic()`（`useBackgroundMusic.ts`）

1. 作用：模块级单例。音频元素 `element: HTMLAudioElement` 与播放状态定义在模块顶层作用域，页面路由切换或组件卸载不会打断音乐播放。
2. 输入输出：返回 `{ isPlaying, volume, preload, play, ensurePlaying, fadeIn, stop, setVolume, suspend, resume }`，其中 `isPlaying` 与 `volume` 为只读 ref。
3. 播放地址与初始化：音频源固定指向预加载资源 `/api/preload/asset/main_bgm`；元素初始化配置 `loop = true`、`preload = 'auto'`。
4. 注意事项：首次播放受现代浏览器 Autoplay 策略约束，必须由真实用户手势触发（如 `SplashView` 的白屏引导层点击事件中调用，见 [NeedNotice](../NeedNotice.md) 条目 01）。

### `fadeIn(targetVolume, durationMs = 2000)`

1. 作用：从 0 开始以二次缓出曲线（`ease = 1 - (1 - progress)^2`）平滑过渡到目标音量并循环播放。
2. 输入输出：`fadeIn(targetVolume = volume.value, durationMs = 2000): Promise<boolean>`；返回 `false` 表示被浏览器自动播放策略拦截。
3. 动画与响应细节：
   - 内部由 `requestAnimationFrame` 循环推进，优先清除旧的渐变帧（`cancelFade()`）。
   - 淡入过渡期间若用户调整了音量，动画不会中断，而是直接实时改写目标值 `fade.to`。
   - 动画执行完毕后，先清理 `fade = null`，再执行 `onDone` 回调，保证回调内可安全排定下一次音频动作。

### `ensurePlaying()` / `play()` / `stop()`

1. 作用：全站不同场景下的播放状态控制。
   - `ensurePlaying()`：仅在音频处于暂停状态时恢复播放，**不重置进度**，主要用于跨页面恢复或刷新后由后续手势激活。
   - `play()`：重置 `currentTime = 0` 从头完整播放。
   - `stop()`：暂停播放并将 `currentTime` 复位回开头。
2. 注意事项：`ensurePlaying()` 与 `play()` 均会在触发播放前主动将 `audio.volume` 复位为当前 `volume.value`，防止上一次淡出将音量留在 0 导致静音播放。

### `suspend(durationMs = 480)` / `resume(durationMs = 620)`（独占让位机制）

1. 作用：当资源包详情页触发曲目试听或音频预览时，让背景音乐平滑淡出并暂停；试听结束时淡入恢复。
2. 输入输出：`suspend(durationMs = 480): boolean`（返回是否真正开始淡出）；`resume(durationMs = 620): Promise<boolean>`。
3. 状态维护与恢复规则：
   - `suspend` 内部采用延迟暂停：音量使用 `startFade` 降为 0 后才在 `onDone` 回调中真正调用 `element.pause()`，杜绝声音硬切跳变。
   - 内部由模块级 `suspended` 标志与 `suspendedAt` 记录暂停时刻的播放进度。
   - 若在淡出执行途中用户就触发了 `resume()`（`!audio.paused`），则立即中止淡出并以当前瞬时音量直接平滑淡入回目标音量。
   - 若背景音乐在被挂起期间进度发生外部变动超过 0.25 秒，`resume` 恢复时自动重置回 `suspendedAt` 原进度点。
   - 处于 `suspend` 期间若外部触发 `setVolume`，仅记录目标音量，等待 `resume` 时再平滑淡入至该目标音量。

### `setVolume(next)` 与配置联动

1. 作用：动态设定背景音乐目标音量（0–1），并与 `useGlobalConfig` 的 `config.main_bgm_volume` 保持 `watch` 响应式联动。
2. 输入输出：`(next: number): void`。
3. 边界抑制：
   - 当处于 `suspend` 挂起状态时，只改写内部 `volume.value`，不直接写到 DOM 元素。
   - 正在执行「淡出到 0 后暂停」动作时，直接忽略赋值，避免音量滑块拖动引起音频淡出途中回弹。
   - 正在执行淡入过程中拖动滑块，只改写渐变终点目标（`fade.to = clamped`），保留原有进度和回调。

## 注意事项

- `ensurePlaying()` 与 `play()` 均会在触发播放前主动将 `audio.volume` 复位为当前 `volume.value`，防止上一次淡出将音量留在 0 导致静音播放。
- 背景音乐元素固定设置 `loop = true` 和 `preload = 'auto'`。
- 组件必须从该 Composable 统一调整背景音乐，严禁直接新建 `new Audio()` 来播放 `main_bgm`。

## 相关文档

- [ConfigProvider](./ConfigProvider.md)
- [API](./API.md)
- [NeedNotice](../NeedNotice.md)

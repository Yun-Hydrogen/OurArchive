关联前端文件：
`packages/client/src/composables/useBackgroundMusic.ts` — 全应用单例的 `main_bgm` 播放控制（淡入、循环、动态音量、让位）
`packages/client/src/composables/useGlobalConfig.ts` — 全局配置（`/api/config` 同步 + 防抖写回）
`packages/client/src/api/request.ts` — `apiGet` / `apiPut` / `ApiError` / `apiErrorMessage`
`packages/client/src/api/config.ts` — `fetchGlobalConfig` / `saveGlobalConfig`
`packages/client/src/api/packages.ts` — 资源包相关接口（另见 `package.md`）
`packages/client/src/components/common/OASettingsModal.vue` — 设置弹窗
`packages/client/src/components/common/OASettingsButton.vue` — 右上角设置按钮
`packages/client/src/components/common/OAAboutModal.vue` — 关于弹窗

用法：

### `suspend(durationMs = 480)` / `resume(durationMs = 620)`

1. 作用：淡出并暂停背景音乐（保留进度），供资源包试听之类的场景调用；`resume` 淡入恢复；2. `suspend` 只有淡出**真正结束**才 `pause()`，`onDone` 回调里再检查一次 `suspended`，所以「淡出途中就恢复」不会误暂停；3. 内部用模块级 `suspended` 标记 + `suspendedAt` 记住进度，幂等，重复调用不叠加。
2. 输入：时长（毫秒）；输出：`boolean`（是否真的发生了淡出 / 恢复）。
3. 注意事项：恢复时只在 `currentTime` 被外部改动超过 0.25s 时才写回 `suspendedAt`；被压住期间 `setVolume` 只更新目标音量，留待 `resume` 淡入到该值。

### `fadeIn(targetVolume, durationMs = 2000)`

1. 作用：从 0 二次缓出淡入到目标音量并保持循环播放；淡入期间改音量只改写目标，不中断动画。
2. 输入：`targetVolume`（0–1，默认当前 `volume`）、`durationMs`；输出：`Promise<boolean>`（false 表示被自动播放拦截）。
3. 注意事项：只有 splash 的首次手势时调用一次，换页不会重播；后续可用 `ensurePlaying()` 兜底恢复。

### `ensurePlaying()` / `play()` / `stop()`

1. 作用：`ensurePlaying` 只在Paused 时恢复播放、**不重置进度**（跨页面 / 刷新后恢复用）；`play` 从头播放；`stop` 暂停并回到开头。
2. 输出：`Promise<boolean>`。
3. 注意事项：两者都会把 `element.volume` 复位成 `volume.value`（防止上一次淡出把音量留在 0）。

### `setVolume(next)`

1. 作用：改目标音量；2. 被试听压住时只记目标；正在「淡出到 0 后暂停」时会被忽略（否则拖音量条会把淡出目标改回有声）；淡入过程中只改目标、保留进度与回调。
2. 输入：`next: number`（0–1）。
3. 注意事项：设置面板改 `main_bgm_volume` 时，本模块内的 `watch` 立即同步进来，不要在视图里另外写一份。

### `fetchConfig()`（`useGlobalConfig`）

1. 作用：从 `/api/config` 拉取全局配置并做校验（音量钳制 0–100、渲染器模式归一）；2. 失败时保留 `CONFIG_DEFAULTS` 并 `console.warn`，不抛错；3. `isLoaded` 表示是否拉到过一次。
2. 输入：无；输出：`Promise<GlobalConfig>`。
3. 注意事项：`config` 只读暴露，写回走 `setMainBgmVolume` / `setPreviewVolume` / `setSpineRenderer`（内部防抖 300ms 合并请求）。

### `saveGlobalConfig(patch)`（`api/config.ts`）

1. 作用：PUT `/api/config`；提交 `{ ...config.value }` 即全量补丁。
2. 输入：`Record<string, unknown>`；输出：`Promise<GlobalConfigPayload>`（含 `config`）。
3. 注意事项：字段名即 `global_config.yml` 的键（snake_case）；服务端对音量钳制、非法渲染器模式回退 `stable`。

### `apiGet<T>(url)` / `apiPut<T>(url, body)`（`api/request.ts`）

1. 作用：所有前端 JSON 请求走这里，统一校验 `success`；2. 成功体 `{ success: true, ... }` 返回 payload 本身，失败体 `{ success: false, error }` 抛 `ApiError`（带 `status`）；3. 非 JSON 响应直接按 HTTP 状态抛错。
2. 输入：`url`、可选 `body`；输出：`Promise<T>`（`T` 由调用方按响应形状声明）。
3. 注意事项：**文件流（图片 / 音频）不走这里**，用 `<img>` / `<audio>` 或 `fetch().blob()`；错误文案统一用 `apiErrorMessage(error, fallback)`。

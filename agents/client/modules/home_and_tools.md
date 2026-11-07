关联前端文件：
`packages/client/src/views/HomeView.vue` — 主界面结构、卡槽叠放、入场/离场动画
`packages/client/src/config/home.ts` — `HOME_MENU`（入口数据驱动）
`packages/client/src/components/home/OACardArt.vue` — 卡片插画（内联 SVG，`variant` 决定画面）
`packages/client/src/composables/useBackgroundMusic.ts` — 全应用单例的 `main_bgm` 播放控制（另见 `music.md`）

用法：

### `handleModeClick(index)`

1. 作用：切换置顶的模式卡；2. 未置顶的卡整体右移 `--peek` 并缩小 2%，点击其露出的窄边触发切换；3. 切换时顶层卡右移退后、底层卡左移翻到顶层（`transform .62s cubic-bezier(.34, 1.32, .44, 1)` 带轻微过冲）。
2. 输入：`index: number`（在 `HOME_MENU.modes` 中的下标）；输出：无（改 `activeModeIndex`）。
3. 注意事项：点击靠 `z-index` 分层（`.is-active` 为 2，其余 1），**不要**给被压住的卡加 `pointer-events: none`，否则点击失效。

### `openEntry(route?)`

1. 作用：进入子页面；2. 先 `isLeaving = true` 播 `.oa-home.is-leaving .oa-slot` 的 `oa-slot-out`（向上 46px + 缩到 0.96 + 淡出，错峰按 `--enter-delay * 0.2` 压缩），`SHELL_TIMING.cardsExitWait`（320ms）后才 `router.push`；3. 无 `route` 时直接返回（占位卡不跳转）。
2. 输入：`route: string | undefined`（目标路由名）；输出：无。
3. 注意事项：`isLeaving` 是幂等闸门，连点只跳一次；卸载时清 `leaveTimer`。离场关键帧必须带 `translateX(var(--peek-x)) scale(var(--peek-s) * k)`，否则被压住的卡会先弹回原位。

### 入场动画

1. 作用：从 splash 进来时卡片错峰飞入；本页挂载即带 `is-entering`，跑 `oa-slot-in 780ms`，`fill-mode: backwards`，关键帧首尾都带 `--peek-x / --peek-s`。
2. 延迟：`--enter-delay = cardsEnterBase（120ms）+ 错峰`（模式卡 `60 + 90n`，功能卡 `220 + 90n`，宽卡 `400`）；1500ms 后移除 `is-entering`。
3. 注意事项：**只能用于 `animation-delay`，不能写成 `transition-delay`**，否则后续每次叠卡切换都被拖慢；入场用 `animation` 而不是 `transition`（见 `WARN.md` 条目 12/13）。

### `HOME_MENU`（`config/home.ts`）

1. 作用：主界面入口的唯一数据源（标题 / 副标题 / 插画 / 可选 `route`）；2. 结构：`modes`（左侧叠卡数组）、`features`（右侧上排数组）、`more`（单对象宽卡）；3. 插画变体 `HomeArtVariant` 与 `id` 同义，`OACardArt` 按 `variant` 分发。
2. 输入：构造配置；类型 `HomeMenuEntry`（`route?` 缺省即占位）。
3. 注意事项：新增入口只改这里 + 注册路由，不要改 `HomeView.vue`；编辑模式 / 阅读模式 / 3D场景 目前没有 `route`，点击无反应。

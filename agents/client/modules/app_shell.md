关联前端文件：
`packages/client/src/App.vue` — 常驻外壳（底色层、气泡、banner、设置按钮、`<router-view>`、鼠标特效）
`packages/client/src/components/common/OABannerDock.vue` — banner 停靠动画（舞台 ↔ 左下角）
`packages/client/src/components/common/OABubbles.vue` — 气泡背景（10 个 `var(--oa-blue)` 圆）
`packages/client/src/components/common/OASettingsButton.vue` — 右上角设置按钮
`packages/client/src/components/common/OAMouseSpark.vue` + `composables/useMouseSpark.ts` — 全局点击 / 拖尾粒子特效
`packages/client/src/composables/useAppShell.ts` — 外壳共享状态（单例，见 `gate_and_splash.md`）
`packages/client/src/components/splash/OABannerSvg.vue` — 内联 banner SVG 动画组件（34KB 矢量文件）

用法：

### 外壳挂载（`App.vue`）

1. 作用：所有跨页面存活的元素都挂在外壳上，切页不重建；2. 内容区为 `.oa-shell__view`（`z-index: 10`），特效 `<OAMouseSpark>` 在最上层且 `pointer-events: none`；3. `watch(() => route.name, { immediate: true })` 把路由同步到 `stage`：进 `home` 调 `enterHome()`，回 `splash` 调 `enterSplash()`。
2. 输入：无（读 `useAppShell` 的 `stage` / `gatePassed`）。
3. 注意事项：**新页面不要画背景、不要放 banner**；路由不在 `splash` / `home` 两个分支时 `stage` 保持不变（banner 继续停靠左下角）——新页面想延续外壳就保持「不处理即延续」的约定。

### `OABannerDock`（banner 停靠）

1. 作用：舞台中央 ↔ 左下角停靠；2. 两个状态的 `transform` 函数结构完全一致（都是 `translate(-50%,-50%) translate(x,y) scale(s)`），所以过渡是连续的而不是矩阵混合；3. 停靠后启用指针事件，点击弹出关于弹窗；`bannerPlayToken` 变化时 `:key` 重挂 SVG 从头播。
2. 输入（props）：`docked: boolean`、`visible: boolean`（过 gate 后才显）、`playToken: number`；输出事件：`click`。
3. 注意事项：只动 `transform`（合成层）；尺寸由 `updateGeometry()` 实时算，监听 `resize` + `ResizeObserver`。

### `OABubbles` 的 `active` prop

1. 作用：控制气泡是否可见（`gatePassed` 驱动）；2. 全站只有一个实例，挂在外壳上，切到主界面后同一实例继续存在；3. 10 个气泡的几何与时长由修饰类 `oa-bubbles__bub--1` ~ `--10` 各写一条，`--dur` / `--delay` 驱动 `oa-bubbles__bub-float`。
2. 输入：`active?: boolean`（默认 true）。
3. 注意事项：气泡样式是 `filter: blur(12px)` 的柔光圆，`active` 只改不透明度，不要改几何。

### `OAMouseSpark`（`useMouseSpark`）

1. 作用：点击冲击波 + 旋转锥形光弧 + 飞散星芒 + Catmull-Rom 拖尾；2. 监听 `PointerEvent`（含触屏），无活跃粒子时自动停 `requestAnimationFrame`（0% 空闲开销）；3. 用对象池（`wavesPool` / `sparksPool`）复用粒子，避免 GC 抖动。
2. 输入（props / options）：`color`（默认 `'45,175,255'`）、`scale`、`opacity`、`clickSpeed`、`trailSpeed`、`enableTrail`。
3. 注意事项：canvas 必须 `pointer-events: none` 且 `z-index: 99999`，否则会挡住页面交互；DPR 要乘到物理像素并 `ctx.setTransform(dpr, …)`。

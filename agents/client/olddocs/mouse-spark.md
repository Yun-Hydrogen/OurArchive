# 鼠标交互特效

覆盖：[components/common/OAMouseSpark.vue](../../packages/client/src/components/common/OAMouseSpark.vue)、[composables/useMouseSpark.ts](../../packages/client/src/composables/useMouseSpark.ts)、[App.vue](../../packages/client/src/App.vue)

基于 HTML5/Canvas 实现的《蔚蓝档案》风格全局鼠标点击、粒子飞溅与光轨拖尾特效。

## 定位与架构

- **全局挂载**：在 `App.vue` 根节点挂载 `<OAMouseSpark />`，覆盖于所有视图最上层；
- **零交互干扰**：Canvas 设置 `pointer-events: none` 与 `z-index: 99999`，不阻断页面点击、拖选及组件手势；
- **全端输入兼顾**：监听标准 `PointerEvent`（`pointerdown` / `pointermove` / `pointerup` / `pointercancel`），同时支持鼠标点击与移动端触屏点按；
- **零闲置开销**：无活跃粒子时自动清空画布并停止 `requestAnimationFrame` 循环（0% CPU 占用），仅在发生手势时唤醒循环。

---

## 动效构成与核心参数

每次交互包含四层协同视觉元素：

### 1. 中心膨胀冲击波（Filled Circle）

- **生命周期**：16 帧基准（`maxLife: 16`）。
- **缓动与扩散**：采用三次减速曲线（Cubic Ease-Out，`ease = 1 - (1 - p)^3`），最大半径 `26 * scale`。
- **色彩与透明度**：以主题蓝（默认 `45, 175, 255`）填充，透明度伴随扩散由 `1.0` 线性衰减至 `0`。

### 2. 旋转锥形光弧（Rotating Rings）

- **双段弧线**：生成两个带有随机相位偏移的外圈旋转弧段（基准弧长 `1.1 * π` ≈ 198°）。
- **生灭阶段控制**：
  - `0.0 ~ 0.1`（生长段）：由点扩展为完整弧长；
  - `0.1 ~ 0.4`（稳定段）：保持完整弧线并匀速逆时针旋转；
  - `0.4 ~ 1.0`（消散段）：尾部向前收缩渐隐至消失。
- **锥形线宽插值**：每段弧划分为 10 个子片段，通过权重公式 `min(2 - |4 * (t - 0.5)|, 1)` 计算线宽，形成**中间厚（3.3px）、两端锐利渐细（0.4px）**的科技感光弧。
- **发光渐变色**：由起步高亮白青色 `[250, 252, 252]` 随进度平滑过渡至淡蓝色 `[185, 228, 255]`。

### 3. 飞散星芒晶片（Burst Sparks）

- **数量与初速度**：点击瞬间向四周放射 4 枚微粒子，初速度为 `(4.8 ~ 6.8) * speedAdjust`。
- **动力学模拟**：
  - 阻尼衰减（`f = 0.9`）：每帧速度乘方衰减；
  - 空间自旋：带有随机角速度（`rs = (random - 0.5) * 0.28`）；
  - 几何外形：旋转的纯白锐角几何晶片，半长 `(4 ~ 7) * scale`。

### 4. 动态平滑拖尾（Luminous Drag Trail）

- **曲线平滑**：捕获连续移动轨迹点，通过 **Catmull-Rom 样条插值** 生成三次贝塞尔曲线，消除折线生硬转角。
- **三层辉光混合**：
  - 外层柔光（宽 `9px`，透明度 `0.05`）；
  - 内层辉光（宽 `6px`，透明度 `0.5`）；
  - 核心光核（宽 `4.5px`，透明度 `1.0`）。
- **微粒子逸散**：拖曳期间以 30% 概率沿途散落小星芒粒子并随机漂移消散。

---

## 渲染与工程优化

1. **加色混合模式**：渲染通道统一开启 `globalCompositeOperation = 'lighter'`，使得中心冲击波、多层光弧与星芒在交汇处产生高亮度纯净辉光。
2. **高分屏渲染（HiDPI）**：自动侦测 `window.devicePixelRatio`，对 Canvas 画布物理像素进行等比放大并通过 `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` 映射，确保 4K / 视网膜屏幕清晰不模糊。
3. **对象池避免 GC 抖动**：内置 `wavesPool` 与 `sparksPool` 对象池，粒子消亡后回收复用，杜绝频繁创建销毁对象导致的帧率波动。
4. **生命周期自管理**：在 Vue 的 `onMounted` 与 `onBeforeUnmount` 中自动绑定/解绑窗口事件与动画帧，防止内存泄漏。

---

## 可配置项（`MouseSparkOptions`）

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `color` | `string` | `'45,175,255'` | 粒子与光弧主色（RGB 逗号分隔） |
| `scale` | `number` | `1.3` | 整体特效缩放倍率 |
| `opacity` | `number` | `1.0` | 全局不透明度乘数（0.0 ~ 1.0） |
| `clickSpeed` | `number` | `1.0` | 点击波纹与飞散粒子速度因子 |
| `trailSpeed` | `number` | `1.0` | 拖尾光轨衰减速度因子 |
| `enableTrail` | `boolean` | `true` | 是否启用按住拖拽时的光轨拖尾 |

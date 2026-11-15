# EmotionRender — 角色表情渲染与预览舞台（Pixi.js + GSAP 体系）

> 源码：`src/modules/EmotionRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `emotionOptions.ts` | 19 种表情物理运动参数（完全移植自 BA-Story 原版，对齐官方补间曲线与设计基准） |
| `emotionPlayer.ts` | GSAP + Pixi.js 动画驱动器，实现 19 个表情的 Timeline 编排与 Sprite 生命周期管理 |
| `OAEmotionPlayer.vue` | 表情播放宿主：接收 `spineInstance`，动态预载 PNG 纹理并调用 `playEmotionOnTarget` |
| `OAEmotionPreview.vue` | 表情预览容器：整合 Spine 立绘舞台、表情选择面板与缩放视口控制 |

## 职责边界

- 做什么：接收表情元数据（包含 PNG 纹理列表与音效）、将表情直接作为 Pixi `Container` 挂载到角色 Spine 实例下（`spineInstance.addChild(container)`）、通过 GSAP 时间轴驱动 Sprite 的缩放/弹性/旋转/透明度补间、播完自销毁，触发表情专属音效（`SFX_Emoticon_Motion_{Name}.wav`）。
- 不做什么：不使用 SVG SMIL 动画、不脱离渲染树进行 DOM 悬浮计算、不直接读写 YAML（由 `EmotionProvider` 负责）、不直接持有音频底层（由 `AudioPlayer/useEmotionSfx` 负责）。

## 核心机制

### 1. 挂载与相对坐标系（对齐 BA-Story）
- **挂载方式**：表情容器直接作为 `spineInstance`（继承自 `PIXI.Container`）的子节点添加。
- **坐标换算**：
  - 角色以 540 × 1012 为基准设计尺寸；
  - `offsetX = (options.startPositionOffset.x - 0.8) * 540`
  - `offsetY = (options.startPositionOffset.y - 1.2) * 1012`
  - 缩放：`scale = (options.scale * 540) / img.width`
- **优势**：立绘移动、放大缩小时，表情自动跟随场景图变换，**绝无脱节与漂移**。

### 2. 动画引擎（GSAP Timeline）
- 通过 `gsap` 与 `gsap/PixiPlugin` 驱动 Pixi.js 的 `Sprite` 实例。
- 完美支持多图组合、错峰显隐、回弹与循环：
  - `Heart`：背景气球淡入，红心做两次弹性回弹（1.2x1.3 -> 1.0 -> 1.1x1.2）后协同淡出；
  - `Angry`：三份怒气图元围绕 `(0.35, -0.05)` 旋转呼吸；
  - `Twinkle`：三颗星不同缩放与相位往返闪烁；
  - `Sad` / `Steam` / `Bulb` 等 19 种表情均 100% 对齐官方时序。
- 生命周期：时间轴完成后通过 `timelinePromise` 自动释放所有创建的 Sprite 并销毁容器，无内存泄漏。

### 3. 音效同步
- 表情触发时由 `playEmotionSfx` 播放对应的 `SFX_Emoticon_Motion_{Name}.wav`。
- 新的表情音效触发时自动停止旧音效，保持听感清晰。

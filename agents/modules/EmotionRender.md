# EmotionRender — 角色表情渲染与预览舞台（Pixi.js + GSAP + JSON 动效体系）

> 源码：`src/modules/EmotionRender/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `motionTypes.ts` | 动效 JSON DSL 类型定义（`EmotionMotionConfig`、图层、关键帧、缓动） |
| `motionCompiler.ts` | 动效编译器：将外载动效 JSON 编译为 GSAP Timeline，挂载 Pixi 容器并管理销毁 |
| `defaultMotions.ts` | 19 种 BA 官方标准表情的 JSON 动效预设与回退 |
| `emotionOptions.ts` | 19 种表情物理运动参数（BA-Story 原版参数，对齐官方补间曲线与设计基准） |
| `emotionPlayer.ts` | GSAP + Pixi.js 原版动画驱动器（作为通用兜底运行器） |
| `OAEmotionPlayer.vue` | 表情播放宿主：支持外载 `motionUrl` 与内置 JSON 动效，自动转换坐标挂载 |
| `OAEmotionPreview.vue` | 表情预览容器：整合 Spine 立绘 / 虚拟人台舞台、表情选择面板与缩放视口控制 |
| `src/views/EmotionPreviewView.vue` | 工具箱独立【表情动效预览】工具页面，支持人台/立绘底座、循环、静音与在线 JSON 动效实时调试 |

## 职责边界

- 做什么：接收表情元数据（支持外载 JSON 动效文件与 PNG 纹理）、将表情直接作为 Pixi `Container` 挂载到角色 Spine 实例或舞台人台锚点上、通过 `motionCompiler` 驱动 Sprite 的缩放/弹性/旋转/透明度物理补间、播完自销毁，触发表情专属音效（`SFX_Emoticon_Motion_{Name}.wav`）。
- 不做什么：不使用 SVG SMIL 动画、不脱离渲染树进行 DOM 悬浮计算、不直接读写 YAML（由 `EmotionProvider` 负责）、不直接持有音频底层（由 `AudioPlayer/useEmotionSfx` 负责）。

## 核心机制

### 1. 外载 JSON 动效 DSL（`motionTypes.ts` / `motionCompiler.ts`）
- **外载解耦**：资源包可直接放置 `motions/*.json`，在 `emotions.yml` 中声明 `motion: motions/foo.json`，纯数据驱动，无需修改前端代码即可新增或定制表情。
- **多图层与多粒子**：支持气泡底衬、主图、旋转散开的粒子系统（`count`, `angleStep`, `instances`）。
- **物理缓动**：关键帧直接支持 GSAP 的弹性曲线（`back.out`, `elastic.out` 等），达到官方原版游戏质感。

### 2. 虚拟人台底座与坐标换算
- **人台模式（Dummy）**：无需绑定任何资源包立绘，自动呈现带头部定位星与光环的轻量矢量人台轮廓，任何表情均可立即点击试听试看。
- **立绘模式（Spine）**：绑定立绘时，通过 `inst.toLocal(globalAnchor)` 将头部全局锚点换算为 Spine 本地坐标系，表情随角色移动与缩放 100% 贴合同步。

### 3. 音效同步
- 表情触发时由 `playEmotionSfx` 播放对应的 `SFX_Emoticon_Motion_{Name}.wav`。
- 新的表情音效触发时自动停止旧音效，保持听感清晰。

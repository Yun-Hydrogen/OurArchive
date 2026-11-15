# Emotions 表情资源开发者指南

本文档面向资源包作者，说明 **Our Archive** 中「表情（Emotions）」的目录结构、`emotions.yml` 配置规范，以及**基于 JSON 动效时间轴与 Pixi.js 场景图**的编写方法。

表情的全部表现——多图层材质、缓动物理曲线、缩放旋转节奏——均可通过外载的 **JSON 动效文件**（`motions/*.json`）进行定义，宿主解析后直接挂入 Pixi 舞台并驱动 GSAP 播放。**新增或调整表情不需要修改任何前端代码**。

---

## 1. 目录结构

表情属于资源包的一个内容分类，由 `package.yml` 声明：

```yaml
- package_content:
    - Emotions:
      supported: true
      path: emotions        # 目录名可自定义，例如 emotions/ 或 emtions/
```

推荐目录约定：

```text
<资源包>/emotions/
├── index/
│   └── emotions.yml        # 必需：表情索引（声明全部表情项）
├── motions/                # 推荐：JSON 动效时间轴定义
│   ├── heart.json
│   ├── angry.json
│   └── custom.json
├── images/                 # 表情精灵材质（PNG / WebP）
│   ├── emoicon_heart.png
│   └── emoicon_balloon_n.png
└── sounds/                 # 音效音频（.wav / .ogg / .mp3）
    └── sfx_emotion_heart.wav
```

- 只认 `emotions.yml` 里声明过的条目；
- 索引缺失或解析失败时，该分类显示为空，不影响资源包其它分类。

---

## 2. 顶层结构（`emotions.yml`）

```yaml
emotions:
  - id: heart                   # 必填，全局唯一标识
    name: 爱心                  # 展示名，缺省回退 id
    motion: motions/heart.json  # 推荐：外载 JSON 动效文件（相对 emotions/）
    sound: sounds/sfx_heart.wav # 可选：音效文件
    duration: 1.35              # 可选：总时长（秒），缺省读 JSON 中的 duration
    loop: false                 # 可选：是否循环播放
```

| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `id` | ✅ | 表情唯一标识，建议小写英文（如 `heart`, `angry`） |
| `name` | | 界面显示名（中文），缺省回退 `id` |
| `motion` | ✅（推荐） | 指向 `motions/` 下的 `.json` 动效文件 |
| `entry` | | 兼容旧版 `.svg` 文件路径 |
| `sound` | | 音效路径（相对 emotions/），缺失时静默播放 |
| `duration`| | 总时长（秒），缺省读取 JSON 内声明 |
| `loop` | | `true` 时循环播放，直到切走表情或关闭 |

---

## 3. 动效 JSON 怎么写（`motions/*.json`）

动效 JSON 是纯数据格式，由 Pixi.js 场景图与 GSAP 物理曲线驱动：

```json
{
  "version": "1.0",
  "id": "heart",
  "duration": 1.35,
  "startOffset": { "x": 0, "y": 0 },
  "layers": [
    {
      "name": "balloon",
      "texture": "images/emoicon_balloon_n.png",
      "anchor": { "x": 0.5, "y": 1.0 },
      "initial": { "scale": 0.2, "alpha": 0 },
      "keyframes": [
        { "to": { "scale": 1.15, "alpha": 1 }, "duration": 0.25, "ease": "back.out(2)" },
        { "to": { "scale": 1.0 }, "duration": 0.15 },
        { "to": { "scale": 0.8, "alpha": 0 }, "duration": 0.2, "delay": 0.6 }
      ]
    },
    {
      "name": "heart_icon",
      "texture": "images/emoicon_heart.png",
      "anchor": { "x": 0.5, "y": 0.5 },
      "position": { "x": 0, "y": -45 },
      "initial": { "scale": 0, "alpha": 0 },
      "keyframes": [
        { "to": { "scale": 1.25, "alpha": 1 }, "duration": 0.28, "ease": "elastic.out(1, 0.45)", "delay": 0.08 },
        { "to": { "scale": 1.0 }, "duration": 0.15 },
        { "to": { "scale": 1.15 }, "duration": 0.2, "delay": 0.2, "ease": "power2.out" },
        { "to": { "scale": 1.0 }, "duration": 0.15 },
        { "to": { "alpha": 0 }, "duration": 0.18, "delay": 0.3 }
      ]
    }
  ]
}
```

### 3.1 字段说明

- `layers`：图层数组，按声明顺序层叠。
- `texture`：材质相对路径（如 `images/emoicon_heart.png`）。
- `count` / `angleStep`：径向或多粒子数量与角度步长（如生气井字 3 个旋转分布 `count: 3, angleStep: 120`）。
- `instances`：当一个图层包含多个不同初始位置/延迟的粒子（如星星/睡眠 Z），直接在 `instances` 里逐一指定。
- `initial`：初始属性（`scale`, `scaleX`, `scaleY`, `x`, `y`, `angle`, `alpha`, `visible`）。
- `keyframes`：关键帧序列，每个关键帧包含 `to`（目标状态）、`duration`（秒）、`ease`（缓动函数）、`delay`（延迟）。
- 缓动支持所有标准 GSAP 缓动名：`"back.out(2)"`、`"elastic.out(1, 0.5)"`、`"power4.out"`、`"none"` 等。
| `loop` | | `true` 时循环播放，直到换表情 / 离开页面 |
| `sound` | | 音效路径；缺失或文件不存在时静默播放（不报错） |

### 锚点怎么定

`anchor` 是「表情贴在角色身上的那个点」。绝大多数表情应该锚在**画布底部中心**，也就是整个表情的下边缘中点——这样它看起来是从头顶"冒"出来的。

不写 `anchor` 时，宿主依次回退到：

1. SVG 内部的 `<metadata data-anchor="x y"/>`；
2. 画布中心偏上（`width / 2`, `height * 0.1`）。

> 推荐在 SVG 里写 `<metadata data-anchor="...">`，让 SVG 自己描述锚点，`emotions.yml` 就不用重复配置。

---

## 3. SVG 怎么写

### 3.1 硬性约束

表情 SVG 会被**内联进页面**，所以必须满足：

- **不允许任何 JavaScript**：`<script>`、`onclick` 之类的 `on*` 属性、`javascript:` URL 都会被剔除。
- **不允许引用外部资源**：图片必须是 `data:` URI，或者内部的 `#id` 引用；外部 URL 会被抹掉。
- **不允许 `@import` 与外链 `url()`**：内联样式里的都会被清理。
- 允许：`<image>`（data URI）、`<path>`/`<rect>`/`<circle>` 等图形、渐变/滤镜/蒙版、`<style>`、`<animate>` / `<animateTransform>` / `<set>`。

> 为什么不用 `<img src="x.svg">`：**Chromium 里 `<img>` 引用的 SVG 不会播放 SMIL**，表情会停在第一帧。宿主因此改成取回文本、净化后内联进 DOM。

### 3.2 画布尺寸

宿主从 SVG 的 `width` / `height`（或 `viewBox`）取画布尺寸，再按角色身高等比缩放到舞台。所以：

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="14 32 271 217" width="271" height="217">
```

- 画布可以只包住内容，不必是 540×1012。
- 宿主按 `width` 做等比缩放，因此**同一个表情在矮角色和高角色身上比例一致**。

### 3.3 动画：SMIL

所有补间都写在 SVG 自己身上，宿主不做任何插值。可用：

- `<animate attributeName="opacity" ...>` —— 淡入淡出、硬显隐（配合 `keyTimes`）
- `<animateTransform type="translate|rotate|scale" ...>` —— 位移 / 旋转 / 缩放
- `<set attributeName="..." to="...">` —— 定点赋值

时长以「秒」为单位（`dur="0.8s"`），`keyTimes` 与 `values` 的项数必须一致。

### 3.4 关键：缩放 / 旋转要绕自己的中心

SMIL **没有 `transform-origin`**，`type="scale"` 永远绕元素当前坐标系的 `(0,0)` 缩放。直接写会得到"从左上角弹出"的效果。

正确写法是三层嵌套：

```xml
<!-- 想围绕图片中心 (w/2, h/2) 缩放 -->
<g transform="translate(cx,cy)">        <!-- 1. 移到支点 -->
  <g>                                    <!-- 2. 在这里缩放 -->
    <animateTransform attributeName="transform" type="scale"
                    values="0.2 0.2;1.2 1.2;1 1"
                    keyTimes="0;0.25;1" dur="1s" fill="freeze"/>
    <g transform="translate(-w/2,-h/2)"> <!-- 3. 把图挪回去 -->
      <image href="data:image/png;base64,..." x="0" y="0" width="w" height="h"/>
    </g>
  </g>
</g>
```

同理，旋转要绕某点，也是先 `translate` 到该点再 `rotate`。

推荐把支点放在**元素中心或底部**：
- 「弹出来」的符号（感叹号、问号）：支点放在底部中心，看起来是从下面长出来；
- 「原地放大」的元素（星星、爱心）：支点放在正中心。

### 3.5 让多个元素错开时间

两种写法：

1. 每个 `<animate>` 上写 `begin="0.2s"`（推荐，简单直观）；
2. 在 `keyTimes` 里把前面一段留在 `0`（例如 `0;0.4;0.5;1`）。

### 3.6 示例：一个完整的最小表情

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="200" height="220">
  <metadata data-anchor="100 200"/>

  <!-- 气泡底：1.1s 后淡出 -->
  <g transform="translate(100,140)">
    <g>
      <g transform="translate(-100,-95)">
        <image href="data:image/png;base64,..." x="0" y="0" width="200" height="190"/>
      </g>
    </g>
    <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.9;1" dur="1.1s" fill="freeze"/>
  </g>

  <!-- 主体：从底部弹出，再轻微回弹 -->
  <g transform="translate(100,170)">
    <g>
      <animateTransform attributeName="transform" type="scale"
                        values="0.2 0.2;1.25 1.25;1 1" keyTimes="0;0.22;0.4"
                        dur="1.1s" fill="freeze"/>
      <g transform="translate(-40,-40)">
        <image href="data:image/png;base64,..." x="0" y="0" width="80" height="80"/>
      </g>
    </g>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.84;1"
             dur="1.1s" fill="freeze"/>
  </g>
</svg>
```

---

## 4. 音效

- 音效由**宿主播放**，SVG 里不要写 `<audio>`（也不允许脚本）。
- 新的表情音效会**打断上一段**，同一时间只保留一段。
- 音量跟随设置里的「预览音频 / 音效音量」；播放期间主界面 BGM 会被压住，结束后恢复。
- 文件放哪都行，只要 `sound:` 写成相对 `emotions/` 的路径。

---

## 5. 调试

1. 把资源包放进 `<资源根>/res/`，打开「资源管理 → 资源包 → 表情」。
2. 先选一个预览角色（表情会叠在这个立绘的头顶）。
3. 点表情按钮即可播放；`duration` 到点会自动收起。

常见问题：

| 现象 | 原因 |
| :--- | :--- |
| 表情停在第一帧不动 | SVG 里用了 `<img>` 式外链图片，或动画写成了 CSS `@keyframes` 但被净化掉——请用 SMIL 并把图片转成 `data:` URI |
| 表情从角落里"弹出" | 缩放 / 旋转没做 `translate → 变换 → translate(-w/2,-h/2)` 三层嵌套 |
| 表情离头顶很远 | `anchor`（或 `<metadata data-anchor>`）不是画布底部中心 |
| 表情不消失 | `duration` 没写或写得比实际动画长 |
| 列表显示「未找到」 | `entry` 路径不对，或文件不是 `.svg` |

---

## 6. 参考实现

`res/DefaultPackage/emtions/svg/` 下有 19 个完整示例（`heart` / `respond` / `dot` / `exclaim` / `question` / `surprise` / `angry` / `sad` / `music` / `twinkle` / `upset` / `sweat` / `shy` / `chat` / `steam` / `sigh` / `bulb` / `tear` / `zzz`），可以直接抄结构改内容。

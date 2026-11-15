# Emotions 表情资源开发者指南

本文档面向资源包作者，说明 **Our Archive** 中「表情（Emotions）」的目录结构、`emotions.yml` 配置规范，以及**自包含动画 SVG** 的写法。

表情的全部表现——图形、动画、节奏——都写在一个 **SVG 文件**里，宿主只负责把它按锚点摆到角色头顶、播放声明的音效。因此**新增或调整表情不需要改代码**。

---

## 1. 目录结构

表情属于资源包的一个内容分类，由 `package.yml` 声明：

```yaml
- package_content:
    - Emotions:
      supported: true
      path: emotions        # 目录名可自定义，这里以 emotions/ 为例
```

目录约定：

```
<资源包>/emotions/
├── index/
│   └── emotions.yml        # 必需：表情索引（本文主角）
├── svg/                    # 推荐：每个表情一个 .svg
│   ├── heart.svg
│   └── dot.svg
└── sounds/                 # 推荐：每个表情一段音效
    └── sfx_emotion_heart.wav
```

- 只认 `emotions.yml` 里声明过的 `entry`；目录里多出来的 `.svg` 不会被列出。
- 子目录层级不限，路径写相对 `emotions/` 的相对路径即可。
- 索引缺失或解析失败时，该分类显示为空，不影响资源包其它分类。

---

## 2. 顶层结构

```yaml
emotions:
  - id: heart                 # 必填，全局唯一
    name: 爱心                # 展示名，缺省用 id
    description: ""           # 可选，界面说明
    entry: svg/heart.svg      # 必填，相对 emotions/ 的 .svg 路径
    anchor: [135.5, 203]      # 可选，锚点（px）；不写则读 SVG 内 metadata
    duration: 1.35            # 可选，总时长（秒）；不写则不自动收起
    loop: false               # 可选，是否无限循环
    sound: sounds/heart.wav   # 可选，音效（相对 emotions/）
```

| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `id` | ✅ | 表情唯一标识，建议小写 + 下划线 |
| `name` | | 界面显示名（中文），缺省回退 `id` |
| `description` | | 说明文字 |
| `entry` | ✅ | 指向一个 `.svg`；必须是自包含动画 SVG（见第 3 节） |
| `anchor` | | `[x, y]`，单位是 **SVG 画布内的 px**：这个点会对齐到角色头顶 |
| `duration` | | 总时长（秒）。写 `0` 或不写则由宿主按 1.5s 收尾 |
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

# Emotions 表情资源开发者指南

本文档面向资源包作者与开发者，说明 **Our Archive** 中「表情（Emotions）」的目录结构、`emotions.yml` 配置规范、动画关键帧写法与调试方法。

表情的全部行为——用哪几张图、怎么叠、怎么动、配什么音——都写在资源包里，程序只按帧解释。因此**新增或调整表情不需要改代码**。

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
├── images/                 # 建议：合成用的 PNG
│   ├── balloon_n.png
│   └── heart.png
└── sounds/                 # 建议：每个表情一段音效
    └── sfx_emotion_heart.wav
```

- 只认 `emotions.yml` 里声明过的文件；目录里多余的图片不会被列出。
- 子目录层级不限，`images/`、`sounds/` 只是习惯，路径写相对 `emotions/` 的相对路径即可。
- 图片支持 `.png` / `.jpg` / `.webp` / `.bmp` / `.gif` / `.avif`；音效支持 `.wav` / `.ogg` / `.mp3` / `.m4a` / `.flac` 等常见格式。
- 索引缺失或解析失败时，该分类显示为空，不影响资源包其它分类。

> 参考实现：`res/DefaultPackage/emtions/index/emotions.yml`（19 个表情的完整示例）。

---

## 2. 顶层结构

```yaml
emotions:
  - id: heart                 # 必填，全局唯一（同时用作音效命名）
    name: 爱心                # 展示名，缺省用 id
    description: ""           # 可选，界面上的说明
    offset: [0.05, -0.02]     # 相对角色头顶锚点的位置
    duration: 1.35            # 可选，缺省取各层最大值
    sound: sounds/heart.wav   # 可选，路径相对 emotions/
    layers: [...]             # 必填，至少一层
```

| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `id` | ✅ | 表情唯一标识，建议小写 + 下划线 |
| `name` | | 界面上显示的名字（中文），缺省回退 `id` |
| `description` | | 说明文字，预留字段，目前不在列表里展开 |
| `offset` | | `[x, y]`，相对**角色头顶锚点**的偏移，单位是 **540 设计宽度**的倍数 |
| `duration` | | 整个表情总时长（秒）；不写则取所有图层时长的最大值 |
| `sound` | | 音效路径；缺失或文件不存在时静默播放（不报错） |
| `layers` | ✅ | 图层列表，**顺序即叠放顺序**（先声明的在下面） |

---

## 3. 坐标系与缩放

程序用一套固定的「设计坐标系」解释所有数值，因此同一份配置在任何分辨率、任何角色尺寸下比例都一致。

- **设计基准宽度 = 540**，**设计基准高度 = 1012**（与 `OurArchive` 的立绘参考尺寸一致）。
- 运行时换算出 `unit`：

  ```
  unit = 角色在屏幕上的高度 ÷ 1012
  ```

  即「1 个设计单位」= 角色高度的 1/1012。
- 根图层的宽度 = `scale × 540 × unit`。
- 角色被缩放 / 平移时，表情跟着一起变。

因为全部按角色高度等比换算，同一个表情在矮角色和高角色身上看起来比例一致。

---

## 4. 图层（layers）

```yaml
layers:
  - image: images/balloon.png
    scale: 0.45          # 根层：宽度 = 0.45 × 540
    duration: 1.35
    ease: linear
    anchor: [0, 0]       # 变换原点，0–1（可超出）
    position: [0, 0]     # 相对舞台的基准位置
    keyframes: [...]

  - image: images/heart.png
    parent: 0            # 挂到第 0 层
    scale: 0.40          # 子层：宽度 = 0.40 × 父层宽度
    position: [0.27, 0.16]   # 单位 = 父层宽度
    ...
```

| 字段 | 缺省 | 说明 |
| :--- | :--- | :--- |
| `image` | — | 必填，相对 `emotions/` 的图片路径 |
| `scale` | `1` | 基准宽度比例：根层相对 540，子层相对父层宽度 |
| `position` | `[0, 0]` | 相对父层左上（根层相对锚点）的偏移：根层 × `540 × unit`，子层 × 父层宽度 |
| `parent` | `-1` | 父层下标，`-1` 表示直接挂在舞台。**只能引用更早的层**（防止成环） |
| `anchor` | `[0, 0]` | `transform-origin`，`[0.5,0.5]` 表示中心，允许 `1.6` 这种超界值 |
| `duration` | `1` | 本层动画时长（秒） |
| `ease` | `linear` | 缓动，取值同 CSS `animation-timing-function`（`ease-out`、`ease-in-out`、`cubic-bezier(...)`） |
| `keyframes` | — | 关键帧列表，见下一节 |

### 定位速查

- **根层**：`x`、`y` 都以 `540 × unit` 为单位，所以 `position: [0.1, 0.1]` 表示右移、下移各 54 个设计单位。
- **子层**：`x`、`y` 都以**父层宽度**为单位（注意 y 也用宽度算，不要用高度），`position: [0.5, 0.5]` 表示父层中心。
- 子层的位移会叠加在父层之上，父层一起动时子层跟随。

---

## 5. 关键帧（keyframes）

```yaml
keyframes:
  - { at: 0.00, opacity: 1 }
  - { at: 0.25, zoom: 1.25 }
  - { at: 0.50, zoom: 1.00 }
  - { at: 1.35, opacity: 0 }
```

| 字段 | 缺省（沿用上一帧） | 说明 |
| :--- | :--- | :--- |
| `at` | 必填 | 距离表情开始的时间（秒），必须递增（可乱序书写，程序会排序） |
| `opacity` | `1` | 不透明度 0–1 |
| `zoom` | `1` | 相对基准宽度的缩放倍率（`2` = 两倍宽） |
| `x` / `y` | `0` | 额外的设计单位位移（在 `position` 之上叠加） |
| `rotate` | `0` | 旋转角度（度），正值为顺时针 |

规则：

1. **未写的属性沿用上一帧**，所以只需要写「变化的那个属性」。
2. 第一个关键帧的 `at` 大于 0 时，程序会自动补一个 `at: 0` 的初始帧。
3. `at` 可以超过 `duration` 之外的值吗？不要——超出 `duration` 的部分不会播放（`offset` 会被钳到 1），想让某层更久就调大该层的 `duration`。
4. 时间点重复会被合并；非法项（负数、非数字）会被丢弃。

### 动画是「层独立」的

每层各有一条独立时间轴，从表情开始的 0 秒同时起跑。想做「依次出现」，就是给后面的层写更晚的 `at`：

```yaml
# 三个点依次冒出
keyframes:
  - { at: 0.00, opacity: 0 }
  - { at: 0.40, opacity: 0 }
  - { at: 0.50, opacity: 1 }
  - { at: 1.00, opacity: 1 }
  - { at: 1.15, opacity: 0 }
```

---

## 6. 三个常用模板

### 6.1 单图弹一下（感叹号）

```yaml
- id: exclaim
  name: 感叹
  offset: [0.18, -0.05]
  sound: sounds/sfx_emotion_exclaim.wav
  layers:
    - image: images/exclamation.png
      scale: 0.13
      duration: 0.80
      ease: ease-out
      keyframes:
        - { at: 0.00, zoom: 1.00, opacity: 1 }
        - { at: 0.20, zoom: 1.40 }
        - { at: 0.30, zoom: 1.20 }
        - { at: 0.60, zoom: 1.20, opacity: 1 }
        - { at: 0.70, opacity: 0 }
```

### 6.2 两图合成（气球 + 爱心，爱心弹跳）

```yaml
- id: heart
  name: 爱心
  offset: [0.05, -0.02]
  layers:
    - image: images/balloon_n.png
      scale: 0.45
      duration: 1.35
      keyframes:
        - { at: 0.00, opacity: 1 }
        - { at: 1.15, opacity: 1 }
        - { at: 1.35, opacity: 0 }
    - image: images/heart.png
      parent: 0
      position: [0.27, 0.16]
      scale: 0.40
      duration: 1.35
      ease: ease-in-out
      keyframes:
        - { at: 0.00, zoom: 1.00 }
        - { at: 0.25, zoom: 1.25 }
        - { at: 0.50, zoom: 1.00 }
        - { at: 0.75, zoom: 1.12 }
        - { at: 1.35, opacity: 0 }
```

### 6.3 同图复制多份（三张斜排的「回应」）

```yaml
- id: respond
  name: 回应
  offset: [0.24, 0.02]
  layers:
    - image: images/action.png
      scale: 0.13
      anchor: [1.6, 0]          # 以右侧为轴，向角色外侧开扇
      duration: 0.84
      position: [0.00, 0.00]
      keyframes:
        - { at: 0.00, zoom: 1.40, rotate: -10, opacity: 1 }
        - { at: 0.84, opacity: 0 }
    - image: images/action.png
      scale: 0.13
      anchor: [1.5, 0]
      duration: 0.84
      position: [0.10, 0.06]
      keyframes:
        - { at: 0.00, zoom: 2.00, rotate: 23, opacity: 1 }
        - { at: 0.84, opacity: 0 }
    - image: images/action.png
      scale: 0.13
      anchor: [1.6, 0]
      duration: 0.84
      position: [0.20, 0.12]
      keyframes:
        - { at: 0.00, zoom: 1.40, rotate: 50, opacity: 1 }
        - { at: 0.84, opacity: 0 }
```

---

## 7. 音效约定

- 一个表情一段音效，路径写在 `sound`；缺省则不发声。
- 播放时机 = 表情开始的瞬间，音量跟随全局设置的「预览音频 / 音效音量」。
- 与主界面背景音乐互斥：播放表情音效时背景音乐会淡出，结束后恢复。
- 同一时刻只会有一个表情在播（再点会打断上一个），音效同理。

---

## 8. 预览与调试

在程序里进入 **资源管理 → 打开资源包 → 左侧「表情」**：

1. 点「选择预览角色」，从资源包里已绑定立绘的角色、或未被引用的独立立绘目录中选一个（会下载该立绘的骨骼 / 图集 / 贴图）。
2. 右侧点表情按钮即可叠加播放；立绘可拖动、滚轮缩放、拉缩放条，表情会跟着立绘走。
3. 表情按钮上会标 `无音效`；缺图的条目边框是虚线，底部还有一行「有 N 个表情缺图」提示。

常见问题：

| 现象 | 原因 |
| :--- | :--- |
| 「表情」分类显示 0 个 | 没写 `index/emotions.yml`，或 `package.yml` 里 `Emotions.supported` 不是 `true`，或 `path` 与实际目录不一致 |
| 表情点了没出现 | `layers` 为空 / 图片路径写错（相对 `emotions/`）；按钮虚线表示缺图 |
| 只看到第一层 | 子层 `parent` 写反了（只能引用**更早**的层），或 `scale` 太小 |
| 位置偏得很远 | `offset` / `position` 是「540 设计宽度的倍数」，不是像素；`1 ≈ 半个角色宽` |
| 动画没有淡出 | 末帧没写 `opacity: 0`；关键帧未写的属性会沿用上一帧 |
| 音效不响 | 路径写错，或 `.wav` 不在允许的音频格式内 |

---

## 9. 参考：内置 19 个表情

| id | 名称 | 图层 | 说明 |
| :--- | :--- | :--- | :--- |
| `heart` | 爱心 | 气球 + 爱心 | 爱心三段弹跳 |
| `respond` | 回应 | Action ×3 | 三张斜排、错开角度 |
| `music` | 音符 | Note | 放大后左右摇摆飘走 |
| `twinkle` | 闪亮 | Twinkle ×3 | 三个位置错开闪烁 |
| `upset` | 沮丧 | 气球 + Anxiety | 符号左右摇摆 |
| `sweat` | 汗 | Sweat_1 + Sweat_2 | 两滴汗向下垂落 |
| `dot` | 无语 | 气球 + Idea ×3 | 三个点依次冒出 |
| `exclaim` | 感叹 | ExclamationMark | 弹一下再淡出 |
| `surprise` | 惊讶 | Exclamation + Question | 角色上方小幅一跳 |
| `question` | 疑问 | QuestionMark | 放大后停住再淡出 |
| `shy` | 害羞 | 气球 + Shy | 符号左右抖两下 |
| `angry` | 生气 | Aggro ×3 | 三张各转 120° 环绕 |
| `chat` | 聊天 | Chat | 气泡从外侧摆正 |
| `sad` | 难过 | Sad ×3 | 三条竖线错峰浮现 |
| `steam` | 冒烟 | Steam ×2 | 两股蒸汽交替放大淡出 |
| `sigh` | 叹气 | Sigh | 淡入、放大、淡出 |
| `bulb` | 灵光 | 气球 + Bulb ×2 | 灯泡与光圈交替闪烁 |
| `tear` | 眼泪 | Tear_1 + Tear_2 | 两滴眼泪错峰滑落 |
| `zzz` | 睡觉 | Zzz ×3 | 三个 Z 依次浮现 |

完整参数见 `res/DefaultPackage/emtions/index/emotions.yml`。

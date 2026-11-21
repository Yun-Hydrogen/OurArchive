# 表情（Emotions）资源包开发者指南

本文档面向资源包作者，说明 **Our Archive** 的表情目录结构、`emotions.yml` 配置，以及如何用资源包内的 JavaScript 脚本绘制表情。

---

## 1. 目录结构

```text
<资源包>/
└── emtions/                  # 目录名由 package.yml 的 Emotions.path 决定
    ├── index/
    │   └── emotions.yml
    ├── images/
    │   ├── emoicon_balloon_n.png
    │   └── emoicon_heart.png
    └── scripts/
        └── heart.js          # 一条表情一个脚本，按需拆分
```

`package.yml` 里需要声明分类与目录：

```yaml
- package_content:
    - Emotions:
      supported: true
      path: emtions
```

程序只从 `path` 指向的目录读取 `index/emotions.yml`，也只允许下发该目录内的图片与 `.js` / `.mjs` 脚本。

---

## 2. `index/emotions.yml`

```yaml
emotions:
  - id: heart
    name: 爱心
    description: 头顶冒出爱心气泡
    script: scripts/heart.js      # 该表情专用的脚本（导出名缺省等于 id）
    images:
      - images/emoicon_balloon_n.png
      - images/emoicon_heart.png
    duration: 1.35

  - id: music
    name: 音符
    images:
      - images/emoicon_note.png
    duration: 1.1
    loop: false
```

| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `id` | 是 | 表情唯一标识，同时作为默认 `export` |
| `name` | 否 | 展示名，缺省为 `id` |
| `description` | 否 | 展示描述（当前预览列表不显示，仅作为索引数据保留） |
| `images` | 是 | 图片相对路径，按**从下到上**的绘制顺序排列；也接受单个字符串 |
| `script` | 是 | 该表情的脚本相对路径；没有脚本的表情不会被播放 |
| `export` | 否 | 脚本导出名；缺省为 `id` |
| `duration` | 否 | 动画时长（秒），脚本没返回 Promise 时用它决定自动清理时机 |
| `loop` | 否 | 是否循环；循环表情不会自动停止 |

约定：

- **一条表情一个脚本**，命名与 `id` 一致（`heart` → `scripts/heart.js`），便于按表情维护。
- 早期版本支持过顶层 `script:`（整包共用入口）、`motion:`（旧 motion JSON）与 `sound:` / `entry:`；
  这些字段已经从默认包里移除，新资源包不要再使用。

格式与大小限制：

- 脚本只允许 `.js` / `.mjs`，单文件最大 **512 KB**。
- 路径必须位于表情目录内，越界路径会被忽略。

---

## 3. 脚本入口

脚本是标准 ES Module。宿主按 `export` 取导出函数；没有同名导出时会尝试 `default[export]` 与 `default`。

```js
// scripts/heart.js —— 文件名与表情 id 一致，由 emotions.yml 的 script 绑定
export function heart(ctx) {
  const { PIXI, container, textures, gsap, audio } = ctx;

  // 气泡宽 = 0.38 × 540 设计像素，任何角色上比例一致
  const balloonScale = (0.38 * 540) / textures['emoicon_balloon_n.png'].width;
  const balloonWidth = textures['emoicon_balloon_n.png'].width * balloonScale;
  const balloonHeight = textures['emoicon_balloon_n.png'].height * balloonScale;

  // 容器原点就是头顶锚点：用「气泡宽」为单位定位到角色左上方
  const balloon = new PIXI.Sprite(textures['emoicon_balloon_n.png']);
  balloon.anchor.set(1, 1);
  balloon.position.set(balloonWidth * -0.7, balloonWidth * 0.35);
  balloon.scale.set(balloonScale);
  container.addChild(balloon);

  // 爱心落在气泡主体中心（0.48 / 0.5 是气泡贴图里的相对位置）
  const heartScale = (0.4 * balloonWidth) / textures['emoicon_heart.png'].width;
  const heart = new PIXI.Sprite(textures['emoicon_heart.png']);
  heart.anchor.set(0.5);
  heart.position.set(
    balloon.x - balloonWidth * 0.52,
    balloon.y - balloonHeight * 0.5
  );
  heart.scale.set(0.001);
  container.addChild(heart);

  audio.play();

  const timeline = gsap.timeline();
  timeline
    .to(balloon, { alpha: 1, duration: 0.14 }, 0)
    .to(heart, { alpha: 1, duration: 0.12 }, 0.06)
    .to(heart.scale, {
      x: heartScale,
      y: heartScale,
      duration: 0.28,
      ease: 'elastic.out(1, 0.5)',
    }, 0.06)
    .to([balloon, heart], { alpha: 0, duration: 0.32 }, 0.92);

  // 返回清理函数；切换表情 / 卸载组件时调用
  return () => timeline.kill();
}
```

脚本可以返回：

- `void`：宿主按 `duration` 等待后清理（`loop: true` 时一直保留）。
- 清理函数：在停止、切换、卸载时调用。
- `Promise<void | (() => void)>`：宿主等待完成；完成后按 `loop` 决定是否停止。

---

## 4. Context

| 字段 | 说明 |
| :--- | :--- |
| `apiVersion` | 当前为 `1`；破坏性改动会递增 |
| `id` | 表情 id |
| `container` | 已挂到头顶锚点的 Pixi 容器，坐标原点即锚点，内部按 540×1012 设计像素换算 |
| `character` | 角色根容器（Spine 实例或 DragonBones display） |
| `framePoint(nx, ny)` | 把角色包围盒的 0–1 比例坐标换算成容器内设计坐标 |
| `textures` | 预载贴图，键为文件名（如 `heart.png`）与完整 URL |
| `images` | 图片 URL 数组 |
| `designUnit` | 1 设计像素对应的舞台全局像素，一般不需要手动换算 |
| `duration` / `loop` | `emotions.yml` 的声明值 |
| `signal` | `AbortSignal`，切换或停止时触发 |
| `PIXI` | Pixi 命名空间 |
| `gsap` | GSAP 实例，可选使用 |
| `ticker` | `add(cb)` / `remove(cb)`，回调参数为秒 |
| `audio` | `play()` / `stop()` / `element` |
| `onCleanup(fn)` | 注册清理函数 |

### 坐标

- `container` 的原点就是角色**头顶锚点**（Spine 优先 `Head` / `head`，没有时退化到 `halo` / `Halo`），因此 `(0, 0)` 表示头部中心。
- 容器内部使用 **540 × 1012 设计像素**：`frameUnit = 角色包围盒宽 / 540`，所以 1 个设计像素在不同角色上的视觉大小一致。
- 贴图尺寸一律按设计框换算，不要写死缩放：

```js
const scale = (0.38 * 540) / texture.width; // 显示宽度 = 0.38 × 540 设计像素
```

- 子元素之间推荐用「父元素显示宽 / 高」做单位，这样父元素换尺寸时不会错位：

```js
heart.position.set(
  balloon.x - balloonWidth * 0.52, // 气泡主体中心
  balloon.y - balloonHeight * 0.5
);
```

- 需要按角色整体布局定位时，可用 `ctx.framePoint(nx, ny)` 把角色包围盒的 0–1 比例换算成容器坐标。
- 角色平移、缩放时，宿主会让表情容器跟随；脚本不需要处理舞台缩放。

### 关于 BA-Story 的「固定盒」

BA-Story 用的是一个 **540 × 1012 的设计画布**（不是角色骨骼包围盒）。它的表情配置
`startPositionOffset` 是 0–1 的归一化坐标，换算到 Spine 本地坐标的公式是：

```ts
offsetX = (startPositionOffset.x - 0.8) * 540
offsetY = (startPositionOffset.y - 1.2) * 1012
```

`0.8 / 1.2` 是 BA Spine 资源导出原点在设计框里的位置；图片缩放按 `scale * 540 / image.width`。

我们保留了相同的「设计像素」尺度与图片缩放公式，但表情容器挂在**头顶锚点**上，
而不是骨骼原点，所以位置用「相对头顶的偏移」表达更直观，也不需要知道骨骼原点在哪。

---

## 5. 只支持脚本表情

表情的表现**完全由包内脚本决定**，宿主不再提供任何内置动画：

- 没有 `script` 的表情会出现在列表里，但「预览」按钮不可用，也不会被播放；
- 脚本里没写的元素就不会出现，宿主不会替你补气泡或图标；
- `duration` 只在脚本未返回 Promise 时用于决定何时自动清理（`loop: true` 时不清）。

---

## 6. 限制

- 暂不支持 DragonBones 二进制骨骼（`.dbbin`），请导出 `*_ske.json` + `*_tex.json`。
- DragonBones 当前只暴露动作列表，插槽差分留待后续版本。
- 脚本不能可靠地在服务端渲染（SSR）环境运行；表情只在浏览器端播放。

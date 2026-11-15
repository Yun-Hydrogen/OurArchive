# EmotionProvider — 表情索引解析（SVG 条目）

> 源码：`src/modules/EmotionProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `emotions.server.ts` | 解析 `index/emotions.yml`，校验 `entry` 指向的 `.svg`，从 SVG 首标签提取画布尺寸与锚点，生成入口 / 音效 URL。服务端专用，浏览器侧绝不能 import |

## 职责边界

- 解析什么：`Emotions` 分类的 `index/emotions.yml`；每条记录的 `entry`（`.svg`）是否存在；SVG 的 `width`/`height`/`viewBox`；显式锚点；音效路径与存在性。
- 不做什么：**不展开动画**——动画全在 SVG 里；不渲染、不计算角色头顶锚点（那是 `SkeletonRender` 的 `metrics`）。

## 数据形状

`PackageEmotion`：

| 字段 | 说明 |
| --- | --- |
| `id` | 表情标识（如 `heart`） |
| `name` | 展示名；缺省回退 `id` |
| `description` | 描述 |
| `entry` | `.svg` 的可访问 URL；文件缺失时为空串 |
| `exists` | `.svg` 是否存在且后缀合法 |
| `width` / `height` | 从 SVG 读出的画布尺寸（px）；读不出时为 `0` |
| `anchor` | `[x, y]`，SVG 画布内对齐头顶的位置（px） |
| `duration` | 声明时长（秒）；`0` 表示未声明 |
| `loop` | 是否无限循环 |
| `soundUrl` | 音效 URL；无音效或缺失为空串 |
| `soundExists` | 音效物理存在性 |

> 已删除 `PackageEmotionLayer` / `PackageEmotionKeyframe`：不再支持手写图层 + 关键帧的旧 DSL。

## 关键实现

### `readPackageEmotions(packageDir, pkg)`

1. 输入输出：`(packageDir, pkg) => PackageEmotion[]`。
2. 流程：读 `index/emotions.yml` → 逐条取 `id` / `entry` → 校验 `entry` 以 `.svg` 结尾且文件存在 → 读文本提取画布尺寸 → 解析锚点 → 解析音效。
3. 容错：BOM 剥离；YAML 解析失败返回空数组不抛错；单条记录字段非法时跳过而非整体失败。

### `readSvgCanvas(svgText)`

只匹配**首标签** `/`<svg\b[^>]*>/i`，不做完整 XML 解析（避免引入 XML 依赖）：

1. 优先用 `width` + `height`；
2. 缺失时用 `viewBox` 的第 3、4 项；
3. 都没有返回 `0 × 0`（前端会按 240 兜底）。

### `readSvgAnchor(svgText, width, height)`

1. 优先读 `<metadata data-anchor="x y">`；
2. 缺失时返回 `[width / 2, height * 0.1]`。

`emotions.yml` 里的 `anchor:` 字段优先级最高，会覆盖这里的推断。

### `resolveEmotionFile(packageDir, pkg, relative)`

路由层用它把 `/api/packages/:id/emotions/*` 映射到磁盘文件。经 `resolveInside` 越界校验，扩展名只允许 `.svg` 与 `AUDIO_EXTENSIONS`。

## 注意事项

- 表情 DSL 与 SVG 写法见 [emotions.md](../../docs/configs_doc/emotions.md)，此处不重复。
- 手写 `emotions.yml` 必须剥除 UTF-8 BOM（NeedNotice 12）。
- 计数口径：`countEntries` 读 `index/emotions.yml` 的条目数，不把 `svg/`、`sounds/` 目录条目算进去（NeedNotice 15）。
- `.svg` 由 `packagesRoutes.server.ts` 下发，响应头带 `Content-Security-Policy` 与 `nosniff`；但**前端仍要自行净化**，因为最终是内联进页面（见 [EmotionRender](./EmotionRender.md)）。

## 相关文档

- [PackageProvider](./PackageProvider.md)
- [EmotionRender](./EmotionRender.md)
- [Emotions 配置规范](../../docs/configs_doc/emotions.md)
- [NeedNotice](../NeedNotice.md)

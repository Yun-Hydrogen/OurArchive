# EmotionProvider — 表情 DSL 索引解析、图层树装配与关键帧归一化

> 源码：`src/modules/EmotionProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `emotions.server.ts` | `emotions.yml` 表情配置解析、图层拓扑校验、关键帧归一化与静态资源定位（服务端专用，浏览器侧绝不能 import） |

## 职责边界

- 解析什么：解析 `Emotions` 分类的 `index/emotions.yml`；装配多图层树形结构；校验 `parent` 引用并防成环；归一化关键帧时间线并补全 0 秒起点；计算表情总时长并生成图片与音效 URL。
- 不做什么：不执行关键帧补间渲染与动画循环（由 `OAEmotionPlayer` 负责）、不计算角色头顶锚点与贴合（由 `OAEmotionPreview` 负责）、不碰 Canvas/DOM 像素。表情 DSL 权威说明参见 [docs/configs_doc/emotions.md](../../docs/configs_doc/emotions.md)。

## 数据形状

- `PackageEmotionKeyframe`：单个关键帧
  - `at`：关键帧时刻（秒，>= 0）
  - `opacity`：不透明度（0–1，可选）
  - `zoom`：相对基准宽度的缩放倍率（可选）
  - `x` / `y`：设计单位位移（×540 后换算像素，可选）
  - `rotate`：旋转角度（度，可选）
- `PackageEmotionLayer`：单个图层
  - `image`：图片可访问 URL
  - `exists`：图片文件物理存在性
  - `scale`：相对父层宽度（或 540 设计基准宽度）的缩放比例
  - `duration`：该图层动画时长（秒，>= 0.05）
  - `ease`：缓动函数名（与 CSS `animation-timing-function` 同名，缺省 `linear`）
  - `anchor`：变换原点 `[x, y]`（0–1，缺省 `[0, 0]`）
  - `position`：基准位置 `[x, y]`（父层宽度/540 倍数，缺省 `[0, 0]`）
  - `parent`：父层下标；`-1` 表示直接挂在舞台
  - `keyframes`：`PackageEmotionKeyframe[]`，已补全 0 起点的关键帧数组
- `PackageEmotion`：表情条目
  - `id`：表情标识（如 `heart`）
  - `name`：展示名（缺省回退 `id`）
  - `description`：描述说明
  - `offset`：相对角色头顶锚点偏移 `[x, y]`（540 设计宽度倍数）
  - `duration`：总时长（秒；取声明值与各图层最大时长之大者）
  - `soundUrl`：音效 URL；无音效或缺失为空串 `""`
  - `soundExists`：音效物理存在性
  - `layers`：`PackageEmotionLayer[]`，图层列表（顺序即叠放顺序）

## 关键实现

### `readPackageEmotions(packageDir, pkg)`

1. 作用：读取 `index/emotions.yml` 并解析为结构化表情 DTO。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage) => PackageEmotion[]`。
3. 注意事项：BOM 剥离；总时长自动由声明值与图层最大时长取大；音效缺失时 `soundExists: false` 并静默下发；解析失败返回空数组不抛错（见 [NeedNotice](../NeedNotice.md) 条目 12）。

### `parseEmotionLayer(root, packageId, raw, index)`

1. 作用：解析单图层配置并进行拓扑校验。
2. 输入输出：`(root: string, packageId: string, raw: unknown, index: number) => PackageEmotionLayer | null`。
3. 注意事项：`parent` 必须严格小于当前图层下标（`0 <= parent < index`），非法值或成环风险统一归一化为 `-1`（直接挂在舞台）；缺图时 `exists: false` 仍下发。

### `parseEmotionKeyframes(raw, duration)`

1. 作用：关键帧数据清洗、排序与补点。
2. 输入输出：`(raw: unknown, duration: number) => PackageEmotionKeyframe[]`。
3. 注意事项：过滤无效时间帧；按 `at` 升序排序；若首帧 `at > 0` 自动补充 `{ at: 0 }` 起点；无关键帧时补 `[{ at: 0 }, { at: duration }]`。

### `resolveEmotionFile(packageDir, pkg, relative)`

1. 作用：表情图片与音效文件安全定位。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage, relative: string) => string | null`。
3. 注意事项：通过 `resolveInside` 校验边界；扩展名必须满足 `IMAGE_EXTENSIONS` 或 `AUDIO_EXTENSIONS` 双白名单。

## 注意事项

- 表情 DSL、关键帧语法与设计坐标系规范参见 [emotions.md](../../docs/configs_doc/emotions.md)，此处不重复定义。
- 图层 `parent` 严格单向引用：只能引用下标小于自身的图层（`parent < index`），严禁成环与前向引用。
- 坐标换算体系：以 540 基准设计宽度为单位，位移与相对位置按父层宽度 / 540 缩放换算。
- 关键帧时间线必须自闭合：自动补齐 0 秒起点帧，保障起始状态确定。
- 手写 `emotions.yml` 必须剥除 UTF-8 BOM 头（见 [NeedNotice](../NeedNotice.md) 条目 12）。
- 计数口径对齐：`countEntries` 读取 `index/emotions.yml` 中的表情条目数，严禁将图片或音效目录当作条目计数（见 [NeedNotice](../NeedNotice.md) 条目 15）。

## 相关文档

- [PackageProvider](./PackageProvider.md)
- [NeedNotice](../NeedNotice.md)
- [Emotions 配置规范](../../docs/configs_doc/emotions.md)

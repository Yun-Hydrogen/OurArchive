# BackgroundProvider — 背景图索引解析、分类聚合与文件安全定位

> 源码：`src/modules/BackgroundProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `backgrounds.server.ts` | 背景图片目录扫描、`category.yml` 索引解析与未分类归纳（服务端专用，浏览器侧绝不能 import） |

## 职责边界

- 解析什么：解析 `Backgrounds` 分类目录；存在 `index/category.yml` 时按分类清单映射目录，缺省时扫描根下一层；归纳松散图片为「未分类」；校验并定位背景图片文件。
- 不做什么：不解码图片、不生成缩略图、不管理图片灯箱或宫格布局（由 `BackgroundRender` 模块负责）。

## 数据形状

- `PackageBackground`：背景图条目
  - `name`：文件名（含扩展名，如 `BG_ClassRoom.jpg`）
  - `path`：相对背景目录的路径（含分类子目录，如 `school/BG_ClassRoom.jpg`）
  - `ext`：小写扩展名（含点，如 `.jpg`）
  - `size`：字节数（无法读取时为 0）
  - `url`：图片可访问 URL（`/api/packages/:id/backgrounds/:path`）
- `PackageBackgroundCategory`：背景分类
  - `id`：分类唯一标识；未分类固定为空串 `""`
  - `label`：分类展示名；未分类固定为 `'未分类'`
  - `description`：分类说明；未分类为空串 `""`
  - `count`：该分类下的图片数量
  - `images`：`PackageBackground[]`，图片数组（按文件名中文拼音升序排列）

## 关键实现

### `readPackageBackgrounds(packageDir, pkg)`

1. 作用：读取背景分类清单与图片列表。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage) => PackageBackgroundCategory[]`。
3. 注意事项：
   - 两种布局并存：有 `<path>/index/category.yml` 时按清单中 `category[].path` 顺序逐目录读取；无清单时仅读 `<path>/` 根下一层。
   - 根目录松散图片：无论是否存在分类清单，直接位于 `<path>/` 根目录下的图片统一归入「未分类」（`id: ''`、`label: '未分类'`），排在分类列表末尾。
   - 分类目录去重（`seenDirs`），避免清单重复定义导致重复统计。
   - 空分类（无图片）不下发。

### `listBackgroundImages(packageId, dir, prefix)`

1. 作用：列出指定目录根下一层的图片文件。
2. 输入输出：`(packageId: string, dir: string, prefix: string) => PackageBackground[]`。
3. 注意事项：**只读目录根下一层，不递归**，目录内的子目录不会被扫描；严格限定扩展名在 `IMAGE_EXTENSIONS` 内；按文件名排序。

### `resolveBackgroundFile(packageDir, pkg, relative)`

1. 作用：物理路径安全定位。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage, relative: string) => string | null`。
3. 注意事项：通过 `resolveInside` 校验边界防越界，仅允许 `IMAGE_EXTENSIONS` 白名单图片，不存在或非文件返回 `null`。

### 常量与路径约定

1. 作用：约定索引目录与未分类展示名。
2. 常量定义：`BACKGROUND_INDEX_DIR = 'index'`、`BACKGROUND_CATEGORY_FILE = 'category.yml'`、`BACKGROUND_UNCATEGORIZED_LABEL = '未分类'`。
3. 注意事项：从 `PackageProvider/packageManifest.server.ts` 导入，两端保持单向一致。

## 注意事项

- 分类语义约定：前端过滤状态中 `null` 代表「全部」，空串 `""` 代表「未分类」（对应后端 `id: ''`）。
- 图片扫描坚持**单层不递归**原则，分类目录下的多层子目录将被忽略。
- 文件白名单：仅接纳 `IMAGE_EXTENSIONS`（`.jpg/.jpeg/.png/.webp/.bmp/.gif/.avif`），文本或无关文件直接过滤且静态路由 404。
- 手写 `category.yml` 解析前必须剥除 UTF-8 BOM（见 [NeedNotice](../NeedNotice.md) 条目 12）。
- 计数口径对齐：`countEntries` 与 `readPackageBackgrounds` 均统计算入各分类目录图片及根目录松散图片，保证卡片计数与列表总数严格一致（见 [NeedNotice](../NeedNotice.md) 条目 15）。

## 相关文档

- [PackageProvider](./PackageProvider.md)
- [BackgroundRender](./BackgroundRender.md)
- [NeedNotice](../NeedNotice.md)

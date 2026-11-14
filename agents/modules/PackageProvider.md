# PackageProvider — 资源包清单解析、目录扫描与前端内容状态管理

> 源码：`src/modules/PackageProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `useResourcePackages.ts` | 资源包全量列表状态管理（只读暴露、`refresh()` 触发重扫） |
| `usePackageContent.ts` | 单包内容状态管理与按需加载控制器（详情/角色/骨骼/音频/背景/表情） |
| `packageManifest.server.ts` | `package.yml` 解析、路径安全校验、分类计数口径与通用资源常量（服务端专用，浏览器侧绝不能 import） |
| `skeletons.server.ts` | 立绘目录扫描、三件套完整性判定与文件体积统计（服务端专用，浏览器侧绝不能 import） |

## 职责边界

- 解析什么：`package.yml` 资源包元信息（名称/描述/作者/版本/更新时间/分类声明）、`skeletons/` 立绘目录结构与文件体积/完整性、前端资源包列表与单包分类按需加载状态。
- 不做什么：不解析角色详细数据（由 `CharacterProvider` 负责）、不解析音频内部结构（由 `AudioProvider` 负责）、不解析背景分类图谱（由 `BackgroundProvider` 负责）、不解析表情 DSL（由 `EmotionProvider` 负责）、不操作 DOM 节点与 Canvas/WebGL 像素。

## 数据形状

- `ResourcePackage`：资源包元信息
  - `id`：资源包目录名（唯一标识）
  - `name` / `description` / `version` / `author`：`package_info` 声明字段
  - `updatedAt`：`package.yml` 文件修改时间（ISO 字符串）；无法获取时为空串 `""`
  - `valid`：是否成功解析出 `package_info`
  - `error`：解析失败时的错误原因说明（可选）
  - `contents`：`PackageContent[]`，内容分类声明列表
- `PackageContent`：内容分类元信息
  - `key`：外载键名（`Skeletons` / `BackgroundMusic` / `Sounds` / `Backgrounds` / `Emotions` / `hasCharacter`）
  - `label`：中文展示名（骨骼/背景音乐/音效/背景/表情/角色）
  - `supported`：清单作者是否声明包含
  - `path`：相对包根路径
  - `index` / `avatar`：角色索引文件名与头像目录名（缺省 `characters.json` / `avatars`）
  - `exists`：声明为包含且物理目录真实存在
  - `count`：一级条目数或分类特化条目数（未支持为 0）
- `PackageSkeleton`：立绘骨骼项
  - `id`：立绘目录名
  - `files`：`PackageSkeletonItem[]`（含 `name`、`ext` 小写含点、`size` 字节数、`url`）
  - `totalSize`：目录下全部文件体积之和
  - `complete`：是否三件套齐备可直接预览（`(.skel 或 .json) && .atlas && 贴图`）

## 关键实现

### `useResourcePackages()`

1. 作用：管理全量资源包列表状态；只读暴露 `packages`、`resourcesDir`、`loading`、`error`。
2. 输入输出：无参，返回 `{ packages, resourcesDir, loading, error, refresh }`。
3. 注意事项：视图通过 `refresh()` 触发重扫，不可直接改写 `packages.value`。

### `usePackageContent(packageId)`

1. 作用：管理单包详情与各分类数据，进入页面先拉详情与角色，其余重型分类按需拉取。
2. 输入输出：`packageId: string`，返回各分类数据只读 ref 及 `load*()` 动作。
3. 注意事项：骨骼、音乐、音效、背景、表情分别维护 `*Loading` / `*Error` / `*Loaded`，通过 `watch(activeSection)` 按需调用，内部用 `*Loaded` 内存标记幂等去重（见 [NeedNotice](../NeedNotice.md) 条目 24）。

### `scanResourcePackages(paths)`

1. 作用：扫描 `resDir` 下全部带 `package.yml` 的一级子目录，解析元数据并按 `id` 字母序排列。
2. 输入输出：`paths?: StoragePaths`，返回 `ResourcePackage[]`。
3. 注意事项：目录不存在返回空数组；解析失败的包保留 `valid: false` 与 `error`。

### `resolvePackageDir(id, paths)` / `resolveInside(baseDir, relativePath)`

1. 作用：防路径穿越的路径解析守门人。
2. 输入输出：`(id: string, paths?: StoragePaths) => string | null`；`(baseDir: string, relativePath: string) => string | null`。
3. 注意事项：资源包 `id` 严格只允许一级目录名，空值、`.`、`..` 或含 `[/\\]` 一律返回 `null`；下发路径必须位于 `baseDir` 内部，任何含 `..` 越界均返回 `null`（见 [NeedNotice](../NeedNotice.md) 条目 13）。

### `parsePackageContents(packageDir, raw)`

1. 作用：解析 `package_content` 分类声明，兼容扁平与嵌套两套写法。
2. 输入输出：`(packageDir: string, raw: unknown) => PackageContent[]`。
3. 注意事项：扁平写法时通过 `CONTENT_RESERVED_KEYS`（`supported` / `path` / `index` / `avatar` / `name` / `description`）排除保留字段，提取真实分类键（见 [NeedNotice](../NeedNotice.md) 条目 14）。

### `countEntries(dir, key)`

1. 作用：按分类口径特化统计条目数。
2. 输入输出：`(dir: string, key: string) => { exists: boolean; count: number }`。
3. 注意事项：`hasCharacter` 优先读 `characters.json` 长度；`BackgroundMusic` 优先读 `music_info.json` 长度；`Sounds` 优先读 `sound_info.json` 长度；`Backgrounds` 数清单分类目录与根目录图片总数；`Emotions` 读 `emotions.yml` 长度；读不到回退目录条目数（见 [NeedNotice](../NeedNotice.md) 条目 15）。

### `readPackageSkeletons(packageDir, pkg)`

1. 作用：扫描立绘子目录，算好所有文件体积并校验三件套完整性。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage) => PackageSkeleton[]`。
3. 注意事项：体积在扫描阶段算好下发，前端展开不再发请求；`complete` 必须满足（`.skel` 或 `.json`）+ `.atlas` +（`.png` / `.webp` / `.jpg` / `.jpeg`）（见 [NeedNotice](../NeedNotice.md) 条目 17）。

## 注意事项

- 语义三态严格区分：`supported`（清单声明包含）vs `exists`（物理目录存在）vs `complete`（骨骼三件套齐全）。
- 资源包 `id` 仅限一级目录名，所有下发路径必须经 `resolveInside` 校验防路径穿越（见 [NeedNotice](../NeedNotice.md) 条目 13）。
- `package_content` 必须兼容扁平与嵌套两种写法，分类键由 `CONTENT_RESERVED_KEYS` 白名单把关（见 [NeedNotice](../NeedNotice.md) 条目 14）。
- 分类计数按分类特化统计，索引文件损坏时回退目录项总数，`exists` 仍保持 `true`（见 [NeedNotice](../NeedNotice.md) 条目 15）。
- 立绘完整性是「骨骼 + 图集 + 贴图」三件套，缺一不可（见 [NeedNotice](../NeedNotice.md) 条目 17）。
- 重型接口（立绘、音效、背景等）必须前端按需加载，配合 `*Loaded` 内存标记避免重复拉取（见 [NeedNotice](../NeedNotice.md) 条目 24）。
- `package.yml` 手写文件读取前统一剥离 UTF-8 BOM（`.replace(/^\uFEFF/, '')`）（见 [NeedNotice](../NeedNotice.md) 条目 12）。

## 相关文档

- [CharacterProvider](./CharacterProvider.md)
- [AudioProvider](./AudioProvider.md)
- [BackgroundProvider](./BackgroundProvider.md)
- [EmotionProvider](./EmotionProvider.md)
- [NeedNotice](../NeedNotice.md)

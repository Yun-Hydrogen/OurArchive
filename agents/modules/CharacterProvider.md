# CharacterProvider — 角色索引解析与资源关联供给

> 源码：`src/modules/CharacterProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `characters.server.ts` | 角色索引 `characters.json` 解析、关联头像 URL 与立绘骨骼存在性（服务端专用，浏览器侧绝不能 import） |

## 职责边界

- 解析什么：解析 `hasCharacter` 分类的角色索引文件，组装头像可访问 URL（`avatars/` 目录），检查角色绑定的各立绘目录（`skeletons/` 目录）物理存在性。
- 不做什么：不加载、解析或渲染立绘骨骼文件（由 `SkeletonRender` / `SkeletonRuntimeProvider` 负责），不管理角色选择弹窗状态（由 `ResourcePicker` 负责），不绘制前端页面。

## 数据形状

- `PackageCharacterSource`：角色索引原始记录（外载格式，服务端内部使用）
  - `name_id`：角色唯一标识（snake_case 外载格式，如 `fuuka`）
  - `name`：角色展示名（如「枫香」）
  - `school`：所属学院（如「格黑娜学园」）
  - `club`：所属社团（如「供给部」）
  - `avatar`：头像文件名（如 `Fuuka.png`）
  - `spine`：绑定的立绘目录 id 列表（如 `["fuuka_spr"]`）
- `PackageCharacter`：角色对外 DTO
  - `name_id`：角色唯一标识（snake_case 外载格式，代码语义统一按 `nameId` 理解）
  - `name`：角色展示名
  - `school`：所属学院
  - `club`：所属社团
  - `avatar`：头像文件名；文件缺失或未声明时为空串 `""`
  - `avatarUrl`：头像可访问 URL（`/api/packages/:id/avatar/:file`）；缺失为空串 `""`
  - `spine`：绑定的立绘目录 id 列表（外载字段名保留为 `spine`，语义等价于骨骼 skeleton id）
  - `spines`：`Array<{ id: string; exists: boolean }>`，每条立绘在 `skeletons/` 目录下是否存在
  - `hasSkeleton`：是否至少有一条立绘可用（`spines.some(item => item.exists)`）

## 关键实现

### `readPackageCharacters(packageDir, pkg)`

1. 作用：读取角色索引，绑定头像 URL 并校验关联立绘的存在性。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage) => PackageCharacter[]`。
3. 注意事项：
   - 索引文件名与头像目录名优先从 `pkg.contents` 中的 `index` / `avatar` 取，缺省回退为 `DEFAULT_CHARACTER_INDEX` (`characters.json`) 与 `DEFAULT_AVATAR_DIR` (`avatars`)。
   - 读取前必须剥除 UTF-8 BOM 头（见 [NeedNotice](../NeedNotice.md) 条目 12）。
   - 头像文件仅在磁盘物理存在时赋予 `avatar` 与 `avatarUrl`，否则为空串 `""`。
   - 关联立绘校验仅检查 `skeletons/<id>` 目录是否存在，不深扫内部文件。
   - 结果按 `name_id` 字母升序排列。

### 头像可访问 URL 生成

1. 作用：调用 `buildAssetUrl(pkg.id, 'avatar', avatarFile)` 构建头像访问地址。
2. 输入输出：`pkg.id: string, kind: 'avatar', avatarFile: string => string`。
3. 注意事项：路径分段经 `encodeURIComponent` 处理；若文件不存在则不生成 URL，返回空串。

### 关联立绘存在性检测（`spines`）

1. 作用：遍历 `record.spine` 数组，定位 `skeletons/<id>` 目录并判定 `exists`。
2. 输入输出：`Array<{ id: string; exists: boolean }>`。
3. 注意事项：骨骼分类未声明或目录缺失时，所有立绘的 `exists` 均为 `false`。

### 缺省常量与目录约定

1. 作用：约定 `hasCharacter` 分类的缺省文件名与目录名。
2. 约定值：`DEFAULT_CHARACTER_INDEX = 'characters.json'`、`DEFAULT_AVATAR_DIR = 'avatars'`。
3. 注意事项：由 `PackageProvider/packageManifest.server.ts` 提供定义，清单未声明 `index` / `avatar` 时以此兜底。

## 注意事项

- 手写 `characters.json` 读取前必须执行 `.replace(/^\uFEFF/, '')` 剥除 BOM（见 [NeedNotice](../NeedNotice.md) 条目 12）。
- 外载字段保留与内部统一：外载数据为 `name_id` 与 `spine`，系统内部统一表述为 `skeleton`，跨端 DTO 保留 `name_id` 与 `spine` 字段以兼容旧资产。
- 头像 URL 仅在文件物理存在时下发，不存在时返回空串 `""`，前端统一处理占位图。
- 依赖单向性：单向依赖 `PackageProvider/packageManifest.server.ts` 的基础路径解析与常量，绝不反向引用上层 API 模块。
- 只有当 `spines` 中至少有一项 `exists === true` 时，`hasSkeleton` 才为 `true`；用于前端控制立绘跳转按钮的可用状态。
- 角色条目计数口径：`countEntries` 优先读取 `characters.json` 数组长度，与本模块下发条目数对齐（见 [NeedNotice](../NeedNotice.md) 条目 15）。

## 相关文档

- [PackageProvider](./PackageProvider.md)
- [ResourcePicker](./ResourcePicker.md)
- [NeedNotice](../NeedNotice.md)

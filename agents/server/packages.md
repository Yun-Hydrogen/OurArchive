# 资源包索引（包扫描与 API）

覆盖：[config/packages.ts](../../packages/server/src/config/packages.ts)、[routes/packages.ts](../../packages/server/src/routes/packages.ts)

后端只做**文件索引**：扫描 `<root>/res`，把每个带 `package.yml` 的一级子目录识别成一个资源包，返回清单与统计。不校验资源完整性、不加载资源本体、不写任何文件。

## 扫描规则

```
<root>/res/
├── DefaultPackage/package.yml   ✅ 识别为资源包（id = "DefaultPackage"）
├── SomePackage/package.yml      ✅
├── NotAPackage/                 ❌ 没有 package.yml，忽略
└── README.md                    ❌ 文件，忽略
```

- 只认 `res` 的**一级子目录**，不递归、不跟随软链接目录。
- `res` 不存在或不可读 → 返回空数组（首次启动时目录可能还没建，前端显示空态即可）。
- 结果按 `id`（目录名）字典序排序，保证前端列表稳定。

## package.yml 解析

文件可能带 BOM，读取时统一 `replace(/^\uFEFF/, '')` 后交给 `js-yaml`。顶层必须是列表：

```yaml
- package_info:
    name: BlueArchivePackforOA
    description: 为 Our Archive 提供的《蔚蓝档案》默认包。
    version: 1.0.0
    author: YunHydrogenP

- package_content:
    - Skeletons:
      supported: true
      path: skeletons
```

| 段 | 处理 |
| --- | --- |
| `package_info` | 取 `name` / `description` / `version` / `author`（全部 `String().trim()`），`name` 缺省回退目录名 |
| `package_content` | 数组，每项一个内容分类；按清单顺序输出 |

`package_content` 的条目有两种写法，**都要支持**：

```yaml
# 扁平写法（当前默认包就是这种：键与 supported/path 同级）
- Skeletons:
  supported: true
  path: skeletons

# 嵌套写法
- Skeletons:
    supported: true
    path: skeletons
```

- 判定嵌套：值是非数组对象 → 直接当作该分类的配置。
- 判定扁平：跳过 `supported` / `path` / `index` / `avatar` / `name` / `description` 后剩下的第一个键就是分类名，配置取同级字段。
- 允许 `- Emotions: emotions`（值即路径）。

失败策略：解析异常、顶层不是列表、缺少 `package_info` → 仍返回这个包，但 `valid: false` 并带上 `error` 文案，让前端能把「坏包」显示出来而不是静默消失。

## 内容统计

| 分类键 | `count` 含义 |
| --- | --- |
| `hasCharacter` | 读该目录下的索引文件（`index`，缺省 `characters.json`）并取数组长度 = 角色条数；读不到则退回一级条目数 |
| 其它 | 目录下一级条目数（`Skeletons` 即立绘目录数） |

- 只有 `supported: true` 才统计，且 `path` 必须落在资源包目录内部（`path.resolve` 后校验前缀），避免 `../` 穿越。
- 目录不存在 → `exists: false, count: 0`，前端显示「缺失」。
- `index` / `avatar` 两个字段会原样下发，前端不必猜文件名。

## API

### `GET /api/packages` — 资源包列表

```json
{
  "success": true,
  "resourcesDir": "C:\\Users\\<用户>\\Documents\\OurArchive\\res",
  "total": 1,
  "packages": [
    {
      "id": "DefaultPackage",
      "name": "BlueArchivePackforOA",
      "description": "为 Our Archive 提供的《蔚蓝档案》默认包。",
      "version": "1.0.0",
      "author": "YunHydrogenP",
      "updatedAt": "2026-11-01T02:13:52.115Z",
      "valid": true,
      "contents": [
        { "key": "Skeletons", "label": "骨骼", "supported": true, "path": "skeletons", "index": "", "avatar": "", "exists": true, "count": 631 },
        { "key": "hasCharacter", "label": "角色", "supported": true, "path": "characters", "index": "characters.json", "avatar": "avatars", "exists": true, "count": 447 }
      ]
    }
  ]
}
```

- `PACKAGE_CONTENT_LABELS` 是「分类键 → 中文名」的展示映射；未收录的自定义键直接回退成键名，不会报错。
- `resourcesDir` 一并下发，前端用来提示用户「把资源包放这里」。
- 每次请求都重新扫描（本地磁盘、包数量少），**不做缓存**：用户随时可能增删目录。
- 扫描抛错 → `500 { success: false, error }`；单包解析失败不抛错（见上文 `valid`）。

### `GET /api/packages/:id` — 单包详情

复用 `scanResourcePackages()` 后按 `id` 过滤，返回 `{ success, package }`；不存在 → 404。

### `GET /api/packages/:id/characters` — 角色索引

```json
{
  "success": true,
  "total": 447,
  "characters": [
    {
      "name_id": "misono_mika",
      "name": "圣园 未花",
      "school": "崔尼蒂综合学院",
      "club": "茶话会",
      "avatar": "misono_mika.png",
      "avatarUrl": "/api/packages/DefaultPackage/avatar/misono_mika.png",
      "spine": ["ch0069_spr", "np0010_spr"],
      "spines": [{ "id": "ch0069_spr", "exists": true }, { "id": "np0010_spr", "exists": true }],
      "hasSkeleton": true
    }
  ]
}
```

- 读 `hasCharacter` 分类的 `index` 文件；解析失败或不是数组 → 返回空数组而不是报错。
- `avatarUrl` 只有文件真的存在才给，否则 `avatar` 与 `avatarUrl` 都是空串，前端退化到首字占位。
- `spines[].exists` 逐条探测 `Skeletons` 分类目录下是否存在同名子目录；`hasSkeleton` 是它的「任一」。
- 结果按 `name_id` 字典序，前端不要再排序（分组时另建 computed）。

### `GET /api/packages/:id/skeleton/:skeletonId` — 立绘文件清单

```json
{
  "success": true,
  "id": "ch0069_spr",
  "files": [
    { "name": "CH0069_spr.atlas", "url": "/api/packages/DefaultPackage/skeleton/ch0069_spr/CH0069_spr.atlas" },
    { "name": "CH0069_spr.png", "url": "..." },
    { "name": "CH0069_spr.skel", "url": "..." }
  ]
}
```

立绘目录不存在 → 404。

### 静态资源下发

| 路径 | 目录来源 |
| --- | --- |
| `GET /api/packages/:id/avatar/*` | `hasCharacter.path` / `hasCharacter.avatar` |
| `GET /api/packages/:id/skeleton/:skeletonId/*` | `Skeletons.path` / `:skeletonId` |

- 只下发白名单扩展名：`.png` / `.jpg` / `.jpeg` / `.webp` / `.skel` / `.atlas` / `.json`，其它一律 404。
- 所有路径都过 `resolveInside()` 归一化，拒绝 `..` 段与前缀逃逸。
- `packageId` 只允许一级目录名（含 `/`、`\`、`.`、`..` 直接判非法），由 `resolvePackageDir()` 保证。

## 扩展

| 需求 | 做法 |
| --- | --- |
| 打开资源目录 | 用系统 API（`explorer` / `xdg-open`）实现，路径只从 `getStoragePaths()` 取 |
| 更多 package.yml 字段 | 在 `ResourcePackage` 与 `readPackage()` 同步补，前端类型在 `useResourcePackages.ts` |
| 支持多级资源包目录 | 把 `readdirSync` 改为递归，注意跳过 `node_modules` 之类的大目录 |
| 新增可下发类型 | 往 `MIME_BY_EXTENSION` 加一条即可，同时在 `resolveInside` 的安全边界内 |

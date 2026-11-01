# 资源包详情与角色详情

覆盖：[views/PackageView.vue](../../packages/client/src/views/PackageView.vue)、[views/PackageCharacterView.vue](../../packages/client/src/views/PackageCharacterView.vue)、[composables/usePackageContent.ts](../../packages/client/src/composables/usePackageContent.ts)

从 [resources.md](./resources.md) 的资源包卡片点进去的两级页面：

```
/resources                      资源包列表
└── /resources/:packageId       资源包大卡片（左侧分类栏 + 右侧内容）
    └── /resources/:packageId/character/:nameId   角色详情
        └── /tools/skeleton?package=…&skeleton=…  骨骼预览
```

## 路由与参数

| 路由名 | 路径 | 参数 |
| --- | --- | --- |
| `packageDetail` | `/resources/:packageId` | `packageId` = `res/` 下的目录名 |
| `packageCharacter` | `/resources/:packageId/character/:nameId` | 追加 `nameId` = `characters.json` 的 `name_id` |

骨骼预览复用既有 `/tools/skeleton`，通过 **query** 传入上下文：

| query | 含义 |
| --- | --- |
| `package` | 资源包 id |
| `skeleton` | 立绘目录名（直接加载，不用用户选文件） |
| `character` | 角色 `name_id`，供「返回角色详情」使用 |

## 资源包大卡片（PackageView）

左侧 1/4 栏 + 右侧内容，整体套一张与资源管理一致的白色卡片（圆角 14、双层阴影）。

### 侧边栏

用 RizUI 的 `rizui_sidebar`（`rizui_nav` 的别名）：

```vue
<rizui_sidebar
  v-model="navModel"
  :items="navItems"
  :width="navWidth"
  :inset="0"
  height="100%"
  :collapsible="false"
  :default-expanded-keys="[SECTION_CHARACTERS]"
  theme="Light"
  @select="handleNavSelect"
/>
```

- `items` 由 `pkg.contents.filter(c => c.supported)` 生成，`hasCharacter` 的 id 归一为 `characters`，其余直接用 `key`；`badge` 填条目数（0 时不给）。
- **「角色」条目下挂学院子条目**（`children`），id 加 `school:` 前缀，`badge` = 该学院人数。`default-expanded-keys` 让「角色」默认展开，学院列表直接可见（超长时 `.rnav-body` 自身滚动）。
- **`v-model` 不能直接绑 `activeSection`**：rizui_nav 在选中子条目时会把 `modelValue` 改成子条目 id，`activeSection` 会被污染成 `school:…`，`v-if` 分支立刻失效。所以用 `navModel` 这个带写入闸门的 computed —— 带 `school:` 前缀的值直接丢弃，分类永远停在有效值上。
- 「点学院才加载并展开」由 `handleNavSelect` 完成：取 `select` 事件的 item → 剥前缀 → `openSchool()` 挂载并展开 → `nextTick` 后在 `.oa-pkg__content` 里按 `data-school` 定位并 `scrollTo({ behavior: 'smooth' })`，最后高亮该卡片 1.2s（`.is-highlight` 描边）。
- **宽度必须是像素数字**：`rizui_nav` 内部用 `parseFloat` 处理 `width`，百分比会被算成 0。所以用 `ResizeObserver` 观察卡片宽度，取 `clamp(150px, 20%, 226px)` —— 够放下「百花缭乱纷争调解委员会」这类长学院名（实在放不下时 `.rnav-label` 自带 ellipsis）。
- `:inset="0"` 让导航容器不再额外留 12px 外边距，否则卡片里会多出一圈空白。
- `height="100%"` 撑满卡片；`rizui_nav` 对非 `100vh` 的字符串高度是直接透传的。
- **观察器要跟着 `cardEl` 挂载**：卡片的 `v-if` 会随 `loading` 卸载重挂，`onMounted` 里一次性绑定会绑到马上被移除的节点上（回调拿到宽度 0，被 clamp 到下限）。用 `watch(cardEl, …, { flush: 'post' })` 并在 `<= 0` 时直接 return。

### 角色条目

默认**按学院分组成可折叠的 RizCard**：

- `schoolGroups` 由 `filteredCharacters` 按 `school` 分桶（空学院归入「未知学院」），组间按人数降序、同人数按名字排序；组内保持后端给的 `name_id` 顺序。
- 每组一个 `rizui_card`（`title` = 学院名，`desc` = `N 个角色`），**初始全部收起**——首次展开才挂载内容。

#### 展开状态与懒挂载

| 状态 | 含义 |
| --- | --- |
| `expandedSchools: Set<string>` | 当前展开的组 |
| `mountedSchools: Set<string>` | 曾经展开过的组，内容挂载后不再卸载 |

- `isOpen(school)` = 搜索中 **或** 在 `expanded` 里；`isMountedContent(school)` = 搜索中 **或** 在 `mounted` 里。
- 首次展开：`openSchool()` 同时写入 `mounted` 与 `expanded` → 内容首次渲染 + 展开动画一起发生。
- 收起：只从 `expanded` 移除，**保留 `mounted`**，DOM 不销毁，下次展开仍有过渡、也不会重新拉头像。
- 搜索时两个判定都返回 true，命中的组全部展开，避免结果被藏在折叠里。

#### 动画实现

`rizui_card` 没有折叠能力，也不暴露表头插槽，所以：

- **表头可点**：外层 `.oa-school` 挂 `@click`，只在 `event.target.closest('.ct-card-head')` 时切换——点内容和点角色卡不会误触发。
- **箭头**：`.ct-card-head::after` 的 6px 方块旋转，展开时 `-135deg`、收起时 `45deg`，`0.24s` 过渡。
- **高度过渡**：`.oa-school__collapse` 用 `grid-template-rows: 0fr → 1fr`（`0.3s`）+ `opacity`（`0.22s`），内层 `.oa-school__collapse-inner` 必须 `min-height: 0; overflow: hidden` 才收得干净。`.ct-card-body` 的 `margin-top` 置 0，间距由 `.is-open` 时的内层 `padding-top` 提供。
- 工具栏另有「全部展开 / 全部收起」；`expandAll()` 会把所有组同时写入 `mounted`，避免它们第一次展开时没有过渡。

单个角色是 `.oa-char`（`minmax(236px, 1fr)`，最小高 60px）：

- 圆形头像 42px（`object-position: center top`，BA 头像上重下轻），无头像时退化成名字首字；
- 名字 13px、**允许两行**（`-webkit-line-clamp: 2`），保证「勘解由小路 紫（泳装）」这类长名不被截断；
- 第二行是所属组织（`club` 为空时显示「无所属组织」）；
- **骨骼绑定状态不再占一整列**：已绑定时不显示任何东西，未绑定时在头像右下角点一个灰点（`title` 说明）。默认资源包里 447 个角色全部已绑定，把「已绑定」胶囊砍掉后名字才有足够宽度。

点击 → 先播离场（`SHELL_TIMING.cardsExitWait`）再跳 `packageCharacter`。

### 尺寸

- 页面左右内边距压到 `clamp(14px, 2.4vw, 44px)`，标题与卡片统一 `min(1320px, 100%)`。
- 卡片高度 `clamp(420px, calc(100vh - 196px), 1000px)`，视口越高卡片越大，内容区内部滚动。

### 其它分类

`characters` 以外的分类先给占位面板：`未完成` 徽标 + 分类名 + 「共 N 项，目录 `path`」。

## 角色详情（PackageCharacterView）

- 左侧方头像 + 名字 + 所属组织；窄屏（`<=720px`）纵向排列。
- 右侧信息行：学院、所属组织、角色 ID、头像文件名（用 `<code>` 展示原始值）。
- **绑定骨骼**：`character.spines` 逐条渲染成 `.oa-bone` 按钮：
  - `exists: true` → 可点，标签「预览」，点击 `router.push({ name: 'skeletonPreview', query: { package, skeleton, character } })`；
  - `exists: false` → 置灰禁用，标签「缺失」，`title` 说明目录不存在。
- 直接访问不存在的 `nameId` 时给出 `rizui_infobox`（warning）。

## 数据来源

`usePackageContent(packageId)` 一次请求两个接口：

```ts
GET /api/packages/:id               // 包详情（package_info + contents）
GET /api/packages/:id/characters    // 角色索引（已补齐 avatarUrl / spines[].exists）
```

```ts
interface PackageCharacter {
  name_id: string;
  name: string;
  school: string;
  club: string;
  avatar: string;      // 头像文件名，缺头像时为空串
  avatarUrl: string;   // /api/packages/<id>/avatar/<file>；无头像时为空串
  spine: string[];     // characters.json 里的原始顺序
  spines: Array<{ id: string; exists: boolean }>;  // 后端探测 skeletons/ 下的目录
  hasSkeleton: boolean;
}
```

- 头像直接 `<img :src="avatarUrl">`，由后端按 package.yml 的 `avatar` 目录下发，前端不拼路径。
- **不做缓存**：三个页面都各自 `load()`，资源包随时可能被开发者改动。
- 错误统一走 `getJson()`：`!res.ok || !data.success` 时抛 `data.error`，页面用 `rizui_infobox type="error"` 展示。

## 卡片进出场

两级页面都用面板动画而不是列表卡：

| 阶段 | 选择器 | 关键帧 |
| --- | --- | --- |
| 进入 | `.is-entering .oa-pkg__card` / `.oa-charview__card` | `oa-panel-in`：上浮 38px + 缩到 0.985 |
| 离开 | `.is-leaving ...` | `oa-panel-out`：反向缩回并淡出 |

- 离场同样先播完再 `router.push`（`SHELL_TIMING.cardsExitWait`），`isLeaving` 是幂等闸门。
- 进入动画 760ms 后撤掉 `is-entering`，避免影响后续离场。

## 骨骼预览的按需加载

[SkeletonPreviewView.vue](../../packages/client/src/views/SkeletonPreviewView.vue) 支持两种入口：

1. **无 query**：走原有 `OASpineUploader`，用户手动选文件夹。
2. **带 `?package=&skeleton=`**：`loadSpineCharacterFromPackage()` 调
   `GET /api/packages/:id/skeleton/:skeletonId` 拿到文件清单，逐个 `fetch` 成 `Blob` 包成 `File`，
   再交给 `toSpineCharacters()` —— **与手动上传共用同一条渲染管线**。

- 自动加载失败时显示 `rizui_infobox type="error"` 并回到上传器，不会卡在白屏。
- 顶部返回按钮在自动加载模式下显示「角色详情」并回到 `packageCharacter`（用 query 里的 `character`）。

## 扩展

| 需求 | 做法 |
| --- | --- |
| 新分类内容页 | 在 `PackageView` 的 `activeSection` 分支里加 `<template v-else-if="activeSection === 'Sounds'">`，数据走新的 `/api/packages/:id/<kind>` |
| 角色排序 / 分组 | 改 `schoolGroups` 的 computed；分组顺序也在那里，后端顺序（按 `name_id`）只作为组内顺序 |
| 侧边栏加更多子条目 | 在 `navItems` 对应分类里补 `children`，并在 `handleNavSelect` 里按前缀分支处理（记得别让 `navModel` 收下子条目 id） |
| 角色立绘大图 | 后端已能下发立绘文件；新增 `GET /api/packages/:id/avatar` 之外的大图目录即可 |
| 骨骼预览页内切换立绘 | 预览页已带 `package` query，加一个立绘选择器后 `router.replace` 换 `skeleton` 即可 |

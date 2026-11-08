# 项目开发规范
# 任何更改都要记得及时更改文档！
-----------------------

## 命名规范

一句话原则：**看名字就能定位文件、看懂职责、判断能不能改**。下面的表是硬约定，新增代码直接照抄。

### 文件与目录

| 位置 | 约定 | 示例 |
| --- | --- | --- |
| 页面 | `views/<Name>View.vue` | `PackageView.vue` |
| 组件 | `components/<area>/OA<Name>.vue` | `OASpineViewer.vue` |
| 组合式 | `composables/use<Name>.ts`，一个文件一个 `use*()` | `usePackageContent.ts` |
| 配置常量 | `config/<area>.ts` | `routes.ts` |
| 路由 | `router/index.ts`（表）+ `router/access.ts`（闸门） | — |
| 网络层 | `api/request.ts`（封装）、`api/<domain>.ts`（接口） | `api/packages.ts` |
| 工具 | `utils/<topic>.ts` | `utils/format.ts` |
| Spine 资源解析 | 顶层 `spinePackage.ts` | — |
| Spine 渲染适配 | `spine/{runtime,types,backend,mode,webglBackend,canvasBackend}.ts` | — |
| 后端配置 | `config/<domain>.ts` | `config/publicUrl.ts` |
| 后端路由 | `routes/<domain>.ts` + `create<Domain>Router()` | `routes/packages.ts` |
| 共享 DTO | `packages/shared/src/types.ts` | — |

- **类型只定义一次**：跨端传输的结构放 `@our-archive/shared`，单端专用的就近放所属模块。
- 样式除 `style.css` 与内联 SVG 外一律 `<style scoped>`。

### 标识符

| 类别 | 约定 | 示例 |
| --- | --- | --- |
| 类型 / 接口 / 枚举 | PascalCase，**不加前缀** | `PackageMusic`、`SpineBackend` |
| 组件名 | 与文件名一致 | `OASpineViewer` |
| 函数 | 动词开头 camelCase | `readPackageMusic`、`formatBytes` |
| DOM 事件处理 | `handle<Thing>` | `handleNavSelect` |
| 供模板直绑的原生事件 | `on<Event>` | `onPointerDown` |
| 模板 ref | 语义 + `El` | `cardEl`、`audioEl` |
| 布尔 | `is` / `has` / `can` | `isEntering`、`hasSkeleton` |
| 常量 | SCREAMING_SNAKE_CASE | `SHELL_TIMING` |
| 组合式返回 | 状态与方法原名，不重命名 | `{ pkg, characters, load }` |
| 加载态 | `<thing>` / `<thing>Loading` / `<thing>Error` | `musicLoading`、`musicError` |
| 缩略词 | 后缀小写（`Id` / `Url`）；局部变量可用 `pkg` | `packageId`、`avatarUrl` |

**组合式对外只读**：状态用 `readonlyRef()` 暴露（见 `utils/reactivity.ts`），改写一律走返回的 setter / `load*()`。只有双向绑定（`v-model`）的状态保持可写，并在注释里写明原因。

**单例组合式**（`useAppShell` / `useGlobalConfig` / `useBackgroundMusic`）状态在模块作用域，必须在文件头注释标注「单例」；其余组合式每次调用新建实例。

### CSS

| 类别 | 约定 | 示例 |
| --- | --- | --- |
| block | `oa-<组件名 kebab>`，**每个组件只有一个 block** | `oa-pkg`、`oa-spine-viewer` |
| element / modifier | BEM `__` / `--` | `oa-pkg__head`、`oa-bubbles__bub--3` |
| 状态类 | `is-<state>` | `is-active`、`is-entering` |
| 过渡名 | `oa-<name>-fade` | `oa-res-tab-fade` |
| 全局变量 | `--oa-<name>` | `--oa-blue`、`--oa-scroll-thumb` |
| 外部库变量 | 保留库原名 | `--rizui_themecolor` |

- 类名必须带 `oa-` 前缀；**禁止**裸名（`splash-*`、`b1`）。
- 同一 block 不允许在两个组件里各写一份（视觉不同就换 block 名）。
- 跨页共享的布局件只有 `oa-slot`（定义在 `style.css`）与 `oa-card`。

### 数据 / API / 配置

| 类别 | 约定 | 示例 |
| --- | --- | --- |
| 路由参数 | camelCase，与数据 id 同名 | `:packageId`、`:nameId`、`:skeletonId` |
| 路由 name | camelCase | `skeletonPreview` |
| 跳转 query | 与路由参数同名 | `?packageId=&skeletonId=&nameId=` |
| API 路径参数 | 资源本身 `:id`，子资源 `<child>Id`，文件 `:file(*)` | `/:id/skeleton/:skeletonId` |
| 响应体 | 成功 `{ success: true, ... }`，失败 `{ success: false, error }`；列表带 `total` | — |
| 外载字段 | 原样透传 snake_case | `name_id` |
| 服务端派生字段 | camelCase | `avatarUrl`、`hasSkeleton` |
| 配置项键 | snake_case，前后端一致 | `main_bgm_volume` |
| 环境变量 | 私有项 `OUR_ARCHIVE_` 前缀（`PORT` 除外） | `OUR_ARCHIVE_DATA_DIR` |
| 错误文案 | 中文；客户端日志带 `[Our Archive]` 前缀 | — |

**请求只走 `api/`**：composable 与视图里不出现 `fetch` / URL 字面量；失败文案统一用 `apiErrorMessage()`。

### 外载格式（不可改）

外部资源由第三方分发，命名随资源包格式走，代码里原样读取、不做归一。

| 现状 | 约定 |
| --- | --- |
| `package.yml` 分类键：`Skeletons` / `BackgroundMusic` 为 PascalCase，`hasCharacter` 为 camelCase | 原样匹配，不做大小写归一 |
| `characters.json` 字段 `name_id` 为 snake_case，`spine` 指立绘 id 列表 | 数据侧保持原名；参数侧用 `nameId`，代码里一律说 `skeleton` |
| `preload_assets.yml` 的 `file_type` | 只认这一种拼写，不兜底别名 |

------------------------

## 前端UI库

除特殊需求外，前端统一使用 RizUI 组件库。RizUI 是一个轻量、可按需引入的 Vue 3 UI 组件库，提供常用组件与样式。

用法见 `node_modules/riz-ui` 或 https://rizui.yunhydrogen.top/#

- 整站亮色：`<html data-rizui-theme="light">` + `color-scheme: light`，组件上**不要**再写 `theme="Light"`。
- 组件主色跟随 `--rizui_themecolor: var(--oa-blue)`。
- 交互优先用 RizUI 已有组件，不要自造下拉、dialog、slider。

-------------------------------

## 前端UI字体

前端UI字体统一使用 `resources/UI.ttf`，通过 CSS 变量 `var(--oa-font)` 引用。请勿引入其他字体文件，以保持界面风格一致，除非有特殊需求。

--------------------------------

## 跨平台特性

尽量避免使用单一平台特性，同时前端要做好触屏优化。
# 项目开发规范

> **任何更改都要记得及时更改文档！** 代码与文档不同步的 PR 等于没写完。
> 文档地图见 [README.md](./README.md)，踩坑见 [NeedNotice.md](./NeedNotice.md)。

一句话原则：**看名字就能定位文件、看懂职责、判断能不能改**。下面的表是硬约定，新增代码直接照抄。

## 目录与命名

### 文件与目录

| 位置 | 约定 | 示例 |
| --- | --- | --- |
| 页面 | `views/<Name>View.vue` | `src/views/ResourcesView.vue` |
| 页面子目录 | 同一页私有件 **> 5 个**才开 `views/<topic>/` | `src/views/package/PackageView.vue` + `OAPackage*.vue` |
| 页面私有件 | `views/<topic>.ts` / `views/OA<Name>.vue`，**不立模块** | `views/splashTiming.ts`、`views/OAToolArt.vue` |
| 页面级样式 | 页面块样式可 `unscoped` 单独成文件，供同页多个组件共用 | `views/package/package.css`（`oa-pkg*`） |
| 功能模块 | `modules/<Domain>/`，一个模块只干一件事 | `modules/PackageProvider/` |
| 模块组件 | `modules/<Domain>/OA<Name>.vue` | `modules/SkeletonRender/OASpineViewer.vue` |
| 模块组合式 | `modules/<Domain>/use<Name>.ts` | `modules/AudioPlayer/useBackgroundMusic.ts` |
| 模块常量 | `modules/<Domain>/<topic>.ts` | `modules/Shell/shellTiming.ts` |
| 模块服务端文件 | `modules/<Domain>/<name>.server.ts` | `modules/Initializer/mountClient.server.ts` |
| 路由 | `modules/ViewsManager/router.ts`（表）+ `access.ts`（闸门）+ `routes.ts`（name / path 常量） | — |
| 网络层 | `modules/API/request.ts`（封装）、`modules/API/<domain>Api.ts`（接口） | `modules/API/packagesApi.ts` |
| 后端路由 | `modules/API/<domain>Routes.server.ts` + `create<Domain>Router()` | `packagesRoutes.server.ts` |
| 发行包构建 | `scripts/package.js`（流程）+ `tsup.release.config.ts`（内联依赖的服务端 bundle） | — |
| 跨端共享 | `modules/API/types.ts`（DTO）+ `utils/<topic>.ts`（纯函数） | `utils/format.ts` |

### 模块命名（语义角色后缀）

| 后缀 | 什么时候用 | 现有 |
| --- | --- | --- |
| `*Provider` | 解析源数据并供给组件，**不碰像素** | `PackageProvider` / `CharacterProvider` / `AudioProvider` / `EmotionProvider` / `BackgroundProvider` / `ConfigProvider` / `SkeletonRuntimeProvider` |
| `*Render` / `*Player` | 把数据画出来 / 播出来 | `SkeletonRender` / `EmotionRender` / `BackgroundRender` / `AudioPlayer` |
| `*Picker` | 交互选择，产出「用户选了什么」 | `ResourcePicker` |
| 无后缀 | 基础设施或装配层，领域名本身已说明问题 | `Initializer` / `API` / `Shell` / `ViewsManager` |

判定法：**去掉后缀别人还能猜对内容 → 就不要后缀**。

### `views/` 与 `modules/` 的边界（三问）

1. 换个页面还用得上吗？—— 用不上 → 进 `views/`
2. 只服务一个路由吗？—— 是 → 进 `views/`
3. 有独立能力边界吗（能被多处调用 / 可单独理解）？—— 才立模块

反例：`useSplashAudio` 只服务 splash → `views/`；`useBackgroundMusic` 只有 1 个文件但 BGM 跨页面常驻 → `modules/AudioPlayer/`。

### `.server.ts` 后缀

服务端与客户端代码**放在同一个模块目录**，唯一标记是文件名后缀：

- `*.server.ts`：仅服务端可 import（依赖 `node:*` / `express`），**浏览器侧绝不能 import**。
- 其余 `.ts` / `.vue` / `use*.ts`：客户端或跨端，**不得** import node 内置模块。

没有 `server/` 与 `client/` 目录之分，也没有 `shared/`：跨端 DTO 与请求封装在 `modules/API/`。

- **类型只定义一次**：跨端传输的结构放 `@/modules/API/types`，单端专用的就近放所属模块。
- 样式除 `style.css`、内联 SVG 与页面级共享样式文件（如 `views/package/package.css`）外，一律 `<style scoped>`。共用一套页面块样式的多个同级组件，必须集中到那个 unscoped 文件里，并在文件头写明原因——不要在 6 个组件里各复制一份。

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
- 页面块样式被同页多个组件共用时（例如资源包页的 `oa-pkg__toolbar` / `__state` / `__empty`），抽到该页的 `package.css` 之类的 unscoped 文件，并在文件头写清原因。

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

**请求只走 `modules/API/`**：composable 与视图里不出现 `fetch` / URL 字面量；失败文案统一用 `apiErrorMessage()`。

### 外载格式（不可改）

外部资源由第三方分发，命名随资源包格式走，代码里原样读取、不做归一。

| 现状 | 约定 |
| --- | --- |
| `package.yml` 分类键：`Skeletons` / `BackgroundMusic` 为 PascalCase，`hasCharacter` 为 camelCase | 原样匹配，不做大小写归一 |
| `characters.json` 字段 `name_id` 为 snake_case，`spine` 指立绘 id 列表 | 数据侧保持原名；参数侧用 `nameId`，代码里一律说 `skeleton` |
| `preload_assets.yml` 的 `file_type` | 只认这一种拼写，不兜底别名 |

外载格式的完整说明：预加载清单见 [docs/configs_doc/preload.md](../docs/configs_doc/preload.md)，
表情见 [docs/configs_doc/emotions.md](../docs/configs_doc/emotions.md)。

## UI 库与字体

- 除特殊需求外，前端统一用 **RizUI**（`riz-ui`），按需引入。用法见 `node_modules/riz-ui` 或 https://rizui.yunhydrogen.top/#。
- 整站亮色：`<html data-rizui-theme="light">` + `color-scheme: light`，组件上**不要**再写 `theme="Light"`。
- 组件主色跟随 `--rizui_themecolor: var(--oa-blue)`。
- 交互优先用 RizUI 已有组件，不要自造下拉、dialog、slider。
- 字体统一 `resources/UI.ttf`，通过 `var(--oa-font)` 引用；勿引入其他字体，除非有特殊需求。
- 页头一律用 `modules/ViewsManager/OAPageHeader.vue`（`title` / `subtitle` / `backLabel` / `backPosition` + `#actions` 插槽），不要再手写一套标题 + 返回按钮。

## 跨平台特性

尽量避免使用单一平台特性，同时前端要做好触屏优化（指针事件用 `pointer*`，不要只绑 `mouse*`）。

## 验证流程

改完代码至少走一遍：

```bash
npx vue-tsc -b        # 类型检查（前端 + 服务端一起检查；模板里的组件名也在这里暴露）
npm run build         # vue-tsc + vite build + tsup
```

- **服务端也被类型检查**：`src/**/*.server.ts` 不再只由 esbuild 剥类型，类型错误会直接失败。
- **动到页面的改动要开浏览器实测**：`npm run dev`（Vite 5173 + 后端 3000），逐条路由走一遍，并留意控制台的 `[Vue warn]`——组件没 import 时模板会静默失败，只有控制台会报 `Failed to resolve component`。
- **响应式改动要试窄窗口**：≤900px 与 ≤720px 的媒体查询分支容易把 flex 子项压成 0 高（见 [NeedNotice.md](./NeedNotice.md) 条目 54）。
- **动了打包脚本 / tsup 配置要真的启动一次发行包**：发行目录**复制到仓库外**再跑（仓库内会靠根 `package.json` 与上层 `node_modules` 蒙对），Windows / Linux / Android 三个目标都确认 `GET /`、`GET /api/packages`、`GET /plugins/*` 正常。见 [NeedNotice.md](./NeedNotice.md) 条目 55。
- 文档与代码同步：改完回到 `agents/modules/<模块>.md` / `agents/views/<页面>.md` 更新一次。

## 文档维护

- 文档地图与维护约定：[README.md](./README.md)。
- 新踩的坑写进 [NeedNotice.md](./NeedNotice.md) 的对应分组（六段格式 + 更新顶部索引表）。
- 功能入口有无记在 [ProjectDevelopProcess.md](./ProjectDevelopProcess.md)。

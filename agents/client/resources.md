# 资源管理页

覆盖：[views/ResourcesView.vue](../../packages/client/src/views/ResourcesView.vue)、[composables/useResourcePackages.ts](../../packages/client/src/composables/useResourcePackages.ts)

主界面「资源管理」→ `/resources`。这里是**资源包列表**（全部资源包预览）；工程 / 存档 / 插件三个分类只留标签与占位说明。点开某个资源包进入详情大卡片，见 [package.md](./package.md)。

## 路由与外壳

| 路由名 | 路径 | 组件 |
| --- | --- | --- |
| `resources` | `/resources` | `ResourcesView.vue` |
| `packageDetail` | `/resources/:packageId` | `PackageView.vue`（见 [package.md](./package.md)） |
| `packageCharacter` | `/resources/:packageId/character/:nameId` | `PackageCharacterView.vue`（见 [package.md](./package.md)） |

入口闸门见 [app-shell.md](./app-shell.md#入口闸门)。`App.vue` 只把路由同步到 `splash` / `home` 两个阶段，这三个路由都不匹配任何分支，`stage` 保持 `home`：底色、气泡、左下角 banner、设置按钮与 `main_bgm` 全部延续。

## 分类标签

`TABS` 是页面内常量（`{ id, label, ready, hint }`）：

| id | 标签 | ready |
| --- | --- | --- |
| `packages` | 资源包 | ✅ |
| `projects` | 工程 | ❌ 未完成 |
| `saves` | 存档 | ❌ 未完成 |
| `plugins` | 插件 | ❌ 未完成 |

- 未完成的标签**仍可点击**，只是切到虚线占位面板（`未完成` 徽标 + 一句 `hint`），而不是死标签。
- 标签行放在 `.oa-res__tabs-row`（`min(1120px, 100%)` 居中）里，胶囊本身 `width: fit-content`，与页面内容左对齐。
- 切换分类时整个面板套 `<Transition name="oa-tab-fade" mode="out-in">`：180ms 淡入 + 上移 8px，避免内容硬切。

## 数据来源

`useResourcePackages()` 请求 `GET /api/packages`，后端扫描 `<root>/res` 下每个带 `package.yml` 的一级目录（见 [server/packages.md](../server/packages.md)）。

```ts
interface ResourcePackage {
  id: string;          // 目录名
  name: string;        // package_info.name，缺省回退 id
  description: string;
  version: string;
  author: string;
  updatedAt: string;   // package.yml 的 mtime（ISO）
  valid: boolean;      // package.yml 是否解析成功
  error?: string;
  contents: PackageContent[];  // package_content，按清单顺序
}

interface PackageContent {
  key: string;        // Skeletons / hasCharacter / 自定义键
  label: string;      // 中文展示名（未知键回退键名）
  supported: boolean; // 作者是否声明包含
  path: string;       // 相对资源包目录
  index: string;      // hasCharacter 的索引文件名（缺省 characters.json）
  avatar: string;     // hasCharacter 的头像子目录（缺省 avatars）
  exists: boolean;    // 声明包含且目录存在
  count: number;      // 骨骼 = 立绘目录数，角色 = characters.json 条目数，其它 = 一级条目数
}
```

- composable 暴露 `packages / resourcesDir / loading / error / refresh`，**不做缓存**：资源包是磁盘上的文件，用户可能随时增删，进页面即扫、点「刷新」重扫。
- 失败时 `error` 填文案并清空列表；`loading` 与 `error` 同时用于工具栏的按钮禁用与提示。

## 卡片展示

只渲染**已声明可用**的分类（`contents.filter(c => c.supported)`），避免整卡都是灰条：

- 头部：`name` + 目录名 `id`，右侧 `version` 胶囊（有版本才显示）。
- 描述最多 3 行（`-webkit-line-clamp`）。
- 元信息：作者（缺省「未署名」）、`package.yml` 更新时间。
- 内容分类胶囊：`label` + 条目数；声明可用但目录不存在时转为黄色「缺失」样式。
- `valid: false` 时在卡片底部追加 `rizui_infobox`（`type="warn"`）显示解析错误，卡片本身仍列出。
- 整张卡可点（`role="button"` + Enter/Space），点击后先播离场再跳 `packageDetail`。卡片含 `rizui_infobox`，所以用 `div[role=button]` 而不是 `<button>`，避免交互组件嵌在按钮里。

## 空态与错误

| 状态 | 表现 |
| --- | --- |
| 扫描中 | 文案 + `rizui_progress`（`indeterminate`） |
| 请求失败 | `rizui_infobox type="error"`，文案带错误原因 |
| 没有资源包 | `rizui_infobox type="info"`，提示「把带 `package.yml` 的文件夹放进 `<resDir>`」 |
| 无可用分类声明 | 卡片底部显示「未声明可用资源」 |

工具栏右侧是 `rizui_button`（`theme="Light"`）的「刷新」，`loading` 时禁用。

## 卡片进出场

与 [tools.md](./tools.md#卡片进出场) 同一套语言，方向按「回主页」编排：

| 阶段 | 选择器 | 关键帧 |
| --- | --- | --- |
| 页面挂载 | `.oa-res.is-entering .oa-slot` | `oa-card-in`：从下方 52px、缩到 0.95 飞入 |
| 返回主页 / 进入资源包 | `.oa-res.is-leaving .oa-slot` | `oa-card-out`：`--exit-y: 52px` 向下坠、淡出 |

- 离场**先播完再 `router.push`**（`SHELL_TIMING.cardsExitWait`），否则动画被路由切换截断。
- 错峰沿用 `--enter-delay`：入场 `60 + 90n`，离场 `calc(var(--enter-delay) * 0.3)`。
- `isEntering` 900ms 后撤掉；`isLeaving` 幂等；`onBeforeUnmount` 清理两个定时器。
- `prefers-reduced-motion` 下关闭进出场动画。

## 扩展

| 需求 | 做法 |
| --- | --- |
| 打开资源目录 | 需要后端提供 `shell.openPath` 之类的本地能力，前端不要直接拼路径 |
| 新增分类 | `TABS` 追加一项并把 `ready` 置 false 先占位；实现后改 `ready` 并写面板 |
| 展示更多资源信息 | 扩展 `PackageContent`（如 `index` / `avatar` 字段），同步改 `server/config/packages.ts` |
| 资源包详情 / 角色详情 | 见 [package.md](./package.md) |

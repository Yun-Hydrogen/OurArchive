关联前端文件：
`packages/client/src/views/ResourcesView.vue` — 资源管理页（资源包 / 工程 / 存档 / 插件四个标签）
`packages/client/src/composables/useResourcePackages.ts` — 资源包索引（后端扫描结果 + 刷新）
`packages/client/src/api/packages.ts` — 资源包相关 HTTP 请求（统一校验包络）

用法：

### `refresh()`

1. 作用：进页面即扫一次资源包（磁盘上的文件随时可能增删，不做缓存）；「刷新」按钮再次重扫；失败时清空列表并把原因写进 `error`。
2. 输入：无；输出：无（内部改 `packages` / `resourcesDir` / `loading` / `error`）。
3. 注意事项：`loading` 与 `error` 用于工具栏按钮的禁用与提示；错误文案走 `apiErrorMessage()`。

### `useResourcePackages()` 的返回值

1. 作用：暴露列表与状态；2. 返回 `{ packages, resourcesDir, loading, error, refresh }`，其中状态只读（`readonlyRef`），改写只能走 `refresh()`。
2. 类型：`ResourcePackage`（含 `contents`、`valid`、`error`），定义在 `@our-archive/shared`，这里重新导出。
3. 注意事项：**不要**在视图里直接给 `packages.value` 赋值。

### `TABS`（`ResourcesView.vue` 内常量）

1. 作用：分类标签的唯一数据源；`ready: false` 时标签可点击，但内容区显示占位（`未完成` 徽标 + `hint`）。
2. 字段：`{ id, label, ready, hint }`；切换时整个面板套 `<Transition name="oa-res-tab-fade" mode="out-in">`（180ms 淡入 + 上移 8px）。
3. 注意事项：补齐工程 / 存档 / 插件时只改 `ready` 并写面板，不要改标签行的结构；占位文案与 `docs/planned_features.md` 对齐。

### `activeContents(pkg)`

1. 作用：只返回**已声明可用**的分类（`pkg.contents.filter(c => c.supported)`），避免卡片里出现整排灰条。
2. 输入：`ResourcePackage`；输出：`PackageContent[]`。
3. 注意事项：声明可用但目录不存在的项在 UI 上改为黄色「缺失」样式（由 `exists` 驱动）。

### `formatCount` / `formatDateTime`（`utils/format.ts`）

1. 作用：计数与更新时间格式化；2. `formatCount(0)` 返回空串（没有就不画数字）；`formatDateTime` 非法输入返回「未知」。
2. 输入输出：`number → string`、`string → string`。
3. 注意事项：视图里不要再就地写格式化函数，统一走 `utils/format.ts`。

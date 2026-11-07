关联前端文件：
`packages/client/src/views/PackageView.vue` — 资源包大卡片（左侧分类栏 + 右侧内容区）
`packages/client/src/views/PackageCharacterView.vue` — 角色详情
`packages/client/src/composables/usePackageContent.ts` — 单个资源包的内容（详情 + 角色 + 立绘 + 音乐）
`packages/client/src/api/packages.ts` — 资源包相关 HTTP 请求

用法：

### `navModel`（带写入闸门的可写 computed）

1. 作用：把 `v-model` 接到 `rizui_sidebar`；2. `rizui_nav` 选中子条目时会把 `modelValue` 改成子条目 id，这里拦住 `school:` 前缀的值，保证 `activeSection` 永远停在分类上；3. 学院子条目的定位走 `@select` 里的 `handleNavSelect`。
2. 输入输出：`get` 返回 `activeSection`；`set` 丢弃空值与 `school:` 前缀。
3. 注意事项：**不要**把 `v-model` 直接绑 `activeSection`（会被污染成 `school:…`，右侧 `v-if` 立刻失效）。

### `handleNavSelect(item)`（学院子条目定位）

1. 作用：点侧边栏的学院子条目时把 `activeSection` 拉回角色分类；2. 学院分组由 `schoolGroups` 按名字排序（组内保持 `name_id` 顺序）；3. 展开走 `toggleSchool(school)`，折叠动画用 `grid-template-rows: 0fr → 1fr` + `opacity` 过渡，内层必须 `min-height: 0; overflow: hidden` 才能收干净。
2. 输入：`NavItem`（`@select` 抛出的条目，`id` 形如 `school:<academy>`）；输出：无。
3. 注意事项：定位量用 `getBoundingClientRect` 差值算，不要用 `offsetParent`（换层后会偏）；`rizui_card` 的头部不是按钮，表头点击靠事件代理判定是否落在 `.ct-card-head` 上。

### `navIdOf(key)` / `activeContent`

1. 作用：`package.yml` 的键 → 侧边栏 id（只有 `hasCharacter` 归一成 `characters`）；2. `activeContent` 按侧边栏 id 反查 `pkg.contents`（`characters` → `hasCharacter`）。
3. 输入输出：`string → string`、`PackageContent | null`。
4. 注意事项：侧边栏**不过滤 `supported`**，`package.yml` 声明的每个类型都给出入口；右侧模板用 `activeContent?.supported` 分支，不支持时显示「未包含」，已声明但未实现时显示「未完成」。

### `activeKeyword`（可写 computed）

1. 作用：搜索框固定在页头右上角（卡片之外），按当前分类代理到各分类自己的搜索词；2. `searchPlaceholder` 返回空串时搜索框不渲染（占位面板不需要搜索）。
3. 输入输出：`string`（getter/setter）。
4. 注意事项：各分类的搜索词必须独立，切分类不串味。

### `isOpen(school)` / `isMountedContent(school)`（学院分组状态）

1. 作用：区分当前展开与已挂载；首次展开才挂载内容，收起只从 `expanded` 移除、**保留 `mounted`**（DOM 不销毁，下次展开仍有过渡也不重拉头像）；搜索时强制全部展开。
2. 输入：`school: string`；输出：`boolean`。
3. 注意事项：`expandAll()` 要同时写 `mounted`，否则第一次展开没有过渡。

### 骨骼清单按需加载

1. 作用：骨骼清单的项数由用户资源包决定（数据量取决于外载资源，不设上限），进页面只拉详情 + 角色；切到「骨骼」分类再 `loadSkeletons()`，composable 内用 `skeletonsLoaded` 去重；首次加载时摘要行显示「正在读取立绘目录…」。
2. 实现：`watch(activeSection)` 分支到 `loadSkeletons()` / `loadMusic()`，`immediate: true` 保证初次进入分类时触发。
3. 注意事项：骨骼和音乐用各自独立的 `*Loading` / `*Error` / `*Loaded` 三件套，不要复用页面的 `loading`。

### `toggleMusic(item)`（试听与主界面 BGM 互斥）

1. 作用：进入资源包试听时压住 `main_bgm`；同曲只在播放 / 暂停之间切换，换曲先压住再换 `src`。
2. 输入：`PackageMusic`；输出：无。
3. 注意事项：**不要**用 `<audio>` 的 `@pause` 事件恢复 `main_bgm`（换曲改 `src` 也会触发 `pause`，会先恢复再压住）；恢复只走「暂停按钮 / `@ended` / `stopMusic()`」三条显式路径。
4. 注意事项（试听音量）：`watch([audioEl, () => globalConfig.value.preview_volume])` 把试听音量同步到设置里的「预览音频 / 音效音量」。

### `isDescDialogOpen`（可写 computed）

1. 作用：`rizui_dialog` 的 `v-model:show` 需要可写 computed；2. `get` 看 `descDialogItem !== null`，`set` 在关闭时置 `null`；3. 弹窗放页面根部，避免随分类卸载；描述已在列表数据里，**不额外发请求**。
2. 注意事项：`hasMoreDescription()` 决定是否给「查看详细」按钮（`length > 42` 或含换行）。

### `previewSkeleton(id)` / `openCharacter(character)`（跳转参数）

1. 作用：从角色/骨骼进入预览或详情；2. query 键名与路由参数同名：`packageId` / `skeletonId` / `nameId`；3. 预览页据此决定「返回」目标：有 `nameId` 回角色详情，没有回资源包详情。
2. 输入输出：`string` / `PackageCharacter` → 无（内部 `leaveTo` 先播离场再 `router.push`）。
3. 注意事项：预览页的返回靠 query 里的 id，不要在预览页里再拼路径。

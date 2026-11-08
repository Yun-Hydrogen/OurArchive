关联前端文件：
`packages/client/src/views/PackageView.vue` — 资源包大卡片（左侧分类栏 + 右侧内容区）
`packages/client/src/views/PackageCharacterView.vue` — 角色详情
`packages/client/src/composables/usePackageContent.ts` — 单个资源包的内容（详情 + 角色 + 立绘 + 音乐 + 音效 + 背景 + 表情）
`packages/client/src/api/packages.ts` — 资源包相关 HTTP 请求
`packages/client/src/components/tools/OAEmotionPreview.vue` — 表情预览（立绘 + 表情叠加层 + 表情按钮）
`packages/client/src/components/tools/OAEmotionPlayer.vue` — 通用表情播放层（只解释关键帧，不含表情专属逻辑）
`packages/client/src/components/common/OACharacterPickerDialog.vue` — 角色选择对话框（Provider 的渲染端）
`packages/client/src/composables/useCharacterPicker.ts` — 角色选择 Provider（模块单例 + Promise API）

用法：

### `navModel`（带写入闸门的可写 computed）

1. 作用：把 `v-model` 接到 `rizui_sidebar`；2. `rizui_nav` 选中子条目时会把 `modelValue` 改成子条目 id，这里拦住 `school:` / `sound:` 前缀的值，保证 `activeSection` 永远停在分类上；3. 子条目的定位走 `@select` 里的 `handleNavSelect`，展开走 `@toggle` 里的 `handleNavToggle`。
2. 输入输出：`get` 返回 `activeSection`；`set` 丢弃空值与子条目前缀。
3. 注意事项：**不要**把 `v-model` 直接绑 `activeSection`（会被污染成 `school:…` / `sound:…`，右侧 `v-if` 立刻失效）。

### `handleNavToggle(payload)`（父条目展开即切换分类）

1. 作用：`rizui_nav` 里带 `children` 的条目点击只「展开 / 收起」，不会触发 `select`。展开角色 / 音效时顺带把 `activeSection` 切过去，避免「展开音效却还停在角色」。
2. 输入：`{ item: NavItem; expanded: boolean }`；输出：无。
3. 注意事项：只在 `expanded === true` 时切换；收起不切，否则点一下父条目就把内容换掉。

### `handleNavSelect(item)`（学院 / 音效类别子条目定位）

1. 作用：点侧边栏子条目时把 `activeSection` 拉回对应分类，再定位内容区。学院子条目走 `openSchool(school)` + 滚动高亮；音效类别子条目写 `activeSoundCategory`（中文标签），数据没到时先 `await loadSounds()` 并把列表滚回顶部。
2. 输入：`NavItem`（`id` 形如 `school:<学院>` / `sound:<类别标签>`；`sound:` 本身是「全部」）；输出：无。
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

1. 作用：骨骼清单的项数由用户资源包决定（数据量取决于外载资源，不设上限），进页面只拉详情 + 角色；切到「骨骼」分类再 `loadSkeletons()`，切到「背景音乐」再 `loadMusic()`，切到「音效」再 `loadSounds()`，切到「背景」再 `loadBackgrounds()`，composable 内用 `*Loaded` 去重；首次加载时摘要行显示「正在读取…」。
2. 实现：`watch(activeSection)` 分支到 `loadSkeletons()` / `loadMusic()` / `loadSounds()` / `loadBackgrounds()`，`immediate: true` 保证初次进入分类时触发。
3. 注意事项：骨骼、音乐、音效、背景用各自独立的 `*Loading` / `*Error` / `*Loaded` 三件套，不要复用页面的 `loading`。音效 3000+ 条、背景上百张图都走同样的按需加载，不要进页面就拉。

### `toggleMusic(item)` / `toggleSound(item)`（试听与主界面 BGM 互斥）

1. 作用：进入资源包试听时压住 `main_bgm`；同条只在播放 / 暂停之间切换，换条先压住再换 `src`。音乐与音效共用同一个 `<audio ref="audioEl">`（常驻在页面根部），「当前在播谁」只有 `playingItem: { kind, id } | null` 一份状态，`isPlayingItem(kind, id)` 供两边模板判断高亮 / 图标 / 进度条。
2. 输入：`PackageMusic` / `PackageSound`；输出：无。
3. 注意事项：**不要**用 `<audio>` 的 `@pause` 事件恢复 `main_bgm`（换曲改 `src` 也会触发 `pause`，会先恢复再压住）；恢复只走「暂停按钮 / `@ended` / `stopMusic()`」三条显式路径。`@ended` 必须清空 `playingItem` 并把 `currentTime` 归零，否则播放键会停在末尾，再点没声音。
4. 注意事项（试听音量）：`watch([audioEl, () => globalConfig.value.preview_volume])` 把试听音量同步到设置里的「预览音频 / 音效音量」。

### 音效类别（`categories.json` 映射）

1. 作用：音效类别做成**侧边栏子条目**（和角色学院同一套交互：`全部` + 各中文类别，带条数），不使用顶部分类按钮。
2. 逻辑：`activeSoundCategory` 存的是映射后的**中文标签**，`soundCategoryGroups` 把映射到同一标签的原始键合并（例如 `FX` / `Other` 都是「其他」），`activeSoundKeys` 再反查出这些键供 `filteredSounds` 过滤；`soundGroups` 负责内容区分组，组内保持索引顺序、组间按中文 label 排序（与后端一致）。
3. 注意事项：`soundGroups` 的组内空类别回退 `Other`，与后端的 `category || 'Other'` 对齐；不要在前端硬编码类别名，也不要按原始键直接展示（会出现两个同名「其他」）。

### 背景分类与缩略图（`index/category.yml`）

1. 作用：背景分类同样是**侧边栏子条目**（`bg:<分类 id>`）；后端下发的每个分类最多只有一层图片，前端不做递归。
2. 逻辑：`activeBackgroundCategory` 是 `string | null`——`null` 表示「全部」（进分类默认），空串是合法的「未分类」（直接放在背景目录根下的图片）。`backgroundGroups` 按选中分类过滤、再按搜索词过滤图片，`showBackgroundGroupTitle` 决定要不要显示分类标题（看全部时显示）。
3. 注意：`category.yml` 的说明文字在 `activeBackgroundCategoryInfo.description`，只在选中具体分类时展示；点击缩略图走 `openBackgroundPreview(image)` 开大图弹窗（`isBackgroundDialogOpen` 是可写 computed），切分类时弹窗自动关闭；缩略图 `loading="lazy"`，上百张图也不会一次性解码。

### 表情：预览角色选择（`useCharacterPicker` + `OACharacterPickerDialog`）

1. 作用：`openCharacterPicker(items, options)` 返回 `Promise<CharacterPickItem | null>`，由常驻的 `OACharacterPickerDialog` 渲染；页面不需要自己维护弹窗状态，任何组件都能唤起同一个对话框。
2. 候选列表由 `PackageView.buildCharacterChoices()` 组装：
   - `角色立绘`：`characters` 里每条 `spines[].exists === true` 的记录（`label` 用角色名，`skeletonId` 用立绘目录 id）；
   - `独立立绘`：`skeletons` 里 `complete` 且没被任何角色引用的目录。
3. 注意事项：`openCharacterPicker` 会先把上一次未完成的 Promise 以 `null` 结束，避免两个选择流程叠在一起；`PackageView` 卸载时要 `disposeCharacterPicker()`，否则 Promise 永远挂着。

### 表情：`OAEmotionPreview`

1. 作用：左侧 `useSpineStage` 画立绘（与工具页同一条渲染管线），右侧列出表情按钮；点按钮把表情交给 `OAEmotionPlayer` 播放。立绘下载走 `loadSpineCharacterFromPackage(packageId, skeletonId)`。
2. 对齐：`useSpineStage` 额外暴露 `metrics`（`unit` / `anchorX` / `anchorY`）——`unit = 角色屏幕高度 / 1012`，`anchorY` 是包围盒上沿（头顶）。表情层据此定位与缩放，所以拖动 / 缩放立绘时表情跟着走。
3. 注意事项：没有选立绘时点表情会改为唤起选择框（避免「点了没反应」）；`emotionPreview.stop()` 在切走分类时调用，切走时正在播放的表情会被清掉。

### 表情：`OAEmotionPlayer`（关键帧解释器）

> 表情配置的完整写法（坐标系、图层、关键帧、模板与排错）见 [docs/configs_doc/emotions.md](../../../docs/configs_doc/emotions.md)；
> 第三方播放器的逆向记录与后续待办见 [agents/emotionstodo.md](../../emotionstodo.md)。

1. 作用：把 `PackageEmotion.layers[].keyframes` 翻译成 Web Animations（`element.animate`），播完自动销毁；音效跟随「预览音频 / 音效音量」，并压住主界面 BGM。
2. 数据口径：根层宽度 = `scale × 540 × unit`；子层宽度 = `scale × 父层宽度`；`position` 根层按 `540 × unit` 换算、子层按父层宽度换算（x/y 同乘宽度）；关键帧里 `zoom` 是相对基准宽度的倍率，`x/y` 是 540 设计单位位移，`rotate` 是角度。
3. 注意事项：**图层容器必须是 `div`**，`<img>` 是替换元素、不能承载子层；关键帧 `offset` 必须严格递增，重复时间点会让 `animate()` 抛错（代码里已去重并补末帧）。

### `isDescDialogOpen`（可写 computed）

1. 作用：`rizui_dialog` 的 `v-model:show` 需要可写 computed；2. `get` 看 `descDialogItem !== null`，`set` 在关闭时置 `null`；3. 弹窗放页面根部，避免随分类卸载；描述已在列表数据里，**不额外发请求**。
2. 注意事项：`hasMoreDescription()` 决定是否给「查看详细」按钮（`length > 42` 或含换行）。

### `previewSkeleton(id)` / `openCharacter(character)`（跳转参数）

1. 作用：从角色/骨骼进入预览或详情；2. query 键名与路由参数同名：`packageId` / `skeletonId` / `nameId`；3. 预览页据此决定「返回」目标：有 `nameId` 回角色详情，没有回资源包详情。
2. 输入输出：`string` / `PackageCharacter` → 无（内部 `leaveTo` 先播离场再 `router.push`）。
3. 注意事项：预览页的返回靠 query 里的 id，不要在预览页里再拼路径。

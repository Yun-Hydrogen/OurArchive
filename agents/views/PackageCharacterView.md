# PackageCharacterView — 角色详情：立绘头像、所属组织与绑定骨骼列表

> 路由：`/resources/:packageId/character/:nameId`
> 源码：`src/views/PackageCharacterView.vue`、`src/views/OACharacterDetail.vue`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `src/views/PackageCharacterView.vue` | 页面外壳：路由参数提取、数据就绪监听、页头与进退场动画控制 |
| `src/views/OACharacterDetail.vue` | 角色卡片呈现：头像立绘展示、详细信息列表、绑定骨骼清单与点击跳转 |
| `src/modules/PackageProvider/usePackageContent.ts` | 资源包详情与角色数据管理（`pkg`、`characters`、`loading`、`error`、`load`） |
| `src/modules/ViewsManager/OAPageHeader.vue` | 统一页头组件：标题、副标题、返回上级按钮（`backPosition="start"`） |
| `src/modules/ViewsManager/useEnterAnimation.ts` | 控制卡片等待数据就绪后统一飞入的入场钩子 |
| `src/modules/ViewsManager/routes.ts` | 目标路由常量：`packageDetail`、`skeletonPreview` |
| `src/modules/Shell/shellTiming.ts` | `SHELL_TIMING`：卡片退场时长与等待延时常量 |

## 页面结构

- 页头：挂载 `modules/ViewsManager/OAPageHeader.vue`，标题为角色名（或 `nameId` 兜底），副标题展示 `学院 · 社团`（无社团时展示学院），`back-label` 为资源包名称，`back-position="start"`（返回按钮置于标题左侧），监听 `@back="backToPackage"`。
- 主体容器（`.oa-charview`）：
  - 页面本身透明，复用 App 外壳常驻的底色与气泡。
  - 数据由 `usePackageContent(packageId.value)` 供给，组件挂载时调用 `load()`。
  - 采用 `<Transition name="oa-swap" mode="out-in">` 切换「加载中（`oa-charview__state` 进度条）」/「错误提示」/「未找到角色提示」/「角色卡片（`<OACharacterDetail>`）」。
  - 卡片布局（`.oa-charview__card`）：左侧为头像立绘区（`.oa-charview__portrait`，自适应正方形头像、角色名与社团名），右侧为信息与骨骼绑定区（`.oa-charview__info`）。

## 关键实现

### `useEnterAnimation(() => !loading.value, 900)`

1. 作用：页面入场动画控制，等待角色信息加载完毕后，驱动卡片从下方平移 38px 飞入。
2. 输入输出：就绪判断 `() => !loading.value`，动画时长 900ms；返回 `{ isEntering }`。
3. 注意事项：与资源管理及资源包页逻辑一致，确保进度条淡出与卡片飞入无缝交接，见 [NeedNotice](../NeedNotice.md) 条目 52。

### `openSkeleton(skeletonId)`

1. 作用：点击角色卡片上已绑定的骨骼标签，直接跳转至立绘骨骼预览页面。
2. 输入输出：`skeletonId: string`；无返回值。
3. 注意事项：调用 `leaveTo()` 统一管道，携带完整的 `query: { packageId, skeletonId, nameId }`。预览页收到 `nameId` 时，页头返回按钮会自动指回「角色详情」；若缺失则只能回退到「资源包」。

### `backToPackage()`

1. 作用：点击页头返回按钮回到所属资源包大卡片详情页。
2. 输入输出：无入参；无返回值。
3. 注意事项：调用 `leaveTo({ name: ROUTE_NAMES.packageDetail, params: { packageId } })`，播完离场动画再跳路由。

### `leaveTo(target)`

1. 作用：统一调度离场动画与异步路由跳转。
2. 输入输出：`target: { name: string, params?, query? }`；无返回值。
3. 注意事项：包含 `isLeaving` 防连击闸门，通过 `setTimeout` 等待 `SHELL_TIMING.cardsExitWait`（320ms）卡片离场播完后执行 `router.push(target)`。见 [NeedNotice](../NeedNotice.md) 条目 33。

## 交互与状态

- **立绘头像降级**：若角色配置了 `avatarUrl` 则渲染 `<img>`（采用 `object-position: center top` 聚焦头部）；若无头像或加载失败则回退展示角色首字的文字圆形占位。
- **骨骼缺失提示**：在 `<OACharacterDetail>` 中，若绑定的骨骼在资源包实际目录中不存在（`!spine.exists`），按钮打上 `.is-missing` 样式、徽标展示为「缺失」并禁用点击（`disabled`）。
- **页面离场动效**：激活 `isLeaving` 后，`.oa-charview__card` 运行 `oa-panel-out var(--cards-exit, 260ms)` 向下平移 38px 缩小淡出，完成后切换路由。

## 注意事项

- 页头返回按钮必须指定 `back-position="start"`，确保返回箭头位于角色标题之前，与大页面层级的排布习惯一致。
- 跳转到骨骼预览页时必须在 `query` 中带上 `nameId`，否则预览页无法获知上一级为角色页，会导致返回按钮错跳回资源包首页。
- 卡片进退场关键帧样式必须挂在卡片外壳，内部组件 `OACharacterDetail` 仅负责像素呈现与 `@openSkeleton` 事件向上抛出。
- 组件销毁前（`onBeforeUnmount`）必须清理 `leaveTimer` 定时器。

## 相关文档

- [PackageView](./PackageView.md)
- [SkeletonPreviewView](./SkeletonPreviewView.md)
- [PackageProvider](../modules/PackageProvider.md)
- [ViewsManager](../modules/ViewsManager.md)
- [NeedNotice](../NeedNotice.md)

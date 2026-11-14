# 开发进度

> 只记录**界面上的入口**：✅ = 有入口且已完成，🟡 = 有入口但只完成一部分，⬜ = 有入口但未开发。
> 资源包内容为外载资源，不在本文档统计；模块内部的完成度见 `agents/modules/<模块>.md`。

## 路由总览

| 路由 | 页面 | 状态 |
| --- | --- | --- |
| `/` | `views/SplashView.vue` | ✅ |
| `/home` | `views/HomeView.vue` | 🟡 两个业务入口未接 |
| `/tools` | `views/ToolsView.vue` | ✅ |
| `/tools/skeleton` | `views/SkeletonPreviewView.vue` | ✅ |
| `/resources` | `views/ResourcesView.vue` | 🟡 4 个标签里 3 个是占位 |
| `/resources/:packageId` | `views/package/PackageView.vue` | ✅（Popups 分类仍是占位） |
| `/resources/:packageId/character/:nameId` | `views/PackageCharacterView.vue` | ✅ |

## 启动画面（`/`）

| 入口 | 状态 |
| --- | --- |
| 白屏引导 → banner → TOUCH TO START → 停靠过渡 | ✅ |

## 主界面（`/home`）

| 入口 | 状态 |
| --- | --- |
| 编辑模式（左列前景卡） | ⬜ 点击无反应 |
| 阅读模式（左列后景卡） | ⬜ 点击无反应 |
| 3D场景（右列上排左） | ⬜ 点击无反应 |
| 资源管理（右列上排右） | ✅ → `/resources` |
| 更多功能（右列下排） | ✅ → `/tools` |

## 工具页（`/tools`）

| 入口 | 状态 |
| --- | --- |
| 立绘骨骼预览（工具卡） | ✅ → `/tools/skeleton` |

## 资源管理（`/resources`）

| 入口 | 状态 |
| --- | --- |
| 资源包 标签 | ✅ 列表 / 空态 / 刷新 / 卡片内容分类 chips |
| 工程 标签 | ⬜ 占位面板 |
| 存档 标签 | ⬜ 占位面板 |
| 插件 标签 | ⬜ 占位面板 |

## 资源包详情（`/resources/:packageId`）

| 入口 | 状态 |
| --- | --- |
| 角色（侧边栏） | ✅ 学院分组 / 折叠 / 搜索 / 侧边栏定位高亮 |
| 角色 → 角色详情 | ✅ |
| Skeletons 骨骼（侧边栏） | ✅ 立绘列表 / 展开文件 / 预览 |
| BackgroundMusic 背景音乐（侧边栏） | ✅ 播放 / 进度 / 描述弹窗 |
| Sounds 音效（侧边栏） | ✅ 类别子条目 / 搜索 / 播放 / 进度 / 时长 |
| Backgrounds 背景（侧边栏） | ✅ 分类子条目 / 搜索 / 缩略图 / 大图灯箱 |
| Emotions 表情（侧边栏） | ✅ 选择立绘 / 19 种表情叠加播放 / 缩放平移 |
| Popups 弹窗（侧边栏） | ⬜ 「未完成」占位面板 |
| 页头搜索框 | ✅ 按当前分类自动切换占位文案 |

## 角色详情（`/resources/:packageId/character/:nameId`）

| 入口 | 状态 |
| --- | --- |
| 学院 / 组织 / 角色 ID / 头像 | ✅ |
| 绑定骨骼 → 立绘预览（带 `packageId` / `skeletonId` / `nameId` 参数） | ✅ |

## 立绘骨骼预览（`/tools/skeleton`）

| 入口 | 状态 |
| --- | --- |
| 本地文件夹选择 / 拖拽载入 | ✅ |
| 从资源包直接载入 | ✅ |
| 立绘差分切换 | ✅ |
| 动作播放（含静态） | ✅ |
| 缩放 / 平移 / 重置视角 | ✅ |
| 骨骼调试开关 | ✅ |
| 渲染器模式切换（WebGL / Canvas 2D） | ✅ |
| 返回来源判断（有 `nameId` 回角色详情，否则回工具页） | ✅ |

## 设置与关于

| 入口 | 状态 |
| --- | --- |
| 主界面背景音乐音量 | ✅ |
| 预览音频 / 音效音量 | ✅ |
| 立绘渲染器模式 | ✅ |
| 关于弹窗（点击左下角停靠 banner） | ✅ |

## 待办（按入口归口）

| 待办 | 落点 |
| --- | --- |
| 编辑模式 / 阅读模式 / 3D场景 | 三张主界面卡片的跳转目标都还没定，接口留空即可 |
| 工程 / 存档 / 插件 标签 | `views/ResourcesView.vue` 的 `TABS` 里 `ready: false` |
| Popups 分类 | 后端已能计数并在侧边栏列出，右侧落到通用「未完成」占位面板；缺前端渲染器 |
| `preload` 静态资源分发 | 见 [docs/configs_doc/preload.md](../docs/configs_doc/preload.md) |

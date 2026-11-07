# Client — 前端索引

源码 [packages/client](../../packages/client)：Vue 3 + Vite 6 + TypeScript + vue-router 4。

| 文档 | 覆盖 | 说明 |
| --- | --- | --- |
| [app-shell.md](./app-shell.md) | `main.ts`、`App.vue`、`router/`、`composables/useAppShell.ts`、`components/common/OABannerDock.vue`、`style.css`、`config/`、`vite.config.ts` | 入口、路由与入口闸门、常驻外壳（底色 / 气泡 / banner / 设置）、banner 停靠动画、字体与全局变量、资源别名 |
| [splash.md](./splash.md) | `views/SplashView.vue`、`components/splash/`、`components/common/OABubbles.vue` | 启动画面：白屏引导、banner、TOUCH TO START、离场过渡 |
| [home.md](./home.md) | `views/HomeView.vue`、`components/home/OACardArt.vue`、`config/home.ts` | 主界面：卡槽叠放、卡片入场、极简卡片与内联 SVG 插画、背景音乐继承 |
| [tools.md](./tools.md) | `views/ToolsView.vue`、`components/tools/OAToolArt.vue`、`config/tools.ts` | 工具页：TOOL_ENTRIES、工具卡插画、卡片进出场 |
| [resources.md](./resources.md) | `views/ResourcesView.vue`、`composables/useResourcePackages.ts` | 资源管理页：资源包 / 工程 / 存档 / 插件四个标签，资源包列表与空态 |
| [package.md](./package.md) | `views/PackageView.vue`、`views/PackageCharacterView.vue`、`composables/usePackageContent.ts` | 资源包大卡片（左侧分类栏 + 角色列表）、角色详情、骨骼预览的按需加载 |
| [skeleton-preview.md](./skeleton-preview.md) | `views/SkeletonPreviewView.vue`、`components/tools/OASpine*.vue`、`composables/useSpinePackage.ts`、`composables/useSpineStage.ts`、`composables/spine/` | 立绘骨骼预览：立绘包识别、WebGL / Canvas 2D 双渲染后端与 `spine_renderer` 模式、预乘 alpha、差分与动作、按需重绘、面板控件 |
| [mouse-spark.md](./mouse-spark.md) | `components/common/OAMouseSpark.vue`、`composables/useMouseSpark.ts` | 全局鼠标交互与点击粒子动效 |
| [WARN.md](./WARN.md) | 全部客户端模块 | **踩坑总集**：46 条按「位置 / 表现 / 解决方案 / 原理 / 效果 / 备注」记录，改代码前先扫对应分组 |

## 目录

```
packages/client/src/
├── main.ts                # createApp + router
├── App.vue                # 常驻外壳：底色 / 气泡 / banner / 设置 + <router-view /> + 点击特效
├── style.css              # @font-face、:root 变量、全局重置
├── router/
│   ├── index.ts           # 路由表 + 入口闸门 beforeEach
│   └── access.ts          # isUnlocked / unlockApp
├── config/
│   ├── routes.ts          # ROUTE_NAMES、ROUTE_PATHS
│   ├── assets.ts          # SPLASH_ASSETS、HOME_ASSETS
│   ├── splash.ts          # SPLASH_TIMING、SPLASH_SOUND_VOLUME
│   ├── transition.ts      # SHELL_TIMING（banner 停靠 / 卡片入场与离场）
│   ├── tools.ts           # TOOL_ENTRIES
│   └── home.ts            # HOME_MENU
├── api/                   # request.ts（封装）、packages.ts / config.ts（接口）
├── utils/                 # format.ts、reactivity.ts（readonlyRef）
├── spinePackage.ts        # 立绘包识别与装配（非 composable）
├── spine/                 # 渲染适配：backend、mode、webglBackend、canvasBackend
├── composables/           # useAppShell、useBannerSequence、useSplashAudio、useBackgroundMusic、useMouseSpark、useGlobalConfig、useSpineStage、useResourcePackages、usePackageContent
├── components/
│   ├── common/            # OAMouseSpark.vue、OABubbles.vue、OABannerDock.vue、OASettingsButton.vue、OASettingsModal.vue
│   ├── home/              # OACardArt.vue（卡片插画，内联 SVG）
│   ├── tools/             # OAToolArt.vue、OASpineUploader.vue、OASpineViewer.vue
│   └── splash/            # OABannerSvg.vue（仅横幅 SVG）
└── views/
    ├── SplashView.vue     # splash 整页
    ├── HomeView.vue       # 主界面整页
    ├── ToolsView.vue      # 工具列表页
    ├── ResourcesView.vue  # 资源管理页（资源包 / 工程 / 存档 / 插件）
    ├── PackageView.vue    # 资源包大卡片（左侧分类 + 右侧内容）
    ├── PackageCharacterView.vue  # 资源包内的角色详情
    └── SkeletonPreviewView.vue  # 立绘骨骼预览
```

## 约定

- 新增页面后同步更新本索引与 [app-shell.md](./app-shell.md) 的路由表。

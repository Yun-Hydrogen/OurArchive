# Client — 前端索引

源码 [packages/client](../../packages/client)：Vue 3 + Vite 6 + TypeScript + vue-router 4。

| 文档 | 覆盖 | 说明 |
| --- | --- | --- |
| [app-shell.md](./app-shell.md) | `main.ts`、`App.vue`、`router/`、`composables/useAppShell.ts`、`components/common/OABannerDock.vue`、`style.css`、`config/`、`vite.config.ts` | 入口、路由与入口闸门、常驻外壳（底色 / 气泡 / banner / 设置）、banner 停靠动画、字体与全局变量、资源别名 |
| [splash.md](./splash.md) | `views/SplashView.vue`、`components/splash/`、`components/common/OABubbles.vue` | 启动画面：白屏引导、banner、TOUCH TO START、离场过渡 |
| [home.md](./home.md) | `views/HomeView.vue`、`components/home/OACardArt.vue`、`config/home.ts` | 主界面：卡槽叠放、卡片入场、极简卡片与内联 SVG 插画、背景音乐继承 |
| [tools.md](./tools.md) | `views/ToolsView.vue`、`components/tools/OAToolArt.vue`、`config/tools.ts` | 工具页：TOOL_ENTRIES、工具卡插画、卡片进出场 |
| [skeleton-preview.md](./skeleton-preview.md) | `views/SkeletonPreviewView.vue`、`components/tools/OASpine*.vue`、`composables/useSpinePackage.ts`、`composables/useSpineStage.ts` | 立绘骨骼预览：立绘包识别、Spine 4.2 渲染、差分与动作、面板控件 |
| [mouse-spark.md](./mouse-spark.md) | `components/common/OAMouseSpark.vue`、`composables/useMouseSpark.ts` | 全局鼠标交互与点击粒子动效 |

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
├── composables/           # useAppShell、useBannerSequence、useSplashAudio、useBackgroundMusic、useMouseSpark、useGlobalConfig、useSpinePackage、useSpineStage
├── components/
│   ├── common/            # OAMouseSpark.vue、OABubbles.vue、OABannerDock.vue、OASettingsButton.vue、OASettingsModal.vue
│   ├── home/              # OACardArt.vue（卡片插画，内联 SVG）
│   ├── tools/             # OAToolArt.vue、OASpineUploader.vue、OASpineViewer.vue
│   └── splash/            # OABannerSvg.vue（仅横幅 SVG）
└── views/
    ├── SplashView.vue     # splash 整页
    ├── HomeView.vue       # 主界面整页
    ├── ToolsView.vue      # 工具列表页
    └── SkeletonPreviewView.vue  # 立绘骨骼预览
```

## 约定

- 页面放 `views/`，可复用 UI 放 `components/<feature>/`，状态与时序放 `composables/`，常量放 `config/`。
- **不要为一个页面拆碎组件**：只在组件被多处复用、或体积过大（如 34KB 的 SVG）时才独立成文件。
- 别名：源码用 `@`，仓库资源用 `@resources`，不写 `../` 穿越。
- 字体只用 `var(--oa-font)`；不加载任何外部资源（字体、CDN、统计脚本）。
- 新增页面后同步更新本索引与 [app-shell.md](./app-shell.md) 的路由表。

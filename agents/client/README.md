# Client — 前端索引

源码 [packages/client](../../packages/client)：Vue 3 + Vite 6 + TypeScript + vue-router 4。

| 文档 | 覆盖 | 说明 |
| --- | --- | --- |
| [app-shell.md](./app-shell.md) | `main.ts`、`App.vue`、`router/`、`style.css`、`config/`、`vite.config.ts` | 入口、路由、字体与全局变量、资源别名 |
| [splash.md](./splash.md) | `views/SplashView.vue`、`components/splash/`、`composables/` | 启动画面（当前唯一页面） |

## 目录

```
packages/client/src/
├── main.ts                # createApp + router
├── App.vue                # 仅 <router-view />
├── style.css              # @font-face、:root 变量、全局重置
├── router/index.ts        # 路由表
├── config/
│   ├── routes.ts          # 路由名与路径常量
│   ├── assets.ts          # SPLASH_ASSETS
│   └── splash.ts          # SPLASH_TIMING、SPLASH_SOUND_VOLUME
├── composables/           # useBannerSequence、useSplashAudio
├── components/splash/     # OABannerSvg.vue（仅横幅 SVG）
└── views/SplashView.vue   # splash 整页
```

## 约定

- 页面放 `views/`，可复用 UI 放 `components/<feature>/`，状态与时序放 `composables/`，常量放 `config/`。
- **不要为一个页面拆碎组件**：只在组件被多处复用、或体积过大（如 34KB 的 SVG）时才独立成文件。
- 别名：源码用 `@`，仓库资源用 `@resources`，不写 `../` 穿越。
- 字体只用 `var(--oa-font)`；不加载任何外部资源（字体、CDN、统计脚本）。
- 新增页面后同步更新本索引与 [app-shell.md](./app-shell.md) 的路由表。

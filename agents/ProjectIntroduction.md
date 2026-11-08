# Our Archive — 项目说明

Our Archive 是一个独立的同人视觉小说模拟器，主要服务于《蔚蓝档案》风格的视觉小说，但也可用于其他视觉小说风格。

Our Archive 旨在为玩家提供一个创作和体验视觉小说风格剧情的工具。通过该项目，用户可以编写、编辑和模拟视觉小说剧情，管理角色与对话，并以视觉小说形式进行演出。


| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vite 6 + TypeScript + vue-router 4 |
| UI | RizUI（`riz-ui`，RizUI 组件按需引入） |
| Spine | 官方 Spine Runtimes 4.2（按需下载到用户资源目录 `plugins/spine/`，仅立绘预览路由动态加载，默认 WebGL） |
| 后端 | Node.js + Express 4 + TypeScript |
| 构建 | tsup（服务端）、@yao-pkg/pkg（可选单文件 exe） |
| 包管理 | npm workspaces |

## 目录

```
OurArchive/
├── preload_assets.yml      # 预加载资源索引清单（项目根目录）
├── docs/                   # 开发者文档（preload-guide.md 等）
├── agents/                 # Agent 协作文档（Project.md + client/ + server/）
├── resources/              # 项目自带美术 / 音频（不进入用户数据目录）
│   ├── UI.ttf              # 全站字体
│   └── OurArchive/         # banner SVG、音效、LICENSE
├── packages/
│   ├── client/             # Vue 3 前端
│   │   └── src/
│   │       ├── main.ts App.vue style.css
│   │       ├── router/ config/ composables/
│   │       ├── components/          # common/ home/ splash/ tools/
│   │       ├── spine/               # 运行时动态加载、渲染后端
│   │       └── views/               # SplashView.vue、HomeView.vue、ToolsView.vue、ResourcesView.vue、SkeletonPreviewView.vue
│   └── server/             # Express 后端
│       └── src/
│           ├── index.ts             # 启动编排
│           ├── app/mountClient.ts   # 静态托管 + SPA fallback
│           ├── routes/              # preload.ts、config.ts、packages.ts
│           ├── config/              # paths / storage / server / publicUrl / preload / packages
│           └── utils/               # banner
└── scripts/                # 打包脚本与启动脚本 (package.js / bat / sh)
```

## 用户数据目录

| 平台 | 资源根目录 |
| --- | --- |
| Windows | `C:\Users\<用户>\Documents\OurArchive` |
| Linux | `/home/<用户>/OurArchive` |
| Android | `/sdcard/OurArchive` |

固定子目录：`res/`（素材）、`preload/`（预加载）、`config/`（配置，当前包含 `global_config.yml`）、`plugins/`（按需下载的运行时，`plugins/spine/` 为立绘运行时）。
后端启动时由 `initializeStorage()` 创建并加载配置，并对照根目录 `preload_assets.yml` 校验用户 `preload/` 完整度；失败则告知用户不完整；可用 `OUR_ARCHIVE_DATA_DIR` 覆盖根目录。首次启动若缺少 Spine 运行时，会说明协议并提供「自动下载 / 手动放入 / 强制无 Spine」三种选择；三种选择都照常启动，仅立绘预览可能不可用。细节见 [server/modules/storage.md](./server/modules/storage.md)。

## 命令

```bash
npm install          # 安装依赖
npm run dev          # 前后端同时开发（Vite 5173，后端 3000）
npm run dev:server   # 仅后端 http://localhost:3000
npm run dev:client   # 仅前端 http://localhost:5173（/api 代理到 3000）
npm run build        # 测试编译前后端 (vue-tsc + vite build + tsup)
npm run build:windows# 打包 Windows 发行包 (单文件 OurArchive.exe，紧凑目录)
npm run build:linux  # 打包 Linux 发行包 (含 start.sh 启动脚本与独立 server)
npm run build:android# 打包 Android 发行包 (含 Termux start.sh 启动脚本)
npm run build:all    # 打包全平台发行包 (产物输出至 dist_release/)
npm start            # 生产启动：后端监听 5173 并托管前端
```

## 端口

| 场景 | 前端 | 后端 | 浏览器访问 |
| --- | --- | --- | --- |
| 生产 `npm start` | 5173（后端托管） | 5173 | `http://localhost:5173/` |
| 开发 `npm run dev` | 5173（Vite） | 3000 | `http://localhost:5173/` |

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | 后端监听端口（默认 5173，dev 脚本设为 3000） |
| `OUR_ARCHIVE_PUBLIC_PORT` | 对外访问端口（默认 5173） |
| `OUR_ARCHIVE_DATA_DIR` | 覆盖用户资源根目录 |
| `OUR_ARCHIVE_SPINE_MODE` | 非交互启动时的选择：`auto`（自动下载）/ `manual`（手动放置，默认）/ `none`（强制无 Spine 启动） |
| `OUR_ARCHIVE_SPINE_DOWNLOAD` | 兼容旧配置：设为 `1` 等同 `OUR_ARCHIVE_SPINE_MODE=auto` |
| `OUR_ARCHIVE_INTERACTIVE` | 设为 `1` 时允许在管道 stdin 下询问；`npm run dev` 已自动设置 |

## 设计约定

- **跨平台**：Windows / Linux / Android (Termux)。
- **局域网访问**：监听 `0.0.0.0`。
- **离线运行**：除首次按需下载 Spine 运行时外，不请求任何外部资源。
- **许可证**：代码 AGPL-3.0-only；`resources/` 资产为 CC BY-NC-ND 4.0，与 BA 官方无关联，不附带 BA 版权资源。Spine 运行时不随程序分发，首次启动按协议下载；许可见 [docs/third-party-notices.md](../docs/third-party-notices.md)。

## Agent可持续维护文档

- 详见 agents/.

# Our Archive — 项目说明

> Blue Archive 视觉小说模拟器（Visual Novel Simulator）
>
> 独立的《蔚蓝档案》(Blue Archive) 同人视觉小说模拟器，与任何其他同类项目**毫无关联**：不基于、不复刻任何第三方同类项目的代码或设计。

## 定位

用于编写、编辑与模拟《蔚蓝档案》风格视觉小说剧情的工具：创建剧本、管理角色与对话，并以视觉小说形式演出。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vite 6 + TypeScript + vue-router 4 |
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
│   │       ├── components/          # common/ 与 splash/
│   │       └── views/SplashView.vue # splash 整页
│   └── server/             # Express 后端
│       └── src/
│           ├── index.ts             # 启动编排
│           ├── app/mountClient.ts   # 静态托管 + SPA fallback
│           ├── routes/              # preload.ts、config.ts
│           ├── config/              # paths / storage / server / publicUrl / preload
│           └── utils/               # banner
└── scripts/                # 打包脚本与启动脚本 (package.js / bat / sh)
```

## 用户数据目录

| 平台 | 资源根目录 |
| --- | --- |
| Windows | `C:\Users\<用户>\Documents\OurArchive` |
| Linux | `/home/<用户>/OurArchive` |
| Android | `/sdcard/OurArchive` |

固定三个子目录：`res/`（素材）、`preload/`（预加载）、`config/`（配置，当前包含 `global_config.yml`）。
后端启动时由 `initializeStorage()` 创建并加载配置，并对照根目录 `preload_assets.yml` 校验用户 `preload/` 完整度；失败则告知用户不完整；可用 `OUR_ARCHIVE_DATA_DIR` 覆盖根目录。细节见 [server/storage.md](./server/storage.md)。

## 当前状态

- **后端**：Express 服务 —— 初始化资源目录、校验预加载资源、托管前端产物、提供预加载与配置 API。启动完成后在控制台输出 Local 与 Network（局域网）访问地址。
- **前端**：默认访问 `/` 进入 splash（白屏引导 → 音效 + banner 动画 + 气泡 → TOUCH TO START → 版权声明，支持 RizUI 设置面板与全局鼠标点击交互特效）。
- **未实现**：主流程入口、剧本编辑器、角色管理、对话演出。

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

## 设计约定

- **跨平台**：Windows / Linux / Android (Termux)。
- **局域网访问**：监听 `0.0.0.0`。
- **完全离线**：不请求任何外部资源。
- **许可证**：代码 AGPL-3.0-only；`resources/` 资产为 CC BY-NC-ND 4.0，与 BA 官方无关联，不附带 BA 版权资源。

模块文档：[client/](./client/README.md)、[server/](./server/README.md)。

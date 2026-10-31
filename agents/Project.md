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
| UI | RizUI（`riz-ui`，RizUI 组件按需引入） |
| Spine | `@esotericsoftware/spine-canvas` 4.2（仅立绘预览路由加载） |
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
│   │       └── views/               # SplashView.vue、HomeView.vue、ToolsView.vue、SkeletonPreviewView.vue
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
- **前端**：只能从入口 `/` 进入（直接访问 `/home`、`/tools` 等深层地址会被路由守卫 `replace` 回 `/`）。外壳（App.vue）常驻气泡背景、OurArchive banner 与右上角设置按钮；splash 只负责白屏引导、banner 动画触发、TOUCH TO START 与版权声明，点 TOUCH TO START 后 banner 收缩停靠到左下角、版权文字下坠、底色转浅蓝，随后 `/home` 的卡片错峰飞入——全程不重建背景。`/home` 有编辑模式 / 阅读模式叠卡、3D场景、资源管理、更多功能五个入口，`main_bgm` 从 splash 延续；除「更多功能」跳转 `/tools` 外其余仍是占位。
- **工具**：`/tools` 列出工具卡（配置在 `config/tools.ts`），目前只有「BA 立绘骨骼预览」→ `/tools/skeleton`：拖入角色文件夹或手动选文件（`.skel` / `.atlas` / 贴图），用 Spine 4.2 运行时在 canvas 上渲染，并按纯数字动画的 `AttachmentTimeline` 提供**立绘差分**选择，可选 `Idle_01` 等动作。工具页不改外壳 `stage`，banner 停靠与底色全部延续。
- **未实现**：编辑模式 / 阅读模式 / 3D场景 / 资源管理的实际内容、剧本编辑器、角色管理、对话演出。

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

## 设计约定

- **跨平台**：Windows / Linux / Android (Termux)。
- **局域网访问**：监听 `0.0.0.0`。
- **完全离线**：不请求任何外部资源。
- **许可证**：代码 AGPL-3.0-only；`resources/` 资产为 CC BY-NC-ND 4.0，与 BA 官方无关联，不附带 BA 版权资源。第三方组件（Spine Runtimes 等）许可见 [docs/third-party-notices.md](../docs/third-party-notices.md)。

模块文档：[client/](./client/README.md)、[server/](./server/README.md)。

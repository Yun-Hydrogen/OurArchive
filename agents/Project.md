# Our Archive — 项目说明

> Blue Archive 视觉小说模拟器（Visual Novel Simulator）
>
> 本项目是一个独立的《蔚蓝档案》(Blue Archive) 同人视觉小说模拟器，与任何其他同类项目（包括 Azure Archive）**毫无关联**，不基于、不复刻、不引用任何第三方同类项目的代码或设计。

## 项目定位

Our Archive 是一个用于编写、编辑与模拟《蔚蓝档案》风格视觉小说剧情的工具。用户可以在其中创建剧本、管理角色与对话，并以视觉小说的形式进行演出与模拟。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vite + TypeScript |
| 后端 | Node.js + Express + TypeScript |
| 构建 | tsup（服务端）、@yao-pkg/pkg（可选打包为单文件 exe） |
| 包管理 | npm workspaces（monorepo） |

## 目录结构

```
OurArchiveStudio/
├── package.json            # 根工作区配置
├── tsconfig.base.json      # 共享 TS 配置
├── agents/                 # Agent 协作说明
│   ├── Project.md          # 项目说明（本文件）
│   └── README.md           # Agent 协作约定
├── packages/
│   ├── client/             # Vue 3 前端
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── App.vue
│   │       ├── main.ts
│   │       └── style.css
│   └── server/             # Express 后端
│       └── src/
│           ├── index.ts        # 启动入口：初始化存储 + 静态托管
│           ├── config/
│           │   ├── paths.ts    # 平台识别与资源路径解析
│           │   └── storage.ts  # 目录初始化与全局配置读写
│           └── utils/
│               └── banner.ts   # 启动信息输出
└── scripts/                # 跨平台启动脚本 (bat / sh)
```

## 资源与配置目录

资源根目录按平台固定：

| 平台 | 资源根目录 |
| --- | --- |
| Windows | `C:\Users\<用户>\Documents\OurArchive` |
| Linux | `/home/<用户>/OurArchive` |
| Android | `/sdcard/OurArchive` |

根目录下固定分为三个子目录：

| 子目录 | 用途 |
| --- | --- |
| `res/` | 资源（图片、音频等素材） |
| `preload/` | 预加载内容 |
| `config/` | 配置 |

### 首次启动逻辑

后端启动时调用 `initializeStorage()`（[storage.ts](../packages/server/src/config/storage.ts)）：

1. 创建资源根目录及 `res/` `preload/` `config/` 三个子目录（已存在则跳过）；
2. 若 `config/global_settings.yml` 不存在，则创建空配置 `{}`；
3. 读取并加载全局配置；
4. 输出启动信息（运行平台、路径、配置项数量），首次启动会额外提示。

目录创建失败会直接终止启动并给出明确提示。可通过环境变量 `OUR_ARCHIVE_DATA_DIR` 覆盖资源根目录（便于开发与测试）。

## 当前状态

项目处于**初始骨架阶段**：

- 后端：最小 Express 服务器，启动时初始化资源目录与全局配置，托管前端构建产物（`packages/client/dist`）并提供 SPA fallback。**没有任何 API 路由或业务逻辑。**
- 前端：仅保留一个最小 Vue 3 入口页面。**没有任何页面、组件或业务逻辑。**
- 尚未实现：剧本编辑器、角色管理、对话模拟等核心功能。

## 开发

```bash
# 安装依赖
npm install

# 同时启动前后端开发模式
npm run dev

# 仅启动后端 (http://localhost:3000)
npm run dev:server

# 仅启动前端 (http://localhost:5173, /api 代理到 3000)
npm run dev:client
```

## 构建与运行

```bash
# 构建前后端
npm run build

# 构建并打包为 Windows 单文件 exe
npm run build:exe

# 生产模式启动（托管前端构建产物）
npm start
```

## 设计约定

- **跨平台**：需支持 Windows / Linux / Android (Termux) 运行，脚本层已提供对应启动方式。
- **局域网访问**：服务监听 `0.0.0.0`，便于同 Wi-Fi 下移动设备访问。
- **数据存储**：资源与配置统一存放在平台固定的资源根目录（见上文），由后端启动时初始化。
- **许可证**：AGPL-3.0-only。

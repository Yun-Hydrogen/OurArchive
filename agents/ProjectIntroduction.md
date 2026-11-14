# Our Archive — 项目说明

Our Archive 是一个独立的同人视觉小说模拟器，主要服务于《蔚蓝档案》风格的视觉小说，但也可用于其他视觉小说风格。

Our Archive 旨在为玩家提供一个创作和体验视觉小说风格剧情的工具。通过该项目，用户可以编写、编辑和模拟视觉小说剧情，管理角色与对话，并以视觉小说形式进行演出。

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Vite 6 + TypeScript + vue-router 4 |
| UI | RizUI（`riz-ui`，按需引入） |
| Spine | 官方 Spine Runtimes 4.2（按需下载到用户资源目录 `plugins/spine/`，仅立绘预览路由动态加载，默认 WebGL） |
| 后端 | Node.js + Express 4 + TypeScript |
| 构建 | tsup（服务端）、@yao-pkg/pkg（可选单文件 exe） |
| 包管理 | 单一 npm 包（无 workspaces） |

## 目录

源码全部在根目录 `src/` 下，按语义分层：`modules/` 放功能模块，`views/` 放页面与页面私有件，`utils/` 只有两个纯函数。
**目录里没有 `client/` 与 `server/` 之分**：服务端文件用 `<name>.server.ts` 后缀标记，浏览器侧绝不 import 它们。

```
OurArchive/
├── index.html              # Vite 入口页（引用 /src/main.ts）
├── vite.config.ts          # 前端构建 + 开发代理
├── tsconfig.json           # 单一 tsconfig（前端 + 服务端一起检查）
├── preload_assets.yml      # 预加载资源索引清单（项目根目录，随包分发）
├── docs/                   # 用户 / 主题文档（configs_doc/ 讲外载资源格式）
├── agents/                 # Agent 协作文档（入口：agents/README.md）
├── resources/              # 项目自带美术 / 音频（不进入用户数据目录）
│   ├── UI.ttf              # 全站字体
│   └── OurArchive/         # banner SVG、音效、LICENSE
├── src/
│   ├── index.ts            # 服务端入口：按顺序调用 Initializer
│   ├── main.ts             # 客户端入口：createApp + router
│   ├── App.vue             # 应用根组件（外壳挂载点）
│   ├── style.css           # 全局变量与重置
│   ├── utils/              # format.ts / reactivity.ts（纯函数）
│   ├── views/              # 7 个页面 + 页面私有件
│   │   └── package/        # 资源包页私有件（同页私有件 > 5 个才开子目录）
│   └── modules/            # 16 个功能模块（见下）
├── dist/                   # 构建产物：client/（Vite）+ server/（tsup）
└── scripts/                # 打包脚本与启动脚本（package.js / bat / sh）
```

### 模块一览

| 层 | 模块 | 职责 |
| --- | --- | --- |
| 渲染 / 播放 | `EmotionRender` | 表情关键帧解释与预览面板 |
| | `SkeletonRender` | 立绘渲染：后端适配、舞台交互、预览组件 |
| | `BackgroundRender` | 背景宫格与大图灯箱 |
| | `AudioPlayer` | 背景音乐单例与播放控制 |
| 数据解析 | `PackageProvider` | `package.yml` 清单、内容分类、目录约定、立绘目录扫描 |
| | `CharacterProvider` | `characters.json` → 角色 + 头像 + 立绘存在性 |
| | `AudioProvider` | `music_info.json` / `sound_info.json` + 音频时长解析 |
| | `BackgroundProvider` | `index/category.yml` + 背景图扫描 |
| | `EmotionProvider` | `emotions.yml` → 合成图层与关键帧 |
| 交互 | `ResourcePicker` | 通用资源选择对话框（Promise API） |
| 基础设施 | `Initializer` | 启动初始化：路径、目录、preload 校验、Spine 插件下载、端口、托管 |
| | `SkeletonRuntimeProvider` | 动态加载本地 Spine runtime 并交给渲染器 |
| | `API` | 前后端契约：DTO 类型、请求封装、Express router |
| 装配 | `Shell` | 常驻外壳：气泡 / banner / 鼠标特效 / 设置关于 / 外壳时序 |
| | `ViewsManager` | 路由表、入口闸门、页面入场动画、统一页头 `OAPageHeader.vue` |
| | `ConfigProvider` | 全局配置：默认值 / 校验 / yml 读写 / 渲染器模式取值 |

每个模块的细节见 `agents/modules/<模块>.md`，页面见 `agents/views/<页面>.md`（总入口：[agents/README.md](./README.md)）。
命名与边界规则见 [ProjectDevelopNotice.md](./ProjectDevelopNotice.md)，每个模块的职责与坑见 `agents/modules/<模块>.md`。

## 路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | `SplashView.vue` | 入口闸门：白屏引导 → banner → TOUCH TO START |
| `/home` | `HomeView.vue` | 主界面卡片 |
| `/tools` | `ToolsView.vue` | 工具入口 |
| `/tools/skeleton` | `SkeletonPreviewView.vue` | 立绘骨骼预览 |
| `/resources` | `ResourcesView.vue` | 资源管理（资源包 / 工程 / 存档 / 插件） |
| `/resources/:packageId` | `views/package/PackageView.vue` | 资源包详情（6 个内容分类） |
| `/resources/:packageId/character/:nameId` | `PackageCharacterView.vue` | 角色详情 |

除 `/` 之外的路由都在入口闸门之后（内存态 `isUnlocked`，刷新或直接输入地址会被 `replace` 回 `/`）。

## 用户数据目录

| 平台 | 资源根目录 |
| --- | --- |
| Windows | `C:\Users\<用户>\Documents\OurArchive` |
| Linux | `/home/<用户>/OurArchive` |
| Android | `/sdcard/OurArchive` |

固定子目录：`res/`（素材）、`preload/`（预加载）、`config/`（配置，当前包含 `global_config.yml`）、`plugins/`（按需下载的运行时，`plugins/spine/` 为立绘运行时）。

后端启动时由 `initializeStorage()` 创建并加载配置，并对照根目录 `preload_assets.yml` 校验用户 `preload/` 完整度；失败则告知用户不完整；可用 `OUR_ARCHIVE_DATA_DIR` 覆盖根目录。首次启动若缺少 Spine 运行时，会说明协议并提供「自动下载 / 手动放入 / 强制无 Spine」三种选择；三种选择都照常启动，仅立绘预览可能不可用。细节见 [modules/Initializer.md](./modules/Initializer.md)。

## 发行包结构

`npm run build:all` 产出到 `dist_release/`，每个目标一个目录加一份同名 zip：

```
dist_release/
├── OurArchive-windows-x64/           OurArchive-windows-x64-v0.1.0.zip
├── OurArchive-linux-x64/             OurArchive-linux-x64-v0.1.0.zip
└── OurArchive-android/               OurArchive-android-v0.1.0.zip
```

| 目标 | 入口 | 内容 |
| --- | --- | --- |
| Windows | `OurArchive.exe`（双击） | 单文件 SEA，无需安装 Node |
| Linux | `start.sh` → `node server/index.cjs` | `server/index.cjs`（依赖已内联） |
| Android | `start.sh` → `node server/index.cjs` | 同上，`start.sh` 带 Termux 存储提示 |

三个目录结构一致：

```
OurArchive-<target>/
├── OurArchive.exe | server/index.cjs   # 服务端（三平台共用同一个 CJS bundle）
├── client/                             # 前端产物（Vite）
├── preload_assets.yml                  # 预加载清单，随包分发
├── LICENSE                             # AGPL-3.0
├── docs/third-party-notices.md         # 第三方许可说明
├── README.txt                          # 启动方式 + 首次启动行为
└── build-info.json                     # version / target / builtAt / node / commit
```

选型要点（改打包脚本前务必读）：

- **服务端 bundle 是 CJS（`.cjs`）且内联了全部依赖**。发行包里没有 `node_modules`，
  Windows 又是 Node SEA（`require` 只认内置模块）；而 `.mjs` 在 express 这类 CJS 依赖的
  运行时 `require()` 上会抛 `Dynamic require of "path" is not supported`。
- **这些坑在仓库内测不出来**：仓库根有 `"type": "module"`（让裸 `.js` 合法），上层还有
  `node_modules`（让外部依赖能解析）。验证必须在**仓库外的新目录**里跑。
- 三个平台共用同一个 CJS bundle：Windows 直接塞进 SEA，Linux / Android 复制成
  `server/index.cjs`。
- 归档用 `zip` / bsdtar（`tar -a`），**不用** PowerShell 的 `Compress-Archive`——后者在
  Windows 上会把条目名写成反斜杠，Linux 解压后得到一串畸形文件名。Windows 侧打出的 zip
  不保留可执行位，所以 `README.txt` 把 `chmod +x start.sh` 写成第一步，并给出 `bash start.sh` 兜底。

## 命令

```bash
npm install          # 安装依赖
npm run dev          # 前后端同时开发（Vite 5173，后端 3000）
npm run dev:server   # 仅后端 http://localhost:3000
npm run dev:client   # 仅前端 http://localhost:5173（/api 代理到 3000）
npm run build        # 类型检查 + 构建前后端（vue-tsc + vite build + tsup）
npm run build:windows# 打包 Windows 发行包（单文件 OurArchive.exe，紧凑目录）
npm run build:linux  # 打包 Linux 发行包（含 start.sh 启动脚本与独立 server）
npm run build:android# 打包 Android 发行包（含 Termux start.sh 启动脚本）
npm run build:all    # 打包全平台发行包（产物输出至 dist_release/）
npm run build:clean  # 只清空 dist_release/，不打包
npm start            # 生产启动：后端监听 5173 并托管前端
```

打包脚本（`scripts/package.js`）额外支持两个开关：

```bash
node scripts/package.js all --skip-build   # 复用现有 dist/client，不重跑前端构建
node scripts/package.js all --no-zip       # 只出目录，不压缩归档
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

## 专题文档

| 主题 | 文档 |
| --- | --- |
| 预加载资源清单怎么写 | [docs/configs_doc/preload.md](../docs/configs_doc/preload.md) |
| 表情资源怎么配 | [docs/configs_doc/emotions.md](../docs/configs_doc/emotions.md) |
| 表情系统的第三方实现记录 | [emotionstodo.md](./emotionstodo.md) |
| 踩过的坑（改代码前先扫） | [NeedNotice.md](./NeedNotice.md) |

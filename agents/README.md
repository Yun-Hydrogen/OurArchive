# Agent 协作说明

面向 AI Agent / 自动化的协作约定。项目定位与技术栈见 [Project.md](./Project.md)。

| 文档 | 内容 |
| --- | --- |
| [Project.md](./Project.md) | 项目定位、目录树、资源目录、编译打包命令、环境变量 |
| [client/README.md](./client/README.md) | 前端索引 |
| [client/app-shell.md](./client/app-shell.md) | 入口、路由、字体、UI 主题、资源别名 |
| [client/splash.md](./client/splash.md) | 启动画面与全局设置弹窗 |
| [client/mouse-spark.md](./client/mouse-spark.md) | 全局鼠标交互与点击粒子动效 |
| [server/README.md](./server/README.md) | 后端索引 |
| [server/startup.md](./server/startup.md) | 启动编排、路由挂载、端口与局域网网络地址解析 |
| [server/storage.md](./server/storage.md) | 用户数据目录规范、预加载清单比对与配置读写 |
| [server/serve-client.md](./server/serve-client.md) | 静态托管、SPA fallback 与控制台启动信息 |

## 硬性约定

1. **项目独立性**：本项目是与任何第三方同类项目毫无关联的独立 BA 视觉小说模拟器。代码、文档、注释中**不得出现**对其他同类项目的引用、复刻说明或比较。
2. **模块化但不碎**：逻辑按模块拆文件（页面 / 可复用 UI / composable / config / 路由）；**只有被复用处或体积过大时才提取组件**，不要为单个页面的每个小部件各建一份文件。
3. **文档与代码同步**：改动模块后更新对应的 `agents/**/*.md`，一个模块一份文档。
4. **路径规范**：用户数据走 `getStoragePaths()`，前端资源走 `@resources` 别名，业务代码不硬编码路径。
5. **字体唯一**：前端只用 `var(--oa-font)`（`resources/UI.ttf`），不引入外部字体。
6. **完全离线**：不加载任何 CDN / 远程字体 / 统计脚本。
7. **跨平台**：Windows / Linux / Android (Termux) 均可运行。
8. **许可证**：AGPL-3.0-only，不引入不兼容许可证的依赖；`resources/OurArchive/` 资产为 CC BY-NC-ND 4.0，不受 AGPLv3 覆盖。

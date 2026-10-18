# Agent 协作说明

本目录存放供 AI Agent / 自动化协作使用的说明文件。

## 项目背景

请先阅读 [Project.md](./Project.md) 了解项目定位、技术栈、资源目录规范与当前状态。

## 关键约定

1. **项目独立性**：本项目是与任何第三方同类项目毫无关联的独立《蔚蓝档案》视觉小说模拟器。代码、文档、注释中**不得出现**对其他同类项目的引用、复刻说明或比较。
2. **当前阶段**：项目处于初始骨架阶段，后端仅有一个最小 Express 服务器（启动时初始化资源目录与配置）并托管前端产物，前端仅有一个最小 Vue 3 入口页。**没有任何 API 路由与业务逻辑**，新增功能请从零设计。
3. **技术栈**：Vue 3 + Vite + TypeScript（前端）、Node.js + Express + TypeScript（后端）、npm workspaces monorepo。
4. **资源目录规范**：用户数据固定存放于平台资源根目录（Windows `<用户文档>/OurArchive`、Linux `/home/<用户>/OurArchive`、Android `/sdcard/OurArchive`），下分 `res/` `preload/` `config/` 三个子目录。路径解析统一走 [paths.ts](../packages/server/src/config/paths.ts)，不要在业务代码中硬编码路径。
5. **跨平台**：所有代码与脚本需兼容 Windows / Linux / Android (Termux)。
6. **许可证**：AGPL-3.0-only，不得引入不兼容许可证的依赖。

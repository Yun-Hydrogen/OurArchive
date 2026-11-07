# Client — 前端索引

源码 [packages/client](../../packages/client)：Vue 3 + Vite 6 + TypeScript + vue-router 4。

## 模块文档

| 文档 | 用途 |
| --- | --- |
| [modules/gate_and_splash.md](./modules/gate_and_splash.md) | 启动画面：白屏引导、手势解锁、时序状态机、离场 |
| [modules/app_shell.md](./modules/app_shell.md) | 常驻外壳：底色层、气泡、banner 停靠、鼠标特效 |
| [modules/home_and_tools.md](./modules/home_and_tools.md) | 主界面与工具页：卡槽叠放、入场离场 |
| [modules/resources.md](./modules/resources.md) | 资源管理页：分类标签、资源包列表、占位 |
| [modules/package.md](./modules/package.md) | 资源包大卡片：分类侧边栏、学院分组、内容浏览、角色详情 |
| [modules/skeleton_preview.md](./modules/skeleton_preview.md) | 立绘骨骼预览：资源识别、渲染后端、差分与动作 |
| [modules/music_and_settings.md](./modules/music_and_settings.md) | 背景音乐与全局设置：播放控制、配置同步 |
| [NeedNotice.md](./NeedNotice.md) | 踩坑总集：改代码前先扫对应分组 |

## 目录

```
packages/client/src/
├── main.ts                # 入口
├── App.vue                # 常驻外壳
├── style.css              # 字体、变量与全局重置
├── router/                # 路由表与入口闸门
├── config/                # 常量配置
├── api/                   # 网络层
├── utils/                 # 工具函数
├── spinePackage.ts        # 立绘包识别
├── spine/                 # 渲染适配
├── composables/           # 组合式逻辑
├── components/            # 可复用组件
└── views/                 # 路由页面
```

## 约定

- 新增页面后同步更新本索引与 [modules/gate_and_splash.md](./modules/gate_and_splash.md) 的路由闸门说明。
- 命名（文件 / 标识符 / CSS / 数据字段）遵 [ProjectDevelopNotice.md](../ProjectDevelopNotice.md)。
- 只记录「有入口的功能进度」见 [ProjectDevelopProcess.md](../ProjectDevelopProcess.md)。

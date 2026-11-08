# Server — 后端索引

源码 [packages/server](../../packages/server)：Node.js + Express 4 + TypeScript（`tsup` 打包）。

## 模块文档

| 文档 | 用途 |
| --- | --- |
| [modules/startup.md](./modules/startup.md) | 启动编排、端口、对外地址、静态托管、启动横幅 |
| [modules/storage.md](./modules/storage.md) | 路径与存储：平台识别、资源根目录、全局配置、预加载校验、Spine 运行时插件、资源包索引 |
| [modules/packages_and_api.md](./modules/packages_and_api.md) | API：资源包索引与文件下发、全局配置接口、预加载接口 |
| [NeedNotice.md](./NeedNotice.md) | 踩坑总集：改代码前先扫对应分组 |

## 目录

```
packages/server/src/
├── index.ts               # 唯一入口：初始化 → 挂路由 → 托管前端 → 监听
├── app/
│   └── mountClient.ts     # 静态托管与 SPA fallback
├── config/
│   ├── paths.ts           # 平台识别与资源根目录
│   ├── storage.ts         # 存储初始化、全局配置读写
│   ├── preload.ts         # 预加载清单校验
│   ├── spine.ts           # Spine 运行时检测与按需下载
│   ├── packages.ts        # 资源包索引与派生
│   ├── server.ts          # 监听端口与地址
│   └── publicUrl.ts       # 对外访问地址
├── routes/                # 每个域一个 create*Router()
└── utils/
    └── banner.ts          # 启动横幅
```

## 约定

- 业务代码不拼路径，一律走 `config/paths.ts` 的 `getStoragePaths()`。
- 命名遵 [ProjectDevelopNotice.md](../ProjectDevelopNotice.md)。
- 只记录「有入口的功能进度」见 [ProjectDevelopProcess.md](../ProjectDevelopProcess.md)。

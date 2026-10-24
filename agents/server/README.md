# Server — 后端索引

源码 [packages/server](../../packages/server)：Node.js + Express 4 + TypeScript（tsx 开发 / tsup 构建 / 可选 pkg 打包 exe）。

后端目前只做三件事：**初始化用户存储目录**、**托管前端产物**、**启动后自动打开浏览器**。没有任何业务 API。

| 文档 | 覆盖 | 说明 |
| --- | --- | --- |
| [startup.md](./startup.md) | `index.ts`、`config/server.ts`、`config/publicUrl.ts` | 启动编排、端口与环境变量 |
| [storage.md](./storage.md) | `config/paths.ts`、`config/storage.ts`、`config/preload.ts` | 资源目录规范、首次启动初始化、预加载清单检查、配置读写 |
| [serve-client.md](./serve-client.md) | `app/mountClient.ts`、`utils/banner.ts` | 静态托管、SPA fallback、启动信息 |
| [auto-open-browser.md](./auto-open-browser.md) | `utils/openBrowser.ts`、`utils/waitForReachable.ts` | 就绪检测与跨平台开浏览器 |

```
packages/server/src/
├── index.ts                # 只做编排
├── app/mountClient.ts      # 静态托管 + SPA fallback
├── config/
│   ├── paths.ts            # 平台识别与路径解析
│   ├── storage.ts          # 目录初始化、YAML 配置读写
│   ├── preload.ts          # 读取随程序分发的 preload_assets.yml 并比对用户资源
│   ├── server.ts           # 端口 / 主机 / 自动打开开关
│   └── publicUrl.ts        # 浏览器访问地址
└── utils/
    ├── banner.ts           # 启动信息打印
    ├── openBrowser.ts      # 跨平台开浏览器
    └── waitForReachable.ts # 轮询等待 URL 可达
```

## 约定

- `index.ts` 只做编排，实现落到 `app/`、`config/`、`utils/`、`routes/`。
- 用户数据路径只走 `getStoragePaths()`，配置只走 `loadSettings() / saveSettings()`，不硬编码。
- **新增 API 必须挂在 `mountClient()` 之前**，否则被 SPA fallback 截获。
- 新增模块后同步更新本索引。

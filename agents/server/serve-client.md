# 前端托管与启动信息

覆盖：[app/mountClient.ts](../../packages/server/src/app/mountClient.ts)、[utils/banner.ts](../../packages/server/src/utils/banner.ts)

## mountClient.ts

`resolveClientDistPath(currentDir)` 按候选路径依次探测，命中条件是**目录内存在 `index.html`**（只判目录存在会被空 `dist/` 骗过）：

```
<currentDir>/../../client/dist   → tsup 产物 (packages/server/dist)
<currentDir>/../client/dist      → 直跑 src/
<currentDir>/./client/dist
<cwd>/packages/client/dist
<cwd>/client/dist , <cwd>/dist   → pkg 打包 exe
```

`mountClient(app, distPath)`：

| 分支 | 行为 |
| --- | --- |
| `distPath === null` | `/` 返回最小 HTML 提示页（提示 `npm run build` / `npm run dev`） |
| 有产物 | `express.static(distPath, { index: false })` |
| 未知路径 | `app.get('*')` 返回 `index.html`，交给前端路由 |

两处硬约束：

- **API 必须挂在 `mountClient()` 之前**，否则被 `app.get('*')` 截获。
- fallback 中 `req.path.startsWith('/api/')` 时 `next()`，让不存在的 API 返回 404 而不是 HTML（避免前端把 HTML 当 JSON 解析）。
- `index: false` 让 `index.html` 统一由 fallback 输出，避免静态托管与路由行为分叉。

## banner.ts

`printStartupInfo()` 在 `app.listen()` 回调里打印，**纯输出、无副作用**。输入：`port`、`publicUrl`、`storage`（`StoragePaths`）、`firstRun`、`settingsCount`、`clientDistPath`。

```
  ➜  URL:        http://localhost:5173/
  ➜  Server:     :5173
  ➜  Platform:   windows
  ➜  Storage:    C:\Users\<用户>\Documents\OurArchive
  ➜  Dirs:       res/  preload/  config/
  ➜  Config:     config\global_settings.yml  (0 项)
```

附加提示：`firstRun` 时提示已初始化目录与配置；`clientDistPath === null` 时提示未找到产物及构建命令。用 `picocolors` 着色，`path.relative(rootDir, ...)` 让子目录显示为短路径。

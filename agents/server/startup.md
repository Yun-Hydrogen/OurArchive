# 启动编排与运行配置

覆盖：[index.ts](../../packages/server/src/index.ts)、[config/server.ts](../../packages/server/src/config/server.ts)、[config/publicUrl.ts](../../packages/server/src/config/publicUrl.ts)

## 启动顺序

```
index.ts
  ├─ dotenv.config()                    # 读 .env
  ├─ resolvePort()                      # config/server.ts
  ├─ resolvePublicUrl()                 # config/publicUrl.ts
  ├─ initializeStorage()                # config/storage.ts —— 失败即 exit(1)
  ├─ loadPreloadAssets(storage.paths)   # config/preload.ts —— 校验 preload 完整度
  ├─ resolveClientDistPath(currentDir)  # app/mountClient.ts
  ├─ mountClient(app, distPath)
  └─ app.listen(PORT, SERVER_HOST, …)
       ├─ printStartupInfo()            # banner.ts —— 含 preload 状态与不完整提示
       └─ shouldOpenBrowser() && autoOpenBrowser()
```

- **存储初始化先于监听**：目录不可写时直接 `process.exit(1)`，不带残缺状态运行。
- **目录定位兼容两种形态**：`typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url))`。tsup 的 ESM 产物没有 `__dirname`，pkg 的 CJS exe 有。

## 端口

| 场景 | 前端 | 后端 | 浏览器打开 |
| --- | --- | --- | --- |
| `npm start`（生产，后端托管） | 5173 | 5173 | `http://localhost:5173/` |
| `npm run dev` | 5173（Vite） | 3000 | `http://localhost:5173/`（等 Vite 就绪） |

对外地址恒为 5173；开发时端口由 `packages/server` 的 `dev` 脚本注入（`cross-env PORT=3000 tsx watch src/index.ts`），前端 `/api` 走 Vite 代理转发到 3000。

## 配置

`config/server.ts`：

| 导出 | 行为 |
| --- | --- |
| `DEFAULT_PORT` | `5173` |
| `SERVER_HOST` | `'0.0.0.0'`（便于局域网访问） |
| `resolvePort()` | 读 `PORT`，非法/缺失回退 5173 |
| `shouldOpenBrowser()` | `OUR_ARCHIVE_NO_OPEN` 为 `1`/`true`/`yes` 时返回 `false` |

`config/publicUrl.ts`：`PUBLIC_PORT = 5173`，`resolvePublicUrl()` 读 `OUR_ARCHIVE_PUBLIC_PORT` 返回 `http://localhost:<port>/`。**浏览器打开的是对外地址，不是后端实际监听端口**。

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `5173` | 后端监听端口 |
| `OUR_ARCHIVE_PUBLIC_PORT` | `5173` | 浏览器打开的端口 |
| `OUR_ARCHIVE_DATA_DIR` | 平台默认根目录 | 覆盖用户资源根目录（开发 / 测试） |
| `OUR_ARCHIVE_NO_OPEN` | 未设置 | `1`/`true`/`yes` 禁用自动开浏览器 |

`.env` 由 `dotenv` 在文件顶部加载，已 gitignore。

## 扩展点

| 需求 | 改法 |
| --- | --- |
| 新增 API | 新建 `src/routes/xxx.ts`，在 `mountClient()` **之前** `app.use('/api', router)` |
| 新增中间件 | `express()` 之后、`mountClient()` 之前 |
| 新增启动步骤 | `app.listen()` 回调内追加，或按需前置 |

# 自动打开浏览器

覆盖：[utils/waitForReachable.ts](../../packages/server/src/utils/waitForReachable.ts)、[utils/openBrowser.ts](../../packages/server/src/utils/openBrowser.ts)

开发模式下 Vite 通常比后端晚就绪，所以不能「监听成功即打开」，必须先探测对外地址可达。

## waitForReachable(url, { timeoutMs = 30000, intervalMs = 300 })

用原生 `http`/`https` 发 GET，单次超时 1.5s；**收到任意响应即算可达**（不校验状态码）；每 300ms 重试，超时返回 `false`。连接失败与超时都归为 `false`，**从不抛异常**。

## openInBrowser(url)

| 环境 | 命令 |
| --- | --- |
| Termux（存在 `TERMUX_VERSION`） | `termux-open-url <url>` |
| Windows | `cmd /c start "" <url>` |
| macOS | `open <url>` |
| Linux | `xdg-open <url>` |

- `spawn(..., { detached: true, stdio: 'ignore', windowsHide: true })` + `unref()`，浏览器进程不阻塞服务退出。
- `error` 事件只告警：拉不起浏览器不影响服务运行。
- Windows 走 `cmd start` 以正确处理 URL 特殊字符。

## autoOpenBrowser({ publicUrl, timeoutMs })

先 `waitForReachable`，不可达时告警并跳过；可达才 `openInBrowser(publicUrl)` 并打印结果。打开的是**对外地址**（开发/生产均 5173），不是后端监听端口。

调用位置（`index.ts`）：

```ts
app.listen(PORT, SERVER_HOST, () => {
  printStartupInfo({ ... });
  if (shouldOpenBrowser()) void autoOpenBrowser({ publicUrl });
});
```

`void` 显式忽略 Promise，不阻塞启动；`OUR_ARCHIVE_NO_OPEN` 可在 CI / 无头环境关闭。

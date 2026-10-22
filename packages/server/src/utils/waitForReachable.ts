import http from 'node:http';
import https from 'node:https';

function isReachable(url: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(true);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * 轮询等待目标地址可用。
 * 开发模式下 Vite 通常比后端晚就绪，需要等待后再打开浏览器。
 */
export async function waitForReachable(
  url: string,
  { timeoutMs = 30000, intervalMs = 300 } = {}
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isReachable(url, 1500)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

import { spawn } from 'node:child_process';
import pc from 'picocolors';
import { waitForReachable } from './waitForReachable.js';

function spawnDetached(command: string, args: string[]) {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  // 让浏览器进程脱离父进程，避免阻塞服务退出
  child.unref();

  // 浏览器拉起失败不应影响服务运行
  child.on('error', (error) => {
    console.warn(pc.yellow(`[Our Archive] 无法自动打开浏览器: ${error.message}`));
  });
}

/**
 * 使用系统默认浏览器打开指定 URL。
 * 支持 Windows / macOS / Linux 以及 Termux。
 */
export function openInBrowser(url: string) {
  if (process.env.TERMUX_VERSION) {
    spawnDetached('termux-open-url', [url]);
    return;
  }

  switch (process.platform) {
    case 'win32':
      // 用 cmd /c start 处理 URL 中的 & 等字符
      spawnDetached('cmd', ['/c', 'start', '', url]);
      return;

    case 'darwin':
      spawnDetached('open', [url]);
      return;

    default:
      spawnDetached('xdg-open', [url]);
  }
}

export interface AutoOpenOptions {
  publicUrl: string;
  /** 等待目标可达的超时时间 */
  timeoutMs?: number;
}

/**
 * 服务就绪后自动打开浏览器。
 * 开发模式下 Vite 可能尚未就绪，因此先轮询等待再打开。
 */
export async function autoOpenBrowser(options: AutoOpenOptions) {
  const { publicUrl, timeoutMs = 30000 } = options;

  if (!(await waitForReachable(publicUrl, { timeoutMs }))) {
    console.warn(
      pc.yellow(
        `[Our Archive] 未能在 ${Math.round(timeoutMs / 1000)}s 内连接到 ${publicUrl}，已跳过自动打开浏览器。`
      )
    );
    return;
  }

  openInBrowser(publicUrl);
  console.log(pc.dim(`[Our Archive] 已在默认浏览器打开 ${publicUrl}`));
}

import os from 'node:os';

/**
 * 对外访问端口。
 * 生产环境由后端自身托管前端，端口与后端一致（5173）；
 * 开发环境由 Vite 占用该端口，后端改在 3000 并代理 /api。
 */
export const PUBLIC_PORT = 5173;

export function resolvePublicPort(): number {
  const configured = Number.parseInt(process.env.OUR_ARCHIVE_PUBLIC_PORT ?? '', 10);
  return Number.isFinite(configured) && configured > 0 ? configured : PUBLIC_PORT;
}

/**
 * 本地访问地址（http://localhost:<port>/）。
 */
export function resolvePublicUrl(): string {
  const port = resolvePublicPort();
  return `http://localhost:${port}/`;
}

/**
 * 解析局域网访问地址（例如 http://192.168.1.100:5173/）。
 */
export function resolveNetworkUrl(): string | null {
  const port = resolvePublicPort();
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return `http://${iface.address}:${port}/`;
      }
    }
  }

  return null;
}

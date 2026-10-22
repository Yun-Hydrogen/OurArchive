/**
 * 服务端口配置。
 * 生产环境后端自身托管前端，监听 5173；
 * 开发环境 Vite 占用 5173，由 dev 脚本将后端 PORT 设为 3000。
 */
export const DEFAULT_PORT = 5173;

/** 监听所有网卡，便于局域网访问 */
export const SERVER_HOST = '0.0.0.0';

export function resolvePort(): number {
  const configured = Number.parseInt(process.env.PORT ?? '', 10);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_PORT;
}

/**
 * 是否在启动完成后自动打开浏览器。
 * 设置 OUR_ARCHIVE_NO_OPEN=1 可禁用（CI / 无头环境）。
 */
export function shouldOpenBrowser(): boolean {
  const flag = (process.env.OUR_ARCHIVE_NO_OPEN ?? '').toLowerCase();
  return !(flag === '1' || flag === 'true' || flag === 'yes');
}

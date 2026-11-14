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

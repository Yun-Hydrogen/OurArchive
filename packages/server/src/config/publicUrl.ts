/**
 * 对外访问端口。
 * 生产环境由后端自身托管前端，端口与后端一致（5173）；
 * 开发环境由 Vite 占用该端口，后端改在 3000 并代理 /api。
 */
export const PUBLIC_PORT = 5173;

/**
 * 浏览器应打开的地址。
 * 开发 / 生产都指向 5173：开发时是 Vite，生产时是后端静态托管。
 */
export function resolvePublicUrl(): string {
  const configured = Number.parseInt(process.env.OUR_ARCHIVE_PUBLIC_PORT ?? '', 10);
  const port = Number.isFinite(configured) && configured > 0 ? configured : PUBLIC_PORT;
  return `http://localhost:${port}/`;
}

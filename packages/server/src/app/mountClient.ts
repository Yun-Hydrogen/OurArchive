import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 解析前端构建产物目录（兼容开发与打包后的多种目录层级）。
 */
export function resolveClientDistPath(currentDir: string): string | null {
  const candidates = [
    path.resolve(currentDir, '../../client/dist'),
    path.resolve(currentDir, '../client/dist'),
    path.resolve(currentDir, './client/dist'),
    path.resolve(process.cwd(), 'packages/client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), 'dist'),
  ];

  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ?? null;
}

/**
 * 挂载前端静态资源与 SPA fallback。
 * 未找到构建产物时返回最小提示页，方便确认后端已启动。
 */
export function mountClient(app: Express, clientDistPath: string | null) {
  if (!clientDistPath) {
    app.get('/', (_req: Request, res: Response) => {
      res
        .status(200)
        .type('text/html')
        .send(
          '<!doctype html><meta charset="utf-8">' +
            '<title>Our Archive</title>' +
            '<body style="font-family:sans-serif;background:#0b1017;color:#e9eef5;padding:40px">' +
            '<h1 style="color:#0090fe">Our Archive</h1>' +
            '<p>Frontend build not found. Run <code>npm run build</code>, ' +
            'or use <code>npm run dev</code> for development.</p>' +
            '</body>'
        );
    });
    return;
  }

  app.use(express.static(clientDistPath, { index: false }));

  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // 未知 API 路由不返回 HTML
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

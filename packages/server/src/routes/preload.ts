import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import { getPreloadCheckResult } from '../config/preload.js';

/**
 * 预加载资源 API 路由。
 * 允许前端获取预加载资源清单元数据，并通过 /api/preload/asset/:id 播放音频或加载图片。
 */
export function createPreloadRouter(): Router {
  const router = Router();

  // 获取所有预加载资源元数据
  router.get('/assets', (_req: Request, res: Response) => {
    const catalog = getPreloadCheckResult();
    res.json({
      success: true,
      isComplete: catalog?.isComplete ?? false,
      total: catalog?.total ?? 0,
      loaded: catalog?.loaded ?? 0,
      missing: catalog?.missing ?? 0,
      assets:
        catalog?.items.map((item) => ({
          id: item.id,
          file: item.file,
          fileType: item.fileType,
          exists: item.exists,
          url: `/api/preload/asset/${encodeURIComponent(item.id)}`,
        })) ?? [],
    });
  });

  // 根据 id 获取对应的静态文件内容（音频流 / 图片等）
  router.get('/asset/:id', (req: Request, res: Response) => {
    const assetId = String(req.params.id || '').trim().toLowerCase();
    const catalog = getPreloadCheckResult();
    const item = catalog?.items.find((entry) => entry.id === assetId);

    if (!item) {
      res.status(404).json({
        success: false,
        error: `Preload asset not found in manifest: ${assetId}`,
      });
      return;
    }

    if (!fs.existsSync(item.resolvedPath)) {
      res.status(404).json({
        success: false,
        error: `Preload asset file missing on disk: ${item.file}`,
      });
      return;
    }

    res.sendFile(item.resolvedPath);
  });

  return router;
}

import { Router, type Request, type Response } from 'express';
import { loadSettings, saveSettings } from '../config/storage.js';

export function createConfigRouter(): Router {
  const router = Router();

  // 获取全局配置
  router.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      config: loadSettings(),
    });
  });

  // 更新全局配置
  router.put('/', (req: Request, res: Response) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({
        success: false,
        error: '请求体必须为 JSON 对象',
      });
      return;
    }

    const patch: Record<string, unknown> = {};

    if ('main_bgm_volume' in body) {
      const vol = Number(body.main_bgm_volume);
      if (Number.isFinite(vol)) {
        patch.main_bgm_volume = Math.max(0, Math.min(100, Math.round(vol)));
      }
    }

    const updated = saveSettings(patch);
    res.json({
      success: true,
      config: updated,
    });
  });

  return router;
}

import { Router, type Request, type Response } from 'express';
import { isSpineRendererMode, loadSettings, saveSettings } from '../config/storage.js';

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

    // 两个音量项规则一致：0-100 的整数
    for (const key of ['main_bgm_volume', 'preview_volume'] as const) {
      if (!(key in body)) {
        continue;
      }
      const value = Number(body[key]);
      if (Number.isFinite(value)) {
        patch[key] = Math.max(0, Math.min(100, Math.round(value)));
      }
    }

    // 立绘渲染器模式：只接受三个已知取值
    if ('spine_renderer' in body && isSpineRendererMode(body.spine_renderer)) {
      patch.spine_renderer = body.spine_renderer;
    }

    const updated = saveSettings(patch);
    res.json({
      success: true,
      config: updated,
    });
  });

  return router;
}

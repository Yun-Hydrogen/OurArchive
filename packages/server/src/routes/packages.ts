import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  readPackageBackgrounds,
  readPackageCharacters,
  readPackageMusic,
  readPackageSkeletons,
  readPackageSounds,
  readSkeletonFiles,
  resolveBackgroundFile,
  resolveInside,
  resolveMusicFile,
  resolvePackageDir,
  resolveSoundFile,
  scanResourcePackages,
} from '../config/packages.js';
import { getStoragePaths } from '../config/paths.js';

/** 允许直接下发的静态资源类型 */
const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.skel': 'application/octet-stream',
  '.atlas': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.m4b': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
  '.weba': 'audio/webm',
  '.aif': 'audio/aiff',
  '.aiff': 'audio/aiff',
};

function failNotFound(res: Response, message: string) {
  res.status(404).json({ success: false, error: message });
}

function failInternal(res: Response, error: unknown) {
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : String(error),
  });
}

function sendFile(res: Response, target: string | null) {
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    failNotFound(res, '文件不存在');
    return;
  }

  const mime = MIME_BY_EXTENSION[path.extname(target).toLowerCase()];
  if (!mime) {
    failNotFound(res, '不支持的文件类型');
    return;
  }

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(target);
}

/**
 * 资源包 API。
 *
 * - `GET /api/packages`                         扫描 `res/` 列出全部资源包
 * - `GET /api/packages/:id`                     单包详情
 * - `GET /api/packages/:id/characters`          角色索引（含头像 URL 与骨骼存在性）
 * - `GET /api/packages/:id/skeletons`           全部立绘目录（含文件清单与体积）
 * - `GET /api/packages/:id/skeleton/:skeletonId` 立绘目录内的文件清单
 * - `GET /api/packages/:id/music`               背景音乐曲目（读 index/music_info.json，含 description）
 * - `GET /api/packages/:id/music/*`             背景音乐音频本体
 * - `GET /api/packages/:id/sounds`              音效列表与类别映射（读 index/sound_info.json + categories.json）
 * - `GET /api/packages/:id/sounds/*`            音效音频本体
 * - `GET /api/packages/:id/backgrounds`         背景图与分类（读 index/category.yml，缺省只读根目录）
 * - `GET /api/packages/:id/backgrounds/*`       背景图本体
 * - `GET /api/packages/:id/avatar/*`            头像图片
 * - `GET /api/packages/:id/skeleton/:id/*`      立绘文件（.skel / .atlas / .png）
 */
export function createPackagesRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const paths = getStoragePaths();

    try {
      const packages = scanResourcePackages(paths);
      res.json({
        success: true,
        resourcesDir: paths.resDir,
        total: packages.length,
        packages,
      });
    } catch (error) {
      failInternal(res, error);
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    res.json({ success: true, package: pkg });
  });

  router.get('/:id/characters', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    try {
      const characters = readPackageCharacters(packageDir, pkg);
      res.json({ success: true, total: characters.length, characters });
    } catch (error) {
      failInternal(res, error);
    }
  });

  // 背景音乐曲目列表（读 <path>/index/music_info.json）
  router.get('/:id/music', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    try {
      const music = readPackageMusic(packageDir, pkg);
      res.json({ success: true, total: music.length, music });
    } catch (error) {
      failInternal(res, error);
    }
  });

  // 背景音乐音频本体
  router.get('/:id/music/:file(*)', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    sendFile(res, resolveMusicFile(packageDir, pkg, String(req.params.file ?? '')));
  });

  // 音效列表与类别映射（读 <path>/index/sound_info.json + categories.json）
  router.get('/:id/sounds', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    try {
      const { sounds, categories } = readPackageSounds(packageDir, pkg);
      res.json({ success: true, total: sounds.length, sounds, categories });
    } catch (error) {
      failInternal(res, error);
    }
  });

  // 音效音频本体
  router.get('/:id/sounds/:file(*)', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    sendFile(res, resolveSoundFile(packageDir, pkg, String(req.params.file ?? '')));
  });

  // 背景图与分类（读 <path>/index/category.yml，没有就只读根目录）
  router.get('/:id/backgrounds', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    try {
      const categories = readPackageBackgrounds(packageDir, pkg);
      const total = categories.reduce((sum, category) => sum + category.count, 0);
      res.json({ success: true, total, categories });
    } catch (error) {
      failInternal(res, error);
    }
  });

  // 背景图本体（路径含分类子目录）
  router.get('/:id/backgrounds/:file(*)', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    sendFile(res, resolveBackgroundFile(packageDir, pkg, String(req.params.file ?? '')));
  });

  // 全部立绘目录（含文件清单与体积）
  router.get('/:id/skeletons', (req: Request, res: Response) => {    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    try {
      const skeletons = readPackageSkeletons(packageDir, pkg);
      res.json({ success: true, total: skeletons.length, skeletons });
    } catch (error) {
      failInternal(res, error);
    }
  });

  router.get('/:id/skeleton/:skeletonId', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const skeletonId = String(req.params.skeletonId ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      failNotFound(res, `资源包不存在：${id}`);
      return;
    }

    const files = readSkeletonFiles(packageDir, pkg, skeletonId);
    if (!files) {
      failNotFound(res, `立绘不存在：${skeletonId}`);
      return;
    }

    res.json({ success: true, id: skeletonId, files });
  });

  // 头像：hasCharacter 分类的 index 同级 avatar 目录
  router.get('/:id/avatar/:file(*)', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);
    const content = pkg?.contents.find((item) => item.key === 'hasCharacter');

    if (!packageDir || !pkg || !content?.supported) {
      failNotFound(res, `资源包不存在或未声明角色资源：${id}`);
      return;
    }

    const indexDir = resolveInside(packageDir, content.path);
    const avatarDir = indexDir ? resolveInside(indexDir, content.avatar) : null;
    const target = avatarDir ? resolveInside(avatarDir, String(req.params.file ?? '')) : null;

    sendFile(res, target);
  });

  // 立绘文件：Skeletons 分类目录 / 立绘 id / 文件名
  router.get('/:id/skeleton/:skeletonId/:file(*)', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);
    const content = pkg?.contents.find((item) => item.key === 'Skeletons');

    if (!packageDir || !pkg || !content?.supported) {
      failNotFound(res, `资源包不存在或未声明骨骼资源：${id}`);
      return;
    }

    const root = resolveInside(packageDir, content.path);
    const dir = root ? resolveInside(root, String(req.params.skeletonId ?? '')) : null;
    const target = dir ? resolveInside(dir, String(req.params.file ?? '')) : null;

    sendFile(res, target);
  });

  return router;
}

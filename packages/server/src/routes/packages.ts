import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  readPackageCharacters,
  readSkeletonFiles,
  resolveInside,
  resolvePackageDir,
  scanResourcePackages,
} from '../config/packages.js';
import { getStoragePaths } from '../config/paths.js';

/** 允许直接下发的静态资源类型 */
const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.skel': 'application/octet-stream',
  '.atlas': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function notFound(res: Response, message: string) {
  res.status(404).json({ success: false, error: message });
}

function fail(res: Response, error: unknown) {
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : String(error),
  });
}

function sendFile(res: Response, target: string | null) {
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    notFound(res, '文件不存在');
    return;
  }

  const mime = MIME_BY_EXTENSION[path.extname(target).toLowerCase()];
  if (!mime) {
    notFound(res, '不支持的文件类型');
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
 * - `GET /api/packages/:id/skeleton/:skeletonId` 立绘目录内的文件清单
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
      fail(res, error);
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!pkg) {
      notFound(res, `资源包不存在：${id}`);
      return;
    }

    res.json({ success: true, package: pkg });
  });

  router.get('/:id/characters', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      notFound(res, `资源包不存在：${id}`);
      return;
    }

    try {
      const characters = readPackageCharacters(packageDir, pkg);
      res.json({ success: true, total: characters.length, characters });
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/:id/skeleton/:skeletonId', (req: Request, res: Response) => {
    const id = String(req.params.id ?? '');
    const skeletonId = String(req.params.skeletonId ?? '');
    const packageDir = resolvePackageDir(id);
    const pkg = scanResourcePackages().find((item) => item.id === id);

    if (!packageDir || !pkg) {
      notFound(res, `资源包不存在：${id}`);
      return;
    }

    const files = readSkeletonFiles(packageDir, pkg, skeletonId);
    if (!files) {
      notFound(res, `立绘不存在：${skeletonId}`);
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
      notFound(res, `资源包不存在或未声明角色资源：${id}`);
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
      notFound(res, `资源包不存在或未声明骨骼资源：${id}`);
      return;
    }

    const root = resolveInside(packageDir, content.path);
    const dir = root ? resolveInside(root, String(req.params.skeletonId ?? '')) : null;
    const target = dir ? resolveInside(dir, String(req.params.file ?? '')) : null;

    sendFile(res, target);
  });

  return router;
}

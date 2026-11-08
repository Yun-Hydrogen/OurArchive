import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeStorage, type StorageInitResult } from './config/storage.js';
import { loadPreloadAssets } from './config/preload.js';
import { ensureSpineRuntime } from './config/spine.js';
import { resolvePort, SERVER_HOST } from './config/server.js';
import { resolvePublicUrl, resolveNetworkUrl } from './config/publicUrl.js';
import { mountClient, resolveClientDistPath } from './app/mountClient.js';
import { createPreloadRouter } from './routes/preload.js';
import { createConfigRouter } from './routes/config.js';
import { createPackagesRouter } from './routes/packages.js';
import { printStartupInfo } from './utils/banner.js';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const PORT = resolvePort();
const publicUrl = resolvePublicUrl();
const networkUrl = resolveNetworkUrl();

async function start() {
  // 启动即初始化资源目录与全局配置（首次启动会自动创建）
  let storage: StorageInitResult;
  try {
    storage = initializeStorage();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const preload = loadPreloadAssets(currentDir, storage.paths);

  // Spine 运行时不随代码分发：缺失时在这里询问是否下载；拒绝也照常启动
  const spine = await ensureSpineRuntime(storage.paths);

  const app = express();
  const clientDistPath = resolveClientDistPath(currentDir);

  app.use(express.json());
  // 运行时插件由本地缓存目录直接托管（前端动态 import）
  app.use(
    '/plugins',
    express.static(storage.paths.pluginsDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        }
      },
    })
  );
  app.use('/api/preload', createPreloadRouter());
  app.use('/api/config', createConfigRouter());
  app.use('/api/packages', createPackagesRouter());

  mountClient(app, clientDistPath);

  app.listen(PORT, SERVER_HOST, () => {
    printStartupInfo({
      port: PORT,
      publicUrl,
      networkUrl,
      storage: storage.paths,
      firstRun: storage.firstRun,
      configCount: Object.keys(storage.config).length,
      clientDistPath,
      preload,
      spine,
    });
  });
}

void start().catch((error) => {
  console.error('[Our Archive] 启动失败:', error instanceof Error ? error.message : error);
  process.exit(1);
});

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeStorage, type StorageInitResult } from './config/storage.js';
import { loadPreloadAssets } from './config/preload.js';
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

// 启动即初始化资源目录与全局配置（首次启动会自动创建）
let storage: StorageInitResult;
try {
  storage = initializeStorage();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const preload = loadPreloadAssets(currentDir, storage.paths);

const app = express();
const clientDistPath = resolveClientDistPath(currentDir);

app.use(express.json());
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
    settingsCount: Object.keys(storage.settings).length,
    clientDistPath,
    preload,
  });
});

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeStorage, type StorageInitResult } from './config/storage.js';
import { printStartupInfo } from './utils/banner.js';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// 启动即初始化资源目录与全局配置（首次启动会自动创建）
let storage: StorageInitResult;
try {
  storage = initializeStorage();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = express();

// Frontend static assets location (check both dev and compiled paths)
const clientDistCandidates = [
  path.resolve(currentDir, '../../client/dist'),
  path.resolve(currentDir, '../client/dist'),
  path.resolve(currentDir, './client/dist'),
  path.resolve(process.cwd(), 'packages/client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist'),
];

const clientDistPath = clientDistCandidates.find((dir) => fs.existsSync(dir)) ?? null;

if (clientDistPath) {
  app.use(express.static(clientDistPath));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  printStartupInfo({
    port: PORT,
    storage: storage.paths,
    firstRun: storage.firstRun,
    settingsCount: Object.keys(storage.settings).length,
    clientDistPath,
  });
});

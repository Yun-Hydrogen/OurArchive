import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distReleaseDir = path.resolve(rootDir, 'dist_release');
const clientDistDir = path.resolve(rootDir, 'packages/client/dist');
const preloadAssetsFile = path.resolve(rootDir, 'preload_assets.yml');

const targetArg = (process.argv[2] || 'all').toLowerCase();

function run(cmd, desc) {
  console.log(`\n[Our Archive Package] >>> ${desc || cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function buildClient() {
  run('npm run build -w @our-archive/client', '构建前端生产环境产物');
}

function copyPreloadAndClient(targetDir) {
  // 1. 复制根目录 preload_assets.yml
  if (fs.existsSync(preloadAssetsFile)) {
    fs.copyFileSync(preloadAssetsFile, path.join(targetDir, 'preload_assets.yml'));
  } else {
    console.warn(`[Our Archive Package] 警告: 未在根目录找到 preload_assets.yml`);
  }

  // 2. 复制前端产物至 client/
  const targetClientDir = path.join(targetDir, 'client');
  cleanDir(targetClientDir);
  fs.cpSync(clientDistDir, targetClientDir, { recursive: true });
}

function packageWindows() {
  console.log('\n======================================================');
  console.log(' [Our Archive] 开始打包: Windows (x64 单文件 exe)');
  console.log('======================================================');

  const outDir = path.join(distReleaseDir, 'OurArchive-windows-x64');
  cleanDir(outDir);

  const tempWinDir = path.join(distReleaseDir, '.temp_win');
  cleanDir(tempWinDir);

  try {
    // 1. 编译后端为 CJS 单文件
    run(
      'npx tsup packages/server/src/index.ts --format cjs --target node20 --out-dir dist_release/.temp_win --clean',
      '编译 Windows 后端 bundle'
    );

    // 2. 使用 @yao-pkg/pkg 的 --sea 生成独立可执行文件 OurArchive.exe
    const entryJs = fs.existsSync(path.join(tempWinDir, 'index.cjs'))
      ? path.join(tempWinDir, 'index.cjs')
      : path.join(tempWinDir, 'index.js');
    const exeOutput = path.join(outDir, 'OurArchive.exe');
    run(
      `npx @yao-pkg/pkg --sea "${entryJs}" --output "${exeOutput}"`,
      '打包 Windows 单文件 exe (OurArchive.exe)'
    );

    // 3. 复制资源引用（preload_assets.yml 与 client/ 前端产物）
    copyPreloadAndClient(outDir);

    console.log(`\n✔ Windows 打包完成: ${outDir}`);
    console.log(`  启动方式: 双击运行 OurArchive.exe`);
  } finally {
    fs.rmSync(tempWinDir, { recursive: true, force: true });
  }
}

function packageLinux() {
  console.log('\n======================================================');
  console.log(' [Our Archive] 开始打包: Linux (x64 / 通用 node bundle)');
  console.log('======================================================');

  const outDir = path.join(distReleaseDir, 'OurArchive-linux-x64');
  cleanDir(outDir);

  const serverOutDir = path.join(outDir, 'server');
  ensureDir(serverOutDir);

  // 1. 编译后端为单一 ESM bundle
  run(
    `npx tsup packages/server/src/index.ts --format esm --target node20 --out-dir "${serverOutDir}" --clean`,
    '编译 Linux 后端 bundle'
  );

  // 2. 复制资源引用
  copyPreloadAndClient(outDir);

  // 3. 生成 Linux 启动脚本 start.sh (强制 LF 换行)
  const scriptContent = `#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\${SCRIPT_DIR}"

echo "=========================================================="
echo " [Our Archive] Starting on Linux"
echo "=========================================================="

if ! command -v node >/dev/null 2>&1; then
    echo "[Our Archive] Error: Node.js is not found. Please install Node.js (v18+)."
    exit 1
fi

if [ -f "server/index.mjs" ]; then
    exec node server/index.mjs
else
    exec node server/index.js
fi
`.replace(/\r\n/g, '\n');

  const scriptPath = path.join(outDir, 'start.sh');
  fs.writeFileSync(scriptPath, scriptContent, { encoding: 'utf-8', mode: 0o755 });

  console.log(`\n✔ Linux 打包完成: ${outDir}`);
  console.log(`  启动方式: 执行 ./start.sh`);
}

function packageAndroid() {
  console.log('\n======================================================');
  console.log(' [Our Archive] 开始打包: Android (Termux 环境)');
  console.log('======================================================');

  const outDir = path.join(distReleaseDir, 'OurArchive-android');
  cleanDir(outDir);

  const serverOutDir = path.join(outDir, 'server');
  ensureDir(serverOutDir);

  // 1. 编译后端为单一 ESM bundle
  run(
    `npx tsup packages/server/src/index.ts --format esm --target node20 --out-dir "${serverOutDir}" --clean`,
    '编译 Android 后端 bundle'
  );

  // 2. 复制资源引用
  copyPreloadAndClient(outDir);

  // 3. 生成 Android Termux 启动脚本 start.sh (强制 LF 换行)
  const scriptContent = `#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\${SCRIPT_DIR}"

echo "=========================================================="
echo " [Our Archive] Starting on Android (Termux)"
echo " Target Storage: /sdcard/OurArchive"
echo "=========================================================="

if ! command -v node >/dev/null 2>&1; then
    echo "[Our Archive] Error: Node.js is not found."
    echo "In Termux, please execute: pkg install nodejs"
    exit 1
fi

if [ ! -d "/sdcard" ] && [ ! -d "/storage/emulated/0" ]; then
    echo "[Our Archive] Notice: Please run 'termux-setup-storage' to grant storage access if needed."
fi

if [ -f "server/index.mjs" ]; then
    exec node server/index.mjs
else
    exec node server/index.js
fi
`.replace(/\r\n/g, '\n');

  const scriptPath = path.join(outDir, 'start.sh');
  fs.writeFileSync(scriptPath, scriptContent, { encoding: 'utf-8', mode: 0o755 });

  console.log(`\n✔ Android 打包完成: ${outDir}`);
  console.log(`  启动方式: Termux 下执行 ./start.sh`);
}

function main() {
  ensureDir(distReleaseDir);

  console.log(`[Our Archive Package] 目标平台: ${targetArg}`);

  // 全量打包前先构建最新前端产物
  buildClient();

  if (targetArg === 'windows' || targetArg === 'win') {
    packageWindows();
  } else if (targetArg === 'linux') {
    packageLinux();
  } else if (targetArg === 'android') {
    packageAndroid();
  } else if (targetArg === 'all') {
    packageWindows();
    packageLinux();
    packageAndroid();
  } else {
    console.error(`未知打包目标: ${targetArg}，可选: windows, linux, android, all`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log(' [Our Archive] 打包任务已全部完成！产物位于 dist_release/');
  console.log('======================================================\n');
}

main();

import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distReleaseDir = path.resolve(rootDir, 'dist_release');
const clientDistDir = path.resolve(rootDir, 'dist/client');
const preloadAssetsFile = path.resolve(rootDir, 'preload_assets.yml');
const licenseFile = path.resolve(rootDir, 'LICENSE');
const noticesFile = path.resolve(rootDir, 'docs/third-party-notices.md');
/** 服务端 bundle 的临时构建目录（三个平台共用） */
const tempBundleDir = path.resolve(distReleaseDir, '.tmp-server-bundle');
/** @yao-pkg/pkg 的本地入口：缺失时明确报错，而不是让 npx 现拉一个最新版 */
const pkgBin = path.resolve(rootDir, 'node_modules/@yao-pkg/pkg/lib-es5/bin.js');

const pkgJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf8'));
const appVersion = pkgJson.version ?? '0.0.0';

const TARGETS = {
  windows: { label: 'windows-x64', dirName: 'OurArchive-windows-x64', title: 'Windows (x64 单文件 exe)' },
  linux: { label: 'linux-x64', dirName: 'OurArchive-linux-x64', title: 'Linux (x64 / 通用 node bundle)' },
  android: { label: 'android', dirName: 'OurArchive-android', title: 'Android (Termux 环境)' },
};

/* ------------------------------ 参数 ------------------------------ */

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((arg) => arg.startsWith('--')));
const positionals = rawArgs.filter((arg) => !arg.startsWith('--'));
const targetArg = (positionals[0] || 'all').toLowerCase();
const skipBuild = flags.has('--skip-build');
const withArchive = !flags.has('--no-zip');

const KNOWN_FLAGS = new Set(['--skip-build', '--no-zip']);

/* ------------------------------ 输出 ------------------------------ */

const prefix = pc.cyan('[Our Archive Package]');

function log(message) {
  console.log(`${prefix} ${message}`);
}

function step(message) {
  console.log(`\n${prefix} ${pc.bold('>>>')} ${message}`);
}

function warn(message) {
  console.warn(`${pc.yellow('[Our Archive Package] 警告')} ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function run(cmd) {
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

function hasCommand(cmd) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [cmd], { stdio: 'ignore' }).status === 0;
}

function gitCommit() {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: rootDir, encoding: 'utf8' });
  const commit = (result.stdout ?? '').trim();
  return result.status === 0 && commit ? commit : null;
}

/* ------------------------------ 预检 ------------------------------ */

function preflight(targets) {
  step('预检');

  if (!fs.existsSync(licenseFile)) {
    fail(`根目录缺少 LICENSE（AGPL-3.0 要求随二进制分发），拒绝打包：${licenseFile}`);
  }
  log(`${pc.green('✓')} LICENSE 就绪`);

  // preload 清单缺失只提示：资源是否完整由使用者负责，不该阻断打包
  if (fs.existsSync(preloadAssetsFile)) {
    log(`${pc.green('✓')} preload_assets.yml 就绪`);
  } else {
    warn('未在根目录找到 preload_assets.yml，发行包的 preload 校验会失效');
  }

  if (!fs.existsSync(noticesFile)) {
    warn(`${path.relative(rootDir, noticesFile)} 不存在，发行包将缺少第三方许可说明`);
  }

  if (targets.includes('windows')) {
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    if (nodeMajor < 22) {
      fail(`Windows 单文件打包需要 Node >= 22（当前 ${process.version}），这是 @yao-pkg/pkg 的引擎要求`);
    }
    if (!fs.existsSync(pkgBin)) {
      fail('未找到 @yao-pkg/pkg，请先执行 npm install（打包不再通过 npx 临时下载）');
    }
    log(`${pc.green('✓')} @yao-pkg/pkg 就绪（Node ${process.version}）`);
  }
}

function assertClientDist() {
  const entry = path.join(clientDistDir, 'index.html');
  if (!fs.existsSync(entry)) {
    fail(
      `前端产物不存在：${path.relative(rootDir, entry)}，请先执行 npm run build:client（或去掉 --skip-build）`
    );
  }
}

/**
 * 发行包 bundle 必须自包含：只剩 node 内置模块可以留在外面。
 *
 * 依赖被外部化时，仓库里直接跑产物会「蒙对」（Node 向上找到仓库根的 node_modules），
 * 换到用户机器上才炸，所以这里静态扫一遍兜底。
 */
function assertSelfContained(bundlePath) {
  const content = fs.readFileSync(bundlePath, 'utf8');
  const builtins = new Set(builtinModules);
  const offenders = new Set();

  for (const match of content.matchAll(/(?:from\s*|require\(\s*)"([^"]+)"/g)) {
    const specifier = match[1];
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      continue;
    }
    const bare = specifier.startsWith('node:') ? specifier.slice(5) : specifier;
    if (builtins.has(bare)) {
      continue;
    }
    offenders.add(specifier);
  }

  if (offenders.size > 0) {
    fail(
      `发行包 bundle 仍引用外部依赖：${[...offenders].join(', ')} —— ` +
        '检查 tsup.release.config.ts 的 noExternal（发行包里没有 node_modules）'
    );
  }
}

/* ------------------------------ 构建 ------------------------------ */

function buildClient() {
  if (skipBuild) {
    log(pc.dim('--skip-build：跳过前端构建，复用 dist/client'));
    return;
  }
  step('构建前端生产环境产物');
  run('npm run build:client');
}

/**
 * 构建服务端 bundle（三个平台共用同一份）。
 *
 * 三项约束缺一不可，全部是「在仓库里测不出来、到用户机器上才炸」的类型：
 *
 * 1. **必须内联依赖**（`tsup.release.config.ts` 的 `noExternal`）。发行包没有 node_modules。
 *    仓库里直接跑产物会向上找到仓库根的 node_modules，看起来一切正常。
 * 2. **扩展名必须是 `.cjs`**。发行包里没有带 `"type": "module"` 的 package.json：
 *    - 裸 `.js` 会被当 CommonJS → ESM 产物抛 `SyntaxError: Cannot use import statement outside a module`；
 *    - `.mjs` 虽然强制 ESM，但 express 等 CJS 依赖内部有运行时 `require()`，
 *      esbuild 的 ESM 输出会抛 `Dynamic require of "path" is not supported`。
 *    CJS 输出两者都绕开，而且正好是 Windows SEA（`pkg --sea`）需要的形式——所以三个平台共用一个 bundle。
 * 3. **不能在仓库内验证启动**。冒烟必须在仓库外的新目录里跑。
 */
function buildServerBundle() {
  step('构建服务端 bundle（Windows / Linux / Android 共用）');
  cleanDir(tempBundleDir);
  run(`npx tsup --config tsup.release.config.ts --format cjs --out-dir "${tempBundleDir}" --clean`);

  const source = [path.join(tempBundleDir, 'index.cjs'), path.join(tempBundleDir, 'index.js')].find((file) =>
    fs.existsSync(file)
  );
  if (!source) {
    fail(`tsup 未产出预期入口：${path.relative(rootDir, tempBundleDir)} 下既没有 index.cjs 也没有 index.js`);
  }

  const target = path.join(tempBundleDir, 'index.cjs');
  if (source !== target) {
    fs.renameSync(source, target);
  }

  assertSelfContained(target);
  log(`${pc.green('✓')} 服务端 bundle: ${path.relative(rootDir, target)}`);
  return target;
}

/* ------------------------------ 发行包内容 ------------------------------ */

/** 复制运行期必须的引用文件：preload 清单 + 前端产物 */
function copyRuntime(targetDir) {
  if (fs.existsSync(preloadAssetsFile)) {
    fs.copyFileSync(preloadAssetsFile, path.join(targetDir, 'preload_assets.yml'));
  }

  const targetClientDir = path.join(targetDir, 'client');
  fs.cpSync(clientDistDir, targetClientDir, { recursive: true });
  log(`已复制前端产物 → ${path.relative(rootDir, targetClientDir)}`);
}

function readmeFor(target) {
  const header = `Our Archive ${appVersion}（${TARGETS[target].label}）`;
  const common = `
关于
  非官方同人衍生的视觉小说制作 / 播放工具，与《蔚蓝档案》版权方及运营方无关联。
  代码以 AGPL-3.0-only 分发（见 LICENSE）；resources 内美术音频资产为 CC BY-NC-ND 4.0。
  第三方许可说明见 docs/third-party-notices.md。

首次启动
  1. 在用户目录下创建数据目录（Windows: 我的文档\\OurArchive，Linux: ~/OurArchive，
     Android: /sdcard/OurArchive），用于存放 res / preload / config / plugins。
  2. 若缺少立绘运行时，会说明许可并让你选择「自动下载 / 手动放入 / 跳过」，
     三种选择都能正常启动，跳过时仅立绘预览不可用。
  3. 浏览器访问 http://localhost:5173/ 。
`;

  if (target === 'windows') {
    return `${header}

启动
  双击 OurArchive.exe（单文件，无需安装 Node.js）。
  也可以在本目录执行：OurArchive.exe
${common}`;
  }

  const envHint =
    target === 'android'
      ? `  需要 Node.js：pkg install nodejs
  若提示存储受限，先执行：termux-setup-storage`
      : '  需要 Node.js 18+（推荐 20 / 22）。';

  return `${header}

启动
  1. 赋予执行权限：chmod +x start.sh
  2. 运行：./start.sh

  说明：在 Windows 上打出的 zip 不保留 Unix 可执行位，解压后 start.sh 通常需要
  先 chmod +x；如果不想改权限，直接执行 bash start.sh 也可以。

环境
${envHint}
${common}`;
}

function writeStartScript(target, outDir) {
  const isAndroid = target === 'android';
  const title = isAndroid ? 'Starting on Android (Termux)' : 'Starting on Linux';
  const storageLine = isAndroid
    ? 'echo " Target Storage: /sdcard/OurArchive"'
    : 'echo " Default Storage: ${HOME}/OurArchive"';
  const nodeHint = isAndroid
    ? 'echo "In Termux, please execute: pkg install nodejs"'
    : 'echo "Please install Node.js 18+ (20/22 recommended)."';

  const storageCheck = isAndroid
    ? `
if [ ! -d "/sdcard" ] && [ ! -d "/storage/emulated/0" ]; then
    echo "[Our Archive] Notice: run 'termux-setup-storage' to grant storage access if needed."
fi
`
    : '';

  const script = `#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\${SCRIPT_DIR}"

echo "=========================================================="
echo " [Our Archive] ${title}"
${storageLine}
echo "=========================================================="

if ! command -v node >/dev/null 2>&1; then
    echo "[Our Archive] Error: Node.js is not found."
    ${nodeHint}
    exit 1
fi
${storageCheck}
if [ ! -f "server/index.cjs" ]; then
    echo "[Our Archive] Error: server/index.cjs is missing. This release package is incomplete."
    exit 1
fi

exec node server/index.cjs
`.replace(/\r\n/g, '\n');

  const scriptPath = path.join(outDir, 'start.sh');
  fs.writeFileSync(scriptPath, script, { encoding: 'utf-8' });
  fs.chmodSync(scriptPath, 0o755);
}

/** LICENSE / 第三方声明 / README.txt / build-info.json */
function writeReleaseMeta(target, outDir) {
  fs.copyFileSync(licenseFile, path.join(outDir, 'LICENSE'));

  if (fs.existsSync(noticesFile)) {
    const docsDir = path.join(outDir, 'docs');
    ensureDir(docsDir);
    fs.copyFileSync(noticesFile, path.join(docsDir, 'third-party-notices.md'));
  }

  fs.writeFileSync(path.join(outDir, 'README.txt'), readmeFor(target), 'utf-8');

  const info = {
    name: pkgJson.name ?? 'our-archive',
    version: appVersion,
    target: TARGETS[target].label,
    builtAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    commit: gitCommit(),
  };
  fs.writeFileSync(path.join(outDir, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`, 'utf-8');
}

/* ------------------------------ 归档 ------------------------------ */

/**
 * 打 zip。
 *
 * ⚠️ 不能用 PowerShell 的 `Compress-Archive`：它在 Windows 上会把条目名写成
 * `OurArchive-linux-x64\start.sh`（反斜杠），Linux 解压时会得到一个叫
 * `OurArchive-linux-x64\start.sh` 的怪文件。改用 bsdtar（`tar -a`，Windows 10+ 自带）
 * 或 Info-ZIP（`zip`），两者都写正斜杠。
 *
 * 注：Windows 侧来源文件本身没有可执行位，zip 里 `start.sh` 的模式是 0o666。
 * 不尝试改写 zip 的 ExternalAttributes（试过，.NET 会写出 0o772 这种怪值），
 * 改为在 README.txt 里把 `chmod +x start.sh` 作为第一步、并给出 `bash start.sh` 兜底。
 */
function createZip(outDir, zipPath) {
  const parent = path.dirname(outDir);
  const base = path.basename(outDir);

  if (hasCommand('zip')) {
    run(`cd "${parent}" && zip -rq "${zipPath}" "${base}"`);
    return true;
  }
  if (hasCommand('tar')) {
    // bsdtar：`-a` 按扩展名选压缩器，.zip 走 libarchive 的 zip 写入器
    run(`cd "${parent}" && tar -a -c -f "${zipPath}" "${base}"`);
    return true;
  }
  return false;
}

function archive(target, outDir) {
  if (!withArchive) {
    return null;
  }

  const zipPath = path.join(distReleaseDir, `OurArchive-${TARGETS[target].label}-v${appVersion}.zip`);
  fs.rmSync(zipPath, { force: true });

  try {
    if (!createZip(outDir, zipPath)) {
      warn('本机既没有 zip 也没有 tar，跳过归档');
      return null;
    }
  } catch (error) {
    warn(`归档失败，已跳过（不影响发行目录）：${error.message}`);
    return null;
  }

  log(`${pc.green('✓')} 归档: ${path.relative(rootDir, zipPath)}`);
  return zipPath;
}

/* ------------------------------ 各平台 ------------------------------ */

function packageWindows(bundle) {
  const outDir = path.join(distReleaseDir, TARGETS.windows.dirName);
  cleanDir(outDir);

  const exeOutput = path.join(outDir, 'OurArchive.exe');
  step('打包 Windows 单文件 exe (OurArchive.exe)');
  run(`node "${pkgBin}" --sea "${bundle}" --output "${exeOutput}"`);

  copyRuntime(outDir);
  writeReleaseMeta('windows', outDir);
  return { outDir, archivePath: archive('windows', outDir) };
}

function packagePosix(target, bundle) {
  const outDir = path.join(distReleaseDir, TARGETS[target].dirName);
  cleanDir(outDir);

  const serverOutDir = path.join(outDir, 'server');
  ensureDir(serverOutDir);
  const serverEntry = path.join(serverOutDir, 'index.cjs');
  fs.copyFileSync(bundle, serverEntry);
  log(`已写入服务端产物 → ${path.relative(rootDir, serverEntry)}`);

  copyRuntime(outDir);
  writeStartScript(target, outDir);
  writeReleaseMeta(target, outDir);
  return { outDir, archivePath: archive(target, outDir) };
}

/* ------------------------------ 入口 ------------------------------ */

function resolveTargets() {
  if (targetArg === 'all') {
    return ['windows', 'linux', 'android'];
  }
  if (targetArg === 'windows' || targetArg === 'win') {
    return ['windows'];
  }
  if (targetArg === 'linux') {
    return ['linux'];
  }
  if (targetArg === 'android') {
    return ['android'];
  }
  return null;
}

function printSummary(results, startedAt) {
  const total = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n${pc.cyan('='.repeat(62))}`);
  console.log(` ${pc.bold('[Our Archive] 打包结果')}${pc.dim(`（总耗时 ${total}s）`)}`);
  console.log(pc.cyan('='.repeat(62)));

  for (const item of results) {
    const mark = item.ok ? pc.green('✔ 成功') : pc.red('✘ 失败');
    const time = `${(item.ms / 1000).toFixed(1)}s`.padStart(6);
    const name = TARGETS[item.target].label.padEnd(12);
    console.log(` ${mark} ${name}${pc.dim(time)}  ${item.detail}`);
  }
  console.log('');
}

function main() {
  const startedAt = Date.now();

  for (const flag of flags) {
    if (!KNOWN_FLAGS.has(flag)) {
      warn(`未知参数 ${flag}（可用: ${[...KNOWN_FLAGS].join(' / ')}）`);
    }
  }

  if (targetArg === 'clean') {
    cleanDir(distReleaseDir);
    log(`已清空 ${path.relative(rootDir, distReleaseDir) || 'dist_release'}`);
    return;
  }

  const targets = resolveTargets();
  if (!targets) {
    console.error(`未知打包目标: ${targetArg}`);
    console.error('可选: windows | linux | android | all | clean');
    process.exit(1);
  }

  ensureDir(distReleaseDir);
  log(`目标平台: ${pc.bold(targets.join(', '))}${withArchive ? '' : pc.dim('（--no-zip：不归档）')}`);

  preflight(targets);
  buildClient();
  assertClientDist();

  // 三个平台共用同一份 CJS bundle（Windows 直接塞进 SEA，Linux/Android 作为 server/index.cjs）
  const bundle = buildServerBundle();

  const results = [];
  try {
    for (const target of targets) {
      const targetStart = Date.now();
      step(`开始打包: ${TARGETS[target].title}`);

      try {
        const output = target === 'windows' ? packageWindows(bundle) : packagePosix(target, bundle);
        const detail = [
          path.relative(rootDir, output.outDir),
          output.archivePath ? `+ ${path.basename(output.archivePath)}` : '',
        ]
          .filter(Boolean)
          .join('  ');

        results.push({ target, ok: true, ms: Date.now() - targetStart, detail });
        console.log(`\n${pc.green('✔')} ${TARGETS[target].title} 完成: ${output.outDir}`);
      } catch (error) {
        results.push({ target, ok: false, ms: Date.now() - targetStart, detail: error.message });
        console.error(`\n${pc.red('✘')} ${TARGETS[target].title} 失败: ${error.message}`);
      }
    }
  } finally {
    fs.rmSync(tempBundleDir, { recursive: true, force: true });
  }

  printSummary(results, startedAt);

  if (results.some((item) => !item.ok)) {
    process.exit(1);
  }
  log(pc.green('全部目标打包完成，产物位于 dist_release/'));
}

main();

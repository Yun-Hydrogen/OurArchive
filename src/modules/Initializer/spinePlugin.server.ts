import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import pc from 'picocolors';
import type { StoragePaths } from './paths.js';

/**
 * Spine 运行时插件。
 *
 * 运行时 **不随本项目分发**（其许可要求使用者自行取得 Spine Editor 许可），
 * 因此首次启动时检查资源目录下的 `plugins/spine/`，缺失时提供三种选择：
 *   1. 自动下载并加载（推荐）
 *   2. 手动放入文件夹（稍后自行放置）
 *   3. 强制无 Spine 加载（不推荐，立绘预览不可用）
 *
 * 无论选择哪种，服务都会继续启动；前端只通过 `/plugins/spine/*.mjs` 动态加载
 * 这里的文件，构建期不依赖任何 `@esotericsoftware/*` 包。浏览器不能直接执行
 * TypeScript，所以缓存的是官方 npm 包里的 ESM 产物（`.mjs`），而不是源码 `.ts`。
 */
export const SPINE_RUNTIME_VERSION = '4.2.120';

export const SPINE_RUNTIME_FILES = ['spine-webgl.mjs', 'spine-canvas.mjs', 'LICENSE'] as const;

const LICENSE_URL = 'https://esotericsoftware.com/spine-runtimes-license';

const DOWNLOAD_TIMEOUT_MS = 60_000;

/** 交互选择等待上限：避免没有真实输入时把启动卡死 */
const PROMPT_TIMEOUT_MS = 30_000;

/** 启动时用户选择的运行时处理方式 */
export type SpineRuntimeChoice = 'auto' | 'manual' | 'none';

interface DownloadSpec {
  /** 写入 plugins/spine/ 的文件名 */
  file: string;
  /** 依次尝试的下载地址 */
  sources: string[];
}

function buildSources(pkg: string, file: string): string[] {
  const relative = file === 'LICENSE' ? 'LICENSE' : `dist/esm/${file}`;
  return [
    `https://cdn.jsdelivr.net/npm/@esotericsoftware/${pkg}@${SPINE_RUNTIME_VERSION}/${relative}`,
    `https://unpkg.com/@esotericsoftware/${pkg}@${SPINE_RUNTIME_VERSION}/${relative}`,
  ];
}

const DOWNLOADS: DownloadSpec[] = [
  { file: 'spine-webgl.mjs', sources: buildSources('spine-webgl', 'spine-webgl.mjs') },
  { file: 'spine-canvas.mjs', sources: buildSources('spine-canvas', 'spine-canvas.mjs') },
  { file: 'LICENSE', sources: buildSources('spine-webgl', 'LICENSE') },
];

export interface SpineRuntimeStatus {
  /** plugins/spine 的绝对路径 */
  dir: string;
  /** 三个必需文件是否齐全 */
  installed: boolean;
  /** 缺失的文件名 */
  missing: string[];
}

/**
 * 检查 `plugins/spine/` 是否具备前端需要的运行时文件。
 * 只做文件存在性检查，不解析内容。
 */
export function getSpineRuntimeStatus(paths: StoragePaths): SpineRuntimeStatus {
  const dir = paths.spinePluginDir;
  const missing = SPINE_RUNTIME_FILES.filter((file) => {
    try {
      const stats = fs.statSync(path.join(dir, file));
      return !stats.isFile() || stats.size === 0;
    } catch {
      return true;
    }
  });

  return { dir, installed: missing.length === 0, missing: [...missing] };
}

/**
 * 启动时确保 Spine 运行时可用。
 *
 * 该函数不会阻止服务启动：自动下载失败、选择手动放置或强制无 Spine 加载
 * 都只是打印提示，由前端在使用立绘预览时报出具体错误。
 */
export async function ensureSpineRuntime(paths: StoragePaths): Promise<SpineRuntimeStatus> {
  const status = getSpineRuntimeStatus(paths);
  if (status.installed) {
    return status;
  }

  printMissingNotice(status);

  const choice = await askForChoice();

  if (choice === 'manual') {
    printManualInstructions(status);
    return status;
  }

  if (choice === 'none') {
    console.log(
      `  ${pc.yellow('!')}  ${pc.yellow(
        '已选择强制无 Spine 加载（不推荐）：立绘预览会直接报错，其他功能不受影响。'
      )}`
    );
    console.log();
    return status;
  }

  console.log();
  console.log(`  ${pc.cyan('…')}  正在下载 Spine 运行时 v${SPINE_RUNTIME_VERSION} …`);

  try {
    fs.mkdirSync(status.dir, { recursive: true });
    for (const spec of DOWNLOADS) {
      await downloadToDirectory(spec, status.dir);
      console.log(`     ${pc.green('✓')} ${spec.file}`);
    }
  } catch (error) {
    console.error(
      `  ${pc.red('✗')}  下载失败：${error instanceof Error ? error.message : String(error)}`
    );
    console.error('  已按「手动放入文件夹」继续启动。');
    printManualInstructions(status);
    return getSpineRuntimeStatus(paths);
  }

  const installed = getSpineRuntimeStatus(paths);
  if (installed.installed) {
    console.log(`  ${pc.green('✓')}  Spine 运行时已安装：${pc.dim(installed.dir)}`);
  } else {
    console.log(
      `  ${pc.yellow('!')}  下载未完成（缺少 ${installed.missing.join('、')}），服务将继续启动。`
    );
  }
  console.log();
  return installed;
}

function printMissingNotice(status: SpineRuntimeStatus) {
  console.log();
  console.log(
    `  ${pc.yellow('!')}  ${pc.bold('未检测到 Spine 运行时')}：${pc.dim(status.dir)}`
  );
  console.log(
    `     ${pc.dim(`需要：${SPINE_RUNTIME_FILES.join('、')}（v${SPINE_RUNTIME_VERSION}）`)}`
  );
  console.log(`     ${pc.dim(`缺失：${status.missing.join('、')}`)}`);
  console.log();
  console.log('  立绘骨骼预览依赖 Esoteric Software 的 Spine Runtimes。');
  console.log('  下载并安装即表示你已阅读并同意 Spine Runtimes License Agreement：');
  console.log('    · 每个使用者必须自行拥有 Spine Editor 许可证');
  console.log('    · 再分发时必须保留许可证与版权声明');
  console.log('    · 运行时按“原样”提供，不附带任何担保');
  console.log(`  许可全文：${pc.cyan(LICENSE_URL)}`);
  console.log();
  console.log('  请选择处理方式：');
  console.log(`    ${pc.bold('A)')} 自动下载并加载${pc.dim('（推荐）')}`);
  console.log(`    ${pc.bold('B)')} 手动放入文件夹${pc.dim('（稍后自行放置）')}`);
  console.log(`    ${pc.bold('C)')} 强制无 Spine 加载${pc.dim('（不推荐，立绘预览不可用）')}`);
  console.log();
}

function printManualInstructions(status: SpineRuntimeStatus) {
  console.log();
  console.log(`  请把以下文件放入：${pc.cyan(status.dir)}`);
  console.log(`     ${SPINE_RUNTIME_FILES.join('、')}（v${SPINE_RUNTIME_VERSION}）`);
  console.log('  下载地址：');
  for (const spec of DOWNLOADS) {
    console.log(`     ${pc.dim(spec.sources[0])}`);
  }
  console.log('  放入后重启后端即可生效。');
  console.log();
}

function normalizeChoice(value: string | undefined): SpineRuntimeChoice | null {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'auto':
    case 'a':
    case '1':
    case 'download':
      return 'auto';
    case 'manual':
    case 'b':
    case '2':
    case 'skip':
      return 'manual';
    case 'none':
    case 'c':
    case '3':
    case 'off':
      return 'none';
    default:
      return null;
  }
}

function isInteractiveInput(): boolean {
  // npm run dev 由 concurrently 转发输入，子进程 stdin 是管道而不是 TTY
  if (process.env.OUR_ARCHIVE_INTERACTIVE === '1') {
    return true;
  }
  if (process.env.OUR_ARCHIVE_INTERACTIVE === '0') {
    return false;
  }
  return process.stdin.isTTY === true;
}

function askWithTimeout(
  rl: ReturnType<typeof createInterface>,
  prompt: string
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), PROMPT_TIMEOUT_MS);
    rl.question(prompt).then(
      (answer) => finish(answer),
      () => finish(null)
    );
  });
}

async function askForChoice(): Promise<SpineRuntimeChoice> {
  const configured = normalizeChoice(process.env.OUR_ARCHIVE_SPINE_MODE);
  if (configured) {
    console.log(`  已通过 OUR_ARCHIVE_SPINE_MODE 选择：${configured}`);
    return configured;
  }

  // 兼容旧开关：只表示「自动下载」
  if (process.env.OUR_ARCHIVE_SPINE_DOWNLOAD === '1') {
    console.log('  已通过 OUR_ARCHIVE_SPINE_DOWNLOAD=1 选择：auto');
    return 'auto';
  }

  if (!isInteractiveInput()) {
    console.log('  当前不是交互式启动，默认选择：manual（手动放入文件夹）。');
    console.log('  可用 OUR_ARCHIVE_SPINE_MODE=auto|manual|none 指定。');
    console.log();
    return 'manual';
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = await askWithTimeout(
        rl,
        pc.cyan('  请选择 [A/B/C]（默认 B）：')
      );
      if (answer === null) {
        console.log('  等待选择超时，默认选择：manual（手动放入文件夹）。');
        return 'manual';
      }
      const value = answer.trim();
      if (!value) {
        return 'manual';
      }
      if (value === '1' || /^a/i.test(value)) {
        return 'auto';
      }
      if (value === '2' || /^b/i.test(value)) {
        return 'manual';
      }
      if (value === '3' || /^c/i.test(value)) {
        return 'none';
      }
      console.log('  请输入 A、B 或 C。');
    }
  } catch {
    // stdin 被关闭（Ctrl+D / 父进程退出）时按手动放置处理，不能卡住启动
    return 'manual';
  } finally {
    rl.close();
  }
}

async function downloadToDirectory(spec: DownloadSpec, targetDir: string) {
  const errors: string[] = [];

  for (const source of spec.sources) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      // 防止 CDN 返回 200 的错误页：运行时是数百 KB，许可证也应有正文
      const minimumBytes = spec.file.endsWith('.mjs') ? 1024 : 100;
      if (bytes.byteLength < minimumBytes) {
        throw new Error(`响应内容过小（${bytes.byteLength} B）`);
      }

      const target = path.join(targetDir, spec.file);
      const temporary = `${target}.download`;
      fs.writeFileSync(temporary, bytes);
      fs.renameSync(temporary, target);
      return;
    } catch (error) {
      errors.push(
        `${new URL(source).host}：${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  throw new Error(`${spec.file} 全部下载源失败（${errors.join('；')}）`);
}

import pc from 'picocolors';
import path from 'node:path';
import type { StoragePaths } from '../config/paths.js';
import type { PreloadCheckResult } from '../config/preload.js';

export interface StartupInfo {
  /** 后端监听端口 */
  port: number;
  /** 本地访问地址 */
  publicUrl: string;
  /** 局域网访问地址 */
  networkUrl?: string | null;
  storage: StoragePaths;
  firstRun: boolean;
  /** 已加载的全局配置项数量 */
  settingsCount: number;
  /** 可用的前端构建产物目录，未构建时为 null */
  clientDistPath: string | null;
  /** 预加载资源检查结果 */
  preload?: PreloadCheckResult;
}

export function printStartupInfo(info: StartupInfo) {
  const { port, publicUrl, networkUrl, storage, firstRun, settingsCount, clientDistPath, preload } =
    info;
  const line = pc.cyan('═'.repeat(58));

  const rel = (target: string) => path.relative(storage.rootDir, target) || '.';

  console.log();
  console.log(line);
  console.log(pc.bold(pc.cyan('   ___             ___             _     _           ')));
  console.log(pc.bold(pc.cyan('  / _ \\ _   _ _ __/ _ \\ _ __  ____| |__ (_)_   _____ ')));
  console.log(pc.bold(pc.cyan(' | | | | | | | \'__/ /_\\ \\ \'__|/ __| \'_ \\| \\ \\ / / _ \\')));
  console.log(pc.bold(pc.cyan(' | |_| | |_| | |  |  _  | |  | (__| | | | |\\ V /  __/')));
  console.log(pc.bold(pc.cyan('  \\___/ \\__,_|_|  |_| |_|_|   \\___|_| |_|_| \\_/ \\___|')));
  console.log(pc.dim('        -- Blue Archive Visual Novel Simulator --'));
  console.log(line);
  console.log();
  console.log(`  ${pc.green('➜')}  ${pc.bold('Local:')}      ${pc.cyan(publicUrl)}`);
  if (networkUrl) {
    console.log(`  ${pc.green('➜')}  ${pc.bold('Network:')}    ${pc.cyan(networkUrl)}`);
  }
  console.log(`  ${pc.green('➜')}  ${pc.bold('Server:')}     ${pc.dim(`:${port}`)}`);
  console.log();
  console.log(`  ${pc.green('➜')}  ${pc.bold('Platform:')}   ${pc.yellow(storage.platform)}`);
  console.log(`  ${pc.green('➜')}  ${pc.bold('Storage:')}    ${pc.yellow(storage.rootDir)}`);
  console.log(
    `  ${pc.green('➜')}  ${pc.bold('Dirs:')}       ${pc.dim(
      `${rel(storage.resDir)}/  ${rel(storage.preloadDir)}/  ${rel(storage.configDir)}/`
    )}`
  );
  console.log(
    `  ${pc.green('➜')}  ${pc.bold('Config:')}     ${pc.dim(
      `${rel(storage.settingsFile)}  (${settingsCount} 项)`
    )}`
  );

  if (preload) {
    const preloadStatus = preload.isComplete
      ? pc.green(`${preload.loaded}/${preload.total} 项就绪`)
      : pc.yellow(`不完整 (${preload.loaded}/${preload.total} 项就绪, 缺失 ${preload.missing} 项)`);
    console.log(
      `  ${pc.green('➜')}  ${pc.bold('Preload:')}    ${preloadStatus}`
    );
  }

  console.log();
  console.log(
    `  ${pc.cyan('★')}  ${pc.bold(pc.green('后端启动完成！'))}${pc.bold('可通过局域网在浏览器中打开访问。')}`
  );

  if (firstRun) {
    console.log(`  ${pc.cyan('★')}  ${pc.dim('首次启动：已初始化资源目录与配置文件')}`);
  }

  if (preload && !preload.isComplete) {
    console.log();
    console.log(
      `  ${pc.yellow('!')}  ${pc.yellow(
        pc.bold('警告：preload不完整，可能影响体验，请从第三方分发处获得preload资源。')
      )}`
    );
    if (preload.missingItems.length > 0) {
      const preview = preload.missingItems
        .slice(0, 4)
        .map((item) => item.file)
        .join(', ');
      const more =
        preload.missingItems.length > 4 ? ` 等共 ${preload.missingItems.length} 项` : '';
      console.log(`     ${pc.dim(`缺失文件: ${preview}${more}`)}`);
    }
  }

  if (!clientDistPath) {
    console.log();
    console.log(
      `  ${pc.yellow('!')}  ${pc.dim('未找到前端构建产物，执行')} ${pc.bold('npm run build')} ${pc.dim(
        '后再启动即可托管前端页面'
      )}`
    );
  }

  console.log();
  console.log(`  ${pc.dim('Press')} ${pc.bold('Ctrl+C')} ${pc.dim('to stop the server')}`);
  console.log(line);
  console.log();
}

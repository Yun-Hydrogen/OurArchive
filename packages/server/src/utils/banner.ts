import pc from 'picocolors';
import path from 'node:path';
import type { StoragePaths } from '../config/paths.js';

export interface StartupInfo {
  port: number;
  storage: StoragePaths;
  firstRun: boolean;
  /** 已加载的全局配置项数量 */
  settingsCount: number;
  /** 可用的前端构建产物目录，未构建时为 null */
  clientDistPath: string | null;
}

export function printStartupInfo(info: StartupInfo) {
  const { port, storage, firstRun, settingsCount, clientDistPath } = info;
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
  console.log(`  ${pc.green('➜')}  ${pc.bold('Local:')}     ${pc.cyan(`http://localhost:${port}/`)}`);
  console.log(`  ${pc.green('➜')}  ${pc.bold('Network:')}   ${pc.cyan(`http://<本机局域网IP>:${port}/`)}`);
  console.log();
  console.log(`  ${pc.green('➜')}  ${pc.bold('Platform:')}  ${pc.yellow(storage.platform)}`);
  console.log(`  ${pc.green('➜')}  ${pc.bold('Storage:')}   ${pc.yellow(storage.rootDir)}`);
  console.log(
    `  ${pc.green('➜')}  ${pc.bold('Dirs:')}      ${pc.dim(
      `${rel(storage.resDir)}/  ${rel(storage.preloadDir)}/  ${rel(storage.configDir)}/`
    )}`
  );
  console.log(
    `  ${pc.green('➜')}  ${pc.bold('Config:')}    ${pc.dim(
      `${rel(storage.settingsFile)}  (${settingsCount} 项)`
    )}`
  );

  if (firstRun) {
    console.log();
    console.log(`  ${pc.cyan('★')}  ${pc.bold('首次启动：已初始化资源目录与配置文件')}`);
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

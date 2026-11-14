import { defineConfig } from 'tsup';

/**
 * 发行包专用的服务端打包配置（`scripts/package.js` 使用）。
 *
 * 与 `npm run build:server`（产出 `dist/server/index.js`）的关键区别：
 *
 * - **必须内联全部 dependencies**。发行包里没有 `node_modules`，Windows 又是 Node SEA
 *   （`@yao-pkg/pkg --sea`），它的 `require` 只认内置模块。ttsup 默认把
 *   `package.json` 的 `dependencies` 当外部依赖，留在 bundle 里会导致：
 *   - SEA: `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: express`
 *   - 普通 Node: `ERR_MODULE_NOT_FOUND: Cannot find package 'express'`
 * - 在仓库里直接跑发行产物会「蒙对」——Node 会向上层目录找到仓库根的 `node_modules`，
 *   所以这个坑必须在仓库外验证（见 agents/NeedNotice.md）。
 */
export default defineConfig({
  entry: { index: 'src/index.ts' },
  platform: 'node',
  target: 'node20',
  // 把所有非内置模块都打进 bundle，只留 node: 内置模块为外部
  noExternal: [/.*/],
  splitting: false,
  sourcemap: false,
});

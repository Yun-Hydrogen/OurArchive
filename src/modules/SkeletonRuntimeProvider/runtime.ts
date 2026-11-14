/**
 * Spine 运行时的浏览器端加载器。
 *
 * 后端启动时把运行时下载到用户资源目录的 `plugins/spine/`，再由后端以
 * `/plugins` 静态托管。这里用运行时字符串 `import()` 拉取，Vite 不会把它
 * 打进入口 chunk，也不会在构建期解析 `@esotericsoftware/*`。
 */
import type { SpineCanvasRuntime, SpineWebglRuntime } from './types';

export const SPINE_RUNTIME_BASE = '/plugins/spine';
export const SPINE_WEBGL_FILE = 'spine-webgl.mjs';
export const SPINE_CANVAS_FILE = 'spine-canvas.mjs';

type ModuleLoader<T> = () => Promise<T>;

function createLoader<T>(file: string): ModuleLoader<T> {
  let pending: Promise<T> | null = null;

  return () => {
    if (!pending) {
      pending = import(/* @vite-ignore */ `${SPINE_RUNTIME_BASE}/${file}`).catch(
        (cause: unknown) => {
          // 失败后允许下次重试（例如用户补装了插件后刷新页面）
          pending = null;
          const detail = cause instanceof Error ? cause.message : String(cause);
          throw new Error(
            `无法加载 Spine 运行时 ${file}。请按后端启动提示安装到资源目录的 plugins/spine/ 下。` +
              `（${detail}）`
          );
        }
      ) as Promise<T>;
    }
    return pending;
  };
}

/** 加载 WebGL 运行时（同时包含 core API） */
export const loadSpineWebglRuntime = createLoader<SpineWebglRuntime>(SPINE_WEBGL_FILE);

/** 加载 Canvas 运行时（同时包含 core API） */
export const loadSpineCanvasRuntime = createLoader<SpineCanvasRuntime>(SPINE_CANVAS_FILE);

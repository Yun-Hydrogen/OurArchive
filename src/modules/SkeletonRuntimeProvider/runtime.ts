/**
 * Spine Pixi 运行时的浏览器端加载器。
 *
 * 后端启动时把运行时下载到用户资源目录的 `plugins/spine/`，再由后端以
 * `/plugins` 静态托管。这里通过注入脚本标签拉取并注册到 window.spine。
 */
import * as PIXI from 'pixi.js';
import type { SpinePixiRuntime } from './spineTypes';

export const SPINE_RUNTIME_BASE = '/plugins/spine';
export const SPINE_PIXI_FILE = 'spine-pixi.js';

let pendingLoader: Promise<SpinePixiRuntime> | null = null;

export function loadSpinePixiRuntime(): Promise<SpinePixiRuntime> {
  if (pendingLoader) {
    return pendingLoader;
  }

  pendingLoader = new Promise<SpinePixiRuntime>((resolve, reject) => {
    // 确保全局挂载了 PIXI，供 spine-pixi-v7 IIFE 的 require-shim 使用
    if (typeof window !== 'undefined') {
      (window as any).PIXI = PIXI;
    }

    if (typeof window !== 'undefined' && (window as any).spine?.Spine) {
      resolve((window as any).spine as SpinePixiRuntime);
      return;
    }

    const script = document.createElement('script');
    script.src = `${SPINE_RUNTIME_BASE}/${SPINE_PIXI_FILE}`;
    script.async = true;

    script.onload = () => {
      const runtime = (window as any).spine as SpinePixiRuntime | undefined;
      if (runtime && runtime.Spine) {
        resolve(runtime);
      } else {
        pendingLoader = null;
        reject(
          new Error(
            'Spine Pixi 运行时加载完成，但未检测到 window.spine。请确认 /plugins/spine/spine-pixi.js 文件完整。'
          )
        );
      }
    };

    script.onerror = () => {
      pendingLoader = null;
      script.remove();
      reject(
        new Error(
          `无法加载 Spine 运行时 ${SPINE_PIXI_FILE}。请按后端启动提示安装到资源目录的 plugins/spine/ 下。`
        )
      );
    };

    document.head.appendChild(script);
  });

  return pendingLoader;
}

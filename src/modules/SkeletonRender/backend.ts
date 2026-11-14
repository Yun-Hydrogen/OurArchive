/**
 * 立绘渲染后端的公共契约。
 *
 * 舞台的坐标运算（包围盒居中、缩放、平移、y 轴翻转）统一放在 `useSpineStage` 里，
 * 后端只负责「把已经摆好位置的骨骼画出来」，所以两条路径的画面完全一致。
 *
 * 运行时本身不在构建期解析：由 `runtime.ts` 从 `/plugins/spine/*.mjs` 动态加载，
 * 后端工厂返回所选 ESM 包里的 core API，保证解析器与渲染器来自同一份运行时。
 */
import { loadSpineCanvasRuntime, loadSpineWebglRuntime } from '@/modules/SkeletonRuntimeProvider/runtime';
import { normalizeSpineRendererMode, type SpineRendererMode } from '@/modules/ConfigProvider/rendererMode';
import type { SpineCoreRuntime, SpineSkeleton, SpineTextureAtlas } from '@/modules/SkeletonRuntimeProvider/spineTypes';
import { createCanvasBackend } from './canvasBackend';
import { createWebglBackend } from './webglBackend';

export type { SpineRendererMode } from '@/modules/ConfigProvider/rendererMode';
export { normalizeSpineRendererMode } from '@/modules/ConfigProvider/rendererMode';
export { SpineCanvasLockedError } from './canvasBackend';
export { SPINE_RUNTIME_BASE } from '@/modules/SkeletonRuntimeProvider/runtime';

export type SpineBackendKind = 'webgl' | 'canvas';

export interface SpineBackend {
  readonly kind: SpineBackendKind;
  /**
   * 给图集页挂上贴图。
   *
   * 贴图**由后端自己解码**：两条路径对 alpha 的处理不同（WebGL 要预乘 + mipmap，
   * canvas 2d 要直通），所以这里只给「页名 → 文件」，不传现成的 bitmap。
   */
  bindTextures(atlas: SpineTextureAtlas, fileOf: (pageName: string) => File | null): Promise<void>;
  /** 画布 CSS 尺寸或 DPR 变化时调用 */
  setViewport(width: number, height: number, dpr: number): void;
  /** 骨骼的 x / y / scale 已由舞台算好，后端只负责画 */
  render(skeleton: SpineSkeleton, debug: boolean): void;
  /** 被替换 / 卸载时调用，需要释放贴图（解码可能仍在进行，回调里自行判断） */
  dispose(): void;
}

export interface SpineBackendHandle {
  backend: SpineBackend;
  /** 与后端同源的 core API：Skeleton / TextureAtlas 等必须和渲染器来自同一份运行时 */
  runtime: SpineCoreRuntime;
}

/**
 * 用一张一次性 canvas 探测 WebGL 能力。
 *
 * 必须先探测再动正式画布：一旦在正式画布上 `getContext('webgl')` 失败但占用了
 * 上下文槽位，就再也拿不到 2d 上下文了。
 */
function canUseWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = (probe.getContext('webgl2') ??
      probe.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      return false;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * 按模式选择后端：
 *   - `aggressive`：只用 WebGL，不可用时直接报错，方便暴露环境问题；
 *   - `stable`：优先 WebGL，失败退回 canvas 2d；
 *   - `conservative`：只用 canvas 2d。
 */
export async function createSpineBackend(
  canvas: HTMLCanvasElement,
  mode: SpineRendererMode
): Promise<SpineBackendHandle> {
  if (mode !== 'conservative') {
    if (canUseWebGL()) {
      try {
        const runtime = await loadSpineWebglRuntime();
        return { backend: createWebglBackend(canvas, runtime), runtime };
      } catch (error) {
        if (mode === 'aggressive') {
          throw error;
        }
        // 稳定模式：继续尝试 canvas 2d，画布没被锁死就还能用
      }
    } else if (mode === 'aggressive') {
      throw new Error(
        '当前环境不支持 WebGL。可在设置里把「立绘渲染器」改成「稳定」或「保守」。'
      );
    }
  }

  const runtime = await loadSpineCanvasRuntime();
  return { backend: createCanvasBackend(canvas, runtime), runtime };
}

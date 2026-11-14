/**
 * canvas 2d 后端：spine-canvas 的三角形渲染。
 *
 * 每帧成本 = 三角形数 ×（save + clip + drawImage 整页贴图）。绝大多数 BA 立绘只有
 * 几十到三百个三角形，完全够用；阿罗娜 / 普拉娜这种 5000+ 三角形的密集形变网格会
 * 明显掉帧，所以这条路径只作为「保守」模式和 WebGL 不可用时的兜底。
 */
import type { SpineBackend } from './backend';
import type { SpineCanvasRuntime, SpineSkeleton, SpineTextureAtlas } from '@/modules/SkeletonRuntimeProvider/spineTypes';

/** 画布已被 WebGL 占用，`getContext('2d')` 永远拿不到上下文，只能换一张 <canvas> */
export class SpineCanvasLockedError extends Error {
  constructor() {
    super('画布已被其他渲染上下文占用');
    this.name = 'SpineCanvasLockedError';
  }
}

export function createCanvasBackend(
  canvas: HTMLCanvasElement,
  runtime: SpineCanvasRuntime
): SpineBackend {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new SpineCanvasLockedError();
  }

  const renderer = new runtime.SkeletonRenderer(ctx);
  renderer.triangleRendering = true;

  let width = 1;
  let height = 1;

  return {
    kind: 'canvas',

    async bindTextures(atlas: SpineTextureAtlas, fileOf) {
      // canvas 2d 只吃直通 alpha：预乘过的 bitmap 画上去会把半透明边缘压暗
      for (const page of atlas.pages) {
        const file = fileOf(page.name);
        if (file) {
          page.setTexture(new runtime.CanvasTexture(await createImageBitmap(file)));
        }
      }
    },

    setViewport(nextWidth, nextHeight, dpr) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    render(skeleton: SpineSkeleton, debug: boolean) {
      renderer.debugRendering = debug;
      ctx.clearRect(0, 0, width, height);
      renderer.draw(skeleton);
    },

    dispose() {
      renderer.debugRendering = false;
    },
  };
}

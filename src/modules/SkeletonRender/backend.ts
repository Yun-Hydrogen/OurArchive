/**
 * 立绘渲染后端：基于 Pixi.js v7 舞台与统一渲染器。
 */
import * as PIXI from 'pixi.js';
import { loadSpinePixiRuntime } from '@/modules/SkeletonRuntimeProvider/runtime';
import type {
  SpinePixiRuntime,
  SpineTextureAtlas,
} from '@/modules/SkeletonRuntimeProvider/spineTypes';

export type SpineBackendKind = 'pixi-webgl' | 'webgl' | 'canvas';

export interface SpineBackend {
  readonly kind: SpineBackendKind;
  readonly app: PIXI.Application;
  bindTextures(
    atlas: SpineTextureAtlas,
    fileOf: (pageName: string) => File | null
  ): Promise<void>;
  setViewport(width: number, height: number, dpr: number): void;
  render(): void;
  dispose(): void;
}

export interface SpineBackendHandle {
  backend: SpineBackend;
  runtime: SpinePixiRuntime;
}

export async function createSpineBackend(
  canvas: HTMLCanvasElement
): Promise<SpineBackendHandle> {
  const runtime = await loadSpinePixiRuntime();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const app = new PIXI.Application({
    view: canvas,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: dpr,
    powerPreference: 'high-performance',
    sharedTicker: true,
  });

  const createdTextures: PIXI.BaseTexture[] = [];

  const backend: SpineBackend = {
    kind: 'pixi-webgl',
    app,
    async bindTextures(atlas, fileOf) {
      for (const page of atlas.pages) {
        const file = fileOf(page.name);
        if (!file) {
          throw new Error(`图集页 ${page.name} 缺少对应贴图文件`);
        }
        // 走预乘 alpha (PMA) 解码，贴合 BA 图集规范
        const bitmap = await createImageBitmap(file, {
          premultiplyAlpha: 'premultiply',
        });
        const baseTexture = new PIXI.BaseTexture(bitmap, {
          alphaMode: PIXI.ALPHA_MODES.PMA,
          mipmap: PIXI.MIPMAP_MODES.POW2,
        });
        // SpineTexture constructor 读取 image.resource.source，必须接收 BaseTexture
        if (!baseTexture.resource) {
          (baseTexture as any).resource = { source: bitmap };
        } else if (!(baseTexture.resource as any).source) {
          (baseTexture.resource as any).source = bitmap;
        }
        createdTextures.push(baseTexture);
        page.setTexture(runtime.SpineTexture.from(baseTexture));
      }
    },
    setViewport(width: number, height: number, resolution: number) {
      if (app.renderer) {
        app.renderer.resolution = resolution;
        app.renderer.resize(width, height);
      }
    },
    render() {
      app.render();
    },
    dispose() {
      try {
        for (const tex of createdTextures) {
          tex.destroy();
        }
        createdTextures.length = 0;
        app.destroy(false, {
          children: true,
          texture: true,
          baseTexture: true,
        });
      } catch {
        // 忽略卸载可能发生的异常
      }
    },
  };

  return { backend, runtime };
}

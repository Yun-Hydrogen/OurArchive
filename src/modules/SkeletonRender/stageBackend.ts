/**
 * 骨骼舞台的 Pixi 后端：只负责 Application 生命周期、视口与渲染，
 * 不包含任何 Spine / DragonBones 业务逻辑。
 */
import * as PIXI from 'pixi.js';
import type { SpineRendererMode } from '@/modules/ConfigProvider/rendererMode';

export type StageBackendKind = 'pixi-webgl' | 'pixi-canvas';

export interface StageBackend {
  readonly kind: StageBackendKind;
  readonly app: PIXI.Application;
  setViewport(width: number, height: number, dpr: number): void;
  render(): void;
  dispose(): void;
}

interface CreateOptions {
  /** 允许在 WebGL 不可用时回退 Canvas */
  allowCanvasFallback: boolean;
  /** 强制使用 Canvas 2D */
  forceCanvas: boolean;
}

function createApplication(
  canvas: HTMLCanvasElement,
  dpr: number,
  options: CreateOptions
): PIXI.Application {
  return new PIXI.Application({
    view: canvas,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: dpr,
    powerPreference: 'high-performance',
    sharedTicker: false,
    autoStart: false,
    forceCanvas: options.forceCanvas,
  });
}

function resolveOptions(mode: SpineRendererMode): CreateOptions {
  if (mode === 'conservative') {
    return { allowCanvasFallback: true, forceCanvas: true };
  }
  if (mode === 'aggressive') {
    return { allowCanvasFallback: false, forceCanvas: false };
  }
  return { allowCanvasFallback: true, forceCanvas: false };
}

function backendKindOf(app: PIXI.Application): StageBackendKind {
  return app.renderer.type === PIXI.RENDERER_TYPE.WEBGL ? 'pixi-webgl' : 'pixi-canvas';
}

export function createStageBackend(
  canvas: HTMLCanvasElement,
  mode: SpineRendererMode
): StageBackend {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const options = resolveOptions(mode);

  let app: PIXI.Application;
  try {
    app = createApplication(canvas, dpr, options);
    if (!options.allowCanvasFallback && backendKindOf(app) !== 'pixi-webgl') {
      app.destroy(false, { children: true, texture: false, baseTexture: false });
      throw new Error('当前环境未启用 WebGL；渲染器模式为「激进」时只允许 WebGL。');
    }
  } catch (error) {
    // `stable` 在 WebGL 初始化失败时再尝试一次 Canvas
    if (options.forceCanvas || !options.allowCanvasFallback) {
      throw error;
    }
    app = createApplication(canvas, dpr, { allowCanvasFallback: true, forceCanvas: true });
  }

  // 由 useSkeletonStage 统一驱动，Application 自身不跑 ticker
  app.ticker.stop();

  const backend: StageBackend = {
    kind: backendKindOf(app),
    app,
    setViewport(width, height, resolution) {
      app.renderer.resolution = resolution;
      app.renderer.resize(width, height);
    },
    render() {
      app.render();
    },
    dispose() {
      try {
        app.ticker.stop();
        app.destroy(false, { children: true, texture: false, baseTexture: false });
      } catch {
        // 忽略卸载异常
      }
    },
  };

  return backend;
}

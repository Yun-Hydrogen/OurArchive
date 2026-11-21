/**
 * 统一骨骼舞台：Pixi Application + 视口交互 + 按骨骼类型分发渲染器。
 *
 * 渲染器只负责骨骼本身的加载与动画；舞台负责 fit / pan / zoom、
 * 单 ticker 驱动、静态模式脏渲染，以及向外暴露角色根容器供表情挂载。
 */
import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import * as PIXI from 'pixi.js';
import type { SpineRendererMode } from '@/modules/ConfigProvider/rendererMode';
import { readonlyRef } from '@/utils/reactivity';
import { createStageBackend, type StageBackend, type StageBackendKind } from './stageBackend';
import { SpineRenderer } from './spineRenderer';
import { DragonBonesRenderer } from './dragonBonesRenderer';
import type {
  SkeletonInfo,
  SkeletonKind,
  SkeletonRenderer,
  SkeletonSource,
  SkeletonVariant,
} from './skeletonTypes';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

export function useSkeletonStage(
  canvas: Ref<HTMLCanvasElement | null>,
  rendererMode?: Ref<SpineRendererMode>
) {
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const error = ref('');
  const info = ref<SkeletonInfo | null>(null);
  const rendererKind = ref<SkeletonKind | 'unknown'>('unknown');
  const variants = ref<SkeletonVariant[]>([]);
  const activeVariant = ref('');
  const actions = ref<string[]>([]);
  const activeAction = ref('');
  const backendKind = ref<StageBackendKind>('pixi-webgl');
  const canvasKey = ref(0);
  const zoom = ref(1);
  const debugRendering = ref(false);

  const mountRoot = shallowRef<PIXI.Container | null>(null);
  /** 始终位于角色之上的覆盖层，供表情挂载 */
  const overlayRoot = shallowRef<PIXI.Container | null>(null);

  let backend: StageBackend | null = null;
  let renderer: SkeletonRenderer | null = null;
  let bounds = new PIXI.Rectangle(0, 0, 1, 1);

  let viewWidth = 1;
  let viewHeight = 1;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let loadToken = 0;
  let resizeObserver: ResizeObserver | null = null;

  let frameId = 0;
  let lastFrameTime = 0;
  let needsRedraw = true;

  function ensureBackend(): StageBackend {
    if (backend) {
      return backend;
    }
    const element = canvas.value;
    if (!element) {
      throw new Error('画布尚未就绪');
    }

    backend = createStageBackend(element, rendererMode?.value ?? 'stable');
    backendKind.value = backend.kind;

    const overlay = new PIXI.Container();
    overlay.eventMode = 'none';
    backend.app.stage.addChild(overlay);
    overlayRoot.value = overlay;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => applySize());
      resizeObserver.observe(element);
    }

    return backend;
  }

  function applyTransform() {
    if (!renderer) {
      return;
    }

    const root = renderer.getMountRoot();
    const fit = Math.min(
      (viewWidth * 0.94) / Math.max(bounds.width, 1),
      (viewHeight * 0.94) / Math.max(bounds.height, 1)
    );
    const scale = fit * zoom.value;

    root.scale.set(scale);
    root.x = viewWidth / 2 + panX - (bounds.x + bounds.width / 2) * scale;
    root.y = viewHeight / 2 + panY - (bounds.y + bounds.height / 2) * scale;
    needsRedraw = true;
  }

  function applySize() {
    const element = canvas.value;
    if (!element || !backend) {
      return;
    }
    const cssWidth = element.clientWidth;
    const cssHeight = element.clientHeight;
    if (!cssWidth || !cssHeight) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewWidth = cssWidth;
    viewHeight = cssHeight;
    backend.setViewport(cssWidth, cssHeight, dpr);
    applyTransform();
  }

  function stopLoop() {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function startLoop() {
    if (frameId) {
      return;
    }

    lastFrameTime = performance.now();
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      const delta = Math.min(Math.max((now - lastFrameTime) / 1000, 0), 0.05);
      lastFrameTime = now;

      if (!backend || !renderer) {
        return;
      }

      if (activeAction.value) {
        renderer.update(delta);
        needsRedraw = true;
      }

      if (needsRedraw) {
        backend.render();
        needsRedraw = false;
      }
    };
    frameId = requestAnimationFrame(tick);
  }

  function disposeRenderer() {
    if (renderer) {
      try {
        renderer.destroy();
      } catch {
        // 忽略卸载异常
      }
      renderer = null;
    }
    mountRoot.value = null;
  }

  function disposeStage() {
    stopLoop();
    resizeObserver?.disconnect();
    resizeObserver = null;
    disposeRenderer();
    backend?.dispose();
    backend = null;
    overlayRoot.value = null;
  }

  async function load(source: SkeletonSource | null) {
    const token = ++loadToken;
    status.value = 'loading';
    error.value = '';
    zoom.value = 1;
    panX = 0;
    panY = 0;
    needsRedraw = true;

    if (!source) {
      disposeRenderer();
      status.value = 'idle';
      info.value = null;
      variants.value = [];
      actions.value = [];
      activeVariant.value = '';
      activeAction.value = '';
      rendererKind.value = 'unknown';
      return;
    }

    try {
      const stage = ensureBackend();
      disposeRenderer();

      const nextRenderer: SkeletonRenderer =
        source.kind === 'spine' ? new SpineRenderer() : new DragonBonesRenderer();
      await nextRenderer.load(source, stage.app);
      if (token !== loadToken) {
        nextRenderer.destroy();
        return;
      }

      renderer = nextRenderer;
      rendererKind.value = source.kind;
      mountRoot.value = nextRenderer.getMountRoot();
      bounds = nextRenderer.getBounds();

      // 新渲染器是加到 app.stage 末尾的，覆盖层要重新提到最上层
      if (overlayRoot.value) {
        stage.app.stage.addChild(overlayRoot.value);
      }

      info.value = nextRenderer.getInfo();
      variants.value = nextRenderer.getVariants();
      actions.value = nextRenderer.getActions();
      activeVariant.value = variants.value[0]?.name ?? '';
      activeAction.value = actions.value.find((name) => /idle/i.test(name)) ?? '';

      if (activeVariant.value) {
        nextRenderer.setVariant(activeVariant.value);
      }
      nextRenderer.setAction(activeAction.value);
      nextRenderer.setDebug(debugRendering.value);

      // 差分与动作会换掉附件，包围盒要以换装后的姿态重新计算
      nextRenderer.update(0);
      bounds = nextRenderer.getBounds();

      applySize();
      status.value = 'ready';
      needsRedraw = true;
      startLoop();
    } catch (cause) {
      if (token !== loadToken) {
        return;
      }
      disposeRenderer();
      status.value = 'error';
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  function setVariant(name: string) {
    activeVariant.value = name;
    renderer?.setVariant(name);
    needsRedraw = true;
  }

  function setAction(name: string) {
    activeAction.value = name;
    renderer?.setAction(name);
    needsRedraw = true;
  }

  function setZoom(nextZoom: number) {
    zoom.value = Math.max(MIN_ZOOM, Math.min(nextZoom, MAX_ZOOM));
    applyTransform();
  }

  function resetView() {
    zoom.value = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 && event.button !== 1) return;
    dragging = true;
    dragStartX = event.clientX - panX;
    dragStartY = event.clientY - panY;
    (event.target as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    panX = event.clientX - dragStartX;
    panY = event.clientY - dragStartY;
    applyTransform();
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (event.target as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
  }

  function onWheel(event: WheelEvent) {
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    setZoom(zoom.value * factor);
  }

  function getMountRoot(): PIXI.Container | null {
    return renderer?.getMountRoot() ?? null;
  }

  function getHeadAnchor(): { x: number; y: number } | null {
    return renderer?.getHeadAnchor() ?? null;
  }

  /** 1 设计像素（以 540x1012 为基准）对应的容器本地单位 */
  function getDesignUnit(): number | null {
    if (!renderer) {
      return null;
    }

    return Math.max(bounds.height / 1012, 0.0001);
  }

  /** 表情覆盖层；始终位于角色之上 */
  function getOverlayRoot(): PIXI.Container | null {
    return overlayRoot.value;
  }

  /** 头顶锚点的舞台全局坐标（含 fit / pan / zoom） */
  function getHeadGlobalAnchor(): { x: number; y: number } | null {
    const root = renderer?.getMountRoot();
    const anchor = renderer?.getHeadAnchor();
    if (!root || !anchor) {
      return null;
    }

    const point = root.toGlobal(new PIXI.Point(anchor.x, anchor.y));
    return { x: point.x, y: point.y };
  }

  /** 1 设计像素对应的舞台全局像素（含 fit / pan / zoom） */
  function getDesignScale(): number | null {
    const root = renderer?.getMountRoot();
    if (!root) {
      return null;
    }

    return Math.max((bounds.height / 1012) * root.scale.x, 0.0001);
  }

  /** 角色包围盒（角色根容器本地坐标） */
  function getCharacterFrame(): PIXI.Rectangle | null {
    return renderer ? renderer.getBounds() : null;
  }

  /** 外部（如表情容器）改动舞台内容后请求重绘 */
  function invalidate() {
    needsRedraw = true;
  }

  watch(debugRendering, (enabled) => {
    renderer?.setDebug(enabled);
    needsRedraw = true;
  });

  onBeforeUnmount(() => {
    loadToken += 1;
    disposeStage();
  });

  return {
    status: readonlyRef(status),
    error: readonlyRef(error),
    info: readonlyRef(info),
    rendererKind: readonlyRef(rendererKind),
    variants: readonlyRef(variants),
    activeVariant: readonlyRef(activeVariant),
    actions: readonlyRef(actions),
    activeAction: readonlyRef(activeAction),
    backendKind: readonlyRef(backendKind),
    canvasKey: readonlyRef(canvasKey),
    zoom: readonlyRef(zoom),
    debugRendering,
    load,
    setVariant,
    setAction,
    setZoom,
    resetView,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    getMountRoot,
    getHeadAnchor,
    getDesignUnit,
    getOverlayRoot,
    getHeadGlobalAnchor,
    getDesignScale,
    getCharacterFrame,
    invalidate,
  };
}

/**
 * Spine 立绘舞台（基于 Pixi.js 引擎）：
 * 把识别好的立绘包载入 Pixi 舞台，驱动差分、动作、缩放与平移，
 * 并将 Spine 容器暴露给外部挂载表情与特效。
 */
import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import * as PIXI from 'pixi.js';
import {
  createSpineBackend,
  type SpineBackend,
  type SpineBackendKind,
} from '@/modules/SkeletonRender/backend';
import type {
  SpineAnimation,
  SpineAnimationState,
  SpineAttachmentTimeline,
  SpineBone,
  SpineBounds,
  SpineInstance,
  SpinePixiRuntime,
  SpineSkeleton,
  SpineSkeletonData,
  SpineSlot,
  SpineTimeline,
} from '@/modules/SkeletonRuntimeProvider/spineTypes';
import { matchTexture, type SpineCharacter } from '@/modules/SkeletonRender/spinePackage';
import { readonlyRef } from '@/utils/reactivity';

export interface SpineLayer {
  slotIndex: number;
  attachmentName: string | null;
}

export interface SpineVariant {
  name: string;
  label: string;
  layers: SpineLayer[];
}

const EXPRESSION_LABELS: Record<string, string> = {
  default: '默认',
  normal: '普通',
  respond: '回应',
  smile: '微笑',
  embarassed: '害羞',
  embarrassed: '害羞',
  serious: '认真',
  angry: '生气',
  sad: '难过',
  cry: '哭泣',
  surprise: '惊讶',
  wink: '眨眼',
  close: '闭眼',
  shy: '害羞',
};

function describeAttachment(name: string | null): string {
  if (!name) {
    return '';
  }
  const clean = name.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
  const tokens = clean.toLowerCase().split(/[^a-z0-9]+/);
  for (const token of tokens) {
    if (EXPRESSION_LABELS[token]) {
      return EXPRESSION_LABELS[token];
    }
  }
  return '';
}

function isAttachmentTimeline(
  timeline: SpineTimeline,
  timelineClass: unknown
): timeline is SpineAttachmentTimeline {
  return (
    typeof timelineClass === 'function' &&
    timeline instanceof (timelineClass as new (...args: unknown[]) => SpineTimeline)
  );
}

export function extractSpineVariants(
  data: SpineSkeletonData,
  runtime: SpinePixiRuntime
): SpineVariant[] {
  const noise = new Set<string>();
  for (const token of String(data.name ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!token) continue;
    noise.add(token);
    noise.add(token.replace(/\d+$/, ''));
  }

  const seen = new Set<string>();
  const variants: SpineVariant[] = [];

  for (const animation of data.animations) {
    if (!/^\d+$/.test(animation.name)) {
      continue;
    }
    const layers: SpineLayer[] = [];
    for (const timeline of animation.timelines) {
      if (!isAttachmentTimeline(timeline, runtime.AttachmentTimeline)) {
        continue;
      }
      const names = timeline.attachmentNames ?? [];
      layers.push({ slotIndex: timeline.slotIndex, attachmentName: names[0] ?? null });
    }
    if (!layers.length) {
      continue;
    }
    const signature = layers
      .map((layer) => `${layer.slotIndex}:${layer.attachmentName ?? ''}`)
      .sort()
      .join('|');
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);

    const described =
      layers
        .map((layer) => describeAttachment(layer.attachmentName))
        .find(
          (text): text is string =>
            Boolean(text) && !noise.has(text!.replace(/\s/g, '').toLowerCase())
        ) ?? null;
    variants.push({
      name: animation.name,
      label: described ? `${animation.name} · ${described}` : animation.name,
      layers,
    });
  }

  return variants.sort((a, b) => Number(a.name) - Number(b.name));
}

function extractSpineActions(data: SpineSkeletonData): string[] {
  return data.animations
    .filter((animation) => !/^\d+$/.test(animation.name))
    .map((animation) => animation.name);
}

export function useSpineStage(
  canvas: Ref<HTMLCanvasElement | null>,
  _rendererMode?: Ref<string>
) {
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const error = ref('');
  const info = ref<{
    bones: number;
    slots: number;
    animations: number;
    version: string;
  } | null>(null);
  const variants = ref<SpineVariant[]>([]);
  const activeVariant = ref('');
  const actions = ref<string[]>([]);
  const activeAction = ref('');
  const backendKind = ref<SpineBackendKind>('pixi-webgl');
  const canvasKey = ref(0);
  const zoom = ref(1);
  const debugRendering = ref(false);

  const spineInstance = shallowRef<SpineInstance | null>(null);
  const pixiApp = shallowRef<PIXI.Application | null>(null);

  const metrics = ref({ unit: 0, anchorX: 0, anchorY: 0, charHeight: 0 });

  let runtime: SpinePixiRuntime | null = null;
  let backend: SpineBackend | null = null;
  let skeletonData: SpineSkeletonData | null = null;
  let bounds: SpineBounds = { x: 0, y: 0, width: 1, height: 1 };

  let viewWidth = 1;
  let viewHeight = 1;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let loadToken = 0;
  let lastCharacter: SpineCharacter | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const variantByName = shallowRef<Map<string, SpineVariant>>(new Map());

  function applyVariantLayers() {
    const inst = spineInstance.value;
    if (!inst) return;
    const variant = variantByName.value.get(activeVariant.value);
    if (!variant) return;
    const skin = inst.skeleton.skin ?? skeletonData?.defaultSkin ?? null;
    for (const layer of variant.layers) {
      const slot = inst.skeleton.slots[layer.slotIndex];
      if (!slot) continue;
      const attachment =
        layer.attachmentName && skin
          ? skin.getAttachment(layer.slotIndex, layer.attachmentName)
          : null;
      slot.setAttachment(attachment);
    }
  }

  function applyTransform() {
    const inst = spineInstance.value;
    if (!inst) return;

    const fit = Math.min(
      (viewWidth * 0.94) / Math.max(bounds.width, 1),
      (viewHeight * 0.94) / Math.max(bounds.height, 1)
    );
    const scale = fit * zoom.value;

    inst.scale.set(scale);

    const localCenterX = bounds.x + bounds.width / 2;
    const localCenterY = bounds.y + bounds.height / 2;
    inst.x = viewWidth / 2 + panX - localCenterX * scale;
    inst.y = viewHeight / 2 + panY - localCenterY * scale;

    const charHeight = Math.max(bounds.height * scale, 1);
    const unit = charHeight / 1012;

    const head = inst.skeleton.findBone?.('Head') ?? null;
    const anchorX = inst.x + (head ? head.worldX * scale : localCenterX * scale);
    const anchorY = inst.y + (head ? head.worldY * scale : bounds.y * scale);

    metrics.value = { unit, anchorX, anchorY, charHeight };
  }

  function applySize() {
    const element = canvas.value;
    if (!element || !backend) return;
    const cssWidth = element.clientWidth;
    const cssHeight = element.clientHeight;
    if (!cssWidth || !cssHeight) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewWidth = cssWidth;
    viewHeight = cssHeight;
    backend.setViewport(cssWidth, cssHeight, dpr);
    applyTransform();
  }

  function disposeStage() {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (spineInstance.value) {
      spineInstance.value.destroy({ children: true });
      spineInstance.value = null;
    }
    backend?.dispose();
    backend = null;
    pixiApp.value = null;
    runtime = null;
    skeletonData = null;
  }

  async function load(character: SpineCharacter) {
    const token = ++loadToken;
    status.value = 'loading';
    error.value = '';
    zoom.value = 1;
    panX = 0;
    panY = 0;
    lastCharacter = character;

    try {
      const element = canvas.value;
      if (!element) {
        throw new Error('画布尚未就绪');
      }

      disposeStage();

      const handle = await createSpineBackend(element);
      if (token !== loadToken) {
        handle.backend.dispose();
        return;
      }

      backend = handle.backend;
      runtime = handle.runtime;
      pixiApp.value = backend.app;
      backendKind.value = backend.kind;

      const atlas = new runtime.TextureAtlas(await character.atlas.text());
      for (const page of atlas.pages) {
        if (!matchTexture(character.textures, page.name)) {
          throw new Error(`图集页 ${page.name} 缺少对应贴图`);
        }
      }
      await backend.bindTextures(atlas, (pageName) =>
        matchTexture(character.textures, pageName)
      );
      if (token !== loadToken) return;

      const loader = new runtime.AtlasAttachmentLoader(atlas);
      let parsedData: SpineSkeletonData;
      if (character.skeleton.name.toLowerCase().endsWith('.json')) {
        const json = JSON.parse(await character.skeleton.text());
        parsedData = new runtime.SkeletonJson(loader).readSkeletonData(json);
      } else {
        const bytes = new Uint8Array(await character.skeleton.arrayBuffer());
        parsedData = new runtime.SkeletonBinary(loader).readSkeletonData(bytes);
      }
      if (token !== loadToken) return;

      skeletonData = parsedData;

      const inst = new runtime.Spine({ skeletonData: parsedData });
      spineInstance.value = inst;
      backend.app.stage.addChild(inst);

      inst.skeleton.setToSetupPose();
      inst.skeleton.updateWorldTransform(runtime.Physics?.update);
      bounds = inst.skeleton.getBoundsRect();

      const parsedVariants = extractSpineVariants(parsedData, runtime);
      variants.value = parsedVariants;
      variantByName.value = new Map(parsedVariants.map((item) => [item.name, item]));
      activeVariant.value = parsedVariants[0]?.name ?? '';

      const parsedActions = extractSpineActions(parsedData);
      actions.value = parsedActions;
      const nextAction = parsedActions.find((name) => /idle/i.test(name)) ?? '';
      activeAction.value = nextAction;

      inst.state.clearTracks();
      if (nextAction) {
        inst.state.setAnimation(0, nextAction, true);
        inst.autoUpdate = true;
      } else {
        inst.autoUpdate = false;
      }

      applyVariantLayers();

      info.value = {
        bones: parsedData.bones.length,
        slots: parsedData.slots.length,
        animations: parsedData.animations.length,
        version: parsedData.version ?? 'unknown',
      };

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(() => applySize());
        resizeObserver.observe(element);
      }

      applySize();
      status.value = 'ready';
    } catch (cause) {
      if (token !== loadToken) return;
      disposeStage();
      status.value = 'error';
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  function setVariant(name: string) {
    activeVariant.value = name;
    applyVariantLayers();
  }

  function setAction(name: string) {
    activeAction.value = name;
    const inst = spineInstance.value;
    if (!inst) return;
    inst.state.clearTracks();
    if (name) {
      inst.state.setAnimation(0, name, true);
      inst.autoUpdate = true;
    } else {
      inst.autoUpdate = false;
      inst.skeleton.setToSetupPose();
      applyVariantLayers();
    }
  }

  function setZoom(nextZoom: number) {
    zoom.value = Math.max(0.2, Math.min(nextZoom, 4));
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

  watch(debugRendering, (enabled) => {
    const inst = spineInstance.value;
    if (!inst || !runtime) return;
    inst.debug = enabled ? new runtime.SpineDebugRenderer(inst) : null;
  });

  watch(activeVariant, () => {
    applyVariantLayers();
  });

  onBeforeUnmount(() => {
    loadToken += 1;
    disposeStage();
  });

  return {
    status: readonlyRef(status),
    error: readonlyRef(error),
    info: readonlyRef(info),
    variants: readonlyRef(variants),
    activeVariant: readonlyRef(activeVariant),
    actions: readonlyRef(actions),
    activeAction: readonlyRef(activeAction),
    backendKind: readonlyRef(backendKind),
    canvasKey: readonlyRef(canvasKey),
    zoom: readonlyRef(zoom),
    metrics: readonlyRef(metrics),
    spineInstance: readonlyRef(spineInstance),
    pixiApp: readonlyRef(pixiApp),
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
  };
}

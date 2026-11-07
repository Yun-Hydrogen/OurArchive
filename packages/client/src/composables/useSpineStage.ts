/**
 * Spine 立绘舞台：把识别好的立绘包丢进渲染后端，并暴露「立绘差分」选择。
 *
 * BA 立绘骨骼的组织方式是：
 *   - 差分：`00`..`99` 这类纯数字动画，每一条只做一次 AttachmentTimeline 换图，
 *     也就是「换一张脸 / 表情 / 部件组合」。所以差分选择直接改 slot 的 attachment，
 *     不跑动画时间轴，切换是瞬时的。
 *   - 动作：`Idle_01` 这类循环动画，只驱动光环呼吸等部件，可与差分叠加。
 *
 * 每帧顺序固定为「复位 → 应用动作 → 覆盖差分 → 更新世界变换 → 交给后端绘制」，
 * 保证无论怎么组合，差分选择永远生效，且不会残留上一次的 attachment。
 *
 * 绘制本身委托给 `spine/backend` 里的两条路径（WebGL / canvas 2d），这里只做
 * 坐标系运算与生命周期管理：缩放、平移、y 轴翻转对两条路径是同一套算式。
 */
import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import {
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  AttachmentTimeline,
  Physics,
  Skeleton,
  SkeletonBinary,
  SkeletonJson,
  TextureAtlas,
  type SkeletonData,
  type Timeline,
} from '@esotericsoftware/spine-webgl';
import {
  createSpineBackend,
  normalizeSpineRendererMode,
  SpineCanvasLockedError,
  type SpineBackend,
  type SpineBackendKind,
  type SpineRendererMode,
} from '@/composables/spine/backend';
import { matchTexture, type OASpineCharacter } from '@/composables/useSpinePackage';

/** 一条差分 = 若干个 slot 的 attachment 覆盖 */
interface OASpineLayer {
  slotIndex: number;
  attachmentName: string | null;
}

export interface OASpineVariant {
  /** 动画名，也就是差分编号（如 `03`） */
  name: string;
  /** 展示用文案（如 `03 · 微笑`） */
  label: string;
  layers: OASpineLayer[];
}

const EXPRESSION_LABELS: Record<string, string> = {
  default: '默认',
  normal: '普通',
  respond: '回应',
  smile: '微笑',
  embarassed: '害羞',
  embarrassed: '害羞',
  serious: '认真',
  shout: '喊叫',
  depressed: '沮丧',
  pero: '舔唇',
  eyeclose: '闭眼',
  close: '闭眼',
  haircover: '刘海',
  halo: '光环',
};

/** `03_smile` → `微笑`；未知词条退化为首字母大写 */
function prettify(token: string): string {
  const key = token.replace(/[\s_-]/g, '').toLowerCase();
  if (EXPRESSION_LABELS[key]) {
    return EXPRESSION_LABELS[key];
  }
  return token.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** 从附件名里抽出可读的部分：`03_smile` → `微笑`，纯编号则返回 null */
function describeAttachment(name: string | null): string | null {
  if (!name) {
    return null;
  }
  const stripped = name.replace(/^\d+[_-]?/, '');
  if (!stripped || /^\d+$/.test(stripped)) {
    return null;
  }
  return prettify(stripped);
}

function isAttachmentTimeline(timeline: Timeline): timeline is AttachmentTimeline {
  return timeline instanceof AttachmentTimeline;
}

/** 抽出全部差分；同一组图层只保留最先出现的一条，避免 `99` 这类重复项刷屏 */
export function extractVariants(data: SkeletonData): OASpineVariant[] {
  // 角色自身名字（`ako_spr` / `shiroko`）会出现在附件名里，当成标签没有信息量
  const noise = new Set<string>();
  for (const token of String(data.name ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!token) {
      continue;
    }
    noise.add(token);
    noise.add(token.replace(/\d+$/, ''));
  }

  const seen = new Set<string>();
  const variants: OASpineVariant[] = [];

  for (const animation of data.animations) {
    if (!/^\d+$/.test(animation.name)) {
      continue;
    }
    const layers: OASpineLayer[] = [];
    for (const timeline of animation.timelines) {
      if (!isAttachmentTimeline(timeline)) {
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

/** 除差分外的循环 / 单次动画，作为「动作」下拉项 */
function extractActions(data: SkeletonData): string[] {
  return data.animations
    .filter((animation) => !/^\d+$/.test(animation.name))
    .map((animation) => animation.name)
    .sort((a, b) => {
      // 待机动画排最前，其余按名称稳定排序
      const rank = (name: string) => (/idle/i.test(name) ? 0 : 1);
      return rank(a) - rank(b) || a.localeCompare(b);
    });
}

export type OASpineStageStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useSpineStage(
  canvas: Ref<HTMLCanvasElement | null>,
  rendererMode: Ref<SpineRendererMode> = ref<SpineRendererMode>('stable')
) {
  const status = ref<OASpineStageStatus>('idle');
  const error = ref('');
  const variants = shallowRef<OASpineVariant[]>([]);
  const activeVariant = ref('');
  const actions = shallowRef<string[]>([]);
  const activeAction = ref('');
  const zoom = ref(1);
  const debugRendering = ref(false);
  const info = ref<{ bones: number; slots: number; animations: number; version: string } | null>(
    null
  );
  /** 实际生效的渲染后端；切模式后由下一次载入刷新 */
  const backendKind = ref<SpineBackendKind>('canvas');
  /** 换模式时需要一张全新的 <canvas>（同一张画布不能既 webgl 又 2d），交给模板做 :key */
  const canvasKey = ref(0);

  let skeleton: Skeleton | null = null;
  let state: AnimationState | null = null;
  let data: SkeletonData | null = null;
  let backend: SpineBackend | null = null;
  let bounds = { x: 0, y: 0, width: 1, height: 1 };
  let frame = 0;
  let lastTime = 0;
  let resizeObserver: ResizeObserver | null = null;
  let panX = 0;
  let panY = 0;
  /** 画布 CSS 尺寸缓存，避免每帧读 clientWidth 触发同步布局 */
  let viewWidth = 1;
  let viewHeight = 1;
  let loadToken = 0;
  let lastCharacter: OASpineCharacter | null = null;
  /** 已经因画布锁死重试过的 canvasKey，防止无限换画布 */
  let lastLockedKey = -1;
  /** 静态立绘（不播放动作）时靠它判断是否需要重画 */
  let needsRedraw = true;

  const variantByName = shallowRef<Map<string, OASpineVariant>>(new Map());

  function applyVariantLayers() {
    if (!skeleton) {
      return;
    }
    const variant = variantByName.value.get(activeVariant.value);
    if (!variant) {
      return;
    }
    const skin = skeleton.skin ?? data?.defaultSkin ?? null;
    for (const layer of variant.layers) {
      const slot = skeleton.slots[layer.slotIndex];
      if (!slot) {
        continue;
      }
      const attachment =
        layer.attachmentName && skin
          ? skin.getAttachment(layer.slotIndex, layer.attachmentName)
          : null;
      slot.setAttachment(attachment);
    }
  }

  function measure() {
    if (!skeleton) {
      return;
    }
    // 量尺寸时把根变换清干净，否则上一次渲染的位移 / 缩放会混进包围盒
    skeleton.x = 0;
    skeleton.y = 0;
    skeleton.scaleX = 1;
    skeleton.scaleY = 1;
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform(Physics.update);
    bounds = skeleton.getBoundsRect();
  }

  /**
   * 同步画布后备缓冲尺寸与后端视口。
   *
   * 只在尺寸 / DPR 真的变化时动 DOM：以前每帧都读 clientWidth 会强制同步布局，
   * 而 ResizeObserver 已经把「尺寸变了」这件事告诉我们了。
   */
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
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    if (element.width !== width || element.height !== height) {
      element.width = width;
      element.height = height;
    }
    viewWidth = cssWidth;
    viewHeight = cssHeight;
    backend.setViewport(cssWidth, cssHeight, dpr);
    needsRedraw = true;
  }

  function draw(now: number) {
    frame = requestAnimationFrame(draw);
    if (!skeleton || !backend) {
      return;
    }

    // 选「静态」且没有任何输入时不必重画：高密度骨骼的空转也很浪费电
    const animating = Boolean(state && activeAction.value);
    if (!animating && !needsRedraw) {
      return;
    }
    needsRedraw = false;

    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;

    skeleton.setToSetupPose();
    if (animating && state) {
      state.update(delta);
      state.apply(skeleton);
    }
    applyVariantLayers();
    skeleton.updateWorldTransform(Physics.update);

    const fit = Math.min(
      (viewWidth * 0.94) / Math.max(bounds.width, 1),
      (viewHeight * 0.94) / Math.max(bounds.height, 1)
    );
    const scale = fit * zoom.value;

    // 骨骼是 y 轴向上的坐标系，靠 scaleY 取负翻到画布坐标
    skeleton.scaleX = scale;
    skeleton.scaleY = -scale;
    skeleton.x = viewWidth / 2 + panX - (bounds.x + bounds.width / 2) * scale;
    skeleton.y = viewHeight / 2 + panY + (bounds.y + bounds.height / 2) * scale;

    backend.render(skeleton, debugRendering.value);
  }

  function stopLoop() {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    lastTime = 0;
  }

  function disposeStage() {
    stopLoop();
    resizeObserver?.disconnect();
    resizeObserver = null;
    backend?.dispose();
    backend = null;
    skeleton = null;
    state = null;
    data = null;
    variants.value = [];
    actions.value = [];
    variantByName.value = new Map();
    activeVariant.value = '';
    activeAction.value = '';
    info.value = null;
  }

  async function load(character: OASpineCharacter) {
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

      // 换角色时先放掉旧上下文，避免 WebGL 贴图和着色器泄漏
      disposeStage();

      const mode = normalizeSpineRendererMode(rendererMode.value);
      backend = createSpineBackend(element, mode);
      backendKind.value = backend.kind;

      const atlas = new TextureAtlas(await character.atlas.text());
      for (const page of atlas.pages) {
        if (!matchTexture(character.textures, page.name)) {
          throw new Error(`图集页 ${page.name} 缺少对应贴图`);
        }
      }
      await backend.bindTextures(atlas, (pageName) =>
        matchTexture(character.textures, pageName)
      );
      if (token !== loadToken) {
        return;
      }

      const loader = new AtlasAttachmentLoader(atlas);
      let skeletonData: SkeletonData;
      if (character.skeleton.name.toLowerCase().endsWith('.json')) {
        const json = JSON.parse(await character.skeleton.text());
        skeletonData = new SkeletonJson(loader).readSkeletonData(json);
      } else {
        const bytes = new Uint8Array(await character.skeleton.arrayBuffer());
        skeletonData = new SkeletonBinary(loader).readSkeletonData(bytes);
      }
      if (token !== loadToken) {
        return;
      }

      data = skeletonData;
      skeleton = new Skeleton(skeletonData);
      skeleton.setToSetupPose();

      const stateData = new AnimationStateData(skeletonData);
      stateData.defaultMix = 0.15;
      const nextState = new AnimationState(stateData);
      state = nextState;

      const parsedVariants = extractVariants(skeletonData);
      variants.value = parsedVariants;
      variantByName.value = new Map(parsedVariants.map((item) => [item.name, item]));
      activeVariant.value = parsedVariants[0]?.name ?? '';

      const parsedActions = extractActions(skeletonData);
      actions.value = parsedActions;
      const nextAction = parsedActions.find((name) => /idle/i.test(name)) ?? '';
      activeAction.value = nextAction;
      // 与上一次载入同名动作时 watch 不会触发，这里直接起播
      nextState.clearTracks();
      if (nextAction) {
        nextState.setAnimation(0, nextAction, true);
      }

      info.value = {
        bones: skeletonData.bones.length,
        slots: skeletonData.slots.length,
        animations: skeletonData.animations.length,
        version: skeletonData.version ?? 'unknown',
      };

      zoom.value = 1;
      measure();

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(() => applySize());
        resizeObserver.observe(element);
      }

      applySize();
      stopLoop();
      lastTime = 0;
      needsRedraw = true;
      frame = requestAnimationFrame(draw);
      status.value = 'ready';
    } catch (cause) {
      if (token !== loadToken) {
        return;
      }
      disposeStage();
      status.value = 'error';
      // 上一轮用 WebGL 占了画布，这轮要退回 canvas 2d 就必须换一张画布重来
      if (
        cause instanceof SpineCanvasLockedError &&
        lastCharacter &&
        lastLockedKey !== canvasKey.value
      ) {
        canvasKey.value += 1;
        lastLockedKey = canvasKey.value;
        error.value = '';
        return;
      }
      error.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  function setAction(name: string) {
    activeAction.value = name;
  }

  watch(activeAction, (name) => {
    if (!state) {
      return;
    }
    state.clearTracks();
    if (name) {
      state.setAnimation(0, name, true);
    }
    needsRedraw = true;
  });

  watch(debugRendering, () => {
    needsRedraw = true;
  });

  function setVariant(name: string) {
    activeVariant.value = name;
    needsRedraw = true;
  }

  function setZoom(value: number) {
    zoom.value = Math.min(Math.max(value, 0.2), 5);
    needsRedraw = true;
  }

  function resetView() {
    zoom.value = 1;
    panX = 0;
    panY = 0;
    needsRedraw = true;
  }

  /* ------------------------------ 拖拽平移 ------------------------------ */

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    panOriginX = panX;
    panOriginY = panY;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) {
      return;
    }
    panX = panOriginX + (event.clientX - dragStartX);
    panY = panOriginY + (event.clientY - dragStartY);
    needsRedraw = true;
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    setZoom(zoom.value * factor);
  }

  /* ------------------------ 渲染器 / 画布热切换 ------------------------ */

  // DPR 变化（跨屏拖窗口）不会改变 CSS 尺寸，ResizeObserver 收不到，单独补一次
  function onWindowResize() {
    applySize();
  }
  window.addEventListener('resize', onWindowResize);

  // 同一张画布不能既 webgl 又 2d，换模式时直接换一张 <canvas> 再重新载入
  watch(rendererMode, () => {
    if (lastCharacter) {
      canvasKey.value += 1;
    }
  });

  watch(
    canvas,
    (element) => {
      if (element && lastCharacter && status.value !== 'loading') {
        void load(lastCharacter);
      }
    },
    { flush: 'post' }
  );

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onWindowResize);
    loadToken += 1;
    disposeStage();
  });

  return {
    status,
    error,
    info,
    variants,
    activeVariant,
    actions,
    activeAction,
    backendKind,
    canvasKey,
    zoom,
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

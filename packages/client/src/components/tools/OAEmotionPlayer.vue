<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import type { PackageEmotion, PackageEmotionLayer } from '@our-archive/shared';
import { useBackgroundMusic } from '@/composables/useBackgroundMusic';
import { useGlobalConfig } from '@/composables/useGlobalConfig';

/**
 * 表情播放层：只负责「按关键帧摆图 + 放音效」，不含任何表情专属逻辑。
 *
 * 所有位移 / 缩放 / 旋转 / 淡出都来自资源包的 `emotions.yml`，
 * 这里把关键帧翻译成 Web Animations，用完即销毁。
 */

const props = defineProps<{
  /** 540 设计宽度对应多少屏幕像素（随角色缩放变化） */
  unit: number;
  /** 头顶锚点在容器内的像素坐标 */
  anchorX: number;
  anchorY: number;
}>();

const { config } = useGlobalConfig();
const { suspend: suspendMainBgm, resume: resumeMainBgm } = useBackgroundMusic();

/** 图层根节点：每层一个 div，子层嵌套在父层里 */
const host = ref<HTMLElement | null>(null);
const playingName = ref('');

let animations: Animation[] = [];
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
let audio: HTMLAudioElement | null = null;

/** 设计基准宽度，与资源包里的参数口径一致 */
const DESIGN_WIDTH = 540;
/** 角色立绘的设计高度，用来把 540 换算成屏幕像素 */
const DESIGN_HEIGHT = 1012;

const rootStyle = computed(() => ({
  left: `${props.anchorX}px`,
  top: `${props.anchorY}px`,
  opacity: props.unit > 0 ? 1 : 0,
}));

function clear() {
  for (const animation of animations) {
    try {
      animation.cancel();
    } catch {
      // 已经被移除的动画，忽略
    }
  }
  animations = [];

  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio = null;
    void resumeMainBgm();
  }

  playingName.value = '';
  if (host.value) {
    host.value.replaceChildren();
  }
}

/** 补间状态：未写的属性沿用上一帧 */
interface ResolvedFrame {
  at: number;
  opacity: number;
  zoom: number;
  x: number;
  y: number;
  rotate: number;
}

function resolveFrames(layer: PackageEmotionLayer): ResolvedFrame[] {
  const frames: ResolvedFrame[] = [];
  let state: ResolvedFrame = { at: 0, opacity: 1, zoom: 1, x: 0, y: 0, rotate: 0 };

  for (const frame of layer.keyframes) {
    state = {
      at: frame.at,
      opacity: frame.opacity ?? state.opacity,
      zoom: frame.zoom ?? state.zoom,
      x: frame.x ?? state.x,
      y: frame.y ?? state.y,
      rotate: frame.rotate ?? state.rotate,
    };
    frames.push({ ...state });
  }

  if (!frames.length) {
    frames.push({ ...state });
  }
  return frames;
}

function transformOf(frame: ResolvedFrame, unit: number): string {
  const x = frame.x * unit;
  const y = frame.y * unit;
  return `translate(${x}px, ${y}px) rotate(${frame.rotate}deg) scale(${frame.zoom})`;
}

/**
 * 递归建层：父层的基准宽度决定子层的 `scale` / `position` 换算。
 * 返回该层的实际渲染宽度与节点，供后续子层引用。
 */
function buildLayer(
  layer: PackageEmotionLayer,
  index: number,
  parentElement: HTMLElement,
  parentWidth: number,
  unit: number
): { width: number; element: HTMLElement } {
  // 用 div 做层容器：<img> 是替换元素，不能承载子层
  const element = document.createElement('div');
  element.style.position = 'absolute';

  const baseWidth = layer.parent >= 0 ? parentWidth * layer.scale : DESIGN_WIDTH * layer.scale * unit;
  // 父层按父宽换算，根层按 540 设计宽换算
  const originUnit = layer.parent >= 0 ? parentWidth : DESIGN_WIDTH * unit;
  const left = layer.position[0] * originUnit;
  const top = layer.position[1] * originUnit;

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.width = `${baseWidth}px`;
  element.style.transformOrigin = `${layer.anchor[0] * 100}% ${layer.anchor[1] * 100}%`;
  element.style.willChange = 'transform, opacity';

  const image = document.createElement('img');
  image.src = layer.image;
  image.alt = '';
  image.draggable = false;
  image.style.display = 'block';
  image.style.width = '100%';
  image.style.height = 'auto';
  image.style.userSelect = 'none';
  element.appendChild(image);

  const frames = resolveFrames(layer);
  element.style.opacity = String(frames[0].opacity);
  element.style.transform = transformOf(frames[0], unit);

  parentElement.appendChild(element);

  // 子层挂在这个元素里，随父层一起位移
  element.style.zIndex = String(index + 1);

  const keyframes = frames.map((frame) => ({
    offset: Math.min(1, Math.max(0, frame.at / layer.duration)),
    opacity: String(frame.opacity),
    transform: transformOf(frame, unit),
  }));

  // offset 必须严格递增，重复时间点会抛错，这里去重后补末帧
  const deduped = keyframes.filter(
    (frame, position) => position === 0 || frame.offset > keyframes[position - 1].offset
  );
  if (deduped[deduped.length - 1]?.offset < 1) {
    deduped.push({ ...deduped[deduped.length - 1], offset: 1 });
  }

  try {
    animations.push(
      element.animate(deduped, {
        duration: Math.max(1, layer.duration * 1000),
        easing: layer.ease,
        fill: 'forwards',
      })
    );
  } catch {
    // 动画不可用时至少把首帧摆对，不阻断其它层
  }

  return { width: baseWidth, element };
}
/** 播放一个表情；同名表情重播会先清掉上一轮 */
function play(emotion: PackageEmotion) {
  clear();

  const element = host.value;
  if (!element || props.unit <= 0) {
    return;
  }

  playingName.value = emotion.id;
  const unit = props.unit;

  const stage = document.createElement('div');
  stage.style.position = 'absolute';
  stage.style.left = `${emotion.offset[0] * DESIGN_WIDTH * unit}px`;
  stage.style.top = `${emotion.offset[1] * DESIGN_WIDTH * unit}px`;
  stage.style.width = '0';
  stage.style.height = '0';
  element.appendChild(stage);

  const widths: number[] = [];
  const nodes: HTMLElement[] = [];
  let maxDuration = 0;

  emotion.layers.forEach((layer, index) => {
    const parentWidth = layer.parent >= 0 ? widths[layer.parent] ?? 0 : 0;
    const container = layer.parent >= 0 && nodes[layer.parent] ? nodes[layer.parent] : stage;
    const built = buildLayer(layer, index, container, parentWidth, unit);
    widths[index] = built.width;
    nodes[index] = built.element;
    maxDuration = Math.max(maxDuration, layer.duration);
  });

  // 音效：跟随「预览音频 / 音效音量」，与主界面 BGM 互斥
  if (emotion.soundUrl) {
    suspendMainBgm();
    audio = new Audio(emotion.soundUrl);
    audio.volume = Math.max(0, Math.min(1, config.value.preview_volume / 100));
    void audio.play().catch(() => {
      void resumeMainBgm();
    });
  }

  cleanupTimer = setTimeout(() => {
    cleanupTimer = null;
    clear();
  }, Math.ceil((maxDuration + 0.15) * 1000));
}

function stop() {
  clear();
}

onBeforeUnmount(clear);

defineExpose({ play, stop, playingName });
</script>

<template>
  <div class="oa-emotion-player" :style="rootStyle">
    <div ref="host" class="oa-emotion-player__host" />
  </div>
</template>

<style scoped>
.oa-emotion-player {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 5;
}

.oa-emotion-player__host {
  position: absolute;
  inset: 0;
}

.oa-emotion-player__host :deep(img) {
  user-select: none;
}
</style>

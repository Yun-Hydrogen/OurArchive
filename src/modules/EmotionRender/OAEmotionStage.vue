<script setup lang="ts">
import { computed, markRaw, onMounted, ref, watch } from 'vue';
import { useSkeletonStage } from '@/modules/SkeletonRender/useSkeletonStage';
import { useGlobalConfig } from '@/modules/ConfigProvider/useGlobalConfig';
import { loadSkeletonFromPackage } from '@/modules/SkeletonRender/skeletonPackage';
import type { PackageEmotion } from '@/modules/API/types';
import {
  useEmotionPlayer,
  type EmotionStageAccess,
} from '@/modules/EmotionRender/useEmotionPlayer';

const props = defineProps<{
  packageId: string;
  skeletonId: string;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const loadError = ref('');

const { config, isLoaded, fetchConfig } = useGlobalConfig();
const rendererMode = computed(() => config.value.spine_renderer);

const {
  status,
  error: stageError,
  info,
  rendererKind,
  canvasKey,
  load,
  resetView,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  getMountRoot,
  getOverlayRoot,
  getHeadGlobalAnchor,
  getDesignScale,
  getCharacterFrame,
  getHeadAnchor,
  invalidate,
} = useSkeletonStage(canvas, rendererMode);

/** 标记 raw，避免 Pixi 容器被 Vue 代理后挂载失效 */
const stageAccess: EmotionStageAccess = markRaw({
  getMountRoot,
  getOverlayRoot,
  getHeadGlobalAnchor,
  getDesignScale,
  getCharacterFrame,
  getHeadAnchor,
  invalidate,
});

const {
  playing,
  error: emotionError,
  play,
  stop,
} = useEmotionPlayer(stageAccess);

let loadToken = 0;

const error = computed(() => loadError.value || stageError.value || emotionError.value);
const isReady = computed(() => status.value === 'ready' && !loadError.value);

const summary = computed(() => {
  if (!info.value) {
    return '';
  }
  const name = rendererKind.value === 'dragonbones' ? 'DragonBones' : 'Spine';
  const version = rendererKind.value === 'dragonbones' ? '' : ` ${info.value.version}`;
  return `${name}${version} · 骨骼 ${info.value.bones} · 动画 ${info.value.animations}`;
});

async function start() {
  const token = ++loadToken;
  stop();
  loadError.value = '';

  if (!props.packageId || !props.skeletonId) {
    await load(null);
    return;
  }

  if (!isLoaded.value) {
    await fetchConfig();
  }

  try {
    const source = await loadSkeletonFromPackage(props.packageId, props.skeletonId);
    if (token !== loadToken) {
      return;
    }
    await load(source);
  } catch (cause) {
    if (token !== loadToken) {
      return;
    }
    loadError.value = `骨骼加载失败：${cause instanceof Error ? cause.message : String(cause)}`;
  }
}

async function playEmotion(emotion: PackageEmotion): Promise<boolean> {
  if (status.value !== 'ready') {
    return false;
  }
  return play(emotion);
}

function stopEmotion() {
  stop();
}

onMounted(() => {
  void start();
});

watch(
  () => [props.packageId, props.skeletonId] as const,
  () => {
    void start();
  }
);

defineExpose({
  playEmotion,
  stopEmotion,
  resetView,
  playing,
  status,
  isReady,
});
</script>

<template>
  <div class="oa-emo-stage">
    <canvas
      ref="canvas"
      :key="canvasKey"
      class="oa-emo-stage__canvas"
      :class="{ 'is-loading': status === 'loading' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      @wheel.prevent="onWheel"
    />

    <div v-if="!skeletonId" class="oa-emo-stage__hint">
      <p>先选择一个角色或骨骼，再点表情开始预览。</p>
    </div>

    <div v-else-if="status === 'loading'" class="oa-emo-stage__hint">
      <span class="oa-emo-stage__spinner" aria-hidden="true"></span>
      <p>正在载入骨骼…</p>
    </div>

    <div v-else-if="error" class="oa-emo-stage__hint is-error">
      <p>{{ error }}</p>
    </div>

    <div class="oa-emo-stage__bar">
      <span v-if="summary" class="oa-emo-stage__summary">{{ summary }}</span>
      <span v-else class="oa-emo-stage__summary">滚轮缩放 · 拖动画布平移</span>
      <button type="button" class="oa-emo-stage__reset" @click="resetView">重置视角</button>
    </div>
  </div>
</template>

<style scoped>
.oa-emo-stage {
  position: relative;
  width: 100%;
  min-height: 340px;
  height: min(54vh, 520px);
  overflow: hidden;
  border: 1px solid rgba(190, 214, 231, 0.6);
  border-radius: 16px;
  background:
    radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.96) 0%, rgba(233, 246, 255, 0.72) 55%, rgba(214, 236, 252, 0.5) 100%),
    #eef7fe;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}

.oa-emo-stage__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.oa-emo-stage__canvas:active {
  cursor: grabbing;
}

.oa-emo-stage__canvas.is-loading {
  opacity: 0.35;
}

.oa-emo-stage__hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  font-size: 12.5px;
  line-height: 1.7;
  color: #7793aa;
  text-align: center;
  pointer-events: none;
}

.oa-emo-stage__hint.is-error {
  color: #b45454;
}

.oa-emo-stage__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(0, 144, 254, 0.18);
  border-top-color: rgba(0, 144, 254, 0.72);
  border-radius: 50%;
  animation: oa-emo-spin 0.8s linear infinite;
}

.oa-emo-stage__bar {
  position: absolute;
  right: 12px;
  bottom: 10px;
  left: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
}

.oa-emo-stage__reset {
  pointer-events: auto;
  padding: 3px 10px;
  border: 1px solid rgba(163, 190, 210, 0.5);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  font-family: inherit;
  font-size: 10.5px;
  color: #6e879b;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.oa-emo-stage__reset:hover {
  border-color: rgba(0, 144, 254, 0.45);
  color: #1769a8;
}

.oa-emo-stage__summary {
  overflow: hidden;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 10.5px;
  color: #7c98ad;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes oa-emo-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

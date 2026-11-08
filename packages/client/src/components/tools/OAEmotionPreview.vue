<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { rizui_button, rizui_infobox, rizui_progress } from 'riz-ui';
import OAEmotionPlayer from '@/components/tools/OAEmotionPlayer.vue';
import { useSpineStage } from '@/composables/useSpineStage';
import { useGlobalConfig } from '@/composables/useGlobalConfig';
import type { PackageEmotion } from '@our-archive/shared';
import type { SpineCharacter } from '@/spinePackage';

/**
 * 表情预览区：左边立绘、右边表情按钮。
 *
 * 立绘走与工具页相同的 `useSpineStage`；表情叠加层按
 * `metrics`（角色在画布上的位置与缩放）对齐到头顶，
 * 因此拖动 / 缩放立绘时表情始终跟着走。
 */
const props = defineProps<{
  character: SpineCharacter | null;
  emotions: PackageEmotion[];
  loading: boolean;
  error: string;
  /** 当前选中的立绘（供标题展示） */
  characterLabel: string;
}>();

const emit = defineEmits<{
  (e: 'pick'): void;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const player = ref<InstanceType<typeof OAEmotionPlayer> | null>(null);

const { config, isLoaded, fetchConfig } = useGlobalConfig();
const rendererMode = computed(() => config.value.spine_renderer);

const {
  status,
  error: stageError,
  metrics,
  zoom,
  backendKind,
  canvasKey,
  load,
  setZoom,
  resetView,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
} = useSpineStage(canvas, rendererMode);

const activeEmotionId = ref('');
const missingImages = computed(() =>
  props.emotions.filter((emotion) => emotion.layers.some((layer) => !layer.exists))
);

const zoomPercent = computed({
  get: () => Math.round(zoom.value * 100),
  set: (value: number) => setZoom(value / 100),
});

const rendererLabel = computed(() => (backendKind.value === 'webgl' ? 'WebGL' : 'Canvas 2D'));

async function start() {
  if (!props.character) {
    return;
  }
  if (!isLoaded.value) {
    await fetchConfig();
  }
  await load(props.character);
}

function playEmotion(emotion: PackageEmotion) {
  // 没有底座立绘时先让用户选一个，避免「点了没反应」
  if (!props.character) {
    emit('pick');
    return;
  }
  activeEmotionId.value = emotion.id;
  player.value?.play(emotion);
}

onMounted(() => {
  void start();
});

watch(
  () => props.character,
  () => {
    activeEmotionId.value = '';
    player.value?.stop();
    void start();
  }
);

defineExpose({ stop: () => player.value?.stop() });
</script>

<template>
  <div class="oa-emo">
    <div class="oa-emo__stage-box">
      <div class="oa-emo__stage">
        <canvas
          ref="canvas"
          :key="canvasKey"
          class="oa-emo__canvas"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @pointerleave="onPointerUp"
          @wheel.prevent="onWheel"
        />

        <OAEmotionPlayer
          ref="player"
          :unit="metrics.unit"
          :anchor-x="metrics.anchorX"
          :anchor-y="metrics.anchorY"
        />

        <Transition name="oa-fade">
          <div v-if="!character" key="none" class="oa-emo__overlay">
            <p class="oa-emo__overlay-text">还没有选择预览角色。</p>
            <rizui_button text="选择角色" @click="emit('pick')" />
          </div>

          <div v-else-if="status === 'loading'" key="loading" class="oa-emo__overlay">
            <p class="oa-emo__overlay-text">正在解析骨骼与图集…</p>
            <rizui_progress :indeterminate="true" :height="6" rounded />
          </div>

          <div v-else-if="status === 'error'" key="error" class="oa-emo__overlay oa-emo__overlay--error">
            <p class="oa-emo__overlay-text">载入失败：{{ stageError }}</p>
            <rizui_button text="重新选择角色" @click="emit('pick')" />
          </div>
        </Transition>
      </div>

      <div class="oa-emo__stage-bar">
        <span class="oa-emo__stage-label" :title="characterLabel">
          {{ characterLabel || '未选择立绘' }}
        </span>
        <span class="oa-emo__stage-meta">{{ rendererLabel }}</span>
        <label class="oa-emo__zoom">
          <span>缩放</span>
          <input v-model.number="zoomPercent" type="range" min="20" max="400" step="1" />
          <span class="oa-emo__zoom-value">{{ zoomPercent }}%</span>
        </label>
        <button type="button" class="oa-emo__mini" @click="resetView">重置视角</button>
        <button type="button" class="oa-emo__mini" @click="emit('pick')">更换角色</button>
      </div>
    </div>

    <aside class="oa-emo__panel">
      <div class="oa-emo__panel-head">
        <span class="oa-emo__panel-title">表情</span>
        <span class="oa-emo__panel-count">{{ emotions.length }} 个</span>
      </div>

      <Transition name="oa-swap" mode="out-in">
        <div v-if="loading && !emotions.length" key="loading" class="oa-emo__state">
          <p class="oa-emo__state-text">正在读取表情索引…</p>
          <rizui_progress :indeterminate="true" :height="6" rounded />
        </div>

        <div v-else-if="error" key="error">
          <rizui_infobox type="error" :text="`读取表情失败：${error}`" />
        </div>

        <div v-else-if="emotions.length" key="list" class="oa-emo__grid">
          <button
            v-for="emotion in emotions"
            :key="emotion.id"
            type="button"
            class="oa-emo__chip"
            :class="{
              'is-active': activeEmotionId === emotion.id,
              'is-incomplete': !emotion.layers.every((layer) => layer.exists),
            }"
            :title="`${emotion.name}（${emotion.id}）· ${emotion.duration.toFixed(2)}s`"
            @click="playEmotion(emotion)"
          >
            <span class="oa-emo__chip-name">{{ emotion.name }}</span>
            <span class="oa-emo__chip-id">{{ emotion.id }}</span>
            <span v-if="!emotion.soundExists" class="oa-emo__chip-warn" title="音效缺失">无音效</span>
          </button>
        </div>

        <div v-else key="empty" class="oa-emo__state">
          <p class="oa-emo__state-text">这个资源包没有表情索引。</p>
        </div>
      </Transition>

      <p v-if="missingImages.length" class="oa-emo__hint">
        有 {{ missingImages.length }} 个表情缺图，点击会显示空白。
      </p>
    </aside>
  </div>
</template>

<style scoped>
.oa-emo {
  display: flex;
  flex: 1;
  align-items: stretch;
  gap: clamp(10px, 1.2vw, 16px);
  min-height: 0;
}

.oa-emo__stage-box {
  display: flex;
  flex: 3 1 0;
  flex-direction: column;
  min-width: 0;
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
}

.oa-emo__stage {
  position: relative;
  /* 用确定高度而不是 flex 撑开：canvas 的 height:100% 需要父级高度可解析 */
  height: clamp(300px, 52vh, 620px);
  flex: 0 0 auto;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 18%, rgba(0, 144, 254, 0.07), transparent 62%),
    linear-gradient(180deg, #fbfdff 0%, #f0f8ff 100%);
}

.oa-emo__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.oa-emo__canvas:active {
  cursor: grabbing;
}

.oa-emo__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  background: rgba(248, 252, 255, 0.82);
  text-align: center;
}

.oa-emo__overlay-text {
  font-size: 12.5px;
  color: #6f8ba4;
}

.oa-emo__stage-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 6px 10px;
  border-top: 1px solid rgba(190, 214, 231, 0.45);
  background: rgba(248, 252, 255, 0.9);
}

.oa-emo__stage-label {
  flex: 0 1 auto;
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 600;
  color: #1e4b76;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-emo__stage-meta {
  flex: 0 0 auto;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.08);
  font-size: 10px;
  line-height: 1.8;
  color: #1769a8;
}

.oa-emo__zoom {
  display: inline-flex;
  flex: 1 1 150px;
  align-items: center;
  gap: 6px;
  min-width: 120px;
  font-size: 10.5px;
  color: #8aa3b8;
}

.oa-emo__zoom input {
  flex: 1;
  min-width: 60px;
  accent-color: var(--oa-blue);
}

.oa-emo__zoom-value {
  min-width: 34px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.oa-emo__mini {
  padding: 3px 9px;
  border: 1px solid rgba(163, 190, 210, 0.5);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  font-family: inherit;
  font-size: 11px;
  color: #5d7d97;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.oa-emo__mini:hover {
  border-color: rgba(0, 144, 254, 0.42);
  color: #1769a8;
}

.oa-emo__panel {
  display: flex;
  flex: 2 1 0;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
  padding: 10px;
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 12px;
  background: #ffffff;
  overflow-y: auto;
}

.oa-emo__panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.oa-emo__panel-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e4b76;
}

.oa-emo__panel-count {
  font-size: 10.5px;
  color: #a3b6c4;
}

.oa-emo__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 6px;
  align-content: start;
}

.oa-emo__chip {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 8px;
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 9px;
  background: #ffffff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.oa-emo__chip:hover {
  border-color: rgba(0, 144, 254, 0.42);
  background: rgba(0, 144, 254, 0.04);
}

.oa-emo__chip.is-active {
  border-color: rgba(0, 144, 254, 0.6);
  background: rgba(0, 144, 254, 0.1);
}

.oa-emo__chip.is-incomplete {
  border-style: dashed;
}

.oa-emo__chip-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e4b76;
}

.oa-emo__chip-id {
  overflow: hidden;
  font-size: 10px;
  color: #a3b6c4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-emo__chip-warn {
  font-size: 9.5px;
  color: #c07a00;
}

.oa-emo__state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 2px;
}

.oa-emo__state-text {
  font-size: 12px;
  color: #6f8ba4;
}

.oa-emo__hint {
  margin-top: auto;
  font-size: 10.5px;
  line-height: 1.5;
  color: #a3b6c4;
}

@media (max-width: 900px) {
  .oa-emo {
    flex-direction: column;
  }

  .oa-emo__panel {
    flex: 0 0 auto;
    max-height: 240px;
  }
}
</style>

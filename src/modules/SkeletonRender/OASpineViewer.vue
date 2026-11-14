<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { rizui_button, rizui_cfgrow, rizui_infobox, rizui_progress, rizui_slider, rizui_switch } from 'riz-ui';
import { useSpineStage } from '@/modules/SkeletonRender/useSpineStage';
import { useGlobalConfig } from '@/modules/ConfigProvider/useGlobalConfig';
import type { SpineCharacter } from '@/modules/SkeletonRender/spinePackage';

const props = defineProps<{
  character: SpineCharacter;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'reselect'): void;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);

const { config, isLoaded, fetchConfig } = useGlobalConfig();
const rendererMode = computed(() => config.value.spine_renderer);

const {
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
} = useSpineStage(canvas, rendererMode);

/** 缩放走百分比滑条，内部仍换算成倍率 */
const zoomPercent = computed({
  get: () => Math.round(zoom.value * 100),
  set: (value: number) => setZoom(value / 100),
});

const actionOptions = computed(() => [
  { value: '', label: '静态（不播放动作）' },
  ...actions.value.map((name) => ({ value: name, label: name })),
]);

const summary = computed(() => {
  if (!info.value) {
    return '';
  }
  const renderer = backendKind.value === 'webgl' ? 'WebGL' : 'Canvas 2D';
  return `Spine ${info.value.version} · 骨骼 ${info.value.bones} · 槽位 ${info.value.slots} · 动画 ${info.value.animations} · ${renderer}`;
});

async function start() {
  if (!isLoaded.value) {
    await fetchConfig();
  }
  await load(props.character);
}

onMounted(() => {
  void start();
});

watch(
  () => props.character,
  () => {
    void start();
  }
);
</script>

<template>
  <div class="oa-spine-viewer">
    <section class="oa-spine-viewer__stage">
      <canvas
        ref="canvas"
        :key="canvasKey"
        class="oa-spine-viewer__canvas"
        :class="{ 'is-loading': status === 'loading' }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerUp"
        @wheel.prevent="onWheel"
      />

      <Transition name="oa-fade">
        <div v-if="status === 'loading'" key="loading" class="oa-spine-viewer__overlay">
          <p>正在解析骨骼与图集…</p>
          <rizui_progress :indeterminate="true" :height="6" rounded />
        </div>

        <div
          v-else-if="status === 'error'"
          key="error"
          class="oa-spine-viewer__overlay oa-spine-viewer__overlay--error"
        >
          <p class="oa-spine-viewer__overlay-title">载入失败</p>
          <p class="oa-spine-viewer__overlay-text">{{ error }}</p>
          <rizui_button text="重新选择文件" @click="emit('reselect')" />
        </div>

        <p v-else key="tip" class="oa-spine-viewer__tip">拖动画布平移 · 滚轮缩放</p>
      </Transition>
    </section>

    <aside class="oa-spine-viewer__panel">
      <header class="oa-spine-viewer__head">
        <div class="oa-spine-viewer__names">
          <h2 class="oa-spine-viewer__id">{{ character.id }}</h2>
          <p class="oa-spine-viewer__summary">{{ summary }}</p>
        </div>
      </header>

      <section class="oa-spine-viewer__block">
        <div class="oa-spine-viewer__block-head">
          <span class="oa-spine-viewer__label">立绘差分</span>
          <span class="oa-spine-viewer__count">{{ variants.length }} 项</span>
        </div>
        <div v-if="variants.length" class="oa-spine-viewer__chips">
          <button
            v-for="variant in variants"
            :key="variant.name"
            type="button"
            class="oa-spine-viewer__chip"
            :class="{ 'is-active': variant.name === activeVariant }"
            :title="variant.label"
            @click="setVariant(variant.name)"
          >
            {{ variant.label }}
          </button>
        </div>
        <rizui_infobox
          v-else
          type="info"
          text="该骨骼没有数字命名的差分动画，可直接用下方的动作预览。"
        />
      </section>

      <section class="oa-spine-viewer__block">
        <div class="oa-spine-viewer__block-head">
          <span class="oa-spine-viewer__label">动作</span>
          <span class="oa-spine-viewer__count">循环播放</span>
        </div>
        <div class="oa-spine-viewer__chips oa-spine-viewer__chips--actions">
          <button
            v-for="option in actionOptions"
            :key="option.value || 'static'"
            type="button"
            class="oa-spine-viewer__chip"
            :class="{ 'is-active': option.value === activeAction }"
            @click="setAction(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>

      <section class="oa-spine-viewer__block">
        <rizui_cfgrow label="缩放" hint="滚轮缩放 · 拖动画布平移" stack>
          <rizui_slider
            v-model="zoomPercent"
            :min="20"
            :max="300"
            :step="5"
            display="%"
          />
        </rizui_cfgrow>

        <rizui_cfgrow label="骨骼调试" hint="叠加显示网格与骨架线">
          <rizui_switch v-model="debugRendering" />
        </rizui_cfgrow>

        <div class="oa-spine-viewer__tools">
          <rizui_button
            text="重置视角"
            l-icon="fa-solid fa-arrows-to-dot"
            @click="resetView"
          />
          <rizui_button
            text="更换文件"
            l-icon="fa-solid fa-arrow-right-arrow-left"
            @click="emit('reselect')"
          />
        </div>
      </section>

      <footer class="oa-spine-viewer__foot">
        <rizui_button
          text="返回工具"
          l-icon="fa-solid fa-arrow-left"
          @click="emit('back')"
        />
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.oa-spine-viewer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(260px, 24vw, 330px);
  gap: 14px;
  width: 100%;
  /* 固定高度，避免侧栏内容（差分数量）变化反过来改变画布尺寸与缩放 */
  height: min(72vh, 660px);
  min-height: 0;
}

/* ---------- 画布 ---------- */

.oa-spine-viewer__stage {
  position: relative;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  background:
    radial-gradient(120% 90% at 50% 0%, #ffffff 0%, rgba(255, 255, 255, 0) 62%),
    linear-gradient(180deg, #f6fbff 0%, #e2f1fd 100%);
  box-shadow:
    0 12px 26px rgba(36, 92, 138, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.oa-spine-viewer__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.oa-spine-viewer__canvas:active {
  cursor: grabbing;
}

.oa-spine-viewer__canvas.is-loading {
  opacity: 0.4;
}

.oa-spine-viewer__tip {
  position: absolute;
  bottom: 10px;
  left: 50%;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  font-size: 11.5px;
  color: #7d94a9;
  transform: translateX(-50%);
  pointer-events: none;
}

.oa-spine-viewer__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: rgba(246, 251, 255, 0.86);
  font-size: 13px;
  color: #4a6d8c;
  text-align: center;
}

.oa-spine-viewer__overlay-title {
  font-size: 15px;
  font-weight: 700;
  color: #b4453a;
}

.oa-spine-viewer__overlay-text {
  max-width: 34em;
  font-size: 12.5px;
  line-height: 1.7;
  color: #7d6a68;
}

.oa-spine-viewer__overlay :deep(.cpr-root) {
  width: min(220px, 60%);
}

/* ---------- 侧栏 ---------- */

.oa-spine-viewer__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fcff 100%);
  box-shadow:
    0 12px 26px rgba(36, 92, 138, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.oa-spine-viewer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 122, 204, 0.1);
}

.oa-spine-viewer__names {
  min-width: 0;
}

.oa-spine-viewer__id {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  color: #14395b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-spine-viewer__summary {
  margin-top: 3px;
  font-size: 11.5px;
  line-height: 1.5;
  color: #7d94a9;
}

.oa-spine-viewer__block {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.oa-spine-viewer__block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.oa-spine-viewer__label {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e4b76;
}

.oa-spine-viewer__count {
  font-size: 11.5px;
  color: #8ea6b9;
}

/* ---------- 差分 chips ---------- */

.oa-spine-viewer__chips {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(74px, 1fr));
  gap: 6px;
  max-height: min(38vh, 320px);
  overflow-y: auto;
  padding-right: 2px;
}

.oa-spine-viewer__chip {
  padding: 6px 4px;
  border: 1px solid rgba(0, 122, 204, 0.16);
  border-radius: 8px;
  background: #ffffff;
  font-family: inherit;
  font-size: 11.5px;
  line-height: 1.25;
  color: #3f6482;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.oa-spine-viewer__chip:hover {
  border-color: rgba(0, 144, 254, 0.55);
  color: #0f5a92;
}

.oa-spine-viewer__chip.is-active {
  border-color: transparent;
  background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(2, 132, 199, 0.28);
}

/* ---------- 行控件 ---------- */

/* 动作是一行小胶囊，和差分 chips 同一套视觉 */
.oa-spine-viewer__chips--actions {
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  max-height: none;
  overflow: visible;
}

.oa-spine-viewer__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.oa-spine-viewer__foot {
  display: flex;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 122, 204, 0.1);
}

@media (max-width: 980px) {
  .oa-spine-viewer {
    grid-template-columns: 1fr;
    height: auto;
  }

  .oa-spine-viewer__stage {
    height: 54vh;
  }

  .oa-spine-viewer__panel {
    overflow-y: visible;
  }
}
</style>

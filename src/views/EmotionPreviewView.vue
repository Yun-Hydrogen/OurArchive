<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { rizui_button, rizui_infobox, rizui_progress } from 'riz-ui';
import OAPageHeader from '@/modules/ViewsManager/OAPageHeader.vue';
import OAEmotionPlayer from '@/modules/EmotionRender/OAEmotionPlayer.vue';
import { useSpineStage } from '@/modules/SkeletonRender/useSpineStage';
import { useGlobalConfig } from '@/modules/ConfigProvider/useGlobalConfig';
import { fetchPackageEmotions, fetchResourcePackages } from '@/modules/API/packagesApi';
import type { PackageEmotion } from '@/modules/API/types';
import type { SpineCharacter } from '@/modules/SkeletonRender/spinePackage';
import { DEFAULT_MOTIONS } from '@/modules/EmotionRender/defaultMotions';
import type { EmotionMotionConfig } from '@/modules/EmotionRender/motionTypes';
import { ROUTE_NAMES } from '@/modules/ViewsManager/routes';
import { SHELL_TIMING } from '@/modules/Shell/shellTiming';

const router = useRouter();

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
  spineInstance,
  pixiApp,
  isDummy,
  load,
  loadDummy,
  setZoom,
  resetView,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
} = useSpineStage(canvas, rendererMode);

/** 选中的底座立绘，null 为人台模式 */
const activeCharacter = ref<SpineCharacter | null>(null);
const characterLabel = ref('虚拟人台');

/** 表情数据 */
const emotions = ref<PackageEmotion[]>([]);
const emotionsLoading = ref(false);
const activeEmotionId = ref('');

/** 控制选项 */
const isLoop = ref(false);
const isMuted = ref(false);
const activeTab = ref<'list' | 'json'>('list');

/** 自定义 JSON 动效编辑器 */
const customJsonText = ref('');
const jsonParseError = ref('');

const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

const zoomPercent = computed({
  get: () => Math.round(zoom.value * 100),
  set: (val: number) => setZoom(val / 100),
});

const rendererLabel = computed(() =>
  backendKind.value === 'pixi-webgl' || backendKind.value === 'webgl' ? 'Pixi (WebGL)' : 'Canvas 2D'
);

function leaveTo(target: { name: string }) {
  if (isLeaving.value) return;
  isLeaving.value = true;
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    void router.push(target);
  }, SHELL_TIMING.cardsExitWait);
}

function backToTools() {
  leaveTo({ name: ROUTE_NAMES.tools });
}

/** 加载可用表情 */
async function loadAvailableEmotions() {
  emotionsLoading.value = true;
  try {
    const pkgsRes = await fetchResourcePackages();
    const pkgs = pkgsRes.packages;
    if (pkgs.length > 0) {
      // 优先从 DefaultPackage 或首个支持表情的包读取
      const targetPkg = pkgs.find((p) => p.id === 'DefaultPackage') ?? pkgs[0];
      const emoRes = await fetchPackageEmotions(targetPkg.id);
      if (emoRes.emotions.length > 0) {
        emotions.value = emoRes.emotions;
        return;
      }
    }
  } catch {
    // ignore
  } finally {
    emotionsLoading.value = false;
  }

  // 兜底生成 19 个标准表情列表
  emotions.value = Object.keys(DEFAULT_MOTIONS).map((id) => ({
    id,
    name: id,
    description: '',
    entry: '',
    exists: true,
    width: 240,
    height: 240,
    anchor: [120, 80],
    duration: DEFAULT_MOTIONS[id]?.duration ?? 1.0,
    loop: false,
    soundUrl: '',
    soundExists: false,
    imageUrls: [],
  }));
}

function playEmotion(emo: PackageEmotion) {
  activeEmotionId.value = emo.id;
  const currentConfig = DEFAULT_MOTIONS[emo.id.toLowerCase()];
  if (currentConfig) {
    customJsonText.value = JSON.stringify(currentConfig, null, 2);
  }

  // 覆写循环与静音属性
  const targetEmotion = {
    ...emo,
    loop: isLoop.value,
    soundExists: isMuted.value ? false : emo.soundExists,
  };
  player.value?.play(targetEmotion);
}

function runCustomJson() {
  jsonParseError.value = '';
  let parsed: EmotionMotionConfig;
  try {
    parsed = JSON.parse(customJsonText.value);
  } catch (err) {
    jsonParseError.value = `JSON 语法错误: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }

  if (!parsed || !Array.isArray(parsed.layers)) {
    jsonParseError.value = '动效配置必须包含 layers 图层数组';
    return;
  }

  const dummyEmotion: PackageEmotion = {
    id: parsed.id || 'custom',
    name: parsed.id || '自定义动效',
    description: '通过动效 JSON 实时调试',
    entry: '',
    exists: true,
    width: 240,
    height: 240,
    anchor: [120, 80],
    duration: parsed.duration || 1.2,
    loop: isLoop.value,
    soundUrl: '',
    soundExists: false,
    imageUrls: [],
  };

  player.value?.play(dummyEmotion, parsed);
}

function stopPlaying() {
  activeEmotionId.value = '';
  player.value?.stop();
}

onMounted(async () => {
  if (!isLoaded.value) {
    await fetchConfig();
  }
  await loadDummy();
  await loadAvailableEmotions();
});

onBeforeUnmount(() => {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  player.value?.stop();
});
</script>

<template>
  <div class="oa-epv" :class="{ 'is-leaving': isLeaving }">
    <OAPageHeader
      title="表情动效预览"
      subtitle="基于 Pixi.js 场景图与 JSON 动效时间轴，实时试听与调试角色 2D 表情"
      show-back
      back-label="返回工具箱"
      @back="backToTools"
    />

    <div class="oa-epv__body">
      <!-- 渲染舞台区 -->
      <section class="oa-epv__stage-card">
        <div class="oa-epv__stage-viewport">
          <canvas
            ref="canvas"
            :key="canvasKey"
            class="oa-epv__canvas"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @pointerleave="onPointerUp"
            @wheel.prevent="onWheel"
          />

          <OAEmotionPlayer
            ref="player"
            :spine-instance="spineInstance"
            :pixi-app="pixiApp"
            :unit="metrics.unit"
            :anchor-x="metrics.anchorX"
            :anchor-y="metrics.anchorY"
          />

          <Transition name="oa-fade">
            <div v-if="status === 'loading'" key="loading" class="oa-epv__overlay">
              <p class="oa-epv__overlay-text">正在初始化渲染引擎…</p>
              <rizui_progress :indeterminate="true" :height="6" rounded />
            </div>

            <div v-else-if="status === 'error'" key="error" class="oa-epv__overlay oa-epv__overlay--error">
              <p class="oa-epv__overlay-text">载入失败：{{ stageError }}</p>
              <rizui_button text="重试加载人台" @click="loadDummy" />
            </div>
          </Transition>
        </div>

        <!-- 舞台底部工具栏 -->
        <div class="oa-epv__stage-bar">
          <span class="oa-epv__stage-label">
            底座：<strong>{{ isDummy ? '虚拟人台' : characterLabel }}</strong>
          </span>
          <span class="oa-epv__stage-meta">{{ rendererLabel }}</span>

          <label class="oa-epv__zoom">
            <span>缩放</span>
            <input v-model.number="zoomPercent" type="range" min="20" max="400" step="1" />
            <span class="oa-epv__zoom-val">{{ zoomPercent }}%</span>
          </label>

          <button type="button" class="oa-epv__btn-mini" @click="resetView">重置视角</button>
          <button v-if="!isDummy" type="button" class="oa-epv__btn-mini" @click="loadDummy">切回人台</button>
        </div>
      </section>

      <!-- 右侧控制与调参面板 -->
      <aside class="oa-epv__panel-card">
        <!-- 面板头部与选项卡 -->
        <div class="oa-epv__panel-tabs">
          <button
            type="button"
            class="oa-epv__tab"
            :class="{ 'is-active': activeTab === 'list' }"
            @click="activeTab = 'list'"
          >
            表情列表 ({{ emotions.length }})
          </button>
          <button
            type="button"
            class="oa-epv__tab"
            :class="{ 'is-active': activeTab === 'json' }"
            @click="activeTab = 'json'"
          >
            JSON 动效调试
          </button>
        </div>

        <!-- 播放全局开关栏 -->
        <div class="oa-epv__options-bar">
          <label class="oa-epv__checkbox">
            <input v-model="isLoop" type="checkbox" />
            <span>循环播放</span>
          </label>
          <label class="oa-epv__checkbox">
            <input v-model="isMuted" type="checkbox" />
            <span>静音</span>
          </label>
          <button
            v-if="player?.playingName"
            type="button"
            class="oa-epv__btn-stop"
            @click="stopPlaying"
          >
            停止播放
          </button>
        </div>

        <!-- 选项卡 1：表情列表 -->
        <div v-if="activeTab === 'list'" class="oa-epv__grid-container">
          <div v-if="emotionsLoading" class="oa-epv__state">
            <p>正在拉取表情清单…</p>
            <rizui_progress :indeterminate="true" :height="4" rounded />
          </div>

          <div v-else class="oa-epv__grid">
            <button
              v-for="emo in emotions"
              :key="emo.id"
              type="button"
              class="oa-epv__chip"
              :class="{ 'is-active': activeEmotionId === emo.id }"
              @click="playEmotion(emo)"
            >
              <span class="oa-epv__chip-name">{{ emo.name }}</span>
              <span class="oa-epv__chip-id">{{ emo.id }}</span>
              <span v-if="emo.soundExists" class="oa-epv__chip-sound">♪</span>
            </button>
          </div>
        </div>

        <!-- 选项卡 2：JSON 动效编辑与实时调试 -->
        <div v-else class="oa-epv__json-container">
          <p class="oa-epv__hint">
            支持在线编写或粘贴 <code>EmotionMotionConfig</code> JSON 时间轴，点击下方按钮立即在人台上实时渲染。
          </p>

          <textarea
            v-model="customJsonText"
            class="oa-epv__textarea"
            placeholder="粘贴或输入动效 JSON 配置..."
            spellcheck="false"
          />

          <rizui_infobox v-if="jsonParseError" type="error" :text="jsonParseError" />

          <div class="oa-epv__json-actions">
            <rizui_button text="实时运行动效" @click="runCustomJson" />
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.oa-epv {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px 24px;
  box-sizing: border-box;
  background: #f8fafc;
  overflow: hidden;
  transition: opacity 0.25s ease;
}

.oa-epv.is-leaving {
  opacity: 0;
}

.oa-epv__body {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
  margin-top: 14px;
}

/* 舞台容器卡片 */
.oa-epv__stage-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.oa-epv__stage-viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  background: radial-gradient(circle at center, #f8fcff 0%, #edf6fd 100%);
  overflow: hidden;
}

.oa-epv__canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  cursor: grab;
}

.oa-epv__canvas:active {
  cursor: grabbing;
}

.oa-epv__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  z-index: 20;
}

.oa-epv__stage-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
}

.oa-epv__stage-label {
  color: #334155;
}

.oa-epv__stage-meta {
  color: #0284c7;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.oa-epv__zoom {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  color: #64748b;
  font-size: 12px;
}

.oa-epv__zoom-val {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  color: #334155;
}

.oa-epv__btn-mini {
  padding: 4px 10px;
  font-size: 12px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  color: #334155;
  transition: all 0.15s ease;
}

.oa-epv__btn-mini:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

/* 控制面板 */
.oa-epv__panel-card {
  width: 360px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.oa-epv__panel-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.oa-epv__tab {
  flex: 1;
  padding: 12px 0;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 2px solid transparent;
}

.oa-epv__tab.is-active {
  color: #0284c7;
  border-bottom-color: #0284c7;
  background: #ffffff;
}

.oa-epv__options-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
}

.oa-epv__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  cursor: pointer;
}

.oa-epv__btn-stop {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 11px;
  color: #ef4444;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  cursor: pointer;
}

/* 表情网格 */
.oa-epv__grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.oa-epv__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.oa-epv__chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  position: relative;
  transition: all 0.18s cubic-bezier(0.2, 0, 0, 1);
}

.oa-epv__chip:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  transform: translateY(-1px);
}

.oa-epv__chip.is-active {
  border-color: #0284c7;
  background: #e0f2fe;
}

.oa-epv__chip-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.oa-epv__chip-id {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.oa-epv__chip-sound {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 12px;
  color: #0284c7;
}

/* JSON 调试区 */
.oa-epv__json-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 10px;
  overflow: hidden;
}

.oa-epv__hint {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.oa-epv__textarea {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #0f172a;
  color: #f8fafc;
  resize: none;
  outline: none;
}

.oa-epv__textarea:focus {
  border-color: #0284c7;
}

.oa-epv__json-actions {
  display: flex;
  justify-content: flex-end;
}
</style>

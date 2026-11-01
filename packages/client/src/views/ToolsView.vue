<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import OAToolArt from '@/components/tools/OAToolArt.vue';
import { ROUTE_NAMES } from '@/config/routes';
import { TOOL_ENTRIES, type ToolEntry } from '@/config/tools';
import { SHELL_TIMING } from '@/config/transition';

const router = useRouter();

/** 入场：卡片错峰飞入，播完撤掉 class，避免影响后续离场动画 */
const isEntering = ref(true);
let enterTimer: ReturnType<typeof setTimeout> | null = null;

/** 离场：卡片先收起/下坠，播完再切路由；方向由目标页面决定 */
const isLeaving = ref(false);
const exitOffset = ref('-46px');
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 与主界面同一套错峰节奏，两页之间看起来像同一组卡在移动 */
const cardDelay = (step: number) => `${60 + step * 90}ms`;

onMounted(() => {
  enterTimer = setTimeout(() => {
    isEntering.value = false;
    enterTimer = null;
  }, 900);
});

onBeforeUnmount(() => {
  if (enterTimer) {
    clearTimeout(enterTimer);
    enterTimer = null;
  }
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
});

function leaveTo(target: { name: string }, offset: string) {
  if (isLeaving.value) {
    return;
  }
  exitOffset.value = offset;
  isLeaving.value = true;
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    void router.push(target);
  }, SHELL_TIMING.cardsExitWait);
}

function openTool(tool: ToolEntry) {
  // 继续深入：卡片向上收起
  leaveTo({ name: tool.route }, '-46px');
}

function backHome() {
  // 回到上层：卡片向下坠，与主界面卡片飞入的起点衔接
  leaveTo({ name: ROUTE_NAMES.home }, '52px');
}
</script>

<template>
  <main
    class="oa-tools"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms`, '--exit-y': exitOffset }"
  >
    <header class="oa-tools__head">
      <button type="button" class="oa-tools__back" @click="backHome">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M10 3.5 5.5 8 10 12.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        主界面
      </button>

      <div class="oa-tools__titles">
        <h1 class="oa-tools__title">更多功能</h1>
        <p class="oa-tools__subtitle">更多辅助剧情写作/播放的使用工具</p>
      </div>
    </header>

    <section class="oa-tools__grid">
      <div
        v-for="(tool, index) in TOOL_ENTRIES"
        :key="tool.id"
        class="oa-slot"
        :style="{ '--enter-delay': cardDelay(index) }"
      >
        <button
          type="button"
          class="oa-tool-card"
          :data-tool="tool.id"
          @click="openTool(tool)"
        >
          <span class="oa-tool-card__frame">
            <OAToolArt :variant="tool.art" />
          </span>
          <span class="oa-tool-card__title">{{ tool.title }}</span>
          <span class="oa-tool-card__subtitle">{{ tool.subtitle }}</span>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
/*
 * 页面本身透明：底色、气泡、banner 都由 App 层常驻。
 * 顶部留出 banner 停靠的高度，内容整体靠上排布。
 */
.oa-tools {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: clamp(16px, 2.4vh, 26px);
  min-height: 100vh;
  padding: clamp(14px, 2.2vh, 24px) clamp(24px, 4.4vw, 84px) clamp(40px, 5vh, 56px);
  padding-top: clamp(56px, 8vh, 84px);
  color: var(--oa-dark-blue);
}

.oa-tools__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(1080px, 100%);
  margin: 0 auto;
}

.oa-tools__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 5px 11px 5px 7px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
  font-family: inherit;
  font-size: 12.5px;
  color: #35628a;
  cursor: pointer;
  transition:
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-tools__back svg {
  width: 14px;
  height: 14px;
}

.oa-tools__back:hover {
  color: var(--oa-blue);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.16);
}

.oa-tools__titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.oa-tools__title {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #123a5c;
}

.oa-tools__subtitle {
  font-size: clamp(12px, 0.95vw, 13.5px);
  line-height: 1.6;
  color: #6f8ba4;
}

.oa-tools__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: clamp(14px, 1.6vw, 24px);
  width: min(1080px, 100%);
  margin: 0 auto;
}

/* ---------- 卡槽：入场 / 离场都落在这一层 ---------- */

.oa-slot {
  display: flex;
  min-width: 0;
}

.oa-slot > .oa-tool-card {
  flex: 1;
}

.oa-tools.is-entering .oa-slot {
  animation: oa-card-in 720ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: var(--enter-delay, 0ms);
  will-change: transform, opacity;
}

@keyframes oa-card-in {
  from {
    opacity: 0;
    transform: translateY(52px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.oa-tools.is-leaving .oa-slot {
  animation: oa-card-out var(--cards-exit, 260ms) cubic-bezier(0.4, 0, 0.8, 0.24) forwards;
  animation-delay: calc(var(--enter-delay, 0ms) * 0.3);
  will-change: transform, opacity;
}

@keyframes oa-card-out {
  to {
    opacity: 0;
    transform: translateY(var(--exit-y, -46px)) scale(0.96);
  }
}

/* ---------- 工具卡：沿用主界面卡片的质感 ---------- */

.oa-tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(9px, 1.2vh, 14px);
  padding: clamp(13px, 1.5vw, 20px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fcff 66%, #f1f9ff 100%);
  box-shadow:
    0 12px 26px rgba(36, 92, 138, 0.14),
    0 2px 5px rgba(36, 92, 138, 0.07),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  color: inherit;
  font-family: inherit;
  text-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.oa-tool-card:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 3px;
}

.oa-tool-card__frame {
  position: relative;
  display: block;
  flex: 1 1 auto;
  min-height: clamp(120px, 16vh, 168px);
  overflow: hidden;
  border-radius: 6px;
  background: #eaf6ff;
}

.oa-tool-card__frame :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.oa-tool-card__title {
  font-size: clamp(15px, 1.3vw, 20px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: #1e4b76;
}

.oa-tool-card__subtitle {
  display: block;
  margin-top: -4px;
  overflow: hidden;
  font-size: clamp(11px, 0.85vw, 13px);
  line-height: 1.4;
  letter-spacing: 0.01em;
  color: #6f8ba4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

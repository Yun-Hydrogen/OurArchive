<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import OACardArt from '@/components/home/OACardArt.vue';
import { HOME_MENU } from '@/config/home';
import { ROUTE_NAMES } from '@/config/routes';
import { SHELL_TIMING } from '@/config/transition';
import { useBackgroundMusic } from '@/composables/useBackgroundMusic';
import { useGlobalConfig } from '@/composables/useGlobalConfig';

const router = useRouter();
const { fetchConfig } = useGlobalConfig();
// 背景音乐为全应用单例：splash 淡入后切到本页继续播放
const { ensurePlaying } = useBackgroundMusic();

/** 当前置顶的模式卡；只有未被置顶的卡片露出的侧边可点击切换 */
const activeModeIndex = ref(0);

/** 入场动画阶段：卡片错峰飞入，结束后移除 class，避免后续切换被干扰 */
const isEntering = ref(true);
let enterTimer: ReturnType<typeof setTimeout> | null = null;

/** 离场动画阶段：卡片先向上收起，播完再切路由 */
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 卡片入场延迟：以 banner 开始缩小的时刻为基准 */
const enterDelay = (step: number) => `${SHELL_TIMING.cardsEnterBase + step}ms`;

function handleModeClick(index: number) {
  activeModeIndex.value = index;
}

/** 「更多功能」进入工具页：先播卡片收起动画再切路由，避免页与页之间硬切 */
function openMoreTools() {
  if (isLeaving.value) {
    return;
  }
  isLeaving.value = true;
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    void router.push({ name: ROUTE_NAMES.tools });
  }, SHELL_TIMING.cardsExitWait);
}

/**
 * 直接访问 /home（未经 splash 手势）时等待一次点击再恢复播放，
 * 已在播放则什么都不做，避免打断 splash 的淡入进度。
 */
async function resumeBgmOnce() {
  if (await ensurePlaying()) return;
  window.addEventListener('pointerdown', handleFirstGesture, { once: true });
}

function handleFirstGesture() {
  void ensurePlaying();
}

onMounted(() => {
  void fetchConfig();
  void resumeBgmOnce();

  // 最长一张卡为 510ms 延迟 + 780ms 动画，留出余量后收起入场态
  enterTimer = setTimeout(() => {
    isEntering.value = false;
    enterTimer = null;
  }, 1500);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleFirstGesture);
  if (enterTimer) {
    clearTimeout(enterTimer);
    enterTimer = null;
  }
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
});
</script>

<template>
  <main
    class="oa-home"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms` }"
  >
    <section class="oa-home__content">
      <div class="oa-home__grid">
        <!-- 左侧：编辑模式 / 阅读模式 叠卡，点击露出的侧边切换 -->
        <div class="oa-home__modes">
          <div
            v-for="(entry, index) in HOME_MENU.modes"
            :key="entry.id"
            class="oa-slot oa-slot--mode"
            :class="{ 'is-active': index === activeModeIndex }"
            :style="{ '--enter-delay': enterDelay(index * 110) }"
          >
            <button
              type="button"
              class="oa-card oa-card--mode"
              :data-entry="entry.id"
              :aria-pressed="index === activeModeIndex"
              :tabindex="index === activeModeIndex ? 0 : -1"
              @click="handleModeClick(index)"
            >
              <span class="oa-card__frame">
                <OACardArt :variant="entry.art" />
              </span>
              <span class="oa-card__title">{{ entry.title }}</span>
              <span class="oa-card__subtitle">{{ entry.subtitle }}</span>
            </button>
          </div>
        </div>

        <!-- 右侧：3D场景 / 资源管理 / 更多功能 -->
        <div class="oa-home__side">
          <div class="oa-home__features">
            <div
              v-for="(entry, index) in HOME_MENU.features"
              :key="entry.id"
              class="oa-slot"
              :style="{ '--enter-delay': enterDelay(220 + index * 90) }"
            >
              <button type="button" class="oa-card" :data-entry="entry.id">
                <span class="oa-card__frame">
                  <OACardArt :variant="entry.art" />
                </span>
                <span class="oa-card__title">{{ entry.title }}</span>
                <span class="oa-card__subtitle">{{ entry.subtitle }}</span>
              </button>
            </div>
          </div>

          <div class="oa-slot" :style="{ '--enter-delay': enterDelay(400) }">
            <button
              type="button"
              class="oa-card oa-card--wide"
              :data-entry="HOME_MENU.more.id"
              @click="openMoreTools"
            >
              <span class="oa-card__frame">
                <OACardArt :variant="HOME_MENU.more.art" />
              </span>
              <span class="oa-card__text">
                <span class="oa-card__title">{{ HOME_MENU.more.title }}</span>
                <span class="oa-card__subtitle">{{ HOME_MENU.more.subtitle }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ---------- 页面底色 ---------- */

/*
 * 页面本身透明：底色渐变由 App 层的 .oa-shell-bg 交叉淡入，
 * 气泡背景也挂在 App 上，因此从 splash 过来时背景是连续的。
 */
.oa-home {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: hidden;
  color: var(--oa-dark-blue);
}

/* ---------- 右上角设置 ---------- */

.oa-home__top {
  position: relative;
  z-index: 6;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: clamp(14px, 2.4vh, 26px) clamp(20px, 3vw, 42px) 0;
}

/* ---------- 内容布局 ---------- */

.oa-home__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 3.2vh, 44px) clamp(30px, 5.2vw, 108px) clamp(24px, 4.4vh, 60px);
}

.oa-home__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1fr);
  align-items: stretch;
  gap: clamp(14px, 1.6vw, 26px);
  width: min(1040px, 100%);
}

/*
 * 两张模式卡叠放在同一格：置顶卡靠左，另一张整体右移 --peek 并轻微缩小藏到后面，
 * 只露出右侧一条窄边；点击该窄边即把被压住的卡翻到上层。
 */
.oa-home__modes {
  position: relative;
  display: grid;
  --peek: clamp(44px, 4vw, 64px);
}

.oa-home__side {
  display: grid;
  grid-template-rows: minmax(0, 1.06fr) minmax(0, 0.94fr);
  gap: clamp(14px, 1.6vw, 26px);
}

.oa-home__features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(14px, 1.6vw, 26px);
}

/* ---------- 卡槽：入场动画与叠卡位移都落在这一层 ---------- */

.oa-slot {
  position: relative;
  display: flex;
  min-width: 0;
}

/*
 * 入场用 animation + backwards 填充：延迟期间保持首帧（透明、下移），
 * 结束后交还给 class 上定义的 transform。
 *
 * 关键帧的首尾都必须带上 var(--peek-x) / var(--peek-s)：被压住的卡在动画结束时
 * 要正好落回 translateX(peek) scale(.98)，否则会从 scale(1) 弹到 scale(.98) —— 也就是
 * 「动画结束后重绘一下」的观感来源。
 */
.oa-home.is-entering .oa-slot {
  animation: oa-slot-in 780ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: var(--enter-delay, 0ms);
  /* 入场期间保持独立合成层，动画结束不回收，避免末帧闪一下 */
  will-change: transform, opacity;
}

@keyframes oa-slot-in {
  from {
    opacity: 0;
    transform: translateX(var(--peek-x, 0px)) translateY(58px)
      scale(calc(var(--peek-s, 1) * 0.94));
  }
  to {
    opacity: 1;
    transform: translateX(var(--peek-x, 0px)) translateY(0) scale(var(--peek-s, 1));
  }
}

/*
 * 离场：整体向上收起（去内层页面），错峰延迟按入场延迟等比压缩，
 * 保证最后一张卡也在 --cards-exit-wait 之前收完。
 */
.oa-home.is-leaving .oa-slot {
  animation: oa-slot-out var(--cards-exit) cubic-bezier(0.4, 0, 0.8, 0.24) forwards;
  animation-delay: calc(var(--enter-delay, 0ms) * 0.2);
  will-change: transform, opacity;
}

@keyframes oa-slot-out {
  to {
    opacity: 0;
    transform: translateX(var(--peek-x, 0px)) translateY(-46px)
      scale(calc(var(--peek-s, 1) * 0.96));
  }
}

.oa-slot > .oa-card {
  flex: 1;
  min-width: 0;
}

.oa-slot--mode {
  grid-area: 1 / 1;
  width: calc(100% - var(--peek));
  --peek-x: 0px;
  --peek-s: 1;
  transform: translateX(var(--peek-x)) scale(var(--peek-s));
  transform-origin: 50% 50%;
  /* 叠卡切换只动 transform，常驻合成层避免每次切换重绘卡片内容 */
  will-change: transform;
  transition:
    transform 0.62s cubic-bezier(0.34, 1.32, 0.44, 1),
    opacity 0.4s ease;
}

.oa-slot--mode.is-active {
  z-index: 2;
}

.oa-slot--mode:not(.is-active) {
  z-index: 1;
  --peek-x: var(--peek);
  --peek-s: 0.98;
}

/* 被压住的卡盖一层白纱，形成“退后一层”的层次感 */
.oa-slot--mode::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  border-radius: 10px;
  background: #ffffff;
  opacity: 0.34;
  pointer-events: none;
  transition: opacity 0.58s cubic-bezier(0.22, 1, 0.36, 1);
}

.oa-slot--mode.is-active::after {
  opacity: 0;
}

/* ---------- 卡片 ---------- */

.oa-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.4vh, 18px);
  padding: clamp(14px, 1.6vw, 22px);
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

.oa-card:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 3px;
}

.oa-card__frame {
  position: relative;
  display: block;
  flex: 1 1 auto;
  min-height: clamp(96px, 13vh, 150px);
  overflow: hidden;
  border-radius: 6px;
  background: #eaf6ff;
}

.oa-card--mode .oa-card__frame {
  min-height: clamp(140px, 22vh, 220px);
}

/* 被压住的卡片插画反向微倾，强化“两张卡叠在一起”的视觉 */
.oa-slot--mode:not(.is-active) .oa-card__frame {
  transform: rotate(1.2deg);
}

.oa-card__frame :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.oa-card__title {
  font-size: clamp(15px, 1.3vw, 21px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: #1e4b76;
}

.oa-card--mode .oa-card__title {
  font-size: clamp(19px, 1.7vw, 27px);
}

/* 标题下的一行说明：只占一行，超长省略，避免把卡片撑高 */
.oa-card__subtitle {
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

/* ---------- 宽卡（更多功能） ---------- */

.oa-card--wide {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(12px, 1.6vw, 24px);
  text-align: right;
}

.oa-card--wide .oa-card__frame {
  min-height: clamp(110px, 14vh, 160px);
}

.oa-card__text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 0;
}

.oa-card__text .oa-card__subtitle {
  margin-top: 0;
  max-width: 100%;
}

/* ---------- 响应式 ---------- */

@media (max-width: 1080px) {
  .oa-home__grid {
    grid-template-columns: 1fr;
  }

  .oa-home__side {
    grid-template-rows: auto auto;
  }
}

@media (max-width: 720px) {
  .oa-home__modes {
    display: grid;
    grid-template-columns: 1fr;
    --peek: 0px;
  }

  .oa-slot--mode {
    width: 100%;
  }

  .oa-slot--mode::after {
    display: none;
  }

  .oa-home__features {
    grid-template-columns: 1fr;
  }

  .oa-card--wide {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .oa-card__text {
    align-items: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .oa-home.is-entering .oa-slot {
    animation: none;
  }

  .oa-slot--mode,
  .oa-slot--mode::after {
    transition: none;
  }
}
</style>

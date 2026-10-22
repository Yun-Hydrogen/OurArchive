<script setup lang="ts">
import { onMounted, ref } from 'vue';
import OABannerSvg from '@/components/splash/OABannerSvg.vue';
import { useBannerSequence } from '@/composables/useBannerSequence';
import { useSplashAudio } from '@/composables/useSplashAudio';
import { SPLASH_ASSETS } from '@/config/assets';
import { SPLASH_TIMING } from '@/config/splash';

const { playToken, isIdle, isReady, play: playBanner } = useBannerSequence();
const { preload, play: playSound } = useSplashAudio(SPLASH_ASSETS.titleSoundUrl);

const BUBBLES = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'] as const;

const hasStarted = ref(false);

/** 播放 banner 动画与音效（重播也走这里） */
async function startSequence() {
  playBanner();
  await playSound();
}

/** 白屏引导：首次点击任意位置，提供用户手势以解锁音频 */
async function handleStart() {
  if (hasStarted.value) return;
  hasStarted.value = true;
  await startSequence();
}

async function handleActivate() {
  await startSequence();
}

function handleGateKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    void handleStart();
  }
}

onMounted(() => {
  // 仅预加载音效，等待用户手势后再播放
  preload();
});
</script>

<template>
  <main class="splash-screen">
    <!-- 漂浮气泡背景：点击开始后淡入 -->
    <div class="splash-bubbles" :class="{ 'is-active': hasStarted }" aria-hidden="true">
      <span v-for="bubble in BUBBLES" :key="bubble" class="splash-bub" :class="bubble" />
    </div>

    <!-- 初始白屏引导：点击任意位置开始 -->
    <Transition name="gate-fade">
      <div
        v-if="isIdle"
        class="splash-gate"
        role="button"
        tabindex="0"
        aria-label="点击任意位置开始"
        @click="handleStart"
        @keydown="handleGateKeydown"
      >
        <div class="splash-gate__content">
          <span class="splash-gate__text">点击任意位置开始</span>
          <span class="splash-gate__subtext">CLICK ANYWHERE TO START</span>
        </div>
      </div>
    </Transition>

    <!-- 居中 banner：playToken 变化时重挂，SVG 内动画从头播放 -->
    <div class="splash-screen__center">
      <div v-if="playToken > 0" :key="playToken" class="splash-banner__wrapper">
        <OABannerSvg />
      </div>
    </div>

    <!-- 悬浮 TOUCH TO START：全宽 flex 容器居中，不受子级 transform 干扰 -->
    <div v-show="isReady" class="splash-screen__prompt-dock">
      <button
        type="button"
        class="splash-prompt"
        :style="{ '--fade-in': `${SPLASH_TIMING.promptFadeIn}ms` }"
        @click="handleActivate"
      >
        <span class="splash-prompt__label">TOUCH TO START</span>
      </button>
    </div>

    <!-- 底部版权与开源声明：白屏引导通过后常驻 -->
    <footer v-show="hasStarted" class="splash-legal">
      <p>本程序为非官方同人衍生的开源视觉小说制作和播放工具，与 NEXON Games、Yostar 等《蔚蓝档案》(Blue Archive) 官方版权方及运营方毫无关联，亦未获得任何官方授权或赞助。</p>
      <p>程序代码依据 GNU AGPLv3 协议开源，仅供学习、技术交流与个人非商业同人创作体验。本项目源码及发行版本中不附带任何《蔚蓝档案》受版权保护的游戏专有资源（包括但不限于立绘、CG、音效与音乐等），相关游戏资产须由使用者合法自行处理与获取。</p>
      <p class="splash-legal-strict">本程序官方发行版本使用了含有非商业授权的美术资源，严禁将本程序官方发行版本及包含非商业美术资源的源代码用于任何形式的直接或间接商业盈利活动（包括但不限于付费销售、捆绑收费、付费会员、打赏解锁与商业展示等）。所有相关知识产权均归原权利方所有。</p>
    </footer>
  </main>
</template>

<style scoped>
.splash-screen {
  position: relative;
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #ffffff;
}

/* ---------- 漂浮气泡 ---------- */

.splash-bubbles {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  filter: blur(12px);
  opacity: 0;
  transition: opacity 1.6s ease;
}

.splash-bubbles.is-active {
  opacity: 1;
}

.splash-bub {
  position: absolute;
  border-radius: 50%;
  background: var(--oa-blue, #0090fe);
  animation: splash-bub-float var(--dur, 20s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
  will-change: transform;
}

.b1 { width: 190px; height: 190px; top: 6%; left: 6%; --dur: 38s; --delay: 0s; opacity: 0.1; }
.b2 { width: 180px; height: 180px; top: 55%; left: 75%; --dur: 35s; --delay: -5s; opacity: 0.15; }
.b3 { width: 200px; height: 200px; top: 72%; left: 8%; --dur: 40s; --delay: -10s; opacity: 0.14; }
.b4 { width: 185px; height: 185px; top: 18%; left: 60%; --dur: 36s; --delay: -15s; opacity: 0.15; }
.b5 { width: 195px; height: 195px; top: 38%; left: 35%; --dur: 42s; --delay: -7s; opacity: 0.12; }
.b6 { width: 190px; height: 190px; top: 80%; left: 48%; --dur: 34s; --delay: -12s; opacity: 0.15; }
.b7 { width: 180px; height: 180px; top: 14%; left: 84%; --dur: 38s; --delay: -3s; opacity: 0.14; }
.b8 { width: 200px; height: 200px; top: 48%; left: 14%; --dur: 41s; --delay: -9s; opacity: 0.13; }
.b9 { width: 185px; height: 185px; top: 60%; left: 52%; --dur: 37s; --delay: -14s; opacity: 0.15; }
.b10 { width: 195px; height: 195px; top: 30%; left: 78%; --dur: 39s; --delay: -6s; opacity: 0.14; }

@keyframes splash-bub-float {
  0% { transform: translate(0, 0) scale(1); }
  20% { transform: translate(90px, -70px) scale(1.08); }
  40% { transform: translate(-65px, 80px) scale(0.92); }
  60% { transform: translate(-100px, -35px) scale(1.06); }
  80% { transform: translate(45px, 55px) scale(0.96); }
  100% { transform: translate(0, 0) scale(1); }
}

/* ---------- 白屏引导 ---------- */

.splash-gate {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.splash-gate__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: gate-pulse 2.4s ease-in-out infinite;
}

.splash-gate__text {
  font-family: var(--oa-font);
  font-size: clamp(16px, 1.8vw, 20px);
  font-weight: 500;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: #13181f;
}

.splash-gate__subtext {
  font-family: var(--oa-font);
  font-size: clamp(10px, 1vw, 12px);
  font-weight: 400;
  letter-spacing: 0.28em;
  text-indent: 0.28em;
  color: #8898aa;
}

@keyframes gate-pulse {
  0%, 100% { opacity: 0.45; transform: scale(0.99); }
  50% { opacity: 0.95; transform: scale(1); }
}

.gate-fade-leave-active {
  transition: opacity 0.6s ease;
}

.gate-fade-leave-to {
  opacity: 0;
}

/* ---------- Banner ---------- */

.splash-screen__center {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  padding: 32px 32px calc(32px + 9vh);
  pointer-events: none;
}

.splash-banner__wrapper {
  display: block;
  width: min(46vw, 620px);
  max-width: 100%;
  height: auto;
  max-height: 100%;
  user-select: none;
  -webkit-user-drag: none;
}

/* ---------- TOUCH TO START ---------- */

.splash-screen__prompt-dock {
  position: absolute;
  right: 0;
  bottom: clamp(106px, 19vh, 170px);
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.splash-screen__prompt-dock > * {
  pointer-events: auto;
}

.splash-prompt {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 42px;
  border: 1.5px solid #13181f;
  border-radius: 14px;
  background: #ffffff;
  color: #13181f;
  cursor: pointer;
  white-space: nowrap;
  animation: splash-prompt-in var(--fade-in, 700ms) ease both;
  transition: background-color 200ms ease, color 200ms ease;
  -webkit-tap-highlight-color: transparent;
}

.splash-prompt:hover,
.splash-prompt:focus-visible {
  background: #13181f;
  color: #ffffff;
  outline: none;
}

.splash-prompt__label {
  pointer-events: none;
  font-family: var(--oa-font);
  font-size: clamp(12px, 1.2vw, 15px);
  font-weight: 500;
  letter-spacing: 0.28em;
  text-indent: 0.28em;
  text-transform: uppercase;
  color: inherit;
  text-align: center;
}

@keyframes splash-prompt-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- 版权声明 ---------- */

.splash-legal {
  position: absolute;
  right: 0;
  bottom: clamp(12px, 2.2vh, 24px);
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 980px;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
  pointer-events: none;
  user-select: none;
  animation: legal-fade-in 800ms ease both;
}

.splash-legal p {
  font-family: var(--oa-font);
  font-size: clamp(9px, 0.72vw, 11px);
  line-height: 1.5;
  letter-spacing: 0.03em;
  color: #94a3b8;
}

/* 权重需高于 `.splash-legal p`，否则该行颜色会被覆盖 */
.splash-legal .splash-legal-strict {
  color: #ffa070;
  font-weight: 500;
}

@keyframes legal-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .splash-screen__center {
    padding: 20px 20px calc(20px + 8vh);
  }

  .splash-banner__wrapper {
    width: min(76vw, 420px);
  }

  .splash-screen__prompt-dock {
    bottom: clamp(96px, 17vh, 150px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .splash-bub,
  .splash-gate__content,
  .splash-prompt {
    animation: none;
  }
}
</style>

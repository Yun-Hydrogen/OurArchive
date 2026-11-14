<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppShell } from '@/composables/useAppShell';
import { useBannerSequence } from '@/composables/useBannerSequence';
import { useBackgroundMusic } from '@/composables/useBackgroundMusic';
import { useSplashAudio } from '@/composables/useSplashAudio';
import { useGlobalConfig } from '@/composables/useGlobalConfig';
import { SPLASH_ASSETS } from '@/config/assets';
import { ROUTE_NAMES } from '@/config/routes';
import { SPLASH_TIMING } from '@/config/splash';
import { unlockApp } from '@/router/access';

const router = useRouter();

const { config, fetchConfig } = useGlobalConfig();
const { isIdle, isReady, play: playBanner } = useBannerSequence();
const { preload, play: playSound } = useSplashAudio(SPLASH_ASSETS.titleSoundUrl);
const { fadeIn: fadeInMainBgm } = useBackgroundMusic();
const { gatePassed, enterHome, markGatePassed, playBannerAnimation } = useAppShell();

/** 正在离场：防止重复触发跳转，同时驱动版权飞出等退场动画 */
const isLeaving = ref(false);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 白屏引导：首次点击任意位置，提供用户手势以解锁音频并淡入播放 main_bgm */
async function handleStart() {
  if (gatePassed.value) return;
  // 解锁 App 层的气泡 / banner / 设置，并让 banner 动画从头播放
  markGatePassed();
  playBannerAnimation();
  unlockApp();

  const targetVolume = config.value.main_bgm_volume / 100;
  void fadeInMainBgm(targetVolume, SPLASH_TIMING.bgmFadeInDuration);

  playBanner();
  await playSound();
}

/**
 * TOUCH TO START：不换页、不重建背景。
 * 先让外壳开始停靠 banner 并点亮主界面底色，同时页面内版权文字向下飞出；
 * 位移跑起来之后才 router.push，主界面卡片随后飞入。
 */
async function handleActivate() {
  if (isLeaving.value) return;
  isLeaving.value = true;

  enterHome();
  await wait(SPLASH_TIMING.exitDuration);
  await router.push({ name: ROUTE_NAMES.home });
}

function handleGateKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    void handleStart();
  }
}

onMounted(() => {
  void fetchConfig();
  preload();
  // 提前拉取主界面 chunk，跳转时不必等动态加载
  void import('@/views/HomeView.vue');
});
</script>

<template>
  <main class="oa-splash" :class="{ 'is-leaving': isLeaving }">
    <!-- 初始白屏引导：点击任意位置开始 -->
    <Transition name="oa-gate-fade">
      <div
        v-if="isIdle"
        class="oa-splash__gate"
        role="button"
        tabindex="0"
        aria-label="点击任意位置开始"
        @click="handleStart"
        @keydown="handleGateKeydown"
      >
        <div class="oa-splash__gate__content">
          <span class="oa-splash__gate__text">点击任意位置开始</span>
          <span class="oa-splash__gate__subtext">CLICK ANYWHERE TO START</span>
        </div>
      </div>
    </Transition>

    <!-- 悬浮 TOUCH TO START：全宽 flex 容器居中，不受子级 transform 干扰 -->
    <div v-show="isReady" class="oa-splash__prompt-dock">
      <button
        type="button"
        class="oa-splash__prompt"
        :style="{ '--fade-in': `${SPLASH_TIMING.promptFadeIn}ms` }"
        @click="handleActivate"
      >
        <span class="oa-splash__prompt__label">TOUCH TO START</span>
      </button>
    </div>

    <!-- 底部版权与开源声明：离场时向下飞出 -->
    <footer v-show="gatePassed" class="oa-splash__legal">
      <p>本程序为非官方同人衍生的开源视觉小说制作和播放工具，与 NEXON Games、Yostar 等《蔚蓝档案》(Blue Archive) 官方版权方及运营方毫无关联，亦未获得任何官方授权或赞助。</p>
      <p>程序代码依据 GNU AGPLv3 协议开源，仅供学习、技术交流与个人非商业同人创作体验。本项目源码及发行版本中不附带任何《蔚蓝档案》受版权保护的游戏专有资源（包括但不限于立绘、CG、音效与音乐等），相关游戏资产须由使用者合法自行处理与获取。</p>
      <p class="oa-splash__legal-strict">本程序官方发行版本使用了含有非商业授权的美术资源，严禁将本程序官方发行版本及包含非商业美术资源的源代码用于任何形式的直接或间接商业盈利活动（包括但不限于付费销售、捆绑收费、付费会员、打赏解锁与商业展示等）。所有相关知识产权均归原权利方所有。</p>
    </footer>
  </main>
</template>

<style scoped>
/*
 * 页面本身透明、也不持有 banner 与设置：
 * 底色、气泡、banner、设置都由 App 外壳常驻，跳转到主界面时它们不会重建。
 */
.oa-splash {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
}

/* ---------- 白屏引导 ---------- */

.oa-splash__gate {
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

.oa-splash__gate__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: gate-pulse 2.4s ease-in-out infinite;
}

.oa-splash__gate__text {
  font-family: var(--oa-font);
  font-size: clamp(16px, 1.8vw, 20px);
  font-weight: 500;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  color: #13181f;
}

.oa-splash__gate__subtext {
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

.oa-gate-fade-leave-active {
  transition: opacity 0.6s ease;
}

.oa-gate-fade-leave-to {
  opacity: 0;
}

/* ---------- TOUCH TO START ---------- */

.oa-splash__prompt-dock {
  position: absolute;
  right: 0;
  bottom: clamp(106px, 19vh, 170px);
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}

.oa-splash__prompt-dock > * {
  pointer-events: auto;
}

.oa-splash__prompt {
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
  animation: oa-splash__prompt-in var(--fade-in, 700ms) ease both;
  transition: background-color 200ms ease, color 200ms ease;
  -webkit-tap-highlight-color: transparent;
}

.oa-splash__prompt:hover,
.oa-splash__prompt:focus-visible {
  background: #13181f;
  color: #ffffff;
  outline: none;
}

.oa-splash__prompt__label {
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

@keyframes oa-splash__prompt-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- 版权声明 ---------- */

.oa-splash__legal {
  position: absolute;
  right: 0;
  bottom: clamp(12px, 2.2vh, 24px);
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 90%;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
  pointer-events: none;
  user-select: none;
  animation: legal-fade-in 800ms ease backwards;
  transition:
    transform 460ms cubic-bezier(0.4, 0, 1, 1),
    opacity 380ms ease;
}

.oa-splash__legal p {
  font-family: var(--oa-font);
  font-size: clamp(9px, 0.72vw, 10px);
  line-height: 1.5;
  letter-spacing: 0.03em;
  color: #94a3b8;
}

/* 权重需高于 `.oa-splash__legal p`，否则该行颜色会被覆盖 */
.oa-splash__legal .oa-splash__legal-strict {
  color: #ffa070;
  font-weight: 500;
}

@keyframes legal-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- 离场：版权向下飞出，提示淡出 ---------- */

/*
 * 入场动画必须用 backwards 而不是 both：
 * both 会把 `legal-fade-in` 的末帧（transform / opacity）永久锁在元素上，
 * CSS 动画优先级高于 transition，下面这条离场 transition 就永远不会生效。
 */
.oa-splash.is-leaving .oa-splash__legal {
  opacity: 0;
  transform: translateY(96px);
}

.oa-splash.is-leaving .oa-splash__prompt-dock {
  opacity: 0;
  transform: translateY(18px);
  pointer-events: none;
}

/* ---------- 响应式 ---------- */

@media (max-width: 640px) {
  .oa-splash__prompt-dock {
    bottom: clamp(96px, 17vh, 150px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .oa-splash__gate__content,
  .oa-splash__prompt {
    animation: none;
  }
}
</style>

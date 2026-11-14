import { computed, onBeforeUnmount, ref } from 'vue';
import { SPLASH_TIMING } from '@/config/splash';

export type SplashPhase = 'idle' | 'animating' | 'ready';

/**
 * 管理 Splash 的入场时序：
 * idle（等待点击任意位置开始） -> animating（播放中） -> ready（展示 TOUCH TO START）。
 *
 * 每次 `play()` 都会推进 `playToken`，调用方用它作为 key 重新挂载 banner
 * 以从头播放 SVG 内自包含的 CSS 动画。
 */
export function useBannerSequence() {
  const phase = ref<SplashPhase>('idle');
  const playToken = ref(0);

  let promptTimer: ReturnType<typeof setTimeout> | null = null;

  const isIdle = computed(() => phase.value === 'idle');
  const isAnimating = computed(() => phase.value === 'animating');
  const isReady = computed(() => phase.value === 'ready');

  function clearTimers() {
    if (promptTimer) {
      clearTimeout(promptTimer);
      promptTimer = null;
    }
  }

  /** 播放（或重播）banner 动画，结束后进入 ready 阶段 */
  function play() {
    clearTimers();
    phase.value = 'animating';
    playToken.value += 1;

    promptTimer = setTimeout(() => {
      phase.value = 'ready';
      promptTimer = null;
    }, SPLASH_TIMING.bannerDuration + SPLASH_TIMING.promptRevealDelay);
  }

  onBeforeUnmount(clearTimers);

  return { phase, playToken, isIdle, isAnimating, isReady, play };
}

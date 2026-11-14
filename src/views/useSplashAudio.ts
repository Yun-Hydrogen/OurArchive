import { onBeforeUnmount, ref } from 'vue';
import { SPLASH_SOUND_VOLUME } from '@/config/splash';

export interface SplashAudioOptions {
  /** 音量，范围 0-1 */
  volume?: number;
  /** 是否循环播放 */
  loop?: boolean;
}

/**
 * Splash 音效/背景音乐播放控制。
 *
 * 浏览器自动播放策略会拦截无声源交互时的播放请求，
 * 因此这里暴露 `needsGesture`，由调用方在用户首次交互时重试。
 */
export function useSplashAudio(src: string, options: SplashAudioOptions = {}) {
  const isPlaying = ref(false);
  const needsGesture = ref(false);
  const isReady = ref(false);

  let element: HTMLAudioElement | null = null;
  let fadeTimer: number | null = null;

  function clearFade() {
    if (fadeTimer !== null) {
      cancelAnimationFrame(fadeTimer);
      fadeTimer = null;
    }
  }

  function getElement(): HTMLAudioElement {
    if (!element) {
      element = new Audio(src);
      element.preload = 'auto';
      element.volume = options.volume ?? SPLASH_SOUND_VOLUME;
      element.loop = options.loop ?? false;
      element.addEventListener('ended', () => {
        isPlaying.value = false;
      });
      element.addEventListener('canplaythrough', () => {
        isReady.value = true;
      });
      element.addEventListener('error', () => {
        isPlaying.value = false;
      });
      element.load();
    }

    return element;
  }

  /** 预加载音效，但不播放 */
  function preload() {
    getElement();
  }

  /** 从头播放；被自动播放策略拦截时返回 false 并标记 needsGesture */
  async function play(): Promise<boolean> {
    clearFade();
    const audio = getElement();

    try {
      audio.currentTime = 0;
      await audio.play();
      isPlaying.value = true;
      needsGesture.value = false;
      return true;
    } catch {
      isPlaying.value = false;
      needsGesture.value = true;
      return false;
    }
  }

  /**
   * 平滑淡入播放音频
   * @param targetVolume 目标音量（0-1）
   * @param durationMs 淡入时长（毫秒）
   */
  async function fadeIn(targetVolume: number, durationMs = 2000): Promise<boolean> {
    clearFade();
    const audio = getElement();
    const target = Math.max(0, Math.min(1, targetVolume));

    if (target <= 0) {
      audio.volume = 0;
      return play();
    }

    // 从 0 开始淡入
    audio.volume = 0;
    const played = await play();
    if (!played) return false;

    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 2);
      const current = target * ease;

      if (element) {
        element.volume = Math.max(0, Math.min(1, current));
      }

      if (progress < 1) {
        fadeTimer = requestAnimationFrame(step);
      } else {
        if (element) {
          element.volume = target;
        }
        fadeTimer = null;
      }
    }

    fadeTimer = requestAnimationFrame(step);
    return true;
  }

  function stop() {
    clearFade();
    if (!element) return;
    element.pause();
    element.currentTime = 0;
    isPlaying.value = false;
  }

  function setVolume(volume: number) {
    clearFade();
    const clamped = Math.max(0, Math.min(1, volume));
    if (element) {
      element.volume = clamped;
    }
  }

  function dispose() {
    clearFade();
    if (!element) return;
    element.pause();
    element.src = '';
    element = null;
    isPlaying.value = false;
  }

  onBeforeUnmount(dispose);

  return { isPlaying, needsGesture, isReady, preload, play, fadeIn, stop, setVolume, dispose };
}

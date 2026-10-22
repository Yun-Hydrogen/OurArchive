import { onBeforeUnmount, ref } from 'vue';
import { SPLASH_SOUND_VOLUME } from '@/config/splash';

/**
 * Splash 音效播放控制。
 *
 * 浏览器自动播放策略会拦截无声源交互时的播放请求，
 * 因此这里暴露 `needsGesture`，由调用方在用户首次交互时重试。
 */
export function useSplashAudio(src: string) {
  const isPlaying = ref(false);
  const needsGesture = ref(false);
  const isReady = ref(false);

  let element: HTMLAudioElement | null = null;

  function getElement(): HTMLAudioElement {
    if (!element) {
      element = new Audio(src);
      element.preload = 'auto';
      element.volume = SPLASH_SOUND_VOLUME;
      element.addEventListener('ended', () => {
        isPlaying.value = false;
      });
      element.addEventListener('canplaythrough', () => {
        isReady.value = true;
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

  function stop() {
    if (!element) return;
    element.pause();
    element.currentTime = 0;
    isPlaying.value = false;
  }

  function dispose() {
    if (!element) return;
    element.pause();
    element.src = '';
    element = null;
    isPlaying.value = false;
  }

  onBeforeUnmount(dispose);

  return { isPlaying, needsGesture, isReady, preload, play, stop, dispose };
}

import { ref, watch } from 'vue';
import { useGlobalConfig } from '@/composables/useGlobalConfig';

/** preload 清单中的主界面背景音乐 id */
const MAIN_BGM_SRC = '/api/preload/asset/main_bgm';

const { config } = useGlobalConfig();

const isPlaying = ref(false);
const volume = ref(clamp01(config.value.main_bgm_volume / 100));

let element: HTMLAudioElement | null = null;
let fadeFrame: number | null = null;
let fade: { from: number; to: number; startedAt: number; duration: number } | null = null;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function cancelFade() {
  if (fadeFrame !== null) {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
  }
  fade = null;
}

function ensureElement(): HTMLAudioElement {
  if (element) return element;

  element = new Audio(MAIN_BGM_SRC);
  element.loop = true;
  element.preload = 'auto';
  element.volume = volume.value;
  element.addEventListener('play', () => {
    isPlaying.value = true;
  });
  element.addEventListener('pause', () => {
    isPlaying.value = false;
  });
  element.addEventListener('ended', () => {
    isPlaying.value = false;
  });
  element.addEventListener('error', () => {
    isPlaying.value = false;
  });
  element.load();

  return element;
}

function fadeStep(now: number) {
  if (!fade || !element) {
    fadeFrame = null;
    return;
  }

  const progress = Math.min(1, (now - fade.startedAt) / fade.duration);
  const ease = 1 - Math.pow(1 - progress, 2);
  element.volume = clamp01(fade.from + (fade.to - fade.from) * ease);

  if (progress < 1) {
    fadeFrame = requestAnimationFrame(fadeStep);
    return;
  }

  element.volume = clamp01(fade.to);
  fadeFrame = null;
  fade = null;
}

/** 预创建音频元素（不播放），提前完成缓冲 */
function preload() {
  ensureElement();
}

/** 从头播放；返回 false 表示被浏览器自动播放策略拦截 */
async function play(): Promise<boolean> {
  cancelFade();
  const audio = ensureElement();

  try {
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    isPlaying.value = false;
    return false;
  }
}

/** 确保音乐处于播放状态（不重置进度，用于跨页面/刷新后恢复） */
async function ensurePlaying(): Promise<boolean> {
  const audio = ensureElement();
  if (!audio.paused) return true;

  try {
    await audio.play();
    return true;
  } catch {
    isPlaying.value = false;
    return false;
  }
}

/**
 * 从 0 平滑淡入（二次缓出）到目标音量并保持循环播放。
 * 淡入期间调整音量不会中断动画，而是直接改写目标音量。
 */
async function fadeIn(targetVolume = volume.value, durationMs = 2000): Promise<boolean> {
  cancelFade();
  const audio = ensureElement();
  const target = clamp01(targetVolume);

  volume.value = target;
  audio.volume = 0;

  try {
    audio.currentTime = 0;
    await audio.play();
  } catch {
    isPlaying.value = false;
    return false;
  }

  fade = {
    from: 0,
    to: target,
    startedAt: performance.now(),
    duration: Math.max(1, durationMs),
  };
  fadeFrame = requestAnimationFrame(fadeStep);
  return true;
}

function stop() {
  cancelFade();
  if (!element) return;
  element.pause();
  element.currentTime = 0;
  isPlaying.value = false;
}

function setVolume(next: number) {
  const clamped = clamp01(next);
  volume.value = clamped;

  if (fade) {
    fade = {
      from: element?.volume ?? 0,
      to: clamped,
      startedAt: performance.now(),
      duration: fade.duration,
    };
    return;
  }

  if (element) {
    element.volume = clamped;
  }
}

// 设置面板改动音量时，对正在播放（或后续播放）的背景音乐即时生效
watch(
  () => config.value.main_bgm_volume,
  (value) => {
    setVolume(value / 100);
  }
);

/**
 * 主界面背景音乐（preload id: main_bgm）。
 *
 * 音频元素与播放状态都保存在模块作用域，属于全应用单例：
 * splash 淡入播放后切换到主界面不会中断，路由卸载也不会销毁音频。
 */
export function useBackgroundMusic() {
  return { isPlaying, volume, preload, play, ensurePlaying, fadeIn, stop, setVolume };
}

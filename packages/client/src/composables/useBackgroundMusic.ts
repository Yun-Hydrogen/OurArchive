import { ref, watch } from 'vue';
import { useGlobalConfig } from '@/composables/useGlobalConfig';

/** preload 清单中的主界面背景音乐 id */
const MAIN_BGM_SRC = '/api/preload/asset/main_bgm';

const { config } = useGlobalConfig();

const isPlaying = ref(false);
const volume = ref(clamp01(config.value.main_bgm_volume / 100));

let element: HTMLAudioElement | null = null;
let fadeFrame: number | null = null;
let fade: {
  from: number;
  to: number;
  startedAt: number;
  duration: number;
  /** 淡入 / 淡出结束后回调（例如淡出完成才真正 pause） */
  onDone?: () => void;
} | null = null;

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

  // 先摘掉 fade 再跑回调，回调里可以安全地再排一段新的淡入
  const done = fade.onDone;
  fade = null;
  done?.();
}

/** 排一段音量渐变；会先取消正在进行的渐变 */
function startFade(
  from: number,
  to: number,
  durationMs: number,
  onDone?: () => void
) {
  cancelFade();
  if (!element) {
    return;
  }
  fade = {
    from: clamp01(from),
    to: clamp01(to),
    startedAt: performance.now(),
    duration: Math.max(1, durationMs),
    onDone,
  };
  fadeFrame = requestAnimationFrame(fadeStep);
}

/** 预创建音频元素（不播放），提前完成缓冲 */
function preload() {
  ensureElement();
}

/** 从头播放；返回 false 表示被浏览器自动播放策略拦截 */
async function play(): Promise<boolean> {
  cancelFade();
  suspended = false;
  const audio = ensureElement();

  // 若之前是淡出到 0 的暂停，音量还停在 0，这里补回来
  audio.volume = volume.value;

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
    audio.volume = volume.value;
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

  startFade(0, target, durationMs);
  return true;
}

function stop() {
  cancelFade();
  suspended = false;
  if (!element) return;
  element.pause();
  element.currentTime = 0;
  element.volume = volume.value;
  isPlaying.value = false;
}

/* ---------------------- 让位给其它音频（试听等） ---------------------- */

/** 是否被外部音频压住，用于决定要不要恢复 */
let suspended = false;
/** 被压住时记住的播放进度 */
let suspendedAt = 0;

/**
 * 淡出并暂停背景音乐（保留进度），供资源包试听之类的场景调用。
 * 返回是否真的开始淡出（本来就没在播则返回 false）。
 */
function suspend(durationMs = 480): boolean {
  if (!element || element.paused) {
    return false;
  }

  suspendedAt = element.currentTime;
  suspended = true;

  // 淡出到 0 之后才真正 pause，避免硬切
  const audio = element;
  startFade(audio.volume, 0, durationMs, () => {
    if (!suspended || !element) {
      return;
    }
    element.pause();
  });

  return true;
}

/** 恢复被 `suspend()` 淡出的背景音乐（淡入）；没有被压住则什么都不做 */
async function resume(durationMs = 620): Promise<boolean> {
  if (!suspended) {
    return false;
  }
  suspended = false;

  const audio = ensureElement();
  if (!audio.paused) {
    // 淡出还没播完就恢复了：直接补回目标音量
    startFade(audio.volume, volume.value, durationMs);
    return true;
  }

  try {
    // 暂停期间可能被拖动过，恢复时回到被压住的位置
    if (suspendedAt > 0 && Math.abs(audio.currentTime - suspendedAt) > 0.25) {
      audio.currentTime = suspendedAt;
    }
    audio.volume = 0;
    await audio.play();
  } catch {
    isPlaying.value = false;
    audio.volume = volume.value;
    return false;
  }

  startFade(0, volume.value, durationMs);
  return true;
}

function setVolume(next: number) {
  const clamped = clamp01(next);
  volume.value = clamped;

  // 被试听压住时只记住目标音量，恢复时会淡入到它
  if (suspended) {
    return;
  }

  // 正在执行「淡出到 0 后暂停」：改写目标会让音量重新升回去
  if (fade?.onDone) {
    return;
  }

  if (fade) {
    // 淡入过程中改音量：只改目标，保留原有进度与回调
    fade = { ...fade, from: element?.volume ?? 0, to: clamped, startedAt: performance.now() };
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
  return { isPlaying, volume, preload, play, ensurePlaying, fadeIn, stop, setVolume, suspend, resume };
}

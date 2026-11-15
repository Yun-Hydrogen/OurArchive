/**
 * 表情音效：全局单例播放入口。
 *
 * 表情 SVG 是纯动画，自身不能/不允许播放音频（CSP `media-src 'none'`）。
 * 宿主负责：新音效到来时**打断上一段**（同一时间只保留一段），
 * 音量跟随设置里的「预览音频 / 音效音量」，并在播放期间压住主界面 BGM。
 */
import { ref, watch } from 'vue';
import { useBackgroundMusic } from '@/modules/AudioPlayer/useBackgroundMusic';
import { useGlobalConfig } from '@/modules/ConfigProvider/useGlobalConfig';
import { readonlyRef } from '@/utils/reactivity';

const { config } = useGlobalConfig();
const { suspend: suspendMainBgm, resume: resumeMainBgm } = useBackgroundMusic();

const playing = ref(false);
const currentUrl = ref('');

let audio: HTMLAudioElement | null = null;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value) / 100));
}

function volume(): number {
  return clamp01(config.value.preview_volume);
}

function ensureAudio(): HTMLAudioElement {
  if (audio) {
    return audio;
  }
  audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('play', () => {
    playing.value = true;
  });
  audio.addEventListener('pause', () => {
    playing.value = false;
  });
  audio.addEventListener('ended', () => {
    playing.value = false;
    currentUrl.value = '';
    void resumeMainBgm();
  });
  audio.addEventListener('error', () => {
    playing.value = false;
    currentUrl.value = '';
    void resumeMainBgm();
  });
  return audio;
}

/** 播放一段表情音效；新的调用会打断旧的（同一时间只保留一段） */
export function playEmotionSfx(url: string): boolean {
  if (!url) {
    return false;
  }

  const el = ensureAudio();
  suspendMainBgm();

  // 先把当前这一段停掉再换 src，避免残留声音
  el.pause();
  el.currentTime = 0;
  el.src = url;
  el.volume = volume();
  currentUrl.value = url;

  void el.play().catch(() => {
    playing.value = false;
    currentUrl.value = '';
    void resumeMainBgm();
  });
  return true;
}

/** 停掉正在播的表情音效；没有播放时什么都不做 */
export function stopEmotionSfx() {
  if (!audio) {
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  audio.removeAttribute('src');
  playing.value = false;
  currentUrl.value = '';
  void resumeMainBgm();
}

// 设置里的预览音量变化时，正在播的音效音量即时跟随
watch(
  () => config.value.preview_volume,
  (value) => {
    if (audio && !audio.paused) {
      audio.volume = clamp01(value);
    }
  }
);

export const emotionSfxState = {
  playing: readonlyRef(playing),
  currentUrl: readonlyRef(currentUrl),
};

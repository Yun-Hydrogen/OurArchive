import { onBeforeUnmount, ref, watch } from 'vue';
import { useBackgroundMusic } from '@/modules/AudioPlayer/useBackgroundMusic';
import { useGlobalConfig } from '@/modules/ConfigProvider/useGlobalConfig';

/**
 * 资源包试听器（页面私有）：音乐与音效共用同一套播放状态。
 *
 * - 每个使用方各持有一个 `<audio>`：音乐与音效分属两个分类组件，
 *   靠 `v-if` 保证不会同时挂载，所以不需要跨组件共享同一个元素；
 * - 试听时压住主界面 BGM，暂停 / 播完 / 卸载时恢复；
 * - 音量跟随设置里的「预览音频 / 音效音量」。
 *
 * ⚠️ 不要把 `<audio>` 写进分类分支之外的模板——见 `NeedNotice` 条目 26。
 */

/** 试听条目：只需要这三个字段 */
export interface PreviewTrack {
  id: string;
  url: string;
  /** 服务端算好的时长（秒），未知为 -1 */
  duration: number;
}

export function usePackagePreviewAudio() {
  const { suspend: suspendMainBgm, resume: resumeMainBgm } = useBackgroundMusic();
  const { config: globalConfig } = useGlobalConfig();

  const audioEl = ref<HTMLAudioElement | null>(null);
  /** 正在播的条目 id；空串表示没有 */
  const playingId = ref('');
  const isPlaying = ref(false);
  const current = ref(0);
  const duration = ref(0);
  /** 当前条目的服务端时长（秒），驱动进度轴的 max；未知时为 0 */
  const serverDuration = ref(0);

  // 元素挂载与设置改动都同步一次音量
  watch(
    [audioEl, () => globalConfig.value.preview_volume],
    ([el, volume]) => {
      if (el) {
        el.volume = Math.max(0, Math.min(1, volume / 100));
      }
    },
    { immediate: true, flush: 'post' }
  );

  function isPlayingTrack(id: string): boolean {
    return playingId.value === id;
  }

  function resetProgress() {
    serverDuration.value = 0;
    current.value = 0;
    duration.value = 0;
  }

  function toggle(track: PreviewTrack) {
    const el = audioEl.value;
    if (!el || !track.url) {
      return;
    }

    // 同一条：只在播放 / 暂停之间切换
    if (playingId.value === track.id) {
      if (el.paused) {
        suspendMainBgm();
        void el.play().catch(() => {
          isPlaying.value = false;
          void resumeMainBgm();
        });
      } else {
        el.pause();
        void resumeMainBgm();
      }
      return;
    }

    // 换条：先压住主界面背景音乐，再切 src
    suspendMainBgm();
    playingId.value = track.id;
    serverDuration.value = track.duration > 0 ? track.duration : 0;
    current.value = 0;
    duration.value = 0;
    el.src = track.url;
    void el.play().catch(() => {
      playingId.value = '';
      isPlaying.value = false;
      void resumeMainBgm();
    });
  }

  /**
   * 自然播完：清掉「当前试听」并回到开头。
   * 不清状态的话播放键会停在「已暂停 + 进度在末尾」，
   * 再点只会从末尾 `play()`，听感就是「点了没反应」。
   */
  function handleEnded() {
    isPlaying.value = false;
    playingId.value = '';
    resetProgress();
    if (audioEl.value) {
      audioEl.value.currentTime = 0;
    }
    void resumeMainBgm();
  }

  function seek(value: number) {
    const el = audioEl.value;
    if (!el || !Number.isFinite(value)) {
      return;
    }
    el.currentTime = value;
    current.value = value;
  }

  /** 停掉试听并释放音源（切分类 / 卸载） */
  function stop() {
    const el = audioEl.value;
    if (!el) {
      return;
    }
    el.pause();
    el.removeAttribute('src');
    playingId.value = '';
    isPlaying.value = false;
    resetProgress();
    void resumeMainBgm();
  }

  onBeforeUnmount(stop);

  return {
    audioEl,
    playingId,
    isPlaying,
    current,
    duration,
    serverDuration,
    isPlayingTrack,
    toggle,
    handleEnded,
    seek,
    stop,
  };
}

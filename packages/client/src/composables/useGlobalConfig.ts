import { ref } from 'vue';

export interface GlobalConfig {
  /** 主界面背景音乐音量，0-100 */
  main_bgm_volume: number;
  /** 预览音频（资源包试听）与音效音量，0-100 */
  preview_volume: number;
}

const config = ref<GlobalConfig>({
  main_bgm_volume: 50,
  preview_volume: 60,
});

const isLoaded = ref(false);
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** 把 0-100 的数值收敛成整数，非法值回退默认 */
function clampVolume(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * 全局配置项（与后端 /api/config 同步并持久化至 global_config.yml）
 */
export function useGlobalConfig() {
  async function fetchConfig(): Promise<GlobalConfig> {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.config) {
          config.value = {
            main_bgm_volume: clampVolume(data.config.main_bgm_volume, 50),
            preview_volume: clampVolume(data.config.preview_volume, 60),
          };
          isLoaded.value = true;
        }
      }
    } catch (error) {
      console.warn('[Our Archive] 获取全局配置失败，使用默认配置', error);
    }

    return config.value;
  }

  /** 防抖写回后端；各设置项共用一次请求 */
  function persist() {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      try {
        await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            main_bgm_volume: config.value.main_bgm_volume,
            preview_volume: config.value.preview_volume,
          }),
        });
      } catch (error) {
        console.warn('[Our Archive] 保存配置失败', error);
      }
    }, 300);
  }

  function setMainBgmVolume(volume: number) {
    config.value.main_bgm_volume = clampVolume(volume, 50);
    persist();
  }

  function setPreviewVolume(volume: number) {
    config.value.preview_volume = clampVolume(volume, 60);
    persist();
  }

  return {
    config,
    isLoaded,
    fetchConfig,
    setMainBgmVolume,
    setPreviewVolume,
  };
}

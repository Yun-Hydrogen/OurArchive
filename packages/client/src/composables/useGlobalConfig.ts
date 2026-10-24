import { ref } from 'vue';

export interface GlobalConfig {
  /** 主界面背景音乐音量，0-100 */
  main_bgm_volume: number;
}

const config = ref<GlobalConfig>({
  main_bgm_volume: 50,
});

const isLoaded = ref(false);
let saveTimer: ReturnType<typeof setTimeout> | null = null;

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
            main_bgm_volume: Number(data.config.main_bgm_volume ?? 50),
          };
          isLoaded.value = true;
        }
      }
    } catch (error) {
      console.warn('[Our Archive] 获取全局配置失败，使用默认配置', error);
    }

    return config.value;
  }

  function setMainBgmVolume(volume: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    config.value.main_bgm_volume = clamped;

    // 防抖发送至后端持久化
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(async () => {
      try {
        await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ main_bgm_volume: clamped }),
        });
      } catch (error) {
        console.warn('[Our Archive] 保存配置失败', error);
      }
    }, 300);
  }

  return {
    config,
    isLoaded,
    fetchConfig,
    setMainBgmVolume,
  };
}

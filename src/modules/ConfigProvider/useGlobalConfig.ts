import { ref } from 'vue';
import { fetchGlobalConfig, saveGlobalConfig } from '@/modules/API/configApi';
import {
  normalizeSpineRendererMode,
  type SpineRendererMode,
} from '@/modules/ConfigProvider/rendererMode';
import { setKeepSession } from '@/modules/ViewsManager/access';
import { readonlyRef } from '@/utils/reactivity';

export type ConfigKey = 'main_bgm_volume' | 'preview_volume' | 'spine_renderer' | 'keep_session';

export interface GlobalConfig {
  /** 主界面背景音乐音量，0-100 */
  main_bgm_volume: number;
  /** 预览音频（资源包试听）与音效音量，0-100 */
  preview_volume: number;
  /**
   * 立绘渲染器模式：
   *   - aggressive：仅 WebGL
   *   - stable：优先 WebGL，失败回退 canvas 2d
   *   - conservative：仅 canvas 2d
   */
  spine_renderer: SpineRendererMode;
  /** 会话保持：刷新后停留在原页面，不强制回到引导页 */
  keep_session: boolean;
}

export const CONFIG_DEFAULTS: GlobalConfig = {
  main_bgm_volume: 50,
  preview_volume: 60,
  spine_renderer: 'stable',
  keep_session: true,
};

const config = ref<GlobalConfig>({ ...CONFIG_DEFAULTS });

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
 * 全局配置（与后端 /api/config 同步并持久化至 global_config.yml）。
 *
 * **单例**：状态在模块作用域，多个调用方共享同一份 `config`，因此组件里
 * 通过 `useGlobalConfig()` 拿到的都是同一引用。`config` 只读暴露，改动一律走 setter。
 */
export function useGlobalConfig() {
  async function fetchConfig(): Promise<GlobalConfig> {
    try {
      const data = await fetchGlobalConfig();
      config.value = {
        main_bgm_volume: clampVolume(data.config.main_bgm_volume, CONFIG_DEFAULTS.main_bgm_volume),
        preview_volume: clampVolume(data.config.preview_volume, CONFIG_DEFAULTS.preview_volume),
        spine_renderer: normalizeSpineRendererMode(data.config.spine_renderer),
        keep_session:
          typeof data.config.keep_session === 'boolean'
            ? data.config.keep_session
            : CONFIG_DEFAULTS.keep_session,
      };
      setKeepSession(config.value.keep_session);
      isLoaded.value = true;
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
        await saveGlobalConfig({ ...config.value });
      } catch (error) {
        console.warn('[Our Archive] 保存配置失败', error);
      }    }, 300);
  }

  function setMainBgmVolume(volume: number) {
    config.value.main_bgm_volume = clampVolume(volume, CONFIG_DEFAULTS.main_bgm_volume);
    persist();
  }

  function setPreviewVolume(volume: number) {
    config.value.preview_volume = clampVolume(volume, CONFIG_DEFAULTS.preview_volume);
    persist();
  }

  function setSpineRenderer(mode: SpineRendererMode) {
    config.value.spine_renderer = normalizeSpineRendererMode(mode);
    persist();
  }

  function setKeepSessionEnabled(enabled: boolean) {
    config.value.keep_session = Boolean(enabled);
    // 立即同步本地镜像：路由守卫在配置请求返回前就要用它
    setKeepSession(config.value.keep_session);
    persist();
  }

  return {
    config: readonlyRef(config),
    isLoaded: readonlyRef(isLoaded),
    fetchConfig,
    setMainBgmVolume,
    setPreviewVolume,
    setSpineRenderer,
    setKeepSessionEnabled,
  };
}

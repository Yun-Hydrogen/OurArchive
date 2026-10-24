/**
 * Splash 时间轴常量（单位：毫秒）。
 * Banner 动画本身时长约 2.5s，音效时长 2.85s。
 */
export const SPLASH_TIMING = {
  /** Banner 动画总时长 */
  bannerDuration: 2500,
  /** 动画结束后延迟多久显示 TOUCH TO START */
  promptRevealDelay: 350,
  /** TOUCH TO START 淡入时长 */
  promptFadeIn: 700,
  /** 背景音乐（main_bgm）首次播放淡入时长 */
  bgmFadeInDuration: 2000,
} as const;

/** 音效音量（0-1） */
export const SPLASH_SOUND_VOLUME = 0.75;

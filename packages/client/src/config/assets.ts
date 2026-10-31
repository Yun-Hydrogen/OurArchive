import titleSoundUrl from '@resources/OurArchive/sound.wav?url';
import homeBannerTightUrl from '@resources/OurArchive/OurArchiveBanner-tp-tight-svg.svg?url';

/**
 * Splash 使用的美术与音频资源。
 * 逐条从 `resources/OurArchive/` 引入，由 Vite 打包为产物 URL。
 * 横幅为内联 SVG 组件，不在此处引用。
 */
export const SPLASH_ASSETS = {
  /** Splash 音效（48kHz / 立体声 / 2.85s） */
  titleSoundUrl,
} as const;

/**
 * 主界面使用的美术资源。
 */
export const HOME_ASSETS = {
  /** 静态品牌横幅；viewBox 已由原始 2880x2880 画布收紧到图形区域，可直接缩放 */
  bannerTightUrl: homeBannerTightUrl,
} as const;

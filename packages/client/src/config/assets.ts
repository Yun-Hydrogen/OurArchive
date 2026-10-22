import titleSoundUrl from '@resources/OurArchive/sound.wav?url';

/**
 * Splash 使用的美术与音频资源。
 * 逐条从 `resources/OurArchive/` 引入，由 Vite 打包为产物 URL。
 * 横幅为内联 SVG 组件，不在此处引用。
 */
export const SPLASH_ASSETS = {
  /** Splash 音效（48kHz / 立体声 / 2.85s） */
  titleSoundUrl,
} as const;

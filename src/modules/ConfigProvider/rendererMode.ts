/**
 * 立绘渲染器模式（配置项 `spine_renderer`）。
 *
 * 客户端与服务端**共用这一份取值列表**：设置项要展示选项、服务端要校验入参，
 * 过去两边各写一份，改一边忘一边就会出现「能选但保存时报非法」。
 *
 * 这个文件不 import 任何渲染器实现，首屏不会因此拖进 WebGL / Canvas 两套后端。
 */

/** 渲染器模式的全部取值（顺序即设置项的展示顺序） */
export const SPINE_RENDERER_MODES = ['aggressive', 'stable', 'conservative'] as const;

/** 渲染器模式，对应设置项 `spine_renderer` */
export type SpineRendererMode = (typeof SPINE_RENDERER_MODES)[number];

export interface SpineRendererModeOption {
  value: SpineRendererMode;
  label: string;
  hint: string;
}

export const SPINE_RENDERER_OPTIONS: SpineRendererModeOption[] = [
  {
    value: 'aggressive',
    label: '激进 · 仅 WebGL',
    hint: '只用 WebGL；环境不支持时直接报错，便于暴露问题',
  },
  {
    value: 'stable',
    label: '稳定 · 优先 WebGL，失败回退',
    hint: '优先使用 WebGL，初始化失败时回退到 Canvas 2D',
  },
  {
    value: 'conservative',
    label: '保守 · 仅 Canvas 2D',
    hint: '只用 Canvas 2D；兼容性最好，但高密度立绘会掉帧',
  },
];

/** 缺省值，服务端写默认配置与入参兜底都用它 */
export const DEFAULT_SPINE_RENDERER: SpineRendererMode = 'stable';

/** 服务端校验：只接受三个已知取值 */
export function isSpineRendererMode(value: unknown): value is SpineRendererMode {
  return SPINE_RENDERER_MODES.includes(value as SpineRendererMode);
}

/** 客户端容错：非法值一律退回 `stable` */
export function normalizeSpineRendererMode(value: unknown): SpineRendererMode {
  return isSpineRendererMode(value) ? value : DEFAULT_SPINE_RENDERER;
}
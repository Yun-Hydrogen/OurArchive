/**
 * 立绘渲染器模式。
 *
 * 单独成一个模块，是为了让设置项 / 全局配置只依赖「一个字符串字面量类型」，
 * 而不把 WebGL 与 canvas 两套渲染器拖进首屏 chunk。
 */

/** 渲染器模式，对应设置项 `spine_renderer` */
export type SpineRendererMode = 'aggressive' | 'stable' | 'conservative';

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

export function normalizeSpineRendererMode(value: unknown): SpineRendererMode {
  return value === 'aggressive' || value === 'conservative' ? value : 'stable';
}

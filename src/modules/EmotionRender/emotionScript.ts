import type * as PIXI from 'pixi.js'
import type gsap from 'gsap'

/** 表情脚本 API 版本，破坏性改动时递增 */
export const EMOTION_SCRIPT_API_VERSION = 1

/** 表情脚本可用的逐帧回调（delta 单位为秒） */
export interface EmotionTicker {
  add(callback: (deltaSeconds: number) => void): void
  remove(callback: (deltaSeconds: number) => void): void
}

/** 表情脚本可用的音频控制 */
export interface EmotionAudioHandle {
  element: HTMLAudioElement | null
  play(): void
  stop(): void
}

/**
 * 传给表情脚本的上下文。
 * `container` 已挂在角色头部锚点，坐标原点即锚点，内部使用 540×1012 设计像素；
 * `designUnit` 表示 1 设计像素对应的舞台全局像素，通常不需要手动换算。
 */
export interface EmotionScriptContext {
  apiVersion: number
  id: string
  container: PIXI.Container
  character: PIXI.Container
  /** 键为图片文件名（如 `heart.png`）与完整 URL */
  textures: Record<string, PIXI.Texture>
  images: string[]
  designUnit: number
  duration: number
  loop: boolean
  signal: AbortSignal
  PIXI: typeof PIXI
  gsap: typeof gsap
  /** 素材/脚本按 540×1012 设计框定位：nx/ny 为相对角色包围盒的 0–1 比例 */
  framePoint(nx: number, ny: number): { x: number; y: number }
  ticker: EmotionTicker
  audio: EmotionAudioHandle
  onCleanup(cleanup: () => void): void
}

/** 表情脚本导出的工厂函数，可返回清理函数 */
export type EmotionScriptFactory = (
  context: EmotionScriptContext
) =>
  | void
  | (() => void)
  | Promise<void | (() => void)>

/**
 * 动态加载资源包内的表情脚本。
 * URL 来自本机 API（`/api/packages/:id/...`），仅允许同源脚本。
 */
export async function loadEmotionScript(
  url: string,
  exportName: string
): Promise<EmotionScriptFactory> {
  const module = (await import(/* @vite-ignore */ url)) as Record<string, unknown>
  const fallback = module.default as Record<string, unknown> | undefined
  const candidate =
    module[exportName] ?? fallback?.[exportName] ?? fallback ?? module.default

  if (typeof candidate !== 'function') {
    throw new Error(`表情脚本未导出可调用的 "${exportName}"`)
  }

  return candidate as EmotionScriptFactory
}

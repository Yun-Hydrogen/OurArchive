import { onBeforeUnmount, ref } from 'vue'
import * as PIXI from 'pixi.js'
import gsap from 'gsap'
import type { PackageEmotion } from '../API/types'
import { useGlobalConfig } from '../ConfigProvider/useGlobalConfig'
import { useBackgroundMusic } from '../AudioPlayer/useBackgroundMusic'
import {
  EMOTION_SCRIPT_API_VERSION,
  loadEmotionScript,
  type EmotionAudioHandle,
  type EmotionScriptContext,
  type EmotionTicker,
} from './emotionScript'

/** 表情播放所需的舞台能力，`useSkeletonStage` 的返回值直接满足 */
export interface EmotionStageAccess {
  /** 角色根容器（Spine / DragonBones） */
  getMountRoot(): PIXI.Container | null
  /** 头顶锚点的角色本地坐标 */
  getHeadAnchor(): { x: number; y: number } | null
  /** 覆盖层：始终位于角色之上 */
  getOverlayRoot(): PIXI.Container | null
  /** 头顶锚点的舞台全局坐标 */
  getHeadGlobalAnchor(): { x: number; y: number } | null
  /** 1 设计像素对应的舞台全局像素 */
  getDesignScale(): number | null
  /** 角色包围盒（角色根容器本地坐标） */
  getCharacterFrame(): PIXI.Rectangle | null
  invalidate?(): void
}

interface ActiveSession {
  id: string
  anchorHost: PIXI.Container
  container: PIXI.Container
  audio: HTMLAudioElement | null
  abort: AbortController
  cleanups: Set<() => void>
  frameCallbacks: Set<(deltaSeconds: number) => void>
  raf: number
  finished: boolean
}

function fileNameOf(url: string): string {
  const clean = url.split('?')[0] ?? url
  const segment = clean.split('/').pop() ?? clean
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      resolve()
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * 在骨架舞台上播放资源包表情。
 * 有脚本时执行包内脚本，没有脚本时退化为「贴图依次浮现再上飘」的默认动画。
 */
export function useEmotionPlayer(stage: EmotionStageAccess) {
  const { config } = useGlobalConfig()
  const bgm = useBackgroundMusic()

  const playing = ref('')
  const error = ref('')

  const textureCache = new Map<string, PIXI.Texture>()
  let active: ActiveSession | null = null
  let loadToken = 0

  async function loadTextures(
    images: string[]
  ): Promise<Record<string, PIXI.Texture>> {
    const textures: Record<string, PIXI.Texture> = {}

    await Promise.all(
      images.map(async (url) => {
        let texture = textureCache.get(url)
        if (!texture) {
          texture = await PIXI.Texture.fromURL(url)
          textureCache.set(url, texture)
        }
        textures[url] = texture
        textures[fileNameOf(url)] = texture
      })
    )

    return textures
  }

  function startLoop(session: ActiveSession) {
    let last = performance.now()

    const tick = (now: number) => {
      if (session.finished) {
        return
      }

      const delta = Math.min(Math.max((now - last) / 1000, 0), 0.05)
      last = now

      const anchor = stage.getHeadGlobalAnchor()
      if (anchor) {
        session.anchorHost.position.set(anchor.x, anchor.y)
      }
      const scale = stage.getDesignScale()
      if (scale) {
        session.anchorHost.scale.set(scale)
      }

      for (const callback of Array.from(session.frameCallbacks)) {
        try {
          callback(delta)
        } catch (err) {
          error.value = `表情脚本运行时出错：${errorText(err)}`
          stop()
          return
        }
      }

      stage.invalidate?.()
      session.raf = requestAnimationFrame(tick)
    }

    session.raf = requestAnimationFrame(tick)
  }

  function stop() {
    loadToken += 1

    const session = active
    active = null
    playing.value = ''

    if (!session) {
      return
    }

    session.finished = true
    session.abort.abort()

    if (session.raf) {
      cancelAnimationFrame(session.raf)
      session.raf = 0
    }

    for (const cleanup of Array.from(session.cleanups)) {
      try {
        cleanup()
      } catch {
        // 单个清理函数异常不应影响其他清理
      }
    }
    session.cleanups.clear()
    session.frameCallbacks.clear()

    if (session.audio) {
      session.audio.pause()
      session.audio.removeAttribute('src')
      session.audio.load()
      bgm.resume()
    }

    if (session.container.parent) {
      session.container.parent.removeChild(session.container)
    }
    session.container.destroy({ children: true })

    if (session.anchorHost.parent) {
      session.anchorHost.parent.removeChild(session.anchorHost)
    }
    session.anchorHost.destroy({ children: false })

    stage.invalidate?.()
  }

  async function play(emotion: PackageEmotion): Promise<boolean> {
    stop()
    error.value = ''

    if (!emotion.exists) {
      error.value = '表情贴图缺失，无法播放'
      return false
    }

    if (!emotion.hasScript) {
      error.value = '该表情没有脚本，无法播放'
      return false
    }

    const character = stage.getMountRoot()
    const overlay = stage.getOverlayRoot()
    const anchor = stage.getHeadGlobalAnchor()
    const scale = stage.getDesignScale()
    const frame = stage.getCharacterFrame()
    const head = stage.getHeadAnchor()
    if (!character || !overlay || !anchor || !scale || !frame || !head) {
      error.value = '舞台尚未就绪，暂时无法播放表情'
      return false
    }

    const frameUnit = Math.max(frame.width / 540, 0.0001)
    const framePoint = (nx: number, ny: number) => ({
      x: (frame.x + nx * frame.width - head.x) / frameUnit,
      y: (frame.y + ny * frame.height - head.y) / frameUnit,
    })

    const token = ++loadToken
    let textures: Record<string, PIXI.Texture> = {}

    if (emotion.images.length > 0) {
      try {
        textures = await loadTextures(emotion.images)
      } catch (err) {
        if (token === loadToken) {
          error.value = `贴图加载失败：${errorText(err)}`
        }
        return false
      }
    }

    if (token !== loadToken) {
      return false
    }

    const anchorHost = new PIXI.Container()
    anchorHost.position.set(anchor.x, anchor.y)
    anchorHost.scale.set(scale)

    const container = new PIXI.Container()
    anchorHost.addChild(container)
    overlay.addChild(anchorHost)

    const audio =
      emotion.soundExists && emotion.soundUrl
        ? new Audio(emotion.soundUrl)
        : null
    if (audio) {
      audio.preload = 'auto'
      audio.volume = Math.min(Math.max(config.value.preview_volume / 100, 0), 1)
    }

    const session: ActiveSession = {
      id: emotion.id,
      anchorHost,
      container,
      audio,
      abort: new AbortController(),
      cleanups: new Set(),
      frameCallbacks: new Set(),
      raf: 0,
      finished: false,
    }
    active = session
    playing.value = emotion.id

    const audioHandle: EmotionAudioHandle = {
      element: audio,
      play() {
        if (!audio) {
          return
        }
        bgm.suspend(200)
        const result = audio.play()
        if (result && typeof result.catch === 'function') {
          result.catch(() => {
            // 浏览器可能拦截自动播放，静默失败即可
          })
        }
      },
      stop() {
        if (!audio) {
          return
        }
        audio.pause()
        audio.currentTime = 0
        bgm.resume()
      },
    }

    const ticker: EmotionTicker = {
      add(callback) {
        session.frameCallbacks.add(callback)
      },
      remove(callback) {
        session.frameCallbacks.delete(callback)
      },
    }

    const context: EmotionScriptContext = {
      apiVersion: EMOTION_SCRIPT_API_VERSION,
      id: emotion.id,
      container,
      character,
      textures,
      images: [...emotion.images],
      designUnit: scale,
      duration: emotion.duration,
      loop: emotion.loop,
      signal: session.abort.signal,
      PIXI,
      gsap,
      ticker,
      audio: audioHandle,
      framePoint,
      onCleanup(cleanup) {
        if (typeof cleanup === 'function') {
          session.cleanups.add(cleanup)
        }
      },
    }

    startLoop(session)
    stage.invalidate?.()

    try {
      const factory = await loadEmotionScript(
        emotion.scriptUrl,
        emotion.exportName || emotion.id
      )
      if (session.finished) {
        return true
      }

      const result = factory(context)
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await result
        if (!session.finished && !emotion.loop) {
          stop()
        }
      } else {
        if (typeof result === 'function') {
          session.cleanups.add(result)
        }
        if (!emotion.loop && emotion.duration > 0) {
          await sleep(emotion.duration * 1000 + 150, session.abort.signal)
          if (!session.finished) {
            stop()
          }
        }
      }
    } catch (err) {
      if (!session.finished) {
        error.value = `表情播放失败：${errorText(err)}`
        stop()
      }
      return false
    }

    return true
  }

  onBeforeUnmount(() => {
    stop()
    for (const texture of textureCache.values()) {
      texture.destroy(true)
    }
    textureCache.clear()
  })

  return {
    playing,
    error,
    play,
    stop,
  }
}

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import * as PIXI from 'pixi.js';
import type { PackageEmotion } from '@/modules/API/types';
import type { SpineInstance } from '@/modules/SkeletonRuntimeProvider/spineTypes';
import { playEmotionSfx, stopEmotionSfx } from '@/modules/AudioPlayer/useEmotionSfx';
import { playEmotionOnTarget } from '@/modules/EmotionRender/emotionPlayer';
import { playMotion, type MotionInstance } from '@/modules/EmotionRender/motionCompiler';
import { DEFAULT_MOTIONS } from '@/modules/EmotionRender/defaultMotions';
import type { EmotionMotionConfig } from '@/modules/EmotionRender/motionTypes';

const props = defineProps<{
  spineInstance?: SpineInstance | null;
  pixiApp?: PIXI.Application | null;
  unit?: number;
  anchorX?: number;
  anchorY?: number;
}>();

const playingName = ref('');
const lastError = ref('');

let activeMountHost: PIXI.Container | null = null;
let activeMotion: MotionInstance | null = null;
let playToken = 0;

function stop() {
  playToken += 1;
  playingName.value = '';
  lastError.value = '';
  stopEmotionSfx();

  if (activeMotion) {
    try {
      activeMotion.stop();
    } catch {
      // ignore
    }
    activeMotion = null;
  }

  if (activeMountHost) {
    try {
      activeMountHost.destroy({ children: true });
    } catch {
      // ignore
    }
    activeMountHost = null;
  }
}

async function play(emotion: PackageEmotion, customMotionConfig?: EmotionMotionConfig) {
  if (!emotion) return;

  stop();
  playToken += 1;
  const token = playToken;
  playingName.value = emotion.id;

  if (emotion.soundExists && emotion.soundUrl) {
    playEmotionSfx(emotion.soundUrl);
  }

  try {
    let mountParent: PIXI.Container;
    let localAnchorX = props.anchorX || 0;
    let localAnchorY = props.anchorY || 0;
    let scaleFactor = props.unit || 1;

    if (props.spineInstance) {
      mountParent = props.spineInstance;
      const globalPt = new PIXI.Point(props.anchorX || 0, props.anchorY || 0);
      const localPt = props.spineInstance.toLocal(globalPt);
      localAnchorX = localPt.x;
      localAnchorY = localPt.y;
      const spineScale = props.spineInstance.scale.x || 1;
      scaleFactor = (props.unit || 1) / spineScale;
    } else if (props.pixiApp) {
      mountParent = props.pixiApp.stage;
    } else {
      throw new Error('未检测到可挂载的立绘舞台');
    }

    const host = new PIXI.Container();
    host.position.set(localAnchorX, localAnchorY);
    host.zIndex = 30;
    mountParent.addChild(host);
    activeMountHost = host;

    // 获取动效配置：优先传入的自定义配置 -> 其次从 motionUrl 拉取 -> 再次读取内置默认配置
    let motionConfig: EmotionMotionConfig | null = customMotionConfig ?? null;
    if (!motionConfig && emotion.motionUrl) {
      try {
        const resp = await fetch(emotion.motionUrl);
        if (resp.ok) {
          motionConfig = (await resp.json()) as EmotionMotionConfig;
        }
      } catch {
        // 请求失败回退内置预设
      }
    }
    if (!motionConfig) {
      motionConfig = DEFAULT_MOTIONS[emotion.id.toLowerCase()] ?? null;
    }

    // 预载贴图
    const textureMap = new Map<string, PIXI.Texture>();
    const texturesList: PIXI.Texture[] = [];
    for (const url of emotion.imageUrls) {
      const tex = await PIXI.Texture.fromURL(url);
      texturesList.push(tex);
      const filename = url.replace(/^[/\\]+/, '').split('/').pop() ?? '';
      textureMap.set(url, tex);
      textureMap.set(filename, tex);
      textureMap.set(`images/${filename}`, tex);
    }

    if (token !== playToken) return;

    if (motionConfig) {
      // 走 JSON 动效编译器
      const motion = playMotion({
        target: host,
        config: motionConfig,
        textures: (texPath: string) => {
          const clean = texPath.replace(/^[/\\]+/, '');
          const filename = clean.split('/').pop() ?? '';
          return (
            textureMap.get(clean) ??
            textureMap.get(filename) ??
            textureMap.get(`images/${filename}`) ??
            texturesList[0]
          );
        },
        scale: scaleFactor,
        loop: emotion.loop,
      });
      activeMotion = motion;
      await motion.promise;
    } else {
      // 回退原版硬编码逻辑
      await playEmotionOnTarget(host, emotion.id, texturesList);
    }

    if (token === playToken && activeMountHost) {
      activeMountHost.destroy({ children: true });
      activeMountHost = null;
    }
  } catch (err) {
    if (token === playToken) {
      lastError.value = err instanceof Error ? err.message : String(err);
    }
  } finally {
    if (token === playToken) {
      playingName.value = '';
      activeMotion = null;
    }
  }
}

onBeforeUnmount(() => {
  stop();
});

defineExpose({
  play,
  stop,
  playingName,
  lastError,
});
</script>

<template>
  <div class="oa-emotion-player" aria-hidden="true" style="display: none;" />
</template>

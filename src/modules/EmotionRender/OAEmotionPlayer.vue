<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import * as PIXI from 'pixi.js';
import type { PackageEmotion } from '@/modules/API/types';
import type { SpineInstance } from '@/modules/SkeletonRuntimeProvider/spineTypes';
import { playEmotionSfx, stopEmotionSfx } from '@/modules/AudioPlayer/useEmotionSfx';
import { playEmotionOnTarget } from '@/modules/EmotionRender/emotionPlayer';

const props = defineProps<{
  spineInstance?: SpineInstance | null;
  pixiApp?: PIXI.Application | null;
  unit?: number;
  anchorX?: number;
  anchorY?: number;
}>();

const playingName = ref('');
const lastError = ref('');

let activeTarget: PIXI.Container | null = null;
let playToken = 0;

function stop() {
  playToken += 1;
  playingName.value = '';
  lastError.value = '';
  stopEmotionSfx();
  if (activeTarget) {
    try {
      activeTarget.destroy({ children: true });
    } catch {
      // ignore
    }
    activeTarget = null;
  }
}

async function play(emotion: PackageEmotion) {
  if (!emotion) return;

  stop();
  playToken += 1;
  const token = playToken;
  playingName.value = emotion.id;

  if (emotion.soundExists && emotion.soundUrl) {
    playEmotionSfx(emotion.soundUrl);
  }

  try {
    let targetContainer: PIXI.Container | null = props.spineInstance ?? null;
    let isTempTarget = false;

    if (!targetContainer && props.pixiApp) {
      // 如果没有挂在 Spine 上，挂在舞台临时容器中
      const temp = new PIXI.Container();
      temp.position.set(props.anchorX || 0, props.anchorY || 0);
      props.pixiApp.stage.addChild(temp);
      targetContainer = temp;
      activeTarget = temp;
      isTempTarget = true;
    }

    if (!targetContainer) {
      throw new Error('未检测到可挂载的立绘舞台');
    }

    // 预载 PNG 纹理
    const textures: PIXI.Texture[] = [];
    for (const url of emotion.imageUrls) {
      const tex = await PIXI.Texture.fromURL(url);
      textures.push(tex);
    }

    if (token !== playToken) return;

    await playEmotionOnTarget(targetContainer, emotion.id, textures);

    if (isTempTarget && activeTarget) {
      activeTarget.destroy({ children: true });
      activeTarget = null;
    }
  } catch (err) {
    if (token === playToken) {
      lastError.value = err instanceof Error ? err.message : String(err);
    }
  } finally {
    if (token === playToken) {
      playingName.value = '';
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
});
</script>

<template>
  <div v-if="lastError" class="oa-emo-error-pill">
    {{ lastError }}
  </div>
</template>

<style scoped>
.oa-emo-error-pill {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 9999px;
  pointer-events: none;
  z-index: 50;
}
</style>

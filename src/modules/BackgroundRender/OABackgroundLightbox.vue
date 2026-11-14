<script setup lang="ts">
/**
 * 背景大图预览（渲染器）：一张图 + 文件名 / 体积 / 新标签打开。
 *
 * `v-model:show` 与 `image` 分离：关闭时保留最后一张图，避免遮罩淡出时图先消失。
 */
import { computed } from 'vue';
import { rizui_dialog } from 'riz-ui';
import type { PackageBackground } from '@/modules/API/types';
import { formatBytes } from '@/utils/format';

const props = defineProps<{
  show: boolean;
  image: PackageBackground | null;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const model = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
});
</script>

<template>
  <rizui_dialog
    v-model:show="model"
    :title="image?.name || '背景预览'"
    width="min(1080px, 92vw)"
    mask-close
  >
    <div class="oa-bg-lightbox">
      <img
        v-if="image"
        :src="image.url"
        :alt="image.name"
        class="oa-bg-lightbox__image"
      />
      <p class="oa-bg-lightbox__meta">
        <span>{{ image?.name }}</span>
        <span v-if="image">{{ formatBytes(image.size) }}</span>
        <a v-if="image" :href="image.url" target="_blank" rel="noopener noreferrer">
          新标签打开
        </a>
      </p>
    </div>
  </rizui_dialog>
</template>

<style scoped>
.oa-bg-lightbox {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oa-bg-lightbox__image {
  width: 100%;
  max-height: min(70vh, 720px);
  object-fit: contain;
  border-radius: 8px;
  background: rgba(234, 246, 255, 0.6);
}

.oa-bg-lightbox__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  font-size: 11.5px;
  color: #7c99b0;
}

.oa-bg-lightbox__meta a {
  color: #0b7ad6;
  text-decoration: none;
}

.oa-bg-lightbox__meta a:hover {
  text-decoration: underline;
}
</style>

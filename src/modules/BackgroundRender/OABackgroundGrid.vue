<script setup lang="ts">
/**
 * 背景缩略图网格（渲染器）。
 *
 * 只负责「把一批背景图铺成网格并回报点击」，分组、标题、空态由调用方决定。
 * 剧情播放器将来要展示背景、或要「选一张背景」时都可以直接复用。
 */
import { formatBytes } from '@/utils/format';
import type { PackageBackground } from '@/modules/API/types';

defineProps<{
  images: PackageBackground[];
}>();

const emit = defineEmits<{
  (e: 'select', image: PackageBackground): void;
}>();
</script>

<template>
  <div class="oa-bg-grid">
    <button
      v-for="image in images"
      :key="image.path"
      type="button"
      class="oa-bg-grid__item"
      :title="`${image.name} · ${formatBytes(image.size)}`"
      @click="emit('select', image)"
    >
      <span class="oa-bg-grid__thumb">
        <img :src="image.url" :alt="image.name" loading="lazy" decoding="async" />
      </span>
      <span class="oa-bg-grid__name">{{ image.name }}</span>
    </button>
  </div>
</template>

<style scoped>
/* 缩略图按可用宽度自动铺满，图片再多也只是懒加载 */
.oa-bg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.oa-bg-grid__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 10px;
  background: #ffffff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.oa-bg-grid__item:hover {
  border-color: rgba(0, 144, 254, 0.42);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.12);
  transform: translateY(-1px);
}

.oa-bg-grid__item:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
}

.oa-bg-grid__thumb {
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(180deg, #eaf6ff 0%, #d6ecfc 100%);
}

.oa-bg-grid__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.oa-bg-grid__name {
  padding: 0 8px 6px;
  overflow: hidden;
  font-size: 10.5px;
  line-height: 1.5;
  color: #6f8ba4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

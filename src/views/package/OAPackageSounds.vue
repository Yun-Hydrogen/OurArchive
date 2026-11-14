<script setup lang="ts">
/**
 * 资源包详情 → 音效分类：按 `categories.json` 的中文类别分组，可试听。
 *
 * 类别筛选由侧边栏子条目驱动（父组件持有 `activeCategory`），本组件只做筛选与分组。
 */
import { computed } from 'vue';
import { rizui_infobox, rizui_progress, rizui_timeline } from 'riz-ui';
import type { PackageSound, PackageSoundCategory } from '@/modules/API/types';
import { formatDurationDecimal, formatDurationLong } from '@/utils/format';
import { usePackagePreviewAudio } from './usePackagePreviewAudio';

const props = defineProps<{
  sounds: PackageSound[];
  categories: PackageSoundCategory[];
  loading: boolean;
  error: string;
  /** 页头搜索词（父组件持有，按分类分离） */
  keyword: string;
  /** 侧边栏选中的类别标签；空串表示全部 */
  activeCategory: string;
}>();

const {
  audioEl,
  isPlaying,
  current,
  duration,
  serverDuration,
  isPlayingTrack,
  toggle,
  handleEnded,
  seek,
} = usePackagePreviewAudio();

/** 当前选中标签对应的原始类别键集合；`null` 表示不按类别过滤 */
const activeKeys = computed(() => {
  if (!props.activeCategory) {
    return null;
  }
  const keys = props.categories
    .filter((category) => category.label === props.activeCategory)
    .map((category) => category.id);
  return keys.length ? new Set(keys) : null;
});

const filtered = computed(() => {
  const word = props.keyword.trim().toLowerCase();
  const keys = activeKeys.value;

  return props.sounds.filter((item) => {
    if (keys && !keys.has(item.category)) {
      return false;
    }
    if (!word) {
      return true;
    }
    return [item.id_name, item.description, item.original_filename].some((field) =>
      field.toLowerCase().includes(word)
    );
  });
});

/** 按类别分组，组内保持索引顺序，组间按类别映射的 label 排序（与后端 categories 一致） */
const groups = computed(() => {
  const order = new Map(props.categories.map((item) => [item.id, item.label]));
  const map = new Map<string, PackageSound[]>();

  for (const item of filtered.value) {
    const key = item.category || 'Other';
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return [...map.entries()]
    .map(([category, list]) => ({
      category,
      label: order.get(category) ?? category,
      list,
    }))
    .sort(
      (a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN') || a.category.localeCompare(b.category)
    );
});

/** 当前类别的展示名（`''` 即「全部」） */
const activeLabel = computed(() => props.activeCategory || '全部类别');

/** 当前筛选结果的合计时长（秒），用于摘要行；只累加可读时长的条目 */
const filteredDuration = computed(() =>
  filtered.value.reduce((sum, item) => sum + (item.duration > 0 ? item.duration : 0), 0)
);
</script>

<template>
  <div class="oa-pkg__toolbar">
    <p class="oa-pkg__summary">
      <template v-if="loading && !sounds.length">正在读取音效索引…</template>
      <template v-else>
        <strong>{{ filtered.length }}</strong> 个音效
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        {{ activeLabel }}
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        总时长 {{ formatDurationLong(filteredDuration) }}
      </template>
    </p>
  </div>

  <Transition name="oa-swap" mode="out-in">
    <div v-if="loading && !sounds.length" key="loading" class="oa-pkg__state oa-pkg__state--inline">
      <p class="oa-pkg__state-text">正在读取音效索引…</p>
      <rizui_progress :indeterminate="true" :height="6" rounded />
    </div>

    <div v-else-if="error" key="error" class="oa-pkg__notice">
      <rizui_infobox type="error" :text="`读取音效失败：${error}`" />
    </div>

    <div v-else-if="filtered.length" key="list" class="oa-pkg__music-list">
      <div v-for="group in groups" :key="group.category" class="oa-pkg__sound-group">
        <p v-if="!activeCategory || groups.length > 1" class="oa-pkg__sound-group__title">
          {{ group.label }}
          <span class="oa-pkg__sound-group__count">{{ group.list.length }}</span>
        </p>
        <article
          v-for="item in group.list"
          :key="item.id_name"
          class="oa-pkg__music"
          :class="{ 'is-active': isPlayingTrack(item.id_name) }"
        >
          <button
            type="button"
            class="oa-pkg__music__play"
            :disabled="!item.exists"
            :title="item.exists ? '播放 / 暂停' : '音频文件缺失'"
            @click="toggle({ id: item.id_name, url: item.url, duration: item.duration })"
          >
            <svg v-if="isPlayingTrack(item.id_name) && isPlaying" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="4.4" y="3.2" width="2.6" height="9.6" rx="1" fill="currentColor" />
              <rect x="9" y="3.2" width="2.6" height="9.6" rx="1" fill="currentColor" />
            </svg>
            <svg v-else viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.2 3.4 12.4 8l-7.2 4.6Z" fill="currentColor" />
            </svg>
          </button>

          <div class="oa-pkg__music__body">
            <div class="oa-pkg__music__head">
              <span class="oa-pkg__music__title">{{ item.id_name }}</span>
              <span v-if="!item.exists" class="oa-pkg__music__miss">文件缺失</span>
              <span v-if="item.description" class="oa-pkg__music__artist">{{ item.description }}</span>
            </div>

            <div class="oa-pkg__music__meta">
              <code class="oa-pkg__music__id">{{ item.id_name }}</code>
              <span class="oa-pkg__music__file">{{ item.original_filename }}</span>
              <span
                v-if="item.duration > 0"
                class="oa-pkg__music__time"
                :title="`音频时长 ${formatDurationDecimal(item.duration)}`"
              >
                {{ formatDurationDecimal(item.duration) }}
              </span>
              <span v-else class="oa-pkg__music__unknown">时长未知</span>
            </div>

            <div v-if="isPlayingTrack(item.id_name)" class="oa-pkg__music__progress">
              <rizui_timeline
                class="oa-pkg__music__timeline"
                :model-value="current"
                :min="0"
                :max="duration || serverDuration || (item.duration > 0 ? item.duration : 1)"
                :step="0.1"
                @update:model-value="seek"
              />
              <span class="oa-pkg__music__time">
                {{ formatDurationDecimal(duration || serverDuration || (item.duration > 0 ? item.duration : 0)) }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-else key="empty" class="oa-pkg__empty">
      <p>{{ keyword ? '没有匹配的音效。' : '索引里没有音效。' }}</p>
    </div>
  </Transition>

  <audio
    ref="audioEl"
    class="oa-pkg__music__audio"
    preload="metadata"
    @play="isPlaying = true"
    @pause="isPlaying = false"
    @ended="handleEnded"
    @timeupdate="current = audioEl?.currentTime ?? 0"
    @loadedmetadata="duration = audioEl?.duration ?? 0"
  />
</template>

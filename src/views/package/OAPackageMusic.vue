<script setup lang="ts">
/**
 * 资源包详情 → 背景音乐分类：曲目列表 + 试听 + 描述折叠/弹窗。
 */
import { computed, ref } from 'vue';
import { rizui_dialog, rizui_infobox, rizui_progress, rizui_timeline } from 'riz-ui';
import type { PackageMusic } from '@/modules/API/types';
import { formatDurationDecimal } from '@/utils/format';
import { usePackagePreviewAudio } from './usePackagePreviewAudio';

const props = defineProps<{
  music: PackageMusic[];
  loading: boolean;
  error: string;
  /** 页头搜索词（父组件持有，按分类分离） */
  keyword: string;
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

const filtered = computed(() => {
  const word = props.keyword.trim().toLowerCase();
  if (!word) {
    return props.music;
  }
  return props.music.filter((item) =>
    [item.title, item.artist, item.name_id, item.filename].some((field) =>
      field.toLowerCase().includes(word)
    )
  );
});

/* ---------------------- 曲目描述（折叠 + 详情弹窗） ---------------------- */

/** 详情弹窗当前展示的曲目；null 表示关闭 */
const descItem = ref<PackageMusic | null>(null);

const isDescOpen = computed({
  get: () => descItem.value !== null,
  set: (open: boolean) => {
    if (!open) {
      descItem.value = null;
    }
  },
});

/** 两行装不下的描述才给「查看详细」按钮 */
function hasMoreDescription(item: PackageMusic): boolean {
  return item.description.length > 42 || item.description.includes('\n');
}
</script>

<template>
  <div class="oa-pkg__toolbar">
    <p class="oa-pkg__summary">
      <template v-if="loading && !music.length">正在读取曲目索引…</template>
      <template v-else>
        <strong>{{ music.length }}</strong> 首曲目
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        {{ filtered.length }} 个匹配
      </template>
    </p>
  </div>

  <Transition name="oa-swap" mode="out-in">
    <div v-if="loading && !music.length" key="loading" class="oa-pkg__state oa-pkg__state--inline">
      <p class="oa-pkg__state-text">正在读取背景音乐索引…</p>
      <rizui_progress :indeterminate="true" :height="6" rounded />
    </div>

    <div v-else-if="error" key="error" class="oa-pkg__notice">
      <rizui_infobox type="error" :text="`读取背景音乐失败：${error}`" />
    </div>

    <div v-else-if="filtered.length" key="list" class="oa-pkg__music-list">
      <article
        v-for="item in filtered"
        :key="item.name_id"
        class="oa-pkg__music"
        :class="{ 'is-active': isPlayingTrack(item.name_id) }"
      >
        <button
          type="button"
          class="oa-pkg__music__play"
          :disabled="!item.exists"
          :title="item.exists ? '播放 / 暂停' : '音频文件缺失'"
          @click="toggle({ id: item.name_id, url: item.url, duration: item.duration })"
        >
          <svg v-if="isPlayingTrack(item.name_id) && isPlaying" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="4.4" y="3.2" width="2.6" height="9.6" rx="1" fill="currentColor" />
            <rect x="9" y="3.2" width="2.6" height="9.6" rx="1" fill="currentColor" />
          </svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5.2 3.4 12.4 8l-7.2 4.6Z" fill="currentColor" />
          </svg>
        </button>

        <div class="oa-pkg__music__body">
          <div class="oa-pkg__music__head">
            <span class="oa-pkg__music__title">{{ item.title }}</span>
            <span v-if="item.artist" class="oa-pkg__music__artist">{{ item.artist }}</span>
            <span v-if="!item.exists" class="oa-pkg__music__miss">文件缺失</span>
          </div>

          <!-- 描述默认折叠两行，超出才给「查看详细」 -->
          <template v-if="item.description">
            <p class="oa-pkg__music__desc" :class="{ 'is-folded': hasMoreDescription(item) }">
              {{ item.description }}
            </p>
            <button
              v-if="hasMoreDescription(item)"
              type="button"
              class="oa-pkg__music__more"
              @click.stop="descItem = item"
            >
              查看详细
            </button>
          </template>

          <div class="oa-pkg__music__meta">
            <code class="oa-pkg__music__id">{{ item.name_id }}</code>
            <span class="oa-pkg__music__file">{{ item.filename }}</span>
            <span
              v-if="item.duration > 0"
              class="oa-pkg__music__time"
              :title="`音频时长 ${formatDurationDecimal(item.duration)}`"
            >
              {{ formatDurationDecimal(item.duration) }}
            </span>
            <span v-else class="oa-pkg__music__unknown">时长未知</span>
          </div>

          <div v-if="isPlayingTrack(item.name_id)" class="oa-pkg__music__progress">
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

    <div v-else key="empty" class="oa-pkg__empty">
      <p>{{ keyword ? '没有匹配的曲目。' : '索引里没有曲目。' }}</p>
    </div>
  </Transition>

  <!-- 曲目完整描述：rizui_dialog 自带 Teleport -->
  <rizui_dialog
    v-model:show="isDescOpen"
    :title="descItem?.title || '曲目描述'"
    width="min(620px, 88vw)"
    mask-close
  >
    <div class="oa-pkg__music-detail">
      <p class="oa-pkg__music-detail__meta">
        <span v-if="descItem?.artist">{{ descItem.artist }}</span>
        <code>{{ descItem?.name_id }}</code>
      </p>
      <p class="oa-pkg__music-detail__text">{{ descItem?.description }}</p>
    </div>
  </rizui_dialog>

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

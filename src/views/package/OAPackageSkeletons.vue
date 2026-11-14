<script setup lang="ts">
/**
 * 资源包详情 → 骨骼分类。
 *
 * 列式列出全部立绘目录，点开看文件清单，右侧可直接进预览。
 * 数据由父组件的 `usePackageContent` 提供，本组件只负责筛选与展开状态。
 */
import { computed, ref } from 'vue';
import { rizui_infobox, rizui_progress } from 'riz-ui';
import type { PackageSkeleton } from '@/modules/API/types';
import { formatBytes } from '@/utils/format';

const props = defineProps<{
  skeletons: PackageSkeleton[];
  loading: boolean;
  error: string;
  /** 页头搜索词（父组件持有，按分类分离） */
  keyword: string;
}>();

const emit = defineEmits<{
  (e: 'preview', id: string): void;
}>();

/** 已展开文件清单的立绘目录 */
const expanded = ref(new Set<string>());

const filtered = computed(() => {
  const word = props.keyword.trim().toLowerCase();
  if (!word) {
    return props.skeletons;
  }
  return props.skeletons.filter((item) => item.id.toLowerCase().includes(word));
});

const totalSize = computed(() =>
  props.skeletons.reduce((sum, item) => sum + item.totalSize, 0)
);

/** 首次加载时整段列表都还没内容，摘要行换成加载文案 */
const loadingFirst = computed(() => props.loading && props.skeletons.length === 0);

function isOpen(id: string): boolean {
  return expanded.value.has(id);
}

function toggle(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expanded.value = next;
}

/** 文件类型标签：骨骼 / 图集 / 贴图 / 其它 */
function fileKind(ext: string): string {
  if (ext === '.skel' || ext === '.json') {
    return '骨骼';
  }
  if (ext === '.atlas') {
    return '图集';
  }
  if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
    return '贴图';
  }
  return '其它';
}
</script>

<template>
  <div class="oa-pkg__toolbar">
    <p class="oa-pkg__summary">
      <template v-if="loadingFirst">正在读取立绘目录…</template>
      <template v-else>
        <strong>{{ skeletons.length }}</strong> 个立绘
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        {{ formatBytes(totalSize) }}
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        {{ filtered.length }} 个匹配
      </template>
    </p>
  </div>

  <Transition name="oa-swap" mode="out-in">
    <div v-if="loading" key="loading" class="oa-pkg__state oa-pkg__state--inline">
      <p class="oa-pkg__state-text">正在读取立绘目录（约 600 项）…</p>
      <rizui_progress :indeterminate="true" :height="6" rounded />
    </div>

    <div v-else-if="error" key="error" class="oa-pkg__notice">
      <rizui_infobox type="error" :text="`读取立绘目录失败：${error}`" />
    </div>

    <div v-else-if="filtered.length" key="list" class="oa-pkg__skel-list">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="oa-pkg__skel"
        :class="{ 'is-open': isOpen(item.id) }"
      >
        <div
          class="oa-pkg__skel__head"
          role="button"
          tabindex="0"
          @click="toggle(item.id)"
          @keydown.enter.prevent="toggle(item.id)"
          @keydown.space.prevent="toggle(item.id)"
        >
          <span class="oa-pkg__skel__arrow" aria-hidden="true" />

          <span class="oa-pkg__skel__names">
            <span class="oa-pkg__skel__id">{{ item.id }}</span>
            <span class="oa-pkg__skel__meta">
              {{ item.files.length }} 个文件 · {{ formatBytes(item.totalSize) }}
              <template v-if="!item.complete">
                · <span class="oa-pkg__skel__warn">缺少必需文件</span>
              </template>
            </span>
          </span>

          <button
            type="button"
            class="oa-pkg__skel__preview"
            :disabled="!item.complete"
            :title="item.complete ? '在骨骼预览里打开' : '缺少 .skel / .atlas / 贴图，无法预览'"
            @click.stop="emit('preview', item.id)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M1.6 8S3.9 3.6 8 3.6 14.4 8 14.4 8 12.1 12.4 8 12.4 1.6 8 1.6 8Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
              <circle cx="8" cy="8" r="1.9" fill="none" stroke="currentColor" stroke-width="1.4" />
            </svg>
            预览
          </button>
        </div>

        <div class="oa-pkg__skel__collapse" :class="{ 'is-open': isOpen(item.id) }">
          <div class="oa-pkg__skel__collapse-inner">
            <ul v-if="isOpen(item.id)" class="oa-pkg__file-list">
              <li v-for="file in item.files" :key="file.name" class="oa-pkg__file">
                <span class="oa-pkg__file__kind">{{ fileKind(file.ext) }}</span>
                <span class="oa-pkg__file__name">{{ file.name }}</span>
                <span class="oa-pkg__file__size">{{ formatBytes(file.size) }}</span>
                <a
                  class="oa-pkg__file__open"
                  :href="file.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                >
                  打开
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div v-else key="empty" class="oa-pkg__empty">
      <p>{{ keyword ? '没有匹配的立绘。' : '这个资源包没有立绘目录。' }}</p>
    </div>
  </Transition>
</template>

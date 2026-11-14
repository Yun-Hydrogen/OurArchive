<script setup lang="ts">
/**
 * 资源包详情 → 背景分类。
 *
 * 分类（`category.yml`）由侧边栏子条目驱动，本组件负责分组、标题与说明，
 * 网格与大图分别复用 `BackgroundRender` 的两个渲染器。
 */
import { computed, ref } from 'vue';
import { rizui_infobox, rizui_progress } from 'riz-ui';
import OABackgroundGrid from '@/modules/BackgroundRender/OABackgroundGrid.vue';
import OABackgroundLightbox from '@/modules/BackgroundRender/OABackgroundLightbox.vue';
import type { PackageBackground, PackageBackgroundCategory } from '@/modules/API/types';

const props = defineProps<{
  backgrounds: PackageBackgroundCategory[];
  loading: boolean;
  error: string;
  /** 页头搜索词（父组件持有，按分类分离） */
  keyword: string;
  /** 侧边栏选中的分类 id；`null` 表示全部，空串表示「未分类」 */
  activeCategory: string | null;
}>();

/** 当前分类的展示名与说明（`null` 时是「全部背景」） */
const categoryInfo = computed(() => {
  if (props.activeCategory === null) {
    return { label: '全部背景', description: '' };
  }
  const category = props.backgrounds.find((item) => item.id === props.activeCategory);
  return {
    label: category?.label ?? '未分类',
    description: category?.description ?? '',
  };
});

/** 是否显示分组标题：看全部时按分类分组，选中某一类就不用再标一次 */
const showGroupTitle = computed(() => props.activeCategory === null);

/**
 * 当前要展示的分组：
 * - 选「全部」→ 每个分类一组（空组已被后端过滤）
 * - 选了某一类 → 只有这一组，标题隐藏
 */
const groups = computed(() => {
  const word = props.keyword.trim().toLowerCase();
  const selected = props.activeCategory;

  return props.backgrounds
    .filter((category) => selected === null || category.id === selected)
    .map((category) => ({
      ...category,
      images: word
        ? category.images.filter((image) => image.name.toLowerCase().includes(word))
        : category.images,
    }))
    .filter((category) => category.images.length > 0);
});

/** 当前筛选结果的图片总数 */
const filteredCount = computed(() =>
  groups.value.reduce((sum, group) => sum + group.images.length, 0)
);

/** 大图预览：关闭时保留最后一张图，避免遮罩淡出时图先消失 */
const previewImage = ref<PackageBackground | null>(null);
const isPreviewOpen = ref(false);

function openPreview(image: PackageBackground) {
  previewImage.value = image;
  isPreviewOpen.value = true;
}
</script>

<template>
  <div class="oa-pkg__toolbar">
    <p class="oa-pkg__summary">
      <template v-if="loading && !backgrounds.length">正在读取背景目录…</template>
      <template v-else>
        <strong>{{ filteredCount }}</strong> 张背景
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        {{ categoryInfo.label }}
        <template v-if="keyword">
          <span class="oa-pkg__dot" aria-hidden="true">·</span>
          已筛选
        </template>
      </template>
    </p>
  </div>

  <p v-if="categoryInfo.description" class="oa-pkg__bg-desc">
    {{ categoryInfo.description }}
  </p>

  <Transition name="oa-swap" mode="out-in">
    <div v-if="loading && !backgrounds.length" key="loading" class="oa-pkg__state oa-pkg__state--inline">
      <p class="oa-pkg__state-text">正在读取背景目录…</p>
      <rizui_progress :indeterminate="true" :height="6" rounded />
    </div>

    <div v-else-if="error" key="error" class="oa-pkg__notice">
      <rizui_infobox type="error" :text="`读取背景失败：${error}`" />
    </div>

    <div v-else-if="filteredCount" key="list" class="oa-pkg__bg-list">
      <section
        v-for="group in groups"
        :key="group.id || '__uncategorized__'"
        class="oa-pkg__bg-group"
      >
        <p v-if="showGroupTitle" class="oa-pkg__sound-group__title">
          {{ group.label }}
          <span class="oa-pkg__sound-group__count">{{ group.images.length }}</span>
        </p>

        <OABackgroundGrid :images="group.images" @select="openPreview" />
      </section>
    </div>

    <div v-else key="empty" class="oa-pkg__empty">
      <p>{{ keyword ? '没有匹配的背景。' : '背景目录里没有图片。' }}</p>
    </div>
  </Transition>

  <OABackgroundLightbox v-model:show="isPreviewOpen" :image="previewImage" />
</template>

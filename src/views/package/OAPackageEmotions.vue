<script setup lang="ts">
/**
 * 资源包详情 → 表情分类。
 * 在独立舞台上选择角色 / 骨骼作为底图，并直接叠加播放表情。
 */
import { computed, ref, watch } from 'vue';
import { rizui_infobox, rizui_progress } from 'riz-ui';
import type {
  PackageCharacter,
  PackageEmotion,
  PackageSkeleton,
} from '@/modules/API/types';
import OAEmotionStage from '@/modules/EmotionRender/OAEmotionStage.vue';
import {
  openResourcePicker,
  type ResourcePickerItem,
} from '@/modules/ResourcePicker/useResourcePicker';

const props = defineProps<{
  packageId: string;
  emotions: PackageEmotion[];
  skeletons: PackageSkeleton[];
  characters: PackageCharacter[];
  loading: boolean;
  error: string;
  /** 页头搜索词（父组件持有，按分类分离） */
  keyword: string;
}>();

interface EmotionStageHandle {
  playEmotion: (emotion: PackageEmotion) => Promise<boolean>;
  stopEmotion: () => void;
  isReady?: boolean;
}

const stageRef = ref<EmotionStageHandle | null>(null);
const selectedKey = ref('');
const activeEmotionId = ref('');

const completeSkeletons = computed(() =>
  props.skeletons.filter((skeleton) => skeleton.complete)
);

/** 角色优先使用已存在的绑定立绘，其次回退到第一条声明 */
function characterSkeletonId(character: PackageCharacter): string {
  return (
    character.spines.find((item) => item.exists)?.id ??
    character.spine[0] ??
    ''
  );
}

/** 候选项的 `value` 就是舞台要加载的骨骼目录 id */
const pickerItems = computed<ResourcePickerItem<string>[]>(() => {
  const items: ResourcePickerItem<string>[] = [];

  for (const character of props.characters) {
    const skeletonId = characterSkeletonId(character);
    if (!skeletonId) {
      continue;
    }
    const meta = [character.school, character.club].filter(Boolean).join(' · ');
    items.push({
      key: `character:${character.name_id}`,
      label: character.name || character.name_id,
      description: meta || '角色立绘',
      group: '角色',
      meta: skeletonId,
      thumbnail: character.avatarUrl,
      shape: 'circle',
      value: skeletonId,
    });
  }

  for (const skeleton of completeSkeletons.value) {
    items.push({
      key: `skeleton:${skeleton.id}`,
      label: skeleton.id,
      description: `${kindLabel(skeleton.kind)} · ${skeleton.files.length} 个文件`,
      group: '骨骼',
      meta: skeleton.id,
      placeholder: '骨',
      shape: 'square',
      value: skeleton.id,
    });
  }

  return items;
});

const selected = computed(
  () => pickerItems.value.find((item) => item.key === selectedKey.value) ?? null
);

const stageReady = computed(() => stageRef.value?.isReady === true);

watch(
  pickerItems,
  (items) => {
    if (!items.some((item) => item.key === selectedKey.value)) {
      selectedKey.value = items[0]?.key ?? '';
    }
  },
  { immediate: true }
);

watch(selectedKey, () => {
  activeEmotionId.value = '';
  stageRef.value?.stopEmotion();
});

const filtered = computed(() => {
  const word = props.keyword.trim().toLowerCase();
  if (!word) {
    return props.emotions;
  }

  return props.emotions.filter((emotion) =>
    [emotion.id, emotion.name, emotion.description].some((field) =>
      field.toLowerCase().includes(word)
    )
  );
});

function kindLabel(kind: PackageSkeleton['kind']): string {
  if (kind === 'spine') return 'Spine';
  if (kind === 'dragonbones') return 'DragonBones';
  return '未知格式';
}

async function chooseBase() {
  const picked = await openResourcePicker(pickerItems.value, {
    title: '选择表情底图',
    description:
      '角色会使用其已绑定的立绘；骨骼条目直接载入 skeletons/ 下的资源。',
    emptyText: '这个资源包里没有可用的角色或骨骼。',
    confirmText: '在舞台上预览',
    initialKeys: selectedKey.value ? [selectedKey.value] : [],
  });

  if (picked) {
    selectedKey.value = picked.key;
  }
}

async function previewEmotion(emotion: PackageEmotion) {
  if (!canPlay(emotion)) {
    return;
  }

  activeEmotionId.value = emotion.id;
  await stageRef.value?.playEmotion(emotion);
}

/** 只有带脚本、贴图齐全并且舞台就绪的表情才能播放 */
function canPlay(emotion: PackageEmotion): boolean {
  return emotion.exists && emotion.hasScript && Boolean(selected.value) && stageReady.value;
}

function previewTitle(emotion: PackageEmotion): string {
  if (!emotion.exists) return '贴图缺失';
  if (!emotion.hasScript) return '该表情没有脚本，暂时无法播放';
  if (!selected.value) return '先选择一个角色或骨骼';
  if (!stageReady.value) return '舞台正在载入';
  return '在舞台上播放这个表情';
}

function stopPreview() {
  activeEmotionId.value = '';
  stageRef.value?.stopEmotion();
}
</script>

<template>
  <div class="oa-pkg__toolbar">
    <p class="oa-pkg__summary">
      <template v-if="loading && !emotions.length">正在读取表情索引…</template>
      <template v-else>
        <strong>{{ emotions.length }}</strong> 个表情
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        {{ filtered.length }} 个匹配
      </template>
    </p>
  </div>

  <Transition name="oa-swap" mode="out-in">
    <div v-if="loading && !emotions.length" key="loading" class="oa-pkg__state oa-pkg__state--inline">
      <p class="oa-pkg__state-text">正在读取表情索引…</p>
      <rizui_progress :indeterminate="true" :height="6" rounded />
    </div>

    <div v-else-if="error" key="error" class="oa-pkg__notice">
      <rizui_infobox type="error" :text="`读取表情失败：${error}`" />
    </div>

    <div v-else key="content" class="oa-pkg__emo-page">
      <section class="oa-pkg__emo-board">
        <div class="oa-pkg__emo-board__head">
          <div class="oa-pkg__emo-board__title">
            <span class="oa-pkg__emo-board__eyebrow">表情舞台</span>
            <strong>{{ selected?.label || '未选择底图' }}</strong>
            <span v-if="selected" class="oa-pkg__emo-board__meta">
              {{ selected.group }} · {{ selected.value }}
            </span>
          </div>

          <div class="oa-pkg__emo-board__actions">
            <button
              v-if="activeEmotionId"
              type="button"
              class="oa-pkg__emo-ghost"
              @click="stopPreview"
            >
              停止表情
            </button>
            <button
              type="button"
              class="oa-pkg__emo-choose"
              :disabled="!pickerItems.length"
              @click="chooseBase"
            >
              选择角色 / 骨骼
            </button>
          </div>
        </div>

        <OAEmotionStage
          ref="stageRef"
          class="oa-pkg__emo-stage"
          :package-id="packageId"
          :skeleton-id="selected?.value ?? ''"
        />
      </section>

      <aside class="oa-pkg__emo-side">

        <div v-if="filtered.length" class="oa-pkg__emo-list">
          <article
            v-for="emotion in filtered"
            :key="emotion.id"
            class="oa-pkg__emo"
            :class="{
              'is-missing': !emotion.exists,
              'is-script': emotion.hasScript,
              'is-active': activeEmotionId === emotion.id,
            }"
          >
            <div class="oa-pkg__emo__thumb">
              <img
                v-if="emotion.images.length"
                :src="emotion.images[0]"
                alt=""
                loading="lazy"
              />
              <span v-else class="oa-pkg__emo__thumb-empty">无贴图</span>
            </div>

            <div class="oa-pkg__emo__body">
              <div class="oa-pkg__emo__head">
                <span class="oa-pkg__emo__name">{{ emotion.name || emotion.id }}</span>
                <span
                  v-if="emotion.hasScript"
                  class="oa-pkg__emo__badge oa-pkg__emo__badge--script"
                >
                  JS
                </span>
                <span v-else class="oa-pkg__emo__badge oa-pkg__emo__badge--muted">
                  无脚本
                </span>
                <span v-if="emotion.loop" class="oa-pkg__emo__badge">循环</span>
                <span v-if="emotion.duration > 0" class="oa-pkg__emo__badge">
                  {{ emotion.duration.toFixed(1) }}s
                </span>
              </div>

              <div class="oa-pkg__emo__meta">
                <code>{{ emotion.id }}</code>
                <span v-if="!emotion.exists" class="oa-pkg__emo__miss">贴图缺失</span>
                <a
                  v-if="emotion.hasScript"
                  class="oa-pkg__emo__script"
                  :href="emotion.scriptUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看脚本
                </a>
              </div>
            </div>

            <button
              type="button"
              class="oa-pkg__emo__preview"
              :disabled="!canPlay(emotion)"
              :title="previewTitle(emotion)"
              @click="previewEmotion(emotion)"
            >
              {{ activeEmotionId === emotion.id ? '重播' : '预览' }}
            </button>
          </article>
        </div>

        <div v-else class="oa-pkg__empty">
          <p>{{ keyword ? '没有匹配的表情。' : '这个资源包没有表情。' }}</p>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.oa-pkg__emo-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(260px, 32%, 380px);
  gap: 12px;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.oa-pkg__emo-board {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 10px;
  border: 1px solid rgba(47, 90, 125, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
}

/* 舞台吃满剩余高度 */
.oa-pkg__emo-board :deep(.oa-emo-stage) {
  flex: 1;
  min-height: 300px;
  height: auto;
}

/* 右侧表情列表：自己滚动，舞台区域不受影响 */
.oa-pkg__emo-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

/* 窄屏（或侧边栏很宽时）退回上下布局，避免舞台被挤成一条 */
@media (max-width: 1080px) {
  .oa-pkg__emo-page {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(300px, 1fr) minmax(160px, 40%);
  }

  .oa-pkg__emo-side {
    overflow-y: auto;
  }
}


.oa-pkg__emo-board__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 4px 0;
}

.oa-pkg__emo-board__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.oa-pkg__emo-board__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #8aa3b8;
}

.oa-pkg__emo-board__title strong {
  overflow: hidden;
  font-size: 13px;
  color: #214e73;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-pkg__emo-board__meta {
  overflow: hidden;
  font-size: 10.5px;
  color: #8aa3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-pkg__emo-board__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.oa-pkg__emo-choose,
.oa-pkg__emo-ghost {
  padding: 5px 13px;
  border: 1px solid rgba(63, 127, 181, 0.28);
  border-radius: 999px;
  background: #fff;
  color: #35628a;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.oa-pkg__emo-ghost {
  border-color: rgba(47, 90, 125, 0.14);
  color: #6e879b;
}

.oa-pkg__emo-choose:hover:not(:disabled) {
  border-color: transparent;
  background: linear-gradient(135deg, #7bb8e8 0%, #3f7fb5 100%);
  color: #fff;
}

.oa-pkg__emo-ghost:hover {
  border-color: rgba(63, 127, 181, 0.34);
  color: #1769a8;
}

.oa-pkg__emo-choose:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.oa-pkg__emo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oa-pkg__emo {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.06);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-pkg__emo:hover {
  border-color: rgba(123, 184, 232, 0.6);
  box-shadow: 0 8px 20px rgba(36, 92, 138, 0.12);
}

.oa-pkg__emo.is-missing {
  opacity: 0.6;
}

.oa-pkg__emo.is-script {
  border-left: 3px solid rgba(226, 150, 66, 0.7);
}

.oa-pkg__emo.is-active {
  border-color: rgba(0, 144, 254, 0.55);
  background: rgba(0, 144, 254, 0.06);
}

.oa-pkg__emo__thumb {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 9px;
  background: linear-gradient(180deg, #f7fbff 0%, #e6f2fd 100%);
}

.oa-pkg__emo__thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.oa-pkg__emo__thumb-empty {
  font-size: 10px;
  color: #9db3c6;
}

.oa-pkg__emo__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.oa-pkg__emo__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.oa-pkg__emo__name {
  font-size: 13px;
  font-weight: 700;
  color: #214e73;
}

.oa-pkg__emo__badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(226, 241, 253, 0.9);
  color: #4a7396;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.5;
}

.oa-pkg__emo__badge--script {
  background: #ffe9d6;
  color: #b45c15;
}

.oa-pkg__emo__badge--muted {
  background: rgba(226, 232, 238, 0.9);
  color: #8a9bab;
}

.oa-pkg__emo__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #8aa0b3;
}

.oa-pkg__emo__meta code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10.5px;
}

.oa-pkg__emo__miss {
  color: #b45c15;
}

.oa-pkg__emo__script {
  color: #3f7fb5;
  text-decoration: none;
}

.oa-pkg__emo__script:hover {
  text-decoration: underline;
}

.oa-pkg__emo__preview {
  padding: 6px 14px;
  border: 1px solid rgba(63, 127, 181, 0.28);
  border-radius: 999px;
  background: #fff;
  color: #35628a;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-pkg__emo__preview:hover:not(:disabled) {
  border-color: transparent;
  background: linear-gradient(135deg, #7bb8e8 0%, #3f7fb5 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(47, 116, 168, 0.26);
}

.oa-pkg__emo__preview:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>

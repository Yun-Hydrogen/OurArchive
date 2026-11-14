<script setup lang="ts">
/**
 * 资源包详情 → 表情分类。
 *
 * 只负责工具栏、载入态与渲染区的排布；「选哪个立绘做底座」的流程留在页面里
 * （需要角色 / 立绘清单与 ResourcePicker），本组件通过 `pick` 事件请求。
 */
import { rizui_infobox, rizui_progress } from 'riz-ui';
import OAEmotionPreview from '@/modules/EmotionRender/OAEmotionPreview.vue';
import type { PackageEmotion } from '@/modules/API/types';
import type { SpineCharacter } from '@/modules/SkeletonRender/spinePackage';

defineProps<{
  emotions: PackageEmotion[];
  loading: boolean;
  error: string;
  /** 表情预览的立绘底座；null 表示还没选 */
  character: SpineCharacter | null;
  characterLabel: string;
  characterLoading: boolean;
  characterError: string;
}>();

const emit = defineEmits<{
  (e: 'pick'): void;
}>();

/** 切走分类时组件卸载，`OAEmotionPlayer` 会在 onBeforeUnmount 里清掉动画与音效 */
</script>

<template>
  <div class="oa-pkg__toolbar">
    <p class="oa-pkg__summary">
      <template v-if="loading && !emotions.length">正在读取表情索引…</template>
      <template v-else>
        <strong>{{ emotions.length }}</strong> 个表情
        <span class="oa-pkg__dot" aria-hidden="true">·</span>
        {{ characterLoading ? '正在载入立绘…' : characterLabel || '未选择预览角色' }}
      </template>
    </p>

    <div class="oa-pkg__tools">
      <button type="button" class="oa-pkg__mini" @click="emit('pick')">选择预览角色</button>
    </div>
  </div>

  <rizui_infobox
    v-if="characterError"
    type="error"
    :text="`载入预览立绘失败：${characterError}`"
  />

  <Transition name="oa-swap" mode="out-in">
    <div v-if="characterLoading && !character" key="loading" class="oa-pkg__state oa-pkg__state--inline">
      <p class="oa-pkg__state-text">正在载入立绘文件…</p>
      <rizui_progress :indeterminate="true" :height="6" rounded />
    </div>

    <div v-else key="stage" class="oa-pkg__emotion-stage">
      <OAEmotionPreview
        :character="character"
        :emotions="emotions"
        :loading="loading"
        :error="error"
        :character-label="characterLabel"
        @pick="emit('pick')"
      />
    </div>
  </Transition>
</template>

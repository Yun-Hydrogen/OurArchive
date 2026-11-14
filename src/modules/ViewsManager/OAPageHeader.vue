<script setup lang="ts">
/**
 * 统一页头：标题 / 副标题 / 返回按钮 / 右侧插槽。
 *
 * 7 个页面原本各自写一份 `.oa-xxx__head` 标记与样式（每份约 40 行），
 * 这里收成一处；页面只需给出文案并决定返回按钮放在左还是右。
 */
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    /** 返回按钮文案；不传则不渲染返回按钮 */
    backLabel?: string;
    /** 返回按钮位置：`start` 靠近标题（角色详情 / 立绘预览），`end` 靠右（其余页面） */
    backPosition?: 'start' | 'end';
  }>(),
  {
    subtitle: '',
    backLabel: '',
    backPosition: 'end',
  }
);

const emit = defineEmits<{
  (e: 'back'): void;
}>();
</script>

<template>
  <header class="oa-page-head">
    <!-- 返回在左：与标题同组，整体靠左 -->
    <div v-if="backPosition === 'start'" class="oa-page-head__main">
      <button
        v-if="backLabel"
        type="button"
        class="oa-page-head__back"
        @click="emit('back')"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M10 3.5 5.5 8 10 12.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="oa-page-head__back-label">{{ backLabel }}</span>
      </button>

      <div class="oa-page-head__titles">
        <h1 class="oa-page-head__title">{{ title }}</h1>
        <p v-if="subtitle" class="oa-page-head__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <!-- 返回在右：标题独占左栏，右栏放插槽（标签 / 搜索）+ 返回 -->
    <div v-else class="oa-page-head__main">
      <div class="oa-page-head__titles">
        <h1 class="oa-page-head__title">{{ title }}</h1>
        <p v-if="subtitle" class="oa-page-head__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div v-if="backPosition === 'end' || $slots.actions" class="oa-page-head__actions">
      <slot name="actions" />

      <button
        v-if="backPosition === 'end' && backLabel"
        type="button"
        class="oa-page-head__back"
        @click="emit('back')"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M10 3.5 5.5 8 10 12.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="oa-page-head__back-label">{{ backLabel }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
/* 页面自己负责左右内边距，这里只负责「一行排布」 */
.oa-page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px clamp(12px, 1.6vw, 22px);
  width: 100%;
  /*
   * 常驻设置按钮是 `position: fixed` 挂在右上角（44px + 右侧内边距），
   * 页头右侧必须让开它，否则窄窗口下返回键会被它挡住、点不到。
   */
  padding-right: clamp(64px, 6vw, 80px);
}

.oa-page-head__main {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.1vw, 14px);
  min-width: 0;
}

.oa-page-head__titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.oa-page-head__title {
  font-size: clamp(19px, 1.7vw, 25px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: #123a5c;
  overflow-wrap: anywhere;
}

.oa-page-head__subtitle {
  overflow: hidden;
  font-size: clamp(11.5px, 0.9vw, 13px);
  line-height: 1.5;
  color: #6f8ba4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-page-head__actions {
  display: flex;
  flex-wrap: wrap;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.oa-page-head__back {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 5px 11px 5px 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
  font-family: inherit;
  font-size: 12px;
  color: #35628a;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-page-head__back svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

/* 资源包名可能很长（如 `BlueArchivePackforOA`），超长时省略而不是撑破页头 */
.oa-page-head__back-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-page-head__back:hover {
  color: var(--oa-blue);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.16);
}

/* 副标题允许换行时（角色详情会写两段信息），退化成块级 */
@media (max-width: 620px) {
  .oa-page-head__subtitle {
    white-space: normal;
  }
}
</style>

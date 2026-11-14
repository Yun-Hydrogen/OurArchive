<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { rizui_dialog } from 'riz-ui';
import {
  cancelCharacterPick,
  confirmCharacterPick,
  setCharacterPickerOpen,
  setCharacterPickerSelection,
  useCharacterPickerState,
} from '@/modules/ResourcePicker/useCharacterPicker';

/**
 * 角色选择对话框：常驻挂载，由 `openCharacterPicker()` 唤起。
 * 列表按 `group` 分组展示，点一行即选中，双击直接确认。
 */
const { state } = useCharacterPickerState();

const keyword = ref('');

watch(
  () => state.value.open,
  (open) => {
    if (open) {
      keyword.value = '';
    }
  }
);

const dialogModel = computed({
  get: () => state.value.open,
  set: (open: boolean) => setCharacterPickerOpen(open),
});

const filtered = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  if (!word) {
    return state.value.items;
  }
  return state.value.items.filter((item) =>
    [item.label, item.description, item.skeletonId, item.group].some((field) =>
      field.toLowerCase().includes(word)
    )
  );
});

const groups = computed(() => {
  const order: string[] = [];
  const map = new Map<string, typeof filtered.value>();
  for (const item of filtered.value) {
    const bucket = map.get(item.group);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(item.group, [item]);
      order.push(item.group);
    }
  }
  return order.map((group) => ({ group, items: map.get(group) ?? [] }));
});

function select(key: string) {
  setCharacterPickerSelection(key);
}

function confirm(key?: string) {
  confirmCharacterPick(key);
}

function cancel() {
  cancelCharacterPick();
}
</script>

<template>
  <rizui_dialog
    v-model:show="dialogModel"
    :title="state.title"
    width="min(760px, 92vw)"
    mask-close
    @close="cancel"
  >
    <div class="oa-pick">
      <p v-if="state.description" class="oa-pick__desc">{{ state.description }}</p>

      <label v-if="state.items.length" class="oa-pick__search">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path
            d="m10.4 10.4 3 3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <input v-model="keyword" type="search" placeholder="搜索角色 / 立绘 id" />
      </label>

      <div v-if="filtered.length" class="oa-pick__list">
        <section v-for="group in groups" :key="group.group" class="oa-pick__group">
          <p class="oa-pick__group-title">
            {{ group.group }}
            <span class="oa-pick__group-count">{{ group.items.length }}</span>
          </p>

          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            class="oa-pick__item"
            :class="{ 'is-selected': state.selectedKey === item.key }"
            @click="select(item.key)"
            @dblclick="confirm(item.key)"
          >
            <span class="oa-pick__avatar">
              <img v-if="item.avatarUrl" :src="item.avatarUrl" :alt="item.label" loading="lazy" />
              <span v-else class="oa-pick__avatar-fallback">{{ item.label.slice(0, 1) }}</span>
            </span>
            <span class="oa-pick__text">
              <span class="oa-pick__name">{{ item.label }}</span>
              <span class="oa-pick__meta">{{ item.description }}</span>
            </span>
            <code class="oa-pick__id">{{ item.skeletonId }}</code>
          </button>
        </section>
      </div>

      <p v-else class="oa-pick__empty">
        {{ state.emptyText || '没有可选项。' }}
      </p>

      <footer class="oa-pick__foot">
        <button type="button" class="oa-pick__btn" @click="cancel">取消</button>
        <button
          type="button"
          class="oa-pick__btn oa-pick__btn--primary"
          :disabled="!state.selectedKey"
          @click="confirm()"
        >
          使用这个立绘
        </button>
      </footer>
    </div>
  </rizui_dialog>
</template>

<style scoped>
.oa-pick {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oa-pick__desc {
  font-size: 12px;
  line-height: 1.6;
  color: #6f8ba4;
}

.oa-pick__search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 5px 12px;
  border: 1px solid rgba(163, 190, 210, 0.5);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #8aa3b8;
  transition: border-color 0.2s ease;
}

.oa-pick__search:focus-within {
  border-color: var(--oa-blue);
}

.oa-pick__search svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}

.oa-pick__search input {
  width: 190px;
  border: 0;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: #1e4b76;
}

.oa-pick__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(52vh, 440px);
  overflow-y: auto;
  padding-right: 4px;
}

.oa-pick__group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.oa-pick__group-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 700;
  color: #1e4b76;
}

.oa-pick__group-count {
  font-size: 10.5px;
  font-weight: 400;
  color: #a3b6c4;
}

.oa-pick__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 10px;
  background: #ffffff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-pick__item:hover {
  border-color: rgba(0, 144, 254, 0.42);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
}

.oa-pick__item.is-selected {
  border-color: rgba(0, 144, 254, 0.6);
  background: rgba(0, 144, 254, 0.06);
  box-shadow: inset 0 0 0 1px rgba(0, 144, 254, 0.24);
}

.oa-pick__avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(180deg, #eaf6ff 0%, #d6ecfc 100%);
}

.oa-pick__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.oa-pick__avatar-fallback {
  font-size: 14px;
  font-weight: 700;
  color: #7fa8c6;
}

.oa-pick__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.oa-pick__name {
  font-size: 13px;
  font-weight: 600;
  color: #1e4b76;
}

.oa-pick__meta {
  overflow: hidden;
  font-size: 11px;
  color: #8aa3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-pick__id {
  flex: 0 0 auto;
  max-width: 40%;
  overflow: hidden;
  padding: 1px 7px;
  border-radius: 5px;
  background: rgba(0, 144, 254, 0.08);
  font-size: 10.5px;
  color: #1769a8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-pick__empty {
  padding: 22px 4px;
  font-size: 12.5px;
  color: #9ab0c2;
  text-align: center;
}

.oa-pick__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.oa-pick__btn {
  padding: 6px 16px;
  border: 1px solid rgba(163, 190, 210, 0.55);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  font-family: inherit;
  font-size: 12.5px;
  color: #35628a;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.oa-pick__btn:hover {
  border-color: rgba(0, 144, 254, 0.45);
  color: #1769a8;
}

.oa-pick__btn--primary {
  border-color: rgba(0, 144, 254, 0.5);
  background: linear-gradient(180deg, #ffffff 0%, #eaf6ff 100%);
  color: #1769a8;
  font-weight: 600;
}

.oa-pick__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

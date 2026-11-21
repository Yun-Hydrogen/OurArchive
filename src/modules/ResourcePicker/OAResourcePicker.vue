<script setup lang="ts" generic="T">
import { computed, ref, watch } from 'vue';
import {
  rizui_button,
  rizui_checkbox,
  rizui_dialog,
  rizui_dropdown,
  rizui_infobox,
  rizui_progress,
  rizui_text,
} from 'riz-ui';
import type { ResourcePickerItem } from '@/modules/ResourcePicker/useResourcePicker';

/**
 * 通用资源选择器（受控组件）。
 *
 * `<OAResourcePicker v-model:show="open" :items="items" @confirm="onConfirm" />`
 * 直接可用；需要跨层级唤起时改用 `openResourcePicker()`（见 `OAResourcePickerHost`）。
 */
const props = withDefaults(
  defineProps<{
    show: boolean;
    items: ResourcePickerItem<T>[];
    title?: string;
    description?: string;
    emptyText?: string;
    confirmText?: string;
    cancelText?: string;
    /** 多选；默认单选 */
    multiple?: boolean;
    /** 是否显示搜索框 */
    searchable?: boolean;
    searchPlaceholder?: string;
    /** 分组多于一个时显示分组筛选 */
    groupFilter?: boolean;
    /** 打开时默认选中的 key */
    initialKeys?: string[];
    /** 正在加载候选项 */
    loading?: boolean;
    width?: string;
  }>(),
  {
    title: '选择资源',
    description: '',
    emptyText: '没有可选项。',
    confirmText: '确认选择',
    cancelText: '取消',
    multiple: false,
    searchable: true,
    searchPlaceholder: '搜索…',
    groupFilter: true,
    initialKeys: () => [],
    loading: false,
    width: 'min(780px, 92vw)',
  }
);

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'confirm', items: ResourcePickerItem<T>[]): void;
  (e: 'cancel'): void;
}>();

const keyword = ref('');
const activeGroup = ref('');
const selectedKeys = ref<string[]>([]);

const dialogModel = computed({
  get: () => props.show,
  set: (value: boolean) => {
    emit('update:show', value);
    if (!value) {
      emit('cancel');
    }
  },
});

/** 分组名（空串统一成「未分组」） */
function groupOf(item: ResourcePickerItem<T>): string {
  return item.group?.trim() || '未分组';
}

const groups = computed(() => {
  const order: string[] = [];
  const map = new Map<string, ResourcePickerItem<T>[]>();
  for (const item of props.items) {
    const name = groupOf(item);
    const bucket = map.get(name);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(name, [item]);
      order.push(name);
    }
  }
  return order.map((name) => ({ name, items: map.get(name) ?? [] }));
});

const groupOptions = computed(() => [
  { value: '', label: '全部分组' },
  ...groups.value.map((group) => ({ value: group.name, label: group.name })),
]);

const showGroupFilter = computed(
  () => props.groupFilter && groups.value.length > 1
);

const filtered = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  const group = activeGroup.value;

  return props.items.filter((item) => {
    if (group && groupOf(item) !== group) {
      return false;
    }
    if (!word) {
      return true;
    }
    return [item.label, item.description, item.meta, item.group].some((field) =>
      (field ?? '').toLowerCase().includes(word)
    );
  });
});

const grouped = computed(() => {
  const order: string[] = [];
  const map = new Map<string, ResourcePickerItem<T>[]>();
  for (const item of filtered.value) {
    const name = groupOf(item);
    const bucket = map.get(name);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(name, [item]);
      order.push(name);
    }
  }
  return order.map((name) => ({ name, items: map.get(name) ?? [] }));
});

const selectedItems = computed(() =>
  props.items.filter((item) => selectedKeys.value.includes(item.key))
);

const selectableCount = computed(
  () => props.items.filter((item) => !item.disabled).length
);

const canConfirm = computed(() => selectedItems.value.length > 0);

function isSelected(key: string): boolean {
  return selectedKeys.value.includes(key);
}

function toggle(item: ResourcePickerItem<T>) {
  if (item.disabled) {
    return;
  }

  if (props.multiple) {
    selectedKeys.value = isSelected(item.key)
      ? selectedKeys.value.filter((key) => key !== item.key)
      : [...selectedKeys.value, item.key];
    return;
  }

  selectedKeys.value = [item.key];
}

function handleRowDblClick() {
  if (!props.multiple) {
    confirm();
  }
}

function reset() {
  keyword.value = '';
  activeGroup.value = '';

  const known = new Set(props.items.map((item) => item.key));
  const preset = props.initialKeys.filter((key) => known.has(key));
  if (preset.length > 0) {
    selectedKeys.value = props.multiple ? preset : preset.slice(0, 1);
    return;
  }

  // 单选默认落在第一个可选项上，省掉一次点击
  const first = props.items.find((item) => !item.disabled);
  selectedKeys.value = !props.multiple && first ? [first.key] : [];
}

function confirm() {
  if (!canConfirm.value) {
    return;
  }
  emit('confirm', selectedItems.value);
  dialogModel.value = false;
}

function cancel() {
  dialogModel.value = false;
}

watch(
  () => props.show,
  (open) => {
    if (open) {
      reset();
    }
  }
);

watch(
  () => props.items,
  () => {
    if (!props.show) {
      return;
    }

    const known = new Set(props.items.map((item) => item.key));
    selectedKeys.value = selectedKeys.value.filter((key) => known.has(key));

    if (!props.multiple && selectedKeys.value.length === 0) {
      const first = props.items.find((item) => !item.disabled);
      if (first) {
        selectedKeys.value = [first.key];
      }
    }
  }
);
</script>

<template>
  <rizui_dialog
    v-model:show="dialogModel"
    :title="title"
    :width="width"
    mask-close
  >
    <div class="oa-rpick">
      <p v-if="description" class="oa-rpick__desc">{{ description }}</p>

      <div v-if="searchable && (items.length || loading)" class="oa-rpick__filters">
        <div class="oa-rpick__search">
          <rizui_text
            v-model="keyword"
            type="text"
            :placeholder="searchPlaceholder"
          />
        </div>
        <div v-if="showGroupFilter" class="oa-rpick__group-filter">
          <rizui_dropdown
            :model-value="activeGroup"
            :options="groupOptions"
            @update:model-value="(value) => (activeGroup = String(value))"
          />
        </div>
      </div>

      <div v-if="loading" class="oa-rpick__loading">
        <rizui_progress :indeterminate="true" :height="6" rounded />
      </div>

      <div v-else-if="grouped.length" class="oa-rpick__list">
        <section
          v-for="group in grouped"
          :key="group.name"
          class="oa-rpick__section"
        >
          <p v-if="showGroupFilter || grouped.length > 1" class="oa-rpick__section-title">
            {{ group.name }}
            <span class="oa-rpick__section-count">{{ group.items.length }}</span>
          </p>

          <div
            v-for="item in group.items"
            :key="item.key"
            class="oa-rpick__item"
            :class="{
              'is-selected': isSelected(item.key),
              'is-disabled': item.disabled,
            }"
            role="option"
            :aria-selected="isSelected(item.key)"
            :aria-disabled="item.disabled ? 'true' : undefined"
            :tabindex="item.disabled ? -1 : 0"
            @click="toggle(item)"
            @dblclick="handleRowDblClick()"
            @keydown.enter.prevent="toggle(item)"
            @keydown.space.prevent="toggle(item)"
          >
            <rizui_checkbox
              class="oa-rpick__check"
              :model-value="isSelected(item.key)"
              :disabled="item.disabled"
              @click.stop.prevent="toggle(item)"
            />

            <span
              class="oa-rpick__thumb"
              :class="`is-${item.shape ?? 'circle'}`"
            >
              <img
                v-if="item.thumbnail"
                :src="item.thumbnail"
                :alt="item.label"
                loading="lazy"
              />
              <span v-else class="oa-rpick__thumb-fallback">
                {{ item.placeholder ?? item.label.slice(0, 1) }}
              </span>
            </span>

            <span class="oa-rpick__body">
              <slot name="item" :item="item" :selected="isSelected(item.key)">
                <span class="oa-rpick__label">{{ item.label }}</span>
                <span v-if="item.description" class="oa-rpick__meta-text">
                  {{ item.description }}
                </span>
              </slot>
            </span>

            <code v-if="item.meta" class="oa-rpick__meta">{{ item.meta }}</code>
          </div>
        </section>
      </div>

      <rizui_infobox v-else type="info" :text="emptyText" />

      <p v-if="!loading && filtered.length" class="oa-rpick__summary">
        共 {{ filtered.length }} 项可选
      </p>
    </div>

    <template #footer>
      <div class="oa-rpick__foot">
        <span class="oa-rpick__count">
          已选 {{ selectedItems.length }} / {{ selectableCount }}
        </span>
        <div class="oa-rpick__actions">
          <rizui_button :text="cancelText" @click="cancel" />
          <rizui_button
            primary
            :text="confirmText"
            :disabled="!canConfirm"
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </rizui_dialog>
</template>

<style scoped>
.oa-rpick {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oa-rpick__desc {
  font-size: 12px;
  line-height: 1.6;
  color: #6f8ba4;
}

.oa-rpick__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.oa-rpick__search {
  flex: 1 1 220px;
  min-width: 180px;
}

.oa-rpick__group-filter {
  flex: 0 0 auto;
  min-width: 132px;
}

.oa-rpick__loading {
  padding: 18px 2px;
}

.oa-rpick__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(54vh, 460px);
  overflow-y: auto;
  padding-right: 4px;
}

.oa-rpick__section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.oa-rpick__section-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 700;
  color: #1e4b76;
}

.oa-rpick__section-count {
  font-size: 10.5px;
  font-weight: 400;
  color: #a3b6c4;
}

.oa-rpick__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 10px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.oa-rpick__item:hover {
  border-color: rgba(0, 144, 254, 0.42);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
}

.oa-rpick__item:focus-visible {
  border-color: rgba(0, 144, 254, 0.6);
  box-shadow: 0 0 0 2px rgba(0, 144, 254, 0.18);
}

.oa-rpick__item.is-selected {
  border-color: rgba(0, 144, 254, 0.6);
  background: rgba(0, 144, 254, 0.06);
  box-shadow: inset 0 0 0 1px rgba(0, 144, 254, 0.24);
}

.oa-rpick__item.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.oa-rpick__check {
  flex: 0 0 auto;
  pointer-events: auto;
}

.oa-rpick__thumb {
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

.oa-rpick__thumb.is-square {
  border-radius: 9px;
  background: linear-gradient(180deg, #eef8f0 0%, #d9f0e0 100%);
}

.oa-rpick__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.oa-rpick__thumb-fallback {
  font-size: 12.5px;
  font-weight: 700;
  color: #7fa8c6;
}

.oa-rpick__thumb.is-square .oa-rpick__thumb-fallback {
  font-size: 11.5px;
  color: #4e8d68;
}

.oa-rpick__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.oa-rpick__label {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: #1e4b76;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-rpick__meta-text {
  overflow: hidden;
  font-size: 11px;
  color: #8aa3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-rpick__meta {
  flex: 0 0 auto;
  max-width: 40%;
  overflow: hidden;
  padding: 1px 7px;
  border-radius: 5px;
  background: rgba(0, 144, 254, 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10.5px;
  color: #1769a8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-rpick__summary {
  font-size: 11px;
  color: #9ab0c2;
}

.oa-rpick__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.oa-rpick__count {
  font-size: 11.5px;
  color: #8aa3b8;
}

.oa-rpick__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

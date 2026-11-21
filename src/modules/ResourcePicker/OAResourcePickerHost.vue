<script setup lang="ts">
import { computed } from 'vue';
import OAResourcePicker from './OAResourcePicker.vue';
import {
  cancelResourcePicker,
  confirmResourcePicker,
  setResourcePickerOpen,
  useResourcePickerState,
  type ResourcePickerItem,
} from './useResourcePicker';

/**
 * 单例宿主：把 `openResourcePicker()` 的状态接到通用组件上。
 * 在 `App.vue` 里常驻挂载一次即可，任何页面都能用 Promise 唤起。
 */
const { state } = useResourcePickerState();

const showModel = computed({
  get: () => state.value.open,
  set: (open: boolean) => setResourcePickerOpen(open),
});

function handleConfirm(items: ResourcePickerItem<unknown>[]) {
  confirmResourcePicker(items);
}
</script>

<template>
  <OAResourcePicker
    v-model:show="showModel"
    :items="state.items"
    :title="state.title"
    :description="state.description"
    :empty-text="state.emptyText"
    :confirm-text="state.confirmText"
    :cancel-text="state.cancelText"
    :multiple="state.multiple"
    :searchable="state.searchable"
    :search-placeholder="state.searchPlaceholder"
    :group-filter="state.groupFilter"
    :initial-keys="state.initialKeys"
    :width="state.width"
    @confirm="handleConfirm"
    @cancel="cancelResourcePicker"
  />
</template>

<script setup lang="ts">
import { rizui_sidebar } from 'riz-ui';
import type { NavItem } from 'riz-ui';

defineProps<{
  items: NavItem[];
  modelValue: string;
  width: number;
  defaultExpandedKeys?: string[];
}>();

/**
 * 带子条目的分类点父条目只会「展开 / 收起」，不会切换右侧内容。
 * 具体怎么定位由页面处理，这里只把事件原样转发。
 */
const emit = defineEmits<{
  'update:modelValue': [value: string];
  select: [item: NavItem];
  toggle: [payload: { item: NavItem; expanded: boolean }];
}>();
</script>

<template>
  <rizui_sidebar
    class="oa-pkg__nav"
    :model-value="modelValue"
    :items="items"
    :width="width"
    :inset="0"
    height="100%"
    :collapsible="false"
    :default-expanded-keys="defaultExpandedKeys"
    @update:model-value="emit('update:modelValue', String($event ?? ''))"
    @select="emit('select', $event)"
    @toggle="emit('toggle', $event)"
  />
</template>

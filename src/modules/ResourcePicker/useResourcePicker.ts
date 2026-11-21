import { computed, shallowRef } from 'vue';

/**
 * 通用资源选择器。
 *
 * 两层结构：
 * - `OAResourcePicker.vue` 是纯组件，`v-model:show` + `items` + `@confirm` 即可使用；
 * - 本文件提供全局单例 + `openResourcePicker()`，让任意深层组件可以直接
 *   `await openResourcePicker(items)` 拿到选择结果，不必各自维护弹窗状态。
 *
 * 候选项与业务无关：选择器只关心怎么展示，`value` 由调用方自定义并原样返回。
 */

export type ResourcePickerShape = 'circle' | 'square';

/** 一个可选项 */
export interface ResourcePickerItem<T = unknown> {
  /** 唯一键，用于选中判定与 `v-for` key */
  key: string;
  /** 主标题 */
  label: string;
  /** 副标题 */
  description?: string;
  /** 分组名，空串归到「未分组」 */
  group?: string;
  /** 右侧等宽标识，如骨骼 id、文件大小 */
  meta?: string;
  /** 缩略图 URL */
  thumbnail?: string;
  /** 无缩略图时的占位文字，缺省取 `label` 首字 */
  placeholder?: string;
  /** 缩略图形状，默认圆形 */
  shape?: ResourcePickerShape;
  /** 禁用后仍展示但不可选 */
  disabled?: boolean;
  /** 调用方数据，选择器原样返回 */
  value: T;
}

export interface ResourcePickerOptions {
  title?: string;
  description?: string;
  emptyText?: string;
  confirmText?: string;
  cancelText?: string;
  /** 多选模式 */
  multiple?: boolean;
  /** 是否显示搜索框 */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** 分组多于一个时是否提供分组筛选 */
  groupFilter?: boolean;
  /** 打开时默认选中的 key */
  initialKeys?: string[];
  /** 对话框宽度 */
  width?: string;
}

interface PickerState extends Required<ResourcePickerOptions> {
  open: boolean;
  items: ResourcePickerItem<unknown>[];
}

const DEFAULT_OPTIONS: Required<ResourcePickerOptions> = {
  title: '选择资源',
  description: '',
  emptyText: '没有可选项。',
  confirmText: '确认选择',
  cancelText: '取消',
  multiple: false,
  searchable: true,
  searchPlaceholder: '搜索…',
  groupFilter: true,
  initialKeys: [],
  width: 'min(780px, 92vw)',
};

const state = shallowRef<PickerState>({
  ...DEFAULT_OPTIONS,
  open: false,
  items: [],
});

let resolver: ((items: ResourcePickerItem<unknown>[] | null) => void) | null = null;

/** 只读状态，供宿主组件消费 */
export function useResourcePickerState() {
  return {
    state: computed(() => state.value),
  };
}

/**
 * 打开选择框。单选返回选中的那一项，用户取消返回 `null`。
 * 同一时刻只允许一个选择流程，新的调用会让旧的直接返回 `null`。
 */
export function openResourcePicker<T>(
  items: ResourcePickerItem<T>[],
  options?: ResourcePickerOptions & { multiple?: false }
): Promise<ResourcePickerItem<T> | null>;
export function openResourcePicker<T>(
  items: ResourcePickerItem<T>[],
  options: ResourcePickerOptions & { multiple: true }
): Promise<ResourcePickerItem<T>[] | null>;
export function openResourcePicker<T>(
  items: ResourcePickerItem<T>[],
  options: ResourcePickerOptions = {}
): Promise<ResourcePickerItem<T> | ResourcePickerItem<T>[] | null> {
  resolver?.(null);
  resolver = null;

  const merged = { ...DEFAULT_OPTIONS, ...options };

  state.value = {
    ...merged,
    open: true,
    items: items as ResourcePickerItem<unknown>[],
  };

  return new Promise<ResourcePickerItem<unknown>[] | null>((resolve) => {
    resolver = resolve;
  }).then((picked) => {
    if (!picked) {
      return null;
    }
    return merged.multiple ? picked : (picked[0] ?? null);
  }) as Promise<ResourcePickerItem<T> | ResourcePickerItem<T>[] | null>;
}

/** 组件内部：确认选择 */
export function confirmResourcePicker(items: ResourcePickerItem<unknown>[]) {
  const resolve = resolver;
  resolver = null;
  state.value = { ...state.value, open: false };
  resolve?.(items);
}

/** 组件内部：取消 / 关闭 */
export function cancelResourcePicker() {
  const resolve = resolver;
  resolver = null;
  state.value = { ...state.value, open: false };
  resolve?.(null);
}

/** 组件内部：`v-model:show` 的可写入口 */
export function setResourcePickerOpen(open: boolean) {
  if (!open) {
    cancelResourcePicker();
  }
}

/** 页面卸载时兜底，避免 Promise 永远挂着 */
export function disposeResourcePicker() {
  cancelResourcePicker();
}

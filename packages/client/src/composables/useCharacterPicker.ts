import { computed, shallowRef } from 'vue';

/**
 * 角色选择对话框（Provider 模式）。
 *
 * 页面只管 `await openCharacterPicker(items)`，由常驻的
 * `OACharacterPickerDialog` 负责渲染与关闭。逻辑放在模块作用域的单例里，
 * 这样任何页面 / 组件都能唤起同一个对话框，不用各自维护一份弹窗状态。
 */

/** 候选角色（一个可用立绘） */
export interface CharacterPickItem {
  /** 唯一键，用于选中判定与 `v-for` key */
  key: string;
  /** 主标题：角色名或立绘 id */
  label: string;
  /** 副标题：学院 / 社团 / 立绘 id 等 */
  description: string;
  /** 分组名，如「角色」「独立立绘」 */
  group: string;
  /** 实际要载入的立绘目录 id */
  skeletonId: string;
  /** 头像 URL，没有时显示首字 */
  avatarUrl: string;
}

export interface CharacterPickerOptions {
  title: string;
  description?: string;
  /** 空列表时的提示 */
  emptyText?: string;
}

interface PickerState extends CharacterPickerOptions {
  open: boolean;
  items: CharacterPickItem[];
  selectedKey: string;
}

const DEFAULT_OPTIONS: CharacterPickerOptions = {
  title: '选择预览角色',
  description: '从资源包里已绑定立绘的角色，或独立的立绘文件中选择一个。',
  emptyText: '这个资源包里没有可用的立绘。',
};

const state = shallowRef<PickerState>({
  ...DEFAULT_OPTIONS,
  open: false,
  items: [],
  selectedKey: '',
});

let resolver: ((value: CharacterPickItem | null) => void) | null = null;

/** 只读状态，供对话框组件消费 */
export function useCharacterPickerState() {
  return {
    state: computed(() => state.value),
  };
}

/**
 * 打开选择框，返回选中的角色；用户取消返回 `null`。
 * 同一个时刻只允许一个选择流程，新的调用会让旧的直接返回 `null`。
 */
export function openCharacterPicker(
  items: CharacterPickItem[],
  options: Partial<CharacterPickerOptions> = {}
): Promise<CharacterPickItem | null> {
  resolver?.(null);
  resolver = null;

  const merged: CharacterPickerOptions = { ...DEFAULT_OPTIONS, ...options };

  state.value = {
    ...merged,
    open: true,
    items,
    selectedKey: items[0]?.key ?? '',
  };

  return new Promise<CharacterPickItem | null>((resolve) => {
    resolver = resolve;
  });
}

/** 对话框内部：确认选择 */
export function confirmCharacterPick(key?: string) {
  const current = state.value;
  const target = current.items.find((item) => item.key === (key ?? current.selectedKey)) ?? null;
  resolver?.(target);
  resolver = null;
  state.value = { ...current, open: false };
}

/** 对话框内部：取消 / 关闭 */
export function cancelCharacterPick() {
  resolver?.(null);
  resolver = null;
  state.value = { ...state.value, open: false };
}

/** 对话框内部：v-model:show 需要可写入口 */
export function setCharacterPickerOpen(open: boolean) {
  if (!open) {
    cancelCharacterPick();
  }
}

/** 对话框内部：当前选中项 */
export function setCharacterPickerSelection(key: string) {
  state.value = { ...state.value, selectedKey: key };
}

/** 页面卸载时兜底，避免 promise 永远挂着 */
export function disposeCharacterPicker() {
  cancelCharacterPick();
}

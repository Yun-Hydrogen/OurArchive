# ResourcePicker — 角色与立绘选择器

> 源码：`src/modules/ResourcePicker/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `useCharacterPicker.ts` | 角色选择 Provider 模式：单例状态流与 Promise 化调用接口 |
| `OACharacterPickerDialog.vue` | 角色选择对话框渲染组件（分组展示、关键字过滤、头像/缺省徽标回退） |

## 职责边界

- 做什么：向全站任意调用方提供标准化的 Promise 选角界面，渲染角色分组、搜索过滤、单选高亮与双击直接确认，并安全返回选中的角色/骨骼或 `null`。
- 不做什么：不从服务端拉取原始角色与立绘数据（由外部装配为 `CharacterPickItem[]` 传入）、不直接触碰立绘与骨骼渲染。

## 关键实现

### `useCharacterPicker.ts`

1. 作用：模块级单例 Provider，通过 Promise 驱动角色选择流程，使得任何深层组件无需各自维护一套弹窗组件及 `v-model` 状态。
2. 数据契约与导出接口：
   - `CharacterPickItem`：候选立绘项（`key`、`label`、`description`、`group`、`skeletonId`、`avatarUrl`）。
   - `CharacterPickerOptions`：弹窗定制选项（`title`、`description`、`emptyText`）。
   - `openCharacterPicker(items, options)`：打开选择框，返回 `Promise<CharacterPickItem | null>`。
   - `useCharacterPickerState()`：提供给对话框组件的只读 `state`（基于 `shallowRef`）。
   - `confirmCharacterPick(key?)` / `cancelCharacterPick()`：内部确认与取消操作。
   - `setCharacterPickerOpen(open: boolean)`：供 `rizui_dialog` 的 `v-model:show` 响应关闭事件。
   - `setCharacterPickerSelection(key: string)`：变更当前高亮选中键。
   - `disposeCharacterPicker()`：清理悬挂的 Promise 与状态。
3. 注意事项：
   - **Promise 互斥与兜底**：`openCharacterPicker()` 执行时会先将上一次尚未完成的 Promise 以 `null` 提前结束并清理，避免多个流程竞争或弹窗叠加。
   - **卸载时清理**：使用方组件或页面卸载时（如 `PackageView` 卸载），必须显式调用 `disposeCharacterPicker()`，以防 Promise 句柄持续悬挂产生内存泄漏。
   - 默认文案配置：默认标题「选择预览角色」，默认副标题「从资源包里已绑定立绘的角色，或独立的立绘文件中选择一个。」，空提示「这个资源包里没有可用的立绘。」。
   - 初始默认高亮选中传入条目列表中的第一项（`items[0]?.key ?? ''`）。

### `OACharacterPickerDialog.vue`

1. 作用：全局常驻挂载的角色选择弹窗，消费 `useCharacterPickerState()` 的单例状态，负责 DOM 渲染与用户交互。
2. 输入输出：无外部 Props 与 Emits，全量通过 `useCharacterPicker.ts` 暴露的方法与单例响应式状态交互。
3. 交互细节与注意事项：
   - 弹窗采用 `rizui_dialog`，宽度约束为 `min(760px, 92vw)`。
   - 过滤与分组：搜索框对 `label`、`description`、`skeletonId`、`group` 四个字段同时进行大小写不敏感匹配；弹窗打开时自动重置搜索词 `keyword`。
   - 交互操作：单选高亮条目；按回车或双击选项条目（`@dblclick`）直接触发 `confirm(item.key)` 确认并关闭；提供「使用这个立绘」主按钮与「取消」按钮。
   - 头像降级：`avatarUrl` 缺省时自动显示角色名首字作为头像（`item.label.slice(0, 1)`）。
   - 列表滚动与自适应：列表最大高度设定为 `min(52vh, 440px)`，自带纵向滚动条与右侧留白垫片。
   - 骨骼 ID 标识：每个选项右侧展示 `code.oa-pick__id`，背景浅蓝，最大宽度 40% 溢出省略。

### 装配与调用示例

```ts
const items: CharacterPickItem[] = [
  ...boundCharacters.map((c) => ({
    key: `char:${c.name_id}`,
    label: c.name,
    description: `${c.school || '其他'} · ${c.club || '未分类'}`,
    group: '角色',
    skeletonId: c.skeleton,
    avatarUrl: c.avatarUrl,
  })),
  ...standaloneSkeletons.map((s) => ({
    key: `skel:${s.id}`,
    label: s.id,
    description: `立绘文件 · ${s.id}`,
    group: '独立立绘',
    skeletonId: s.id,
    avatarUrl: '',
  })),
];
const picked = await openCharacterPicker(items);
```

## 注意事项

- 调用者装配候选列表时，约定分为两组——「角色」（来自已绑定立绘的角色）与「独立立绘」（骨骼完整但未被任何角色引用的条目）。
- 状态基于模块作用域单例，因此对话框组件在应用视图树中必须且只需常驻挂载一次（如在 `PackageView` 中挂载）。
- 单例模式下避免在对话框内存储持久化的过滤或滚动状态，每次弹窗打开时均由重置逻辑重新校准。

## 相关文档

- [PackageView](../views/PackageView.md)
- [EmotionRender](./EmotionRender.md)
- [NeedNotice](../NeedNotice.md)

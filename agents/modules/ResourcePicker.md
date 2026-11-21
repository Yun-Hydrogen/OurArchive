# ResourcePicker — 通用资源选择器

> 源码：`src/modules/ResourcePicker/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `useResourcePicker.ts` | 候选项 / 选项类型定义 + 全局单例 + `openResourcePicker()` Promise 接口 |
| `OAResourcePicker.vue` | 通用选择器组件（受控），全部交互使用 RizUI 控件 |
| `OAResourcePickerHost.vue` | 单例宿主：把 `openResourcePicker()` 的状态接到组件上，`App.vue` 常驻挂载一次 |

## 两种用法

### 1. 受控组件（页面内自己管理开关）

```vue
<OAResourcePicker
  v-model:show="pickerOpen"
  :items="items"
  title="选择资源"
  multiple
  @confirm="(picked) => (selection = picked)"
/>
```

### 2. Promise 接口（跨层级唤起，推荐）

```ts
const picked = await openResourcePicker(items, {
  title: '选择表情底图',
  description: '角色会使用其已绑定的立绘。',
  emptyText: '这个资源包里没有可用的角色或骨骼。',
  confirmText: '在舞台上预览',
  initialKeys: [currentKey],
});

if (picked) {
  // picked.value 即候选项里自定义的业务数据
}
```

- 单选返回 `ResourcePickerItem<T> | null`，多选（`multiple: true`）返回 `ResourcePickerItem<T>[] | null`，两种形态由重载区分。
- 同一时刻只允许一个选择流程：新的调用会让上一个 Promise 直接返回 `null`。
- 页面卸载兜底可调用 `disposeResourcePicker()`，避免 Promise 永久挂起。

## 候选项契约

`ResourcePickerItem<T>`：

| 字段 | 说明 |
| --- | --- |
| `key` | 唯一键，用于选中判定与 `v-for` key |
| `label` | 主标题 |
| `description` | 副标题 |
| `group` | 分组名；空串归到「未分组」 |
| `meta` | 右侧等宽标识（骨骼 id、文件大小等） |
| `thumbnail` | 缩略图 URL |
| `placeholder` | 无缩略图时的占位文字，缺省取 `label` 首字 |
| `shape` | 缩略图形状，`circle`（角色头像）/ `square`（文件类） |
| `disabled` | 禁用（仍展示，不可选） |
| `value` | **调用方业务数据**，选择器原样返回 |

选择器不关心资源来源；把「角色」映射成骨骼 id 之类的解析由调用方完成，结果放进 `value`。

## RizUI 控件

| 位置 | 控件 |
| --- | --- |
| 对话框外壳 / 底部操作区 | `rizui_dialog`（`#footer` 插槽）+ `rizui_button` |
| 搜索 | `rizui_text`（`v-model`） |
| 分组筛选（分组 > 1 时出现） | `rizui_dropdown` |
| 单 / 多选指示 | `rizui_checkbox`（单选时表现为单选勾选） |
| 加载中 | `rizui_progress`（`indeterminate`） |
| 空态 | `rizui_infobox` |

## 关键实现

- `state` 用 `shallowRef`：候选项可能有数千条（如 631 个骨骼 + 447 个角色），不能做深响应。
- 打开时 `reset()`：清搜索词、清分组筛选，按 `initialKeys` 还原选中；单选没有预设值时默认落在第一个可选项上。
- 搜索对 `label` / `description` / `meta` / `group` 做大小写不敏感匹配；列表按分组名首次出现顺序分段。
- 单选行双击直接确认；多选双击不确认，避免误操作。
- 行是 `role="option"` 的可聚焦元素，`Enter` / `Space` 切换选中。
- `#item` 作用域插槽可替换行内文字排版（`{ item, selected }`），缩略图与 `meta` 仍由组件渲染。

## 相关文档

- [EmotionRender](./EmotionRender.md)
- [SkeletonRender](./SkeletonRender.md)
- [PackageView](../views/PackageView.md)

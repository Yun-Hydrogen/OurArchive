# ConfigProvider — 全局配置持久化、跨端同步、防抖写回与渲染模式定义

> 源码：`src/modules/ConfigProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `configStore.server.ts` | `global_config.yml` 读写、数值钳制、默认值与旧布局平滑迁移（服务端专用） |
| `rendererMode.ts` | `spine_renderer` 取值常量、模式校验与选项定义（客户端与服务端共用） |
| `useGlobalConfig.ts` | 客户端全局配置 Composable：单例响应式状态、自动同步、防抖写回后端 |

## 职责边界

- 做：全局配置（`main_bgm_volume`、`preview_volume`、`spine_renderer`）的默认值、格式规范、落盘与迁移，以及前端响应式状态管理和 300ms 防抖更新。
- 不做：底层存储目录的创建（由 `Initializer/storage.server.ts` 负责）、具体音量如何施加到音频元素（由 `AudioPlayer` 与各播放器负责）、渲染器具体执行（由立绘预览模块负责）。

## 关键实现

### `loadGlobalConfig()` / `saveGlobalConfig()`（`configStore.server.ts`）

1. 作用：服务端读写 `<root>/config/global_config.yml`；读取时使用默认配置打底（`main_bgm_volume: 50`、`preview_volume: 60`、`spine_renderer: 'stable'`）并做浅合并。
2. 输入输出：`loadGlobalConfig(paths?): GlobalConfig`；`saveGlobalConfig(config, paths?): GlobalConfig`。
3. 校验规则：
   - 音量项统一收敛为 0–100 的整数，非数字或溢出自动恢复为默认配置。
   - `spine_renderer` 通过 `isSpineRendererMode()` 校验，非法值归一化为 `'stable'`。
4. 注意事项：文件缺失或 YAML 语法错误时打印警告并返回默认配置，**绝不抛错**；写入时通过 `dump`（`indent: 2`、`lineWidth: -1`、`noRefs: true`）序列化。

### `migrateLegacyConfigDir(paths)`（`configStore.server.ts`）

1. 作用：平滑兼容旧版本目录布局与文件名变更：
   - 早期旧目录 `<root>/configs/global_settings.yml` → 迁移到 `<root>/config/global_config.yml`。
   - 早期旧文件名 `<root>/config/global_settings.yml` → 迁移到 `<root>/config/global_config.yml`。
2. 输入输出：`(paths: StoragePaths): void`。
3. 迁移安全法则：
   - **旧文件存在且新文件不存在时才复制**（新文件一旦存在即为用户当前有效配置，绝不允许被旧文件覆盖，见 [NeedNotice](../NeedNotice.md) 条目 10）。
   - 复制成功后尝试递归删除旧 `configs/` 目录；如果删除或复制失败只打印警告，**禁止抛错阻断服务启动**。

### `ensureConfigFile(paths)`（`configStore.server.ts`）

1. 作用：确保配置文件物理存在；首次启动且无旧配置可迁移时，写入默认配置内容（`DEFAULT_CONFIG_CONTENT`）。
2. 输入输出：`(paths?: StoragePaths): void`。
3. 注意事项：该函数仅关注配置文件的写入与默认值落盘，基础目录本身的创建留在 `Initializer/storage.server.ts`，职责单向解耦。

### 渲染器模式定义与共享真源（`rendererMode.ts`）

1. 作用：客户端设置面板与服务端入参校验公用唯一的模式真源，两端一致。
2. 模式枚举与说明（`SPINE_RENDERER_MODES`）：
   - `aggressive`（激进 · 仅 WebGL）：只用 WebGL；环境不支持时直接报错，便于暴露问题。
   - `stable`（稳定 · 优先 WebGL，失败回退）：优先使用 WebGL，初始化失败时自动回退到 Canvas 2D（系统默认取值）。
   - `conservative`（保守 · 仅 Canvas 2D）：只用 Canvas 2D；兼容性最好，但高密度立绘会掉帧。
3. 工具方法：导出 `isSpineRendererMode(val)` 类型守卫与 `normalizeSpineRendererMode(val)` 容错归一化函数。
4. 注意事项：该文件严禁引入任何 WebGL / Canvas 运行时，防止首屏被动打包大体积渲染依赖。

### `useGlobalConfig()`（`useGlobalConfig.ts`）

1. 作用：前端全局配置单例 Composable，多组件调用共享同一份响应式 `config` 引用。
2. 输入输出：暴露只读 `config`、`isLoaded`，以及 `fetchConfig()`、`setMainBgmVolume()`、`setPreviewVolume()`、`setSpineRenderer()`。
3. 响应式与防抖同步：
   - `fetchConfig()` 调用 GET `/api/config` 初始化状态，拉取失败保留 `CONFIG_DEFAULTS` 并警告，不抛出异常。
   - `config` 是经 `readonlyRef()` 封装的只读暴露，修改必须通过专属 setter，内部自动通过 `clampVolume` 规范数值。
   - 修改设置时，通过 `persist()` 设置 300ms 计时器防抖合并（提交 PUT `/api/config`），多项或高频滑动只触发一次保存。

### 弹窗与设置面板集成消费（`OASettingsModal.vue`）

1. 消费方式：`Shell` 模块中的设置弹窗引入 `useGlobalConfig`，展示音量滑块与渲染模式单选。
2. 生效时机：音量设置即时同步；渲染模式修改即时保存至后端，但立绘渲染器实例仅在下次载入立绘时初始化生效，不强制刷新当前页面。

## 注意事项

- 服务端写入配置文件前，必须先调用 `fs.mkdirSync(paths.configDir, { recursive: true })` 确保目录存在。
- 字段命名全链路统一为 snake_case（`main_bgm_volume`、`preview_volume`、`spine_renderer`），严禁在 DTO 处私自转为 camelCase。
- 旧配置迁移在 `initializeStorage()` 中触发，先迁移再通过 `ensureConfigFile()` 兜底生成默认配置。

## 相关文档

- [Initializer](./Initializer.md)
- [AudioPlayer](./AudioPlayer.md)
- [API](./API.md)
- [NeedNotice](../NeedNotice.md)

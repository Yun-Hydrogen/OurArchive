关联后端文件：
`packages/server/src/routes/packages.ts` — 资源包 API（9 个端点）
`packages/server/src/routes/config.ts` — 全局配置 API
`packages/server/src/routes/preload.ts` — 预加载资源 API
`packages/server/src/config/packages.ts` — 资源包读取与派生（`readPackage*` / `readSkeletonFiles` / `resolveMusicFile`）

用法：

### `createPackagesRouter()`

1. 作用：9 个端点都走「`resolvePackageDir(id)` + `scanResourcePackages().find(id)`」找包，找不到统一 404。
2. 端点列表：
   - `GET /api/packages` → 全部资源包（含 `resourcesDir`、`total`）；
   - `GET /api/packages/:id` → 单包详情；
   - `GET /api/packages/:id/characters` → 角色索引（含 `avatarUrl` 与 `spines[].exists`）；
   - `GET /api/packages/:id/skeletons` → 全部立绘目录（含文件清单与体积）；
   - `GET /api/packages/:id/skeleton/:skeletonId` → 单目录文件清单；
   - `GET /api/packages/:id/skeleton/:skeletonId/:file(*)` → 立绘文件本体；
   - `GET /api/packages/:id/avatar/:file(*)` → 头像；
   - `GET /api/packages/:id/music` → 曲目索引；`GET /api/packages/:id/music/:file(*)` → 音频本体。
3. 注意事项：**路由顺序不能乱**——`/:id/music/:file(*)`、`/:id/skeleton/:skeletonId/:file(*)` 必须在带同前缀的列表路由之后挂载；`sendFile` 内部用白名单 `MIME_BY_EXTENSION` 过滤类型，非白名单返回 404。

### `failNotFound(res, message)` / `failInternal(res, error)`

1. 作用：响应包络的两个出口（`{ success: false, error }`）；2. `failInternal` 把 `error.message` 直接下发给前端，所以错误信息要写中文且可读。
2. 输入输出：`(res, message: string)` / `(res, error: unknown)` → 无返回值。
3. 注意事项：每个 handler 都要 `try { ... } catch { failInternal }`，不要让异常冒泡到 Express 默认错误处理（那会返回 HTML）。

### `sendFile(res, target)`

1. 作用：下发单个静态文件；2. 三道闸：存在性 → 是否文件 → 扩展名白名单；3. 一律 `Cache-Control: no-cache`；4. 用 `res.sendFile(target)`，自带 Range（音频可 seek、206）。
2. 输入：`target: string | null`（`resolveInside` 的返回值）。
3. 注意事项：不要自己 `createReadStream` 拼流式输出，`sendFile` 的 Range / 206 是进度条拖动能用的原因。

### `readSkeletonFiles(packageDir, pkg, skeletonId)` / `readSkeletonDir(...)`

1. 作用：读单个立绘目录里的文件（含体积与下发 URL）；2. 非骨骼分类或目录不存在返回 `null`；3. 文件按名字排序，`ext` 为小写含点扩展名。
2. 输入输出：`string, ResourcePackage, string → PackageSkeletonItem[] | null`。
3. 注意事项：`statSync` 失败只把体积记 0，不影响列表；体积在列出阶段算好下发，展开时前端不用再请求。

### `readPackageMusic(packageDir, pkg)` / `resolveMusicFile(...)`

1. 作用：读 `<path>/index/music_info.json` 出曲目，并把每个曲目关联到磁盘上的实际音频文件；2. 找文件的退化顺序：`original_filename` → `name_id` + 同后缀 → 大小写不敏感地按 `name_id.` 名匹配；3. `resolveMusicFile` 是音频下发的守门人（后缀必须在 `AUDIO_EXTENSIONS` 内）。
2. 输入输出：列表为 `PackageMusic[]`；单文件为 `string | null`。
3. 注意事项：音频文件直接放在分类目录下（不在子目录），`path` 指向目录不是文件；`music_info.json` 里没有 `description` 的曲目前端不显示「查看详细」。

### `readPackageCharacters(packageDir, pkg)`

1. 作用：读角色索引并补 `avatarUrl` 与每条立绘的存在性；2. 头像目录与索引文件名来自 `package_content` 的 `avatar` / `index`（缺省 `avatars` / `characters.json`）；3. 头像文件不存在时 `avatar` 与 `avatarUrl` 都置空串（前端显示首字占位）。
2. 输入输出：`string, ResourcePackage → PackageCharacter[]`（按 `name_id` 排序）。
3. 注意事项：`name_id` 为空的记录直接丢弃；`spine` 字段是外载名，语义即 skeleton（见 `ProjectDevelopNotice.md`「外载格式」）。

### 配置 API（`routes/config.ts`）

1. 作用：`GET /api/config` 返回配置；`PUT /api/config` 接受补丁并落盘。
2. 白名单：音量项（`main_bgm_volume` / `preview_volume`）钳制 0–100 整数；`spine_renderer` 只接受 `aggressive | stable | conservative`；其余字段忽略。
3. 注意事项：`body` 不是对象直接 400，错误文案中文。

### 预加载 API（`routes/preload.ts`）

1. 作用：`GET /api/preload/assets` 返回清单与就绪统计；`GET /api/preload/asset/:id` 按 id 下发文件本体（`res.sendFile`，支持 Range）。
2. 输入：`:id`（统一小写化后比对）。
3. 注意事项：不在清单里 404、不在磁盘上 404，文案中文；清单结果读的是启动时缓存（`getPreloadCheckResult()`），运行期改了 `preload/` 目录要重启才生效。

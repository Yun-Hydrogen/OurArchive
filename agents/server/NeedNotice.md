本文档记录了 后端 踩过的比较难解/复杂/难以发掘的坑，供后续开发者参考。
请按照 
1. 问题出现的模块位置
2. 未解决前的表现
3. 解决方案
4. 解决方案的原理
5. 解决后的效果
6. 备注（参考链接等）

=====================================================

每条按「位置 / 表现 / 解决方案 / 原理 / 效果 / 备注」六段写。**改动相关代码前先扫一遍对应分组**，很多坑是「看起来能删、删了就坏」的那类。

| 分组 | 条目 |
| --- | --- |
| 一、路径与存储 | 01 – 05 |
| 二、配置与清单 | 06 – 09 |
| 三、资源包索引 | 10 – 15 |
| 四、API 与静态托管 | 16 – 20 |

前端踩坑见 [agents/client/NeedNotice.md](../client/NeedNotice.md)。

---

# 一、路径与存储

## 01 · Termux 下 `process.platform` 仍是 `linux`

- **位置**：`packages/server/src/config/paths.ts`（`detectPlatform()`）
- **表现**：Android（Termux）上根目录落到 `/home/<用户名>/OurArchive`，数据写到没权限的地方，启动直接退出。
- **解决方案**：`process.platform === 'android'` **或** 存在 `TERMUX_VERSION` / `ANDROID_ROOT` 环境变量时才判定为 `android`。
- **原理**：Termux 里的 Node 是按 Linux 构建的，运行时 `process.platform` 只能给 `linux`；只有环境变量能区分。
- **效果**：Android 默认走 `/sdcard/OurArchive`。
- **备注**：千万不要探测 `/sdcard` 是否存在——普通 Linux 挂载点会误判。

## 02 · `resolvePreloadAssetsPath` 必须按顺序找，不要只找一种布局

- **位置**：`packages/server/src/config/paths.ts`
- **表现**：开发期正常，打包成单文件 exe 或 Linux 发行包后提示「preload 不完整」，但资源明明随包分发了。
- **解决方案**：候选按固定优先级试——运行目录同级（单文件 exe）→ 运行目录父级（Linux/Android 的 `server/` 上级）→ `process.cwd()` → 相对上两级 → 客户端 `resources/`，第一个存在即用。
- **原理**：三种形态的目录层级完全不同，单一相对路径不可能在所有形态下都对。
- **效果**：三形态都能找到清单。
- **备注**：加新打包形态时往这个列表加候选，不要改成「只找仓库根」。

## 03 · 旧布局迁移必须「存在且新文件不存在」才复制

- **位置**：`packages/server/src/config/storage.ts`（`migrateLegacyConfigDir`）
- **表现**：升级后用户的 `global_config.yml` 被覆盖成默认值，音量与渲染器模式全部重置。
- **解决方案**：旧文件（`configs/global_settings.yml`、`config/global_settings.yml`）存在且新文件**不存在**时才复制；复制失败只告警，之后尝试删除旧目录（失败忽略）。
- **原理**：新文件一旦存在就是用户的当前配置，任何情况下都不允许被旧文件覆盖。
- **效果**：升级零丢失；迁移失败不阻断启动。
- **备注**：**迁移失败不能抛错**，否则整个服务起不来。

## 04 · 目录创建失败是唯一要 `process.exit(1)` 的路径

- **位置**：`packages/server/src/index.ts`、`packages/server/src/config/storage.ts`
- **表现**：资源根目录不可写时服务静默启动，没有资源目录、没有 API。
- **解决方案**：`initializeStorage()` 里 `mkdirSync` 抛错时包上路径 + 原因 + 解决建议，`index.ts` 捕获后 `console.error` 并 `exit(1)`；配置解析失败只告警并回落默认值。
- **原理**：目录不可写是运营性问题，继续启动只会产生一连串 404；配置解析失败可降级。
- **效果**：不可写时立刻给出可操作提示；配置损坏时服务仍能起来。
- **备注**：错误提示中文；横幅标签英文是刻意设计（对齐常见 dev server 输出），不要「顺手」统一语言。

## 05 · 路径只能从 `getStoragePaths()` 来，业务代码不要拼

- **位置**：`packages/server/src/config/paths.ts`、`config/packages.ts`、`config/preload.ts`
- **表现**：某个新功能自己 `path.join(rootDir, 'res', ...)`，换个打包形态或平台就全乱。
- **解决方案**：`paths.ts` 是唯一的路径来源，业务代码只用 `StoragePaths` 的字段和 `resolveInside()`。
- **原理**：根目录由平台 + 环境变量决定，硬编码只在开发机上成立。
- **效果**：换平台、换数据目录、换打包形态都不用改业务代码。
- **备注**：监听地址、对外端口走 `config/server.ts` 与 `config/publicUrl.ts`，不要在 `index.ts` 里直接读 `process.env.PORT`。

---

# 二、配置与清单

## 06 · 手写 YAML/JSON 带 BOM 会让解析失败

- **位置**：`res/*/package.yml`、`res/*/characters/characters.json`、`res/*/index/music_info.json`
- **表现**：资源包列表里 `valid: false`，或角色 / 音乐数量为 0，但文件肉眼完全正常。
- **解决方案**：保存为 **UTF-8 无 BOM**；服务端读取时统一 `.replace(/^\uFEFF/, '')` 兜底（`packages.ts` 里三处：`package.yml`、`characters.json`、`music_info.json`）。
- **原理**：`JSON.parse` 遇到 BOM（`EF BB BF`）直接抛 `Unexpected token`；Windows 上 PowerShell 5.1 的 `Set-Content -Encoding utf8` 默认写 BOM。
- **效果**：清单能正常解析，计数正确。
- **备注**：此条是跨端问题，前端侧见 [client/NeedNotice.md](../client/NeedNotice.md) 条目 46。

## 07 · 配置读失败不能抛错，必须回落默认值

- **位置**：`packages/server/src/config/storage.ts`（`loadGlobalConfig`）
- **表现**：`global_config.yml` 被手改坏一行后服务直接起不来。
- **解决方案**：解析失败只 `console.warn` 并返回默认值（音量 50/60、`spine_renderer: stable`）。
- **原理**：配置是可降级的；没有配置时用合理默认，远比拒绝启动好。
- **效果**：配置文件损坏仍能起来，前端设置页拉到默认配置。
- **备注**：日志前缀 `[Our Archive]` + 中文文案。

## 08 · 读配置必须打底再合并，不要直接返回文件内容

- **位置**：`packages/server/src/config/storage.ts`
- **表现**：文件里只写了单个键（比如只调了音量），其余键读出来是 `undefined`，客户端设置页全白。
- **解决方案**：`merged = { ...defaults, ...parsed }`，再对每个键收敛校验（音量钳 0–100 整数；`spine_renderer` 只接受 `aggressive | stable | conservative`，非法回退 `stable`）。
- **原理**：用户会手改 yml，缺键和脏值都是常态。
- **效果**：缺键、脏值都有确定结果。
- **备注**：写回时同样先 `loadGlobalConfig()` 合并，保证不丢已有键。

## 09 · 预加载清单只认 `file_type`，不要兜底拼错的键

- **位置**：`packages/server/src/config/preload.ts`
- **表现**：清单里写错成 `file_tpye` 时资源“缺失”，但文件明明在。
- **解决方案**：只认 `file_type`，缺失记 `'unknown'`；`id` 统一小写化后比对，路径剥离前导斜杠。
- **原理**：清单由开发者维护，拼写错属于清单本身的 bug，服务端兜底会掩盖它。
- **效果**：写错的清单立刻暴露为缺失，而不是悄悄通过。
- **备注**：路径用 `startsWith('preload')` 判断是否从根解析，否则落到 `preloadDir`——清单里 `file` 以 `preload/` 开头是约定。

---

# 三、资源包索引

## 10 · `name_id` 为空的记录要直接丢弃

- **位置**：`packages/server/src/config/packages.ts`（`readPackageCharacters`、`readPackageMusic`）
- **表现**：索引里混入一条空记录后，角色列表出现一条空白项，后续按 `name_id` 找永远找不到。
- **解决方案**：`asText(record.name_id)` 为空就 `continue`。
- **原理**：索引是外载文件，可能混入注释行、半成品记录；其它字段可以用空串兜底，唯一键不行。
- **效果**：坏记录被静默过滤，不污染列表。
- **备注**：**索引解析失败整体返回 `[]`**（坏索引在计数时退回到目录条数），不要抛错。

## 11 · 资源包 `id` 只允许一级目录名

- **位置**：`packages/server/src/config/packages.ts`（`resolvePackageDir`）
- **表现**：请求 `?package=../config` 或带分隔符的 id 能读到包外文件。
- **解决方案**：`safeId` 为空、`.`、`..` 或含 `[/\\]` 一律返回 `null`；且清单文件必须存在。
- **原理**：`id` 来自 URL 参数，是完全用户可控的输入；不校验就等于路径穿越。
- **效果**：越界请求直接 404。
- **备注**：所有下发路径都先过 `resolveInside()`，见条目 20。

## 12 · 扁平与嵌套两种 `package_content` 写法都要支持

- **位置**：`packages/server/src/config/packages.ts`（`parsePackageContents`）
- **表现**：作者换了一种写法后，内容分类列表变成空，前端什么都不显示。
- **解决方案**：先按嵌套（每项值是对象）解析；一项没有嵌套对象时回退到扁平：找第一个不在 `CONTENT_RESERVED_KEYS` 里的键作为分类键，字符串值当路径。
- **原理**：`package.yml` 由第三方作者手写，两种写法都出现过；只支持一种会整块丢数据。
- **效果**：两种写法都正确产出分类。
- **备注**：`CONTENT_RESERVED_KEYS` 必须要包含 `supported` / `path` / `index` / `avatar` / `name` / `description`，少一个就会把字段误当分类键。

## 13 · 计数口径要按分类特化，不要无脑数目录条目

- **位置**：`packages/server/src/config/packages.ts`（`countEntries`）
- **表现**：音乐条目数把 `index/` 和几百个音频文件都算进去，数字毫无意义；角色数把索引文件也算进去。
- **解决方案**：`hasCharacter` 优先读 `characters.json` 数组长度；`BackgroundMusic` 优先读 `index/music_info.json` 数组长度；读不到再回退一级条目数。
- **原理**：计数服务的是 UI 上的「N 个角色 / N 首曲目」，口径必须和列表的真实条目一致。
- **效果**：卡片上的计数与点进去的列表一致。
- **备注**：索引 JSON 坏了时回退目录条数，`exists` 仍为 true，不让 UI 误以为目录缺失。

## 14 · 贴图 / 音频文件名的退化匹配要逐级收紧

- **位置**：`packages/server/src/config/packages.ts`（`resolveAudio`）
- **表现**：索引里只给了 `name_id` 而没有 `original_filename` 时，曲目全部「文件缺失」。
- **解决方案**：候选顺序——`original_filename` → `name_id + 原后缀` → 大小写不敏感同名 → 大小写不敏感前缀；每级都用 `resolveInside` 校验存在性。
- **原理**：外载索引的命名与磁盘文件名之间是冒号关系，没有唯一约定，只能按强度逐级回退。
- **效果**：大部分曲目能自动对上，只有真的缺文件才 `exists: false`。
- **备注**：退化只做「定位」，不做归一化改名；`url` 用定位到的实际文件名生成。

## 15 · 立绘完整性是「骨骼 + 图集 + 贴图」三件套，不只看骨骼

- **位置**：`packages/server/src/config/packages.ts`（`readPackageSkeletons`）
- **表现**：只有一个 `.skel` 的目录被标记为可用，前端「预览」点进去才发现缺贴图。
- **解决方案**：`complete` =（`.skel` 或 `.json`）且 `.atlas` 且（`.png` / `.webp` / `.jpg` / `.jpeg`）；`.skel` 与 `.json` 并存时前端优先二进制。
- **原理**：预览需要三件套，缺任何一个渲染管线都会崩。
- **效果**：不完整的立绘直接禁用「预览」按钮并给出提示。
- **备注**：体积在列出阶段算好下发（见条目 20），展开时不用再请求。

---

# 四、API 与静态托管

## 16 · 资源包路由顺序不能乱

- **位置**：`packages/server/src/routes/packages.ts`
- **表现**：`/:id/music/:file(*)` 被 `/:id/music` 抢先匹配，音频请求拿到的是列表 JSON，而不是音频流。
- **解决方案**：带通配符的都放在同前缀的列表路由**之后**挂载：`/:id/music` 在前、`/:id/music/:file(*)` 在后；骨骼同理。
- **原理**：Express 的路由按挂载顺序匹配，先挂的优先。
- **效果**：列表与本体各归各的。
- **备注**：加新端点时先问「会不会被更泛的路由吃掉」。

## 17 · 未知 API 路由不能返回 HTML

- **位置**：`packages/server/src/app/mountClient.ts`
- **表现**：前端调错接口地址时收到 `index.html`，控制台报 JSON 解析失败，难以定位。
- **解决方案**：SPA fallback 里先判断 `req.path.startsWith('/api/')`——是则 `next()`（走 404），不是才下发 `index.html`。
- **原理**：fallback 的职责是让深层地址刷新不 404，不是兜底一切未知路径。
- **效果**：调错接口得到真正的 404 JSON。
- **备注**：`express.static` 的 `index: false` 是必须的，否则根路径会被静态中间件和 fallback 打架。

## 18 · 找前端产物不要只找一种布局

- **位置**：`packages/server/src/app/mountClient.ts`（`resolveClientDistPath`）
- **表现**：单文件 exe 或 Linux 发行包启动后页面是提示页（`Frontend build not found`），但产物明明在。
- **解决方案**：候选目录按序试（exe 同级 → `server/` 上级 → `cwd` → 开发时的 `packages/client/dist` 几种相对层级），以第一个含有 `index.html` 的为准。
- **原理**：三种打包形态的相对层级完全不同。
- **效果**：三形态都能托管前端。
- **备注**：候选顺序即优先级，不要「为了整齐」按字母排序。

## 19 · 错误文案必须中文且可读

- **位置**：`packages/server/src/routes/packages.ts`、`config.ts`、`preload.ts`
- **表现**：英文错误（`Preload asset not found in manifest`）出现在中文 UI 里，用户看不懂。
- **解决方案**：对外文案全部中文（`资源包不存在：<id>`、`立绘不存在：<skeletonId>`）；日志用 `[Our Archive]` 前缀 + 中文。
- **原理**：这些字符串会直接渲染到前端界面。
- **效果**：用户看到的是中文提示，前端可原样透出。
- **备注**：`failInternal` 把 `error.message` 直接下发——抛错前先想一遍这句文案要不要被用户看到。

## 20 · 下发文件要白名单 + `sendFile`，不要自己拼流

- **位置**：`packages/server/src/routes/packages.ts`（`MIME_BY_EXTENSION`、`sendFile`）、`config/packages.ts`（`readSkeletonDir`）
- **表现**：直接按扩展名下发会把 `.yml`、`.json` 索引、任意可执行文件都开放出去；自己 `createReadStream` 又丢了 Range。
- **解决方案**：`MIME_BY_EXTENSION` 白名单（图片 / 音频 / `.skel` / `.atlas` / `.json`），不在表里 404；下发用 `res.sendFile(target)`（自带 Range / 206）；`Cache-Control: no-cache`；文件体积在列表阶段算好（`statSync` 失败记 0，不影响列表）。
- **原理**：外载资源包来自第三方，不能假设都是可安全下发的文件；Range 是音频进度条可拖动的必要条件。
- **效果**：只下发已知可预览的文件类型，音频可 seek。
- **备注**：新文件类型先扩白名单再说，不要为单个文件类型放开全目录。

---

## 维护约定

- **新增坑**：按六段格式追加到对应分组，并更新顶部条目区间表。
- **修掉坑**：不要直接删除条目，改成在「效果」里注明「已由 X 取代」——这些坑大多是「删了代码就会复发」的类型。
- **跨端问题**：只影响前端的写进 `agents/client/`；同时影响两侧的（如 06）写在这里，并在前端文档里加一句指回本篇。

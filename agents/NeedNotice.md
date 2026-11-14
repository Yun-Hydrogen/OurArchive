# Our Archive — 踩坑总集（NeedNotice）

本文档记录本项目踩过的**难解 / 复杂 / 难以发掘**的坑。**改动相关代码前先扫一遍对应分组**——
很多坑是「看起来能删、删了就坏」的那类。条目**按主题分组，不区分前端 / 服务端**：一个功能
（例如「资源包试听」）的坑写在同一个分组里，位置一栏会同时给出两侧的模块路径。

每条按六段写：

1. **位置** — 出问题的模块 / 文件（服务端文件带 `.server.ts`）
2. **表现** — 未解决前能看到什么
3. **解决方案** — 怎么修的
4. **原理** — 为什么要这么修
5. **效果** — 修完是什么样
6. **备注** — 补充约定、相关条目、参考链接

**收录门槛**：只收「难以发现、或删掉就会复发」的深坑。通用框架常识、纯视觉偏好、
一次性实现技巧不收录。

| 分组 | 条目 |
| --- | --- |
| 一、启动 / 外壳 / 路由 | 01 – 07 |
| 二、路径 / 存储 / 配置 | 08 – 12 |
| 三、资源包索引与计数 | 13 – 17 |
| 四、API 与静态托管 | 18 – 22 |
| 五、资源管理页与资源包详情 | 23 – 28 |
| 六、主界面卡片动画 | 29 – 34 |
| 七、RizUI 集成 | 35 – 41 |
| 八、立绘骨骼预览（Spine） | 42 – 51 |
| 九、页面动画 / 构建 / 布局 | 52 – 55 |

---

# 一、启动 / 外壳 / 路由

## 01 · 音频必须由真实用户手势触发

- **位置**：`views/SplashView.vue`、`views/useSplashAudio.ts`、`modules/AudioPlayer/useBackgroundMusic.ts`
- **表现**：`main_bgm` 与标题音效的 `play()` 直接抛 `NotAllowedError`，控制台报自动播放被拒，首屏静音。
- **解决方案**：首屏必须有白屏引导层，`handleStart()` 在**点击回调里**才解除音频锁定并播放；`useSplashAudio.play()` 内部 `try/catch` 返回 `boolean`，失败不抛错。
- **原理**：Chrome / Safari 的 autoplay policy 要求媒体播放发生在「用户激活」（user activation）期间或其后续任务里；页面加载时的 `play()` 一律拒绝。
- **效果**：标题音效与 `main_bgm` 淡入正常；失败时静默降级，不会中断引导流程。
- **备注**：`useSplashAudio` 只播一次、不循环；背景音乐走模块级单例（`useBackgroundMusic.ts`）。

## 02 · 动画横幅不能当图片用（`<img src="x.svg">`）

- **位置**：`modules/Shell/OABannerSvg.vue`
- **表现**：把动画 SVG 当 `<img>` 引入时，动画要么已经播完，要么根本不动，且无法重播。
- **解决方案**：把 SVG **内联成 Vue 组件**；并把原 SVG 内部的 `<style>` 提到 SFC 顶层 `<style>` 块里。
- **原理**：图片内 SVG 在解码阶段就开始跑 SMIL / CSS 动画，渲染到页面时往往已结束；同时 `<img>` 隔离文档，外部无法重置。CSS 写在 SVG `<style>` 里则会被 Vue 的 SFC 编译丢掉（编译器只处理顶层 `<style>`）。
- **效果**：横幅随组件挂载开始播放，可通过 `:key` 重挂重播。
- **备注**：34KB 的矢量资源，所以单独成文件而不是内联进页面。

## 03 · banner 重播靠 `:key` 重挂

- **位置**：`modules/Shell/useAppShell.ts`、`modules/Shell/OABannerDock.vue`
- **表现**：从主界面返回 splash 时 banner 停在末帧，不会再播。
- **解决方案**：`playBannerAnimation()` 自增 `bannerPlayToken`，`OABannerDock` 内的 `<OABannerSvg :key="bannerPlayToken">` 随之卸载重挂。
- **原理**：CSS 动画只对「新插入的元素」自动从头开始；同一元素上无法用普通属性把动画复位（`animation: none` 重设要强制 reflow，不可靠）。
- **效果**：动画从头播，且动画版 SVG 全站只存在一份（外壳里），splash 只负责触发。
- **备注**：重播与 `useBannerSequence` 的 prompt 计时无关，二者独立。

## 04 · 入场动画用 `backwards`，不要用 `both`

- **位置**：`views/SplashView.vue`（`.splash-legal`）
- **表现**：版权文字入场正常，但离场时「向下飞出」完全不动，直接消失。
- **解决方案**：`animation-fill-mode: backwards`。
- **原理**：离场是用 `transition` 改 `opacity` + `translateY`；`animation-fill-mode: both` 会把入场动画的**末帧永久锁定**在元素上，而 CSS 动画的优交还属性。
- **效果**：入场后属性归位，离场 transition 恢复正常。
- **备注**：`.splash-prompt` 不受影响，因为它的离场位移写在父级 dock先级高于 `transition`，于是 transition 永远看不到变化。`backwards` 只在延迟期间生效，动画结束后 上。

## 05 · banner 停靠：两个状态的 `transform` 函数结构必须一致

- **位置**：`modules/Shell/OABannerDock.vue`
- **表现**：停靠过渡中途出现「斜着飘 + 变形」，或直接跳变。
- **解决方案**：舞台位与停靠位都写成同一套 `translate(-50%, -50%) translate(x, y) scale(s)`，只改参数。
- **原理**：浏览器对 `transform` 列表做插值时，函数个数与顺序不一致会退化为矩阵分解插值，旋转 / 缩放分量会被错误拆分。
- **效果**：插值是一条连续的位移 + 缩放，没有变形。
- **备注**：`dx / dy / scale` 由 `updateGeometry()` 按视口实时算，监听 `resize` + `ResizeObserver`；只动 `transform`，全程合成层。

## 06 · 路由闸门用内存态 + `replace`

- **位置**：`modules/ViewsManager/access.ts`、`modules/ViewsManager/router.ts`
- **表现**：直接访问 / 刷新 `/home`、`/resources` 等深层地址会绕过首屏引导；用 `push` 还会在历史栈里留下死链。
- **解决方案**：`isUnlocked` 是**纯内存**变量（不写 sessionStorage），`beforeEach` 拦截非 `splash` 路由并 `{ name: 'splash', replace: true }`。
- **原理**：持久化会让刷新后直接进内页，破坏「必须经过 gate」的入口契约；`replace` 才不会让返回键回到一条马上又被重定向的地址。
- **效果**：入口只有「端口号 + gate」一条路径，返回键行为可预期（`/home` 返回 → `/`）。
- **备注**：`/tools`、`/tools/skeleton`、`/resources` 及其子页面同样受约束。

## 07 · 启动选择在 dev / 非交互环境会挂住或读不到输入

- **位置**：`package.json`（根 `dev` / `dev:server` 两个脚本）、`src/modules/Initializer/spinePlugin.server.ts`（`askForChoice`）
- **表现**：`npm run dev` 里即使加了 `--handle-input`，仍然提示「当前不是交互式启动」；输入 A/B/C 没有反应。
- **原因**：① `concurrently` 给子进程的 stdin 是**管道**，`process.stdin.isTTY` 为假；② 原来的 `tsx watch` 自己监听 stdin 的 Return 键用于重启（`[tsx] Return key Restarting...`），会把输入吞掉。
- **解决方案**：server 的 dev 脚本改成 `node --watch --import tsx src/index.ts`（Node 内建 watch 会转发 stdin）；根 `dev` 脚本用 `cross-env OUR_ARCHIVE_INTERACTIVE=1` 允许管道 stdin 参与交互；`askWithTimeout()` 30 秒无输入时回退 `manual`。
- **原理**：`process.stdin.isTTY` 只表示「当前进程是否直接接终端」，管道 stdin 仍然可以读到 `concurrently` 转发来的输入；因此不能只靠 `isTTY` 判断。
- **效果**：`npm run dev` 下 A/B/C 可以正常选择；CI / 无输入环境 30 秒后默认 manual，不会永久卡死。
- **备注**：如果把 server dev 脚本换回 `tsx watch`，交互会再次失效；`OUR_ARCHIVE_SPINE_MODE=auto|manual|none` 可直接跳过询问。

# 二、路径 / 存储 / 配置

## 08 · Termux 下 `process.platform` 仍是 `linux`

- **位置**：`src/modules/Initializer/paths.server.ts`（`detectPlatform()`）
- **表现**：Android（Termux）上根目录落到 `/home/<用户名>/OurArchive`，数据写到没权限的地方，启动直接退出。
- **解决方案**：`process.platform === 'android'` **或** 存在 `TERMUX_VERSION` / `ANDROID_ROOT` 环境变量时才判定为 `android`。
- **原理**：Termux 里的 Node 是按 Linux 构建的，运行时 `process.platform` 只能给 `linux`；只有环境变量能区分。
- **效果**：Android 默认走 `/sdcard/OurArchive`。
- **备注**：千万不要探测 `/sdcard` 是否存在——普通 Linux 挂载点会误判。

## 09 · `resolvePreloadAssetsPath` 必须按顺序找，不要只找一种布局

- **位置**：`src/modules/Initializer/paths.server.ts`
- **表现**：开发期正常，打包成单文件 exe 或 Linux 发行包后提示「preload 不完整」，但资源明明随包分发了。
- **解决方案**：候选按固定优先级试——运行目录同级（单文件 exe）→ 运行目录父级（Linux/Android 的 `server/` 上级）→ `process.cwd()` → 相对上两级 → 客户端 `resources/`，第一个存在即用。
- **原理**：三种形态的目录层级完全不同，单一相对路径不可能在所有形态下都对。
- **效果**：三形态都能找到清单。
- **备注**：加新打包形态时往这个列表加候选，不要改成「只找仓库根」。

## 10 · 旧布局迁移必须「存在且新文件不存在」才复制

- **位置**：`src/modules/ConfigProvider/configStore.server.ts`（`migrateLegacyConfigDir`）
- **表现**：升级后用户的 `global_config.yml` 被覆盖成默认值，音量与渲染器模式全部重置。
- **解决方案**：旧文件（`configs/global_settings.yml`、`config/global_settings.yml`）存在且新文件**不存在**时才复制；复制失败只告警，之后尝试删除旧目录（失败忽略）。
- **原理**：新文件一旦存在就是用户的当前配置，任何情况下都不允许被旧文件覆盖。
- **效果**：升级零丢失；迁移失败不阻断启动。
- **备注**：**迁移失败不能抛错**，否则整个服务起不来。

## 11 · 预加载清单只认 `file_type`，不要兜底拼错的键

- **位置**：`src/modules/Initializer/preload.server.ts`
- **表现**：清单里写错成 `file_tpye` 时资源“缺失”，但文件明明在。
- **解决方案**：只认 `file_type`，缺失记 `'unknown'`；`id` 统一小写化后比对，路径剥离前导斜杠。
- **原理**：清单由开发者维护，拼写错属于清单本身的 bug，服务端兜底会掩盖它。
- **效果**：写错的清单立刻暴露为缺失，而不是悄悄通过。
- **备注**：路径用 `startsWith('preload')` 判断是否从根解析，否则落到 `preloadDir`——清单里 `file` 以 `preload/` 开头是约定。

## 12 · 手写 JSON / YAML 带 BOM 会让解析失败

- **位置**：`res/*/package.yml`、`res/*/characters/characters.json`、`res/*/index/music_info.json`、`res/*/index/category.yml`、表情的 `<path>/index/emotions.yml`（默认包里是 `emtions/index/emotions.yml`——目录名 `emtions` 是资源包作者写死的，`package.yml` 用 `path: emtions` 指过去）
- **表现**：资源包在列表里显示 `valid: false`，或者角色 / 音乐 / 背景分类数量为 0，但文件肉眼看着完全正常。
- **解决方案**：保存为 **UTF-8 无 BOM**；读取侧统一 `.replace(/^\uFEFF/, '')` 兜底（`PackageProvider/packageManifest.server.ts`、`CharacterProvider/characters.server.ts`、`AudioProvider/music.server.ts` / `sounds.server.ts`、`BackgroundProvider/backgrounds.server.ts`、`EmotionProvider/emotions.server.ts`）。
- **原理**：`JSON.parse` 遇到 BOM（`EF BB BF`）会直接抛 `Unexpected token`；YAML 解析器同样会出问题。Windows 上的 PowerShell 5.1 `Set-Content -Encoding utf8` 默认会写 BOM，是主要来源。
- **效果**：清单能正常解析，计数正确。
- **备注**：写这类文件优先用编辑器或带 `utf-8` 显式编码的脚本；Node 侧 `JSON.parse` 与 `parseYaml` 前都必须先剥 BOM。

# 三、资源包索引与计数

## 13 · 资源包 `id` 只允许一级目录名

- **位置**：`src/modules/PackageProvider/packageManifest.server.ts`（`resolvePackageDir`）
- **表现**：请求 `?package=../config` 或带分隔符的 id 能读到包外文件。
- **解决方案**：`safeId` 为空、`.`、`..` 或含 `[/\\]` 一律返回 `null`；且清单文件必须存在。
- **原理**：`id` 来自 URL 参数，是完全用户可控的输入；不校验就等于路径穿越。
- **效果**：越界请求直接 404。
- **备注**：所有下发路径都先过 `resolveInside()`，见条目 21。

## 14 · 扁平与嵌套两种 `package_content` 写法都要支持

- **位置**：`src/modules/PackageProvider/packageManifest.server.ts`（`parsePackageContents`）
- **表现**：作者换了一种写法后，内容分类列表变成空，前端什么都不显示。
- **解决方案**：先按嵌套（每项值是对象）解析；一项没有嵌套对象时回退到扁平：找第一个不在 `CONTENT_RESERVED_KEYS` 里的键作为分类键，字符串值当路径。
- **原理**：`package.yml` 由第三方作者手写，两种写法都出现过；只支持一种会整块丢数据。
- **效果**：两种写法都正确产出分类。
- **备注**：`CONTENT_RESERVED_KEYS` 必须要包含 `supported` / `path` / `index` / `avatar` / `name` / `description`，少一个就会把字段误当分类键。

## 15 · 计数口径要按分类特化，不要无脑数目录条目

- **位置**：`src/modules/PackageProvider/packageManifest.server.ts`（`countEntries`）
- **表现**：音乐条目数把 `index/` 和几百个音频文件都算进去，数字毫无意义；角色数把索引文件也算进去。
- **解决方案**：`hasCharacter` 优先读 `characters.json` 数组长度；`BackgroundMusic` 优先读 `index/music_info.json` 数组长度；读不到再回退一级条目数。
- **原理**：计数服务的是 UI 上的「N 个角色 / N 首曲目」，口径必须和列表的真实条目一致。
- **效果**：卡片上的计数与点进去的列表一致。
- **备注**：索引 JSON 坏了时回退目录条数，`exists` 仍为 true，不让 UI 误以为目录缺失。

## 16 · 贴图 / 音频文件名的退化匹配要逐级收紧

- **位置**：`src/modules/AudioProvider/music.server.ts`、`src/modules/AudioProvider/sounds.server.ts`（`resolveAudio`）
- **表现**：索引里只给了 `name_id` 而没有 `original_filename` 时，曲目全部「文件缺失」。
- **解决方案**：候选顺序——`original_filename` → `name_id + 原后缀` → 大小写不敏感同名 → 大小写不敏感前缀；每级都用 `resolveInside` 校验存在性。
- **原理**：外载索引的命名与磁盘文件名之间是冒号关系，没有唯一约定，只能按强度逐级回退。
- **效果**：大部分曲目能自动对上，只有真的缺文件才 `exists: false`。
- **备注**：退化只做「定位」，不做归一化改名；`url` 用定位到的实际文件名生成。

## 17 · 立绘完整性是「骨骼 + 图集 + 贴图」三件套，不只看骨骼

- **位置**：`src/modules/PackageProvider/skeletons.server.ts`（`readPackageSkeletons`）
- **表现**：只有一个 `.skel` 的目录被标记为可用，前端「预览」点进去才发现缺贴图。
- **解决方案**：`complete` =（`.skel` 或 `.json`）且 `.atlas` 且（`.png` / `.webp` / `.jpg` / `.jpeg`）；`.skel` 与 `.json` 并存时前端优先二进制。
- **原理**：预览需要三件套，缺任何一个渲染管线都会崩。
- **效果**：不完整的立绘直接禁用「预览」按钮并给出提示。
- **备注**：体积在列出阶段算好下发（见条目 21），展开时不用再请求。

# 四、API 与静态托管

## 18 · 资源包路由顺序不能乱

- **位置**：`src/modules/API/packagesRoutes.server.ts`
- **表现**：`/:id/music/:file(*)` 被 `/:id/music` 抢先匹配，音频请求拿到的是列表 JSON，而不是音频流。
- **解决方案**：带通配符的都放在同前缀的列表路由**之后**挂载：`/:id/music` 在前、`/:id/music/:file(*)` 在后；骨骼同理。
- **原理**：Express 的路由按挂载顺序匹配，先挂的优先。
- **效果**：列表与本体各归各的。
- **备注**：加新端点时先问「会不会被更泛的路由吃掉」。

## 19 · 未知 API 路由不能返回 HTML

- **位置**：`src/modules/Initializer/mountClient.server.ts`
- **表现**：前端调错接口地址时收到 `index.html`，控制台报 JSON 解析失败，难以定位；缺失的 `/plugins/spine/*.mjs` 也会拿到 HTML，动态 `import()` 报 MIME 错误。
- **解决方案**：SPA fallback 里先判断 `req.path === '/api'` / `startsWith('/api/')`，以及 `'/plugins'` / `'/plugins/'` 前缀——命中则 `next()`（走 404），否则才下发 `index.html`。
- **原理**：fallback 的职责是让深层地址刷新不 404，不是兜底一切未知路径。
- **效果**：调错接口得到真正的 404 JSON。
- **备注**：`express.static` 的 `index: false` 是必须的，否则根路径会被静态中间件和 fallback 打架。

## 20 · 找前端产物不要只找一种布局

- **位置**：`src/modules/Initializer/mountClient.server.ts`（`resolveClientDistPath`）
- **表现**：单文件 exe 或 Linux 发行包启动后页面是提示页（`Frontend build not found`），但产物明明在。
- **解决方案**：候选目录按序试（exe 同级 → `server/` 上级 → `cwd` → 开发时的 `dist/client` 几种相对层级），以第一个含有 `index.html` 的为准。
- **原理**：三种打包形态的相对层级完全不同。
- **效果**：三形态都能托管前端。
- **备注**：候选顺序即优先级，不要「为了整齐」按字母排序。

## 21 · 下发文件要白名单 + `sendFile`，不要自己拼流

- **位置**：`src/modules/API/packagesRoutes.server.ts`（`MIME_BY_EXTENSION`、`sendFile`）、`modules/PackageProvider/skeletons.server.ts`（`readSkeletonDir`）
- **表现**：直接按扩展名下发会把 `.yml`、`.json` 索引、任意可执行文件都开放出去；自己 `createReadStream` 又丢了 Range。
- **解决方案**：`MIME_BY_EXTENSION` 白名单（图片 / 音频 / `.skel` / `.atlas` / `.json`），不在表里 404；下发用 `res.sendFile(target)`（自带 Range / 206）；`Cache-Control: no-cache`；文件体积在列表阶段算好（`statSync` 失败记 0，不影响列表）。
- **原理**：外载资源包来自第三方，不能假设都是可安全下发的文件；Range 是音频进度条可拖动的必要条件。
- **效果**：只下发已知可预览的文件类型，音频可 seek。
- **备注**：新文件类型先扩白名单再说，不要为单个文件类型放开全目录。

## 22 · `/plugins` 必须绕开 SPA fallback，并且开发代理要带上

- **位置**：`src/index.ts`、`src/modules/Initializer/mountClient.server.ts`、`vite.config.ts`
- **表现**：插件缺失时动态 `import()` 拿到 `index.html`，浏览器报 MIME 错误；开发模式 5173 请求 `/plugins` 直接 404。
- **解决方案**：后端在 API 之前 `express.static(pluginsDir)`，并给 `.mjs` 显式设置 `text/javascript`；fallback 里 `/plugins/` 与 `/api/` 一样 `next()`；Vite 代理加 `/plugins`。
- **原理**：fallback 只该服务前端路由；模块脚本必须拿到 JS MIME 才能执行。
- **效果**：存在时 200 且 MIME 正确，缺失时干净的 404。
- **备注**：以后新增其他运行时插件目录，这三处要一起改。

# 五、资源管理页与资源包详情

## 23 · 卡片内的 `ResizeObserver` 要跟着节点重挂

- **位置**：`views/package/PackageView.vue`
- **表现**：侧边栏宽度永远是下限值（150px），或者 `onUnmounted` 报 `observe` 已断开。
- **解决方案**：`watch(cardEl, …, { flush: 'post' })` 里重新 `observe`，回调里宽度 `<= 0` 直接 `return`。
- **原理**：卡片的 `v-if` 会随 `loading` 卸载重挂，`onMounted` 里一次性绑定的节点随后就被移除了，回调拿到 0 宽（被 `clamp` 到下限）。
- **效果**：加载完成后宽度正确收敛。
- **备注**：`flush: 'post'` 是必须的，DOM 未更新时读不到尺寸。

## 24 · 重型接口必须按需加载

- **位置**：`modules/PackageProvider/usePackageContent.ts`
- **表现**：打开资源包要等半秒以上才出内容；`/skeletons` 一次就 287 KB。
- **解决方案**：进页面只拉「详情 + 角色」；`watch(activeSection)` 切到对应分类才 `loadSkeletons()` / `loadMusic()`，composable 内用 `skeletonsLoaded` / `musicLoaded` 去重。
- **原理**：`readPackageSkeletons()` 要对 631 个目录 `readdirSync` + 每个文件 `statSync`（约 2500 次），实测 **≈536 ms**；音乐索引 394 首 ≈366 KB。
- **效果**：首屏只花详情 + 角色的时间，其余分类点开才付。
- **备注**：文件清单也只在展开后渲染，631 × 3 条 DOM 不能全挂上。

## 25 · 音乐试听不能用 `@pause` 恢复主界面 BGM

- **位置**：`views/package/usePackagePreviewAudio.ts`、`modules/AudioPlayer/useBackgroundMusic.ts`
- **表现**：切歌 / 拖进度时背景音乐「闪一下」才被重新压住，听感是断续的爆音。
- **解决方案**：`main_bgm` 的 `resume()` 只走三个显式路径——暂停按钮、`@ended`、`stopMusic()`；`@pause` 只负责把 `isMusicPlaying` 置 false。
- **原理**：换曲时改 `<audio>.src` 也会触发一次 `pause`，于是「先恢复再压住」，中间那一瞬 `main_bgm` 出声了。
- **效果**：切歌全程静默，`main_bgm` 保持淡出状态。
- **备注**：`suspend()` / `resume()` 内部有模块级 `suspended` 标记，幂等。

## 26 · 试听用的 `<audio>` 要跟着分类组件一起挂载，播放态只能有一个来源

- **位置**：`views/package/usePackagePreviewAudio.ts`、`views/package/OAPackageMusic.vue`、`views/package/OAPackageSounds.vue`
- **表现**：音效区点播放键毫无反应（音乐区正常）；或者音乐 / 音效两行同时显示「正在播放」，进度条与高亮互相打架；或者播完一次后再点不响。
- **解决方案**：
  1. 音乐与音效**各自**在自己的模板里放 `<audio ref="audioEl">`——两者靠 `v-if` 互斥挂载，同一时刻只有一个实例，不需要跨组件共享元素；但**不要**提升到分类分支之外的页面根部，也不要让两个分类共用同一份状态；
  2. 每个 `usePackagePreviewAudio()` 实例只保留一个 `playingId: string`，用 `isPlayingTrack(id)` 判断高亮、图标、进度条——**不要**为音乐和音效各留一个 `playingXxxId`；
  3. `@ended` 里必须 `playingId = ''` 且 `currentTime = 0`。
- **原理**：`ref` 只在节点挂载期间有值。音频元素写在「背景音乐」分支里、却让「音效」分支去操作它时，切分支后它就随 `v-if` 卸载，`audioEl.value === null`，`toggle()` 直接 `return`（看起来就是按钮失灵）；而两个独立 id 又会互相不清理，导致同一时刻两行都认为自己正在播。播完不清状态时 `paused === true` 但 `currentTime` 停在末尾，再 `play()` 立刻又结束，听感同样是「没反应」。
- **效果**：每个分类组件自带一份「元素 + 状态」，互斥挂载保证同一时刻只会有一条高亮；切分类 / 卸载时 `onBeforeUnmount(stop)` 顺带把主界面 BGM 恢复回来。
- **备注**：`stop()` 里 `removeAttribute('src')` 是必要的；只 `pause()` 的话换 `src` 前的旧缓冲会残留。

## 27 · `<img>` 不能当图层容器

- **位置**：`modules/EmotionRender/OAEmotionPlayer.vue`
- **表现**：表情的第二层（子层）永远不显示，`getBoundingClientRect().width === 0`，`transform` 也是 `none`。
- **解决方案**：每层用 `div` 当容器，图片作为它的子节点（`width: 100%`），子层 append 到父层的 `div` 里。
- **原理**：`<img>` 是替换元素（replaced element），它的子节点不参与渲染，`appendChild` 不会报错但永远是 0 尺寸。
- **效果**：`Heart = 气球 + 爱心`、`Bulb = 气球 + 灯泡 + 光圈` 这类多层合成正常叠放。
- **备注**：`canvas` / `video` / `iframe` 同理，都不要往里塞子节点。

## 28 · canvas 的 `height: 100%` 在「靠 flex 撑开」的父级里不生效

- **位置**：`modules/EmotionRender/OAEmotionPreview.vue`
- **表现**：舞台容器已经 600+ px 高，但 canvas 只有 `min-height` 那么高（280px），角色看起来被裁了一截；表情锚点也算在错误的位置。
- **解决方案**：给 `.oa-emo__stage` 一个**确定高度**（`height: clamp(300px, 52vh, 620px)`），不靠 `flex: 1` 撑；canvas 的 `height: 100%` 才能解析出正确值。
- **原理**：百分比高度要相对「高度可解析」的包含块计算；`flex: 1` + `flex-basis: 0` 的父级在部分布局下被当成高度不确定，canvas 退回默认 150px / 自身 `min-height`。
- **效果**：canvas 与舞台等高，`useSpineStage` 量到的 `viewHeight` 与 DOM 一致，表情锚点正确。
- **备注**：`ResizeObserver` 只在尺寸真的变化时才会纠正，父级高度算错时它不会「猜」出正确值。

# 六、主界面卡片动画

## 29 · 叠卡位移挂在 `.oa-slot`，不要挂在 `.oa-card`

- **位置**：`views/HomeView.vue`
- **表现**：hover 或叠卡切换时卡片「弹回原位」，叠卡层级视觉错乱。
- **解决方案**：所有位移 / 缩放 / 入场动画都落在 `.oa-slot` 这一层；`.oa-card` 自身不带任何 `transform`。
- **原理**：`transform` 是替换而不是叠加，`.oa-card` 上任何位移都会覆盖叠卡的 `translateX(var(--peek-x))`。
- **效果**：叠卡位移稳定，鼠标划过也不跳。
- **备注**：卡片交互只保留 `cursor: pointer` 与 `:focus-visible` 焦点环。

## 30 · `--peek-s` 必须写进关键帧的尾帧

- **位置**：`views/HomeView.vue`、`views/ToolsView.vue`、`views/ResourcesView.vue`
- **表现**：入场动画结束的瞬间，被压住的卡「弹一下」再回位，看起来像重绘。
- **解决方案**：入场 / 离场关键帧首尾都写 `translateX(var(--peek-x)) scale(var(--peek-s, 1) * k)`。
- **原理**：关键帧若只写 `scale(k)`，末帧就是 `scale(1)`；动画结束移除 class 后元素回到 `scale(.98)`，产生跳变。
- **效果**：动画与静态状态无缝衔接。
- **备注**：`--peek-x` 同理。

## 31 · `--enter-delay` 只能写在 `animation-delay`

- **位置**：`views/HomeView.vue`
- **表现**：入场没问题，但之后每次切换叠卡都变慢。
- **解决方案**：只用于 `animation-delay`，**不要**写成 `.oa-slot` 的 `transition-delay`。
- **原理**：`transition-delay` 会作用于该元素之后**所有**的 transition，包括叠卡切换。
- **效果**：入场错峰保留，切换响应即时。
- **备注**：错峰值来自 `modules/Shell/shellTiming.ts` 的 `cardsEnterBase`。

## 32 · 被压住的卡不能 `pointer-events: none` 或提高 `z-index`

- **位置**：`views/HomeView.vue`
- **表现**：点右侧露出的窄边无法切换卡片，所有点击都落到前景卡。
- **解决方案**：命中区完全依赖 `z-index` 分层（`.is-active` 为 2，其余 1），不额外禁用指针事件。
- **原理**：窄边属于被压住的卡，一旦禁用指针事件或抬高层级，点击就被前景卡吃掉。
- **效果**：点击窄边正常翻面。
- **备注**：窄边宽度由 `--peek` 与 `--peek-s` 共同决定。

## 33 · 离场要先播完再 `router.push`

- **位置**：`views/HomeView.vue`、`views/ToolsView.vue`、`views/ResourcesView.vue`
- **表现**：点入口时卡片飞到一半就被切断，或者根本没看到动画。
- **解决方案**：先置 `isLeaving = true` 播 `oa-slot-out` / `oa-card-out`，等 `SHELL_TIMING.cardsExitWait`（320ms）再真正跳路由。
- **原理**：没有跨路由过渡容器（不是 `<Transition>` 包裹的 router-view），组件卸载即停止绘制，晚跳才能看到完整动画。等待时长必须略大于「`cardsExit`(260ms) + 最大错峰延迟」。
- **效果**：主页 → 子页面 → 主页形成一条连续的卡片动线。
- **备注**：`isLeaving` 是幂等闸门，连点只跳一次；`onBeforeUnmount` 要清定时器。

## 34 · `.oa-slot` 常驻 `translateZ(0)`

- **位置**：`views/HomeView.vue`
- **表现**：入场动画结束、class 被移除时卡片闪一下，字体抗锯齿也变了。
- **解决方案**：`.oa-slot` 常驻 `transform: translateZ(0)` 与 `-webkit-font-smoothing: antialiased`。
- **原理**：动画结束后浏览器会回收临时的合成层，重新走一次光栅化与字体抗锯齿策略。
- **效果**：动画结束无重绘跳变。
- **备注**：代价是常驻合成层，卡片数量多时留意显存。

# 七、RizUI 集成

## 35 · 亮色主题要在 `<html>` 上钉死；组件不要再写 `theme="Light"`

- **位置**：`index.html`、`style.css`、所有用 RizUI 的组件
- **表现**：系统开启深色模式时整站变黑（白卡片配黑控件）；或者同一个组件在不同页面颜色不一致。
- **解决方案**：`index.html` 写 `<html data-rizui-theme="light">`，`style.css` 的 `:root` 加 `color-scheme: light`；组件上一律不写 `theme`。
- **原理**：RizUI 的主题解析全在 CSS：`:root` 是亮色 token，`:root[data-rizui-theme=dark]` 切暗色，并且还有一段 `@media (prefers-color-scheme: dark) { :root:not([data-rizui-theme=light]) { … } }`。属性写在 `index.html` 上才能在首帧前生效（没有亮→暗→亮闪动）。组件的 `theme` prop 默认 `auto`，解析成 `undefined`、不输出属性，因此继承 `:root`。
- **效果**：全站恒亮色；原生控件（滚动条、输入框、下拉箭头）也被 `color-scheme` 锁亮。
- **备注**：`--rizui_themecolor: var(--oa-blue)` 保留，让组件主色跟随全站蓝。

## 36 · `rizui_nav` 的 `width` 必须是数字

- **位置**：`views/package/PackageView.vue`（`:width` 交给 `OAPackageNav.vue`）
- **表现**：传 `"20%"` 之类的字符串时侧边栏宽度变成 0 或塌陷。
- **解决方案**：用 `ResizeObserver` 观察卡片宽度，算出**像素数字**（`clamp(150px, 20%, 226px)`）再传给 `:width`。
- **原理**：`rizui_nav` 内部用 `parseFloat(width)` 处理，百分比串解析成 `NaN`，最终算成 0。
- **效果**：侧边栏宽度随卡片自适应，长学院名靠 `.rnav-label` 的 ellipsis 兜底。
- **备注**：`height="100%"` 是字符串，但它对非 `100vh` 的字符串是直接透传的，不受影响。

## 37 · `rizui_nav` 选中子条目会写回 `modelValue`

- **位置**：`views/package/PackageView.vue`
- **表现**：点一次学院子条目后，右侧内容变成空白——`activeSection` 被污染成 `school:xxx`，`v-if` 分支全部失效。
- **解决方案**：不要把 `v-model` 直接绑 `activeSection`，改用带写入闸门的可写 computed `navModel`：带 `school:` 前缀的赋值直接丢弃。
- **原理**：`rizui_nav` 是受控组件，点击子条目会把 `modelValue` 更新为子条目 id；父层如果原样接收，语义上的「当前分类」就被子项覆盖了。
- **效果**：子条目照样能展开 / 定位，分类始终停在有效值上。
- **备注**：`@select` 里再单独处理「滚动到学院」的逻辑。

## 38 · `rizui_card` 不能折叠；自己实现时 `0fr` 必须配 `min-height: 0`

- **位置**：`views/package/OAPackageCharacters.vue`（学院分组）
- **表现**：想给卡片加「点击表头展开 / 收起」时无处下手。
- **解决方案**：
  - 外层容器挂 `@click`，只在 `event.target.closest('.ct-card-head')` 命中时切换；
  - 箭头用 `.ct-card-head::after` 旋转（`45deg` ↔ `-135deg`）；
  - 内容包一层 `.oa-school__collapse`，用 `grid-template-rows: 0fr → 1fr` + `opacity` 过渡，**内层必须 `min-height: 0; overflow: hidden`**；
  - 把 `.ct-card-body` 的 `margin-top` 置 0，间距改由展开时的内层 `padding-top` 提供。
- **原理**：`0fr → 1fr` 让 grid 轨道高度从 0 插值到内容高度，是「未知高度也能过渡」的通用做法；没有 `min-height: 0` 时内层不收缩，动画会失效。
- **效果**：折叠有完整过渡，点内容区不会误触发。
- **备注**：631 × N 的列表还要配合「只在展开后渲染内容」，否则 DOM 会爆。

## 39 · `rizui_dropdown` 的弹层是非 teleport 的绝对定位

- **位置**：`modules/SkeletonRender/OASpineViewer.vue`、`modules/EmotionRender/OAEmotionPreview.vue`
- **表现**：放在 `overflow-y: auto` 的侧栏里，下拉选项被裁掉一半。
- **解决方案**：侧栏内改用横排 chips（动作项只有 2~3 个）；实在要下拉就保证父级不滚动、不 `overflow: hidden`。
- **原理**：弹层是普通绝对定位子节点，会被最近的 `overflow` 祖先裁切，且不跟随滚动。
- **效果**：选项完整可见，视觉也和差分 chips 统一。
- **备注**：设置弹窗里的下拉没有被裁，是因为卡片本身不是滚动容器。

## 40 · `rizui_timeline` 的 `update:modelValue` 是「秒」

- **位置**：`views/package/usePackagePreviewAudio.ts`（音乐 / 音效进度）
- **表现**：拖动进度条后播放位置乱跳 / 直接到结尾，或者画面不跟手。
- **解决方案**：`:min="0"`、`:max="musicDuration || 1"`、`:step="1"`，`@update:model-value` 拿到的新值**直接写 `audio.currentTime`**。
- **原理**：`rizui_timeline` 的模型值就是时间轴上的秒数（不是 0–100 的百分比），`aria` / 刻度也按这个量纲走。
- **效果**：拖动是真正的 seek（后端 `res.sendFile()` 带 `Accept-Ranges`，返回 206）。
- **备注**：`max` 在元数据到达前是 0，必须给 `|| 1` 兜底，否则组件除零。

## 41 · 全局滚动条：标准属性与 `::-webkit-scrollbar` 不能隔开

- **位置**：`style.css`
- **表现**：Firefox 是细条、Chrome 是粗条；或者 RizUI 组件内部（`.rnav-body` 等）仍是 4px 灰条。
- **解决方案**：
  - 同时写 `* { scrollbar-width: thin; scrollbar-color: var(--oa-scroll-thumb) transparent }` 与 `*::-webkit-scrollbar` 系列；
  - **不要**用 `@supports not selector(::-webkit-scrollbar)` 把标准属性隔开；
  - RizUI 自带的滚动条规则带 `data-v` 属性、特异性更高，伪元素那几条统一加 `!important`。
- **原理**：Chrome 121+ 同时支持两套，但只要元素上有 `scrollbar-width` / `scrollbar-color` 就会**忽略 `::-webkit-scrollbar`**；用 `@supports` 隔开反而让 Chrome 走伪元素、Firefox 走标准属性，与 RizUI 组件里的表现不一致。RizUI 自己就是「两套同时写」。
- **效果**：全站与 RizUI 组件外观一致（8px、透明轨道、蓝色半透明滑块）。
- **备注**：规格变量集中在 `--oa-scroll-size / --oa-scroll-thumb / --oa-scroll-thumb-hover`。

# 八、立绘骨骼预览（Spine）

## 42 · canvas 渲染成本 = 三角形数（这是最核心的一条）

- **位置**：`modules/SkeletonRender/canvasBackend.ts`、`modules/SkeletonRender/webglBackend.ts`
- **表现**：阿罗娜、普拉娜的立绘明显的掉帧（个位数 fps），其他角色正常。
- **解决方案**：默认走 WebGL 后端（`spine-webgl` 的 `PolygonBatcher` 合批），canvas 2d 只作「保守」模式与兜底。
- **原理**：`spine-canvas` 的 `triangleRendering` 对**每个三角形**做一次 `save + transform + clip + drawImage(整页 2048² 贴图) + restore`，成本与三角形数线性相关。全库 631 个骨骼实测（setup pose 下真实绘制的三角形/帧）：`arona_spr` 阿罗娜 202 骨 / 80 附件 → **5863**；`np0035_spr` 普拉娜 315 骨 / 89 附件 → **5463**；第三名 `np0186_spr` 只有 377（14 骨 / 17 附件）；全库平均 **126**（3~7 骨 / 5~10 附件）。只有这两个「真动态」立绘是其他角色的 40~80 倍，每帧 5000+ 次 clip+drawImage 必然掉到个位数帧率。
- **效果**：5863 次 draw call 合成 1~2 次，满帧；Spine 运行时只进入异步路由 chunk，且现在从本地插件目录动态加载。
- **备注**：模式由设置项 `spine_renderer` 控制（`aggressive` 仅 WebGL / `stable` 优先 WebGL / `conservative` 仅 canvas 2d）。

## 43 · 直通 alpha 图集 + mipmap = 细线变粗发黑

- **位置**：`modules/SkeletonRender/webglBackend.ts`
- **表现**：阿罗娜脸上的腮红线条明显变粗、发黑；发丝边缘出现暗边。整张图的其他颜色却是对的。
- **解决方案**：走**预乘 alpha（PMA）**管道，三条必须同时成立 —— ① 解码：`createImageBitmap(file, { premultiplyAlpha: 'premultiply' })`；② 上传：`GLTexture.DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL = true`（**名字是反的**：置 true 才会 `pixelStorei(UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)`，避免二次预乘）；③ 渲染：`SkeletonRenderer.premultipliedAlpha = true`（混合变成 `ONE / ONE_MINUS_SRC_ALPHA`，加法用 `ONE / ONE`）。三者齐备之后才允许 `USE_MIPMAPS = true`。canvas 2d 后端**不能**吃预乘贴图，所以 `bindTextures` 的契约是「页名 → 文件」，由各后端自己解码。
- **原理**：BA 图集的透明区 RGB 是黑的（实测 2048² 里采样 421 257 个全透明像素，**23.7% 精确为 `(0,0,0)`**，其余全是近黑）。mipmap 是按 RGB 做盒式平均的，于是每级 mip 都把「透明黑」平均进半透明边缘；区域之间只有 1px 留边，还会跨区域串色。预乘之后半透明像素的 RGB 已经乘过 alpha、透明像素是真正的零贡献，平均才是正确的。
- **效果**：细线恢复正常粗细与颜色，缩小采样也平滑（不再为了躲色边而关掉 mipmap）。
- **备注**：只改其中一个开关的表现分别是「整体偏暗」「边缘发黑」「细节变粗」——排错时先确认这三处是否一致。

## 44 · WebGL 能力要先用一次性 canvas 探测

- **位置**：`modules/SkeletonRender/backend.ts`（`canUseWebGL()`）
- **表现**：「稳定」模式下本该回退 canvas 2d，结果两个后端都起不来。
- **解决方案**：先用 `document.createElement('canvas')` 试 `getContext('webgl2') ?? getContext('webgl')`，拿到后 `WEBGL_lose_context.loseContext()` 立刻释放；确认可用才动正式画布。
- **原理**：在正式画布上尝试 WebGL 失败时可能已经占用了上下文槽位，此时再要 2d 也拿不到——回退路径被自己堵死。
- **效果**：不支持 WebGL 的环境能干净地落到 canvas 2d。
- **备注**：探测产生的上下文记得主动丢弃，避免占满浏览器的上下文配额。

## 45 · Spine 运行时不能进 npm 依赖，只能由用户目录动态加载

- **位置**：`package.json`、`src/modules/Initializer/spinePlugin.server.ts`、`src/modules/SkeletonRuntimeProvider/runtime.ts`
- **表现**：把 `@esotericsoftware/spine-*` 加回依赖，运行时会被打进构建产物，与 Spine Runtimes License 的再分发条款冲突。
- **解决方案**：首次启动检测 `<root>/plugins/spine/`，缺失时说明协议并给出 `auto`（自动下载）/ `manual`（手动放入）/ `none`（强制无 Spine）三种选择；前端用带 `/* @vite-ignore */` 的动态 `import('/plugins/spine/*.mjs')` 加载。
- **原理**：许可允许集成，但要求每个使用者自行取得 Spine Editor 许可、再分发时保留许可证；把下载交给用户并保留 `LICENSE`，发行包就不包含运行时。
- **效果**：`package.json` 与 `package-lock.json` 里没有 `@esotericsoftware/*`，前端产物也不含运行时。
- **备注**：不要为了「离线可用」把下载得到的文件提交进仓库，也不要改成构建期 alias；浏览器不能执行 `.ts`，所以检查的是官方 ESM 产物 `.mjs`。运行时版本由后端固定，升级时改版本号并对照 `modules/SkeletonRuntimeProvider/spineTypes.ts` 的最小接口。

## 46 · 一次立绘只能使用同一份运行时（core 不能混用）

- **位置**：`src/modules/SkeletonRender/backend.ts`、`modules/SkeletonRender/useSpineStage.ts`
- **表现**：用 WebGL 包解析骨骼、却用 Canvas 包渲染时，内部 `instanceof` 判定全为 `false`，画面空白但不报错。
- **解决方案**：`createSpineBackend()` 返回 `{ backend, runtime }`；`Skeleton` / `TextureAtlas` / `AnimationState` / `AttachmentTimeline` 全部取自返回的 `runtime`，解析与渲染只用同一份。
- **原理**：`spine-webgl.mjs` 与 `spine-canvas.mjs` 各自打包了一份 spine-core，两个 bundle 的同名类不是同一个构造器。
- **效果**：两条渲染路径各自自洽，WebGL 失败回退 Canvas 也正常。
- **备注**：`src/modules/SkeletonRuntimeProvider/spineTypes.ts` 只声明本项目用到的最小接口，不要复制运行时类型。

## 47 · `TextureAtlas` 在 4.2 只接受文本，贴图要自己 `setTexture()`

- **位置**：`modules/SkeletonRender/useSpineStage.ts`、两个 backend 的 `bindTextures`
- **表现**：载入时报「无法读取 undefined 的 getImage」或在 `region.texture` 处崩溃。
- **解决方案**：`new TextureAtlas(text)` 之后必须逐页 `page.setTexture(...)`（canvas 用 `CanvasTexture`，WebGL 用 `GLTexture`），之后才能 `new AtlasAttachmentLoader(atlas)`。
- **原理**：4.2 的 `TextureAtlas` 只解析文本，不加载图片；region 的 `texture` 引用 page 上的贴图，page 没贴图就是 `null`。
- **效果**：两条渲染路径都能正常贴图。
- **备注**：`page.setTexture()` 会把贴图回填到该页的所有 region，所以顺序必须在 `AtlasAttachmentLoader` 之前。

## 48 · 不要再额外翻一次 Y

- **位置**：`modules/SkeletonRender/useSpineStage.ts`
- **表现**：立绘上下颠倒，或者整体镜像。
- **解决方案**：只用 `skeleton.scaleY = -scale` 把 y 轴向上的骨骼翻到画布坐标系；**不要**在外层再 `ctx.scale(1, -1)`。
- **原理**：Spine 的 region 绘制内部本来就带一次 `scale(1, -1)`，外层再翻一次会把它抵消掉。
- **效果**：立绘方向正确。
- **备注**：WebGL 侧投影用 `Matrix4.ortho(0, w, h, 0, 1, -1)`（y 轴向下），与 canvas 2d 语义一致，不要再引入额外的翻转。

## 49 · `readEntries` 一次最多返回 100 条

- **位置**：`modules/SkeletonRender/spinePackage.ts`
- **表现**：拖入整个 `skeletons/` 根目录时静默丢文件，识别出的角色少了一大半，还不报错。
- **解决方案**：循环 `readEntries` 直到返回空数组为止。
- **原理**：FileSystem API 的分批约定，不是错误而是设计。
- **效果**：大目录能完整展开（整个 `skeletons/` 600+ 个目录可直接拖入）。
- **备注**：`toSpineFilesFromDrop()` 里递归展开时同样要处理。

## 50 · 快速换角色要用 `loadToken` 丢弃过期载入

- **位置**：`modules/SkeletonRender/useSpineStage.ts`
- **表现**：连续点几个角色后，画面显示的骨骼和面板显示的 id 对不上。
- **解决方案**：每次 `load()` 自增 `loadToken`，每个 `await` 之后比对一次，不一致就 `return`；`onBeforeUnmount` 也自增一次并 `disposeStage()`。
- **原理**：解析图集 / 骨骼都是异步的，先发起的请求可能后返回，直接写共享状态就会互相覆盖。
- **效果**：永远只显示最后一次选择的角色。
- **备注**：`disposeStage()` 同时负责停 `requestAnimationFrame`、断开 `ResizeObserver`、释放 GL 贴图与着色器。

## 51 · 「静态」模式要按需重绘

- **位置**：`modules/SkeletonRender/useSpineStage.ts`
- **表现**：选「静态（不播放动作）」时 GPU / CPU 仍然满载，笔记本风扇狂转。
- **解决方案**：`needsRedraw` 脏标记——差分、动作、缩放、平移、调试开关、尺寸变化时置位；未播放动作且不脏就直接跳过绘制（`requestAnimationFrame` 仍在，但几乎不做事）。播放动作时每帧照常 `state.update()`。
- **原理**：静态姿势下画面完全不变，重绘纯属浪费；315 根骨的 `updateWorldTransform` 也不便宜。
- **效果**：静态预览几乎零开销。
- **备注**：新增任何会影响画面的状态时**必须**置 `needsRedraw`，否则表现为「改了没反应」。

# 九、页面动画 / 构建 / 布局

## 52 · 进度条消失后内容不能硬切

- **位置**：`modules/ViewsManager/useEnterAnimation.ts`、`style.css` 的 `oa-swap` / `oa-fade`，以及资源管理、资源包、角色详情、立绘预览等页
- **表现**：本地接口很快，进度条一闪而过；或者请求稍慢时，进度条走到头、卡片直接出现，没有飞入动画。返回上一页时也有页面整页硬切。
- **解决方案**：入场动画的计时不要从 `onMounted` 起算，要用 `useEnterAnimation(() => !loading.value, 时长)` 等数据就绪后再播；「加载态 ↔ 内容」用 `<Transition name="oa-swap" mode="out-in">`，绝对定位遮罩用 `oa-fade`。
- **原理**：Vue 只在元素挂载时触发 CSS 动画，把 `is-entering` 按固定 timer 撤掉后，晚到的内容挂载时已经没有入场态；进度条卸载同样需要过渡才会淡出。`mode="out-in"` 保证淡出结束后内容才挂载，避免两段内容同时占位跳动。
- **效果**：进度条淡入淡出，卡片在内容出现后才飞入；SkeletonPreviewView 返回上一页也有淡出。
- **备注**：时长要覆盖「淡出 180ms + 最大错峰延迟 + 动画时长」；错峰延迟要封顶（见 `cardDelay`），否则列表很长时最后一张会被截断。

## 53 · 点父级条目去操作还没挂载的子组件 = 静默失效

- **位置**：`views/package/PackageView.vue` 的 `focusSchool()` / `views/package/OAPackageCharacters.vue` 的 `focus` prop
- **表现**：点侧边栏某个学院，分类切回「角色」了，但那个学院没展开、也没高亮——看起来像定位逻辑坏了。
- **解决方案**：页面不直接调子组件方法，而是把意图当 prop 传下去：`focus = { school, token }`（`token` 自增，重复点同一个学院也能触发），子组件 `watch(() => props.focus?.token, …, { immediate: true })` 展开内容后 `emit('opened', school)`，页面再滚动 + 高亮。
- **原理**：从别的分类切过来时目标组件还没挂载，模板 `ref` 是 `null`，`ref.value?.method()` 会被可选链吞掉；即使挂载了，懒挂载的折叠内容也要等一次 `nextTick` 才有 DOM，所以「展开 → 回吐 → 再定位」必须是两段。
- **效果**：任意分类下点学院子条目都能切换 + 展开 + 滚动 + 高亮；连点同一学院仍然生效。
- **备注**：`handleSchoolOpened` 里要把 `focus` 清空，否则下次重新挂载角色面板会把上次的学院又展开一遍。

## 54 · 纵向 flex 里的 `flex: 3 1 0` 会把子块压成 0 高

- **位置**：`modules/EmotionRender/OAEmotionPreview.vue` 的 `@media (max-width: 900px)`
- **表现**：窗口宽度 ≤900px 时表情区的舞台整块消失（实测只剩 2px 高），「选择角色」按钮被右侧面板盖住点不到。
- **解决方案**：媒体查询里把 `.oa-emo` 改成 `flex-direction: column` 的同时，`.oa-emo__stage-box` 必须从 `flex: 3 1 0` 改回 `flex: 0 0 auto`。
- **原理**：`flex: 3 1 0` 的 `flex-basis: 0` 作用在**主轴**上。横向排列时主轴是宽度（由容器宽度分配，正常）；改成纵向后主轴变成高度，而容器高度由内容撑开（父级 `flex: 0 0 auto`），可分配空间为 0，加上 `flex-shrink: 1` 就把舞台压到了 0；面板是 `flex: 0 0 auto` 不缩，于是只剩它。
- **效果**：窄窗口下舞台按自身的 `clamp(300px, 52vh, 620px)` 撑高，面板落到它下面（栏目式排布）。
- **备注**：改响应式方向时，凡是用 `flex: <n> 1 0` 的子项都要重新确认一次主轴语义。

## 55 · 发行包的服务端产物必须是 `.cjs` + 依赖内联

- **位置**：`scripts/package.js`、`tsup.release.config.ts`
- **表现**：发行包双击 / `./start.sh` 起不来，三种失败各不相同：
  1. `SyntaxError: Cannot use import statement outside a module`（`server/index.js` 是 ESM，但发行目录没有 `"type":"module"` 的 package.json）；
  2. `ERR_MODULE_NOT_FOUND: Cannot find package 'express'`（依赖被 tsup 当外部依赖留在 bundle 里）；
  3. `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: express`（Windows SEA 的 `require` 只认内置模块）；
  4. 若改成 `.mjs` 来躲第 1 条，又会撞上 `Dynamic require of "path" is not supported`（express 等 CJS 依赖在 ESM 输出里的运行时 `require`）。
- **解决方案**：`tsup.release.config.ts` 里 `noExternal: [/.*/]` 内联全部依赖，产物固定为 **CJS** 并命名为 `server/index.cjs`；三个平台共用同一个 bundle（Windows 直接塞进 `pkg --sea`，Linux / Android 复制成 `server/index.cjs`）。打包脚本还会扫一遍 bundle，残留非内置模块的 import / require 就直接失败。
- **原理**：发行包里没有 `node_modules`，也没有包自身的 `package.json`——模块解析的两种兜底（上溯 node_modules、`type` 字段）同时失效。`.cjs` 是唯一无歧义的 CommonJS 扩展名，而 CommonJS 输出里 `require` 是原生的，不用 esbuild 的 `__require` 垫片。
- **效果**：三个平台的发行包都能在**干净目录**（无 node_modules、无仓库）里启动，`/`、`/api/*`、`/plugins/*` 全部正常。
- **备注**：**这个坑在仓库里 100% 测不出来**——仓库根的 `"type": "module"` 让裸 `.js` 合法，上层的 `node_modules` 又让外部依赖能解析，所以本地 `node dist_release/.../server/index.js` 会「蒙对」。冒烟必须把发行目录**复制到仓库外**再跑。`npm run build:server` 产出的 `dist/server/index.js` 不受影响（它在仓库内，靠根 `package.json` 就是合法的 ESM）。

---

## 维护约定

- **新增坑**：按六段格式追加到最贴合的分组；没有合适分组就新开一组，并更新顶部索引表。
- **删条目**：只有确认是常识性 / 非常识判断才删；真正的坑不要删，改成在「效果」里注明「已由 X 取代」——这些坑大多是「删了代码就会复发」的类型。
- **跨端问题**：写一条就够。位置一栏把前端与 `*.server.ts` 的文件都列出来，不要再拆成两份文档。
- **引用条目**：写「见条目 NN」时用合并后的连续编号；改编号后记得 `grep -rn '条目 ' src agents docs` 全部改掉。

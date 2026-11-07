本文档记录了 前端 踩过的比较难解/复杂/难以发掘的坑，供后续开发者参考。
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
| 一、启动 / 外壳 / 路由 | 01 – 10 |
| 二、主界面卡片动画 | 11 – 16 |
| 三、RizUI 集成 | 17 – 25 |
| 四、资源管理 / 资源包 | 26 – 32 |
| 五、立绘骨骼预览（Spine） | 33 – 44 |
| 六、构建 / 资源 / 数据 | 45 – 46 |

---

# 一、启动 / 外壳 / 路由

## 01 · 音频必须由真实用户手势触发

- **位置**：`views/SplashView.vue`、`composables/useSplashAudio.ts`、`composables/useBackgroundMusic.ts`
- **表现**：`main_bgm` 与标题音效的 `play()` 直接抛 `NotAllowedError`，控制台报自动播放被拒，首屏静音。
- **解决方案**：首屏必须有白屏引导层，`handleStart()` 在**点击回调里**才解除音频锁定并播放；`useSplashAudio.play()` 内部 `try/catch` 返回 `boolean`，失败不抛错。
- **原理**：Chrome / Safari 的 autoplay policy 要求媒体播放发生在「用户激活」（user activation）期间或其后续任务里；页面加载时的 `play()` 一律拒绝。
- **效果**：标题音效与 `main_bgm` 淡入正常；失败时静默降级，不会中断引导流程。
- **备注**：`useSplashAudio` 只播一次、不循环；背景音乐走模块级单例（见 08）。

## 02 · 动画横幅不能当图片用（`<img src="x.svg">`）

- **位置**：`components/splash/OABannerSvg.vue`
- **表现**：把动画 SVG 当 `<img>` 引入时，动画要么已经播完，要么根本不动，且无法重播。
- **解决方案**：把 SVG **内联成 Vue 组件**；并把原 SVG 内部的 `<style>` 提到 SFC 顶层 `<style>` 块里。
- **原理**：图片内 SVG 在解码阶段就开始跑 SMIL / CSS 动画，渲染到页面时往往已结束；同时 `<img>` 隔离文档，外部无法重置。CSS 写在 SVG `<style>` 里则会被 Vue 的 SFC 编译丢掉（编译器只处理顶层 `<style>`）。
- **效果**：横幅随组件挂载开始播放，可通过 `:key` 重挂重播。
- **备注**：34KB 的矢量资源，所以单独成文件而不是内联进页面。

## 03 · banner 重播靠 `:key` 重挂

- **位置**：`composables/useAppShell.ts`、`components/common/OABannerDock.vue`
- **表现**：从主界面返回 splash 时 banner 停在末帧，不会再播。
- **解决方案**：`playBannerAnimation()` 自增 `bannerPlayToken`，`OABannerDock` 内的 `<OABannerSvg :key="bannerPlayToken">` 随之卸载重挂。
- **原理**：CSS 动画只对「新插入的元素」自动从头开始；同一元素上无法用普通属性把动画复位（`animation: none` 重设要强制 reflow，不可靠）。
- **效果**：动画从头播，且动画版 SVG 全站只存在一份（外壳里），splash 只负责触发。
- **备注**：重播与 `useBannerSequence` 的 prompt 计时无关，二者独立。

## 04 · 居中不要用 `left: 50% + translateX(-50%)`

- **位置**：`views/SplashView.vue`（`.splash-screen__prompt-dock`）
- **表现**：TOUCH TO START 按钮在入场后偏左 / 偏移半个身位，越到小视口越明显。
- **解决方案**：外层 `.splash-screen__prompt-dock` 做**全宽 flex 居中**（`justify-content: center`），按钮自身只做 `translateY` 动画。
- **原理**：入场 `animation` 里的 `transform` 会整段覆盖 `translateX(-50%)`（CSS 动画的 `transform` 不是叠加，而是替换）。
- **效果**：动画期间与结束后都精确居中。
- **备注**：同理，任何「靠 transform 居中」的元素都不要在自身上再写 transform 动画。

## 05 · 提示层与版权层必须脱离文档流

- **位置**：`views/SplashView.vue`
- **表现**：`v-show` 切换提示 / 版权文字时，banner 被顶动一下。
- **解决方案**：`.splash-legal` 与提示层都用 `position: absolute` + `pointer-events: none`，只在按钮上恢复 `auto`。
- **原理**：参与布局的元素在显隐时会改变高度，把上方绝对定位的 banner 参考系挤动。
- **效果**：显隐不再影响 banner 位置；同时点击穿透，不挡底下的交互。
- **备注**：`pointer-events` 要按需在子元素上还原，否则按钮点不到。

## 06 · 入场动画用 `backwards`，不要用 `both`

- **位置**：`views/SplashView.vue`（`.splash-legal`）
- **表现**：版权文字入场正常，但离场时「向下飞出」完全不动，直接消失。
- **解决方案**：`animation-fill-mode: backwards`。
- **原理**：离场是用 `transition` 改 `opacity` + `translateY`；`animation-fill-mode: both` 会把入场动画的**末帧永久锁定**在元素上，而 CSS 动画的优先级高于 `transition`，于是 transition 永远看不到变化。`backwards` 只在延迟期间生效，动画结束后交还属性。
- **效果**：入场后属性归位，离场 transition 恢复正常。
- **备注**：`.splash-prompt` 不受影响，因为它的离场位移写在父级 dock 上。

## 07 · banner 停靠：两个状态的 `transform` 函数结构必须一致

- **位置**：`components/common/OABannerDock.vue`
- **表现**：停靠过渡中途出现「斜着飘 + 变形」，或直接跳变。
- **解决方案**：舞台位与停靠位都写成同一套 `translate(-50%, -50%) translate(x, y) scale(s)`，只改参数。
- **原理**：浏览器对 `transform` 列表做插值时，函数个数与顺序不一致会退化为矩阵分解插值，旋转 / 缩放分量会被错误拆分。
- **效果**：插值是一条连续的位移 + 缩放，没有变形。
- **备注**：`dx / dy / scale` 由 `updateGeometry()` 按视口实时算，监听 `resize` + `ResizeObserver`；只动 `transform`，全程合成层。

## 08 · 外壳元素不能放回页面组件

- **位置**：`App.vue`、`components/common/OABubbles.vue`、`OABannerDock.vue`
- **表现**：切页时气泡动画重来、banner 闪一下，像整页重载。
- **解决方案**：底色、气泡、banner、设置按钮全部挂在常驻外壳 `App.vue`；页面只画自己的内容。
- **原理**：`<router-view>` 内容随路由卸载重建，挂进去的实例自然会重建。
- **效果**：跨页完全没有重建感，`main_bgm` 也不会被打断。
- **备注**：页面里**不要**再画背景或放 banner。

## 09 · 新增页面不要处理 `stage`

- **位置**：`App.vue` 的 `watch(() => route.name, { immediate: true })`
- **表现**：进入工具页 / 资源管理页时 banner 跳回舞台中央、底色变白。
- **解决方案**：外壳只把路由映射到 `splash` / `home` 两个阶段，其它路由**不匹配任何分支**，`stage` 保持不变。
- **原理**：`stage` 只有 `'splash' | 'home'` 两个值，新增路由只要不显式调用 `enterSplash()` / `enterHome()` 就自然延续上一个阶段。
- **效果**：进入子页面时 banner 继续停靠左下角、底色仍是浅蓝、气泡与 `main_bgm` 全部延续。
- **备注**：这是**约定**而不是巧合，新增页面时不要「顺手」补一个 else 分支。

## 10 · 路由闸门用内存态 + `replace`

- **位置**：`router/access.ts`、`router/index.ts`
- **表现**：直接访问 / 刷新 `/home`、`/resources` 等深层地址会绕过首屏引导；用 `push` 还会在历史栈里留下死链。
- **解决方案**：`isUnlocked` 是**纯内存**变量（不写 sessionStorage），`beforeEach` 拦截非 `splash` 路由并 `{ name: 'splash', replace: true }`。
- **原理**：持久化会让刷新后直接进内页，破坏「必须经过 gate」的入口契约；`replace` 才不会让返回键回到一条马上又被重定向的地址。
- **效果**：入口只有「端口号 + gate」一条路径，返回键行为可预期（`/home` 返回 → `/`）。
- **备注**：`/tools`、`/tools/skeleton`、`/resources` 及其子页面同样受约束。

---

# 二、主界面卡片动画

## 11 · 叠卡位移挂在 `.oa-slot`，不要挂在 `.oa-card`

- **位置**：`views/HomeView.vue`
- **表现**：hover 或叠卡切换时卡片「弹回原位」，叠卡层级视觉错乱。
- **解决方案**：所有位移 / 缩放 / 入场动画都落在 `.oa-slot` 这一层；`.oa-card` 自身不带任何 `transform`。
- **原理**：`transform` 是替换而不是叠加，`.oa-card` 上任何位移都会覆盖叠卡的 `translateX(var(--peek-x))`。
- **效果**：叠卡位移稳定，鼠标划过也不跳。
- **备注**：卡片交互只保留 `cursor: pointer` 与 `:focus-visible` 焦点环。

## 12 · `--peek-s` 必须写进关键帧的尾帧

- **位置**：`views/HomeView.vue`、`views/ToolsView.vue`、`views/ResourcesView.vue`
- **表现**：入场动画结束的瞬间，被压住的卡「弹一下」再回位，看起来像重绘。
- **解决方案**：入场 / 离场关键帧首尾都写 `translateX(var(--peek-x)) scale(var(--peek-s, 1) * k)`。
- **原理**：关键帧若只写 `scale(k)`，末帧就是 `scale(1)`；动画结束移除 class 后元素回到 `scale(.98)`，产生跳变。
- **效果**：动画与静态状态无缝衔接。
- **备注**：`--peek-x` 同理。

## 13 · `--enter-delay` 只能写在 `animation-delay`

- **位置**：`views/HomeView.vue`
- **表现**：入场没问题，但之后每次切换叠卡都变慢。
- **解决方案**：只用于 `animation-delay`，**不要**写成 `.oa-slot` 的 `transition-delay`。
- **原理**：`transition-delay` 会作用于该元素之后**所有**的 transition，包括叠卡切换。
- **效果**：入场错峰保留，切换响应即时。
- **备注**：错峰值来自 `config/transition.ts` 的 `cardsEnterBase`。

## 14 · 被压住的卡不能 `pointer-events: none` 或提高 `z-index`

- **位置**：`views/HomeView.vue`
- **表现**：点右侧露出的窄边无法切换卡片，所有点击都落到前景卡。
- **解决方案**：命中区完全依赖 `z-index` 分层（`.is-active` 为 2，其余 1），不额外禁用指针事件。
- **原理**：窄边属于被压住的卡，一旦禁用指针事件或抬高层级，点击就被前景卡吃掉。
- **效果**：点击窄边正常翻面。
- **备注**：窄边宽度由 `--peek` 与 `--peek-s` 共同决定。

## 15 · 离场要先播完再 `router.push`

- **位置**：`views/HomeView.vue`、`views/ToolsView.vue`、`views/ResourcesView.vue`
- **表现**：点入口时卡片飞到一半就被切断，或者根本没看到动画。
- **解决方案**：先置 `isLeaving = true` 播 `oa-slot-out` / `oa-card-out`，等 `SHELL_TIMING.cardsExitWait`（320ms）再真正跳路由。
- **原理**：没有跨路由过渡容器（不是 `<Transition>` 包裹的 router-view），组件卸载即停止绘制，晚跳才能看到完整动画。等待时长必须略大于「`cardsExit`(260ms) + 最大错峰延迟」。
- **效果**：主页 → 子页面 → 主页形成一条连续的卡片动线。
- **备注**：`isLeaving` 是幂等闸门，连点只跳一次；`onBeforeUnmount` 要清定时器。

## 16 · `.oa-slot` 常驻 `translateZ(0)`

- **位置**：`views/HomeView.vue`
- **表现**：入场动画结束、class 被移除时卡片闪一下，字体抗锯齿也变了。
- **解决方案**：`.oa-slot` 常驻 `transform: translateZ(0)` 与 `-webkit-font-smoothing: antialiased`。
- **原理**：动画结束后浏览器会回收临时的合成层，重新走一次光栅化与字体抗锯齿策略。
- **效果**：动画结束无重绘跳变。
- **备注**：代价是常驻合成层，卡片数量多时留意显存。

---

# 三、RizUI 集成

## 17 · 亮色主题要在 `<html>` 上钉死；组件不要再写 `theme="Light"`

- **位置**：`index.html`、`style.css`、所有用 RizUI 的组件
- **表现**：系统开启深色模式时整站变黑（白卡片配黑控件）；或者同一个组件在不同页面颜色不一致。
- **解决方案**：`index.html` 写 `<html data-rizui-theme="light">`，`style.css` 的 `:root` 加 `color-scheme: light`；组件上一律不写 `theme`。
- **原理**：RizUI 的主题解析全在 CSS：`:root` 是亮色 token，`:root[data-rizui-theme=dark]` 切暗色，并且还有一段 `@media (prefers-color-scheme: dark) { :root:not([data-rizui-theme=light]) { … } }`。属性写在 `index.html` 上才能在首帧前生效（没有亮→暗→亮闪动）。组件的 `theme` prop 默认 `auto`，解析成 `undefined`、不输出属性，因此继承 `:root`。
- **效果**：全站恒亮色；原生控件（滚动条、输入框、下拉箭头）也被 `color-scheme` 锁亮。
- **备注**：`--rizui_themecolor: var(--oa-blue)` 保留，让组件主色跟随全站蓝。

## 18 · `rizui_nav` 的 `width` 必须是数字

- **位置**：`views/PackageView.vue` 侧边栏
- **表现**：传 `"20%"` 之类的字符串时侧边栏宽度变成 0 或塌陷。
- **解决方案**：用 `ResizeObserver` 观察卡片宽度，算出**像素数字**（`clamp(150px, 20%, 226px)`）再传给 `:width`。
- **原理**：`rizui_nav` 内部用 `parseFloat(width)` 处理，百分比串解析成 `NaN`，最终算成 0。
- **效果**：侧边栏宽度随卡片自适应，长学院名靠 `.rnav-label` 的 ellipsis 兜底。
- **备注**：`height="100%"` 是字符串，但它对非 `100vh` 的字符串是直接透传的，不受影响。

## 19 · `rizui_nav` 选中子条目会写回 `modelValue`

- **位置**：`views/PackageView.vue`
- **表现**：点一次学院子条目后，右侧内容变成空白——`activeSection` 被污染成 `school:xxx`，`v-if` 分支全部失效。
- **解决方案**：不要把 `v-model` 直接绑 `activeSection`，改用带写入闸门的可写 computed `navModel`：带 `school:` 前缀的赋值直接丢弃。
- **原理**：`rizui_nav` 是受控组件，点击子条目会把 `modelValue` 更新为子条目 id；父层如果原样接收，语义上的「当前分类」就被子项覆盖了。
- **效果**：子条目照样能展开 / 定位，分类始终停在有效值上。
- **备注**：`@select` 里再单独处理「滚动到学院」的逻辑。

## 20 · `rizui_nav` 默认 `inset` 会留出 12px 空白

- **位置**：`views/PackageView.vue`
- **表现**：卡片里侧边栏周围多出一圈突兀的空白。
- **解决方案**：`:inset="0"`。
- **原理**：`rizui_nav` 为了「贴边时留呼吸感」默认给了容器外边距。
- **效果**：导航与卡片边缘对齐。
- **备注**：只要卡片本身已有 padding，就该置 0。

## 21 · `rizui_card` 没有折叠能力，也没有表头插槽

- **位置**：`views/PackageView.vue` 学院分组
- **表现**：想给卡片加「点击表头展开 / 收起」时无处下手。
- **解决方案**：
  - 外层容器挂 `@click`，只在 `event.target.closest('.ct-card-head')` 命中时切换；
  - 箭头用 `.ct-card-head::after` 旋转（`45deg` ↔ `-135deg`）；
  - 内容包一层 `.oa-school__collapse`，用 `grid-template-rows: 0fr → 1fr` + `opacity` 过渡，**内层必须 `min-height: 0; overflow: hidden`**；
  - 把 `.ct-card-body` 的 `margin-top` 置 0，间距改由展开时的内层 `padding-top` 提供。
- **原理**：`0fr → 1fr` 让 grid 轨道高度从 0 插值到内容高度，是「未知高度也能过渡」的通用做法；没有 `min-height: 0` 时内层不收缩，动画会失效。
- **效果**：折叠有完整过渡，点内容区不会误触发。
- **备注**：631 × N 的列表还要配合「只在展开后渲染内容」，否则 DOM 会爆。

## 22 · `rizui_dialog` 的 `v-model:show` 需要可写 computed

- **位置**：`views/PackageView.vue`（音乐描述弹窗）
- **表现**：弹窗只能打开、关不掉，或者 `v-model` 直接报错。
- **解决方案**：`isDescDialogOpen` 写成可写 computed：`get` 看 `descDialogItem !== null`，`set` 在 `false` 时把 `descDialogItem` 置 `null`。
- **原理**：组件的 `show` 是 `modelValue` 语义，关闭时会 `emit('update:show', false)`，只读 computed 无法接收写入。
- **效果**：点遮罩 / 关闭按钮 / 确定都能正常收尾，并且状态只有一个来源。
- **备注**：`rizui_dropdown`、`rizui_slider` 同理。

## 23 · `rizui_dropdown` 的弹层是非 teleport 的绝对定位

- **位置**：`components/tools/OASpineViewer.vue`、`views/PackageView.vue`
- **表现**：放在 `overflow-y: auto` 的侧栏里，下拉选项被裁掉一半。
- **解决方案**：侧栏内改用横排 chips（动作项只有 2~3 个）；实在要下拉就保证父级不滚动、不 `overflow: hidden`。
- **原理**：弹层是普通绝对定位子节点，会被最近的 `overflow` 祖先裁切，且不跟随滚动。
- **效果**：选项完整可见，视觉也和差分 chips 统一。
- **备注**：设置弹窗里的下拉没有被裁，是因为卡片本身不是滚动容器。

## 24 · `rizui_timeline` 的 `update:modelValue` 是「秒」

- **位置**：`views/PackageView.vue`（音乐进度）
- **表现**：拖动进度条后播放位置乱跳 / 直接到结尾，或者画面不跟手。
- **解决方案**：`:min="0"`、`:max="musicDuration || 1"`、`:step="1"`，`@update:model-value` 拿到的新值**直接写 `audio.currentTime`**。
- **原理**：`rizui_timeline` 的模型值就是时间轴上的秒数（不是 0–100 的百分比），`aria` / 刻度也按这个量纲走。
- **效果**：拖动是真正的 seek（后端 `res.sendFile()` 带 `Accept-Ranges`，返回 206）。
- **备注**：`max` 在元数据到达前是 0，必须给 `|| 1` 兜底，否则组件除零。

## 25 · 全局滚动条：标准属性与 `::-webkit-scrollbar` 不能隔开

- **位置**：`style.css`
- **表现**：Firefox 是细条、Chrome 是粗条；或者 RizUI 组件内部（`.rnav-body` 等）仍是 4px 灰条。
- **解决方案**：
  - 同时写 `* { scrollbar-width: thin; scrollbar-color: var(--oa-scroll-thumb) transparent }` 与 `*::-webkit-scrollbar` 系列；
  - **不要**用 `@supports not selector(::-webkit-scrollbar)` 把标准属性隔开；
  - RizUI 自带的滚动条规则带 `data-v` 属性、特异性更高，伪元素那几条统一加 `!important`。
- **原理**：Chrome 121+ 同时支持两套，但只要元素上有 `scrollbar-width` / `scrollbar-color` 就会**忽略 `::-webkit-scrollbar`**；用 `@supports` 隔开反而让 Chrome 走伪元素、Firefox 走标准属性，与 RizUI 组件里的表现不一致。RizUI 自己就是「两套同时写」。
- **效果**：全站与 RizUI 组件外观一致（8px、透明轨道、蓝色半透明滑块）。
- **备注**：规格变量集中在 `--oa-scroll-size / --oa-scroll-thumb / --oa-scroll-thumb-hover`。

---

# 四、资源管理 / 资源包

## 26 · 卡片内的 `ResizeObserver` 要跟着节点重挂

- **位置**：`views/PackageView.vue`
- **表现**：侧边栏宽度永远是下限值（150px），或者 `onUnmounted` 报 `observe` 已断开。
- **解决方案**：`watch(cardEl, …, { flush: 'post' })` 里重新 `observe`，回调里宽度 `<= 0` 直接 `return`。
- **原理**：卡片的 `v-if` 会随 `loading` 卸载重挂，`onMounted` 里一次性绑定的节点随后就被移除了，回调拿到 0 宽（被 `clamp` 到下限）。
- **效果**：加载完成后宽度正确收敛。
- **备注**：`flush: 'post'` 是必须的，DOM 未更新时读不到尺寸。

## 27 · 重型接口必须按需加载

- **位置**：`composables/usePackageContent.ts`
- **表现**：打开资源包要等半秒以上才出内容；`/skeletons` 一次就 287 KB。
- **解决方案**：进页面只拉「详情 + 角色」；`watch(activeSection)` 切到对应分类才 `loadSkeletons()` / `loadMusic()`，composable 内用 `skeletonsLoaded` / `musicLoaded` 去重。
- **原理**：`readPackageSkeletons()` 要对 631 个目录 `readdirSync` + 每个文件 `statSync`（约 2500 次），实测 **≈536 ms**；音乐索引 394 首 ≈366 KB。
- **效果**：首屏只花详情 + 角色的时间，其余分类点开才付。
- **备注**：文件清单也只在展开后渲染，631 × 3 条 DOM 不能全挂上。

## 28 · 头像 URL 用错 id 会静默 404

- **位置**：`composables/usePackageContent.ts` → `buildAssetUrl()`
- **表现**：角色列表全部没有头像，`<img>` 破图但不报错。
- **解决方案**：拼 URL 必须用**资源包 id**（`pkg.id`），不是角色的 `name_id`。
- **原理**：后端路由是 `/api/packages/:id/avatar/:file`，`:id` 是 `res/` 下的目录名，与角色无关；用 `name_id` 会落到一个不存在的包。
- **效果**：447 个头像正常显示。
- **备注**：这类错不会有异常，只能靠肉眼看列表；改完顺手确认一张。

## 29 · 音乐试听不能用 `@pause` 恢复主界面 BGM

- **位置**：`views/PackageView.vue`、`composables/useBackgroundMusic.ts`
- **表现**：切歌 / 拖进度时背景音乐「闪一下」才被重新压住，听感是断续的爆音。
- **解决方案**：`main_bgm` 的 `resume()` 只走三个显式路径——暂停按钮、`@ended`、`stopMusic()`；`@pause` 只负责把 `isMusicPlaying` 置 false。
- **原理**：换曲时改 `<audio>.src` 也会触发一次 `pause`，于是「先恢复再压住」，中间那一瞬 `main_bgm` 出声了。
- **效果**：切歌全程静默，`main_bgm` 保持淡出状态。
- **备注**：`suspend()` / `resume()` 内部有模块级 `suspended` 标记，幂等。

## 30 · 一个页面只留一个 `<audio>`，并且要跟设置音量联动

- **位置**：`views/PackageView.vue`
- **表现**：连续点几首之后多路同时出声；或者调了音量滑条没反应。
- **解决方案**：全页共用一个 `<audio preload="metadata">`，换曲只改 `src`；`watch([audioEl, () => config.preview_volume])` 同步 `el.volume = preview_volume / 100`。
- **原理**：`preload="metadata"` 拿到时长但不预载全部数据；`sendFile` 支持 Range，seek 才有效。
- **效果**：任意时刻只有一首在播，音量跟随设置。
- **备注**：试听音量与 `main_bgm` 是两个独立设置项，不要混用。

## 31 · 搜索框统一放在卡片外

- **位置**：`views/PackageView.vue`
- **表现**：三个分类各放一个搜索框后，内容区滚动时搜索框跟着滚走，切换分类还会串味。
- **解决方案**：搜索框固定在页头右上角（整张卡片之外），用可写 computed `activeKeyword` 按 `activeSection` 代理到 `keyword` / `skeletonKeyword` / `musicKeyword`；`searchPlaceholder` 返回空串时 `v-if` 直接不渲染。
- **原理**：每个分类的搜索词必须独立（否则切换分类保留上一个词，结果是空的）；占位文案同时承担「要不要显示搜索框」的判定，避免再加一个布尔量。
- **效果**：搜索框永远可见（或不显示），分类切换干净。
- **备注**：页头是两端对齐，搜索框 `align-self: flex-end` 与标题行底部对齐。

## 32 · 长描述默认折叠，全文走 dialog

- **位置**：`views/PackageView.vue`（音乐条目）
- **表现**：把描述全量展开后，单条曲目占满半屏，列表完全没法扫。
- **解决方案**：`-webkit-line-clamp: 2` + `white-space: pre-line`（保留索引里的换行与编号）；`length > 42` 或含换行时给「查看详细」按钮，点开 `rizui_dialog` 显示全文（`max-height: min(52vh, 420px)` 内部滚动）。
- **原理**：折叠与展开都用同一份已加载的数据，**不要**为弹窗再发一次请求。
- **效果**：列表密度稳定，长描述按需查看。
- **备注**：不要改成默认展开——长描述会把列表撑得非常高。

---

# 五、立绘骨骼预览（Spine）

## 33 · canvas 渲染成本 = 三角形数（这是最核心的一条）

- **位置**：`composables/spine/canvasBackend.ts`、`composables/spine/webglBackend.ts`
- **表现**：阿罗娜、普拉娜的立绘明显的掉帧（个位数 fps），其他角色正常。
- **解决方案**：默认走 WebGL 后端（`spine-webgl` 的 `PolygonBatcher` 合批），canvas 2d 只作「保守」模式与兜底。
- **原理**：`spine-canvas` 的 `triangleRendering` 对**每个三角形**做一次 `save + transform + clip + drawImage(整页 2048² 贴图) + restore`，成本与三角形数线性相关。全库 631 个骨骼实测（setup pose 下真实绘制的三角形/帧）：`arona_spr` 阿罗娜 202 骨 / 80 附件 → **5863**；`np0035_spr` 普拉娜 315 骨 / 89 附件 → **5463**；第三名 `np0186_spr` 只有 377（14 骨 / 17 附件）；全库平均 **126**（3~7 骨 / 5~10 附件）。只有这两个「真动态」立绘是其他角色的 40~80 倍，每帧 5000+ 次 clip+drawImage 必然掉到个位数帧率。
- **效果**：5863 次 draw call 合成 1~2 次，满帧；首屏 chunk 也从 822 kB 降到 643 kB（Spine 运行时进入异步路由 chunk）。
- **备注**：模式由设置项 `spine_renderer` 控制（`aggressive` 仅 WebGL / `stable` 优先 WebGL / `conservative` 仅 canvas 2d）。

## 34 · 直通 alpha 图集 + mipmap = 细线变粗发黑

- **位置**：`composables/spine/webglBackend.ts`
- **表现**：阿罗娜脸上的腮红线条明显变粗、发黑；发丝边缘出现暗边。整张图的其他颜色却是对的。
- **解决方案**：走**预乘 alpha（PMA）**管道，三条必须同时成立 —— ① 解码：`createImageBitmap(file, { premultiplyAlpha: 'premultiply' })`；② 上传：`GLTexture.DISABLE_UNPACK_PREMULTIPLIED_ALPHA_WEBGL = true`（**名字是反的**：置 true 才会 `pixelStorei(UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)`，避免二次预乘）；③ 渲染：`SkeletonRenderer.premultipliedAlpha = true`（混合变成 `ONE / ONE_MINUS_SRC_ALPHA`，加法用 `ONE / ONE`）。三者齐备之后才允许 `USE_MIPMAPS = true`。canvas 2d 后端**不能**吃预乘贴图，所以 `bindTextures` 的契约是「页名 → 文件」，由各后端自己解码。
- **原理**：BA 图集的透明区 RGB 是黑的（实测 2048² 里采样 421 257 个全透明像素，**23.7% 精确为 `(0,0,0)`**，其余全是近黑）。mipmap 是按 RGB 做盒式平均的，于是每级 mip 都把「透明黑」平均进半透明边缘；区域之间只有 1px 留边，还会跨区域串色。预乘之后半透明像素的 RGB 已经乘过 alpha、透明像素是真正的零贡献，平均才是正确的。
- **效果**：细线恢复正常粗细与颜色，缩小采样也平滑（不再为了躲色边而关掉 mipmap）。
- **备注**：只改其中一个开关的表现分别是「整体偏暗」「边缘发黑」「细节变粗」——排错时先确认这三处是否一致。

## 35 · 一张 canvas 不能既 WebGL 又 2D

- **位置**：`composables/useSpineStage.ts`、`components/tools/OASpineViewer.vue`
- **表现**：切到「保守」模式后预览区直接报错，或黑屏。
- **解决方案**：`rendererMode` 变化 → `canvasKey++` → 模板上的 `<canvas :key="canvasKey">` 换一张新画布；再 `watch(canvas, …, { flush: 'post' })` 等新元素挂上后 `load(lastCharacter)`。兜底路径同理：捕获 `SpineCanvasLockedError` 后换画布重试，并用 `lastLockedKey` 保证只重试一次。
- **原理**：`getContext()` 同类型返回同一上下文，但**不同类型**一旦创建就永久锁定，之后拿 2d 上下文只会得到 `null`。
- **效果**：三种模式可以随时切换，不需要刷新页面。
- **备注**：`flush: 'post'` 不能省，否则读到的还是旧元素。

## 36 · WebGL 能力要先用一次性 canvas 探测

- **位置**：`composables/spine/backend.ts`（`canUseWebGL()`）
- **表现**：「稳定」模式下本该回退 canvas 2d，结果两个后端都起不来。
- **解决方案**：先用 `document.createElement('canvas')` 试 `getContext('webgl2') ?? getContext('webgl')`，拿到后 `WEBGL_lose_context.loseContext()` 立刻释放；确认可用才动正式画布。
- **原理**：在正式画布上尝试 WebGL 失败时可能已经占用了上下文槽位，此时再要 2d 也拿不到——回退路径被自己堵死。
- **效果**：不支持 WebGL 的环境能干净地落到 canvas 2d。
- **备注**：探测产生的上下文记得主动丢弃，避免占满浏览器的上下文配额。

## 37 · 三个 Spine 包必须锁在同一 4.2.x

- **位置**：`packages/client/package.json`
- **表现**：渲染时 `instanceof RegionAttachment` 判定全部为 `false`，画面一片空白但没有任何报错。
- **解决方案**：`@esotericsoftware/spine-webgl` 与 `spine-canvas` 都写**精确版本** `4.2.120`（不要 `^`），并确认 `node_modules` 下只有**一份** `spine-core`。
- **原理**：`^4.2.120` 会解析到 4.3.x，而 spine-webgl 4.3 依赖 core 4.3 → 装上第二份 core。两份模块的类不是同一个类，`instanceof` 跨副本必然失败；同时 4.2 的骨骼数据也不能被 4.3 运行时正确读取。
- **效果**：判型正常，骨骼解析正常。
- **备注**：升级时三个包必须同时、同版本升。

## 38 · `TextureAtlas` 在 4.2 只接受文本，贴图要自己 `setTexture()`

- **位置**：`composables/useSpineStage.ts`、两个 backend 的 `bindTextures`
- **表现**：载入时报「无法读取 undefined 的 getImage」或在 `region.texture` 处崩溃。
- **解决方案**：`new TextureAtlas(text)` 之后必须逐页 `page.setTexture(...)`（canvas 用 `CanvasTexture`，WebGL 用 `GLTexture`），之后才能 `new AtlasAttachmentLoader(atlas)`。
- **原理**：4.2 的 `TextureAtlas` 只解析文本，不加载图片；region 的 `texture` 引用 page 上的贴图，page 没贴图就是 `null`。
- **效果**：两条渲染路径都能正常贴图。
- **备注**：`page.setTexture()` 会把贴图回填到该页的所有 region，所以顺序必须在 `AtlasAttachmentLoader` 之前。

## 39 · 不要再额外翻一次 Y

- **位置**：`composables/useSpineStage.ts`
- **表现**：立绘上下颠倒，或者整体镜像。
- **解决方案**：只用 `skeleton.scaleY = -scale` 把 y 轴向上的骨骼翻到画布坐标系；**不要**在外层再 `ctx.scale(1, -1)`。
- **原理**：Spine 的 region 绘制内部本来就带一次 `scale(1, -1)`，外层再翻一次会把它抵消掉。
- **效果**：立绘方向正确。
- **备注**：WebGL 侧投影用 `Matrix4.ortho(0, w, h, 0, 1, -1)`（y 轴向下），与 canvas 2d 语义一致，不要再引入额外的翻转。

## 40 · 每帧读 `clientWidth` 会强制同步布局

- **位置**：`composables/useSpineStage.ts`
- **表现**：高密度骨骼即使不掉帧也不够顺，DevTools 里能看到频繁的 Layout。
- **解决方案**：尺寸同步只在 `ResizeObserver` / `window.resize` / 载入完成时做（`applySize()`），CSS 宽高缓存进 `viewWidth / viewHeight`，渲染循环里只读缓存。
- **原理**：读取 `clientWidth` / `clientHeight` 会强制浏览器把待处理的样式与布局冲刷掉（layout thrashing）；而 `ResizeObserver` 已经把「尺寸变了」告诉我们了，重复读纯属浪费。
- **效果**：每帧不再有强制布局，渲染时间稳定。
- **备注**：DPR 变化（跨屏拖动窗口）不会触发 `ResizeObserver`，所以额外监听 `window.resize`。

## 41 · `readEntries` 一次最多返回 100 条

- **位置**：`composables/useSpinePackage.ts`
- **表现**：拖入整个 `skeletons/` 根目录时静默丢文件，识别出的角色少了一大半，还不报错。
- **解决方案**：循环 `readEntries` 直到返回空数组为止。
- **原理**：FileSystem API 的分批约定，不是错误而是设计。
- **效果**：大目录能完整展开（整个 `skeletons/` 600+ 个目录可直接拖入）。
- **备注**：`toSpineFilesFromDrop()` 里递归展开时同样要处理。

## 42 · `webkitdirectory` 只能 `setAttribute`

- **位置**：`components/tools/OASpineUploader.vue`
- **表现**：模板里直接写 `webkitdirectory` 会被 Volar 报「未知属性」，或者编译后失效。
- **解决方案**：在 `onMounted` 里 `input.setAttribute('webkitdirectory', '')`。
- **原理**：该属性不在 Vue / TS 的 DOM 类型定义里。
- **效果**：目录选择框正常弹出，且类型检查不报错。
- **备注**：同理还有 `webkitRelativePath`，要用类型断言读取。

## 43 · 快速换角色要用 `loadToken` 丢弃过期载入

- **位置**：`composables/useSpineStage.ts`
- **表现**：连续点几个角色后，画面显示的骨骼和面板显示的 id 对不上。
- **解决方案**：每次 `load()` 自增 `loadToken`，每个 `await` 之后比对一次，不一致就 `return`；`onBeforeUnmount` 也自增一次并 `disposeStage()`。
- **原理**：解析图集 / 骨骼都是异步的，先发起的请求可能后返回，直接写共享状态就会互相覆盖。
- **效果**：永远只显示最后一次选择的角色。
- **备注**：`disposeStage()` 同时负责停 `requestAnimationFrame`、断开 `ResizeObserver`、释放 GL 贴图与着色器。

## 44 · 「静态」模式要按需重绘

- **位置**：`composables/useSpineStage.ts`
- **表现**：选「静态（不播放动作）」时 GPU / CPU 仍然满载，笔记本风扇狂转。
- **解决方案**：`needsRedraw` 脏标记——差分、动作、缩放、平移、调试开关、尺寸变化时置位；未播放动作且不脏就直接跳过绘制（`requestAnimationFrame` 仍在，但几乎不做事）。播放动作时每帧照常 `state.update()`。
- **原理**：静态姿势下画面完全不变，重绘纯属浪费；315 根骨的 `updateWorldTransform` 也不便宜。
- **效果**：静态预览几乎零开销。
- **备注**：新增任何会影响画面的状态时**必须**置 `needsRedraw`，否则表现为「改了没反应」。

---

# 六、构建 / 资源 / 数据

## 45 · 别名要同时写 `vite.config.ts` 与 `tsconfig.json`

- **位置**：`packages/client/vite.config.ts`、`packages/client/tsconfig.json`
- **表现**：构建能过但类型检查报「找不到模块 `@/xxx`」；或者反过来。
- **解决方案**：两处同时声明：`@` → `./src`，`@resources` → `../../resources`。
- **原理**：Vite 用 `resolve.alias` 做打包期解析，`vue-tsc` 用 `compilerOptions.paths` 做类型解析，二者互不共享。
- **效果**：`npm run build`（`vue-tsc -b && vite build`）全绿。
- **备注**：`@resources` 指向仓库内美术 / 音频；用户数据目录不走别名。

## 46 · 手写 JSON / YAML 带 BOM 会让解析失败

- **位置**：`res/*/characters/characters.json`、`res/*/index/music_info.json`、`package.yml`（由服务端读取，但由前端资源包作者手写）
- **表现**：资源包在列表里显示 `valid: false`，或者角色 / 音乐数量为 0，但文件肉眼看着完全正常。
- **解决方案**：保存为 **UTF-8 无 BOM**；服务端读取时统一 `.replace(/^\uFEFF/, '')` 兜底。
- **原理**：`JSON.parse` 遇到 BOM（`EF BB BF`）会直接抛 `Unexpected token`；Windows 上的 PowerShell 5.1 `Set-Content -Encoding utf8` 默认会写 BOM，是主要来源。
- **效果**：清单能正常解析，计数正确。
- **备注**：写这类文件优先用编辑器或带 `utf-8` 显式编码的脚本；服务端已经对 `package.yml` / `characters.json` / `music_info.json` 都做了 BOM 剥离。

---

## 维护约定

- **新增坑**：按六段格式追加到对应分组，并更新顶部条目区间表。
- **修掉坑**：不要直接删除条目，改成在「效果」里注明「已由 X 取代」——这些坑大多是「删了代码就会复发」的类型。
- **跨端问题**：只影响服务端的写进 `agents/server/`；同时影响两侧的（如 46）写在这里，并在服务端文档里加一句指回本篇。

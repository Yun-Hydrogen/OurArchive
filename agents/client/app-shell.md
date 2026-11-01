# 应用骨架

覆盖：[main.ts](../../packages/client/src/main.ts)、[App.vue](../../packages/client/src/App.vue)、[router/index.ts](../../packages/client/src/router/index.ts)、[router/access.ts](../../packages/client/src/router/access.ts)、[composables/useAppShell.ts](../../packages/client/src/composables/useAppShell.ts)、[components/common/OABannerDock.vue](../../packages/client/src/components/common/OABannerDock.vue)、[config/routes.ts](../../packages/client/src/config/routes.ts)、[style.css](../../packages/client/src/style.css)、[config/assets.ts](../../packages/client/src/config/assets.ts)、[vite.config.ts](../../packages/client/vite.config.ts)

## 入口与路由

`main.ts`：`createApp(App).use(router).mount('#app')`，并在最前引入 `style.css`（保证 `@font-face` 优先加载）。
`App.vue` 是**常驻外壳**，负责所有跨页面存活的东西：底色层、气泡背景、banner、设置按钮、`<router-view />` 与全站交互特效 `<OAMouseSpark />`（覆盖在最上层，`pointer-events: none`）。页面只负责自己那部分内容，不画背景、不放 banner。

路由名/路径统一在 `config/routes.ts` 以常量定义，路由表与业务代码都引用常量：

| 路径 | 名称 | 组件 |
| --- | --- | --- |
| `/` | `splash` | `views/SplashView.vue`（`() => import(...)` 懒加载） |
| `/home` | `home` | `views/HomeView.vue`（懒加载） |
| `/tools` | `tools` | `views/ToolsView.vue`（懒加载，见 [tools.md](./tools.md)） |
| `/tools/skeleton` | `skeletonPreview` | `views/SkeletonPreviewView.vue`（懒加载，见 [skeleton-preview.md](./skeleton-preview.md)） |
| `/resources` | `resources` | `views/ResourcesView.vue`（懒加载，见 [resources.md](./resources.md)） |
| `/resources/:packageId` | `packageDetail` | `views/PackageView.vue`（懒加载，见 [package.md](./package.md)） |
| `/resources/:packageId/character/:nameId` | `packageCharacter` | `views/PackageCharacterView.vue`（懒加载，见 [package.md](./package.md)） |
| `/:pathMatch(.*)*` | — | `redirect: () => '/'` |

- `createWebHistory()`：URL 无 `#`，刷新深层路径依赖后端 SPA fallback（见 [serve-client.md](../server/serve-client.md)）。
- 新增页面：建 `views/XxxView.vue` → `config/routes.ts` 加常量 → `router/index.ts` 注册 → 更新本文档。

## 入口闸门

`router/access.ts` 用一个**内存态** `isUnlocked` 表示「是否已从 splash gate 进入」：

- `unlockApp()` 在 splash 的白屏引导首次点击（拿到用户手势）时调用；
- `router.beforeEach` 拦截所有非 `splash` 路由，未解锁则 `{ name: 'splash', replace: true }`；
- 状态**不落 sessionStorage**：刷新 `/home`、在地址栏直接输入 `/home`、从外部链接进入，都会被换回 `/` 的 gate；`replace` 保证不在历史栈里留下那条深层地址。

这样入口只有「端口号 + gate」一条路径，也让浏览器返回键的行为可预期（`/home` 返回 → `/`）。`/tools`、`/tools/skeleton`、`/resources` 及其子页面同样受这条闸门约束，直接访问一律回 `/`。

## 应用外壳

```
.oa-shell                      flex column, min-height 100vh
├── .oa-shell__bg              fixed 底色层：纯白 ↔ 浅蓝渐变（::after 淡入）
├── <OABubbles :active>        fixed 气泡背景，全程一个实例
├── <OABannerDock :visible :docked @click>
├── .oa-shell__settings        fixed 右上角设置按钮（gatePassed 后出现）
├── <OAAboutModal :visible>    关于信息弹窗（开发信息与贡献信息）
└── .oa-shell__view            z-index 10，内部是 <router-view />
```

`composables/useAppShell.ts` 保存外壳状态：

| 状态 | 含义 |
| --- | --- |
| `stage: 'splash' \| 'home'` | 决定 banner 位置与底色；`isHome = stage === 'home'` |
| `gatePassed` | 是否已过白屏引导，控制气泡 / banner / 设置按钮的显隐 |
| `bannerPlayToken` | 递增即重挂 banner SVG，让内部 CSS 动画从头播放 |

- `App.vue` 用 `watch(() => route.name, { immediate: true })` 把路由同步到 `stage`：进 `home` 调 `enterHome()`，回 `splash` 调 `enterSplash()`（后者同时把 `gatePassed` 复位，避免返回时 banner 压在白屏之上）。
- **工具页（`tools` / `skeletonPreview`）与资源管理页（`resources` / `packageDetail` / `packageCharacter`）不匹配这两个分支**，`stage` 保持 `home`：进入这些页面时 banner 继续停靠在左下角、底色仍是浅蓝、气泡与 `main_bgm` 全部延续。新增页面若希望沿用主界面外壳，保持这个「不处理即延续」的约定即可。
- **不要把这些元素放回页面组件**：一旦随路由卸载重建，气泡动画会重来、banner 会闪一下，看起来就像整页重载。

## banner 停靠动画

`components/common/OABannerDock.vue` 只有一个元素在动：

```css
.oa-banner-dock {                      /* 舞台位：窗口正中 */
  position: fixed; top: 50%; left: 50%;
  width: var(--hero-w);                /* min(46vw, 620px) */
  transform: translate(-50%, -50%) translate(0, -3vh) scale(1);
  transition: transform 620ms cubic-bezier(.22, 1, .36, 1), opacity 380ms ease;
}
.oa-banner-dock.is-docked {            /* 停靠位：左下角 */
  transform: translate(-50%, -50%) translate(var(--dock-dx), var(--dock-dy)) scale(var(--dock-scale));
}
```

- 两个状态的 transform **函数结构完全一致**（`translate(-50%,-50%) translate(x,y) scale(s)`），所以插值是一条连续动画，而不是矩阵混合。
- `dx / dy / scale` 由 `updateGeometry()` 按视口实时算出：以「中心点对齐」把舞台中心映射到停靠中心，`scale = dockW / heroW`；监听 `resize` + `ResizeObserver`。
- 停靠位固定在**左下角**（内层页面同样沿用）：`dockW = clamp(76px, 6.2vw, 104px)`、左边距 `clamp(20px, 3vw, 42px)`、下边距 `clamp(14px, 2.8vh, 30px)`。`dy` 由 `窗口高 - 下边距 - dockH` 反推，所以改尺寸只需动这三处 clamp。
- 只动 `transform`，全程在合成层，不触发重排；宽度固定为舞台宽度，缩放不改变布局。
- 停靠态交互：停靠后启用 `pointer-events: auto; cursor: pointer;`，悬停时享有微光与轻微缩放反馈（`scale(1.05)`），点击（或回车）触发 `click` 事件弹出 `<OAAboutModal />`，展示开发信息、开源协议与贡献鸣谢。
- 内容交叉淡入：`OABannerSvg`（动画版）在停靠后 340ms 淡出，`OurArchiveBanner-tp-tight-svg.svg`（静态版）同时淡入；两者宽高比 1.897 / 1.958 接近，切换几乎看不出来。
- `bannerPlayToken` 变化时 `:key` 重挂 SVG，动画从头播（与 `useBannerSequence` 的 prompt 计时无关）。

## 字体与全局变量

```css
@font-face {
  font-family: 'Our Archive UI';
  src: url('../../../resources/UI.ttf') format('truetype');
  font-display: swap;
}
:root { --oa-font: 'Our Archive UI', -apple-system, 'Segoe UI', Roboto, sans-serif; }
```

- 组件一律 `font-family: var(--oa-font)`，禁止硬编码字体族；表单控件已在 `style.css` 统一 `font-family: inherit`。
- Vite 会把 `UI.ttf` 复制进 `dist/assets/`。
- 其他变量：`--oa-blue #0090fe`、`--oa-dark-blue #13243f`、`--oa-yellow #f8be00`、`--oa-bg #0b1017`、`--oa-text #e9eef5`、`--oa-border #1e293b`、`--rizui_themecolor: var(--oa-blue)`（使引入的 RizUI 组件跟随全站主题色）。
- `body` 铺全局配色、`#app` 为 `flex column + min-height: 100vh`，页面可用 `flex: 1` 占满。**页面级背景由页面自己覆盖，不要改 `--oa-bg` 适配单页**；组件样式用 `<style scoped>`。

## 资源引用

| 类型 | 位置 | 引用方式 | 打包 |
| --- | --- | --- | --- |
| 项目自带美术 / 音频 | 仓库 `resources/` | `@resources/...` | 是 |
| 用户数据（剧本、素材） | 用户资源根目录 `<root>/res` 等 | 后端 API / 运行时路径 | 否 |

别名在 `vite.config.ts` 的 `resolve.alias` 与 `tsconfig.json` 的 `paths` 中**必须同时声明**：`@` → `./src`，`@resources` → `../../resources`。

`src/config/assets.ts` 汇总资源（`?url` 返回产物 URL，可给 `<img>` 或 `new Audio`）：

```ts
export const SPLASH_ASSETS = { titleSoundUrl } as const;
export const HOME_ASSETS = { bannerTightUrl } as const;
```

组件不直接 import 资源路径，一律从 `config/assets.ts` 取用；时长常量只在 `config/splash.ts` 定义。横幅动画是内联 SVG 组件（[OABannerSvg.vue](../../packages/client/src/components/splash/OABannerSvg.vue)），不走 `assets.ts`；主界面的静态横幅是 `<img>`，走 `HOME_ASSETS.bannerTightUrl`（`OurArchiveBanner-tp-tight-svg.svg`，viewBox 已收紧，直接用原比例缩放即可）。

可用资源（`resources/OurArchive/`）：`OABannerAnim-tp-svg.svg`（自包含动画横幅，当前使用）、`OABannerAnim-wb-svg.svg`（白底版）、`OurArchiveBanner-tp-svg.svg` / `-tight-`（静态横幅，`viewBox` 2880×2880 与裁切版）、`OurArchiveIcon-wb-svg.svg`（白底图标，用作标签页 favicon）、`sound.wav`（2.85s）、`LICENSE`。
该目录资产为 **CC BY-NC-ND 4.0，不在 AGPLv3 覆盖范围内**。

## 开发服务器

```ts
server: {
  host: '0.0.0.0',
  port: 5173,
  strictPort: true,
  proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
}
```

`0.0.0.0` 便于局域网访问；`strictPort` 防止静默换端口破坏与后端的端口约定；开发时后端让位到 3000，端口策略见 [startup.md](../server/startup.md)。

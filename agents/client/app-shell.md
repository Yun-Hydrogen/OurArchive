# 应用骨架

覆盖：[main.ts](../../packages/client/src/main.ts)、[App.vue](../../packages/client/src/App.vue)、[router/index.ts](../../packages/client/src/router/index.ts)、[config/routes.ts](../../packages/client/src/config/routes.ts)、[style.css](../../packages/client/src/style.css)、[config/assets.ts](../../packages/client/src/config/assets.ts)、[vite.config.ts](../../packages/client/vite.config.ts)

## 入口与路由

`main.ts`：`createApp(App).use(router).mount('#app')`，并在最前引入 `style.css`（保证 `@font-face` 优先加载）。
`App.vue` 包含 `<router-view />` 与全站交互特效 `<OAMouseSpark />`（覆盖在全屏最上层，`pointer-events: none` 不遮挡交互，实现点击波纹、旋转锥形光弧、飞散星芒与拖尾辉光）；页面自己负责全屏布局与背景。

路由名/路径统一在 `config/routes.ts` 以常量定义，路由表与业务代码都引用常量：

| 路径 | 名称 | 组件 |
| --- | --- | --- |
| `/` | `splash` | `views/SplashView.vue`（`() => import(...)` 懒加载） |

- `createWebHistory()`：URL 无 `#`，刷新深层路径依赖后端 SPA fallback（见 [serve-client.md](../server/serve-client.md)）。
- 暂无 404 兜底；新增页面时补 `:pathMatch(.*)*`。
- 新增页面：建 `views/XxxView.vue` → `config/routes.ts` 加常量 → `router/index.ts` 注册 → 更新本文档。

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
- 其他变量：`--oa-blue #0090fe`、`--oa-dark-blue #13243f`、`--oa-yellow #f8be00`、`--oa-bg #0b1017`、`--oa-text #e9eef5`、`--oa-border #1e293b`。
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
```

组件不直接 import 资源路径，一律从 `config/assets.ts` 取用；时长常量只在 `config/splash.ts` 定义。横幅是内联 SVG 组件（[OABannerSvg.vue](../../packages/client/src/components/splash/OABannerSvg.vue)），不走 `assets.ts`。

可用资源（`resources/OurArchive/`）：`OABannerAnim-tp-svg.svg`（自包含动画横幅，当前使用）、`OABannerAnim-wb-svg.svg`（白底版）、`OurArchiveBanner-tp-svg.svg` / `-tight-`（静态横幅）、`OurArchiveIcon-wb-svg.svg`（白底图标，用作标签页 favicon）、`sound.wav`（2.85s）、`LICENSE`。
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

# EmotionProvider — 表情索引解析与脚本元数据

> 源码：`src/modules/EmotionProvider/emotions.server.ts`

## 职责边界

- 做什么：解析资源包 `Emotions` 目录下的 `index/emotions.yml`，校验图片 / 音效 / 脚本路径，产出 `PackageEmotion[]`。
- 不做什么：不读取或执行脚本；不缓存表情；不负责前端播放。

## 关键实现

1. 目录来自 `package.yml` 的 `Emotions.path`，索引固定为 `index/emotions.yml`。
2. 图片：
   - 使用条目里的 `images`（从下到上的绘制顺序）；
   - 缺省时兼容旧格式：读取 `motion` 指向 JSON 的 `layers[].texture`（新包不再使用）；
   - 只下发 `IMAGE_EXTENSIONS` 且真实存在的文件。
3. 音效：只下发 `AUDIO_EXTENSIONS` 且真实存在的文件（`sound` 字段已从默认包移除，解析仍兼容）。
4. 脚本：
   - 条目 `script` 优先，缺省回退顶层 `script`（顶层写法已废弃，新包请每条表情各自绑定）；
   - 只允许 `.js` / `.mjs`，最大 512 KB；
   - 下发的 `scriptUrl` 带 `?v=<文件 mtime>`：前端用动态 `import()` 加载，
     浏览器按 URL 缓存模块，不带版本号时改脚本不会立即生效（见 [NeedNotice](../NeedNotice.md) 条目 68）。
5. `exists`：脚本合法，并且（脚本存在或有完整图片）。
6. 文件下发走 `resolveEmotionFile()`，只允许图片 / 音频 / 脚本扩展名，且必须通过 `resolveInside()` 路径校验。

## 相关 API

- `GET /api/packages/:id/emotions`
- `GET /api/packages/:id/emotions/*`

脚本响应头为 `text/javascript; charset=utf-8`，并带 `X-Content-Type-Options: nosniff`。

## 注意

- YAML 读取前必须剥 BOM（`replace(/^\uFEFF/, '')`）。

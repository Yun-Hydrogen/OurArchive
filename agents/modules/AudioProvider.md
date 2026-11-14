# AudioProvider — 背景音乐与音效索引解析、音频轻量时长探测与文件定位

> 源码：`src/modules/AudioProvider/`

## 关联文件

| 文件 | 作用 |
| --- | --- |
| `music.server.ts` | `BackgroundMusic` 分类曲目索引解析、逐级退化文件定位（服务端专用，浏览器侧绝不能 import） |
| `sounds.server.ts` | `Sounds` 分类音效索引与类别映射解析、按类别统计（服务端专用，浏览器侧绝不能 import） |
| `audioDuration.server.ts` | WAV (RIFF/PCM) 与 Ogg/Opus 文件头轻量时长解析器（服务端专用，浏览器侧绝不能 import） |

## 职责边界

- 解析什么：解析 `BackgroundMusic` 的 `index/music_info.json` 与 `Sounds` 的 `index/sound_info.json` + `index/categories.json`；探测 WAV/Ogg 容器头提取时长；按多级规则定位磁盘音频物理文件。
- 不做什么：不播放音频、不控制 Web Audio API 节点（由 `AudioPlayer` 与 `usePackagePreviewAudio` 负责）、不提供音频解码与转码。

## 数据形状

- `PackageMusic`：背景音乐曲目
  - `name_id`：曲目标识（如 `theme_01`）
  - `filename`：实际定位到的文件名（含扩展名）
  - `title`：曲目标题（缺省回退 `name_id`）
  - `artist`：艺术家
  - `description`：剧情或曲目描述
  - `url`：音频可访问 URL；文件缺失时为空串 `""`
  - `exists`：磁盘音频文件是否存在
  - `duration`：音频时长（秒，保留 1 位小数）；未知时为 `-1`
- `PackageSound`：音效条目
  - `id_name`：音效标识（如 `se_49mm_01`）
  - `original_filename`：实际定位到的文件名
  - `description`：音效描述
  - `category`：类别原始键（如 `SE`；缺失记 `'Other'`）
  - `categoryLabel`：分类中文名（`categories.json` 映射）；缺映射时回退为类别键本身
  - `url`：音频 URL；缺失为空串 `""`
  - `exists`：文件是否存在
  - `duration`：音频时长（秒，保留 1 位小数）；未知为 `-1`
- `PackageSoundCategory`：音效类别聚合
  - `id`：类别键
  - `label`：展示名（中文）
  - `count`：该类别下的音效数量（未被引用的类别不下发）
  - `duration`：该类别下已知时长的音效总时长（秒，保留 1 位小数；排除 `-1` 的条目）

## 关键实现

### `readPackageMusic(packageDir, pkg)`

1. 作用：读取背景音乐清单，退化匹配音频文件并获取时长。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage) => PackageMusic[]`。
3. 注意事项：音频文件直接位于分类目录下；找文件退化顺序见下文；BOM 剥离（见 [NeedNotice](../NeedNotice.md) 条目 12、16）。

### `readPackageSounds(packageDir, pkg)`

1. 作用：读取音效索引与类别映射，派生分类聚合列表。
2. 输入输出：`(packageDir: string, pkg: ResourcePackage) => { sounds: PackageSound[]; categories: PackageSoundCategory[] }`。
3. 注意事项：`categoryLabels` 映射解析失败只回退类别键本身，不阻断列表；仅下发被音效引用的类别，按中文拼音排序；时长累加跳过 `-1`。

### 音频文件退化匹配（`resolveAudio`）

1. 作用：磁盘文件名与外载索引不一致时的逐级收紧定位。
2. 候选顺序：
   ① `original_filename` 声明文件名
   ② `name_id` + 原后缀（或 `.ogg`）
   ③ 大小写不敏感的同名文件（`name.toLowerCase() === "${name_id}${ext}".toLowerCase()`）
   ④ 大小写不敏感的前缀匹配（`name.toLowerCase().startsWith("${name_id.toLowerCase()}.")`）
3. 注意事项：每级候选必须过 `resolveInside` 校验且真实存在（见 [NeedNotice](../NeedNotice.md) 条目 16）。

### `parseAudioDuration(filePath)`

1. 作用：从文件二进制头部快速提取时长，不做全量解码。
2. 输入输出：`filePath: string => number`（秒，保留 1 位小数；失败返回 `-1`）。
3. 注意事项：WAV 解析 RIFF 的 `fmt ` 块采样率/通道数与 `data` 块字节数；Ogg 针对 OpusHead 提取采样率与 `granule` 换算秒数；其余格式及异常统一返回 `-1`（`UNKNOWN_DURATION`）。

### `resolveMusicFile(...)` / `resolveSoundFile(...)`

1. 作用：服务端静态下发路由的文件定位与白名单校验。
2. 输入输出：`(packageDir, pkg, filename) => string | null`。
3. 注意事项：扩展名必须属于 `AUDIO_EXTENSIONS`（共 13 种音频格式），越界或非文件返回 `null`。

## 注意事项

- 文件名匹配遵循四级退化收紧顺序，只做定位不改文件名（见 [NeedNotice](../NeedNotice.md) 条目 16）。
- 手写 JSON 索引文件解析前必须剥离 UTF-8 BOM（见 [NeedNotice](../NeedNotice.md) 条目 12）。
- 音频时长未知时必须返回 `-1`（`UNKNOWN_DURATION`），严禁返回 `0`，前端据此展示「时长未知」。
- 音频扩展名受白名单 `AUDIO_EXTENSIONS` 约束（`.ogg/.oga/.mp3/.wav/.m4a/.m4b/.aac/.flac/.opus/.webm/.weba/.aif/.aiff`）。
- 类别映射缺失或损坏时安全降级，`categoryLabel` 回退为类别键自身，保证分类不丢条目。

## 相关文档

- [PackageProvider](./PackageProvider.md)
- [NeedNotice](../NeedNotice.md)

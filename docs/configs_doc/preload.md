# Preload 预加载资源开发者指南

本文档面向开发者，说明 **Our Archive** 中预加载资源（Preload Assets）的配置规范、索引机制与自定义扩展方法。

---

## 1. 概念与设计原则

- **开源合规与资源解耦**：Our Archive 代码遵循 AGPLv3 协议开源，项目中**不附带**任何受版权保护的专属专有资产（包括官方立绘、CG、音效与音乐等）。
- **预加载清单（`preload_assets.yml`）**：位于**项目根目录**，由开发者手动维护并随程序发布版本分发。它作为预加载素材的权威“标准索引库”。
- **物理资源目录**：用户运行程序时所需的物理文件存放于各平台对应的资源根目录下（如 Windows 为 `<用户文档>/OurArchive/preload/`，Android 为 `/sdcard/OurArchive/preload/`），使用者可合法自行从第三方分发处获取并填入。

---

## 2. 配置文件格式规范

根目录下的 [preload_assets.yml](../preload_assets.yml) 采用标准 YAML 列表格式，每个资源项包含三个属性：

```yaml
assets:
  # 背景音乐示例
  - id: main_bgm
    file: preload/sounds/main_bgm.mp3
    file_type: sound

  # UI 贴图示例
  - id: button_bg
    file: preload/images/uis/button_background.png
    file_type: image

```

### 字段说明

| 字段 | 约束 | 说明 |
| :--- | :--- | :--- |
| `id` | **全小写字母**、数字与下划线（`[a-z0-9_]+`） | 该资源在程序内的全局唯一标识，前端通过此 `id` 索引和调用 |
| `file` | 相对路径，**必须以 `preload/` 起始** | 对应用户资源根目录下的物理路径，支持任意多级子目录 |
| `file_type` | `sound` \| `image` \| `font` \| `video` 等 | 资源文件类型说明（解析器同时容错兼容手误的 `file_tpye`） |

---

## 3. 如何自定义与新增 Preload 资源

### 第一步：在 `preload_assets.yml` 中声明资源

打开项目根目录的 `preload_assets.yml`，在 `assets` 下追加新条目。例如新增一个对话框音效与角色表情：

```yaml
  - id: se_dialog_next
    file: preload/sounds/se/next.wav
    file_type: sound

  - id: emoicon_sparkle
    file: preload/images/emotions/sparkle.png
    file_type: image
```

### 第二步：放置对应的物理资源文件

将真实的多媒体文件按配置路径放置到本地运行数据目录下：

* **Windows**: `C:\Users\<用户名>\Documents\OurArchive\preload\...`

* **Linux**: `/home/<用户名>/OurArchive/preload/...`

* **Android (Termux)**: `/sdcard/OurArchive/preload/...`

> **注意（大小写敏感）**：Linux 与 Android 文件系统严格区分大小写，请确保物理文件名及文件夹名称与 YAML 中的 `file` 路径大小写完全一致。

### 第三步：启动后端核验

启动后端服务：

```bash
npm run dev:server
```

后端在启动时会自动解析 `preload_assets.yml` 并核对物理文件是否存在：
- 若所有配置的文件均存在，控制台输出 `➜ Preload: X/X 项就绪` 并展示绿色提示；
- 若存在缺失或路径不匹配，控制台将输出黄色警告：

```text
  !  警告：preload不完整，可能影响体验，请从第三方分发处获得preload资源。
     缺失文件: preload/sounds/se/next.wav 等
```


## 4. 打包分发注意事项

当执行平台打包命令（如 `npm run build:windows`、`npm run build:linux` 等）时，打包脚本会自动将项目根目录的 `preload_assets.yml` 复制到目标发行包根目录下，与可执行文件/启动脚本同级分发。使用者解压发行包后即可一目了然地获悉该版本所需的预加载资源结构。

**但是打包不会自动包含任何实际的预加载资源文件**，使用者仍需自行从取并放置到对应的 `preload/` 目录下。
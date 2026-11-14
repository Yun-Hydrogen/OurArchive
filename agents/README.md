# Our Archive — Agent 文档入口

本目录是给「读代码的 Agent 与人类开发者」用的文档集合。**文档按源码模块 / 页面分类，不按前端 /
服务端分类**——一个功能的解析侧（`*.server.ts`）与渲染侧写在同一个模块文档里，位置一栏会同时给出两侧文件。

源码只有一个 npm 包，全部在根目录 `src/` 下：

```
src/
├── index.ts            # 服务端入口（Express）
├── main.ts             # 客户端入口（Vue）
├── App.vue             # 应用根组件（外壳挂载点）
├── style.css           # 全局变量与重置
├── utils/              # 纯函数：format.ts / reactivity.ts
├── modules/            # 16 个功能模块（见下表）
└── views/              # 7 个页面 + 页面私有件（package/ 是资源包页的子目录）
```

## 通用文档

| 文档 | 用途 |
| --- | --- |
| [ProjectIntroduction.md](./ProjectIntroduction.md) | 项目说明：技术栈、目录、命令、端口、环境变量、许可证 |
| [ProjectDevelopNotice.md](./ProjectDevelopNotice.md) | **开发规范**：目录、命名、标识符、CSS、API、外载格式、UI 库与字体 |
| [ProjectDevelopProcess.md](./ProjectDevelopProcess.md) | 功能进度：每条路由上的入口「有 / 没有」 |
| [NeedNotice.md](./NeedNotice.md) | **踩坑总集**：55 条按主题分组，**改代码前先扫对应分组** |
| [emotionstodo.md](./emotionstodo.md) | 表情系统：第三方实现逆向记录 |

## 模块文档（`agents/modules/`）

| 模块 | 一句话职责 | 文档 |
| --- | --- | --- |
| `API` | 前后端契约：DTO、请求封装、Express router | [API.md](./modules/API.md) |
| `Initializer` | 启动初始化：路径、目录、preload 校验、Spine 插件、端口、托管 | [Initializer.md](./modules/Initializer.md) |
| `ConfigProvider` | 全局配置：默认值、校验、yml 读写、渲染器模式取值 | [ConfigProvider.md](./modules/ConfigProvider.md) |
| `SkeletonRuntimeProvider` | 动态加载本地 Spine runtime 并交给渲染器 | [SkeletonRuntimeProvider.md](./modules/SkeletonRuntimeProvider.md) |
| `PackageProvider` | `package.yml` 清单、内容分类、目录约定、立绘目录扫描 | [PackageProvider.md](./modules/PackageProvider.md) |
| `CharacterProvider` | `characters.json` → 角色 + 头像 + 立绘存在性 | [CharacterProvider.md](./modules/CharacterProvider.md) |
| `AudioProvider` | `music_info.json` / `sound_info.json` + 音频时长 | [AudioProvider.md](./modules/AudioProvider.md) |
| `BackgroundProvider` | `index/category.yml` + 背景图扫描 | [BackgroundProvider.md](./modules/BackgroundProvider.md) |
| `EmotionProvider` | `emotions.yml` → 合成图层与关键帧 | [EmotionProvider.md](./modules/EmotionProvider.md) |
| `SkeletonRender` | 立绘渲染：后端适配、舞台交互、预览组件 | [SkeletonRender.md](./modules/SkeletonRender.md) |
| `EmotionRender` | 表情关键帧解释与预览面板 | [EmotionRender.md](./modules/EmotionRender.md) |
| `BackgroundRender` | 背景宫格与大图灯箱 | [BackgroundRender.md](./modules/BackgroundRender.md) |
| `AudioPlayer` | 背景音乐单例与播放控制 | [AudioPlayer.md](./modules/AudioPlayer.md) |
| `ResourcePicker` | 通用资源选择对话框（Promise API） | [ResourcePicker.md](./modules/ResourcePicker.md) |
| `Shell` | 常驻外壳：气泡、banner、鼠标特效、设置与关于、外壳时序 | [Shell.md](./modules/Shell.md) |
| `ViewsManager` | 路由表、入口闸门、页面入场动画、统一页头 | [ViewsManager.md](./modules/ViewsManager.md) |

模块命名后缀的含义（`*Provider` / `*Render` / `*Player` / `*Picker` / 无后缀）见
[ProjectDevelopNotice.md](./ProjectDevelopNotice.md#模块命名语义角色后缀)。

## 页面文档（`agents/views/`）

| 路由 | 页面 | 文档 |
| --- | --- | --- |
| `/` | `SplashView.vue` | [SplashView.md](./views/SplashView.md) |
| `/home` | `HomeView.vue` | [HomeView.md](./views/HomeView.md) |
| `/tools` | `ToolsView.vue` | [ToolsView.md](./views/ToolsView.md) |
| `/tools/skeleton` | `SkeletonPreviewView.vue` | [SkeletonPreviewView.md](./views/SkeletonPreviewView.md) |
| `/resources` | `ResourcesView.vue` | [ResourcesView.md](./views/ResourcesView.md) |
| `/resources/:packageId` | `views/package/PackageView.vue` | [PackageView.md](./views/PackageView.md) |
| `/resources/:packageId/character/:nameId` | `PackageCharacterView.vue` | [PackageCharacterView.md](./views/PackageCharacterView.md) |

页面文档只写「这一页怎么装配」；页面私有件（`OAPackage*` / `OACharacterDetail` / `OAPackageCard` /
`OACardArt` / `OAToolArt` / `splashTiming` 等）跟着所属页面写，不单独立模块文档。

## 建议的阅读顺序

1. 想了解项目：ProjectIntroduction → ProjectDevelopProcess。
2. 要改某个功能：先看 `agents/modules/<模块>.md`，再扫 NeedNotice 里对应分组（分组索引在 NeedNotice 顶部）。
3. 要加新功能：ProjectDevelopNotice → 找到落位的模块 → 按模块文档里的「注意事项」写。
4. 要动页面结构：对应 `agents/views/<页面>.md` + ProjectDevelopNotice 的「views / modules 的边界（三问）」。

## 维护约定

- **新增模块**：建 `src/modules/<Domain>/` 的同时建 `agents/modules/<Domain>.md`，并更新本文件的模块表。
- **新增页面**：建页面的同时建 `agents/views/<页面>.md`，并更新路由表与本文件的页面表。
- **新增坑**：写进 [NeedNotice.md](./NeedNotice.md) 最贴合的分组（六段格式），并更新顶部索引表。
- **文档里的路径**：一律用相对仓库根的写法（`src/modules/...`），不要写绝对路径。
- **入口与功能状态**：功能是否「有入口且可用」记在 [ProjectDevelopProcess.md](./ProjectDevelopProcess.md)。
- **改动代码后**：回到对应的模块 / 页面文档同步一次，过时的文档比没有文档更糟。

/**
 * 服务端与客户端共享的数据结构。
 *
 * 只放**跨端传输的形状**：这里的字段名即 HTTP 响应体字段名，改动会同时影响两侧。
 * 单端专用的类型（如服务端读取 `characters.json` 的原始记录）留在各自模块里。
 */

/** `package.yml` 里声明的一个内容分类 */
export interface PackageContent {
  /** package.yml 里的键，如 `Skeletons` / `hasCharacter` */
  key: string;
  /** 展示名，如「骨骼」「角色」 */
  label: string;
  /** 作者是否声明包含该类资源 */
  supported: boolean;
  /** 相对资源包根目录的路径 */
  path: string;
  /** 索引文件名（仅 `hasCharacter` 使用，缺省 `characters.json`） */
  index: string;
  /** 图片子目录（仅 `hasCharacter` 使用，缺省 `avatars`） */
  avatar: string;
  /** 声明为包含且目录存在 */
  exists: boolean;
  /** 目录下的一级条目数（仅在 `supported` 时统计） */
  count: number;
}

/** 一个资源包（`res/<id>/package.yml`） */
export interface ResourcePackage {
  /** 资源包目录名，同时作为唯一标识 */
  id: string;
  /** `package_info.name` */
  name: string;
  /** `package_info.description` */
  description: string;
  /** `package_info.version` */
  version: string;
  /** `package_info.author` */
  author: string;
  /** `package.yml` 的最后修改时间（ISO 字符串） */
  updatedAt: string;
  /** `package.yml` 是否可解析出 `package_info` */
  valid: boolean;
  /** 解析失败时的原因 */
  error?: string;
  /** `package_content` 声明的内容分类（按清单顺序） */
  contents: PackageContent[];
}

/** 角色条目：在 `characters.json` 的基础上补资源 URL 与立绘存在性 */
export interface PackageCharacter {
  /** 外载字段：角色唯一 id（snake_case 为数据格式，代码里按 `nameId` 理解） */
  name_id: string;
  name: string;
  school: string;
  club: string;
  /** 头像文件名；缺头像时为空串 */
  avatar: string;
  /** 头像可访问 URL；无头像时为空串 */
  avatarUrl: string;
  /** 绑定的立绘 id 列表（外载字段名为 `spine`，语义即 skeleton） */
  spine: string[];
  /** 每条立绘在 `skeletons/` 下是否存在 */
  spines: Array<{ id: string; exists: boolean }>;
  /** 是否至少有一条立绘可用 */
  hasSkeleton: boolean;
}

/** 立绘目录里的单个文件 */
export interface PackageSkeletonItem {
  name: string;
  /** 小写扩展名，含点（`.skel` / `.atlas` / `.png`） */
  ext: string;
  /** 字节数 */
  size: number;
  url: string;
}

/** 一个立绘目录（`skeletons/<id>/`） */
export interface PackageSkeleton {
  id: string;
  files: PackageSkeletonItem[];
  /** 全部文件体积之和 */
  totalSize: number;
  /** 骨骼 + 图集 + 贴图齐全，可直接预览 */
  complete: boolean;
}

/** 一条音效（`index/sound_info.json` 的一条） */
export interface PackageSound {
  /** 音效 id（小写 snake_case），如 `se_49mm_01` */
  id_name: string;
  /** 实际文件名，如 `SE_49mm_01.wav` */
  original_filename: string;
  description: string;
  /** `categories.json` 里的类别键，如 `SE` / `SFX`（无映射时即原始类别名） */
  category: string;
  /** 分类中文名（`categories.json` 映射）；缺映射时为类别键本身 */
  categoryLabel: string;
  /** 音频可访问 URL；文件缺失时为空串 */
  url: string;
  /** 音频文件是否真的存在 */
  exists: boolean;
  /** 音频时长（秒，小数保留一位）；未知时为 -1 */
  duration: number;
}

/** 音效类别（`index/categories.json` 的一条键值对） */
export interface PackageSoundCategory {
  /** 类别键，如 `SE` */
  id: string;
  /** 展示名，如 `剧情` */
  label: string;
  /** 该类别下的音效数；键未被引用时不下发 */
  count: number;
  /** 该类别下音效时长合计（秒，保留一位小数）；只统计可读时长的条目 */
  duration: number;
}

/** 一首背景音乐（`index/music_info.json` 的一条） */
export interface PackageMusic {
  /** 曲目 id，如 `theme_01` */
  name_id: string;
  /** 实际文件名，如 `Theme_01.ogg` */
  filename: string;
  title: string;
  artist: string;
  /** 完整描述（可能是多行剧情注释） */
  description: string;
  /** 音频可访问 URL；文件缺失时为空串 */
  url: string;
  /** 音频文件是否真的存在 */
  exists: boolean;
  /** 音频时长（秒，小数保留一位）；未知时为 -1 */
  duration: number;
}

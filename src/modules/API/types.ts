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

/** 表情里的一层图（一张 PNG；`parent >= 0` 表示相对于另一层定位） */
export interface PackageEmotionLayer {
  /** 图片可访问 URL；文件缺失时为空串 */
  image: string;
  /** 图片是否真的存在 */
  exists: boolean;
  /** 相对父层宽度（或 540 设计宽度）的比例，决定这一层的基准宽度 */
  scale: number;
  /** 这一层的动画时长（秒） */
  duration: number;
  /** 补间缓动，与 CSS `animation-timing-function` 同名 */
  ease: string;
  /** 变换原点（0–1，可为负），默认 [0,0] */
  anchor: [number, number];
  /** 相对父层（或舞台）的基准位置，单位为父层宽度 / 540 的倍数 */
  position: [number, number];
  /** 父层下标；`-1` 表示直接挂在舞台 */
  parent: number;
  /** 关键帧（时间为秒，从表情开始计） */
  keyframes: PackageEmotionKeyframe[];
}

/** 单层的一个关键帧；未写的属性沿用上一帧 */
export interface PackageEmotionKeyframe {
  /** 距离表情开始的时间（秒） */
  at: number;
  /** 不透明度 0–1 */
  opacity?: number;
  /** 相对基准宽度的缩放倍率 */
  zoom?: number;
  /** 设计单位位移（×540 后换算成像素） */
  x?: number;
  y?: number;
  /** 旋转角度（度） */
  rotate?: number;
}

/** 一个表情（`index/emotions.yml` 的一条） */
export interface PackageEmotion {
  /** 表情 id，如 `heart`；同时也是音效名 */
  id: string;
  /** 展示名，如「爱心」 */
  name: string;
  description: string;
  /** 相对角色头顶锚点的偏移（540 设计宽度倍数） */
  offset: [number, number];
  /** 整个表情的总时长（秒） */
  duration: number;
  /** 音效可访问 URL；无音效时为空串 */
  soundUrl: string;
  /** 音效文件是否真的存在 */
  soundExists: boolean;
  /** 合成用的图层，顺序即叠放顺序 */
  layers: PackageEmotionLayer[];
}

/** 一张背景图（背景目录下的一级文件） */
export interface PackageBackground {
  /** 文件名（含扩展名），如 `BG_ClassRoom.jpg` */
  name: string;
  /** 相对背景目录的路径（含分类子目录），用于拼下发 URL */
  path: string;
  /** 小写扩展名，含点（`.jpg` / `.png`） */
  ext: string;
  /** 字节数 */
  size: number;
  url: string;
}

/** 背景分类（`index/category.yml` 的一条；未分类的 `id` 为空串） */
export interface PackageBackgroundCategory {
  /** 分类 id；未分类为空串 */
  id: string;
  /** 展示名，如「学校相关」；未分类为「未分类」 */
  label: string;
  /** 分类说明；未分类为空串 */
  description: string;
  /** 该分类下的图片数 */
  count: number;
  images: PackageBackground[];
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

/**
 * 主界面（Home）菜单配置。
 *
 * 目前全部入口只做占位：保留点击热区与视觉层级，暂不接入实际页面。
 * 后续接入模块时在 `router` 中新增路由，并在对应入口补充 `to` 即可。
 */
export type HomeArtVariant = 'editor' | 'reader' | 'scene3d' | 'assets' | 'more';

export interface HomeMenuEntry {
  /** 入口唯一标识（同时作为插画资源语义） */
  id: string;
  /** 主标题 */
  title: string;
  /** 副标题：说明这个入口能做什么 */
  subtitle: string;
  /** 卡片插画变体 */
  art: HomeArtVariant;
}

export const HOME_MENU = {
  /** 左侧大卡：编辑模式 / 阅读模式 */
  modes: [
    { id: 'editor', title: '编辑模式', subtitle: '进入故事节点编辑器', art: 'editor' },
    { id: 'reader', title: '阅读模式', subtitle: '进入剧情选择页面', art: 'reader' },
  ],
  /** 右侧上排：3D场景 / 资源管理 */
  features: [
    { id: 'scene3d', title: '3D场景', subtitle: '编排立体场景脚本(未完成)', art: 'scene3d' },
    { id: 'assets', title: '资源管理', subtitle: '资源包/工程/剧情/插件管理', art: 'assets' },
  ],
  /** 右侧下排：更多功能 */
  more: { id: 'more', title: '更多功能', subtitle: '插件与实用工具入口', art: 'more' },
} satisfies {
  modes: HomeMenuEntry[];
  features: HomeMenuEntry[];
  more: HomeMenuEntry;
};

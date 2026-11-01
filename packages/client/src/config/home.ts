/**
 * 主界面（Home）菜单配置。
 *
 * 入口只登记标题、副标题与插画；接入实际页面时在 `router` 中新增路由，
 * 并在对应入口补上 `route`（目标路由名）。没有 `route` 的入口仍是占位。
 */
import { ROUTE_NAMES } from '@/config/routes';

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
  /** 目标路由名；缺省表示尚未接页面 */
  route?: string;
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
    {
      id: 'assets',
      title: '资源管理',
      subtitle: '资源包/工程/存档/插件管理',
      art: 'assets',
      route: ROUTE_NAMES.resources,
    },
  ],
  /** 右侧下排：更多功能 */
  more: {
    id: 'more',
    title: '更多功能',
    subtitle: '插件与实用工具入口',
    art: 'more',
    route: ROUTE_NAMES.tools,
  },
} satisfies {
  modes: HomeMenuEntry[];
  features: HomeMenuEntry[];
  more: HomeMenuEntry;
};

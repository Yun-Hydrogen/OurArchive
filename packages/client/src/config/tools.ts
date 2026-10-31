/**
 * 工具页（Tools）入口配置。
 *
 * 主界面「更多功能」进入这里；每个工具一张卡片，`route` 指向工具自己的页面。
 * 新增工具时在这里追加一条，并在 `router` 里登记对应路由。
 */
import { ROUTE_NAMES } from '@/config/routes';

export type ToolArtVariant = 'skeleton';

export interface ToolEntry {
  /** 工具唯一标识，同时作为插画语义 */
  id: string;
  /** 主标题 */
  title: string;
  /** 副标题：一句话说明这个工具能做什么 */
  subtitle: string;
  /** 卡片插画变体 */
  art: ToolArtVariant;
  /** 目标路由名 */
  route: string;
}

export const TOOL_ENTRIES: ToolEntry[] = [
  {
    id: 'skeleton-preview',
    title: 'BA 立绘骨骼预览',
    subtitle: '载入 .skel / .atlas / 贴图，预览并切换立绘差分',
    art: 'skeleton',
    route: ROUTE_NAMES.skeletonPreview,
  },
];

/**
 * 路由表。
 * 默认（不带路径）访问进入 splash。
 */
export const ROUTE_NAMES = {
  splash: 'splash',
  home: 'home',
  tools: 'tools',
  skeletonPreview: 'skeletonPreview',
} as const;

export const ROUTE_PATHS = {
  splash: '/',
  home: '/home',
  tools: '/tools',
  skeletonPreview: '/tools/skeleton',
} as const;

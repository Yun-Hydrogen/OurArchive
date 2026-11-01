/**
 * 路由表。
 * 默认（不带路径）访问进入 splash。
 */
export const ROUTE_NAMES = {
  splash: 'splash',
  home: 'home',
  tools: 'tools',
  skeletonPreview: 'skeletonPreview',
  resources: 'resources',
  packageDetail: 'packageDetail',
  packageCharacter: 'packageCharacter',
} as const;

export const ROUTE_PATHS = {
  splash: '/',
  home: '/home',
  tools: '/tools',
  skeletonPreview: '/tools/skeleton',
  resources: '/resources',
  /** 资源包详情，`packageId` 为 res/ 下的目录名 */
  packageDetail: '/resources/:packageId',
  /** 资源包内的角色详情 */
  packageCharacter: '/resources/:packageId/character/:nameId',
} as const;

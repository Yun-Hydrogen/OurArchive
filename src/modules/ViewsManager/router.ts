import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/config/routes';
import { isAppUnlocked } from '@/router/access';

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.splash,
    name: ROUTE_NAMES.splash,
    component: () => import('@/views/SplashView.vue'),
    meta: { title: 'Our Archive' },
  },
  {
    path: ROUTE_PATHS.home,
    name: ROUTE_NAMES.home,
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Our Archive - 主界面' },
  },
  {
    path: ROUTE_PATHS.tools,
    name: ROUTE_NAMES.tools,
    component: () => import('@/views/ToolsView.vue'),
    meta: { title: 'Our Archive - 工具' },
  },
  {
    path: ROUTE_PATHS.skeletonPreview,
    name: ROUTE_NAMES.skeletonPreview,
    component: () => import('@/views/SkeletonPreviewView.vue'),
    meta: { title: 'Our Archive - 立绘骨骼预览' },
  },
  {
    path: ROUTE_PATHS.resources,
    name: ROUTE_NAMES.resources,
    component: () => import('@/views/ResourcesView.vue'),
    meta: { title: 'Our Archive - 资源管理' },
  },
  {
    path: ROUTE_PATHS.packageDetail,
    name: ROUTE_NAMES.packageDetail,
    component: () => import('@/views/PackageView.vue'),
    meta: { title: 'Our Archive - 资源包' },
  },
  {
    path: ROUTE_PATHS.packageCharacter,
    name: ROUTE_NAMES.packageCharacter,
    component: () => import('@/views/PackageCharacterView.vue'),
    meta: { title: 'Our Archive - 角色详情' },
  },
  {
    // 未知路径一律回入口，避免深层地址落在一个空页面上
    path: '/:pathMatch(.*)*',
    redirect: () => ROUTE_PATHS.splash,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * 入口闸门：只有从 splash gate 进入过，才允许访问其它页面。
 * 直接访问 /home（或刷新、外部链接跳转）都会换到 `/`，且不污染历史栈。
 */
router.beforeEach((to) => {
  if (to.name === ROUTE_NAMES.splash) {
    return true;
  }

  if (!isAppUnlocked()) {
    return { name: ROUTE_NAMES.splash, replace: true };
  }

  return true;
});

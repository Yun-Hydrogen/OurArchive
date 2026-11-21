import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/modules/ViewsManager/routes';
import {
  canRestoreSession,
  isAppUnlocked,
  rememberRoute,
  unlockApp,
} from '@/modules/ViewsManager/access';
import { useAppShell } from '@/modules/Shell/useAppShell';

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
    component: () => import('@/views/package/PackageView.vue'),
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
 * 入口闸门 + 会话保持。
 *
 * - 正常进入：只有从 splash gate 进入过，才允许访问其它页面；
 * - 刷新恢复：开启「会话保持」时，本会话解锁过且记着上一页，就直接放行深层地址，
 *   并让外壳跳过 splash（不强制跳转）；否则维持原行为回到 `/`。
 */
router.beforeEach((to) => {
  if (to.name === ROUTE_NAMES.splash) {
    return true;
  }

  if (isAppUnlocked()) {
    return true;
  }

  if (canRestoreSession()) {
    unlockApp();
    useAppShell().enterSession();
    return true;
  }

  return { name: ROUTE_NAMES.splash, replace: true };
});

/** 记住停留过的页面，供刷新后恢复 */
router.afterEach((to) => {
  if (to.name === ROUTE_NAMES.splash) {
    return;
  }
  rememberRoute(to.fullPath);
});

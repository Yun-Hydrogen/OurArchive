import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/config/routes';

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.splash,
    name: ROUTE_NAMES.splash,
    component: () => import('@/views/SplashView.vue'),
    meta: { title: 'Our Archive' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

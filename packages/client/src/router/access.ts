import { ref } from 'vue';

/**
 * 应用入口闸门状态。
 *
 * 只允许从根地址（端口号）进入 splash gate，通过 gate 之后才解锁其它路由；
 * 直接访问 `/home` 等深层地址会被路由守卫重定向回 gate。
 *
 * 状态刻意放在内存里而不落 sessionStorage：刷新即回到 gate，
 * 保证「每次都是从入口进入」的行为一致，也避免残留在浏览器历史里的深层地址失效。
 */
const isUnlocked = ref(false);

/** 通过 splash gate（产生首次用户手势）后调用 */
export function unlockApp() {
  isUnlocked.value = true;
}

export function isAppUnlocked(): boolean {
  return isUnlocked.value;
}

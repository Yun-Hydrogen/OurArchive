import { ref } from 'vue';

/**
 * 应用入口闸门 + 会话保持。
 *
 * 闸门：只有从 splash gate 进入过，才允许访问其它页面。
 * 会话保持：把最近一次停留的地址存进 `sessionStorage`，刷新时可以直接回到原页面，
 * 而不是被强制打回 splash。开关来自全局配置 `keep_session`（默认开启）。
 */

const UNLOCK_KEY = 'oa:unlocked';
const ROUTE_KEY = 'oa:last-route';
const KEEP_SESSION_KEY = 'oa:keep-session';

const isUnlocked = ref(false);

/** 会话保持开关的本地镜像：路由守卫在配置加载前就要同步判断，因此另存一份 */
function readKeepSession(): boolean {
  try {
    return window.localStorage.getItem(KEEP_SESSION_KEY) !== '0';
  } catch {
    return true;
  }
}

/** 由配置加载 / 设置项变更时调用，把开关同步到本地镜像 */
export function setKeepSession(enabled: boolean) {
  try {
    window.localStorage.setItem(KEEP_SESSION_KEY, enabled ? '1' : '0');
  } catch {
    // 隐私模式下 localStorage 可能不可用，忽略即可
  }

  if (!enabled) {
    clearRememberedRoute();
  }
}

export function isKeepSessionEnabled(): boolean {
  return readKeepSession();
}

/** 记住当前地址（只记非 splash 的页面） */
export function rememberRoute(fullPath: string) {
  if (!readKeepSession() || !fullPath || fullPath === '/') {
    return;
  }
  try {
    window.sessionStorage.setItem(ROUTE_KEY, fullPath);
  } catch {
    // 忽略存储异常
  }
}

/** 取出记住的地址；没有则返回空串 */
export function rememberedRoute(): string {
  try {
    return window.sessionStorage.getItem(ROUTE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function clearRememberedRoute() {
  try {
    window.sessionStorage.removeItem(ROUTE_KEY);
    window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // 忽略存储异常
  }
}

/** 通过 splash gate（产生首次用户手势）后调用 */
export function unlockApp() {
  isUnlocked.value = true;
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    // 忽略存储异常
  }
}

export function isAppUnlocked(): boolean {
  return isUnlocked.value;
}

/**
 * 刷新后能否直接恢复：会话保持开启、本会话解锁过、并且记着上一页。
 * 满足条件时路由守卫会放行深层地址，并把外壳直接置为「已进入」状态。
 */
export function canRestoreSession(): boolean {
  if (!readKeepSession()) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === '1' && Boolean(rememberedRoute());
  } catch {
    return false;
  }
}

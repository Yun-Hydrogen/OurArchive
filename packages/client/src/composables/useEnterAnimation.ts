import { onBeforeUnmount, ref, watch } from 'vue';

/**
 * 卡片 / 面板的入场动画开关。
 *
 * 入场计时从「内容可以显示」的那一刻开始，而不是从组件挂载开始：
 * 数据还没回来时一直保持 `isEntering = true`，等进度条淡出、内容真正挂上之后再播，
 * 避免「进度条一走完，卡片就硬切进来」。
 *
 * @param isReady 内容是否已可显示（通常是 `!loading`）
 * @param duration 入场动画总时长（含错峰延迟），到点后撤掉 class
 */
export function useEnterAnimation(isReady: () => boolean, duration: number) {
  const isEntering = ref(true);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  watch(
    isReady,
    (ready) => {
      clear();
      if (!ready) {
        // 重新加载：先把入场态挂回去，等结果出来再播
        isEntering.value = true;
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        isEntering.value = false;
      }, duration);
    },
    { immediate: true }
  );

  onBeforeUnmount(clear);

  return { isEntering };
}

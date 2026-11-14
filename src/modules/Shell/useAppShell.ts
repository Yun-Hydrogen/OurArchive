import { computed, ref } from 'vue';
import { readonlyRef } from '@/utils/reactivity';

/**
 * 应用外壳（App 层）的共享状态。
 *
 * **单例**：底色、气泡背景、banner、设置按钮都挂在 App 上，由这里驱动；
 * 路由切换时它们不会被销毁重建，因此从 splash 到 home 不会出现「整页重载」的观感。
 */
const stage = ref<'splash' | 'home'>('splash');
/** 是否已通过白屏引导（拿到首次用户手势） */
const gatePassed = ref(false);
/** 递增即重挂 banner SVG，让内部 CSS 动画从头播放 */
const bannerPlayToken = ref(0);

/** 状态变化 / 输入事件：模板直接绑定 */
export function useAppShell() {
  return {
    stage: readonlyRef(stage),
    isHome: computed(() => stage.value === 'home'),
    gatePassed: readonlyRef(gatePassed),
    bannerPlayToken: readonlyRef(bannerPlayToken),

    /** 进入主界面阶段：banner 停靠到左上角、底色渐变点亮 */
    enterHome() {
      stage.value = 'home';
    },

    /** 回到 splash：重新等待白屏引导，banner 先藏起来避免压在白屏上 */
    enterSplash() {
      stage.value = 'splash';
      gatePassed.value = false;
    },

    /** 白屏引导点击：解锁气泡 / banner / 设置 */
    markGatePassed() {
      gatePassed.value = true;
    },

    /** 重播 banner 动画：递增 token 让外壳重挂 SVG */
    playBannerAnimation() {
      bannerPlayToken.value += 1;
    },
  };
}

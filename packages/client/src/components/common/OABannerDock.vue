<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import OABannerSvg from '@/components/splash/OABannerSvg.vue';
import { HOME_ASSETS } from '@/config/assets';
import { SHELL_TIMING } from '@/config/transition';

const props = defineProps<{
  /** 是否停靠到左下角（主界面及所有内层页面） */
  docked: boolean;
  /** 是否可见（通过白屏引导后才显示） */
  visible: boolean;
  /** 递增即重挂动画版 banner */
  playToken: number;
}>();

const dock = ref<HTMLDivElement | null>(null);

const offsetX = ref(0);
const offsetY = ref(0);
const scale = ref(1);

/**
 * 以「中心点对齐」把舞台中心映射到停靠中心：
 * 两个状态的 transform 函数结构完全一致（translate(-50%,-50%) translate(x,y) scale(s)），
 * 所以插值是一条连续动画，而不是矩阵混合。
 */
function updateGeometry() {
  const el = dock.value;
  if (!el) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // `left/top: 50%` 的百分比是按不含滚动条的视口计算的，而 vw/vh 含滚动条
  const root = document.documentElement;
  const baseCX = (root.clientWidth || vw) / 2;
  const baseCY = (root.clientHeight || vh) / 2;

  // 舞台尺寸/位置与 CSS 保持一致：宽 min(46vw, 620px)，中心再上移 3vh
  const heroW = el.offsetWidth || Math.min(vw * 0.46, 620);
  const heroH = el.offsetHeight;
  if (!heroW || !heroH) return;

  // 停靠位与 CSS 的 clamp 保持一致（左下角的小尺寸品牌标记）
  const dockW = Math.min(Math.max(76, vw * 0.062), 104);
  const dockLeft = Math.min(Math.max(20, vw * 0.03), 42);
  const dockBottom = Math.min(Math.max(14, vh * 0.028), 30);
  const dockH = (heroH / heroW) * dockW;
  const dockTop = baseCY * 2 - dockBottom - dockH;

  scale.value = dockW / heroW;
  offsetX.value = dockLeft + dockW / 2 - baseCX;
  // 停靠态的 transform 里没有 -3vh，所以基准是不偏移的中心
  offsetY.value = dockTop + dockH / 2 - baseCY;
}

watch(() => props.docked, updateGeometry, { flush: 'post' });

onMounted(() => {
  updateGeometry();
  window.addEventListener('resize', updateGeometry, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateGeometry);
});
</script>

<template>
  <div
    ref="dock"
    class="oa-banner-dock"
    :class="{ 'is-docked': docked, 'is-visible': visible }"
    :style="{
      '--dock-dx': `${offsetX}px`,
      '--dock-dy': `${offsetY}px`,
      '--dock-scale': scale,
      '--morph': `${SHELL_TIMING.bannerMorph}ms`,
      '--fade': `${SHELL_TIMING.bannerCrossfade}ms`,
      '--fade-delay': `${SHELL_TIMING.bannerCrossfadeDelay}ms`,
    }"
    aria-hidden="true"
  >
    <div class="oa-banner-dock__inner">
      <OABannerSvg :key="playToken" class="oa-banner-dock__anim" />
      <img
        class="oa-banner-dock__static"
        :src="HOME_ASSETS.bannerTightUrl"
        alt=""
        draggable="false"
      />
    </div>
  </div>
</template>

<style scoped>
.oa-banner-dock {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 30;
  width: min(46vw, 620px);
  max-width: calc(100vw - 48px);
  transform: translate(-50%, -50%) translate(0, -3vh) scale(1);
  transform-origin: 50% 50%;
  opacity: 0;
  pointer-events: none;
  transition:
    transform var(--morph) cubic-bezier(0.22, 1, 0.36, 1),
    opacity 300ms ease;
  will-change: transform, opacity;
}

.oa-banner-dock.is-visible {
  opacity: 1;
}

.oa-banner-dock.is-docked {
  transform: translate(-50%, -50%) translate(var(--dock-dx), var(--dock-dy))
    scale(var(--dock-scale));
}

.oa-banner-dock__inner {
  display: grid;
}

.oa-banner-dock__inner > * {
  grid-area: 1 / 1;
  width: 100%;
  height: auto;
}

.oa-banner-dock__anim {
  transition: opacity var(--fade) ease;
}

.oa-banner-dock__static {
  opacity: 0;
  transition: opacity var(--fade) ease;
}

/* 停靠到位后再交叉淡入到静态横幅，缩放过程里一直用动画版，避免中途换图 */
.oa-banner-dock.is-docked .oa-banner-dock__anim {
  opacity: 0;
  transition-delay: var(--fade-delay);
}

.oa-banner-dock.is-docked .oa-banner-dock__static {
  opacity: 1;
  transition-delay: var(--fade-delay);
}
</style>

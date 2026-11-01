<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import OABannerDock from '@/components/common/OABannerDock.vue';
import OABubbles from '@/components/common/OABubbles.vue';
import OASettingsButton from '@/components/common/OASettingsButton.vue';
import OAAboutModal from '@/components/common/OAAboutModal.vue';
import OAMouseSpark from '@/components/common/OAMouseSpark.vue';
import { ROUTE_NAMES } from '@/config/routes';
import { useAppShell } from '@/composables/useAppShell';

const route = useRoute();
const { isHome, gatePassed, bannerPlayToken, enterHome, enterSplash } = useAppShell();

/** 关于信息弹窗显示状态 */
const isAboutOpen = ref(false);

function handleBannerClick() {
  isAboutOpen.value = true;
}

// 路由 → 外壳阶段：进主界面停靠 banner，回 splash 复位引导
watch(
  () => route.name,
  (name) => {
    if (name === ROUTE_NAMES.home) {
      enterHome();
    } else if (name === ROUTE_NAMES.splash) {
      enterSplash();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="oa-shell">
    <!-- 常驻底色：纯白 ↔ 浅蓝渐变，跨路由只做透明度交叉 -->
    <div class="oa-shell__bg" :class="{ 'is-home': isHome }" aria-hidden="true" />

    <!-- 常驻气泡背景：只在首次点击后淡入，之后一直存在 -->
    <OABubbles :active="gatePassed" />

    <!-- 常驻 banner：窗口中央 ↔ 左下角，点击可弹出开发与贡献信息 -->
    <OABannerDock
      :docked="isHome"
      :visible="gatePassed"
      :play-token="bannerPlayToken"
      @click="handleBannerClick"
    />

    <!-- 常驻设置入口：过了白屏引导后常显，两个页面位置一致 -->
    <div v-if="gatePassed" class="oa-shell__settings">
      <OASettingsButton />
    </div>

    <div class="oa-shell__view">
      <router-view />
    </div>
  </div>

  <!-- 开发与贡献信息弹窗 -->
  <OAAboutModal v-model:visible="isAboutOpen" />

  <OAMouseSpark />
</template>

<style scoped>
.oa-shell {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 100vh;
}

.oa-shell__bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: #ffffff;
  pointer-events: none;
}

.oa-shell__bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 480px at 8% -12%, #ffffff 0%, rgba(255, 255, 255, 0) 62%),
    linear-gradient(158deg, #eaf7ff 0%, #d3ecfc 42%, #b9ddf5 100%);
  opacity: 0;
  transition: opacity 620ms ease;
}

.oa-shell__bg.is-home::after {
  opacity: 1;
}

.oa-shell__settings {
  position: fixed;
  top: clamp(14px, 2.4vh, 26px);
  right: clamp(20px, 3vw, 42px);
  z-index: 40;
}

.oa-shell__view {
  position: relative;
  z-index: 10;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 100vh;
}
</style>

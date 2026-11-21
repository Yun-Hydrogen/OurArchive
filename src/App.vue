<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import OABannerDock from '@/modules/Shell/OABannerDock.vue';
import OABubbles from '@/modules/Shell/OABubbles.vue';
import OASettingsButton from '@/modules/Shell/OASettingsButton.vue';
import OAAboutModal from '@/modules/Shell/OAAboutModal.vue';
import OAMouseSpark from '@/modules/Shell/OAMouseSpark.vue';
import OAResourcePickerHost from '@/modules/ResourcePicker/OAResourcePickerHost.vue';
import { ROUTE_NAMES } from '@/modules/ViewsManager/routes';
import { canRestoreSession, unlockApp } from '@/modules/ViewsManager/access';
import { useAppShell } from '@/modules/Shell/useAppShell';

const route = useRoute();
const { isHome, gatePassed, bannerPlayToken, enterHome, enterSplash, enterSession } =
  useAppShell();

/**
 * 资源库整段使用「沉浸外壳」：收起常驻 banner 与右上角悬浮设置，
 * 设置改为贴右缘的竖向把手，把整屏留给资源管理大容器。
 * 资源包详情 / 角色详情同属这一段，避免进入子页时 banner 与设置按钮跳位。
 */
const IMMERSIVE_ROUTES: string[] = [
  ROUTE_NAMES.resources,
  ROUTE_NAMES.packageDetail,
  ROUTE_NAMES.packageCharacter,
];
const isImmersive = computed(() => IMMERSIVE_ROUTES.includes(String(route.name ?? '')));

/** 关于信息弹窗显示状态 */
const isAboutOpen = ref(false);

function handleBannerClick() {
  isAboutOpen.value = true;
}

// 路由 → 外壳阶段：splash 以外的页面都按「已进入」处理，回 splash 则复位引导
watch(
  () => route.name,
  (name) => {
    if (name === ROUTE_NAMES.splash || !name) {
      enterSplash();
      return;
    }

    // 刷新恢复（会话保持）：直接点亮外壳，不强制跳回引导页
    if (!gatePassed.value && canRestoreSession()) {
      unlockApp();
      enterSession();
      return;
    }

    enterHome();
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
      :visible="gatePassed && !isImmersive"
      :play-token="bannerPlayToken"
      @click="handleBannerClick"
    />

    <!-- 常驻设置入口：普通页面悬浮右上角，资源库沉浸页改为右缘竖向把手 -->
    <div
      v-if="gatePassed"
      class="oa-shell__settings"
      :class="{ 'is-edge': isImmersive }"
    >
      <OASettingsButton :variant="isImmersive ? 'edge' : 'float'" />
    </div>

    <div class="oa-shell__view">
      <router-view />
    </div>
  </div>

  <!-- 开发与贡献信息弹窗 -->
  <OAAboutModal v-model:visible="isAboutOpen" />

  <!-- 通用资源选择器：角色 / 骨骼，由 openResourcePicker() 唤起 -->
  <OAResourcePickerHost />

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

/* 沉浸页：设置按钮贴到视口右缘、垂直居中 */
.oa-shell__settings.is-edge {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
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

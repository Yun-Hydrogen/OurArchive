<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 是否显示（用于淡入，例如用户首次交互后） */
    active?: boolean;
  }>(),
  { active: true }
);

const BUBBLES = [
  'oa-bubbles__bub--1',
  'oa-bubbles__bub--2',
  'oa-bubbles__bub--3',
  'oa-bubbles__bub--4',
  'oa-bubbles__bub--5',
  'oa-bubbles__bub--6',
  'oa-bubbles__bub--7',
  'oa-bubbles__bub--8',
  'oa-bubbles__bub--9',
  'oa-bubbles__bub--10',
] as const;
</script>

<template>
  <div class="oa-bubbles" :class="{ 'is-active': active }" aria-hidden="true">
    <span v-for="bubble in BUBBLES" :key="bubble" class="oa-bubbles__bub" :class="bubble" />
  </div>
</template>

<style scoped>
.oa-bubbles {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  filter: blur(12px);
  opacity: 0;
  transition: opacity 1.6s ease;
}

.oa-bubbles.is-active {
  opacity: 1;
}

.oa-bubbles__bub {
  position: absolute;
  border-radius: 50%;
  background: var(--oa-blue, #0090fe);
  animation: oa-bubbles__bub-float var(--dur, 20s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
  will-change: transform;
}

.oa-bubbles__bub--1 { width: 190px; height: 190px; top: 6%; left: 6%; --dur: 38s; --delay: 0s; opacity: 0.1; }
.oa-bubbles__bub--2 { width: 180px; height: 180px; top: 55%; left: 75%; --dur: 35s; --delay: -5s; opacity: 0.15; }
.oa-bubbles__bub--3 { width: 200px; height: 200px; top: 72%; left: 8%; --dur: 40s; --delay: -10s; opacity: 0.14; }
.oa-bubbles__bub--4 { width: 185px; height: 185px; top: 18%; left: 60%; --dur: 36s; --delay: -15s; opacity: 0.15; }
.oa-bubbles__bub--5 { width: 195px; height: 195px; top: 38%; left: 35%; --dur: 42s; --delay: -7s; opacity: 0.12; }
.oa-bubbles__bub--6 { width: 190px; height: 190px; top: 80%; left: 48%; --dur: 34s; --delay: -12s; opacity: 0.15; }
.oa-bubbles__bub--7 { width: 180px; height: 180px; top: 14%; left: 84%; --dur: 38s; --delay: -3s; opacity: 0.14; }
.oa-bubbles__bub--8 { width: 200px; height: 200px; top: 48%; left: 14%; --dur: 41s; --delay: -9s; opacity: 0.13; }
.oa-bubbles__bub--9 { width: 185px; height: 185px; top: 60%; left: 52%; --dur: 37s; --delay: -14s; opacity: 0.15; }
.oa-bubbles__bub--10 { width: 195px; height: 195px; top: 30%; left: 78%; --dur: 39s; --delay: -6s; opacity: 0.14; }

@keyframes oa-bubbles__bub-float {
  0% { transform: translate(0, 0) scale(1); }
  20% { transform: translate(90px, -70px) scale(1.08); }
  40% { transform: translate(-65px, 80px) scale(0.92); }
  60% { transform: translate(-100px, -35px) scale(1.06); }
  80% { transform: translate(45px, 55px) scale(0.96); }
  100% { transform: translate(0, 0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .oa-bubbles__bub {
    animation: none;
  }
}
</style>

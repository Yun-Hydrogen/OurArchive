<script setup lang="ts">
import { ref } from 'vue';
import { useMouseSpark, type MouseSparkOptions } from '@/composables/useMouseSpark';

const props = withDefaults(defineProps<MouseSparkOptions>(), {
  color: '45,175,255',
  scale: 1.3,
  opacity: 1.0,
  clickSpeed: 1.0,
  trailSpeed: 1.0,
  enableTrail: true,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

useMouseSpark(canvasRef, props);
</script>

<template>
  <canvas ref="canvasRef" class="oa-mouse-spark-canvas" aria-hidden="true" />
</template>

<style scoped>
.oa-mouse-spark-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 99999;
}
</style>

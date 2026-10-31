<script setup lang="ts">
import { computed } from 'vue';
import type { ToolArtVariant } from '@/config/tools';

const props = defineProps<{
  variant: ToolArtVariant;
}>();

const ART_LABELS: Record<ToolArtVariant, string> = {
  skeleton: '立绘骨骼与差分预览插图',
};

const label = computed(() => ART_LABELS[props.variant]);

// 同一页面可能有多张卡，渐变与图案 ID 必须按变体隔离
const uid = computed(() => `oa-tool-art-${props.variant}`);
</script>

<template>
  <div class="oa-tool-art">
    <svg
      class="oa-tool-art__svg"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      :aria-label="label"
      shape-rendering="geometricPrecision"
      text-rendering="geometricPrecision"
    >
      <defs>
        <linearGradient :id="`${uid}-bg`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f8fcff" />
          <stop offset="100%" stop-color="#e9f5fe" />
        </linearGradient>
        <linearGradient :id="`${uid}-blue`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>
        <linearGradient :id="`${uid}-figure`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#bfe6fb" />
          <stop offset="100%" stop-color="#8ecdf4" />
        </linearGradient>
        <pattern
          :id="`${uid}-dots`"
          x="0"
          y="0"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.1" fill="#c3e1f7" opacity="0.6" />
        </pattern>
      </defs>

      <rect width="400" height="260" :fill="`url(#${uid}-bg)`" />
      <rect width="400" height="260" :fill="`url(#${uid}-dots)`" />

      <!-- 光环：立绘的标志性元素 -->
      <circle
        cx="200"
        cy="92"
        r="52"
        fill="none"
        :stroke="`url(#${uid}-blue)`"
        stroke-width="2.4"
        opacity="0.35"
      />
      <circle
        cx="200"
        cy="92"
        r="40"
        fill="none"
        :stroke="`url(#${uid}-blue)`"
        stroke-width="1.4"
        opacity="0.22"
      />

      <!-- 立绘剪影 -->
      <circle cx="200" cy="84" r="23" :fill="`url(#${uid}-figure)`" />
      <path
        d="M200 109c-25 0-43 18-47 43-2 12-3 25-3 37h100c0-12-1-25-3-37-4-25-22-43-47-43z"
        :fill="`url(#${uid}-figure)`"
      />

      <!-- 骨骼节点与连线 -->
      <g :stroke="`url(#${uid}-blue)`" stroke-width="2" fill="#ffffff" stroke-linecap="round">
        <path
          d="M200 60v76M200 96l-32 26M200 96l32 26M200 136l-21 42M200 136l21 42"
          fill="none"
        />
        <circle cx="200" cy="60" r="5.5" />
        <circle cx="200" cy="96" r="5.5" />
        <circle cx="200" cy="136" r="5.5" />
        <circle cx="168" cy="122" r="4.5" />
        <circle cx="232" cy="122" r="4.5" />
        <circle cx="179" cy="178" r="4.5" />
        <circle cx="221" cy="178" r="4.5" />
      </g>

      <!-- 差分缩略条：表达「拆分选择」 -->
      <g transform="translate(112 206)">
        <rect x="0" y="0" width="176" height="34" rx="9" fill="#ffffff" opacity="0.94" />
        <rect x="8" y="7" width="20" height="20" rx="5" :fill="`url(#${uid}-blue)`" />
        <rect x="34" y="7" width="20" height="20" rx="5" fill="#d8ecfa" />
        <rect x="60" y="7" width="20" height="20" rx="5" fill="#d8ecfa" />
        <rect x="86" y="7" width="20" height="20" rx="5" fill="#d8ecfa" />
        <rect x="112" y="7" width="20" height="20" rx="5" fill="#d8ecfa" />
        <rect x="138" y="7" width="20" height="20" rx="5" fill="#eaf5fd" />
      </g>

      <!-- 角落装饰 -->
      <path
        d="M28 38h22M28 38v22"
        :stroke="`url(#${uid}-blue)`"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.4"
        fill="none"
      />
      <path
        d="M372 222h-22M372 222v-22"
        :stroke="`url(#${uid}-blue)`"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.4"
        fill="none"
      />
    </svg>
  </div>
</template>

<style scoped>
.oa-tool-art {
  display: block;
  width: 100%;
  height: 100%;
}

.oa-tool-art__svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

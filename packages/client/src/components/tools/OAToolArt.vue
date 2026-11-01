<script setup lang="ts">
import { computed } from 'vue';
import type { ToolArtVariant } from '@/config/tools';

const props = defineProps<{
  variant: ToolArtVariant;
}>();

const ART_LABELS: Record<ToolArtVariant, string> = {
  skeleton: 'Spine 立绘骨骼与差分插槽预览插图',
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
        <!-- 现代清爽微蓝渐变底 -->
        <linearGradient :id="`${uid}-bg`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f8fcff" />
          <stop offset="100%" stop-color="#ebf5fd" />
        </linearGradient>

        <!-- 品牌主蓝渐变 -->
        <linearGradient :id="`${uid}-blue`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0090fe" />
        </linearGradient>

        <!-- 骨骼渐变：高饱和蓝青渐变 -->
        <linearGradient :id="`${uid}-bone`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0090fe" />
          <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>

        <!-- 投影滤镜 -->
        <filter :id="`${uid}-shadow`" x="-8%" y="-8%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#144270" flood-opacity="0.07" />
        </filter>

        <!-- 点阵背景 -->
        <pattern :id="`${uid}-dots`" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#c3e1f7" opacity="0.65" />
        </pattern>
      </defs>

      <!-- 底板背景与点阵画布 -->
      <rect width="400" height="260" :fill="`url(#${uid}-bg)`" />
      <rect width="400" height="260" :fill="`url(#${uid}-dots)`" />

      <!-- 取景框四角标 -->
      <g stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.65">
        <path d="M 20 20 h 14 M 20 20 v 14" />
        <path d="M 380 20 h -14 M 380 20 v 14" />
        <path d="M 20 240 h 14 M 20 240 v -14" />
        <path d="M 380 240 h -14 M 380 240 v -14" />
      </g>

      <!-- 顶部信息栏 -->
      <g>
        <!-- 骨骼立绘工程状态胶囊 -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="24" y="14" width="156" height="22" rx="11" fill="#ffffff" stroke="#cde4f7" stroke-width="1.2" />
          <circle cx="36" cy="25" r="3.5" fill="#10b981" />
          <rect x="46" y="22" width="80" height="6" rx="3" fill="#1e293b" />
          <rect x="132" y="22" width="36" height="6" rx="3" fill="#0090fe" />
        </g>

        <!-- 格式与模式徽标 -->
        <g transform="translate(262, 14)">
          <rect x="0" y="0" width="46" height="20" rx="5" fill="#e0f2fe" stroke="#bae6fd" stroke-width="1" />
          <rect x="8" y="7" width="30" height="6" rx="2" fill="#0284c7" />

          <rect x="52" y="0" width="48" height="20" rx="5" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
          <rect x="60" y="7" width="32" height="6" rx="2" fill="#64748b" />

          <rect x="106" y="0" width="22" height="20" rx="5" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1" />
          <circle cx="117" cy="10" r="3" fill="#16a34a" />
        </g>
      </g>

      <!-- ======================================================== -->
      <!-- 中央与左侧：完整的 2D Spine 立绘人偶、骨骼链与形变网格 -->
      <!-- ======================================================== -->
      <g>
        <!-- 立绘投影地台 / 底盘 (Stage Pedestal) -->
        <g transform="translate(142, 230)">
          <!-- 外圈透视投影圆环 -->
          <ellipse cx="0" cy="0" rx="64" ry="14" fill="#e0f2fe" fill-opacity="0.5" stroke="#93c5fd" stroke-width="1.2" stroke-dasharray="4 2" />
          <!-- 内圈高亮环 -->
          <ellipse cx="0" cy="0" rx="42" ry="9" fill="none" stroke="#0090fe" stroke-width="1.2" opacity="0.65" />
          <!-- 舞台中心定位十字 -->
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#0284c7" stroke-width="1.2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#0284c7" stroke-width="1.2" />
        </g>

        <!-- 立绘身形外框半透明假人假体 (Standing Portrait Mannequin Silhouette) -->
        <g fill="#e0f2fe" fill-opacity="0.4" stroke="#7dd3fc" stroke-width="1.2">
          <!-- 头部轮廓 -->
          <ellipse cx="142" cy="62" rx="17" ry="20" />
          <!-- 颈肩胸躯干 -->
          <path d="M 136 82 L 148 82 L 158 98 L 152 134 L 132 134 L 126 98 Z" />
          <!-- 裙摆 / 外袍下摆 (带轻微飘逸感) -->
          <path d="M 132 134 L 152 134 L 166 166 L 118 166 Z" />
          <!-- 左手臂轮廓 (微屈垂下) -->
          <path d="M 126 98 L 110 126 L 104 154 L 110 156 L 118 128 L 132 104 Z" />
          <!-- 右手臂轮廓 (叉腰/微展姿态) -->
          <path d="M 158 98 L 174 122 L 170 148 L 164 148 L 166 124 L 154 104 Z" />
          <!-- 左腿与鞋底 -->
          <path d="M 132 166 L 130 200 L 128 230 L 136 230 L 138 200 L 140 166 Z" />
          <!-- 右腿与鞋底 -->
          <path d="M 144 166 L 146 200 L 148 230 L 156 230 L 154 200 L 152 166 Z" />
        </g>

        <!-- 网格面多边形细分 (Spine 2D Mesh Triangulation) -->
        <g fill="#38bdf8" fill-opacity="0.08" stroke="#38bdf8" stroke-width="0.9" stroke-dasharray="2 2" opacity="0.8">
          <!-- 躯干到裙摆网格 -->
          <polygon points="126,98 142,86 158,98" />
          <polygon points="126,98 142,118 158,98" />
          <polygon points="126,98 132,134 142,118" />
          <polygon points="158,98 152,134 142,118" />
          <polygon points="132,134 152,134 142,148" />
          <polygon points="132,134 118,166 142,148" />
          <polygon points="152,134 166,166 142,148" />
          <polygon points="118,166 142,166 142,148" />
          <polygon points="166,166 142,166 142,148" />
          <!-- 网格控制顶点 (Vertices) -->
          <circle cx="142" cy="86" r="2" fill="#0284c7" />
          <circle cx="142" cy="118" r="2" fill="#0284c7" />
          <circle cx="142" cy="148" r="2.5" fill="#0090fe" />
          <circle cx="118" cy="166" r="2" fill="#0284c7" />
          <circle cx="166" cy="166" r="2" fill="#0284c7" />
          <circle cx="142" cy="166" r="2" fill="#0284c7" />
        </g>

        <!-- 骨骼系统 (Spine Bone Hierarchy) -->
        <g>
          <!-- 1. 骨盆/根骨骼 -> 胸腔骨骼 (Torso Bone) -->
          <polygon points="139,138 145,138 144,98 140,98" :fill="`url(#${uid}-bone)`" opacity="0.9" />

          <!-- 2. 胸腔骨骼 -> 头部骨骼 (Head Bone) -->
          <polygon points="140,98 144,98 143,62 141,62" :fill="`url(#${uid}-bone)`" opacity="0.9" />

          <!-- 3. 左手臂骨骼 (臂 -> 肘 -> 腕) -->
          <polygon points="136,98 114,127 111,124 135,96" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="114,127 107,152 104,150 111,124" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <!-- 4. 右手臂骨骼 -->
          <polygon points="148,98 168,123 171,121 149,96" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="168,123 166,146 163,145 171,121" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <!-- 5. 双腿骨骼 (髋 -> 膝 -> 踝) -->
          <polygon points="138,142 134,198 131,198 136,142" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="134,198 132,228 129,228 131,198" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <polygon points="146,142 150,198 153,198 148,142" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="150,198 152,228 155,228 153,198" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <!-- 骨骼关节控制圆环 (Joint Nodes) -->
          <!-- 头部关节点与脸部定位十字 -->
          <circle cx="142" cy="62" r="5" fill="#ffffff" stroke="#0090fe" stroke-width="2" />
          <circle cx="142" cy="62" r="2" fill="#0090fe" />
          <line x1="135" y1="62" x2="149" y2="62" stroke="#0284c7" stroke-width="1" stroke-dasharray="1 1" />
          <line x1="142" y1="55" x2="142" y2="69" stroke="#0284c7" stroke-width="1" stroke-dasharray="1 1" />

          <!-- 躯干关节点 -->
          <circle cx="142" cy="98" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="1.8" />
          <circle cx="142" cy="138" r="5.5" fill="#ffffff" stroke="#0090fe" stroke-width="2" />
          <circle cx="142" cy="138" r="2.2" fill="#0090fe" />

          <!-- 肩、肘、腕关节 -->
          <circle cx="136" cy="98" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="112" cy="126" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="106" cy="151" r="3" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />

          <circle cx="148" cy="98" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="170" cy="122" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="165" cy="146" r="3" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />

          <!-- 膝、踝关节 -->
          <circle cx="132.5" cy="198" r="3.5" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
          <circle cx="130.5" cy="228" r="3" fill="#ffffff" stroke="#0090fe" stroke-width="1.5" />

          <circle cx="151.5" cy="198" r="3.5" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
          <circle cx="153.5" cy="228" r="3" fill="#ffffff" stroke="#0090fe" stroke-width="1.5" />

          <!-- 光环挂点插槽 (Halo Attachment Bone & Socket) -->
          <g>
            <!-- 头部向上到光环骨骼的虚线连线 -->
            <line x1="142" y1="46" x2="142" y2="30" stroke="#0090fe" stroke-width="1.5" stroke-dasharray="2 2" />
            <!-- 光环插槽多边形/椭圆 -->
            <ellipse cx="142" cy="28" rx="24" ry="6" fill="none" stroke="#0090fe" stroke-width="1.8" />
            <circle cx="142" cy="28" r="3" fill="#38bdf8" stroke="#ffffff" stroke-width="1" />
            <!-- 插槽标签 -->
            <rect x="116" y="14" width="52" height="10" rx="3" fill="#e0f2fe" opacity="0.85" />
            <rect x="122" y="17" width="40" height="4" rx="2" fill="#0284c7" />
          </g>

          <!-- 旋转关节角度测量弧 (Rotation Arc) -->
          <path d="M 124 114 A 16 16 0 0 1 120 134" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" />
          <polygon points="120,134 116,128 124,129" fill="#10b981" />
          <rect x="94" y="120" width="18" height="10" rx="2.5" fill="#dcfce7" />
          <rect x="97" y="123" width="12" height="4" rx="1.5" fill="#15803d" />
        </g>
      </g>

      <!-- 头部骨骼到差分图层的连线 (Attachment Link) -->
      <path
        d="M 142 62 C 180 62, 195 90, 238 90"
        fill="none"
        stroke="#0090fe"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-dasharray="3 3"
      />
      <circle cx="238" cy="90" r="3.5" fill="#0090fe" stroke="#ffffff" stroke-width="1.2" />

      <!-- ======================================================== -->
      <!-- 右侧：立绘差分图层与表情插槽面板 (Expression Variants Panel) -->
      <!-- ======================================================== -->
      <g :filter="`url(#${uid}-shadow)`">
        <!-- 外层卡片容器 -->
        <rect x="238" y="44" width="138" height="194" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />

        <!-- 标题栏 -->
        <rect x="238" y="44" width="138" height="24" rx="8" fill="#f8fafc" />
        <rect x="238" y="58" width="138" height="10" fill="#f8fafc" />
        <circle cx="250" cy="56" r="2.5" fill="#0090fe" />
        <rect x="258" y="53" width="65" height="6" rx="3" fill="#1e293b" />
        <circle cx="362" cy="56" r="2.5" fill="#94a3b8" />

        <!-- 差分 1 (激活态：默认微笑表情) -->
        <g transform="translate(246, 74)">
          <rect x="0" y="0" width="122" height="38" rx="6" fill="#f0f9ff" stroke="#0090fe" stroke-width="1.5" />
          <!-- 差分立绘微缩图框 -->
          <rect x="6" y="6" width="26" height="26" rx="4" fill="#ffffff" stroke="#bae6fd" stroke-width="1" />
          <!-- 微笑表情简笔画符号 -->
          <path d="M 11 16 Q 14 13 17 16" fill="none" stroke="#0284c7" stroke-width="1.4" stroke-linecap="round" />
          <path d="M 21 16 Q 24 13 27 16" fill="none" stroke="#0284c7" stroke-width="1.4" stroke-linecap="round" />
          <path d="M 16 23 Q 19 26 22 23" fill="none" stroke="#0284c7" stroke-width="1.4" stroke-linecap="round" />
          <!-- 差分插槽文本标签 -->
          <rect x="38" y="11" width="56" height="6" rx="3" fill="#1e293b" />
          <rect x="38" y="21" width="36" height="5" rx="2.5" fill="#0284c7" />
          <!-- 激活标记勾 -->
          <circle cx="110" cy="19" r="6" fill="#0090fe" />
          <path d="M 108 19 L 110 21 L 113 17" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </g>

        <!-- 差分 2 (未激活：惊讶表情) -->
        <g transform="translate(246, 118)">
          <rect x="0" y="0" width="122" height="34" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
          <rect x="6" y="5" width="24" height="24" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
          <!-- 惊讶表情简笔画符号 -->
          <circle cx="13" cy="14" r="2" fill="#475569" />
          <circle cx="23" cy="14" r="2" fill="#475569" />
          <ellipse cx="18" cy="21" rx="2.2" ry="3" fill="none" stroke="#475569" stroke-width="1.2" />
          <!-- 文本条 -->
          <rect x="38" y="10" width="50" height="5" rx="2.5" fill="#475569" />
          <rect x="38" y="19" width="30" height="4" rx="2" fill="#94a3b8" />
          <circle cx="110" cy="17" r="2.5" fill="#cbd5e1" />
        </g>

        <!-- 差分 3 (未激活：闭眼笑 / 眨眼) -->
        <g transform="translate(246, 158)">
          <rect x="0" y="0" width="122" height="34" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
          <rect x="6" y="5" width="24" height="24" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
          <!-- 闭眼表情简笔画符号 -->
          <path d="M 11 16 L 14 13 L 11 10" fill="none" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 25 16 L 22 13 L 25 10" fill="none" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 16 21 Q 18 24 20 21" fill="none" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" />
          <!-- 文本条 -->
          <rect x="38" y="10" width="54" height="5" rx="2.5" fill="#475569" />
          <rect x="38" y="19" width="26" height="4" rx="2" fill="#94a3b8" />
          <circle cx="110" cy="17" r="2.5" fill="#cbd5e1" />
        </g>

        <!-- 底部插槽分类切换栏 -->
        <g transform="translate(246, 202)">
          <rect x="0" y="0" width="56" height="18" rx="4" fill="#e0f2fe" />
          <rect x="8" y="6" width="40" height="5" rx="2.5" fill="#0284c7" />
          <rect x="62" y="0" width="60" height="18" rx="4" fill="#f1f5f9" />
          <rect x="70" y="6" width="44" height="5" rx="2.5" fill="#64748b" />
        </g>
      </g>

      <!-- 左下角：立绘视口控制器与动作播放 (Viewport Controller) -->
      <g :filter="`url(#${uid}-shadow)`">
        <rect x="24" y="200" width="94" height="38" rx="6" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
        <!-- 动作播放图标与名称 -->
        <circle cx="36" cy="214" r="6" fill="#f0f9ff" stroke="#0090fe" stroke-width="1" />
        <polygon points="35,211 35,217 39,214" fill="#0090fe" />
        <rect x="48" y="211" width="44" height="6" rx="3" fill="#1e293b" />
        <!-- 缩放度与帧率 -->
        <rect x="30" y="225" width="24" height="5" rx="2.5" fill="#64748b" />
        <rect x="60" y="225" width="22" height="5" rx="2.5" fill="#10b981" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.oa-tool-art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background-color: #f0f7fd;
}

.oa-tool-art__svg {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 现代卡片微动效：聚焦或激活时平滑微推，不破坏外层 .oa-slot 布局 */
:deep(.oa-tool-card:hover) .oa-tool-art__svg {
  transform: scale(1.02);
}
</style>

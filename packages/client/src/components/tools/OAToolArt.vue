<script setup lang="ts">
import { computed } from 'vue';
import type { ToolArtVariant } from '@/config/tools';

const props = defineProps<{
  variant: ToolArtVariant;
}>();

const ART_LABELS: Record<ToolArtVariant, string> = {
  skeleton: 'Spine 2D 立绘骨骼绑定与差分插槽检视插图',
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
          <stop offset="100%" stop-color="#edf6fd" />
        </linearGradient>

        <!-- 主品牌蓝渐变 -->
        <linearGradient :id="`${uid}-blue`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0090fe" />
        </linearGradient>

        <!-- 骨骼渐变：高饱和高透蓝青渐变 -->
        <linearGradient :id="`${uid}-bone`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0090fe" />
          <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>

        <!-- 立绘素体剪影渐变：半透明高级浅冰蓝 -->
        <linearGradient :id="`${uid}-mannequin`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#dbeafe" stop-opacity="0.6" />
        </linearGradient>

        <!-- 悬浮阴影滤镜 -->
        <filter :id="`${uid}-shadow`" x="-10%" y="-10%" width="124%" height="124%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#144270" flood-opacity="0.08" />
        </filter>

        <!-- 柔和微光滤镜 -->
        <filter :id="`${uid}-glow`" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#38bdf8" flood-opacity="0.5" />
        </filter>

        <!-- 点阵背景图案 -->
        <pattern :id="`${uid}-dots`" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#c3e1f7" opacity="0.6" />
        </pattern>
      </defs>

      <!-- 底板背景与点阵视口画布 -->
      <rect width="400" height="260" :fill="`url(#${uid}-bg)`" />
      <rect width="400" height="260" :fill="`url(#${uid}-dots)`" />

      <!-- 取景框四角精准裁切标 -->
      <g stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.65">
        <path d="M 18 18 h 12 M 18 18 v 12" />
        <path d="M 382 18 h -12 M 382 18 v 12" />
        <path d="M 18 242 h 12 M 18 242 v -12" />
        <path d="M 382 242 h -12 M 382 242 v -12" />
      </g>

      <!-- ======================================================== -->
      <!-- 顶部 HUD 状态栏与工程模式徽章 -->
      <!-- ======================================================== -->
      <g>
        <!-- 骨骼立绘工程状态胶囊 -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="22" y="14" width="126" height="22" rx="11" fill="#ffffff" stroke="#cfe4f7" stroke-width="1.2" />
          <circle cx="34" cy="25" r="3.5" fill="#10b981" />
          <text
            x="44"
            y="28.5"
            fill="#0f172a"
            font-size="9.5"
            font-weight="700"
            font-family="system-ui, -apple-system, sans-serif"
            letter-spacing="0.02em"
          >
            SPINE 2D RIG
          </text>
          <rect x="110" y="19" width="30" height="12" rx="3" fill="#e0f2fe" />
          <text
            x="116"
            y="28"
            fill="#0284c7"
            font-size="8"
            font-weight="700"
            font-family="system-ui, -apple-system, sans-serif"
          >
            4.2
          </text>
        </g>

        <!-- 格式徽标 -->
        <g :filter="`url(#${uid}-shadow)`" transform="translate(288, 14)">
          <rect x="0" y="0" width="88" height="22" rx="11" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.2" />
          <text
            x="11"
            y="14.5"
            fill="#64748b"
            font-size="9"
            font-weight="600"
            font-family="system-ui, -apple-system, sans-serif"
            letter-spacing="0.04em"
          >
            .SKEL / .ATLAS
          </text>
        </g>
      </g>

      <!-- ======================================================== -->
      <!-- 中央与左侧：2D Spine 立绘人偶、骨骼链与形变网格 -->
      <!-- ======================================================== -->
      <g>
        <!-- 立绘投影地台 / 舞台底盘 (Stage Pedestal) -->
        <g transform="translate(136, 230)">
          <!-- 外圈透视投影圆环 (带刻度感) -->
          <ellipse
            cx="0"
            cy="0"
            rx="68"
            ry="15"
            fill="#e0f2fe"
            fill-opacity="0.45"
            stroke="#93c5fd"
            stroke-width="1.2"
            stroke-dasharray="4 2"
          />
          <!-- 内圈高亮舞台环 -->
          <ellipse cx="0" cy="0" rx="46" ry="10" fill="#ffffff" fill-opacity="0.7" stroke="#0090fe" stroke-width="1.4" />
          <!-- 舞台中心十字瞄准准星 -->
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#0284c7" stroke-width="1.2" stroke-linecap="round" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#0284c7" stroke-width="1.2" stroke-linecap="round" />
          <!-- 角度参考标记点 -->
          <circle cx="-38" cy="0" r="1.5" fill="#38bdf8" />
          <circle cx="38" cy="0" r="1.5" fill="#38bdf8" />
        </g>

        <!-- 立绘身形外框优雅二次元剪影 (Anime Standee Silhouette) -->
        <g :fill="`url(#${uid}-mannequin)`" stroke="#7dd3fc" stroke-width="1.2" stroke-linejoin="round">
          <!-- 头部与面部轮廓 (优雅二次元微下颌弧线) -->
          <path
            d="M 124 64 C 124 50, 148 50, 148 64 C 148 76, 143 85, 136 88 C 129 85, 124 76, 124 64 Z"
          />

          <!-- 二次元飘逸发丝外廓 (两侧鬓角与顶部呆毛剪影) -->
          <path
            d="M 136 46 C 132 38, 140 33, 138 44 C 137 46, 136 46, 136 46 Z"
            fill="#bae6fd"
            stroke="#60a5fa"
          />
          <path
            d="M 124 58 C 116 66, 112 84, 110 102 C 114 100, 118 94, 120 88 C 122 78, 120 68, 124 58 Z"
            fill="#bae6fd"
            fill-opacity="0.7"
          />
          <path
            d="M 148 58 C 156 66, 160 84, 162 102 C 158 100, 154 94, 152 88 C 150 78, 152 68, 148 58 Z"
            fill="#bae6fd"
            fill-opacity="0.7"
          />

          <!-- 领口、制服与胸腔躯干 -->
          <path d="M 128 88 L 144 88 L 152 100 L 146 134 L 126 134 L 120 100 Z" />

          <!-- 优雅飘逸的百褶裙摆 (立绘下摆) -->
          <path d="M 126 134 L 146 134 L 160 166 L 112 166 Z" />

          <!-- 左手臂 (自然垂落微曲立姿) -->
          <path d="M 120 100 L 108 124 L 104 150 L 109 152 L 116 128 L 126 104 Z" />

          <!-- 右手臂 (微展叉腰姿态) -->
          <path d="M 152 100 L 164 122 L 160 146 L 155 146 L 156 124 L 146 104 Z" />

          <!-- 修长腿部与鞋履 (立于投影地台) -->
          <!-- 左腿 -->
          <path d="M 125 166 L 124 196 L 122 228 L 129 228 L 131 196 L 132 166 Z" />
          <!-- 右腿 -->
          <path d="M 140 166 L 141 196 L 143 228 L 150 228 L 148 196 L 147 166 Z" />
        </g>

        <!-- 百褶裙褶裥线条 (增加二次元立绘服装精美度) -->
        <g stroke="#93c5fd" stroke-width="0.9" opacity="0.6">
          <line x1="126" y1="134" x2="120" y2="166" />
          <line x1="136" y1="134" x2="136" y2="166" />
          <line x1="146" y1="134" x2="152" y2="166" />
        </g>

        <!-- 网格面三角剖分细分 (Spine 2D Mesh Triangulation) -->
        <g fill="#38bdf8" fill-opacity="0.08" stroke="#38bdf8" stroke-width="0.9" stroke-dasharray="2 2" opacity="0.75">
          <polygon points="126,134 146,134 136,150" />
          <polygon points="126,134 112,166 136,150" />
          <polygon points="146,134 160,166 136,150" />
          <polygon points="112,166 136,166 136,150" />
          <polygon points="160,166 136,166 136,150" />
          <!-- 形变控制顶点 (Mesh Vertices) -->
          <circle cx="136" cy="150" r="2.2" fill="#0090fe" />
          <circle cx="112" cy="166" r="2" fill="#0284c7" />
          <circle cx="136" cy="166" r="2" fill="#0284c7" />
          <circle cx="160" cy="166" r="2" fill="#0284c7" />
        </g>

        <!-- 骨骼系统 (Spine Bone Hierarchy) -->
        <g>
          <!-- 1. 根骨/骨盆 -> 胸腔骨骼 (Torso Bone) -->
          <polygon points="134,134 138,134 137,98 135,98" :fill="`url(#${uid}-bone)`" opacity="0.9" />

          <!-- 2. 胸腔骨骼 -> 头部骨骼 (Head Bone) -->
          <polygon points="135,98 137,98 137,68 135,68" :fill="`url(#${uid}-bone)`" opacity="0.9" />

          <!-- 3. 左手臂骨骼 (臂 -> 肘 -> 腕) -->
          <polygon points="121,99 119,97 109,123 111,125" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="111,125 109,123 105,149 107,151" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <!-- 4. 右手臂骨骼 (臂 -> 肘 -> 腕) -->
          <polygon points="151,99 153,97 163,121 161,123" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="161,123 163,121 159,145 157,147" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <!-- 5. 双腿骨骼 (髋 -> 膝 -> 踝) -->
          <polygon points="128,136 126,194 124,194 126,136" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="126,194 124,226 122,226 124,194" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <polygon points="144,136 146,194 148,194 146,136" :fill="`url(#${uid}-bone)`" opacity="0.85" />
          <polygon points="146,194 148,226 150,226 148,194" :fill="`url(#${uid}-bone)`" opacity="0.85" />

          <!-- 骨骼关节控制圆环 (Joint Handles) -->
          <!-- 头部关节点与脸部定位十字 -->
          <circle cx="136" cy="68" r="5" fill="#ffffff" stroke="#0090fe" stroke-width="2" />
          <circle cx="136" cy="68" r="2" fill="#0090fe" />
          <line x1="130" y1="68" x2="142" y2="68" stroke="#0284c7" stroke-width="1" stroke-dasharray="1 1" />
          <line x1="136" y1="62" x2="136" y2="74" stroke="#0284c7" stroke-width="1" stroke-dasharray="1 1" />

          <!-- 躯干关节点 -->
          <circle cx="136" cy="98" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="1.8" />
          <circle cx="136" cy="134" r="5.5" fill="#ffffff" stroke="#0090fe" stroke-width="2" />
          <circle cx="136" cy="134" r="2.2" fill="#0090fe" />

          <!-- 肩、肘、腕关节 -->
          <circle cx="120" cy="98" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="110" cy="124" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="106" cy="150" r="3" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />

          <circle cx="152" cy="98" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="162" cy="122" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <circle cx="158" cy="146" r="3" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />

          <!-- 膝、踝关节 -->
          <circle cx="125" cy="195" r="3.5" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
          <circle cx="123" cy="226" r="3" fill="#ffffff" stroke="#0090fe" stroke-width="1.5" />

          <circle cx="147" cy="195" r="3.5" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
          <circle cx="149" cy="226" r="3" fill="#ffffff" stroke="#0090fe" stroke-width="1.5" />

          <!-- 基沃托斯特色光环挂点插槽 (Halo Attachment Bone & Socket) -->
          <g>
            <!-- 头部向上到光环骨骼的虚线连线 -->
            <line x1="136" y1="52" x2="136" y2="34" stroke="#0090fe" stroke-width="1.5" stroke-dasharray="2 2" />
            <!-- 光环插槽几何圆环与十字星 (蔚蓝档案光环精髓) -->
            <ellipse
              cx="136"
              cy="26"
              rx="26"
              ry="7"
              fill="none"
              stroke="#0090fe"
              stroke-width="1.8"
              :filter="`url(#${uid}-glow)`"
            />
            <!-- 光环中心十字星核 -->
            <polygon
              points="136,18 138,24 144,26 138,28 136,34 134,28 128,26 134,24"
              fill="#38bdf8"
              stroke="#0090fe"
              stroke-width="0.8"
            />
            <circle cx="136" cy="26" r="2" fill="#ffffff" />
            <!-- 光环插槽文本标签 -->
            <rect x="104" y="11" width="64" height="11" rx="3" fill="#e0f2fe" opacity="0.9" />
            <text
              x="109"
              y="19.5"
              fill="#0284c7"
              font-size="7.5"
              font-weight="700"
              font-family="system-ui, -apple-system, sans-serif"
            >
              [HALO_BONE]
            </text>
          </g>

          <!-- 关节旋转角度测量弧 (Rotation Arc) -->
          <path
            d="M 170 114 A 12 12 0 0 1 170 130"
            fill="none"
            stroke="#10b981"
            stroke-width="1.6"
            stroke-linecap="round"
          />
          <polygon points="170,130 166,124 173,126" fill="#10b981" />
          <rect x="175" y="117" width="28" height="12" rx="3" fill="#dcfce7" />
          <text
            x="178"
            y="126"
            fill="#15803d"
            font-size="7.5"
            font-weight="700"
            font-family="system-ui, -apple-system, sans-serif"
          >
            32.5°
          </text>
        </g>
      </g>

      <!-- 头部骨骼到差分图层的连线 (Attachment Slot Link) -->
      <path
        d="M 136 68 C 174 68, 194 82, 232 82"
        fill="none"
        stroke="#0090fe"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-dasharray="3 3"
      />
      <circle cx="232" cy="82" r="3.5" fill="#0090fe" stroke="#ffffff" stroke-width="1.2" />

      <!-- ======================================================== -->
      <!-- 右侧：立绘差分图层与表情插槽面板 (Expression Variants Panel) -->
      <!-- ======================================================== -->
      <g :filter="`url(#${uid}-shadow)`">
        <!-- 外层卡片容器 -->
        <rect x="232" y="32" width="148" height="204" rx="10" fill="#ffffff" stroke="#cfe4f7" stroke-width="1.2" />

        <!-- 标题栏 -->
        <path d="M 232 42 A 10 10 0 0 1 242 32 L 370 32 A 10 10 0 0 1 380 42 L 380 58 L 232 58 Z" fill="#f8fcff" />
        <line x1="232" y1="58" x2="380" y2="58" stroke="#e2e8f0" stroke-width="1" />
        <!-- 图标：图层叠加图标 -->
        <path d="M 242 45 L 247 42 L 252 45 L 247 48 Z" fill="#0090fe" />
        <path d="M 242 48 L 247 51 L 252 48" fill="none" stroke="#0284c7" stroke-width="1.2" />
        <text
          x="256"
          y="49"
          fill="#1e293b"
          font-size="9.5"
          font-weight="700"
          font-family="system-ui, -apple-system, sans-serif"
          letter-spacing="0.02em"
        >
          立绘差分 VARIANTS
        </text>
        <rect x="350" y="39" width="22" height="13" rx="3" fill="#e0f2fe" />
        <text
          x="354"
          y="49"
          fill="#0284c7"
          font-size="8"
          font-weight="700"
          font-family="system-ui, -apple-system, sans-serif"
        >
          3/12
        </text>

        <!-- 差分 1 (激活态：默认微笑表情 Face_Smile) -->
        <g transform="translate(239, 64)">
          <rect x="0" y="0" width="134" height="42" rx="7" fill="#f0f9ff" stroke="#0090fe" stroke-width="1.5" />
          <!-- 差分立绘微缩图框 -->
          <rect x="5" y="5" width="32" height="32" rx="5" fill="#ffffff" stroke="#bae6fd" stroke-width="1" />
          <!-- 微笑表情简笔矢量 (二次元弯眉、笑眼与软萌腮红) -->
          <path d="M 12 18 Q 15 15 18 18" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-linecap="round" />
          <path d="M 24 18 Q 27 15 30 18" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-linecap="round" />
          <path d="M 19 25 Q 21 28 23 25" fill="none" stroke="#0284c7" stroke-width="1.4" stroke-linecap="round" />
          <ellipse cx="13" cy="22" rx="2.5" ry="1.2" fill="#fda4af" opacity="0.9" />
          <ellipse cx="29" cy="22" rx="2.5" ry="1.2" fill="#fda4af" opacity="0.9" />

          <!-- 差分信息文本 -->
          <text
            x="42"
            y="18"
            fill="#0f172a"
            font-size="9.5"
            font-weight="700"
            font-family="system-ui, -apple-system, sans-serif"
          >
            Face_Smile
          </text>
          <text
            x="42"
            y="29"
            fill="#0284c7"
            font-size="8"
            font-weight="600"
            font-family="system-ui, -apple-system, sans-serif"
          >
            [head_slot: on]
          </text>

          <!-- 激活标记勾 -->
          <circle cx="122" cy="21" r="6" fill="#0090fe" />
          <path
            d="M 119.5 21 L 121.5 23 L 124.5 19"
            fill="none"
            stroke="#ffffff"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>

        <!-- 差分 2 (未激活：惊讶表情 Face_Surprise) -->
        <g transform="translate(239, 110)">
          <rect x="0" y="0" width="134" height="38" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
          <rect x="5" y="4" width="30" height="30" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
          <!-- 惊讶表情矢量 (圆圆大眼与小 O 嘴) -->
          <circle cx="14" cy="16" r="2.2" fill="#475569" />
          <circle cx="26" cy="16" r="2.2" fill="#475569" />
          <ellipse cx="20" cy="23" rx="2" ry="2.8" fill="none" stroke="#475569" stroke-width="1.3" />

          <!-- 文本条 -->
          <text
            x="42"
            y="17"
            fill="#334155"
            font-size="9"
            font-weight="600"
            font-family="system-ui, -apple-system, sans-serif"
          >
            Face_Surprise
          </text>
          <text
            x="42"
            y="27"
            fill="#94a3b8"
            font-size="8"
            font-weight="500"
            font-family="system-ui, -apple-system, sans-serif"
          >
            [head_slot]
          </text>
          <circle cx="122" cy="19" r="2.5" fill="#cbd5e1" />
        </g>

        <!-- 差分 3 (未激活：眨眼/自信表情 Face_Wink) -->
        <g transform="translate(239, 152)">
          <rect x="0" y="0" width="134" height="38" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
          <rect x="5" y="4" width="30" height="30" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
          <!-- 闭眼/眨眼表情简笔画符号 -->
          <path
            d="M 12 16 L 16 19 L 12 22"
            fill="none"
            stroke="#64748b"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="26" cy="17" r="2.2" fill="#475569" />
          <path d="M 18 24 Q 21 27 24 24" fill="none" stroke="#64748b" stroke-width="1.3" stroke-linecap="round" />

          <!-- 文本条 -->
          <text
            x="42"
            y="17"
            fill="#334155"
            font-size="9"
            font-weight="600"
            font-family="system-ui, -apple-system, sans-serif"
          >
            Face_Wink
          </text>
          <text
            x="42"
            y="27"
            fill="#94a3b8"
            font-size="8"
            font-weight="500"
            font-family="system-ui, -apple-system, sans-serif"
          >
            [head_slot]
          </text>
          <circle cx="122" cy="19" r="2.5" fill="#cbd5e1" />
        </g>

        <!-- 底部插槽分类切换栏 -->
        <g transform="translate(239, 196)">
          <rect x="0" y="0" width="64" height="24" rx="5" fill="#e0f2fe" />
          <text
            x="11"
            y="16"
            fill="#0284c7"
            font-size="8.5"
            font-weight="700"
            font-family="system-ui, -apple-system, sans-serif"
          >
            表情 FACES
          </text>

          <rect x="70" y="0" width="64" height="24" rx="5" fill="#f1f5f9" />
          <text
            x="78"
            y="16"
            fill="#64748b"
            font-size="8.5"
            font-weight="600"
            font-family="system-ui, -apple-system, sans-serif"
          >
            配件 PROPS
          </text>
        </g>
      </g>

      <!-- ======================================================== -->
      <!-- 左下角：立绘动作播放与时间轴控制器 (Animation Controller) -->
      <!-- ======================================================== -->
      <g :filter="`url(#${uid}-shadow)`">
        <rect x="22" y="206" width="134" height="36" rx="7" fill="#ffffff" stroke="#cfe4f7" stroke-width="1.2" />
        <!-- 动作播放按钮 -->
        <circle cx="36" cy="224" r="7.5" fill="#f0f9ff" stroke="#0090fe" stroke-width="1.2" />
        <polygon points="34,220 34,228 40,224" fill="#0090fe" />

        <!-- 动作名称与播放轨 -->
        <text
          x="48"
          y="221"
          fill="#0f172a"
          font-size="9"
          font-weight="700"
          font-family="system-ui, -apple-system, sans-serif"
        >
          Track 0 : Idle_01
        </text>
        <text
          x="116"
          y="221"
          fill="#10b981"
          font-size="7.5"
          font-weight="700"
          font-family="system-ui, -apple-system, sans-serif"
        >
          60 FPS
        </text>

        <!-- 进度条与关键帧菱形标记 -->
        <rect x="48" y="228" width="98" height="3" rx="1.5" fill="#e2e8f0" />
        <rect x="48" y="228" width="56" height="3" rx="1.5" fill="#0090fe" />
        <!-- 关键帧菱形 -->
        <polygon points="56,227 58,229.5 56,232 54,229.5" fill="#0090fe" />
        <polygon points="78,227 80,229.5 78,232 76,229.5" fill="#0090fe" />
        <polygon points="104,227 106,229.5 104,232 102,229.5" fill="#94a3b8" />
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

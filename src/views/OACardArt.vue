<script setup lang="ts">
import { computed } from 'vue';
import type { HomeArtVariant } from '@/config/home';

const props = defineProps<{
  variant: HomeArtVariant;
}>();

const ART_LABELS: Record<HomeArtVariant, string> = {
  editor: '故事节点编辑器插图',
  reader: '剧情播放与阅读器插图',
  scene3d: '3D空间与场景编排插图',
  assets: '数字媒体与资产管理插图',
  more: '扩展工具与系统设置插图',
};

const label = computed(() => ART_LABELS[props.variant]);

// 同一页面渲染多份插画，渐变与图案 ID 必须按变体隔离，避免跨 SVG 污染
const uid = computed(() => `oa-art-${props.variant}`);
</script>

<template>
  <div class="oa-card-art">
    <svg
      class="oa-card-art__svg"
      viewBox="0 0 400 280"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      :aria-label="label"
      shape-rendering="geometricPrecision"
      text-rendering="geometricPrecision"
    >
      <defs>
        <!-- 背景渐变：现代清爽微蓝渐变底 -->
        <linearGradient :id="`${uid}-bg`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f8fcff" />
          <stop offset="100%" stop-color="#ebf5fd" />
        </linearGradient>

        <!-- 主品牌蓝渐变 -->
        <linearGradient :id="`${uid}-blue`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0090fe" />
        </linearGradient>

        <!-- 青色/高光渐变 -->
        <linearGradient :id="`${uid}-cyan`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#7dd3fc" />
        </linearGradient>

        <!-- 卡片投影滤波 -->
        <filter :id="`${uid}-shadow`" x="-8%" y="-8%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#144270" flood-opacity="0.07" />
        </filter>

        <!-- 点阵背景图案 -->
        <pattern :id="`${uid}-dots`" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#c3e1f7" opacity="0.65" />
        </pattern>

        <!-- 网格背景图案 -->
        <pattern :id="`${uid}-grid`" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d5ebfb" stroke-width="0.8" />
        </pattern>
      </defs>

      <!-- 底板背景 -->
      <rect width="400" height="280" :fill="`url(#${uid}-bg)`" />

      <!-- ======================================================== -->
      <!-- 1. 编辑模式 (Editor): 现代节点图/剧情分支编辑器 -->
      <!-- ======================================================== -->
      <g v-if="variant === 'editor'">
        <!-- 点阵工作画布 -->
        <rect width="400" height="280" :fill="`url(#${uid}-dots)`" />

        <!-- 顶部工具栏徽标 -->
        <rect x="24" y="20" width="128" height="24" rx="12" fill="#ffffff" :filter="`url(#${uid}-shadow)`" />
        <circle cx="36" cy="32" r="4" fill="#10b981" />
        <rect x="48" y="29" width="56" height="6" rx="3" fill="#64748b" opacity="0.7" />
        <rect x="110" y="29" width="30" height="6" rx="3" fill="#0090fe" opacity="0.8" />

        <!-- 连线：根节点 -> 节点 1 -->
        <path
          d="M 125 125 C 165 125, 175 75, 215 75"
          fill="none"
          stroke="#0090fe"
          stroke-width="2.5"
          stroke-linecap="round"
        />
        <!-- 连线：根节点 -> 节点 2 -->
        <path
          d="M 125 125 C 165 125, 175 190, 215 190"
          fill="none"
          stroke="#38bdf8"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-dasharray="5 3"
        />

        <!-- 根节点 (START / ROOT) -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="35" y="100" width="90" height="50" rx="8" fill="#ffffff" stroke="#cde4f7" stroke-width="1.2" />
          <rect x="35" y="100" width="90" height="18" rx="8" fill="#0284c7" />
          <rect x="35" y="110" width="90" height="8" fill="#0284c7" />
          <circle cx="48" cy="109" r="3" fill="#ffffff" />
          <rect x="58" y="106" width="36" height="6" rx="3" fill="#ffffff" />
          <!-- 节点内容 -->
          <rect x="46" y="128" width="45" height="5" rx="2.5" fill="#94a3b8" />
          <rect x="46" y="137" width="28" height="5" rx="2.5" fill="#cbd5e1" />
          <!-- 输出端口 -->
          <circle cx="125" cy="125" r="4.5" fill="#0090fe" stroke="#ffffff" stroke-width="1.5" />
        </g>

        <!-- 节点 1 (DIALOGUE NODE) -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="215" y="48" width="150" height="65" rx="8" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
          <!-- 标题栏 -->
          <rect x="215" y="48" width="150" height="20" rx="8" fill="#f0f9ff" />
          <rect x="215" y="60" width="150" height="8" fill="#f0f9ff" />
          <circle cx="228" cy="58" r="3" fill="#0284c7" />
          <rect x="238" y="55" width="48" height="6" rx="3" fill="#0369a1" />
          <!-- 内部脚本条目 -->
          <circle cx="230" cy="82" r="7" fill="#e0f2fe" />
          <rect x="245" y="76" width="70" height="5" rx="2.5" fill="#64748b" />
          <rect x="245" y="85" width="95" height="5" rx="2.5" fill="#94a3b8" />
          <rect x="245" y="94" width="55" height="5" rx="2.5" fill="#cbd5e1" />
          <!-- 输入/输出端口 -->
          <circle cx="215" cy="75" r="4.5" fill="#0090fe" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="365" cy="75" r="4.5" fill="#0284c7" stroke="#ffffff" stroke-width="1.5" />
        </g>

        <!-- 节点 2 (BRANCH / CHOICE NODE) -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="215" y="155" width="150" height="75" rx="8" fill="#ffffff" stroke="#cde4f7" stroke-width="1.2" />
          <rect x="215" y="155" width="150" height="20" rx="8" fill="#f8fafc" />
          <rect x="215" y="167" width="150" height="8" fill="#f8fafc" />
          <circle cx="228" cy="165" r="3" fill="#f59e0b" />
          <rect x="238" y="162" width="42" height="6" rx="3" fill="#64748b" />
          <!-- 分支选项条 -->
          <rect x="228" y="184" width="112" height="16" rx="4" fill="#f1f5f9" />
          <rect x="236" y="189" width="60" height="6" rx="3" fill="#0284c7" />
          <rect x="228" y="204" width="112" height="16" rx="4" fill="#f1f5f9" />
          <rect x="236" y="209" width="75" height="6" rx="3" fill="#64748b" />
          <!-- 端口 -->
          <circle cx="215" cy="190" r="4.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="365" cy="192" r="3.5" fill="#0090fe" stroke="#ffffff" stroke-width="1" />
          <circle cx="365" cy="212" r="3.5" fill="#64748b" stroke="#ffffff" stroke-width="1" />
        </g>

        <!-- 右下角微型鹰眼/导航器框 -->
        <rect x="310" y="238" width="66" height="26" rx="4" fill="#ffffff" stroke="#cde4f7" stroke-width="1" opacity="0.9" />
        <rect x="316" y="244" width="14" height="8" rx="1.5" fill="#0090fe" opacity="0.6" />
        <rect x="334" y="242" width="18" height="10" rx="1.5" fill="#94a3b8" opacity="0.4" />
        <rect x="334" y="254" width="18" height="8" rx="1.5" fill="#cbd5e1" opacity="0.4" />
      </g>

      <!-- ======================================================== -->
      <!-- 2. 阅读模式 (Reader): 现代视觉小说剧场与剧情播放器 -->
      <!-- ======================================================== -->
      <g v-else-if="variant === 'reader'">
        <!-- 背景微网格与宽屏取景框 -->
        <rect width="400" height="280" :fill="`url(#${uid}-grid)`" />

        <!-- 16:9 剧场取景框四个角标 -->
        <g stroke="#93c5fd" stroke-width="2" stroke-linecap="round" fill="none">
          <path d="M 28 40 h 16 M 28 40 v 16" />
          <path d="M 372 40 h -16 M 372 40 v 16" />
          <path d="M 28 245 h 16 M 28 245 v -16" />
          <path d="M 372 245 h -16 M 372 245 v -16" />
        </g>

        <!-- 顶部信息栏 -->
        <g>
          <rect x="48" y="28" width="70" height="18" rx="9" fill="#0090fe" />
          <circle cx="58" cy="37" r="3" fill="#ffffff" />
          <rect x="66" y="34" width="38" height="6" rx="3" fill="#ffffff" />
          <!-- 播放器功能标签 -->
          <rect x="250" y="29" width="30" height="16" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1" />
          <rect x="256" y="34" width="18" height="5" rx="2.5" fill="#0284c7" />
          <rect x="286" y="29" width="34" height="16" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1" />
          <rect x="293" y="34" width="20" height="5" rx="2.5" fill="#64748b" />
          <rect x="326" y="29" width="26" height="16" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1" />
          <rect x="331" y="34" width="16" height="5" rx="2.5" fill="#64748b" />
        </g>

        <!-- 画面中央：舞台预览剪影与构图 -->
        <g opacity="0.45">
          <circle cx="200" cy="98" r="28" fill="#e0f2fe" />
          <path d="M 172 136 c 0 -16, 56 -16, 56 0" fill="#bae6fd" />
          <!-- 柔和星光/聚光效果 -->
          <path d="M 80 50 L 320 50 L 260 145 L 140 145 Z" fill="#e0f2fe" opacity="0.3" />
        </g>

        <!-- 浮空对白框与控制条 (核心卡片) -->
        <g :filter="`url(#${uid}-shadow)`">
          <!-- 对白背景框 -->
          <rect x="42" y="148" width="316" height="92" rx="10" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.5" />
          <!-- 说话人名牌 (Pill) -->
          <rect x="58" y="138" width="84" height="22" rx="6" fill="#0284c7" />
          <rect x="68" y="146" width="42" height="6" rx="3" fill="#ffffff" />
          <circle cx="128" cy="149" r="3.5" fill="#38bdf8" />
          <!-- 文本排版占位行 -->
          <rect x="62" y="170" width="230" height="6" rx="3" fill="#334155" />
          <rect x="62" y="184" width="265" height="6" rx="3" fill="#64748b" />
          <rect x="62" y="198" width="160" height="6" rx="3" fill="#94a3b8" />
          <!-- 下方播放进度轨 (Scrubber) -->
          <rect x="62" y="222" width="210" height="4" rx="2" fill="#e2e8f0" />
          <rect x="62" y="222" width="130" height="4" rx="2" fill="#0090fe" />
          <circle cx="192" cy="224" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="1.8" />
          <!-- 下方播放暂停图标 -->
          <g fill="#0284c7" transform="translate(305, 218)">
            <polygon points="0,0 0,12 10,6" />
          </g>
        </g>
      </g>

      <!-- ======================================================== -->
      <!-- 3. 3D场景 (Scene3D): 现代空间视口、三维坐标系与摄影机 -->
      <!-- ======================================================== -->
      <g v-else-if="variant === 'scene3d'">
        <!-- 3D 等轴测地面网格 -->
        <g stroke="#c7e3fa" stroke-width="1" opacity="0.8">
          <line x1="200" y1="140" x2="60" y2="220" />
          <line x1="200" y1="140" x2="340" y2="220" />
          <!-- X 方向网格线 -->
          <line x1="165" y1="160" x2="270" y2="220" />
          <line x1="130" y1="180" x2="235" y2="240" />
          <line x1="95" y1="200" x2="200" y2="260" />
          <!-- Z 方向网格线 -->
          <line x1="235" y1="160" x2="130" y2="220" />
          <line x1="270" y1="180" x2="165" y2="240" />
          <line x1="305" y1="200" x2="200" y2="260" />
        </g>

        <!-- 空间中心微缩 3D 舞台包围盒 (Bounding Box) -->
        <g :filter="`url(#${uid}-shadow)`">
          <!-- 顶面 -->
          <polygon points="200,85 245,108 200,131 155,108" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5" />
          <!-- 左面 -->
          <polygon points="155,108 200,131 200,185 155,162" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5" opacity="0.75" />
          <!-- 右面 -->
          <polygon points="245,108 200,131 200,185 245,162" fill="#7dd3fc" stroke="#0090fe" stroke-width="1.5" opacity="0.85" />
        </g>

        <!-- 3D 变换控制器 (Transform Gizmo / XYZ 轴向) -->
        <g stroke-linecap="round" stroke-linejoin="round">
          <!-- Y 轴 (绿色 - 向上) -->
          <line x1="200" y1="131" x2="200" y2="45" stroke="#10b981" stroke-width="3" />
          <polygon points="200,38 195,48 205,48" fill="#10b981" />
          <circle cx="212" cy="46" r="6" fill="#10b981" opacity="0.15" />
          <rect x="209" y="43" width="6" height="6" rx="1" fill="#10b981" />

          <!-- X 轴 (红色 - 向右下) -->
          <line x1="200" y1="131" x2="275" y2="174" stroke="#ef4444" stroke-width="3" />
          <polygon points="282,178 270,172 276,163" fill="#ef4444" />
          <rect x="286" y="172" width="6" height="6" rx="1" fill="#ef4444" />

          <!-- Z 轴 (蓝色 - 向左下) -->
          <line x1="200" y1="131" x2="125" y2="174" stroke="#0090fe" stroke-width="3" />
          <polygon points="118,178 124,163 130,172" fill="#0090fe" />
          <rect x="108" y="172" width="6" height="6" rx="1" fill="#0090fe" />

          <!-- 原点 -->
          <circle cx="200" cy="131" r="5" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
        </g>

        <!-- 视口左上角摄像机与视锥线 -->
        <g>
          <!-- 摄像机图标 -->
          <rect x="42" y="35" width="34" height="24" rx="5" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" :filter="`url(#${uid}-shadow)`" />
          <polygon points="76,42 86,37 86,57 76,52" fill="#0284c7" />
          <circle cx="56" cy="47" r="4" fill="#0090fe" />
          <!-- 视锥投影虚线 -->
          <line x1="86" y1="47" x2="160" y2="95" stroke="#60a5fa" stroke-width="1.2" stroke-dasharray="3 3" />
          <line x1="86" y1="47" x2="190" y2="175" stroke="#60a5fa" stroke-width="1.2" stroke-dasharray="3 3" />
        </g>

        <!-- 右上角坐标信息卡 -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="272" y="28" width="100" height="42" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
          <circle cx="284" cy="40" r="3" fill="#ef4444" />
          <rect x="292" y="38" width="22" height="4" rx="2" fill="#64748b" />
          <circle cx="284" cy="52" r="3" fill="#10b981" />
          <rect x="292" y="50" width="30" height="4" rx="2" fill="#64748b" />
          <circle cx="334" cy="40" r="3" fill="#0090fe" />
          <rect x="342" y="38" width="20" height="4" rx="2" fill="#64748b" />
        </g>
      </g>

      <!-- ======================================================== -->
      <!-- 4. 资源管理 (Assets): 现代资产库、多轨媒体与多格式面板 -->
      <!-- ======================================================== -->
      <g v-else-if="variant === 'assets'">
        <!-- 点阵背景 -->
        <rect width="400" height="280" :fill="`url(#${uid}-dots)`" />

        <!-- 顶部标签分类栏 (Tabs) -->
        <g>
          <!-- 激活标签: ALL -->
          <rect x="35" y="24" width="48" height="20" rx="10" fill="#0090fe" />
          <rect x="47" y="31" width="24" height="6" rx="3" fill="#ffffff" />
          <!-- 标签: AUDIO -->
          <rect x="90" y="24" width="56" height="20" rx="10" fill="#ffffff" stroke="#cde4f7" stroke-width="1" />
          <rect x="102" y="31" width="32" height="6" rx="3" fill="#64748b" />
          <!-- 标签: IMAGES -->
          <rect x="153" y="24" width="58" height="20" rx="10" fill="#ffffff" stroke="#cde4f7" stroke-width="1" />
          <rect x="165" y="31" width="34" height="6" rx="3" fill="#64748b" />
          <!-- 标签: SCRIPTS -->
          <rect x="218" y="24" width="60" height="20" rx="10" fill="#ffffff" stroke="#cde4f7" stroke-width="1" />
          <rect x="230" y="31" width="36" height="6" rx="3" fill="#64748b" />
        </g>

        <!-- 媒体条目 1：音频波形音轨 (Waveform Card) -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="35" y="58" width="330" height="60" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
          <!-- 音频图标徽章 -->
          <rect x="47" y="70" width="36" height="36" rx="6" fill="#e0f2fe" />
          <path d="M 60 78 v 12 M 65 74 v 20 M 70 81 v 6" stroke="#0090fe" stroke-width="2.5" stroke-linecap="round" />
          <!-- 文件名与大小 -->
          <rect x="92" y="73" width="70" height="6" rx="3" fill="#1e293b" />
          <rect x="92" y="84" width="40" height="5" rx="2.5" fill="#94a3b8" />
          <!-- 动态波形条谱 (Waveform) -->
          <g fill="#0090fe" transform="translate(172, 70)">
            <rect x="0" y="10" width="3.5" height="16" rx="1.7" />
            <rect x="6" y="6" width="3.5" height="24" rx="1.7" />
            <rect x="12" y="2" width="3.5" height="32" rx="1.7" />
            <rect x="18" y="12" width="3.5" height="12" rx="1.7" />
            <rect x="24" y="4" width="3.5" height="28" rx="1.7" />
            <rect x="30" y="0" width="3.5" height="36" rx="1.7" />
            <rect x="36" y="8" width="3.5" height="20" rx="1.7" />
            <rect x="42" y="14" width="3.5" height="8" rx="1.7" />
            <rect x="48" y="2" width="3.5" height="32" rx="1.7" />
            <rect x="54" y="6" width="3.5" height="24" rx="1.7" />
            <rect x="60" y="11" width="3.5" height="14" rx="1.7" />
            <rect x="66" y="4" width="3.5" height="28" rx="1.7" />
            <rect x="72" y="9" width="3.5" height="18" rx="1.7" />
            <rect x="78" y="15" width="3.5" height="6" rx="1.7" />
            <rect x="84" y="3" width="3.5" height="30" rx="1.7" fill="#93c5fd" />
            <rect x="90" y="7" width="3.5" height="22" rx="1.7" fill="#93c5fd" />
            <rect x="96" y="12" width="3.5" height="12" rx="1.7" fill="#93c5fd" />
            <rect x="102" y="5" width="3.5" height="26" rx="1.7" fill="#93c5fd" />
            <rect x="108" y="10" width="3.5" height="16" rx="1.7" fill="#93c5fd" />
            <rect x="114" y="14" width="3.5" height="8" rx="1.7" fill="#93c5fd" />
          </g>
          <!-- 播放游标 -->
          <line x1="254" y1="62" x2="254" y2="114" stroke="#0284c7" stroke-width="1.5" />
          <polygon points="251,62 257,62 254,66" fill="#0284c7" />
        </g>

        <!-- 媒体下排：图像与剧本文件卡 -->
        <g :filter="`url(#${uid}-shadow)`">
          <!-- 图像卡片 -->
          <rect x="35" y="132" width="158" height="110" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
          <rect x="45" y="142" width="138" height="64" rx="6" fill="#f0f9ff" />
          <!-- 矢量风光图元 -->
          <circle cx="70" cy="160" r="10" fill="#fde68a" />
          <polygon points="50,206 85,166 115,196" fill="#7dd3fc" />
          <polygon points="95,206 135,156 175,206" fill="#0284c7" />
          <rect x="47" y="218" width="65" height="6" rx="3" fill="#1e293b" />
          <rect x="47" y="228" width="40" height="5" rx="2.5" fill="#94a3b8" />
          <rect x="135" y="218" width="38" height="14" rx="4" fill="#e0f2fe" />
          <rect x="141" y="222" width="26" height="5" rx="2.5" fill="#0090fe" />

          <!-- 剧本/代码卡片 -->
          <rect x="207" y="132" width="158" height="110" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
          <!-- 文件夹与文档图元 -->
          <rect x="219" y="145" width="28" height="24" rx="4" fill="#0090fe" />
          <rect x="219" y="142" width="14" height="6" rx="2" fill="#0284c7" />
          <rect x="254" y="146" width="60" height="6" rx="3" fill="#1e293b" />
          <rect x="254" y="156" width="35" height="5" rx="2.5" fill="#94a3b8" />
          <!-- 列表占位条 -->
          <rect x="219" y="180" width="134" height="10" rx="3" fill="#f8fafc" />
          <rect x="225" y="183" width="80" height="4" rx="2" fill="#64748b" />
          <rect x="219" y="196" width="134" height="10" rx="3" fill="#f8fafc" />
          <rect x="225" y="199" width="95" height="4" rx="2" fill="#64748b" />
          <rect x="219" y="212" width="134" height="10" rx="3" fill="#f8fafc" />
          <rect x="225" y="215" width="60" height="4" rx="2" fill="#64748b" />
        </g>
      </g>

      <!-- ======================================================== -->
      <!-- 5. 更多功能 (More): 现代模块化工具箱、系统配置与扩展仪表板 -->
      <!-- ======================================================== -->
      <g v-else-if="variant === 'more'">
        <!-- 背景细网格 -->
        <rect width="400" height="280" :fill="`url(#${uid}-grid)`" />

        <!-- 2x2 模块化仪表卡盘 -->

        <!-- 模块 A: 系统设置与拨动开关 -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="35" y="28" width="158" height="104" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
          <!-- 精密齿轮图标 -->
          <g transform="translate(50, 42)" fill="#0090fe">
            <circle cx="14" cy="14" r="6" fill="none" stroke="#0090fe" stroke-width="3.5" />
            <path d="M 12 1 h 4 v 4 h -4 Z M 12 23 h 4 v 4 h -4 Z M 1 12 h 4 v 4 h -4 Z M 23 12 h 4 v 4 h -4 Z" />
            <path d="M 4 4 l 3 3 l 3 -3 l -3 -3 Z M 18 18 l 3 3 l 3 -3 l -3 -3 Z" />
          </g>
          <rect x="88" y="46" width="55" height="6" rx="3" fill="#1e293b" />
          <rect x="88" y="56" width="35" height="5" rx="2.5" fill="#94a3b8" />
          <!-- 现代 Toggle 开关 (激活态) -->
          <rect x="50" y="84" width="40" height="20" rx="10" fill="#0090fe" />
          <circle cx="79" cy="94" r="7.5" fill="#ffffff" />
          <!-- 现代 Toggle 开关 (未激活态) -->
          <rect x="105" y="84" width="40" height="20" rx="10" fill="#e2e8f0" />
          <circle cx="116" cy="94" r="7.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        </g>

        <!-- 模块 B: 扩展插件与 API 接口 -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="207" y="28" width="158" height="104" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
          <!-- 插件连接图标 -->
          <rect x="221" y="42" width="28" height="28" rx="6" fill="#e0f2fe" />
          <path d="M 230 49 v 6 h 10 v -6 M 235 55 v 8" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" />
          <rect x="258" y="46" width="60" height="6" rx="3" fill="#1e293b" />
          <rect x="258" y="56" width="40" height="5" rx="2.5" fill="#10b981" />
          <!-- 连通状态指示排 -->
          <rect x="221" y="85" width="130" height="16" rx="4" fill="#f8fafc" />
          <circle cx="232" cy="93" r="3" fill="#10b981" />
          <rect x="242" y="90" width="50" height="6" rx="3" fill="#64748b" />
          <rect x="312" y="89" width="30" height="8" rx="4" fill="#dcfce7" />
          <rect x="317" y="92" width="20" height="3" rx="1.5" fill="#15803d" />
        </g>

        <!-- 模块 C: 调试与性能监视 (Telemetry) -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="35" y="146" width="158" height="104" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
          <rect x="49" y="160" width="45" height="6" rx="3" fill="#1e293b" />
          <!-- 脉冲波形图表折线 -->
          <path
            d="M 49 198 L 70 198 L 82 178 L 96 215 L 110 185 L 125 198 L 175 198"
            fill="none"
            stroke="#0090fe"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <!-- 监视读数条 -->
          <rect x="49" y="224" width="70" height="12" rx="3" fill="#f0f9ff" />
          <rect x="55" y="228" width="42" height="4" rx="2" fill="#0284c7" />
          <rect x="130" y="224" width="45" height="12" rx="3" fill="#f1f5f9" />
          <rect x="136" y="228" width="28" height="4" rx="2" fill="#64748b" />
        </g>

        <!-- 模块 D: 存储与构建打包工具 -->
        <g :filter="`url(#${uid}-shadow)`">
          <rect x="207" y="146" width="158" height="104" rx="8" fill="#ffffff" stroke="#d5ebfb" stroke-width="1.2" />
          <rect x="221" y="160" width="50" height="6" rx="3" fill="#1e293b" />
          <!-- 圆形环形仪表 -->
          <circle cx="245" cy="202" r="22" fill="none" stroke="#e2e8f0" stroke-width="5" />
          <circle
            cx="245"
            cy="202"
            r="22"
            fill="none"
            stroke="#0090fe"
            stroke-width="5"
            stroke-dasharray="100 138"
            stroke-linecap="round"
            transform="rotate(-90 245 202)"
          />
          <circle cx="245" cy="202" r="5" fill="#0284c7" />
          <!-- 数据指标 -->
          <rect x="282" y="185" width="65" height="6" rx="3" fill="#64748b" />
          <rect x="282" y="197" width="45" height="5" rx="2.5" fill="#94a3b8" />
          <rect x="282" y="210" width="55" height="14" rx="4" fill="#0090fe" />
          <rect x="290" y="214" width="38" height="5" rx="2.5" fill="#ffffff" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.oa-card-art {
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

.oa-card-art__svg {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 现代卡片微动效：聚焦或激活时平滑微推，不破坏外层 .oa-slot 布局 */
:deep(.oa-card:hover) .oa-card-art__svg {
  transform: scale(1.02);
}
</style>

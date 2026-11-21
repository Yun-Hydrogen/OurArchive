<script setup lang="ts">
import { computed } from 'vue';
import { rizui_button } from 'riz-ui';
import type { ResourcePackage, PackageContent } from '@/modules/PackageProvider/useResourcePackages';
import { formatCount } from '@/utils/format';

const props = defineProps<{ pkg: ResourcePackage }>();

const emit = defineEmits<{
  /** 打开「详细信息」弹窗 */
  (e: 'details'): void;
  /** 进入该资源包的管理页 */
  (e: 'open'): void;
}>();

/** 已声明可用的内容分类（未声明的直接不展示） */
const activeContents = computed<PackageContent[]>(() => {
  return props.pkg.contents.filter((item) => item.supported);
});

/** 统计各类资源已探明的条目总数 */
const totalResourceCount = computed(() => {
  return activeContents.value.reduce((acc, curr) => acc + (curr.exists ? curr.count : 0), 0);
});

/** 获取分类对应的前置微图标标识 */
function getContentIcon(key: string): string {
  switch (key) {
    case 'hasCharacter':
      return 'user';
    case 'Skeletons':
      return 'bone';
    case 'BackgroundMusic':
      return 'music';
    case 'Sounds':
      return 'volume';
    case 'Backgrounds':
      return 'image';
    case 'Popups':
      return 'window';
    default:
      return 'folder';
  }
}
</script>

<template>
  <article class="oa-pkg-card">
    <!-- 装饰性技术角标（纯视觉，不参与交互） -->
    <span class="oa-pkg-card__bracket oa-pkg-card__bracket--tl" aria-hidden="true" />
    <span class="oa-pkg-card__bracket oa-pkg-card__bracket--tr" aria-hidden="true" />

    <!-- 标题 + 作者 -->
    <header class="oa-pkg-card__head">
      <div class="oa-pkg-card__icon-box" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="oa-pkg-card__pack-icon">
          <path
            d="M4 5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2H4V5z"
            fill="rgba(0, 144, 254, 0.15)"
            stroke="var(--oa-blue)"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            d="M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z"
            fill="rgba(255, 255, 255, 0.85)"
            stroke="var(--oa-blue)"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            d="M10 13h4M12 11v4"
            stroke="var(--oa-blue)"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </div>

      <div class="oa-pkg-card__titles">
        <div class="oa-pkg-card__title-row">
          <h2 class="oa-pkg-card__name" :title="pkg.name">{{ pkg.name }}</h2>
          <span v-if="pkg.version" class="oa-pkg-card__version">v{{ pkg.version }}</span>
          <span v-if="!pkg.valid" class="oa-pkg-card__invalid-tag">异常</span>
        </div>

        <span class="oa-pkg-card__author" :title="`作者：${pkg.author || '未署名'}`">
          <svg viewBox="0 0 16 16" class="oa-pkg-card__author-icon" aria-hidden="true">
            <path
              d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6a5 5 0 0 1 10 0H3z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
          </svg>
          <span class="oa-pkg-card__author-text">{{ pkg.author || '未署名' }}</span>
        </span>
      </div>
    </header>

    <!-- 资源清单：固定高度，超出部分在面板内滚动，完整信息看「详细信息」 -->
    <section class="oa-pkg-card__manifest" aria-label="资源清单">
      <div class="oa-pkg-card__manifest-head">
        <span class="oa-pkg-card__manifest-label">资源清单</span>
        <span class="oa-pkg-card__manifest-count">
          已探明 {{ totalResourceCount > 0 ? formatCount(totalResourceCount) : activeContents.length }} 项
        </span>
      </div>

      <ul v-if="activeContents.length" class="oa-pkg-card__chips">
        <li
          v-for="item in activeContents"
          :key="item.key"
          class="oa-pkg-card__chip"
          :class="{ 'is-missing': !item.exists }"
          :title="`${item.label} · 目录：${item.path || item.key}${item.exists ? '' : '（未找到对应文件夹）'}`"
        >
          <!-- 角色图标 -->
          <svg v-if="getContentIcon(item.key) === 'user'" viewBox="0 0 16 16" class="oa-pkg-card__chip-icon" aria-hidden="true">
            <circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="1.4" />
            <path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4" fill="none" stroke="currentColor" stroke-width="1.4" />
          </svg>
          <!-- 骨骼立绘图标 -->
          <svg v-else-if="getContentIcon(item.key) === 'bone'" viewBox="0 0 16 16" class="oa-pkg-card__chip-icon" aria-hidden="true">
            <path d="M4 3a1.5 1.5 0 0 0-1.5 1.5c0 .7.5 1.3 1.2 1.5L7 8.5l-3.3 2.5a1.5 1.5 0 1 0 1.8 2.4L9 10.7l3.3 2.7a1.5 1.5 0 1 0 1.8-2.4L10.8 8.5l3.3-2.5a1.5 1.5 0 1 0-1.8-2.4L9 6.3 5.7 3.6A1.5 1.5 0 0 0 4 3z" fill="none" stroke="currentColor" stroke-width="1.3" />
          </svg>
          <!-- 音乐图标 -->
          <svg v-else-if="getContentIcon(item.key) === 'music'" viewBox="0 0 16 16" class="oa-pkg-card__chip-icon" aria-hidden="true">
            <path d="M6 12V4l7-1.5v8M6 12a2 2 0 1 1-2-2 2 2 0 0 1 2 2zm7-.5a2 2 0 1 1-2-2 2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="1.4" />
          </svg>
          <!-- 音效图标 -->
          <svg v-else-if="getContentIcon(item.key) === 'volume'" viewBox="0 0 16 16" class="oa-pkg-card__chip-icon" aria-hidden="true">
            <path d="M2 9.5V6.5h2.5L8 3v10L4.5 9.5H2zm9-4a4 4 0 0 1 0 5m2-7a7 7 0 0 1 0 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <!-- 背景图标 -->
          <svg v-else-if="getContentIcon(item.key) === 'image'" viewBox="0 0 16 16" class="oa-pkg-card__chip-icon" aria-hidden="true">
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" />
            <circle cx="5.5" cy="6" r="1.2" fill="currentColor" />
            <path d="m3 11 3.5-3.5 3 3 2-2 2 2" fill="none" stroke="currentColor" stroke-width="1.3" />
          </svg>
          <!-- 弹窗图标 -->
          <svg v-else-if="getContentIcon(item.key) === 'window'" viewBox="0 0 16 16" class="oa-pkg-card__chip-icon" aria-hidden="true">
            <rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" />
            <path d="M2.5 6h11M5 4.5h.01M7 4.5h.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <!-- 默认文件夹 -->
          <svg v-else viewBox="0 0 16 16" class="oa-pkg-card__chip-icon" aria-hidden="true">
            <path d="M2.5 4h3.5l1.5 1.5h6v7.5h-11V4z" fill="none" stroke="currentColor" stroke-width="1.4" />
          </svg>

          <span class="oa-pkg-card__chip-text">{{ item.label }}</span>

          <span v-if="item.exists && formatCount(item.count)" class="oa-pkg-card__chip-count">
            {{ formatCount(item.count) }}
          </span>
          <span v-else-if="!item.exists" class="oa-pkg-card__chip-miss">缺失</span>
        </li>
      </ul>
      <p v-else class="oa-pkg-card__empty-manifest">未声明可用分类</p>
    </section>

    <!-- 操作：详细信息（弹窗） / 管理（进入资源包页） -->
    <footer class="oa-pkg-card__actions">
      <rizui_button text="详细信息" @click="emit('details')" />
      <rizui_button primary text="管理" @click="emit('open')" />
    </footer>
  </article>
</template>

<style scoped>
.oa-pkg-card {
  --pkg-chips-height: 78px;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: clamp(16px, 1.6vw, 22px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  background: linear-gradient(172deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 251, 255, 0.95) 55%, rgba(238, 247, 255, 0.92) 100%);
  box-shadow:
    0 10px 24px rgba(24, 76, 120, 0.08),
    0 2px 5px rgba(24, 76, 120, 0.04),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  color: inherit;
  font-family: inherit;
  text-align: left;
  transition:
    box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.25s ease,
    background 0.25s ease;
}

/* 装饰性科技微角标 */
.oa-pkg-card__bracket {
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
  opacity: 0.45;
  transition: opacity 0.25s ease, border-color 0.25s ease;
}

.oa-pkg-card__bracket--tl {
  top: 6px;
  left: 6px;
  border-top: 2px solid #a0cbf0;
  border-left: 2px solid #a0cbf0;
  border-top-left-radius: 3px;
}

.oa-pkg-card__bracket--tr {
  top: 6px;
  right: 6px;
  border-top: 2px solid #a0cbf0;
  border-right: 2px solid #a0cbf0;
  border-top-right-radius: 3px;
}

.oa-pkg-card:hover {
  border-color: rgba(0, 144, 254, 0.45);
  background: linear-gradient(172deg, #ffffff 0%, #f4faff 55%, #e9f5ff 100%);
  box-shadow:
    0 18px 36px rgba(0, 144, 254, 0.16),
    0 4px 10px rgba(18, 58, 92, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 1);
}

.oa-pkg-card:hover .oa-pkg-card__bracket {
  opacity: 1;
  border-color: var(--oa-blue);
}

/* ---------- 标题 + 作者 ---------- */

.oa-pkg-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.oa-pkg-card__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8f4fd 0%, #d8ecfc 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9), 0 3px 8px rgba(0, 144, 254, 0.12);
  transition: transform 0.25s ease;
}

.oa-pkg-card:hover .oa-pkg-card__icon-box {
  transform: scale(1.05);
}

.oa-pkg-card__pack-icon {
  width: 23px;
  height: 23px;
}

.oa-pkg-card__titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.oa-pkg-card__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.oa-pkg-card__name {
  overflow: hidden;
  font-size: clamp(15.5px, 1.2vw, 18px);
  font-weight: 700;
  line-height: 1.3;
  color: #123a5c;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.oa-pkg-card:hover .oa-pkg-card__name {
  color: #0076d6;
}

.oa-pkg-card__version {
  flex: 0 0 auto;
  padding: 1px 7px;
  border: 1px solid rgba(0, 144, 254, 0.2);
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.09);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #0b7ad6;
}

.oa-pkg-card__invalid-tag {
  flex: 0 0 auto;
  padding: 1px 7px;
  border: 1px solid rgba(248, 190, 0, 0.35);
  border-radius: 999px;
  background: rgba(248, 190, 0, 0.15);
  font-size: 11px;
  font-weight: 600;
  color: #a47500;
}

.oa-pkg-card__author {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 11.5px;
  color: #6f8fa8;
}

.oa-pkg-card__author-icon {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  color: #8faec5;
}

.oa-pkg-card__author-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 资源清单（定高） ---------- */

.oa-pkg-card__manifest {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(215, 233, 248, 0.7);
  border-radius: 10px;
  background: rgba(240, 247, 253, 0.72);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.oa-pkg-card:hover .oa-pkg-card__manifest {
  border-color: rgba(188, 221, 248, 0.9);
  background: rgba(235, 245, 255, 0.9);
}

.oa-pkg-card__manifest-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: 0 0 auto;
}

.oa-pkg-card__manifest-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #4a7295;
  text-transform: uppercase;
}

.oa-pkg-card__manifest-count {
  font-size: 11px;
  color: #7b9cb8;
}

/* 固定高度：卡片高度统一，超出部分在面板内滚动 */
.oa-pkg-card__chips {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
  height: var(--pkg-chips-height);
  padding-right: 2px;
  overflow-y: auto;
  list-style: none;
}

.oa-pkg-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid rgba(0, 144, 254, 0.16);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 11.5px;
  line-height: 1;
  color: #1769a8;
  box-shadow: 0 1px 3px rgba(36, 92, 138, 0.04);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.oa-pkg-card__chip-icon {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  color: #0b7ad6;
}

.oa-pkg-card__chip-text {
  font-weight: 500;
  white-space: nowrap;
}

.oa-pkg-card__chip-count {
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(0, 144, 254, 0.1);
  font-size: 10.5px;
  font-weight: 600;
  color: #0076d6;
}

.oa-pkg-card__chip.is-missing {
  border-color: rgba(248, 190, 0, 0.4);
  background: rgba(254, 249, 235, 0.9);
  color: #9c6c00;
}

.oa-pkg-card__chip.is-missing .oa-pkg-card__chip-icon {
  color: #c98800;
}

.oa-pkg-card__chip-miss {
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(248, 190, 0, 0.2);
  font-size: 10px;
  font-weight: 600;
  color: #8c6000;
}

.oa-pkg-card__empty-manifest {
  display: flex;
  align-items: center;
  height: var(--pkg-chips-height);
  font-size: 11.5px;
  color: #8ea7bd;
}

/* ---------- 操作区 ---------- */

.oa-pkg-card__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
  border-top: 1px dashed rgba(188, 214, 236, 0.5);
}
</style>

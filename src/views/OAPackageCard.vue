<script setup lang="ts">
import { rizui_infobox } from 'riz-ui';
import type { ResourcePackage } from '@/modules/PackageProvider/useResourcePackages';
import { formatCount, formatDateTime } from '@/utils/format';

defineProps<{ pkg: ResourcePackage }>();

const emit = defineEmits<{ open: [] }>();

/** 已声明可用的内容分类（未声明的直接不展示） */
function activeContents(pkg: ResourcePackage) {
  return pkg.contents.filter((item) => item.supported);
}
</script>

<template>
  <div
    class="oa-pkg-card"
    role="button"
    tabindex="0"
    :aria-label="`打开资源包 ${pkg.name}`"
    @click="emit('open')"
    @keydown.enter.prevent="emit('open')"
    @keydown.space.prevent="emit('open')"
  >
    <header class="oa-pkg-card__head">
      <div class="oa-pkg-card__names">
        <h2 class="oa-pkg-card__name">{{ pkg.name }}</h2>
        <p class="oa-pkg-card__id">{{ pkg.id }}</p>
      </div>
      <span v-if="pkg.version" class="oa-pkg-card__version">{{ pkg.version }}</span>
    </header>

    <p class="oa-pkg-card__desc">
      {{ pkg.description || '这个资源包还没有填写描述。' }}
    </p>

    <dl class="oa-pkg-card__meta">
      <div class="oa-pkg-card__meta-item">
        <dt>作者</dt>
        <dd>{{ pkg.author || '未署名' }}</dd>
      </div>
      <div class="oa-pkg-card__meta-item">
        <dt>更新</dt>
        <dd>{{ formatDateTime(pkg.updatedAt) }}</dd>
      </div>
    </dl>

    <ul v-if="activeContents(pkg).length" class="oa-pkg-card__chips">
      <li
        v-for="item in activeContents(pkg)"
        :key="item.key"
        class="oa-pkg-card__chip"
        :class="{ 'is-missing': !item.exists }"
        :title="`${item.path || item.key}${item.exists ? '' : '（目录不存在）'}`"
      >
        <span class="oa-pkg-card__chip__dot" aria-hidden="true" />
        {{ item.label }}
        <span v-if="formatCount(item.count)" class="oa-pkg-card__chip__count">
          {{ item.count }}
        </span>
        <span v-if="!item.exists" class="oa-pkg-card__chip__miss">缺失</span>
      </li>
    </ul>
    <p v-else class="oa-pkg-card__empty">未声明可用资源</p>

    <rizui_infobox
      v-if="!pkg.valid"
      type="warn"
      :text="`package.yml 解析失败：${pkg.error ?? '未知原因'}`"
    />
  </div>
</template>

<style scoped>
.oa-pkg-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: clamp(14px, 1.5vw, 20px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fcff 62%, #f1f9ff 100%);
  box-shadow:
    0 12px 26px rgba(36, 92, 138, 0.14),
    0 2px 5px rgba(36, 92, 138, 0.07),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.oa-pkg-card:hover {
  box-shadow:
    0 16px 32px rgba(36, 92, 138, 0.2),
    0 2px 5px rgba(36, 92, 138, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.oa-pkg-card:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 3px;
}

.oa-pkg-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.oa-pkg-card__names {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.oa-pkg-card__name {
  font-size: clamp(15px, 1.25vw, 18px);
  font-weight: 700;
  line-height: 1.3;
  color: #1e4b76;
  overflow-wrap: anywhere;
}

.oa-pkg-card__id {
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: #8aa3b8;
}

.oa-pkg-card__version {
  flex: 0 0 auto;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.1);
  color: #0b7ad6;
  font-size: 11.5px;
  font-weight: 600;
}

.oa-pkg-card__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.65;
  color: #5d7d97;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.oa-pkg-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.oa-pkg-card__meta-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 11.5px;
}

.oa-pkg-card__meta-item dt {
  color: #9ab0c2;
}

.oa-pkg-card__meta-item dd {
  color: #4d7799;
}

.oa-pkg-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
  padding-top: 4px;
  list-style: none;
}

.oa-pkg-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 1px solid rgba(0, 144, 254, 0.16);
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.07);
  color: #1769a8;
  font-size: 11.5px;
  line-height: 1.5;
}

.oa-pkg-card__chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.oa-pkg-card__chip__count {
  color: #6f8ba4;
  font-size: 10.5px;
}

.oa-pkg-card__chip.is-missing {
  border-color: rgba(209, 138, 0, 0.24);
  background: rgba(248, 190, 0, 0.12);
  color: #a47500;
}

.oa-pkg-card__chip__miss {
  font-size: 10.5px;
}

.oa-pkg-card__empty {
  padding-top: 4px;
  font-size: 11.5px;
  color: #9ab0c2;
}
</style>

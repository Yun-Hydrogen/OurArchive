<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { rizui_button, rizui_infobox, rizui_progress } from 'riz-ui';
import { ROUTE_NAMES } from '@/config/routes';
import { SHELL_TIMING } from '@/config/transition';
import { useResourcePackages, type ResourcePackage } from '@/composables/useResourcePackages';

const router = useRouter();
const { packages, resourcesDir, loading, error, refresh } = useResourcePackages();

type TabId = 'packages' | 'projects' | 'saves' | 'plugins';

interface TabDef {
  id: TabId;
  label: string;
  /** 是否已实现；未实现的标签只展示占位说明 */
  ready: boolean;
  hint: string;
}

const TABS: TabDef[] = [
  { id: 'packages', label: '资源包', ready: true, hint: '' },
  { id: 'projects', label: '工程', ready: false, hint: '剧本工程的创建、导出与切换还没有接入。' },
  { id: 'saves', label: '存档', ready: false, hint: '阅读进度、选项记录与存档槽位还没有接入。' },
  { id: 'plugins', label: '插件', ready: false, hint: '插件加载、权限与市场还没有接入。' },
];

const activeTab = ref<TabId>('packages');
const activeTabDef = computed(() => TABS.find((tab) => tab.id === activeTab.value) ?? TABS[0]);

/** 入场：卡片错峰飞入，播完撤掉 class，避免影响后续离场动画 */
const isEntering = ref(true);
let enterTimer: ReturnType<typeof setTimeout> | null = null;

/** 离场：卡片下坠回主界面，播完再切路由 */
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

const cardDelay = (step: number) => `${60 + step * 90}ms`;

onMounted(() => {
  void refresh();

  enterTimer = setTimeout(() => {
    isEntering.value = false;
    enterTimer = null;
  }, 900);
});

onBeforeUnmount(() => {
  if (enterTimer) {
    clearTimeout(enterTimer);
    enterTimer = null;
  }
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
});

function backHome() {
  if (isLeaving.value) {
    return;
  }
  isLeaving.value = true;
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    void router.push({ name: ROUTE_NAMES.home });
  }, SHELL_TIMING.cardsExitWait);
}

/** 进入资源包详情（大卡片 + 左侧分类） */
function openPackage(pkg: ResourcePackage) {
  if (isLeaving.value) {
    return;
  }
  isLeaving.value = true;
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    void router.push({
      name: ROUTE_NAMES.packageDetail,
      params: { packageId: pkg.id },
    });
  }, SHELL_TIMING.cardsExitWait);
}

/** 已声明可用的内容分类（未声明的直接不展示） */
function activeContents(pkg: ResourcePackage) {
  return pkg.contents.filter((item) => item.supported);
}

function formatDate(iso: string) {
  if (!iso) {
    return '未知';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '未知';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatCount(count: number) {
  return count > 0 ? String(count) : '';
}
</script>

<template>
  <main
    class="oa-res"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms`, '--exit-y': '52px' }"
  >
    <header class="oa-res__head">
      <button type="button" class="oa-res__back" @click="backHome">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M10 3.5 5.5 8 10 12.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        主界面
      </button>

      <div class="oa-res__titles">
        <h1 class="oa-res__title">资源管理</h1>
        <p class="oa-res__subtitle">本机资源索引 · 资源包 / 工程 / 存档 / 插件</p>
      </div>
    </header>

    <div class="oa-res__tabs-row">
      <nav class="oa-res__tabs" role="tablist" aria-label="资源管理分类">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          role="tab"
          class="oa-tab"
          :class="{ 'is-active': tab.id === activeTab }"
          :aria-selected="tab.id === activeTab"
          @click="activeTab = tab.id"
        >
          <span class="oa-tab__label">{{ tab.label }}</span>
          <span v-if="!tab.ready" class="oa-tab__badge">未完成</span>
        </button>
      </nav>
    </div>

    <section class="oa-res__body">
      <Transition name="oa-tab-fade" mode="out-in">
        <div :key="activeTab" class="oa-res__panel">
          <template v-if="activeTab === 'packages'">
            <div class="oa-res__toolbar">
              <p class="oa-res__summary">
                <strong>{{ packages.length }}</strong> 个资源包
                <span class="oa-res__path" :title="resourcesDir">{{ resourcesDir }}</span>
              </p>
              <rizui_button text="刷新" theme="Light" :disabled="loading" @click="refresh" />
            </div>

            <div v-if="loading" class="oa-res__loading">
              <p class="oa-res__loading-text">正在扫描资源目录…</p>
              <rizui_progress :indeterminate="true" :height="12" rounded theme="Light" />
            </div>

            <rizui_infobox
              v-else-if="error"
              type="error"
              :text="`扫描资源包失败：${error}`"
              theme="Light"
            />

            <rizui_infobox
              v-else-if="!packages.length"
              type="info"
              :text="`还没有资源包。把带 package.yml 的文件夹放进 ${resourcesDir || 'res 目录'} 后点刷新。`"
              theme="Light"
            />

            <div v-else class="oa-res__grid">
              <article
                v-for="(pkg, index) in packages"
                :key="pkg.id"
                class="oa-slot"
                :style="{ '--enter-delay': cardDelay(index) }"
              >
                <div
                  class="oa-pack"
                  role="button"
                  tabindex="0"
                  :aria-label="`打开资源包 ${pkg.name}`"
                  @click="openPackage(pkg)"
                  @keydown.enter.prevent="openPackage(pkg)"
                  @keydown.space.prevent="openPackage(pkg)"
                >
                  <header class="oa-pack__head">
                    <div class="oa-pack__names">
                      <h2 class="oa-pack__name">{{ pkg.name }}</h2>
                      <p class="oa-pack__id">{{ pkg.id }}</p>
                    </div>
                    <span v-if="pkg.version" class="oa-pack__version">{{ pkg.version }}</span>
                  </header>

                  <p class="oa-pack__desc">
                    {{ pkg.description || '这个资源包还没有填写描述。' }}
                  </p>

                  <dl class="oa-pack__meta">
                    <div class="oa-pack__meta-item">
                      <dt>作者</dt>
                      <dd>{{ pkg.author || '未署名' }}</dd>
                    </div>
                    <div class="oa-pack__meta-item">
                      <dt>更新</dt>
                      <dd>{{ formatDate(pkg.updatedAt) }}</dd>
                    </div>
                  </dl>

                  <ul v-if="activeContents(pkg).length" class="oa-pack__chips">
                    <li
                      v-for="item in activeContents(pkg)"
                      :key="item.key"
                      class="oa-chip"
                      :class="{ 'is-missing': !item.exists }"
                      :title="`${item.path || item.key}${item.exists ? '' : '（目录不存在）'}`"
                    >
                      <span class="oa-chip__dot" aria-hidden="true" />
                      {{ item.label }}
                      <span v-if="formatCount(item.count)" class="oa-chip__count">
                        {{ item.count }}
                      </span>
                      <span v-if="!item.exists" class="oa-chip__miss">缺失</span>
                    </li>
                  </ul>
                  <p v-else class="oa-pack__empty">未声明可用资源</p>

                  <rizui_infobox
                    v-if="!pkg.valid"
                    type="warn"
                    :text="`package.yml 解析失败：${pkg.error ?? '未知原因'}`"
                    theme="Light"
                  />
                </div>
              </article>
            </div>
          </template>

          <div v-else class="oa-res__placeholder">
            <span class="oa-res__placeholder-badge">未完成</span>
            <p class="oa-res__placeholder-title">{{ activeTabDef.label }}</p>
            <p class="oa-res__placeholder-text">{{ activeTabDef.hint }}</p>
          </div>
        </div>
      </Transition>
    </section>
  </main>
</template>

<style scoped>
/*
 * 页面本身透明：底色、气泡、banner 都由 App 层常驻。
 * 顶部留出 banner 停靠的高度，内容整体靠上排布。
 */
.oa-res {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: clamp(14px, 2vh, 22px);
  min-height: 100vh;
  padding: clamp(14px, 2.2vh, 24px) clamp(24px, 4.4vw, 84px) clamp(40px, 5vh, 56px);
  padding-top: clamp(56px, 8vh, 84px);
  color: var(--oa-dark-blue);
}

.oa-res__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(1120px, 100%);
  margin: 0 auto;
}

.oa-res__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 5px 11px 5px 7px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
  font-family: inherit;
  font-size: 12.5px;
  color: #35628a;
  cursor: pointer;
  transition:
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-res__back svg {
  width: 14px;
  height: 14px;
}

.oa-res__back:hover {
  color: var(--oa-blue);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.16);
}

.oa-res__titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.oa-res__title {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #123a5c;
}

.oa-res__subtitle {
  font-size: clamp(12px, 0.95vw, 13.5px);
  line-height: 1.6;
  color: #6f8ba4;
}

/* ---------- 分类标签 ---------- */

.oa-res__tabs-row {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.oa-res__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  align-self: flex-start;
}

.oa-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #4d7799;
  font-family: inherit;
  font-size: 13.5px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-tab:hover {
  color: #1e4b76;
}

.oa-tab.is-active {
  background: linear-gradient(180deg, #ffffff 0%, #eaf6ff 100%);
  color: #123a5c;
  box-shadow:
    0 4px 12px rgba(36, 92, 138, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.oa-tab__label {
  font-weight: 600;
}

.oa-tab__badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(248, 190, 0, 0.18);
  color: #a47500;
  font-size: 10.5px;
  letter-spacing: 0.02em;
}

/* ---------- 内容区 ---------- */

.oa-res__body {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 1.6vh, 18px);
  width: min(1120px, 100%);
  margin: 0 auto;
}

.oa-res__panel {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 1.6vh, 18px);
  width: 100%;
}

/* 切换分类时做个短促的交叉淡入，避免内容硬切 */
.oa-tab-fade-enter-active,
.oa-tab-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.oa-tab-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.oa-tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.oa-res__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.oa-res__summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  font-size: 12.5px;
  color: #6f8ba4;
}

.oa-res__summary strong {
  color: #1e4b76;
  font-size: 15px;
}

.oa-res__path {
  overflow: hidden;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 11.5px;
  color: #7d97ad;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-res__loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 4px;
}

.oa-res__loading-text {
  font-size: 12.5px;
  color: #6f8ba4;
}

.oa-res__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(322px, 1fr));
  gap: clamp(12px, 1.4vw, 20px);
}

/* ---------- 卡槽：入场 / 离场 ---------- */

.oa-slot {
  display: flex;
  min-width: 0;
}

.oa-slot > .oa-pack {
  flex: 1;
}

.oa-res.is-entering .oa-slot {
  animation: oa-card-in 720ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: var(--enter-delay, 0ms);
  will-change: transform, opacity;
}

@keyframes oa-card-in {
  from {
    opacity: 0;
    transform: translateY(52px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.oa-res.is-leaving .oa-slot {
  animation: oa-card-out var(--cards-exit, 260ms) cubic-bezier(0.4, 0, 0.8, 0.24) forwards;
  animation-delay: calc(var(--enter-delay, 0ms) * 0.3);
  will-change: transform, opacity;
}

@keyframes oa-card-out {
  to {
    opacity: 0;
    transform: translateY(var(--exit-y, 52px)) scale(0.96);
  }
}

/* ---------- 资源包卡片 ---------- */

.oa-pack {
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

.oa-pack:hover {
  box-shadow:
    0 16px 32px rgba(36, 92, 138, 0.2),
    0 2px 5px rgba(36, 92, 138, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
}

.oa-pack:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 3px;
}

.oa-pack__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.oa-pack__names {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.oa-pack__name {
  font-size: clamp(15px, 1.25vw, 18px);
  font-weight: 700;
  line-height: 1.3;
  color: #1e4b76;
  overflow-wrap: anywhere;
}

.oa-pack__id {
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: #8aa3b8;
}

.oa-pack__version {
  flex: 0 0 auto;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.1);
  color: #0b7ad6;
  font-size: 11.5px;
  font-weight: 600;
}

.oa-pack__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.65;
  color: #5d7d97;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.oa-pack__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.oa-pack__meta-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 11.5px;
}

.oa-pack__meta-item dt {
  color: #9ab0c2;
}

.oa-pack__meta-item dd {
  color: #4d7799;
}

.oa-pack__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
  padding-top: 4px;
  list-style: none;
}

.oa-chip {
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

.oa-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.oa-chip__count {
  color: #6f8ba4;
  font-size: 10.5px;
}

.oa-chip.is-missing {
  border-color: rgba(209, 138, 0, 0.24);
  background: rgba(248, 190, 0, 0.12);
  color: #a47500;
}

.oa-chip__miss {
  font-size: 10.5px;
}

.oa-pack__empty {
  padding-top: 4px;
  font-size: 11.5px;
  color: #9ab0c2;
}

/* ---------- 未完成分类 ---------- */

.oa-res__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: clamp(220px, 34vh, 320px);
  padding: 24px;
  border: 1px dashed rgba(111, 139, 164, 0.35);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.45);
  text-align: center;
}

.oa-res__placeholder-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(248, 190, 0, 0.18);
  color: #a47500;
  font-size: 11px;
}

.oa-res__placeholder-title {
  font-size: clamp(16px, 1.4vw, 19px);
  font-weight: 700;
  color: #1e4b76;
}

.oa-res__placeholder-text {
  max-width: 34em;
  font-size: 12.5px;
  line-height: 1.7;
  color: #6f8ba4;
}

@media (prefers-reduced-motion: reduce) {
  .oa-res.is-entering .oa-slot,
  .oa-res.is-leaving .oa-slot {
    animation: none;
  }
}
</style>

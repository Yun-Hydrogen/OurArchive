<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { rizui_button, rizui_infobox, rizui_progress } from 'riz-ui';
import { ROUTE_NAMES } from '@/config/routes';
import { SHELL_TIMING } from '@/config/transition';
import { useEnterAnimation } from '@/composables/useEnterAnimation';
import { useResourcePackages, type ResourcePackage } from '@/composables/useResourcePackages';
import { formatCount, formatDateTime } from '@/utils/format';

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

/** 入场：等列表读完再播卡片入场，进度条消失与卡片飞入衔接 */
const { isEntering } = useEnterAnimation(() => !loading.value, 1800);

/** 离场：卡片下坠回主界面，播完再切路由 */
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 错峰延迟封顶，避免资源包很多时最后一张卡要等太久 */
const cardDelay = (step: number) => `${60 + Math.min(step, 8) * 90}ms`;

onMounted(() => {
  void refresh();
});

onBeforeUnmount(() => {
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
</script>

<template>
  <main
    class="oa-res"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms`, '--exit-y': '52px' }"
  >
    <header class="oa-res__head">
      <div class="oa-res__titles">
        <h1 class="oa-res__title">资源管理</h1>
        <p class="oa-res__subtitle">老师可以在此处管理资源包/工程/存档/插件哦~</p>
      </div>

      <div class="oa-res__head-actions">
        <nav class="oa-res__tabs" role="tablist" aria-label="资源管理分类">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            type="button"
            role="tab"
            class="oa-res__tab"
            :class="{ 'is-active': tab.id === activeTab }"
            :aria-selected="tab.id === activeTab"
            @click="activeTab = tab.id"
          >
            <span class="oa-res__tab__label">{{ tab.label }}</span>
            <span v-if="!tab.ready" class="oa-res__tab__badge">未完成</span>
          </button>
        </nav>

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
      </div>
    </header>

    <section class="oa-res__body">
      <Transition name="oa-res-tab-fade" mode="out-in">
        <div :key="activeTab" class="oa-res__panel">
          <template v-if="activeTab === 'packages'">
            <div class="oa-res__toolbar">
              <p class="oa-res__summary">
                <strong>{{ packages.length }}</strong> 个资源包
                <span class="oa-res__path" :title="resourcesDir">{{ resourcesDir }}</span>
              </p>
              <rizui_button text="刷新" :disabled="loading" @click="refresh" />
            </div>

            <Transition name="oa-swap" mode="out-in">
              <div v-if="loading" key="loading" class="oa-res__loading">
                <p class="oa-res__loading-text">正在扫描资源目录…</p>
                <rizui_progress :indeterminate="true" :height="12" rounded />
              </div>

              <div v-else-if="error" key="error" class="oa-res__notice">
                <rizui_infobox type="error" :text="`扫描资源包失败：${error}`" />
              </div>

              <div v-else-if="!packages.length" key="empty" class="oa-res__notice">
                <rizui_infobox
                  type="info"
                  :text="`还没有资源包。把带 package.yml 的文件夹放进 ${resourcesDir || 'res 目录'} 后点刷新。`"
                />
              </div>

              <div v-else key="grid" class="oa-res__grid">
              <article
                v-for="(pkg, index) in packages"
                :key="pkg.id"
                class="oa-slot"
                :style="{ '--enter-delay': cardDelay(index) }"
              >
                <div
                  class="oa-pkg-card"
                  role="button"
                  tabindex="0"
                  :aria-label="`打开资源包 ${pkg.name}`"
                  @click="openPackage(pkg)"
                  @keydown.enter.prevent="openPackage(pkg)"
                  @keydown.space.prevent="openPackage(pkg)"
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
              </article>
              </div>
            </Transition>
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
  gap: clamp(10px, 1.4vh, 16px);
  min-height: 100vh;
  padding: clamp(10px, 1.3vh, 16px) clamp(14px, 2.4vw, 44px) clamp(12px, 1.8vh, 24px);
  /* 顶部只留窗口呼吸感：页头自己撑开，不再额外堆一段空白 */
  padding-top: clamp(14px, 2vh, 22px);
  color: var(--oa-dark-blue);
}

/* 标题与「标签 + 返回」同一行，省掉标签单独占的一整行 */
.oa-res__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px clamp(12px, 1.6vw, 22px);
  width: min(1320px, 100%);
  margin: 0 auto;
}

.oa-res__head-actions {
  display: flex;
  flex-wrap: wrap;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.oa-res__back {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 5px 11px 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
  font-family: inherit;
  font-size: 12px;
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
  gap: 2px;
  min-width: 0;
}

.oa-res__title {
  font-size: clamp(19px, 1.7vw, 25px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: #123a5c;
}

.oa-res__subtitle {
  overflow: hidden;
  font-size: clamp(11.5px, 0.9vw, 13px);
  line-height: 1.5;
  color: #6f8ba4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 分类标签 ---------- */

.oa-res__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  align-self: center;
}

.oa-res__tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #4d7799;
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-res__tab:hover {
  color: #1e4b76;
}

.oa-res__tab.is-active {
  background: linear-gradient(180deg, #ffffff 0%, #eaf6ff 100%);
  color: #123a5c;
  box-shadow:
    0 4px 12px rgba(36, 92, 138, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.oa-res__tab__label {
  font-weight: 600;
}

.oa-res__tab__badge {
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
  gap: clamp(10px, 1.3vh, 16px);
  width: min(1320px, 100%);
  margin: 0 auto;
}

.oa-res__panel {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.3vh, 16px);
  width: 100%;
}

/* 切换分类时做个短促的交叉淡入，避免内容硬切 */
.oa-res-tab-fade-enter-active,
.oa-res-tab-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.oa-res-tab-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.oa-res-tab-fade-leave-to {
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

.oa-slot > .oa-pkg-card {
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

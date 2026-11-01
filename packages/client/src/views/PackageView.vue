<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { rizui_card, rizui_infobox, rizui_progress, rizui_sidebar } from 'riz-ui';
import type { NavItem } from 'riz-ui';
import { ROUTE_NAMES } from '@/config/routes';
import { SHELL_TIMING } from '@/config/transition';
import { usePackageContent, type PackageCharacter } from '@/composables/usePackageContent';

/** 学院为空时的兜底分组名 */
const UNKNOWN_SCHOOL = '未知学院';
/** 侧边栏里「角色」分类的 id */
const SECTION_CHARACTERS = 'characters';
/** 侧边栏里「骨骼」分类的 id（与 package.yml 的键一致） */
const SECTION_SKELETONS = 'Skeletons';
/** 侧边栏学院子条目的 id 前缀（只做定位，不切换分类） */
const SCHOOL_PREFIX = 'school:';

const route = useRoute();
const router = useRouter();

const packageId = computed(() => String(route.params.packageId ?? ''));
const {
  pkg,
  characters,
  skeletons,
  loading,
  error,
  skeletonsLoading,
  skeletonsError,
  load,
  loadSkeletons,
} = usePackageContent(packageId.value);

/** 侧边栏当前条目（永远停在分类上，学院子条目只做定位） */
const activeSection = ref(SECTION_CHARACTERS);
/** 角色搜索词（447 条角色不搜索没法用） */
const keyword = ref('');

/** 内容滚动容器，用于侧边栏定位 */
const contentEl = ref<HTMLElement | null>(null);

/** 侧边栏宽度按卡片的 1/4 计算，rizui_sidebar 只接受像素值 */
const cardEl = ref<HTMLElement | null>(null);
const navWidth = ref(200);
let resizeObserver: ResizeObserver | null = null;

/**
 * 卡片的 v-if 会随 loading 反复挂载，所以观察器要跟着 cardEl 走，
 * 不能在 onMounted 里一次性绑定（那时拿到的是马上要被卸载的节点）。
 */
watch(
  cardEl,
  (el) => {
    resizeObserver?.disconnect();
    resizeObserver = null;

    if (!el) {
      return;
    }

    resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width <= 0) {
        return;
      }
      // 学院子条目要放下「百花缭乱纷争调解委员会」这类长名字
      navWidth.value = Math.max(150, Math.min(226, Math.round(width * 0.2)));
    });
    resizeObserver.observe(el);
  },
  { flush: 'post' }
);

/** 与资源管理 / 工具页同一套卡片进退场 */
const isEntering = ref(true);
let enterTimer: ReturnType<typeof setTimeout> | null = null;
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 侧边栏条目：只列出 package.yml 里声明可用的分类，「角色」下挂学院快速定位 */
const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = (pkg.value?.contents ?? [])
    .filter((content) => content.supported)
    .map((content) => {
      if (content.key === 'hasCharacter' && schoolGroups.value.length) {
        return {
          id: SECTION_CHARACTERS,
          label: content.label,
          badge: content.count > 0 ? content.count : undefined,
          children: schoolGroups.value.map((group) => ({
            id: `${SCHOOL_PREFIX}${group.school}`,
            label: group.school,
            badge: group.list.length,
          })),
        };
      }

      return {
        id: content.key === 'hasCharacter' ? SECTION_CHARACTERS : content.key,
        label: content.label,
        badge: content.count > 0 ? content.count : undefined,
      };
    });

  return items.length ? items : [{ id: 'empty', label: '暂无内容' }];
});

/**
 * rizui_nav 选中子条目时会把 modelValue 改成子条目 id，
 * 这里拦住学院子条目，保证分类始终有效。
 */
const navModel = computed<string>({
  get: () => activeSection.value,
  set: (value) => {
    const next = String(value ?? '');
    if (!next || next.startsWith(SCHOOL_PREFIX)) {
      return;
    }
    activeSection.value = next;
  },
});

/** 点侧边栏学院子条目：现在才展开并滚动到对应分组 */
function handleNavSelect(item: NavItem) {
  const id = String(item?.id ?? '');
  if (!id.startsWith(SCHOOL_PREFIX)) {
    return;
  }
  const school = id.slice(SCHOOL_PREFIX.length);
  activeSection.value = SECTION_CHARACTERS;
  openSchool(school);

  void nextTick(() => {
    const container = contentEl.value;
    const target = container?.querySelector<HTMLElement>(
      `.oa-school[data-school="${CSS.escape(school)}"]`
    );
    if (!container || !target) {
      return;
    }

    // 用 rect 差值算滚动量，避免 offsetParent 换层导致偏移
    const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + delta - 6, behavior: 'smooth' });

    highlightSchool(school);
  });
}

/** 定位后短暂高亮一下，方便一眼看到落在哪里 */
const highlightedSchool = ref('');
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

function highlightSchool(school: string) {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
  }
  highlightedSchool.value = school;
  highlightTimer = setTimeout(() => {
    highlightedSchool.value = '';
    highlightTimer = null;
  }, 1200);
}

const activeContent = computed(() => {
  const key = activeSection.value === SECTION_CHARACTERS ? 'hasCharacter' : activeSection.value;
  return pkg.value?.contents.find((content) => content.key === key) ?? null;
});

const filteredCharacters = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  if (!word) {
    return characters.value;
  }
  return characters.value.filter((item) =>
    [item.name, item.club, item.school, item.name_id].some((field) =>
      field.toLowerCase().includes(word)
    )
  );
});

const boundCount = computed(() => characters.value.filter((item) => item.hasSkeleton).length);

/** 按学院分组；组内保持后端给的 name_id 顺序，组间按人数从多到少 */
const schoolGroups = computed(() => {
  const map = new Map<string, PackageCharacter[]>();
  for (const item of filteredCharacters.value) {
    const key = item.school || UNKNOWN_SCHOOL;
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return [...map.entries()]
    .map(([school, list]) => ({ school, list }))
    .sort((a, b) => b.list.length - a.list.length || a.school.localeCompare(b.school, 'zh-Hans-CN'));
});

/**
 * 学院分组的展开状态：
 * - `expanded` 当前展开的组
 * - `mounted` 曾经展开过的组（内容懒挂载，收起后保留 DOM 以便下次动画）
 * 搜索时强制全部展开，避免命中结果被藏在折叠里。
 */
const expandedSchools = ref(new Set<string>());
const mountedSchools = ref(new Set<string>());

function isSearching(): boolean {
  return keyword.value.trim().length > 0;
}

function isOpen(school: string): boolean {
  return isSearching() || expandedSchools.value.has(school);
}

function isMountedContent(school: string): boolean {
  return isSearching() || mountedSchools.value.has(school);
}

function openSchool(school: string) {
  const nextMounted = new Set(mountedSchools.value);
  nextMounted.add(school);
  mountedSchools.value = nextMounted;

  const nextExpanded = new Set(expandedSchools.value);
  nextExpanded.add(school);
  expandedSchools.value = nextExpanded;
}

function closeSchool(school: string) {
  const next = new Set(expandedSchools.value);
  next.delete(school);
  expandedSchools.value = next;
}

function toggleSchool(school: string) {
  if (isOpen(school)) {
    closeSchool(school);
  } else {
    openSchool(school);
  }
}

/** rizui_card 的头部不是按钮，靠事件代理判定点击落在表头 */
function handleGroupClick(school: string, event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('.ct-card-head')) {
    toggleSchool(school);
  }
}

function expandAll() {
  const schools = schoolGroups.value.map((group) => group.school);
  mountedSchools.value = new Set([...mountedSchools.value, ...schools]);
  expandedSchools.value = new Set(schools);
}

function collapseAll() {
  expandedSchools.value = new Set();
}

/* ------------------------------ 骨骼 ------------------------------ */

/** 骨骼列表的搜索词 */
const skeletonKeyword = ref('');
/** 已展开文件清单的立绘目录 */
const expandedSkeletons = ref(new Set<string>());

const filteredSkeletons = computed(() => {
  const word = skeletonKeyword.value.trim().toLowerCase();
  const list = skeletons.value;
  if (!word) {
    return list;
  }
  return list.filter((item) => item.id.toLowerCase().includes(word));
});

const skeletonTotalSize = computed(() =>
  skeletons.value.reduce((sum, item) => sum + item.totalSize, 0)
);

/** 首次加载时整段列表都还没内容，摘要行换成加载文案 */
const skeletonLoadingFirst = computed(
  () => skeletonsLoading.value && skeletons.value.length === 0
);

function isSkeletonOpen(id: string): boolean {
  return expandedSkeletons.value.has(id);
}

function toggleSkeleton(id: string) {
  const next = new Set(expandedSkeletons.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedSkeletons.value = next;
}

/**
 * 预览某个立绘：带 package / skeleton 进预览页，
 * 预览页会用后端下发的文件直接装配，无需用户选文件。
 */
function previewSkeleton(id: string) {
  leaveTo({
    name: ROUTE_NAMES.skeletonPreview,
    query: { package: packageId.value, skeleton: id },
  });
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** 文件类型标签：骨骼 / 图集 / 贴图 / 其它 */
function fileKind(ext: string): string {
  if (ext === '.skel' || ext === '.json') {
    return '骨骼';
  }
  if (ext === '.atlas') {
    return '图集';
  }
  if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
    return '贴图';
  }
  return '其它';
}

/**
 * 骨骼清单按需加载：631 个目录、2500 次 stat，进页面就拉会拖慢首屏，
 * 所以等用户真正切到「骨骼」分类再请求。
 */
watch(
  activeSection,
  (section) => {
    if (section === SECTION_SKELETONS) {
      void loadSkeletons();
    }
  },
  { immediate: true }
);

onMounted(() => {
  void load();

  enterTimer = setTimeout(() => {
    isEntering.value = false;
    enterTimer = null;
  }, 760);
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
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = null;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
});

function leaveTo(target: {
  name: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}) {
  if (isLeaving.value) {
    return;
  }
  isLeaving.value = true;
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    void router.push(target);
  }, SHELL_TIMING.cardsExitWait);
}

function backToResources() {
  leaveTo({ name: ROUTE_NAMES.resources });
}

function openCharacter(character: PackageCharacter) {
  leaveTo({
    name: ROUTE_NAMES.packageCharacter,
    params: { packageId: packageId.value, nameId: character.name_id },
  });
}
</script>

<template>
  <main
    class="oa-pkg"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms` }"
  >
    <header class="oa-pkg__head">
      <button type="button" class="oa-pkg__back" @click="backToResources">
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
        资源管理
      </button>

      <div class="oa-pkg__titles">
        <h1 class="oa-pkg__title">{{ pkg?.name || packageId }}</h1>
        <p class="oa-pkg__subtitle">
          {{ pkg?.description || '这个资源包还没有填写描述。' }}
        </p>
      </div>
    </header>

    <div v-if="loading" class="oa-pkg__state">
      <p class="oa-pkg__state-text">正在读取资源包…</p>
      <rizui_progress :indeterminate="true" :height="12" rounded />
    </div>

    <rizui_infobox v-else-if="error" type="error" :text="`读取资源包失败：${error}`" />

    <section v-else ref="cardEl" class="oa-pkg__card">
      <rizui_sidebar
        v-model="navModel"
        class="oa-pkg__nav"
        :items="navItems"
        :width="navWidth"
        :inset="0"
        height="100%"
        :collapsible="false"
        :default-expanded-keys="[SECTION_CHARACTERS]"
        @select="handleNavSelect"
      />

      <div ref="contentEl" class="oa-pkg__content">
        <!-- 角色 -->
        <template v-if="activeSection === SECTION_CHARACTERS">
          <div class="oa-pkg__toolbar">
            <p class="oa-pkg__summary">
              <strong>{{ characters.length }}</strong> 个角色
              <span class="oa-pkg__dot" aria-hidden="true">·</span>
              {{ boundCount }} 个已绑定骨骼
              <span class="oa-pkg__dot" aria-hidden="true">·</span>
              {{ schoolGroups.length }} 个学院
            </p>
            <div class="oa-pkg__tools">
              <button type="button" class="oa-pkg__mini" @click="expandAll">全部展开</button>
              <button type="button" class="oa-pkg__mini" @click="collapseAll">全部收起</button>
              <label class="oa-pkg__search">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path
                    d="m10.4 10.4 3 3"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  />
                </svg>
                <input v-model="keyword" type="search" placeholder="搜索名字 / 社团 / 学院" />
              </label>
            </div>
          </div>

          <div v-if="filteredCharacters.length" class="oa-pkg__groups">
            <div
              v-for="group in schoolGroups"
              :key="group.school"
              class="oa-school"
              :class="{
                'is-open': isOpen(group.school),
                'is-highlight': highlightedSchool === group.school,
              }"
              :data-school="group.school"
              @click="handleGroupClick(group.school, $event)"
            >
              <rizui_card
                :title="group.school"
                :desc="`${group.list.length} 个角色`"
              >
                <!-- 内容懒挂载：首次展开才渲染，收起靠 grid 0fr→1fr 过渡 -->
                <div class="oa-school__collapse" :class="{ 'is-open': isOpen(group.school) }">
                  <div class="oa-school__collapse-inner">
                    <div v-if="isMountedContent(group.school)" class="oa-pkg__grid">
                      <button
                        v-for="character in group.list"
                        :key="character.name_id"
                        type="button"
                        class="oa-char"
                        :class="{ 'is-unbound': !character.hasSkeleton }"
                        :title="character.hasSkeleton ? '已绑定骨骼' : '未绑定骨骼'"
                        @click="openCharacter(character)"
                      >
                        <span class="oa-char__avatar">
                          <img
                            v-if="character.avatarUrl"
                            :src="character.avatarUrl"
                            :alt="character.name"
                            loading="lazy"
                          />
                          <span v-else class="oa-char__avatar-fallback">
                            {{ character.name.slice(0, 1) }}
                          </span>
                        </span>

                        <span class="oa-char__text">
                          <span class="oa-char__name">{{ character.name }}</span>
                          <span class="oa-char__club">{{ character.club || '无所属组织' }}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </rizui_card>
            </div>
          </div>

          <div v-else class="oa-pkg__empty">
            <p>{{ keyword ? '没有匹配的角色。' : '这个资源包没有可展示的角色。' }}</p>
          </div>
        </template>

        <!-- 骨骼：列式列出全部立绘目录，点开看文件，右侧可预览 -->
        <template v-else-if="activeSection === SECTION_SKELETONS">
          <div class="oa-pkg__toolbar">
            <p class="oa-pkg__summary">
              <template v-if="skeletonLoadingFirst">
                正在读取立绘目录…
              </template>
              <template v-else>
                <strong>{{ skeletons.length }}</strong> 个立绘
                <span class="oa-pkg__dot" aria-hidden="true">·</span>
                {{ formatSize(skeletonTotalSize) }}
                <span class="oa-pkg__dot" aria-hidden="true">·</span>
                {{ filteredSkeletons.length }} 个匹配
              </template>
            </p>
            <div class="oa-pkg__tools">
              <label class="oa-pkg__search">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="1.6" />
                  <path
                    d="m10.4 10.4 3 3"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  />
                </svg>
                <input v-model="skeletonKeyword" type="search" placeholder="搜索立绘 id" />
              </label>
            </div>
          </div>

          <div v-if="skeletonsLoading" class="oa-pkg__state oa-pkg__state--inline">
            <p class="oa-pkg__state-text">正在读取立绘目录（约 600 项）…</p>
            <rizui_progress :indeterminate="true" :height="6" rounded />
          </div>

          <rizui_infobox
            v-else-if="skeletonsError"
            type="error"
            :text="`读取立绘目录失败：${skeletonsError}`"
          />

          <div v-else-if="filteredSkeletons.length" class="oa-skel-list">
            <div
              v-for="item in filteredSkeletons"
              :key="item.id"
              class="oa-skel"
              :class="{ 'is-open': isSkeletonOpen(item.id) }"
            >
              <div
                class="oa-skel__head"
                role="button"
                tabindex="0"
                @click="toggleSkeleton(item.id)"
                @keydown.enter.prevent="toggleSkeleton(item.id)"
                @keydown.space.prevent="toggleSkeleton(item.id)"
              >
                <span class="oa-skel__arrow" aria-hidden="true" />

                <span class="oa-skel__names">
                  <span class="oa-skel__id">{{ item.id }}</span>
                  <span class="oa-skel__meta">
                    {{ item.files.length }} 个文件 · {{ formatSize(item.totalSize) }}
                    <template v-if="!item.complete">
                      · <span class="oa-skel__warn">缺少必需文件</span>
                    </template>
                  </span>
                </span>

                <button
                  type="button"
                  class="oa-skel__preview"
                  :disabled="!item.complete"
                  :title="item.complete ? '在骨骼预览里打开' : '缺少 .skel / .atlas / 贴图，无法预览'"
                  @click.stop="previewSkeleton(item.id)"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M1.6 8S3.9 3.6 8 3.6 14.4 8 14.4 8 12.1 12.4 8 12.4 1.6 8 1.6 8Z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linejoin="round"
                    />
                    <circle cx="8" cy="8" r="1.9" fill="none" stroke="currentColor" stroke-width="1.4" />
                  </svg>
                  预览
                </button>
              </div>

              <div class="oa-skel__collapse" :class="{ 'is-open': isSkeletonOpen(item.id) }">
                <div class="oa-skel__collapse-inner">
                  <ul v-if="isSkeletonOpen(item.id)" class="oa-file-list">
                    <li v-for="file in item.files" :key="file.name" class="oa-file">
                      <span class="oa-file__kind">{{ fileKind(file.ext) }}</span>
                      <span class="oa-file__name">{{ file.name }}</span>
                      <span class="oa-file__size">{{ formatSize(file.size) }}</span>
                      <a
                        class="oa-file__open"
                        :href="file.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click.stop
                      >
                        打开
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="oa-pkg__empty">
            <p>{{ skeletonKeyword ? '没有匹配的立绘。' : '这个资源包没有立绘目录。' }}</p>
          </div>
        </template>

        <!-- 其它分类：先给出索引信息，具体浏览后续接入 -->
        <div v-else class="oa-pkg__placeholder">
          <span class="oa-pkg__placeholder-badge">未完成</span>
          <p class="oa-pkg__placeholder-title">{{ activeContent?.label ?? '内容' }}</p>
          <p class="oa-pkg__placeholder-text">
            该分类下共有 {{ activeContent?.count ?? 0 }} 项，目录
            <code>{{ activeContent?.path || '—' }}</code>。内容预览还在开发中。
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/*
 * 页面本身透明：底色、气泡、banner 都由 App 层常驻。
 */
.oa-pkg {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: clamp(10px, 1.4vh, 16px);
  min-height: 100vh;
  padding: clamp(12px, 1.8vh, 20px) clamp(14px, 2.4vw, 44px) clamp(24px, 3.2vh, 40px);
  padding-top: clamp(48px, 6.6vh, 72px);
  color: var(--oa-dark-blue);
}

.oa-pkg__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(1320px, 100%);
  margin: 0 auto;
}

.oa-pkg__back {
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

.oa-pkg__back svg {
  width: 14px;
  height: 14px;
}

.oa-pkg__back:hover {
  color: var(--oa-blue);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.16);
}

.oa-pkg__titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.oa-pkg__title {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #123a5c;
  overflow-wrap: anywhere;
}

.oa-pkg__subtitle {
  display: -webkit-box;
  overflow: hidden;
  font-size: clamp(12px, 0.95vw, 13.5px);
  line-height: 1.6;
  color: #6f8ba4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* ---------- 状态 ---------- */

.oa-pkg__state {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(1320px, 100%);
  margin: 0 auto;
  padding: 18px 4px;
}

.oa-pkg__state-text {
  font-size: 12.5px;
  color: #6f8ba4;
}

/* ---------- 大卡片 ---------- */

.oa-pkg__card {
  display: flex;
  gap: clamp(10px, 1.2vw, 18px);
  width: min(1320px, 100%);
  height: clamp(420px, calc(100vh - 196px), 1000px);
  margin: 0 auto;
  padding: clamp(10px, 1.2vw, 16px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fcff 66%, #f1f9ff 100%);
  box-shadow:
    0 12px 26px rgba(36, 92, 138, 0.14),
    0 2px 5px rgba(36, 92, 138, 0.07),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  overflow: hidden;
}

.oa-pkg.is-entering .oa-pkg__card,
.oa-pkg__state {
  animation: oa-panel-in 620ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.oa-pkg.is-leaving .oa-pkg__card {
  animation: oa-panel-out var(--cards-exit, 260ms) cubic-bezier(0.4, 0, 0.8, 0.24) forwards;
}

@keyframes oa-panel-in {
  from {
    opacity: 0;
    transform: translateY(38px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes oa-panel-out {
  to {
    opacity: 0;
    transform: translateY(38px) scale(0.985);
  }
}

/* 侧边栏自带底色，这里只让它拉伸到卡片高度 */
.oa-pkg__nav {
  height: 100%;
}

/* 学院子条目压小一号，长名字尽量塞得下 */
.oa-pkg__nav :deep(.rnav-submenu .rnav-item-btn) {
  padding: 6px 8px 6px 14px;
  font-size: 12px;
}

.oa-pkg__nav :deep(.rnav-submenu .rnav-badge) {
  height: 14px;
  min-width: 14px;
  padding: 0 5px;
  font-size: 9.5px;
  opacity: 0.75;
}

.oa-pkg__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

/* ---------- 角色列表 ---------- */

.oa-pkg__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
}

.oa-pkg__summary {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12.5px;
  color: #6f8ba4;
}

.oa-pkg__summary strong {
  color: #1e4b76;
  font-size: 15px;
}

.oa-pkg__dot {
  color: #b3c6d4;
}

.oa-pkg__tools {
  display: flex;
  align-items: center;
  gap: 7px;
}

.oa-pkg__mini {
  padding: 4px 10px;
  border: 1px solid rgba(163, 190, 210, 0.5);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  font-family: inherit;
  font-size: 11.5px;
  color: #5d7d97;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.oa-pkg__mini:hover {
  border-color: rgba(0, 144, 254, 0.42);
  color: #1769a8;
}

/* ---------- 学院分组 ---------- */

.oa-pkg__groups {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 4px;
}

/*
 * rizui_card 自带 padding / 圆角 / 底部 margin，这里只补：
 * 表头可点、右侧折叠箭头、展开动画的收口。
 */
.oa-school :deep(.ct-card) {
  padding: 11px 14px;
  border-radius: 12px;
  transition:
    box-shadow 0.24s ease,
    border-color 0.24s ease;
}

.oa-school.is-highlight :deep(.ct-card) {
  border-color: rgba(0, 144, 254, 0.55);
  box-shadow:
    0 0 0 3px rgba(0, 144, 254, 0.12),
    0 2px 10px rgba(36, 92, 138, 0.12);
}

.oa-school :deep(.ct-card-head) {
  cursor: pointer;
  user-select: none;
}

.oa-school :deep(.ct-card-head)::after {
  content: '';
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-right: 1.8px solid #8aa3b8;
  border-bottom: 1.8px solid #8aa3b8;
  transform: rotate(45deg) translate(-1px, -1px);
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.oa-school.is-open :deep(.ct-card-head)::after {
  transform: rotate(-135deg) translate(1px, 1px);
}

.oa-school :deep(.ct-card-title) {
  font-size: 13.5px;
  color: #1e4b76;
}

.oa-school :deep(.ct-card-desc) {
  font-size: 11px;
  color: #8aa3b8;
}

.oa-school :deep(.ct-card-body) {
  margin-top: 0;
}

/*
 * 展开 / 收起动画：grid-template-rows 0fr → 1fr。
 * 内层必须 overflow: hidden + min-height: 0，否则 0fr 收不干净。
 */
.oa-school__collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.22s ease;
}

.oa-school__collapse.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.oa-school__collapse-inner {
  min-height: 0;
  overflow: hidden;
}

.oa-school__collapse.is-open .oa-school__collapse-inner {
  padding-top: 10px;
}

.oa-pkg__search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border: 1px solid rgba(163, 190, 210, 0.5);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #8aa3b8;
  transition: border-color 0.2s ease;
}

.oa-pkg__search:focus-within {
  border-color: var(--oa-blue);
}

.oa-pkg__search svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}

.oa-pkg__search input {
  width: 170px;
  border: 0;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: #1e4b76;
}

.oa-pkg__search input::placeholder {
  color: #a8bccb;
}

.oa-pkg__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
  gap: 8px;
  align-content: start;
}

.oa-char {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  min-height: 60px;
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 10px;
  background: #ffffff;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.oa-char:hover {
  border-color: rgba(0, 144, 254, 0.42);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.12);
}

.oa-char:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
}

.oa-char__avatar {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(180deg, #eaf6ff 0%, #d6ecfc 100%);
}

/* 未绑定骨骼：头像上加一个角标，省下整列的宽度给名字 */
.oa-char.is-unbound .oa-char__avatar::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 8px;
  height: 8px;
  border: 1.5px solid #ffffff;
  border-radius: 50%;
  background: #c2d1dc;
}

.oa-char__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.oa-char__avatar-fallback {
  font-size: 16px;
  font-weight: 700;
  color: #7fa8c6;
}

.oa-char__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.oa-char__name {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: #1e4b76;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.oa-char__club {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.3;
  color: #8aa3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 骨骼列表 ---------- */

.oa-skel-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-bottom: 4px;
}

.oa-skel {
  border: 1px solid rgba(190, 214, 231, 0.55);
  border-radius: 10px;
  background: #ffffff;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-skel.is-open {
  border-color: rgba(0, 144, 254, 0.32);
  box-shadow: 0 4px 14px rgba(36, 92, 138, 0.08);
}

.oa-skel__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 8px 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.oa-skel__head:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
  border-radius: 10px;
}

.oa-skel__arrow {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-right: 1.8px solid #8aa3b8;
  border-bottom: 1.8px solid #8aa3b8;
  transform: rotate(-45deg);
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.oa-skel.is-open .oa-skel__arrow {
  transform: rotate(45deg);
}

.oa-skel__names {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.oa-skel__id {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: #1e4b76;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-skel__meta {
  font-size: 11px;
  color: #8aa3b8;
}

.oa-skel__warn {
  color: #c07a00;
}

.oa-skel__preview {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 4px 11px 4px 9px;
  border: 1px solid rgba(0, 144, 254, 0.28);
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.07);
  font-family: inherit;
  font-size: 11.5px;
  color: #1769a8;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.oa-skel__preview svg {
  width: 13px;
  height: 13px;
}

.oa-skel__preview:hover:not(:disabled) {
  border-color: rgba(0, 144, 254, 0.55);
  background: rgba(0, 144, 254, 0.14);
}

.oa-skel__preview:disabled {
  border-color: rgba(154, 176, 194, 0.4);
  background: rgba(154, 176, 194, 0.12);
  color: #a3b6c4;
  cursor: not-allowed;
}

/* 与学院分组同一套 grid 0fr→1fr 展开动画 */
.oa-skel__collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
}

.oa-skel__collapse.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.oa-skel__collapse-inner {
  min-height: 0;
  overflow: hidden;
}

.oa-file-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 10px 8px 24px;
  padding-top: 6px;
  border-top: 1px dashed rgba(190, 214, 231, 0.7);
  list-style: none;
}

.oa-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 11.5px;
}

.oa-file__kind {
  flex: 0 0 auto;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.08);
  font-size: 10px;
  line-height: 1.7;
  color: #1769a8;
}

.oa-file__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: #4d7799;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-file__size {
  flex: 0 0 auto;
  min-width: 62px;
  text-align: right;
  font-size: 10.5px;
  color: #a3b6c4;
}

.oa-file__open {
  flex: 0 0 auto;
  padding: 1px 8px;
  border-radius: 999px;
  color: #0b7ad6;
  font-size: 10.5px;
  text-decoration: none;
  transition: background 0.2s ease;
}

.oa-file__open:hover {
  background: rgba(0, 144, 254, 0.1);
}

.oa-pkg__state--inline {
  width: 100%;
  padding: 14px 2px;
}

/* ---------- 空态 / 占位 ---------- */

.oa-pkg__empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  color: #9ab0c2;
}

.oa-pkg__placeholder {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 1px dashed rgba(111, 139, 164, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.oa-pkg__placeholder-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(248, 190, 0, 0.18);
  color: #a47500;
  font-size: 11px;
}

.oa-pkg__placeholder-title {
  font-size: clamp(15px, 1.3vw, 18px);
  font-weight: 700;
  color: #1e4b76;
}

.oa-pkg__placeholder-text {
  max-width: 32em;
  font-size: 12.5px;
  line-height: 1.7;
  color: #6f8ba4;
}

.oa-pkg__placeholder-text code {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 144, 254, 0.08);
  font-size: 11.5px;
  color: #1769a8;
}

@media (prefers-reduced-motion: reduce) {
  .oa-pkg.is-entering .oa-pkg__card,
  .oa-pkg.is-leaving .oa-pkg__card,
  .oa-pkg__state {
    animation: none;
  }
}
</style>

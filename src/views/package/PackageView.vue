<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import './package.css';
import { useRoute, useRouter } from 'vue-router';
import { rizui_infobox, rizui_progress } from 'riz-ui';
import type { NavItem } from 'riz-ui';
import { ROUTE_NAMES } from '@/modules/ViewsManager/routes';
import OAPageHeader from '@/modules/ViewsManager/OAPageHeader.vue';
import OAPackageSkeletons from './OAPackageSkeletons.vue';
import OAPackageCharacters from './OAPackageCharacters.vue';
import OAPackageNav from './OAPackageNav.vue';
import OAPackageMusic from './OAPackageMusic.vue';
import OAPackageSounds from './OAPackageSounds.vue';
import OAPackageBackgrounds from './OAPackageBackgrounds.vue';
import OAPackageEmotions from './OAPackageEmotions.vue';
import { SHELL_TIMING } from '@/modules/Shell/shellTiming';
import OACharacterPickerDialog from '@/modules/ResourcePicker/OACharacterPickerDialog.vue';
import {
  disposeCharacterPicker,
  openCharacterPicker,
  type CharacterPickItem,
} from '@/modules/ResourcePicker/useCharacterPicker';
import { useEnterAnimation } from '@/modules/ViewsManager/useEnterAnimation';
import { useGlobalConfig } from '@/modules/ConfigProvider/useGlobalConfig';
import { loadSpineCharacterFromPackage, type SpineCharacter } from '@/modules/SkeletonRender/spinePackage';
import {
  usePackageContent,
  type PackageCharacter,
} from '@/modules/PackageProvider/usePackageContent';

/** 学院为空时的兜底分组名 */
const UNKNOWN_SCHOOL = '未知学院';
/** 侧边栏里「角色」分类的 id */
const SECTION_CHARACTERS = 'characters';
/** 侧边栏里「骨骼」分类的 id（与 package.yml 的键一致） */
const SECTION_SKELETONS = 'Skeletons';
/** 侧边栏里「背景音乐」分类的 id */
const SECTION_MUSIC = 'BackgroundMusic';
/** 侧边栏里「音效」分类的 id */
const SECTION_SOUNDS = 'Sounds';
/** 侧边栏里「背景」分类的 id */
const SECTION_BACKGROUNDS = 'Backgrounds';
/** 侧边栏里「表情」分类的 id */
const SECTION_EMOTIONS = 'Emotions';
/** 侧边栏学院子条目的 id 前缀（只做定位，不切换分类） */
const SCHOOL_PREFIX = 'school:';
/** 侧边栏音效类别子条目的 id 前缀；`sound:` 本身表示「全部」 */
const SOUND_CATEGORY_PREFIX = 'sound:';
/** 侧边栏背景分类子条目的 id 前缀；`bg:` 本身表示「未分类」 */
const BACKGROUND_CATEGORY_PREFIX = 'bg:';

/** package.yml 的键 → 侧边栏 id（只有 hasCharacter 需要归一） */
function navIdOf(key: string): string {
  return key === 'hasCharacter' ? SECTION_CHARACTERS : key;
}

const route = useRoute();
const router = useRouter();

const packageId = computed(() => String(route.params.packageId ?? ''));
const {
  pkg,
  characters,
  skeletons,
  music,
  sounds,
  soundCategories,
  backgrounds,
  emotions,
  loading,
  error,
  skeletonsLoading,
  skeletonsError,
  musicLoading,
  musicError,
  soundsLoading,
  soundsError,
  backgroundsLoading,
  backgroundsError,
  emotionsLoading,
  emotionsError,
  load,
  loadSkeletons,
  loadMusic,
  loadSounds,
  loadBackgrounds,
  loadEmotions,
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

/** 与资源管理 / 工具页同一套卡片进退场；等详情读完再播入场，避免进度条消失后卡片硬切 */
const { isEntering } = useEnterAnimation(() => !loading.value, 900);
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 侧边栏条目：列出 package_content 里的全部类型，不支持的也保留入口 */
const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = (pkg.value?.contents ?? []).map((content) => {
    if (
      content.key === 'hasCharacter' &&
      content.supported &&
      schoolGroups.value.length
    ) {
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

    // 音效类别（categories.json 的映射）做成侧边栏子条目，和角色学院同一套交互
    if (content.key === SECTION_SOUNDS && content.supported && soundCategoryGroups.value.length) {
      return {
        id: SECTION_SOUNDS,
        label: content.label,
        badge: content.count > 0 ? content.count : undefined,
        children: [
          {
            id: SOUND_CATEGORY_PREFIX,
            label: '全部',
            badge: sounds.value.length,
          },
          ...soundCategoryGroups.value.map((group) => ({
            id: `${SOUND_CATEGORY_PREFIX}${group.label}`,
            label: group.label,
            badge: group.count,
          })),
        ],
      };
    }

    // 背景分类（index/category.yml）同样做成子条目；未分类的 id 为空串
    if (
      content.key === SECTION_BACKGROUNDS &&
      content.supported &&
      backgrounds.value.length
    ) {
      return {
        id: SECTION_BACKGROUNDS,
        label: content.label,
        badge: content.count > 0 ? content.count : undefined,
        children: backgrounds.value.map((category) => ({
          id: `${BACKGROUND_CATEGORY_PREFIX}${category.id}`,
          label: category.label,
          badge: category.count,
        })),
      };
    }

    return {
      id: navIdOf(content.key),
      label: content.label,
      badge: content.supported && content.count > 0 ? content.count : undefined,
    };
  });

  return items.length ? items : [{ id: 'empty', label: '暂无内容' }];
});

/**
 * 点侧边栏学院子条目时，学院分组的展开状态在子组件里，
 * 而子组件此刻可能还没挂载（从别的分类切过来），所以这里只记下意图，
 * 等子组件展开并挂载好内容后回吐 `opened`，再去定位 + 高亮。
 */
const schoolFocus = ref<{ school: string; token: number } | null>(null);
let schoolToken = 0;

function focusSchool(school: string) {
  activeSection.value = SECTION_CHARACTERS;
  schoolFocus.value = { school, token: ++schoolToken };
}

function handleSchoolOpened(school: string) {
  // 消费掉焦点，避免下次重新挂载角色面板时又把这个学院展开一遍
  schoolFocus.value = null;
  scrollToBlock(`.oa-pkg__school[data-school="${CSS.escape(school)}"]`, () =>
    highlightSchool(school)
  );
}

/**
 * rizui_nav 选中子条目时会把 modelValue 改成子条目 id，
 * 这里拦住学院 / 音效类别 / 背景分类子条目，保证分类始终有效。
 */
const navModel = computed<string>({
  get: () => activeSection.value,
  set: (value) => {
    const next = String(value ?? '');
    if (
      !next ||
      next.startsWith(SCHOOL_PREFIX) ||
      next.startsWith(SOUND_CATEGORY_PREFIX) ||
      next.startsWith(BACKGROUND_CATEGORY_PREFIX)
    ) {
      return;
    }
    activeSection.value = next;
  },
});

function setNavModel(value: string) {
  navModel.value = value;
}

/**
 * 带子条目的分类点父条目只会「展开 / 收起」，不会切换右侧内容。
 * 展开时顺带把分类切过去，避免「展开音效却还停在角色」。
 */
function handleNavToggle(payload: { item: NavItem; expanded: boolean }) {
  if (!payload?.expanded) {
    return;
  }
  const id = String(payload.item?.id ?? '');
  if (id === SECTION_SOUNDS || id === SECTION_CHARACTERS || id === SECTION_BACKGROUNDS) {
    if (activeSection.value !== id) {
      activeSection.value = id;
    }
  }
}

/** 把内容区滚到某个子条目的位置并短暂高亮 */
function scrollToBlock(selector: string, highlight: () => void) {
  void nextTick(() => {
    const container = contentEl.value;
    const target = container?.querySelector<HTMLElement>(selector);
    if (!container || !target) {
      return;
    }

    // 用 rect 差值算滚动量，避免 offsetParent 换层导致偏移
    const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + delta - 6, behavior: 'smooth' });

    highlight();
  });
}

/** 点侧边栏学院 / 音效类别子条目：切分类、必要时补数据，再定位内容区 */
async function handleNavSelect(item: NavItem) {
  const id = String(item?.id ?? '');

  if (id.startsWith(SOUND_CATEGORY_PREFIX)) {
    const category = id.slice(SOUND_CATEGORY_PREFIX.length);
    activeSection.value = SECTION_SOUNDS;
    activeSoundCategory.value = category;

    // 首次进入音效分类时数据还没到，先拉完再滚动，否则列表还是空的
    if (!sounds.value.length) {
      await loadSounds();
    }

    void nextTick(() => {
      contentEl.value?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return;
  }

  if (id.startsWith(BACKGROUND_CATEGORY_PREFIX)) {
    const category = id.slice(BACKGROUND_CATEGORY_PREFIX.length);
    activeSection.value = SECTION_BACKGROUNDS;
    activeBackgroundCategory.value = category;

    if (!backgrounds.value.length) {
      await loadBackgrounds();
    }

    void nextTick(() => {
      contentEl.value?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return;
  }

  if (!id.startsWith(SCHOOL_PREFIX)) {
    return;
  }
  const school = id.slice(SCHOOL_PREFIX.length);
  focusSchool(school);
}

/** 定位后短暂高亮一下，方便一眼看到落在哪里 */
const highlightedSchool = ref('');
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

function highlightSchool(school: string) {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = null;
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

/**
 * 搜索框固定在卡片外右上角，绑到「当前分类」的搜索词上：
 * 三个分类各有自己的 keyword，切分类不会串味。
 */
const activeKeyword = computed({
  get: () => {
    if (activeSection.value === SECTION_SKELETONS) {
      return skeletonKeyword.value;
    }
    if (activeSection.value === SECTION_MUSIC) {
      return musicKeyword.value;
    }
    if (activeSection.value === SECTION_SOUNDS) {
      return soundKeyword.value;
    }
    if (activeSection.value === SECTION_BACKGROUNDS) {
      return backgroundKeyword.value;
    }
    return keyword.value;
  },
  set: (value: string) => {
    if (activeSection.value === SECTION_SKELETONS) {
      skeletonKeyword.value = value;
    } else if (activeSection.value === SECTION_MUSIC) {
      musicKeyword.value = value;
    } else if (activeSection.value === SECTION_SOUNDS) {
      soundKeyword.value = value;
    } else if (activeSection.value === SECTION_BACKGROUNDS) {
      backgroundKeyword.value = value;
    } else {
      keyword.value = value;
    }
  },
});

/** 占位文案同时决定搜索框显不显示（占位面板不需要搜索） */
const searchPlaceholder = computed(() => {
  if (!activeContent.value?.supported) {
    return '';
  }
  if (activeSection.value === SECTION_CHARACTERS) {
    return '搜索名字 / 社团 / 学院';
  }
  if (activeSection.value === SECTION_SKELETONS) {
    return '搜索立绘 id';
  }
  if (activeSection.value === SECTION_MUSIC) {
    return '搜索曲名 / 作曲 / id';
  }
  if (activeSection.value === SECTION_SOUNDS) {
    return '搜索 id / 描述 / 文件名';
  }
  if (activeSection.value === SECTION_BACKGROUNDS) {
    return '搜索背景文件名';
  }
  return '';
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

/* ------------------------------ 骨骼 ------------------------------ */

/** 骨骼列表的搜索词 */
const skeletonKeyword = ref('');

/**
 * 预览某个立绘：带 package / skeleton 进预览页，
 * 预览页会用后端下发的文件直接装配，无需用户选文件。
 */
function previewSkeleton(id: string) {
  leaveTo({
    name: ROUTE_NAMES.skeletonPreview,
    query: { packageId: packageId.value, skeletonId: id },
  });
}

/**
 * 各分类按需加载：631 个立绘目录 / 3000+ 音效进页面就拉会拖慢首屏，
 * 等用户真正切到该分类再请求（composable 内部去重）。
 */
watch(
  activeSection,
  (section) => {
    if (section === SECTION_SKELETONS) {
      void loadSkeletons();
    } else if (section === SECTION_MUSIC) {
      void loadMusic();
    } else if (section === SECTION_SOUNDS) {
      void loadSounds();
    } else if (section === SECTION_BACKGROUNDS) {
      void loadBackgrounds();
    } else if (section === SECTION_EMOTIONS) {
      void loadEmotions();
    }
  },
  { immediate: true }
);

/* ------------------------------ 背景音乐 / 音效 ------------------------------ */

/** 背景音乐搜索词（页头搜索框按分类代理） */
const musicKeyword = ref('');

/** 音效搜索词 */
const soundKeyword = ref('');

/**
 * 当前选中的音效类别，值是 `categories.json` 映射后的**中文标签**；`'` 表示全部。
 * 用标签而不是原始键：`FX` 与 `Other` 都映射成「其他」，按标签合并成同一个侧边栏条目。
 */
const activeSoundCategory = ref('');

/**
 * 展示用类别分组（侧边栏子条目）：把映射到同一个中文名的原始类别键合并。
 * 例：`categories.json` 里 `FX` / `Other` 都是「其他」→ 侧边栏只有一个「其他」。
 */
const soundCategoryGroups = computed(() => {
  const map = new Map<string, { label: string; count: number }>();

  for (const category of soundCategories.value) {
    if (category.count <= 0) {
      continue;
    }
    const bucket = map.get(category.label);
    if (bucket) {
      bucket.count += category.count;
    } else {
      map.set(category.label, { label: category.label, count: category.count });
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'));
});

/* ------------------------------ 背景 ------------------------------ */

/** 背景搜索词（页头搜索框按分类代理） */
const backgroundKeyword = ref('');

/**
 * 当前选中的背景分类 id（侧边栏子条目驱动）；`null` 表示「全部」。
 * 空串是合法值，代表 `category.yml` 之外的「未分类」。
 */
const activeBackgroundCategory = ref<string | null>(null);

/* ------------------------------ 表情 ------------------------------ */

/** 表情预览用的立绘；为空时提示先选角色 */
const emotionCharacter = ref<SpineCharacter | null>(null);
const emotionCharacterLabel = ref('');
const emotionCharacterLoading = ref(false);
const emotionCharacterError = ref('');

/** 已被角色引用的立绘 id，用来从「独立立绘」里排除掉 */
const boundSkeletonIds = computed(
  () =>
    new Set(
      characters.value
        .flatMap((character) => character.spines)
        .filter((spine) => spine.exists)
        .map((spine) => spine.id)
    )
);

/**
 * 候选列表 = 每个角色绑定的立绘 + 没被任何角色引用的独立立绘目录。
 * 独立立绘需要完整三件套，否则载入必然失败。
 */
async function buildCharacterChoices(): Promise<CharacterPickItem[]> {
  if (!skeletons.value.length) {
    await loadSkeletons();
  }

  const items: CharacterPickItem[] = [];

  for (const character of characters.value) {
    for (const spine of character.spines) {
      if (!spine.exists) {
        continue;
      }
      items.push({
        key: `character:${character.name_id}:${spine.id}`,
        label: character.name,
        description: [character.school, character.club].filter(Boolean).join(' · ') || '角色立绘',
        group: '角色立绘',
        skeletonId: spine.id,
        avatarUrl: character.avatarUrl,
      });
    }
  }

  const bound = boundSkeletonIds.value;
  for (const skeleton of skeletons.value) {
    if (!skeleton.complete || bound.has(skeleton.id)) {
      continue;
    }
    items.push({
      key: `skeleton:${skeleton.id}`,
      label: skeleton.id,
      description: '未被角色引用的独立立绘目录',
      group: '独立立绘',
      skeletonId: skeleton.id,
      avatarUrl: '',
    });
  }

  return items;
}

async function loadEmotionCharacter(picked: CharacterPickItem) {
  emotionCharacterLoading.value = true;
  emotionCharacterError.value = '';

  try {
    emotionCharacter.value = await loadSpineCharacterFromPackage(packageId.value, picked.skeletonId);
    emotionCharacterLabel.value =
      picked.group === '独立立绘'
        ? picked.skeletonId
        : `${picked.label} · ${picked.skeletonId}`;
  } catch (error) {
    emotionCharacter.value = null;
    emotionCharacterLabel.value = '';
    emotionCharacterError.value = error instanceof Error ? error.message : String(error);
  } finally {
    emotionCharacterLoading.value = false;
  }
}

/** 打开角色选择框；决定用哪条立绘作为表情预览底座 */
async function pickEmotionCharacter() {
  const items = await buildCharacterChoices();
  const picked = await openCharacterPicker(items, {
    title: '选择表情预览角色',
    description: '从资源包里已绑定立绘的角色，或独立的立绘目录中选择一个作为表情预览的底座。',
    emptyText: '这个资源包里没有可用的立绘（先确认「骨骼」分类里至少有一个完整目录）。',
  });

  if (!picked) {
    return;
  }

  await loadEmotionCharacter(picked);
}

onMounted(() => {
  void load();
});

onBeforeUnmount(() => {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = null;
  }
  disposeCharacterPicker();
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
    <OAPageHeader
      class="oa-pkg__head"
      :title="pkg?.name || packageId"
      :subtitle="pkg?.description || '这个资源包还没有填写描述。'"
      back-label="资源管理"
      @back="backToResources"
    >
      <template #actions>
        <!-- 搜索固定在整张卡片之外的右上角，内容随当前分类切换 -->
        <label v-if="searchPlaceholder" class="oa-pkg__search oa-pkg__search--head">
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
          <input v-model="activeKeyword" type="search" :placeholder="searchPlaceholder" />
        </label>
      </template>
    </OAPageHeader>

    <Transition name="oa-swap" mode="out-in">
      <div v-if="loading" key="loading" class="oa-pkg__state">
        <p class="oa-pkg__state-text">正在读取资源包…</p>
        <rizui_progress :indeterminate="true" :height="12" rounded />
      </div>

      <div v-else-if="error" key="error" class="oa-pkg__notice">
        <rizui_infobox type="error" :text="`读取资源包失败：${error}`" />
      </div>

      <section v-else key="card" ref="cardEl" class="oa-pkg__card">
      <OAPackageNav
        :model-value="navModel"
        :items="navItems"
        :width="navWidth"
        :default-expanded-keys="[SECTION_CHARACTERS, SECTION_SOUNDS]"
        @update:model-value="setNavModel"
        @select="handleNavSelect"
        @toggle="handleNavToggle"
      />

      <div ref="contentEl" class="oa-pkg__content">
        <!-- 角色 -->
        <template v-if="activeSection === SECTION_CHARACTERS && activeContent?.supported">
          <OAPackageCharacters
            :groups="schoolGroups"
            :total-count="characters.length"
            :bound-count="boundCount"
            :keyword="keyword"
            :highlighted-school="highlightedSchool"
            :focus="schoolFocus"
            @open="openCharacter"
            @opened="handleSchoolOpened"
          />
        </template>

        <!-- 骨骼：列式列出全部立绘目录，点开看文件，右侧可预览 -->
        <OAPackageSkeletons
          v-else-if="activeSection === SECTION_SKELETONS && activeContent?.supported"
          :skeletons="skeletons"
          :loading="skeletonsLoading"
          :error="skeletonsError"
          :keyword="skeletonKeyword"
          @preview="previewSkeleton"
        />

        <!-- 背景音乐 -->
        <OAPackageMusic
          v-else-if="activeSection === SECTION_MUSIC && activeContent?.supported"
          :music="music"
          :loading="musicLoading"
          :error="musicError"
          :keyword="musicKeyword"
        />

        <!-- 音效：类别走左侧子条目，右侧只列当前类别 -->
        <OAPackageSounds
          v-else-if="activeSection === SECTION_SOUNDS && activeContent?.supported"
          :sounds="sounds"
          :categories="soundCategories"
          :loading="soundsLoading"
          :error="soundsError"
          :keyword="soundKeyword"
          :active-category="activeSoundCategory"
        />

        <!-- 背景：分类走左侧子条目，右侧按分类展示缩略图 -->
        <OAPackageBackgrounds
          v-else-if="activeSection === SECTION_BACKGROUNDS && activeContent?.supported"
          :backgrounds="backgrounds"
          :loading="backgroundsLoading"
          :error="backgroundsError"
          :keyword="backgroundKeyword"
          :active-category="activeBackgroundCategory"
        />

        <!-- 表情：先选一个立绘做底座，再点右侧表情叠加播放 -->
        <OAPackageEmotions
          v-else-if="activeSection === SECTION_EMOTIONS && activeContent?.supported"
          :emotions="emotions"
          :loading="emotionsLoading"
          :error="emotionsError"
          :character="emotionCharacter"
          :character-label="emotionCharacterLabel"
          :character-loading="emotionCharacterLoading"
          :character-error="emotionCharacterError"
          @pick="pickEmotionCharacter"
        />

        <!-- 未声明该分类：统一提示 -->
        <div v-else-if="activeContent && !activeContent.supported" class="oa-pkg__placeholder">
          <span class="oa-pkg__placeholder-badge oa-pkg__placeholder-badge--off">未包含</span>
          <p class="oa-pkg__placeholder-title">{{ activeContent.label }}</p>
          <p class="oa-pkg__placeholder-text">此资源包没有该类资源。</p>
        </div>

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
    </Transition>

    <!-- 角色选择对话框：常驻挂载，由 openCharacterPicker() 唤起 -->
    <OACharacterPickerDialog />
  </main>
</template>


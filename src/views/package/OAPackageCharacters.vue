<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { rizui_card } from 'riz-ui';
import type { PackageCharacter } from '@/modules/PackageProvider/usePackageContent';

/** 学院分组的形状由页面算好传进来（侧边栏子条目也要用同一份分组） */
interface SchoolGroup {
  school: string;
  list: PackageCharacter[];
}

const props = defineProps<{
  groups: SchoolGroup[];
  totalCount: number;
  boundCount: number;
  keyword: string;
  highlightedSchool: string;
  /** 页面点名要展开的学院（token 变化即触发一次，便于重复点击同一个学院） */
  focus?: { school: string; token: number } | null;
}>();

const emit = defineEmits<{
  open: [character: PackageCharacter];
  /** 已展开并挂载内容，页面可以开始定位了 */
  opened: [school: string];
}>();

/**
 * 学院分组的展开状态：
 * - `expanded` 当前展开的组
 * - `mounted` 曾经展开过的组（内容懒挂载，收起后保留 DOM 以便下次动画）
 * 搜索时强制全部展开，避免命中结果被藏在折叠里。
 */
const expandedSchools = ref(new Set<string>());
const mountedSchools = ref(new Set<string>());

const isSearching = computed(() => props.keyword.trim().length > 0);

function isOpen(school: string): boolean {
  return isSearching.value || expandedSchools.value.has(school);
}

function isMountedContent(school: string): boolean {
  return isSearching.value || mountedSchools.value.has(school);
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
  mountedSchools.value = new Set([...mountedSchools.value, ...props.groups.map((g) => g.school)]);
  expandedSchools.value = new Set(props.groups.map((group) => group.school));
}

function collapseAll() {
  expandedSchools.value = new Set();
}

/**
 * 页面（侧边栏学院子条目）点名要展开某个学院时由外部触发；
 * 从别的分类切过来时组件还没挂载，所以 immediate 也要跑一次。
 */
watch(
  () => props.focus?.token,
  () => {
    const school = props.focus?.school;
    if (!school) {
      return;
    }
    openSchool(school);
    emit('opened', school);
  },
  { immediate: true }
);
</script>

<template>
  <div class="oa-pkg__toolbar">
    <p class="oa-pkg__summary">
      <strong>{{ totalCount }}</strong> 个角色
      <span class="oa-pkg__dot" aria-hidden="true">·</span>
      {{ boundCount }} 个已绑定骨骼
      <span class="oa-pkg__dot" aria-hidden="true">·</span>
      {{ groups.length }} 个学院
    </p>
    <div class="oa-pkg__tools">
      <button type="button" class="oa-pkg__mini" @click="expandAll">全部展开</button>
      <button type="button" class="oa-pkg__mini" @click="collapseAll">全部收起</button>
    </div>
  </div>

  <div v-if="groups.length" class="oa-pkg__groups">
    <div
      v-for="group in groups"
      :key="group.school"
      class="oa-pkg__school"
      :class="{
        'is-open': isOpen(group.school),
        'is-highlight': highlightedSchool === group.school,
      }"
      :data-school="group.school"
      @click="handleGroupClick(group.school, $event)"
    >
      <rizui_card :title="group.school" :desc="`${group.list.length} 个角色`">
        <!-- 内容懒挂载：首次展开才渲染，收起靠 grid 0fr→1fr 过渡 -->
        <div class="oa-pkg__school__collapse" :class="{ 'is-open': isOpen(group.school) }">
          <div class="oa-pkg__school__collapse-inner">
            <div v-if="isMountedContent(group.school)" class="oa-pkg__grid">
              <button
                v-for="character in group.list"
                :key="character.name_id"
                type="button"
                class="oa-pkg__char"
                :class="{ 'is-unbound': !character.hasSkeleton }"
                :title="character.hasSkeleton ? '已绑定骨骼' : '未绑定骨骼'"
                @click="emit('open', character)"
              >
                <span class="oa-pkg__char__avatar">
                  <img
                    v-if="character.avatarUrl"
                    :src="character.avatarUrl"
                    :alt="character.name"
                    loading="lazy"
                  />
                  <span v-else class="oa-pkg__char__avatar-fallback">
                    {{ character.name.slice(0, 1) }}
                  </span>
                </span>

                <span class="oa-pkg__char__text">
                  <span class="oa-pkg__char__name">{{ character.name }}</span>
                  <span class="oa-pkg__char__club">{{ character.club || '无所属组织' }}</span>
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

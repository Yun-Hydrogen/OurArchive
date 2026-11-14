<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { rizui_infobox, rizui_progress } from 'riz-ui';
import { ROUTE_NAMES } from '@/modules/ViewsManager/routes';
import OAPageHeader from '@/modules/ViewsManager/OAPageHeader.vue';
import OACharacterDetail from './OACharacterDetail.vue';
import { SHELL_TIMING } from '@/modules/Shell/shellTiming';
import { useEnterAnimation } from '@/modules/ViewsManager/useEnterAnimation';
import { usePackageContent, type PackageCharacter } from '@/modules/PackageProvider/usePackageContent';

const route = useRoute();
const router = useRouter();

const packageId = computed(() => String(route.params.packageId ?? ''));
const nameId = computed(() => String(route.params.nameId ?? ''));

const { pkg, characters, loading, error, load } = usePackageContent(packageId.value);

const character = computed<PackageCharacter | null>(
  () => characters.value.find((item) => item.name_id === nameId.value) ?? null
);

/** 入场等角色数据到齐后再播，避免进度条消失后卡片硬切 */
const { isEntering } = useEnterAnimation(() => !loading.value, 900);
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

/** 页头副标题：学院 · 社团（社团为空时只留学院） */
const subtitle = computed(() => {
  const school = character.value?.school || '未知学院';
  const club = character.value?.club;
  return club ? `${school} · ${club}` : school;
});

const backLabel = computed(() => pkg.value?.name || packageId.value);

onMounted(() => {
  void load();
});

onBeforeUnmount(() => {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
});

function leaveTo(target: { name: string; params?: Record<string, string>; query?: Record<string, string> }) {
  if (isLeaving.value) {
    return;
  }
  isLeaving.value = true;
  leaveTimer = setTimeout(() => {
    leaveTimer = null;
    void router.push(target);
  }, SHELL_TIMING.cardsExitWait);
}

function backToPackage() {
  leaveTo({ name: ROUTE_NAMES.packageDetail, params: { packageId: packageId.value } });
}

/** 点骨骼直接进预览页，把资源包与立绘 id 一起传过去 */
function openSkeleton(skeletonId: string) {
  leaveTo({
    name: ROUTE_NAMES.skeletonPreview,
    query: { packageId: packageId.value, skeletonId, nameId: nameId.value },
  });
}
</script>

<template>
  <main
    class="oa-charview"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms` }"
  >
    <OAPageHeader
      class="oa-charview__head"
      :title="character?.name || nameId"
      :subtitle="subtitle"
      :back-label="backLabel"
      back-position="start"
      @back="backToPackage"
    />

    <Transition name="oa-swap" mode="out-in">
      <div v-if="loading" key="loading" class="oa-charview__state">
        <p class="oa-charview__state-text">正在读取角色信息…</p>
        <rizui_progress :indeterminate="true" :height="12" rounded />
      </div>

      <div v-else-if="error" key="error" class="oa-charview__notice">
        <rizui_infobox type="error" :text="`读取角色失败：${error}`" />
      </div>

      <div v-else-if="!character" key="missing" class="oa-charview__notice">
        <rizui_infobox
          type="warning"
          :text="`资源包里没有这个角色：${nameId}`"
        />
      </div>

      <OACharacterDetail
        v-else
        key="card"
        :character="character"
        @open-skeleton="openSkeleton"
      />
    </Transition>
  </main>
</template>

<style scoped>
.oa-charview {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.8vh, 20px);
  min-height: 100vh;
  padding: clamp(14px, 2.2vh, 24px) clamp(24px, 4.4vw, 84px) clamp(36px, 4.6vh, 52px);
  padding-top: clamp(56px, 8vh, 84px);
  color: var(--oa-dark-blue);
}

.oa-charview__head {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.oa-charview__state {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 18px 4px;
}

.oa-charview__state-text {
  font-size: 12.5px;
  color: #6f8ba4;
}

/* 错误 / 缺失提示：和加载态共用同一列，切换时淡入淡出 */
.oa-charview__notice {
  width: min(1120px, 100%);
  margin: 0 auto;
}

/* ---------- 卡片 ---------- */

/* 卡片本体在 OACharacterDetail.vue；这里只管整卡片的进退场动画 */

.oa-charview.is-entering .oa-charview__card,
.oa-charview__state {
  animation: oa-panel-in 620ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.oa-charview.is-leaving .oa-charview__card {
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
@media (prefers-reduced-motion: reduce) {
  .oa-charview.is-entering .oa-charview__card,
  .oa-charview.is-leaving .oa-charview__card,
  .oa-charview__state {
    animation: none;
  }
}
</style>

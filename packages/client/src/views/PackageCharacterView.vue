<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { rizui_infobox, rizui_progress } from 'riz-ui';
import { ROUTE_NAMES } from '@/config/routes';
import { SHELL_TIMING } from '@/config/transition';
import { usePackageContent, type PackageCharacter } from '@/composables/usePackageContent';

const route = useRoute();
const router = useRouter();

const packageId = computed(() => String(route.params.packageId ?? ''));
const nameId = computed(() => String(route.params.nameId ?? ''));

const { pkg, characters, loading, error, load } = usePackageContent(packageId.value);

const character = computed<PackageCharacter | null>(
  () => characters.value.find((item) => item.name_id === nameId.value) ?? null
);

const isEntering = ref(true);
let enterTimer: ReturnType<typeof setTimeout> | null = null;
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

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
    query: { package: packageId.value, skeleton: skeletonId, character: nameId.value },
  });
}
</script>

<template>
  <main
    class="oa-charview"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms` }"
  >
    <header class="oa-charview__head">
      <button type="button" class="oa-charview__back" @click="backToPackage">
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
        {{ pkg?.name || packageId }}
      </button>

      <div class="oa-charview__titles">
        <h1 class="oa-charview__title">{{ character?.name || nameId }}</h1>
        <p class="oa-charview__subtitle">
          {{ character?.school || '未知学院' }}
          <template v-if="character?.club">
            <span class="oa-charview__sep" aria-hidden="true">·</span>
            {{ character.club }}
          </template>
        </p>
      </div>
    </header>

    <div v-if="loading" class="oa-charview__state">
      <p class="oa-charview__state-text">正在读取角色信息…</p>
      <rizui_progress :indeterminate="true" :height="12" rounded />
    </div>

    <rizui_infobox v-else-if="error" type="error" :text="`读取角色失败：${error}`" />

    <rizui_infobox
      v-else-if="!character"
      type="warning"
      :text="`资源包里没有这个角色：${nameId}`"
    />

    <section v-else class="oa-charview__card">
      <div class="oa-charview__portrait">
        <div class="oa-charview__avatar">
          <img v-if="character.avatarUrl" :src="character.avatarUrl" :alt="character.name" />
          <span v-else class="oa-charview__avatar-fallback">{{ character.name.slice(0, 1) }}</span>
        </div>
        <p class="oa-charview__avatar-name">{{ character.name }}</p>
        <p v-if="character.club" class="oa-charview__avatar-club">{{ character.club }}</p>
      </div>

      <div class="oa-charview__info">
        <dl class="oa-charview__rows">
          <div class="oa-charview__row">
            <dt>学院</dt>
            <dd>{{ character.school || '—' }}</dd>
          </div>
          <div class="oa-charview__row">
            <dt>所属组织</dt>
            <dd>
              <template v-if="character.club">{{ character.club }}</template>
              <span v-else class="oa-charview__muted">无所属组织</span>
            </dd>
          </div>
          <div class="oa-charview__row">
            <dt>角色 ID</dt>
            <dd><code>{{ character.name_id }}</code></dd>
          </div>
          <div class="oa-charview__row">
            <dt>头像文件</dt>
            <dd>
              <template v-if="character.avatar"><code>{{ character.avatar }}</code></template>
              <span v-else class="oa-charview__muted">无</span>
            </dd>
          </div>
        </dl>

        <div class="oa-charview__bones">
          <div class="oa-charview__bones-head">
            <h2 class="oa-charview__label">绑定的骨骼</h2>
            <span class="oa-charview__count">{{ character.spines.length }} 条</span>
          </div>

          <div v-if="character.spines.length" class="oa-charview__bone-list">
            <button
              v-for="spine in character.spines"
              :key="spine.id"
              type="button"
              class="oa-bone"
              :class="{ 'is-missing': !spine.exists }"
              :disabled="!spine.exists"
              :title="spine.exists ? '打开骨骼预览' : '资源包里缺少这个立绘目录'"
              @click="openSkeleton(spine.id)"
            >
              <span class="oa-bone__id">{{ spine.id }}</span>
              <span class="oa-bone__tag">{{ spine.exists ? '预览' : '缺失' }}</span>
            </button>
          </div>

          <p v-else class="oa-charview__muted">这个角色没有绑定骨骼。</p>
        </div>
      </div>
    </section>
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(1120px, 100%);
  margin: 0 auto;
}

.oa-charview__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  max-width: 100%;
  padding: 5px 11px 5px 7px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
  font-family: inherit;
  font-size: 12.5px;
  color: #35628a;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-charview__back svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.oa-charview__back:hover {
  color: var(--oa-blue);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.16);
}

.oa-charview__titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.oa-charview__title {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #123a5c;
}

.oa-charview__subtitle {
  font-size: clamp(12px, 0.95vw, 13.5px);
  color: #6f8ba4;
}

.oa-charview__sep {
  margin: 0 5px;
  color: #b3c6d4;
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

/* ---------- 卡片 ---------- */

.oa-charview__card {
  display: flex;
  gap: clamp(16px, 2.2vw, 30px);
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: clamp(16px, 2vw, 26px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fcff 66%, #f1f9ff 100%);
  box-shadow:
    0 12px 26px rgba(36, 92, 138, 0.14),
    0 2px 5px rgba(36, 92, 138, 0.07),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

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

/* ---------- 立绘头像 ---------- */

.oa-charview__portrait {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: clamp(150px, 16vw, 200px);
}

.oa-charview__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(180deg, #eaf6ff 0%, #d6ecfc 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
}

.oa-charview__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.oa-charview__avatar-fallback {
  font-size: 48px;
  font-weight: 700;
  color: #7fa8c6;
}

.oa-charview__avatar-name {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #1e4b76;
  text-align: center;
}

.oa-charview__avatar-club {
  font-size: 11.5px;
  color: #8aa3b8;
  text-align: center;
}

/* ---------- 信息 ---------- */

.oa-charview__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: clamp(14px, 1.8vw, 22px);
  min-width: 0;
}

.oa-charview__rows {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.oa-charview__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(190, 214, 231, 0.65);
  font-size: 13px;
}

.oa-charview__row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.oa-charview__row dt {
  flex: 0 0 78px;
  font-size: 12px;
  color: #9ab0c2;
}

.oa-charview__row dd {
  min-width: 0;
  color: #1e4b76;
  overflow-wrap: anywhere;
}

.oa-charview__row code {
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(0, 144, 254, 0.08);
  font-size: 12px;
  color: #1769a8;
}

.oa-charview__muted {
  color: #a8bccb;
}

/* ---------- 骨骼 ---------- */

.oa-charview__bones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oa-charview__bones-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.oa-charview__label {
  font-size: 13px;
  font-weight: 700;
  color: #1e4b76;
}

.oa-charview__count {
  font-size: 11.5px;
  color: #9ab0c2;
}

.oa-charview__bone-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.oa-bone {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 12px;
  border: 1px solid rgba(0, 144, 254, 0.24);
  border-radius: 9px;
  background: rgba(0, 144, 254, 0.06);
  color: #1769a8;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.oa-bone:hover:not(:disabled) {
  border-color: rgba(0, 144, 254, 0.55);
  background: rgba(0, 144, 254, 0.12);
  transform: translateY(-1px);
}

.oa-bone:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
}

.oa-bone__id {
  font-size: 12.5px;
  letter-spacing: 0.01em;
}

.oa-bone__tag {
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.14);
  font-size: 10px;
  line-height: 1.7;
}

.oa-bone.is-missing {
  border-color: rgba(154, 176, 194, 0.4);
  background: rgba(154, 176, 194, 0.1);
  color: #97afc1;
  cursor: not-allowed;
}

.oa-bone.is-missing .oa-bone__tag {
  background: rgba(154, 176, 194, 0.2);
}

@media (max-width: 720px) {
  .oa-charview__card {
    flex-direction: column;
    align-items: center;
  }

  .oa-charview__info {
    width: 100%;
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

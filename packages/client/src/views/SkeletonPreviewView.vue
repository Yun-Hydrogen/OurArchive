<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { rizui_infobox, rizui_progress } from 'riz-ui';
import OASpineUploader from '@/components/tools/OASpineUploader.vue';
import OASpineViewer from '@/components/tools/OASpineViewer.vue';
import { ROUTE_NAMES } from '@/config/routes';
import {
  loadSpineCharacterFromPackage,
  type OASpineCharacter,
} from '@/composables/useSpinePackage';

const route = useRoute();
const router = useRouter();

/** 当前预览的立绘包；为空表示停在文件选择阶段 */
const character = ref<OASpineCharacter | null>(null);

/** 从资源包直接进入时，记录来源以便「返回」回到角色详情 */
const sourcePackageId = ref('');

const isAutoLoading = ref(false);
const autoLoadError = ref('');

function backToTools() {
  if (sourcePackageId.value) {
    void router.push({
      name: ROUTE_NAMES.packageCharacter,
      params: { packageId: sourcePackageId.value, nameId: String(route.query.character ?? '') },
    });
    return;
  }
  void router.push({ name: ROUTE_NAMES.tools });
}

function handlePick(next: OASpineCharacter) {
  character.value = next;
}

function handleChange() {
  character.value = null;
  sourcePackageId.value = '';
  void router.replace({ name: ROUTE_NAMES.skeletonPreview });
}

/** `?package=<id>&skeleton=<立绘 id>` → 直接从资源包加载 */
async function autoLoad() {
  const packageId = String(route.query.package ?? '').trim();
  const skeletonId = String(route.query.skeleton ?? '').trim();

  if (!packageId || !skeletonId) {
    return;
  }

  sourcePackageId.value = packageId;
  isAutoLoading.value = true;
  autoLoadError.value = '';

  try {
    character.value = await loadSpineCharacterFromPackage(packageId, skeletonId);
  } catch (error) {
    autoLoadError.value = error instanceof Error ? error.message : String(error);
    sourcePackageId.value = '';
  } finally {
    isAutoLoading.value = false;
  }
}

onMounted(() => {
  void autoLoad();
});
</script>

<template>
  <main class="oa-skeleton">
    <header class="oa-skeleton__head">
      <button type="button" class="oa-skeleton__back" @click="backToTools">
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
        {{ sourcePackageId ? '角色详情' : '工具' }}
      </button>

      <div class="oa-skeleton__titles">
        <h1 class="oa-skeleton__title">BA 立绘骨骼预览</h1>
        <p class="oa-skeleton__subtitle">
          载入解包得到的立绘包（骨骼 + 图集 + 贴图），预览立绘并切换差分
        </p>
      </div>
    </header>

    <section class="oa-skeleton__body">
      <div v-if="isAutoLoading" class="oa-skeleton__picker oa-skeleton__loading">
        <p class="oa-skeleton__loading-text">正在从资源包载入立绘…</p>
        <rizui_progress :indeterminate="true" :height="6" rounded theme="Light" />
      </div>

      <OASpineViewer
        v-else-if="character"
        :key="`${character.id}-${character.skeleton.name}`"
        :character="character"
        @back="backToTools"
        @change="handleChange"
      />

      <div v-else class="oa-skeleton__picker">
        <rizui_infobox
          v-if="autoLoadError"
          class="oa-skeleton__error"
          type="error"
          :text="`自动载入失败：${autoLoadError}`"
          theme="Light"
        />
        <OASpineUploader @pick="handlePick" />
      </div>
    </section>
  </main>
</template>

<style scoped>
/*
 * 页面本身透明：底色、气泡、banner 都由 App 层常驻，跨路由不重建。
 */
.oa-skeleton {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.8vh, 20px);
  min-height: 100vh;
  padding: clamp(14px, 2.2vh, 24px) clamp(20px, 3.6vw, 60px) clamp(40px, 5vh, 56px);
  padding-top: clamp(56px, 8vh, 84px);
  color: var(--oa-dark-blue);
}

.oa-skeleton__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  animation: oa-panel-in 420ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

/* 从工具页过来时跟着做一次淡入上浮，避免整页硬切 */
.oa-skeleton__body > * {
  animation: oa-panel-in 520ms cubic-bezier(0.16, 1, 0.3, 1) 60ms backwards;
}

@keyframes oa-panel-in {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.oa-skeleton__back {
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

.oa-skeleton__back svg {
  width: 14px;
  height: 14px;
}

.oa-skeleton__back:hover {
  color: var(--oa-blue);
  box-shadow: 0 6px 16px rgba(36, 92, 138, 0.16);
}

.oa-skeleton__titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.oa-skeleton__title {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #123a5c;
}

.oa-skeleton__subtitle {
  font-size: clamp(12px, 0.95vw, 13.5px);
  line-height: 1.6;
  color: #6f8ba4;
}

.oa-skeleton__body {
  display: flex;
  flex: 1;
  justify-content: center;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  min-height: 0;
}

.oa-skeleton__picker {
  width: min(720px, 100%);
  padding: clamp(14px, 1.8vw, 22px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fcff 100%);
  box-shadow:
    0 12px 26px rgba(36, 92, 138, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.oa-skeleton__error {
  margin-bottom: 12px;
}

.oa-skeleton__loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: fit-content;
}

.oa-skeleton__loading-text {
  font-size: 12.5px;
  color: #6f8ba4;
}
</style>

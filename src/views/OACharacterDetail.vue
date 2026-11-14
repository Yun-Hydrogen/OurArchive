<script setup lang="ts">
import type { PackageCharacter } from '@/modules/PackageProvider/usePackageContent';

defineProps<{ character: PackageCharacter }>();

const emit = defineEmits<{ openSkeleton: [id: string] }>();
</script>

<template>
  <section class="oa-charview__card">
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
            class="oa-charview__bone"
            :class="{ 'is-missing': !spine.exists }"
            :disabled="!spine.exists"
            :title="spine.exists ? '打开骨骼预览' : '资源包里缺少这个立绘目录'"
            @click="emit('openSkeleton', spine.id)"
          >
            <span class="oa-charview__bone__id">{{ spine.id }}</span>
            <span class="oa-charview__bone__tag">{{ spine.exists ? '预览' : '缺失' }}</span>
          </button>
        </div>

        <p v-else class="oa-charview__muted">这个角色没有绑定骨骼。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
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

.oa-charview__bone {
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

.oa-charview__bone:hover:not(:disabled) {
  border-color: rgba(0, 144, 254, 0.55);
  background: rgba(0, 144, 254, 0.12);
  transform: translateY(-1px);
}

.oa-charview__bone:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
}

.oa-charview__bone__id {
  font-size: 12.5px;
  letter-spacing: 0.01em;
}

.oa-charview__bone__tag {
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.14);
  font-size: 10px;
  line-height: 1.7;
}

.oa-charview__bone.is-missing {
  border-color: rgba(154, 176, 194, 0.4);
  background: rgba(154, 176, 194, 0.1);
  color: #97afc1;
  cursor: not-allowed;
}

.oa-charview__bone.is-missing .oa-charview__bone__tag {
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
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { rizui_dialog, rizui_button, rizui_infobox } from 'riz-ui';
import type { ResourcePackage, PackageContent } from '@/modules/PackageProvider/useResourcePackages';
import { formatCount, formatDateTime } from '@/utils/format';

const props = defineProps<{
  visible: boolean;
  /** 当前查看的资源包；关闭后由父级置空 */
  pkg: ResourcePackage | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  /** 携带当前资源包，父级不必依赖「关闭后还在不在」的时序 */
  (e: 'open', pkg: ResourcePackage): void;
}>();

/** 已声明可用的内容分类（未声明的直接不展示） */
const activeContents = computed<PackageContent[]>(() => {
  return props.pkg?.contents.filter((item) => item.supported) ?? [];
});

/** 统计各类资源已探明的条目总数 */
const totalResourceCount = computed(() => {
  return activeContents.value.reduce((acc, curr) => acc + (curr.exists ? curr.count : 0), 0);
});

function handleShowChange(value: boolean) {
  emit('update:visible', value);
}

/** 从弹窗直接进入资源包管理页 */
function handleOpen() {
  if (!props.pkg) {
    return;
  }
  emit('open', props.pkg);
  emit('update:visible', false);
}
</script>

<template>
  <rizui_dialog
    :show="visible"
    title="资源包详细信息"
    width="620px"
    @update:show="handleShowChange"
  >
    <div v-if="pkg" class="oa-pkg-info">
      <header class="oa-pkg-info__head">
        <div class="oa-pkg-info__titles">
          <h3 class="oa-pkg-info__name" :title="pkg.name">{{ pkg.name }}</h3>
          <span class="oa-pkg-info__id">
            <span class="oa-pkg-info__id-prefix">DIR //</span> {{ pkg.id }}
          </span>
        </div>
        <div class="oa-pkg-info__tags">
          <span v-if="pkg.version" class="oa-pkg-info__tag">v{{ pkg.version }}</span>
          <span
            class="oa-pkg-info__tag"
            :class="pkg.valid ? 'is-ok' : 'is-warn'"
          >
            {{ pkg.valid ? '结构就绪' : '解析异常' }}
          </span>
        </div>
      </header>

      <p class="oa-pkg-info__desc">
        {{ pkg.description || '这个资源包还没有填写描述。' }}
      </p>

      <dl class="oa-pkg-info__meta">
        <div class="oa-pkg-info__meta-item">
          <dt>作者</dt>
          <dd>{{ pkg.author || '未署名' }}</dd>
        </div>
        <div class="oa-pkg-info__meta-item">
          <dt>更新时间</dt>
          <dd>{{ formatDateTime(pkg.updatedAt) }}</dd>
        </div>
        <div class="oa-pkg-info__meta-item">
          <dt>资源总数</dt>
          <dd>{{ formatCount(totalResourceCount) }} 项</dd>
        </div>
        <div class="oa-pkg-info__meta-item">
          <dt>内容分类</dt>
          <dd>{{ activeContents.length }} 类</dd>
        </div>
      </dl>

      <section class="oa-pkg-info__list" aria-label="资源分类明细">
        <div class="oa-pkg-info__list-head">
          <span>资源分类</span>
          <span>目录</span>
          <span>条目</span>
        </div>

        <ul v-if="activeContents.length" class="oa-pkg-info__rows">
          <li
            v-for="item in activeContents"
            :key="item.key"
            class="oa-pkg-info__row"
            :class="{ 'is-missing': !item.exists }"
          >
            <span class="oa-pkg-info__label">{{ item.label }}</span>
            <span class="oa-pkg-info__path">{{ item.path || item.key }}</span>
            <span class="oa-pkg-info__count">
              {{ item.exists ? `${formatCount(item.count)} 项` : '缺失' }}
            </span>
          </li>
        </ul>
        <p v-else class="oa-pkg-info__empty">未声明可用分类</p>
      </section>

      <rizui_infobox
        v-if="!pkg.valid"
        type="warn"
        :text="`package.yml 解析受阻：${pkg.error ?? '未知结构异常'}`"
      />
    </div>

    <template #footer>
      <rizui_button text="关闭" @click="handleShowChange(false)" />
      <rizui_button primary text="进入管理" @click="handleOpen" />
    </template>
  </rizui_dialog>
</template>

<style scoped>
.oa-pkg-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: min(68vh, 560px);
  overflow-y: auto;
  padding-right: 2px;
}

/* ---------- 名称与状态 ---------- */

.oa-pkg-info__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.oa-pkg-info__titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.oa-pkg-info__name {
  overflow-wrap: anywhere;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  color: #123a5c;
}

.oa-pkg-info__id {
  overflow: hidden;
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: #8aa3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-pkg-info__id-prefix {
  font-weight: 600;
  color: #a2bcd0;
}

.oa-pkg-info__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 0 0 auto;
}

.oa-pkg-info__tag {
  padding: 1px 8px;
  border: 1px solid rgba(0, 144, 254, 0.2);
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.09);
  font-size: 11px;
  font-weight: 600;
  color: #0b7ad6;
}

.oa-pkg-info__tag.is-ok {
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(16, 185, 129, 0.1);
  color: #0b8a63;
}

.oa-pkg-info__tag.is-warn {
  border-color: rgba(248, 190, 0, 0.35);
  background: rgba(248, 190, 0, 0.15);
  color: #a47500;
}

.oa-pkg-info__desc {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(240, 247, 253, 0.72);
  font-size: 12.5px;
  line-height: 1.65;
  color: #557591;
}

/* ---------- 元信息 ---------- */

.oa-pkg-info__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.oa-pkg-info__meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.oa-pkg-info__meta-item dt {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #8aa3b8;
}

.oa-pkg-info__meta-item dd {
  overflow: hidden;
  font-size: 12.5px;
  color: #2f5a7e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 分类明细 ---------- */

.oa-pkg-info__list {
  border: 1px solid rgba(210, 230, 246, 0.8);
  border-radius: 10px;
  overflow: hidden;
}

.oa-pkg-info__list-head,
.oa-pkg-info__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
}

.oa-pkg-info__list-head {
  border-bottom: 1px solid rgba(210, 230, 246, 0.8);
  background: #f4f9fd;
  font-size: 11px;
  font-weight: 600;
  color: #6f8ba4;
}

.oa-pkg-info__list-head span:last-child {
  text-align: right;
}

.oa-pkg-info__rows {
  list-style: none;
}

.oa-pkg-info__row {
  border-bottom: 1px solid rgba(230, 242, 252, 0.8);
  font-size: 12px;
  color: #385d7e;
}

.oa-pkg-info__row:last-child {
  border-bottom: 0;
}

.oa-pkg-info__label {
  font-weight: 600;
  color: #123a5c;
}

.oa-pkg-info__path {
  overflow: hidden;
  font-size: 11.5px;
  color: #7b9cb8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-pkg-info__count {
  justify-self: end;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: #0b7ad6;
}

.oa-pkg-info__row.is-missing .oa-pkg-info__count {
  background: rgba(248, 190, 0, 0.18);
  color: #8c6000;
}

.oa-pkg-info__empty {
  padding: 14px 12px;
  font-size: 12px;
  color: #8ea7bd;
}

@media (max-width: 620px) {
  .oa-pkg-info__meta {
    grid-template-columns: 1fr;
  }

  .oa-pkg-info__list-head,
  .oa-pkg-info__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  /* 窄窗口下省掉目录列，只留分类与条目数 */
  .oa-pkg-info__list-head span:nth-child(2),
  .oa-pkg-info__path {
    display: none;
  }
}
</style>

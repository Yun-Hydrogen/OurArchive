<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  rizui_card,
  rizui_cfgrow,
  rizui_button,
  rizui_text,
  rizui_dropdown,
  rizui_code,
  rizui_progress,
  rizui_circle_progress,
  rizui_infobox,
  rizui_switch,
  rizui_slider,
  rizui_dialog,
} from 'riz-ui';
import { ROUTE_NAMES } from '@/modules/ViewsManager/routes';
import OAPageHeader from '@/modules/ViewsManager/OAPageHeader.vue';
import OAPackageCard from './OAPackageCard.vue';
import OAPackageDetailDialog from './OAPackageDetailDialog.vue';
import { SHELL_TIMING } from '@/modules/Shell/shellTiming';
import { useEnterAnimation } from '@/modules/ViewsManager/useEnterAnimation';
import { useResourcePackages, type ResourcePackage } from '@/modules/PackageProvider/useResourcePackages';
import { formatDateTime } from '@/utils/format';

const router = useRouter();
const { packages, resourcesDir, loading, error, refresh } = useResourcePackages();

type TabId = 'packages' | 'projects' | 'saves' | 'plugins';
const activeTab = ref<TabId>('packages');

type CategoryFilter = 'all' | 'character' | 'skeleton' | 'music' | 'sound' | 'background' | 'emotion';
const activeFilter = ref<CategoryFilter>('all');

/** 一级选项卡：除资源包外都是占位分区 */
const TABS: { id: TabId; label: string; dev?: boolean }[] = [
  { id: 'packages', label: '资源包' },
  { id: 'projects', label: '剧本工程', dev: true },
  { id: 'saves', label: '游戏存档', dev: true },
  { id: 'plugins', label: '扩展插件', dev: true },
];

/** 资源包分类筛选胶囊 */
const FILTER_CHIPS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'character', label: '角色立绘' },
  { id: 'skeleton', label: '骨骼立绘' },
  { id: 'music', label: '背景音乐' },
  { id: 'sound', label: '音效音频' },
  { id: 'background', label: '场景背景' },
  { id: 'emotion', label: '表情' },
];

type ViewMode = 'grid' | 'list';
const viewMode = ref<ViewMode>('grid');

type SortOption = 'updated' | 'name' | 'count';
const sortBy = ref<SortOption>('updated');

const SORT_OPTIONS = [
  { value: 'updated', label: '最新更新' },
  { value: 'name', label: '名称 A-Z' },
  { value: 'count', label: '资源总数' },
];

const searchKeyword = ref('');
const copiedPath = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

async function copyResourcesPath() {
  if (!resourcesDir.value) return;
  try {
    await navigator.clipboard.writeText(resourcesDir.value);
    copiedPath.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedPath.value = false;
      copyTimer = null;
    }, 2000);
  } catch {}
}

/** 资源包各类统计数量 */
const filterCounts = computed<Record<CategoryFilter, number>>(() => {
  const pkgs = packages.value;
  return {
    all: pkgs.length,
    character: pkgs.filter((p) => p.contents.some((c) => c.key === 'hasCharacter' && c.supported && c.exists)).length,
    skeleton: pkgs.filter((p) => p.contents.some((c) => c.key === 'Skeletons' && c.supported && c.exists)).length,
    music: pkgs.filter((p) => p.contents.some((c) => c.key === 'BackgroundMusic' && c.supported && c.exists)).length,
    sound: pkgs.filter((p) => p.contents.some((c) => c.key === 'Sounds' && c.supported && c.exists)).length,
    background: pkgs.filter((p) => p.contents.some((c) => c.key === 'Backgrounds' && c.supported && c.exists)).length,
    emotion: pkgs.filter((p) => p.contents.some((c) => c.key === 'Emotions' && c.supported && c.exists)).length,
  };
});

/** 经过关键词过滤与排序后的资源包列表 */
const filteredPackages = computed<ResourcePackage[]>(() => {
  let list = [...packages.value];

  // 1. 关键词过滤
  const kw = searchKeyword.value.trim().toLowerCase();
  if (kw) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        p.id.toLowerCase().includes(kw) ||
        (p.author && p.author.toLowerCase().includes(kw)) ||
        (p.description && p.description.toLowerCase().includes(kw))
    );
  }

  // 2. 分类过滤
  if (activeFilter.value !== 'all') {
    switch (activeFilter.value) {
      case 'character':
        list = list.filter((p) => p.contents.some((c) => c.key === 'hasCharacter' && c.supported && c.exists));
        break;
      case 'skeleton':
        list = list.filter((p) => p.contents.some((c) => c.key === 'Skeletons' && c.supported && c.exists));
        break;
      case 'music':
        list = list.filter((p) => p.contents.some((c) => c.key === 'BackgroundMusic' && c.supported && c.exists));
        break;
      case 'sound':
        list = list.filter((p) => p.contents.some((c) => c.key === 'Sounds' && c.supported && c.exists));
        break;
      case 'background':
        list = list.filter((p) => p.contents.some((c) => c.key === 'Backgrounds' && c.supported && c.exists));
        break;
      case 'emotion':
        list = list.filter((p) => p.contents.some((c) => c.key === 'Emotions' && c.supported && c.exists));
        break;
    }
  }

  // 3. 排序
  list.sort((a, b) => {
    if (sortBy.value === 'updated') {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    }
    if (sortBy.value === 'name') {
      return a.name.localeCompare(b.name, 'zh-CN');
    }
    if (sortBy.value === 'count') {
      const countA = a.contents.reduce((sum, c) => sum + (c.supported && c.exists ? c.count : 0), 0);
      const countB = b.contents.reduce((sum, c) => sum + (c.supported && c.exists ? c.count : 0), 0);
      return countB - countA;
    }
    return 0;
  });

  return list;
});

/* ---------------- 交互弹窗（RizUI Dialog） ---------------- */

const showProjectDialog = ref(false);
const showCleanDialog = ref(false);

/** 「详细信息」弹窗当前展示的资源包；null 表示关闭 */
const detailPackage = ref<ResourcePackage | null>(null);

/* ---------------- 存档管理配置项（RizUI Switch / Slider） ---------------- */

const autoSaveEnabled = ref(true);
const saveHistoryLimit = ref(100);

/* ---------------- 动画与转场 ---------------- */

/** 入场：等列表读完再播卡片入场，进度条消失与卡片飞入衔接 */
const { isEntering } = useEnterAnimation(() => !loading.value, 1800);

/** 离场：卡片下坠回主界面，播完再切路由 */
const isLeaving = ref(false);
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

const cardDelay = (step: number) => `${30 + Math.min(step, 8) * 60}ms`;

onMounted(() => {
  void refresh();
});

onBeforeUnmount(() => {
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
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
</script>

<template>
  <main
    class="oa-res"
    :class="{ 'is-entering': isEntering, 'is-leaving': isLeaving }"
    :style="{ '--cards-exit': `${SHELL_TIMING.cardsExit}ms`, '--exit-y': '52px' }"
  >
    <!-- 统一资源管理器大视窗容器（File Explorer Master Window） -->
    <section class="oa-res__explorer">
      <!-- 1. 标题区：标题 / 搜索 / 刷新 / 返回，全部收在同一张卡片里 -->
      <header class="oa-res__hero">
        <OAPageHeader
          class="oa-res__head-inner"
          title="资源管理"
          subtitle="资源包 · 剧本工程 · 存档 · 插件，一处收纳"
          back-label="主界面"
          @back="backHome"
        >
          <template #actions>
            <div v-if="activeTab === 'packages'" class="oa-res__search">
              <rizui_text
                v-model="searchKeyword"
                type="text"
                placeholder="搜索资源包…"
              />
            </div>
            <rizui_button
              primary
              text="刷新"
              :disabled="loading"
              @click="refresh"
            />
          </template>
        </OAPageHeader>
      </header>

      <!-- 2. 一级选项卡：资源包 / 剧本工程 / 游戏存档 / 扩展插件 -->
      <nav class="oa-res__tabs" role="tablist" aria-label="资源分区">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          role="tab"
          class="oa-res__tab"
          :class="{ 'is-active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          <span class="oa-res__tab-label">{{ tab.label }}</span>
          <span v-if="tab.id === 'packages'" class="oa-res__tab-badge">{{ packages.length }}</span>
          <span v-else-if="tab.dev" class="oa-res__tab-dev">DEV</span>
        </button>
      </nav>

      <!-- 3. 分类筛选与视图工具（仅资源包分区） -->
      <div v-if="activeTab === 'packages'" class="oa-res__toolbar">
        <div class="oa-res__chips" role="group" aria-label="资源类型筛选">
          <button
            v-for="chip in FILTER_CHIPS"
            :key="chip.id"
            type="button"
            class="oa-res__chip"
            :class="{ 'is-active': activeFilter === chip.id }"
            :aria-pressed="activeFilter === chip.id"
            @click="activeFilter = chip.id"
          >
            <span>{{ chip.label }}</span>
            <span class="oa-res__chip-count">{{ filterCounts[chip.id] }}</span>
          </button>
        </div>

        <div class="oa-res__tools">
          <div class="oa-res__sort">
            <rizui_dropdown
              :model-value="sortBy"
              :options="SORT_OPTIONS"
              @update:model-value="(val) => (sortBy = String(val) as SortOption)"
            />
          </div>

          <div class="oa-res__view-switch">
            <button
              type="button"
              class="oa-res__view-btn"
              :class="{ 'is-active': viewMode === 'grid' }"
              title="平铺网格视图"
              @click="viewMode = 'grid'"
            >
              <svg viewBox="0 0 16 16" class="oa-res__view-icon">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              class="oa-res__view-btn"
              :class="{ 'is-active': viewMode === 'list' }"
              title="详细列表视图"
              @click="viewMode = 'list'"
            >
              <svg viewBox="0 0 16 16" class="oa-res__view-icon">
                <rect x="2" y="3" width="12" height="2" rx="0.5" fill="currentColor" />
                <rect x="2" y="7" width="12" height="2" rx="0.5" fill="currentColor" />
                <rect x="2" y="11" width="12" height="2" rx="0.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. 内容区：选项卡切换只做淡入淡出 -->
      <div class="oa-res__body">
        <Transition name="oa-res-tab-fade" mode="out-in">
          <!-- ========== A. 资源包视图 ========== -->
          <div v-if="activeTab === 'packages'" key="packages" class="oa-res__panel">
            <Transition name="oa-swap" mode="out-in">
                <!-- 加载中 -->
                <div v-if="loading" key="loading" class="oa-res__state-box">
                  <rizui_circle_progress :indeterminate="true" :size="56" status="info" />
                  <p class="oa-res__state-title">正在扫描本地资源包…</p>
                  <div class="oa-res__progress-wrap">
                    <rizui_progress :indeterminate="true" :height="6" rounded />
                  </div>
                </div>

                <!-- 异常 -->
                <div v-else-if="error" key="error" class="oa-res__state-box">
                  <rizui_infobox type="error" :text="`扫描资源包失败：${error}`" />
                  <div class="oa-res__state-action">
                    <rizui_button primary text="重试" @click="refresh" />
                  </div>
                </div>

                <!-- 空目录 -->
                <div v-else-if="!packages.length" key="empty" class="oa-res__state-box">
                  <rizui_infobox
                    type="info"
                    text="本地存储目录下未找到带 package.yml 的资源包。请放入后刷新："
                  />
                  <div class="oa-res__code-box">
                    <rizui_code :code="resourcesDir || 'OurArchive/res'" />
                  </div>
                  <div class="oa-res__state-action">
                    <rizui_button primary text="重新扫描" @click="refresh" />
                  </div>
                </div>

                <!-- 搜索无结果 -->
                <div v-else-if="!filteredPackages.length" key="no-results" class="oa-res__state-box">
                  <rizui_infobox
                    type="warn"
                    :text="`未找到与「${searchKeyword}」匹配的资源包。`"
                  />
                  <div class="oa-res__state-action">
                    <rizui_button primary text="重置搜索词" @click="searchKeyword = ''" />
                  </div>
                </div>

                <!-- 视图 1：平铺网格模式 (Grid) -->
                <div v-else-if="viewMode === 'grid'" key="grid" class="oa-res__grid">
                  <article
                    v-for="(pkg, index) in filteredPackages"
                    :key="pkg.id"
                    class="oa-slot"
                    :style="{ '--enter-delay': cardDelay(index) }"
                  >
                    <OAPackageCard
                      :pkg="pkg"
                      @details="detailPackage = pkg"
                      @open="openPackage(pkg)"
                    />
                  </article>
                </div>

                <!-- 视图 2：详细列表模式 (List) -->
                <div v-else key="list" class="oa-res__list-table-wrap">
                  <table class="oa-res__list-table">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>目录 ID</th>
                        <th>版本</th>
                        <th>作者</th>
                        <th>更新时间</th>
                        <th>包含分类</th>
                        <th class="oa-res__th-action">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="pkg in filteredPackages"
                        :key="pkg.id"
                        class="oa-res__list-row"
                        @click="openPackage(pkg)"
                      >
                        <td class="oa-res__td-name">
                          <svg viewBox="0 0 16 16" class="oa-res__td-folder-icon" aria-hidden="true">
                            <path d="M2 4a1 1 0 0 1 1-1h3.5l1.5 1.5H13a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" fill="rgba(0, 144, 254, 0.2)" stroke="var(--oa-blue)" stroke-width="1.2" />
                          </svg>
                          <span class="oa-res__td-title">{{ pkg.name }}</span>
                        </td>
                        <td class="oa-res__td-id">{{ pkg.id }}</td>
                        <td>
                          <span v-if="pkg.version" class="oa-res__td-version">v{{ pkg.version }}</span>
                          <span v-else class="oa-res__td-empty">-</span>
                        </td>
                        <td>{{ pkg.author || '未署名' }}</td>
                        <td class="oa-res__td-date">{{ formatDateTime(pkg.updatedAt) }}</td>
                        <td>
                          <span class="oa-res__td-contents">
                            {{ pkg.contents.filter(c => c.supported && c.exists).map(c => c.label).join(' · ') || '无' }}
                          </span>
                        </td>
                        <td class="oa-res__td-action" @click.stop>
                          <rizui_button primary text="打开" @click="openPackage(pkg)" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Transition>
            </div>

            <!-- ========== B. 工程视图 ========== -->
            <div v-else-if="activeTab === 'projects'" key="projects" class="oa-res__panel oa-res__panel--narrow">
              <rizui_card
                title="剧本工程管理"
                desc="创作、导入与管理视觉小说剧本工程，编排分支树与角色演出"
              >
                <rizui_cfgrow label="工程项目目录" hint="本地剧本工程源码存储路径">
                  <rizui_code :code="`${resourcesDir.replace(/[\\/]res[\\/]?$/, '')}/projects`" />
                </rizui_cfgrow>

                <rizui_cfgrow label="新建工程" hint="创建包含标准对白节点与舞台编排的工程">
                  <rizui_button primary text="新建工程向导" @click="showProjectDialog = true" />
                </rizui_cfgrow>

                <rizui_cfgrow label="外部剧本导入" hint="支持导入 .txt / .ks / .json 等通用剧本格式">
                  <rizui_button text="导入剧本" disabled />
                </rizui_cfgrow>

                <rizui_infobox
                  type="info"
                  text="可视化剧本节点编辑器、分支选项树与演出时间轴编排引擎正在紧锣密鼓研发中，敬请期待！"
                />
              </rizui_card>
            </div>

            <!-- ========== C. 存档视图 ========== -->
            <div v-else-if="activeTab === 'saves'" key="saves" class="oa-res__panel oa-res__panel--narrow">
              <rizui_card
                title="阅读进度与存档槽位"
                desc="管理视觉小说多路线阅读进度、历史快照回溯与选项分支槽位"
              >
                <rizui_cfgrow label="自动快照记录" hint="在章节切换、关键剧情分支选择时自动记录快照节点">
                  <rizui_switch v-model="autoSaveEnabled" />
                </rizui_cfgrow>

                <rizui_cfgrow label="快照容量上限" :hint="`单剧本最大快照节点数：${saveHistoryLimit} 条`">
                  <rizui_slider
                    v-model="saveHistoryLimit"
                    :min="10"
                    :max="200"
                    :step="10"
                  />
                </rizui_cfgrow>

                <rizui_cfgrow label="存档槽位分配" hint="当前系统已分配存档位：0 / 99">
                  <div class="oa-res__progress-row">
                    <rizui_progress :value="0" :max="99" rounded :height="8" show-text />
                  </div>
                </rizui_cfgrow>

                <rizui_cfgrow label="清理临时快照" hint="重置本地阅读历史缓存与未加锁的临时对白记录">
                  <rizui_button danger text="清空临时缓存" @click="showCleanDialog = true" />
                </rizui_cfgrow>

                <rizui_infobox
                  type="info"
                  text="多存档槽位管理系统、分支回溯图谱与云端存档同步机制将在后续主干版本更新中正式上线。"
                />
              </rizui_card>
            </div>

            <!-- ========== D. 插件视图 ========== -->
            <div v-else-if="activeTab === 'plugins'" key="plugins" class="oa-res__panel oa-res__panel--narrow">
              <rizui_card
                title="运行时引擎与扩展插件"
                desc="管理 Spine、Live2D、舞台着色器与社区演出组件插件"
              >
                <rizui_cfgrow label="Spine 2D 骨骼运行时" hint="官方 Spine WebGL 4.2 引擎，驱动高精角色立绘与动作变换">
                  <rizui_button text="已激活 (v4.2)" disabled />
                </rizui_cfgrow>

                <rizui_cfgrow label="Live2D Cubism 运行时" hint="用于支持 Live2D 角色物理运算与实时注视互动插件">
                  <rizui_button text="待接入" disabled />
                </rizui_cfgrow>

                <rizui_cfgrow label="插件安装存储目录" hint="可将第三方自制演出插件放置于本地 plugins 目录">
                  <rizui_code :code="`${resourcesDir.replace(/[\\/]res[\\/]?$/, '')}/plugins`" />
                </rizui_cfgrow>

                <rizui_infobox
                  type="info"
                  text="社区插件市场、安全沙箱与动态着色器加载器正在持续集成中。"
                />
              </rizui_card>
            </div>
        </Transition>
      </div>

      <!-- 5. 底部状态栏：项目数 / 可复制的存储路径 / 扫描状态 -->
      <footer class="oa-res__status">
        <span class="oa-res__status-count">
          <template v-if="activeTab === 'packages'">
            <strong>{{ filteredPackages.length }}</strong> 个项目
          </template>
          <template v-else>功能开发中</template>
        </span>

        <button
          type="button"
          class="oa-res__path"
          :title="`点击复制存储路径：${resourcesDir}`"
          @click="copyResourcesPath"
        >
          <svg viewBox="0 0 16 16" class="oa-res__path-icon" aria-hidden="true">
            <path
              d="M2 4a1 1 0 0 1 1-1h3.5l1.5 1.5H13a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
            />
          </svg>
          <span class="oa-res__path-text">{{ resourcesDir || 'OurArchive/res' }}</span>
          <span class="oa-res__path-copy">{{ copiedPath ? '已复制' : '复制' }}</span>
        </button>

        <span class="oa-res__status-state">
          <span class="oa-res__status-dot" :class="{ 'is-busy': loading }" aria-hidden="true" />
          {{ loading ? '扫描中' : '就绪' }}
        </span>
      </footer>
    </section>

    <!-- 交互弹窗（RizUI Dialog） -->
    <rizui_dialog v-model:show="showProjectDialog" title="新建剧情工程向导">
      <div class="oa-res__dialog-content">
        <p>可视化剧情工程创建向导即将开放！</p>
        <p class="oa-res__dialog-hint">
          届时老师可以自定义工程标题、绑定初始角色卡带、设定舞台视口并开启所见即所得的分支编排。
        </p>
      </div>
      <template #footer>
        <rizui_button primary text="了解" @click="showProjectDialog = false" />
      </template>
    </rizui_dialog>

    <rizui_dialog v-model:show="showCleanDialog" title="清空临时阅读缓存">
      <div class="oa-res__dialog-content">
        <p>已重置本地阅读历史快照与未固化的临时对白记录。</p>
        <p class="oa-res__dialog-hint">
          已锁定的正规剧情存档不受影响，请放心体验。
        </p>
      </div>
      <template #footer>
        <rizui_button primary text="确定" @click="showCleanDialog = false" />
      </template>
    </rizui_dialog>

    <!-- 资源包「详细信息」弹窗 -->
    <OAPackageDetailDialog
      :visible="detailPackage !== null"
      :pkg="detailPackage"
      @update:visible="(value) => { if (!value) detailPackage = null; }"
      @open="openPackage"
    />
  </main>
</template>

<style scoped>

.oa-res {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 100vh;
  padding: clamp(12px, 1.8vh, 22px) clamp(16px, 2.4vw, 40px);
  color: var(--oa-dark-blue);
  /* 资源库沉浸页：设置按钮在右缘把手上，页头不再为右上角悬浮按钮让位 */
  --oa-page-head-reserve: 0px;
}

/* ---------- 大容器：整页只保留这一张卡片 ---------- */

.oa-res__explorer {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: min(1320px, 100%);
  height: clamp(540px, calc(96vh - 40px), 1400px);
  margin: 0 auto;
  padding: clamp(16px, 1.6vw, 26px) clamp(18px, 1.8vw, 28px) 0;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 22px;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(0, 144, 254, 0.07) 0%, rgba(255, 255, 255, 0) 58%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 55%, #f2f9ff 100%);
  box-shadow:
    0 24px 56px rgba(24, 76, 120, 0.16),
    0 2px 6px rgba(24, 76, 120, 0.05),
    inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  overflow: hidden;
}

/* 顶部一条极淡的主题光带，给整块白卡一点方向感 */
.oa-res__explorer::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(
    90deg,
    rgba(0, 144, 254, 0) 0%,
    rgba(0, 144, 254, 0.6) 26%,
    rgba(127, 208, 255, 0.6) 62%,
    rgba(0, 144, 254, 0) 100%
  );
  pointer-events: none;
}

.oa-res.is-entering .oa-res__explorer {
  animation: oa-panel-in 620ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.oa-res.is-leaving .oa-res__explorer {
  animation: oa-panel-out var(--cards-exit, 260ms) cubic-bezier(0.4, 0, 0.8, 0.24) forwards;
}

@keyframes oa-panel-in {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes oa-panel-out {
  to {
    opacity: 0;
    transform: translateY(32px) scale(0.985);
  }
}

/* ---------- 1. 标题区 ---------- */

.oa-res__hero {
  flex: 0 0 auto;
  padding-bottom: clamp(10px, 1.2vh, 16px);
}

.oa-res__head-inner {
  width: 100%;
}

.oa-res__head-inner :deep(.oa-page-head) {
  padding-right: var(--oa-page-head-reserve);
}

.oa-res__search {
  display: flex;
  align-items: center;
  width: clamp(170px, 18vw, 260px);
}

.oa-res__search :deep(.inpt-root) {
  flex: 1;
}

/* ---------- 2. 一级选项卡（胶囊分段器） ---------- */

.oa-res__tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  padding: 4px;
  margin-bottom: clamp(10px, 1.3vh, 16px);
  border: 1px solid rgba(0, 144, 254, 0.1);
  border-radius: 14px;
  background: rgba(0, 144, 254, 0.055);
  overflow-x: auto;
  scrollbar-width: none;
}

.oa-res__tabs::-webkit-scrollbar {
  display: none;
}

.oa-res__tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: #5d84a4;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.oa-res__tab:hover {
  color: #1769a8;
  background: rgba(255, 255, 255, 0.6);
}

.oa-res__tab:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
}

.oa-res__tab.is-active {
  color: #0b6fc4;
  background: #ffffff;
  box-shadow:
    0 4px 12px rgba(24, 76, 120, 0.12),
    inset 0 0 0 1px rgba(0, 144, 254, 0.16);
}

.oa-res__tab-badge {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.12);
  font-size: 11px;
  font-weight: 700;
  color: #0b7ad6;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.oa-res__tab.is-active .oa-res__tab-badge {
  background: var(--oa-blue);
  color: #ffffff;
}

.oa-res__tab-dev {
  padding: 1px 6px;
  border: 1px solid rgba(248, 190, 0, 0.4);
  border-radius: 999px;
  background: rgba(248, 190, 0, 0.16);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #a47500;
}

/* ---------- 3. 分类筛选与视图工具 ---------- */

.oa-res__toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding-bottom: clamp(10px, 1.2vh, 14px);
}

.oa-res__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.oa-res__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid rgba(163, 190, 210, 0.45);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  font-family: inherit;
  font-size: 12px;
  color: #557795;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.oa-res__chip:hover {
  border-color: rgba(0, 144, 254, 0.45);
  color: #1769a8;
}

.oa-res__chip:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
}

.oa-res__chip.is-active {
  border-color: transparent;
  background: linear-gradient(135deg, #0090fe 0%, #4bb6ff 100%);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(0, 144, 254, 0.28);
}

.oa-res__chip-count {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.72;
}

.oa-res__chip.is-active .oa-res__chip-count {
  opacity: 0.92;
}

.oa-res__tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.oa-res__sort {
  min-width: 118px;
}

.oa-res__view-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgba(198, 224, 246, 0.85);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
}

.oa-res__view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #6d8fa8;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.oa-res__view-btn:hover {
  background: rgba(0, 144, 254, 0.08);
  color: #123a5c;
}

.oa-res__view-btn.is-active {
  background: var(--oa-blue);
  color: #ffffff;
  box-shadow: 0 3px 10px rgba(0, 144, 254, 0.3);
}

.oa-res__view-icon {
  width: 13px;
  height: 13px;
}

/* ---------- 4. 内容区 ---------- */

.oa-res__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 2px 16px;
  scrollbar-gutter: stable;
}

.oa-res__panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.oa-res__panel--narrow {
  width: min(780px, 100%);
  padding-top: 4px;
}

.oa-res-tab-fade-enter-active,
.oa-res-tab-fade-leave-active {
  transition: opacity 160ms ease;
}

.oa-res-tab-fade-enter-from,
.oa-res-tab-fade-leave-to {
  opacity: 0;
}

/* ---------- 网格视图 ---------- */

.oa-res__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: clamp(12px, 1.4vw, 18px);
  align-content: start;
}

/* ---------- 卡槽动线 ---------- */

.oa-slot {
  display: flex;
  transform: translateZ(0);
  -webkit-font-smoothing: antialiased;
}

.oa-slot > .oa-pkg-card {
  flex: 1;
}

.oa-res.is-entering .oa-slot {
  animation: oa-card-in 620ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: var(--enter-delay, 0ms);
  will-change: transform, opacity;
}

@keyframes oa-card-in {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
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

/* ---------- 详细列表视图 ---------- */

.oa-res__list-table-wrap {
  width: 100%;
  border: 1px solid rgba(210, 230, 246, 0.85);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(24, 76, 120, 0.06);
  overflow-x: auto;
}

.oa-res__list-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  text-align: left;
}

.oa-res__list-table th {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(210, 230, 246, 0.8);
  background: #f4f9fd;
  font-weight: 600;
  color: #557795;
  white-space: nowrap;
}

.oa-res__th-action {
  text-align: right;
}

.oa-res__list-row {
  border-bottom: 1px solid rgba(230, 242, 252, 0.8);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.oa-res__list-row:last-child {
  border-bottom: 0;
}

.oa-res__list-row:hover {
  background: rgba(0, 144, 254, 0.06);
}

.oa-res__list-row td {
  padding: 10px 14px;
  color: #385d7e;
  vertical-align: middle;
}

.oa-res__td-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #123a5c;
  white-space: nowrap;
}

.oa-res__td-folder-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.oa-res__td-title {
  overflow: hidden;
  max-width: 240px;
  text-overflow: ellipsis;
}

.oa-res__td-id {
  font-family: monospace;
  font-size: 11.5px;
  color: #7b9cb8;
}

.oa-res__td-version {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: #0b7ad6;
}

.oa-res__td-empty {
  color: #b3c6d4;
}

.oa-res__td-date {
  color: #7b9cb8;
  white-space: nowrap;
}

.oa-res__td-contents {
  font-size: 11.5px;
  color: #5a7d99;
}

.oa-res__td-action {
  text-align: right;
}

/* ---------- 各种状态 ---------- */

.oa-res__state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 260px;
  padding: 32px 16px;
  text-align: center;
}

.oa-res__state-title {
  font-size: 14.5px;
  font-weight: 600;
  color: #123a5c;
}

.oa-res__progress-wrap {
  width: min(340px, 90%);
}

.oa-res__code-box {
  max-width: min(520px, 95%);
  margin: 4px 0;
}

.oa-res__state-action {
  margin-top: 6px;
}

.oa-res__progress-row {
  width: min(280px, 100%);
}

/* ---------- 5. 底部状态栏 ---------- */

.oa-res__status {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 calc(-1 * clamp(18px, 1.8vw, 28px));
  padding: 9px clamp(18px, 1.8vw, 28px);
  border-top: 1px solid rgba(210, 230, 246, 0.55);
  background: rgba(247, 251, 255, 0.72);
  font-size: 11.5px;
  color: #7191ab;
}

.oa-res__status-count strong {
  font-size: 13px;
  color: #123a5c;
}

.oa-res__path {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: min(520px, 60%);
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  color: #7b9cb8;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.oa-res__path:hover {
  border-color: rgba(0, 144, 254, 0.2);
  background: rgba(0, 144, 254, 0.07);
  color: #1769a8;
}

.oa-res__path:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 1px;
}

.oa-res__path-icon {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
  color: var(--oa-blue);
}

.oa-res__path-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-res__path-copy {
  flex: 0 0 auto;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 144, 254, 0.1);
  font-size: 10.5px;
  font-weight: 600;
  color: #0b7ad6;
}

.oa-res__status-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
}

.oa-res__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.oa-res__status-dot.is-busy {
  background: var(--oa-blue);
  box-shadow: 0 0 6px rgba(0, 144, 254, 0.6);
  animation: oa-res-pulse 1s ease-in-out infinite;
}

@keyframes oa-res-pulse {
  50% {
    opacity: 0.35;
  }
}

/* ---------- 弹窗内容 ---------- */

.oa-res__dialog-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #3e6280;
}

.oa-res__dialog-hint {
  font-size: 12.5px;
  color: #7b9cb8;
}

/* ---------- 响应式 ---------- */

@media (max-width: 1100px) {
  /* 窄窗口下大卡片会贴到右缘，给沉浸式设置把手留出 34px 让位 */
  .oa-res {
    padding-right: 34px;
  }
}

@media (max-width: 900px) {
  .oa-res__explorer {
    height: clamp(520px, calc(100vh - 32px), 1200px);
  }
}

@media (max-width: 720px) {
  .oa-res {
    padding: 10px 34px 10px 10px;
  }

  .oa-res__explorer {
    padding-inline: 14px;
    border-radius: 16px;
  }

  .oa-res__tab {
    padding: 7px 13px;
    font-size: 12.5px;
  }

  .oa-res__toolbar {
    align-items: stretch;
  }

  .oa-res__tools {
    justify-content: space-between;
  }

  .oa-res__status {
    flex-wrap: wrap;
    margin-inline: -14px;
    padding-inline: 14px;
  }

  .oa-res__path {
    max-width: 100%;
    order: 3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .oa-res.is-entering .oa-res__explorer,
  .oa-res.is-leaving .oa-res__explorer,
  .oa-res.is-entering .oa-slot,
  .oa-res.is-leaving .oa-slot,
  .oa-res__status-dot.is-busy {
    animation: none;
  }
}
</style>

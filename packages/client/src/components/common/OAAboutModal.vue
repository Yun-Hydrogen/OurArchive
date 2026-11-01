<script setup lang="ts">
import {
  rizui_dialog,
  rizui_button,
} from 'riz-ui';
import { HOME_ASSETS } from '@/config/assets';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}>();

function handleClose() {
  emit('update:visible', false);
  emit('close');
}
</script>

<template>
  <rizui_dialog
    :show="visible"
    title="贡献与感谢"
    icon="fa-solid fa-heart"
    width="540px"
    :mask-close="true"
    :closable="true"
    @update:show="emit('update:visible', $event)"
    @close="handleClose"
  >
    <div class="oa-about">
      <!-- 头部品牌横幅与标题 -->
      <div class="oa-about__header">
        <img
          class="oa-about__logo"
          :src="HOME_ASSETS.bannerTightUrl"
          alt="Our Archive Logo"
          draggable="false"
        />
        <div class="oa-about__meta">
          <div class="oa-about__title">Our Archive</div>
          <div class="oa-about__subtitle">Blue Archive等剧情向视觉小说游戏的剧情模拟器</div>
        </div>
      </div>

      <!-- 贡献与致谢列表 -->
      <div class="oa-contrib">
        <!-- BASpark 鼠标特效 -->
        <div class="oa-contrib-item">
          <div class="oa-contrib-item__top">
            <div class="oa-contrib-item__title">
              <i class="fa-solid fa-wand-magic-sparkles" />
              <span>BASpark 鼠标特效</span>
            </div>
            <span class="oa-tag oa-tag--license">MIT</span>
          </div>
          <p class="oa-contrib-item__desc">
            基于 HTML5/Canvas 深度复刻《蔚蓝档案》UI 风格动效的 Windows 鼠标特效工具。
          </p>
          <a
            class="oa-contrib-item__link"
            href="https://github.com/DoomVoss/BASpark"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="fa-brands fa-github" />
            <span>DoomVoss/BASpark</span>
            <i class="fa-solid fa-arrow-up-right-from-square oa-link-icon" />
          </a>
        </div>

        <!-- 基沃托斯古书馆 -->
        <div class="oa-contrib-item">
          <div class="oa-contrib-item__top">
            <div class="oa-contrib-item__title">
              <i class="fa-solid fa-book-bookmark" />
              <span>基沃托斯古书馆</span>
            </div>
            <span class="oa-tag oa-tag--wiki">Wiki</span>
          </div>
          <p class="oa-contrib-item__desc">
            《蔚蓝档案》剧情、设定、音频与视觉资料索引与内容参考。
          </p>
          <a
            class="oa-contrib-item__link"
            href="https://kivo.wiki"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="fa-solid fa-globe" />
            <span>https://kivo.wiki</span>
            <i class="fa-solid fa-arrow-up-right-from-square oa-link-icon" />
          </a>
        </div>


      </div>
    </div>

    <template #footer>
      <div class="oa-about__footer">
        <rizui_button primary text="确定" @click="handleClose" />
      </div>
    </template>
  </rizui_dialog>
</template>

<style scoped>
.oa-about {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-height: min(65vh, 480px);
  overflow-y: auto;
  padding: 4px 6px 4px 0;
  color: var(--oa-dark-blue);
}

.oa-about__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f8ff 0%, #e2f1fc 100%);
  border: 1px solid rgba(0, 144, 254, 0.15);
  flex-shrink: 0;
}

.oa-about__logo {
  width: 88px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 144, 254, 0.2));
}

.oa-about__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oa-about__title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0f3254;
}

.oa-about__subtitle {
  font-size: 12px;
  line-height: 1.45;
  color: #557b9e;
}

.oa-contrib {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oa-contrib-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(0, 144, 254, 0.16);
  box-shadow: 0 2px 6px rgba(0, 80, 160, 0.03);
}

.oa-contrib-item--subtle {
  background: rgba(240, 248, 255, 0.55);
  border-color: rgba(0, 144, 254, 0.1);
}

.oa-contrib-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.oa-contrib-item__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1a4267;
}

.oa-contrib-item__title i {
  color: #0090fe;
  font-size: 13px;
}

.oa-contrib-item__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: #55728d;
}

.oa-contrib-item__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin-top: 2px;
  padding: 3px 9px;
  border-radius: 6px;
  background: #f0f7fd;
  color: #0284c7;
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s, transform 0.2s;
}

.oa-contrib-item__link:hover {
  background: #e0f2fe;
  color: #0090fe;
  transform: translateY(-1px);
}

.oa-link-icon {
  font-size: 10px;
  opacity: 0.7;
}

.oa-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
}

.oa-tag--license {
  background: #e0f2fe;
  color: #0284c7;
  border: 1px solid #bae6fd;
}

.oa-tag--wiki {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.oa-tag--author {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.oa-about__footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>

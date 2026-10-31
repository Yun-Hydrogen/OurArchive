<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { rizui_button, rizui_infobox, rizui_progress } from 'riz-ui';
import {
  toSpineCharacters,
  toSpineFiles,
  toSpineFilesFromDrop,
  type OASpineCharacter,
  type OASpineFile,
} from '@/composables/useSpinePackage';

const emit = defineEmits<{
  (e: 'pick', character: OASpineCharacter): void;
}>();

const dirInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const characters = ref<OASpineCharacter[]>([]);
const reading = ref(false);
const dragging = ref(false);
const error = ref('');

onMounted(() => {
  // webkitdirectory 不是标准 DOM 属性，模板里直接写会让类型检查报未知属性
  dirInput.value?.setAttribute('webkitdirectory', '');
  dirInput.value?.setAttribute('directory', '');
});

function resetInput(input: HTMLInputElement | null) {
  if (input) {
    input.value = '';
  }
}

function applyEntries(entries: OASpineFile[]) {
  if (!entries.length) {
    error.value = '没有读到任何文件。';
    return;
  }
  const found = toSpineCharacters(entries);
  if (!found.length) {
    characters.value = [];
    error.value =
      '没有找到完整的立绘包。一个立绘包需要同一目录下同时包含 .skel（或 .json）、.atlas 与贴图（.png / .webp）。';
    return;
  }
  error.value = '';
  characters.value = found;
}

async function handlePicked(files: FileList | null, input: HTMLInputElement | null) {
  if (!files || !files.length) {
    return;
  }
  reading.value = true;
  try {
    applyEntries(toSpineFiles(files));
  } finally {
    reading.value = false;
    resetInput(input);
  }
}

async function handleDrop(event: DragEvent) {
  dragging.value = false;
  const transfer = event.dataTransfer;
  if (!transfer) {
    return;
  }
  reading.value = true;
  try {
    applyEntries(await toSpineFilesFromDrop(transfer));
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    reading.value = false;
  }
}

function handleDragOver() {
  dragging.value = true;
}

function handleDragLeave(event: DragEvent) {
  // 只在真正离开拖放区时收起高亮，避免子元素间移动时闪烁
  if (event.currentTarget === event.target) {
    dragging.value = false;
  }
}

function choose(character: OASpineCharacter) {
  emit('pick', character);
}

function clearAll() {
  characters.value = [];
  error.value = '';
}
</script>

<template>
  <div class="oa-upload">
    <div
      class="oa-upload__zone"
      :class="{ 'is-dragging': dragging, 'is-reading': reading }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="oa-upload__glyph" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path
            d="M10 16.5A3.5 3.5 0 0 1 13.5 13h6.2l3 3.6h11.8A3.5 3.5 0 0 1 38 20.1v13.4A3.5 3.5 0 0 1 34.5 37h-21A3.5 3.5 0 0 1 10 33.5z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path
            d="M24 22v10M20 26l4-4 4 4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <p class="oa-upload__title">把角色文件夹拖到这里</p>
      <p class="oa-upload__hint">
        一个立绘包需要同一目录下的 <code>.skel</code>（或 <code>.json</code>）、<code>.atlas</code>
        与贴图。<br />
        也可以直接拖入整个 <code>skeletons</code> 目录，会按子目录拆成多个角色。
      </p>

      <div class="oa-upload__actions">
        <rizui_button
          text="选择文件夹"
          l-icon="fa-solid fa-folder-open"
          primary
          theme="Light"
          @click="dirInput?.click()"
        />
        <rizui_button
          text="手动选择文件"
          l-icon="fa-solid fa-file-import"
          theme="Light"
          @click="fileInput?.click()"
        />
      </div>

      <div v-if="reading" class="oa-upload__reading">
        <rizui_progress :indeterminate="true" :height="5" rounded theme="Light" />
        <span>正在读取文件…</span>
      </div>

      <input
        ref="dirInput"
        class="oa-upload__input"
        type="file"
        multiple
        tabindex="-1"
        aria-hidden="true"
        @change="handlePicked(($event.target as HTMLInputElement).files, dirInput)"
      />
      <input
        ref="fileInput"
        class="oa-upload__input"
        type="file"
        multiple
        tabindex="-1"
        aria-hidden="true"
        accept=".skel,.json,.atlas,.png,.webp,.jpg,.jpeg"
        @change="handlePicked(($event.target as HTMLInputElement).files, fileInput)"
      />
    </div>

    <rizui_infobox
      v-if="error"
      type="warn"
      :text="error"
      icon="fa-solid fa-triangle-exclamation"
      theme="Light"
    />

    <section v-if="characters.length" class="oa-upload__result">
      <header class="oa-upload__result-head">
        <span>识别到 {{ characters.length }} 个立绘包</span>
        <button type="button" class="oa-upload__clear" @click="clearAll">清空</button>
      </header>

      <ul class="oa-upload__list">
        <li v-for="character in characters" :key="`${character.id}-${character.skeleton.name}`">
          <button type="button" class="oa-upload__item" @click="choose(character)">
            <span class="oa-upload__item-id">{{ character.id }}</span>
            <span class="oa-upload__item-meta">
              {{ character.skeleton.name }} · {{ character.atlas.name }} ·
              {{ character.textures.length }} 张贴图
            </span>
            <span class="oa-upload__item-go">预览</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.oa-upload {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.oa-upload__zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
  padding: clamp(26px, 4vh, 46px) clamp(18px, 3vw, 40px);
  border: 1.5px dashed rgba(0, 122, 204, 0.32);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  color: #1e4b76;
  text-align: center;
  transition:
    border-color 0.24s ease,
    background 0.24s ease,
    box-shadow 0.24s ease;
}

.oa-upload__zone.is-dragging {
  border-color: var(--oa-blue);
  background: rgba(232, 246, 255, 0.94);
  box-shadow: 0 0 0 4px rgba(0, 144, 254, 0.12);
}

.oa-upload__zone.is-reading {
  opacity: 0.72;
}

.oa-upload__glyph {
  color: var(--oa-blue);
  width: 48px;
  height: 48px;
}

.oa-upload__glyph svg {
  display: block;
  width: 100%;
  height: 100%;
}

.oa-upload__title {
  font-size: clamp(15px, 1.2vw, 18px);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.oa-upload__hint {
  max-width: 52em;
  font-size: 12.5px;
  line-height: 1.7;
  color: #61809c;
}

.oa-upload__hint code {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 144, 254, 0.09);
  font-family: inherit;
  font-size: 12px;
  color: #1666a8;
}

.oa-upload__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
}

.oa-upload__reading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: min(240px, 70%);
  font-size: 12px;
  color: #6f8ba4;
}

.oa-upload__input {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

/* ---------- 识别结果 ---------- */

.oa-upload__result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oa-upload__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #1e4b76;
}

.oa-upload__clear {
  border: none;
  background: none;
  font-family: inherit;
  font-size: 12px;
  color: #7d94a9;
  cursor: pointer;
}

.oa-upload__clear:hover {
  color: var(--oa-blue);
}

.oa-upload__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: min(42vh, 360px);
  overflow-y: auto;
  padding-right: 4px;
  list-style: none;
}

.oa-upload__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'id go'
    'meta go';
  align-items: center;
  gap: 2px 12px;
  width: 100%;
  padding: 9px 12px;
  border: 1px solid rgba(0, 122, 204, 0.14);
  border-radius: 9px;
  background: #ffffff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.oa-upload__item:hover {
  border-color: rgba(0, 144, 254, 0.5);
  box-shadow: 0 4px 12px rgba(36, 92, 138, 0.1);
  transform: translateY(-1px);
}

.oa-upload__item-id {
  grid-area: id;
  font-size: 13.5px;
  font-weight: 700;
  color: #14395b;
}

.oa-upload__item-meta {
  grid-area: meta;
  overflow: hidden;
  font-size: 11.5px;
  color: #7d94a9;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oa-upload__item-go {
  grid-area: go;
  font-size: 12px;
  font-weight: 600;
  color: var(--oa-blue);
}
</style>

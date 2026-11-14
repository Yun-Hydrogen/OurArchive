<script setup lang="ts">
import { watch } from 'vue';
import {
  rizui_dialog,
  rizui_card,
  rizui_cfgrow,
  rizui_slider,
  rizui_button,
  rizui_dropdown,
  rizui_infobox,
} from 'riz-ui';
import { useGlobalConfig } from '@/modules/ConfigProvider/useGlobalConfig';
import { SPINE_RENDERER_OPTIONS, type SpineRendererMode } from '@/modules/ConfigProvider/rendererMode';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}>();

const { config, setMainBgmVolume, setPreviewVolume, setSpineRenderer, fetchConfig } =
  useGlobalConfig();

const RENDERER_OPTIONS = SPINE_RENDERER_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

function handleRendererChange(value: string | number) {
  setSpineRenderer(String(value) as SpineRendererMode);
}

function handleClose() {
  emit('update:visible', false);
  emit('close');
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      void fetchConfig();
    }
  }
);
</script>

<template>
  <rizui_dialog
    :show="visible"
    title="设置"
    icon="fa-solid fa-gear"
    width="540px"
    :mask-close="true"
    :closable="true"
    @update:show="emit('update:visible', $event)"
    @close="handleClose"
  >
    <div class="oa-settings__content">
      <rizui_card title="背景音效" desc="调整主界面背景音乐及音效参数">
        <rizui_cfgrow label="主界面背景音乐音量" hint="范围 0 - 100">
          <rizui_slider
            :model-value="config.main_bgm_volume"
            :min="0"
            :max="100"
            :step="1"
            display="%"
            @update:model-value="setMainBgmVolume"
          />
        </rizui_cfgrow>

        <rizui_cfgrow label="预览音频 / 音效音量" hint="资源包试听与界面音效，范围 0 - 100">
          <rizui_slider
            :model-value="config.preview_volume"
            :min="0"
            :max="100"
            :step="1"
            display="%"
            @update:model-value="setPreviewVolume"
          />
        </rizui_cfgrow>
      </rizui_card>

      <rizui_card title="立绘渲染" desc="BA 立绘的骨骼渲染后端，切换后下次载入生效">
        <rizui_cfgrow
          label="立绘渲染器"
          hint="激进：仅 WebGL；稳定：优先 WebGL，不可用时回退 Canvas 2D；保守：仅 Canvas 2D"
          stack
        >
          <rizui_dropdown
            :model-value="config.spine_renderer"
            :options="RENDERER_OPTIONS"
            @update:model-value="handleRendererChange"
          />
        </rizui_cfgrow>

        <rizui_infobox
          type="info"
          text="阿罗娜、普拉娜这类高密度形变立绘在 Canvas 2D 下会明显掉帧，建议保持「稳定」或「激进」。"
        />
      </rizui_card>
    </div>

    <template #footer>
      <div class="oa-settings__footer">
        <rizui_button primary text="确定" @click="handleClose" />
      </div>
    </template>
  </rizui_dialog>
</template>

<style scoped>
.oa-settings__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 4px 0;
}

.oa-settings__footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>


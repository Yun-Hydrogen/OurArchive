<script setup lang="ts">
import { watch } from 'vue';
import {
  rizui_dialog,
  rizui_card,
  rizui_cfgrow,
  rizui_slider,
  rizui_button,
} from 'riz-ui';
import { useGlobalConfig } from '@/composables/useGlobalConfig';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}>();

const { config, setMainBgmVolume, fetchConfig } = useGlobalConfig();

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
    <div class="oa-settings-content">
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
      </rizui_card>
    </div>

    <template #footer>
      <div class="oa-settings-footer">
        <rizui_button primary text="确定" @click="handleClose" />
      </div>
    </template>
  </rizui_dialog>
</template>

<style scoped>
.oa-settings-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 4px 0;
}

.oa-settings-footer {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>


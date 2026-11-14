<script setup lang="ts">
import { ref } from 'vue';
import OASettingsModal from '@/components/common/OASettingsModal.vue';

const isOpen = ref(false);
</script>

<template>
  <button
    type="button"
    class="oa-settings-trigger"
    aria-label="设置"
    title="设置"
    @click="isOpen = true"
  >
    <svg
      class="oa-settings-trigger__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </button>

  <OASettingsModal v-model:visible="isOpen" />
</template>

<style scoped>
.oa-settings-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1.5px solid rgba(0, 144, 254, 0.22);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  color: var(--oa-dark-blue);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease;
  -webkit-tap-highlight-color: transparent;
}

.oa-settings-trigger:hover {
  border-color: var(--oa-blue);
  color: var(--oa-blue);
  box-shadow: 0 6px 20px rgba(0, 144, 254, 0.25);
  transform: translateY(-1px);
}

.oa-settings-trigger:active {
  transform: scale(0.95);
}

.oa-settings-trigger__icon {
  transition: transform 0.4s ease;
}

.oa-settings-trigger:hover .oa-settings-trigger__icon {
  transform: rotate(60deg);
}

.oa-settings-trigger:focus-visible {
  outline: 2px solid var(--oa-blue);
  outline-offset: 2px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';

interface Props {
  title: string;
  show: boolean;
  side?: 'left' | 'right';
  width?: number;
}

const props = withDefaults(defineProps<Props>(), {
  side: 'left',
  width: 380,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const panelStyle = computed(() => ({
  width: `${props.width}px`,
  [props.side]: '60px', // Position next to icon toolbar (60px wide)
}));

const transformValue = computed(() => {
  if (!props.show) {
    return props.side === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
  }
  return 'translateX(0)';
});
</script>

<template>
  <div 
    class="side-panel" 
    :class="{ show, [`side-${side}`]: true }"
    :style="{ ...panelStyle, transform: transformValue }"
  >
    <div class="panel-header">
      <h3 class="panel-title">{{ title }}</h3>
      <button 
        type="button" 
        class="close-btn" 
        @click="emit('close')"
        aria-label="Close panel"
      >
        <X :size="18" />
      </button>
    </div>
    <div class="panel-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.side-panel {
  position: fixed;
  top: 120px; /* Below topbar + toolbar */
  bottom: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.side-panel.side-left {
  border-right: 2px solid rgba(var(--v-theme-primary), 0.1);
  border-radius: 0 12px 0 0;
}

.side-panel.side-right {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.1);
  border-radius: 12px 0 0 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.98);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
  letter-spacing: -0.01em;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
}

/* Custom scrollbar */
.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}
</style>


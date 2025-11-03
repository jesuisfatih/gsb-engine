<script setup lang="ts">
import { computed, watch } from 'vue';
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

const panelStyle = computed(() => {
  // Calculate position based on show state
  const offset = props.show ? '60px' : `-${props.width}px`;
  
  return {
    width: `${props.width}px`,
    [props.side]: offset, // Show: next to toolbar (60px), Hide: off-screen
  };
});

// 🐛 DEBUG: Panel visibility
watch(() => props.show, (show) => {
  console.log(`[EditorSidePanel] "${props.title}" ${props.side}:`, show ? 'VISIBLE' : 'HIDDEN', panelStyle.value);
}, { immediate: true });
</script>

<template>
  <div 
    class="side-panel" 
    :class="{ show, [`side-${side}`]: true }"
    :style="panelStyle"
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
  top: 60px; /* Below topbar (EditorTopbar height) */
  bottom: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 150; /* Above toolbars (z-index: 50) and canvas */
  display: flex;
  flex-direction: column;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  pointer-events: auto; /* Ensure clickable */
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


<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';

interface ToolbarItem {
  id: string;
  icon: Component;
  label: string;
  badge?: string | number;
  disabled?: boolean;
}

interface Props {
  items: ToolbarItem[];
  activeItem?: string | null;
  side?: 'left' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
  activeItem: null,
  side: 'left',
});

const emit = defineEmits<{
  (e: 'select', itemId: string): void;
}>();

const isActive = (itemId: string) => props.activeItem === itemId;

function handleItemClick(item: ToolbarItem) {
  if (item.disabled) return;
  emit('select', item.id);
}
</script>

<template>
  <div class="icon-toolbar" :data-side="side">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="toolbar-item"
      :class="{ active: isActive(item.id), disabled: item.disabled }"
      :title="item.label"
      :aria-label="item.label"
      :aria-pressed="isActive(item.id)"
      @click="handleItemClick(item)"
    >
      <component :is="item.icon" :size="20" />
      <span v-if="item.badge" class="item-badge">{{ item.badge }}</span>
    </button>
  </div>
</template>

<style scoped>
/* ✅ RESPONSIVE: Icon toolbar (60px fixed width) */
.icon-toolbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  background: rgb(var(--v-theme-surface));
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  width: 60px;
  min-width: 60px; /* ✅ Prevent shrinking */
  max-width: 60px; /* ✅ Prevent growing */
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}

.icon-toolbar[data-side="right"] {
  border-right: none;
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.toolbar-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px; /* ✅ Fit within 60px container */
  height: 48px;
  min-width: 48px;
  max-width: 48px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-sizing: border-box;
}

.toolbar-item:hover:not(.disabled) {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
}

.toolbar-item.active {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 2px rgba(var(--v-theme-primary), 0.3);
}

.toolbar-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.item-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-on-error));
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Custom scrollbar */
.icon-toolbar::-webkit-scrollbar {
  width: 4px;
}

.icon-toolbar::-webkit-scrollbar-track {
  background: transparent;
}

.icon-toolbar::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 2px;
}

.icon-toolbar::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}
</style>


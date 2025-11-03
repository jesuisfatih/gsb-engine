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
/* ✅ RESPONSIVE: Icon toolbar (FILLS parent 100%, NO PADDING) */
.icon-toolbar {
  display: flex;
  flex-direction: column;
  align-items: center; /* ✅ Horizontal center */
  justify-content: flex-start; /* ✅ Top aligned */
  gap: 4px;
  padding: 0; /* ✅ NO PADDING - completely clean */
  margin: 0;
  background: transparent; /* ✅ Parent (left-pane) has background */
  border: none; /* ✅ Parent (left-pane) has borders */
  width: 100%; /* ✅ CRITICAL: Fill parent completely */
  height: 100%; /* ✅ CRITICAL: Fill parent completely */
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative;
}

.icon-toolbar[data-side="right"] {
  /* No special styling - parent handles borders */
}

.toolbar-item {
  position: relative;
  display: flex;
  align-items: center; /* ✅ Vertical center */
  justify-content: center; /* ✅ Horizontal center */
  width: 56px; /* ✅ Parent 60px, slight margin for comfort */
  height: 56px;
  min-width: 56px;
  max-width: 56px;
  margin: 0 auto; /* ✅ CRITICAL: Center in parent */
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-sizing: border-box;
  overflow: hidden; /* ✅ Clip any overflow */
}

/* ✅ CRITICAL: Center icon perfectly */
.toolbar-item > * {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ✅ Icon size: Optimal size (28px → 24px, %15 küçültüldü) */
.toolbar-item :deep(svg) {
  width: 24px !important;
  height: 24px !important;
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
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-on-error));
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  max-width: 24px; /* ✅ Badge de taşmasın */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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


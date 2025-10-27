<script setup lang="ts">
import { computed } from "vue";
import { useEditorStore } from "../store/editorStore";

const store = useEditorStore();
const layers = computed(() => [...store.items].reverse());
</script>

<template>
  <div class="section-body layers">
    <details class="group" open>
      <summary>Layer Stack</summary>
      <div class="group-body">
        <div v-for="it in layers" :key="it.id" class="layer-row" :class="{ sel: it.id === store.selectedId }">
          <button class="icon-btn" @click="store.toggleVisibility(it.id)" :title="it.visible ? 'Hide layer' : 'Show layer'">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                v-if="it.visible"
                d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                v-if="it.visible"
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                v-else
                d="M3 3l18 18M5 5.3C3.26 6.87 2 9 2 9s3.5 7 9 7c1.4 0 2.693-.32 3.868-.839M12 7a3 3 0 0 1 3 3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button class="icon-btn" @click="store.toggleLock(it.id)" :title="it.locked ? 'Unlock layer' : 'Lock layer'">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                v-if="it.locked"
                d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                v-if="it.locked"
                d="M10 15h4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                v-else
                d="M5 11h14v9H5zM8 11V8a4 4 0 0 1 7.33-2.153"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div class="name" @click="store.select(it.id)">{{ it.name }}</div>
          <button class="icon-btn" @click="store.bringForward(it.id)" title="Bring forward">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h10v10H7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M4 10H2V4h6v2H4v4zM20 14h2v6h-6v-2h4v-4z" fill="currentColor" />
            </svg>
          </button>
          <button class="icon-btn" @click="store.sendBackward(it.id)" title="Send backward">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h10v10H7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M4 6V4h6v2H6v2H4zM18 16v4h-4v-2h2v-2h2z" fill="currentColor" />
            </svg>
          </button>
          <button
            class="icon-btn danger"
            @click="store.updateItemPartial(it.id, {}); store.select(it.id); store.removeSelected()"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 7h12M10 11v6M14 11v6M9 7l1-2h4l1 2M8 7h8v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.section-body.layers {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
}

.group {
  border: 1px solid #e4e7f3;
  border-radius: 10px;
  overflow: hidden;
}

.group summary {
  padding: 8px 10px;
  font: 600 12px/1.2 system-ui;
  list-style: none;
  cursor: pointer;
  background: linear-gradient(90deg, rgba(17, 24, 39, 0.06), rgba(255, 255, 255, 0));
}

.group summary::-webkit-details-marker {
  display: none;
}

.group summary::after {
  content: "⌄";
  float: right;
  transition: transform 0.2s ease;
}

.group[open] summary::after {
  transform: rotate(180deg);
}

.group-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 6px 10px;
  max-height: 340px;
  overflow-y: auto;
}

.layer-row {
  display: grid;
  grid-template-columns: 28px 28px 1fr 28px 28px 28px;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.layer-row:hover {
  background: #f5f5f7;
}

.layer-row.sel {
  background: #eae6ff;
}

.name {
  flex: 1;
  font: 500 13px/1.2 system-ui;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
}

.icon-btn {
  border: none;
  background: #fff;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1f2937;
}

.icon-btn:hover {
  background: #f1f1f5;
}

.icon-btn:active {
  transform: translateY(1px);
}

.icon-btn.danger:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.icon-btn svg {
  width: 18px;
  height: 18px;
}
</style>



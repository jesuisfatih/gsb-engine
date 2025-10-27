<script setup lang="ts">
import { ref } from "vue";
import { useEditorStore } from "../store/editorStore";
import { FONT_LIBRARY } from "../constants/fonts";

const store = useEditorStore();
const fileEl = ref<HTMLInputElement | null>(null);
const fontOptions = FONT_LIBRARY;
const selectedFont = ref(fontOptions[0]?.value ?? "Inter, -apple-system, sans-serif");

function chooseFiles() {
  fileEl.value?.click();
}

function onFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files) store.addImageFiles(files);
  (e.target as HTMLInputElement).value = "";
}

function addTextWithFont() {
  store.addText(selectedFont.value);
}
</script>

<template>
  <div class="v-toolbar">
    <button class="tool-btn primary" title="Upload imagery" @click="chooseFiles">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="label">Upload</span>
    </button>
    <input
      ref="fileEl"
      type="file"
      accept="image/*"
      multiple
      style="display:none"
      @change="onFiles"
    />

    <div class="tool-group">
      <label class="tool-select" title="Font family">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h5m6 0h5M6 20l4-16h4l4 16M8 13h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <select v-model="selectedFont">
          <option v-for="font in fontOptions" :key="font.value" :value="font.value">{{ font.label }}</option>
        </select>
      </label>
      <button class="tool-btn" title="Add text" @click="addTextWithFont">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 20V6m12 14V6M4 6h16M9 6v10a3 3 0 0 0 6 0V6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="label">Text</span>
      </button>
      <button class="tool-btn" title="Rectangle" @click="store.addRect()">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.6" fill="none" />
        </svg>
        <span class="label">Rect</span>
      </button>
      <button class="tool-btn" title="Circle" @click="store.addCircle()">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" fill="none" />
        </svg>
        <span class="label">Circle</span>
      </button>
      <button class="tool-btn" title="Line" @click="store.addLine()">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19L19 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <span class="label">Line</span>
      </button>
    </div>

    <div class="tool-group">
      <label class="toggle" title="Toggle grid">
        <input type="checkbox" v-model="store.gridEnabled" />
        <span>Grid</span>
      </label>
      <label class="tool-select" title="Grid spacing (px)">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 4v16M14 4v16M4 10h16M4 14h16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input type="number" v-model.number="store.gridPx" />
      </label>
    </div>

    <div class="tool-group">
      <button class="tool-btn" title="Undo" @click="store.undo()">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 8H4v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 14h9a6 6 0 1 1 0 12h-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="label">Undo</span>
      </button>
      <button class="tool-btn" title="Redo" @click="store.redo()">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 8h4v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M20 14H11a6 6 0 1 0 0 12h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="label">Redo</span>
      </button>
      <button class="tool-btn" title="Auto arrange" @click="store.autoArrange()">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3h10v10H3zM15 3h6v6h-6zM3 15h6v6H3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M16 14l4 4-4 4M13 18h7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="label">Auto</span>
      </button>
    </div>

    <div class="tool-group">
      <button class="tool-btn" title="Export PNG" @click="store.exportAs('image/png')">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 21h16a1 1 0 0 0 1-1V8.5L15.5 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M9 15h1.8a2.2 2.2 0 0 0 0-4.4H9V15zm0-2.2h1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M13.2 10.6H15V15m-1.8-2.2H15M17 15v-1.4a1.6 1.6 0 0 1 3.2 0V15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="label">PNG</span>
      </button>
      <button class="tool-btn" title="Export JPG" @click="store.exportAs('image/jpeg')">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 21h16a1 1 0 0 0 1-1V8.5L15.5 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M9 15.6a2.6 2.6 0 0 0 5.2 0V9.4M9 12h5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M16.5 9.4h2.2a2.2 2.2 0 0 1 0 4.4h-1.1M17.6 13.8v1.2A2.2 2.2 0 0 1 15.4 17H14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="label">JPG</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.v-toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  padding: 16px 10px;
  background: #ffffff;
  border-right: 1px solid #e6e6ef;
  max-height: 100%;
  overflow-y: auto;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: none;
  background: #fff;
  cursor: pointer;
  padding: 8px 6px;
  border-radius: 8px;
  font-size: 11px;
  transition: background 0.2s ease, transform 0.1s ease;
  color: #1f2937;
}

.tool-btn:hover {
  background: #f3f4f6;
}

.tool-btn:active {
  transform: translateY(1px);
}

.icon {
  width: 26px;
  height: 26px;
  display: block;
  color: currentColor;
  flex-shrink: 0;
}
.tool-btn .icon {
  width: 26px;
  height: 26px;
}
.tool-btn.primary {
  background: linear-gradient(180deg, #111827, #1f2937);
  color: #fff;
}
.tool-btn.primary:hover {
  background: #0f172a;
  color: #fff;
}
.tool-btn.primary .icon {
  color: #fff;
}
.tool-btn.primary .label {
  color: rgba(255, 255, 255, 0.78);
}

.label {
  font-size: 11px;
  color: #4b5563;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-select {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 6px 8px;
  background: #fff;
}

.tool-select select,
.tool-select input[type="number"] {
  border: none;
  font-size: 12px;
  background: transparent;
  width: 100%;
}

.tool-select input[type="number"] {
  text-align: center;
}

.tool-select select:focus,
.tool-select input[type="number"]:focus {
  outline: none;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #374151;
}

.toggle input {
  accent-color: #111827;
}
</style>



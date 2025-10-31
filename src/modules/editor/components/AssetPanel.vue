<script setup lang="ts">
import { ref } from "vue";
import { GLTF_SAMPLES } from "../assets/gltfSamples";
import { PATTERN_LIBRARY } from "../assets/patternLibrary";
import { TABLER_ICONS } from "../assets/tablerIcons";
import { TOOL_ASSETS } from "../assets/toolingAssets";
import { useEditorStore } from "../store/editorStore";
import { Image, Layout, Box, Wrench } from "lucide-vue-next";

const store = useEditorStore();

const tabs = [
  { key: "icons", label: "Icons", icon: Layout },
  { key: "patterns", label: "Patterns", icon: Image },
  { key: "models", label: "Mockups", icon: Box },
  { key: "tools", label: "Workflow", icon: Wrench },
  { key: "external", label: "External", icon: Image },
] as const;

const activeTab = ref<(typeof tabs)[number]["key"]>(tabs[0].key);

// External sources
const externalSources = [
  { id: 'unsplash', name: 'Unsplash', icon: '🖼️', description: 'Free high-quality photos' },
  { id: 'pexels', name: 'Pexels', icon: '📸', description: 'Free stock photos & videos' },
  { id: 'url', name: 'URL Import', icon: '🌐', description: 'Import from any URL' },
  { id: 'gdrive', name: 'Google Drive', icon: '📁', description: 'Import from Drive' },
  { id: 'dropbox', name: 'Dropbox', icon: '☁️', description: 'Import from Dropbox' },
];

const activeExternalSource = ref('unsplash');
const externalSearchQuery = ref('');
const externalUrl = ref('');
const externalResults = ref<any[]>([]);

function addIcon(icon: (typeof TABLER_ICONS)[number]) {
  store.addIconPath(icon);
}

async function addPattern(pattern: (typeof PATTERN_LIBRARY)[number]) {
  await store.addRemoteImage({ url: pattern.dataUrl, name: pattern.name, maxWidthRatio: 0.7 });
}

async function addModel(model: (typeof GLTF_SAMPLES)[number]) {
  await store.addRemoteImage({ url: model.preview, name: model.name, maxWidthRatio: 0.55 });
}

async function addToolSticker(tool: (typeof TOOL_ASSETS)[number]) {
  await store.addRemoteImage({ url: tool.sticker, name: tool.name, maxWidthRatio: 0.5 });
  store.addNoteCard({ title: tool.name, body: tool.description });
}

function openLink(link: string) {
  window.open(link, "_blank", "noopener");
}

// External asset functions
async function searchExternal() {
  if (!externalSearchQuery.value.trim()) return;
  
  console.log('[External] Searching:', activeExternalSource.value, externalSearchQuery.value);
  
  // Simulate search results
  externalResults.value = [
    { id: 1, url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200', name: 'Abstract Design' },
    { id: 2, url: 'https://images.unsplash.com/photo-1618556450991-2f1af64e8191', thumb: 'https://images.unsplash.com/photo-1618556450991-2f1af64e8191?w=200', name: 'Colorful Pattern' },
    { id: 3, url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead', thumb: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200', name: 'Geometric Art' },
  ];
}

async function importFromUrl() {
  if (!externalUrl.value.trim()) return;
  
  try {
    await store.addRemoteImage({ 
      url: externalUrl.value, 
      name: 'Imported Image',
      maxWidthRatio: 0.7 
    });
    externalUrl.value = '';
    console.log('[External] URL imported successfully');
  } catch (error) {
    console.error('[External] Import failed:', error);
    alert('Failed to import image from URL');
  }
}

async function addExternalImage(image: any) {
  try {
    await store.addRemoteImage({ 
      url: image.url, 
      name: image.name,
      maxWidthRatio: 0.7 
    });
    console.log('[External] Added:', image.name);
  } catch (error) {
    console.error('[External] Add failed:', error);
  }
}

function connectGoogleDrive() {
  alert('Google Drive integration coming soon!\n\nFor now, use URL Import to add images.');
}

function connectDropbox() {
  alert('Dropbox integration coming soon!\n\nFor now, use URL Import to add images.');
}
</script>

<template>
  <div class="asset-panel">
    <label class="selector" for="asset-library-select">
      <span class="selector-label">
        <svg class="selector-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7.5 12 4l8 3.5v9l-8 3.5-8-3.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M4 11l8 3 8-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
        <span>Asset Library</span>
      </span>
      <div class="selector-field">
        <select id="asset-library-select" v-model="activeTab">
          <option v-for="tab in tabs" :key="tab.key" :value="tab.key">
            {{ tab.label }}
          </option>
        </select>
      </div>
    </label>

    <div class="content">
      <template v-if="activeTab === 'icons'">
        <div class="grid">
          <button
            v-for="icon in TABLER_ICONS"
            :key="icon.id"
            class="icon-card"
            @click="addIcon(icon)"
            :title="`Add ${icon.name}`"
          >
            <span class="icon-wrapper">
              <svg
                :viewBox="`0 0 ${icon.viewBox} ${icon.viewBox}`"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  :d="icon.path"
                  :fill="icon.stroke ? 'none' : '#0f172a'"
                  :stroke="icon.stroke"
                  :stroke-width="icon.strokeWidth || 0"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span>{{ icon.name }}</span>
            <small>Vuexy Icons</small>
          </button>
        </div>
      </template>

      <template v-else-if="activeTab === 'patterns'">
        <details class="subgroup" open>
          <summary>Surface Textures</summary>
          <div class="grid cards">
            <div v-for="pattern in PATTERN_LIBRARY" :key="pattern.id" class="card">
              <div class="thumb">
                <img :src="pattern.previewUrl" :alt="pattern.name" loading="lazy" />
              </div>
              <div class="card-body">
                <strong>{{ pattern.name }}</strong>
                <small>pattern-lab collection</small>
                <button @click="addPattern(pattern)">Add to stage</button>
              </div>
            </div>
          </div>
        </details>
      </template>

      <template v-else-if="activeTab === 'models'">
        <details class="subgroup" open>
          <summary>Mockup Overlays</summary>
          <div class="grid cards">
            <div v-for="model in GLTF_SAMPLES" :key="model.id" class="card">
              <div class="thumb">
                <img :src="model.preview" :alt="model.name" loading="lazy" />
              </div>
              <div class="card-body">
                <strong>{{ model.name }}</strong>
                <small>KhronosGroup / glTF Samples</small>
                <p>{{ model.description }}</p>
                <div class="actions">
                  <button @click="addModel(model)">Add preview</button>
                  <button class="ghost" @click="openLink(model.modelUrl)">Open GLTF</button>
                </div>
              </div>
            </div>
          </div>
        </details>
      </template>

      <template v-else-if="activeTab === 'tools'">
        <details class="subgroup" open>
          <summary>Workflow Stickers</summary>
          <div class="grid cards">
            <div v-for="tool in TOOL_ASSETS" :key="tool.id" class="card">
              <div class="thumb">
                <img :src="tool.preview" :alt="tool.name" loading="lazy" />
              </div>
              <div class="card-body">
                <strong>{{ tool.name }}</strong>
                <small>{{ tool.category }}</small>
                <p>{{ tool.description }}</p>
                <div class="actions">
                  <button @click="addToolSticker(tool)">Add sticker</button>
                  <button class="ghost" @click="openLink(tool.link)">Docs</button>
                </div>
              </div>
            </div>
          </div>
        </details>
      </template>

      <!-- EXTERNAL SOURCES TAB -->
      <template v-else-if="activeTab === 'external'">
        <div class="external-sources">
          <!-- Source Selector -->
          <div class="source-selector">
            <button 
              v-for="source in externalSources" 
              :key="source.id"
              :class="['source-btn', { active: activeExternalSource === source.id }]"
              @click="activeExternalSource = source.id"
            >
              <span class="source-icon">{{ source.icon }}</span>
              <div class="source-info">
                <div class="source-name">{{ source.name }}</div>
                <div class="source-desc">{{ source.description }}</div>
              </div>
            </button>
          </div>

          <!-- Unsplash/Pexels Search -->
          <div v-if="activeExternalSource === 'unsplash' || activeExternalSource === 'pexels'" class="search-section">
            <div class="search-input-group">
              <input 
                v-model="externalSearchQuery" 
                type="text" 
                placeholder="Search for images..."
                @keyup.enter="searchExternal"
              />
              <button @click="searchExternal" class="search-btn">Search</button>
            </div>
            
            <div v-if="externalResults.length > 0" class="external-gallery">
              <div 
                v-for="img in externalResults" 
                :key="img.id"
                class="external-item"
                @click="addExternalImage(img)"
              >
                <img :src="img.thumb" :alt="img.name" />
                <div class="item-name">{{ img.name }}</div>
              </div>
            </div>
          </div>

          <!-- URL Import -->
          <div v-else-if="activeExternalSource === 'url'" class="url-import-section">
            <label>Paste Image URL</label>
            <div class="url-input-group">
              <input 
                v-model="externalUrl" 
                type="url" 
                placeholder="https://example.com/image.png"
                @keyup.enter="importFromUrl"
              />
              <button @click="importFromUrl" class="import-btn">Import</button>
            </div>
            <p class="hint">Paste a direct link to an image (PNG, JPG, GIF, WebP)</p>
          </div>

          <!-- Google Drive -->
          <div v-else-if="activeExternalSource === 'gdrive'" class="connect-section">
            <div class="connect-card">
              <span class="connect-icon">📁</span>
              <h3>Google Drive</h3>
              <p>Import images directly from your Google Drive</p>
              <button @click="connectGoogleDrive" class="connect-btn">Connect Google Drive</button>
            </div>
          </div>

          <!-- Dropbox -->
          <div v-else-if="activeExternalSource === 'dropbox'" class="connect-section">
            <div class="connect-card">
              <span class="connect-icon">☁️</span>
              <h3>Dropbox</h3>
              <p>Import images directly from your Dropbox</p>
              <button @click="connectDropbox" class="connect-btn">Connect Dropbox</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.asset-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
}

.selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding-block: 12px;
  padding-inline: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f8ff 100%);
  box-shadow: 0 16px 36px rgba(17, 24, 39, 0.08);
}

.selector-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  flex: 1 1 160px;
}

.selector-icon {
  width: 18px;
  height: 18px;
  color: var(--editor-accent, #4c1d95);
  flex-shrink: 0;
}

.selector-field {
  flex: 1 1 200px;
  position: relative;
  color: var(--editor-accent, #4c1d95);
  min-width: 0;
  width: 100%;
}

.selector select {
  appearance: none;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(79, 70, 229, 0.3);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #eef1ff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65), 0 14px 30px rgba(79, 70, 229, 0.12);
  padding-block: 10px;
  padding-inline: 16px;
  padding-right: 48px;
  color: #1f2937;
  font: 600 13px/1.25 var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-color: #fff;
  min-width: 0;
}

.selector-field::after {
  content: "";
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  pointer-events: none;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M6.293 9.293a1 1 0 0 1 1.414 0L12 13.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414Z'/%3E%3C/svg%3E") no-repeat center / contain;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='currentColor' d='M6.293 9.293a1 1 0 0 1 1.414 0L12 13.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414Z'/%3E%3C/svg%3E") no-repeat center / contain;
}

.selector select:focus {
  border-color: rgba(79, 70, 229, 0.75);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.18);
  outline: none;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subgroup {
  overflow: hidden;
  border: 1px solid rgba(190, 196, 222, 40%);
  border-radius: 14px;
  background: rgba(255, 255, 255, 95%);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 8%);
}

.subgroup summary {
  background: linear-gradient(90deg, rgba(59, 130, 246, 15%), rgba(255, 255, 255, 0%));
  color: #1f2937;
  cursor: pointer;
  font: 600 13px/1.3 var(--editor-font, "Public Sans", "Inter", system-ui, sans-serif);
  list-style: none;
  padding-block: 12px;
  padding-inline: 16px;
}

.subgroup summary::-webkit-details-marker {
  display: none;
}

.subgroup summary::after {
  content: "\25BC";
  float: inline-end;
  transition: transform 0.2s ease;
}

.subgroup[open] summary::after {
  transform: rotate(180deg);
}

.subgroup .grid {
  padding: 14px;
}

.grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.grid.cards {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.icon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(226, 232, 240, 80%);
  border-radius: 14px;
  background: linear-gradient(180deg, #fff 0%, #f9fbff 100%);
  cursor: pointer;
  gap: 8px;
  padding-block: 12px;
  padding-inline: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.icon-card:hover {
  box-shadow: 0 16px 30px rgba(59, 130, 246, 25%);
  transform: translateY(-4px);
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 15%), rgba(59, 130, 246, 5%));
  block-size: 44px;
  inline-size: 44px;
}

.icon-card svg {
  block-size: 28px;
  color: #1e293b;
  inline-size: 28px;
}

.icon-card span {
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
}

.icon-card small {
  color: #64748b;
  font-size: 10px;
}

.card {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid rgba(226, 232, 240, 90%);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 8%);
}

.thumb {
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: #f8fafc;
}

.thumb img {
  block-size: 100%;
  inline-size: 100%;
  object-fit: cover;
}

.card-body {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
}

.card-body strong {
  color: #0f172a;
  font-size: 13px;
}

.card-body small {
  color: #64748b;
  font-size: 11px;
}

.card-body p {
  color: #475569;
  font-size: 11px;
  line-height: 1.4;
}

.card-body button {
  border: 1px solid #111827;
  border-radius: 10px;
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  padding-block: 8px;
  padding-inline: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-body button:hover {
  box-shadow: 0 14px 24px rgba(17, 24, 39, 25%);
  transform: translateY(-2px);
}

.card-body button.ghost {
  border-color: rgba(148, 163, 184, 60%);
  background: #fff;
  color: #1f2937;
}

.actions {
  display: flex;
  gap: 10px;
}
</style>

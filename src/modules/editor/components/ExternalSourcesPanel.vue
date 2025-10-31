<template>
  <div class="external-panel">
    <!-- Source Buttons -->
    <div class="source-grid">
      <button 
        v-for="source in sources" 
        :key="source.id"
        :class="['source-card', { active: activeSource === source.id }]"
        @click="activeSource = source.id"
      >
        <span class="source-emoji">{{ source.icon }}</span>
        <span class="source-label">{{ source.name }}</span>
      </button>
    </div>

    <!-- URL Import (Default) -->
    <div v-if="activeSource === 'url'" class="import-section">
      <input 
        v-model="imageUrl" 
        type="url" 
        placeholder="Paste image URL..."
        class="url-input"
        @keyup.enter="importUrl"
      />
      <button @click="importUrl" class="import-btn">
        <Download :size="14" :stroke-width="2" />
        Import
      </button>
    </div>

    <!-- Unsplash/Pexels Search -->
    <div v-else-if="activeSource === 'unsplash' || activeSource === 'pexels'" class="search-section">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Search images..."
        class="search-input"
        @keyup.enter="search"
      />
      <button @click="search" class="search-btn">
        <Search :size="14" :stroke-width="2" />
      </button>
    </div>

    <!-- Cloud Connect -->
    <div v-else class="cloud-connect">
      <p class="connect-hint">{{ getConnectMessage() }}</p>
      <button @click="connect" class="connect-btn">
        Connect {{ sources.find(s => s.id === activeSource)?.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Download, Search } from 'lucide-vue-next';
import { useEditorStore } from '../store/editorStore';

const store = useEditorStore();

const sources = [
  { id: 'url', name: 'URL', icon: '🌐' },
  { id: 'unsplash', name: 'Unsplash', icon: '🖼️' },
  { id: 'pexels', name: 'Pexels', icon: '📸' },
  { id: 'gdrive', name: 'Drive', icon: '📁' },
  { id: 'dropbox', name: 'Dropbox', icon: '☁️' },
];

const activeSource = ref('url');
const imageUrl = ref('');
const searchQuery = ref('');

async function importUrl() {
  if (!imageUrl.value.trim()) return;
  
  try {
    await store.addRemoteImage({ 
      url: imageUrl.value, 
      name: 'Imported',
      maxWidthRatio: 0.7 
    });
    imageUrl.value = '';
    console.log('[External] URL imported');
  } catch (error) {
    console.error('[External] Import failed:', error);
    alert('Failed to import. Check URL and try again.');
  }
}

function search() {
  if (!searchQuery.value.trim()) return;
  console.log('[External] Searching:', activeSource.value, searchQuery.value);
  alert(`Searching ${activeSource.value} for "${searchQuery.value}"...\n\nAPI integration coming soon!`);
}

function connect() {
  const sourceName = sources.find(s => s.id === activeSource.value)?.name;
  alert(`${sourceName} OAuth integration coming soon!\n\nFor now, use URL Import.`);
}

function getConnectMessage() {
  const source = sources.find(s => s.id === activeSource.value);
  return `Connect your ${source?.name} account to import images`;
}
</script>

<style scoped>
.external-panel {
  padding: 12px;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.source-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border: 1.5px solid #e1e3e5;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.source-card:hover {
  border-color: #006fbb;
  background: #f6f6f7;
}

.source-card.active {
  border-color: #006fbb;
  background: #e3f1fb;
  border-width: 2px;
}

.source-emoji {
  font-size: 20px;
}

.source-label {
  font-size: 10px;
  font-weight: 600;
  color: #202223;
}

.import-section,
.search-section {
  display: flex;
  gap: 6px;
}

.url-input,
.search-input {
  flex: 1;
  padding: 8px 10px;
  border: 1.5px solid #c9cccf;
  border-radius: 6px;
  font-size: 13px;
}

.url-input:focus,
.search-input:focus {
  outline: none;
  border-color: #006fbb;
  box-shadow: 0 0 0 1px #006fbb;
}

.import-btn,
.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  background: #006fbb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.import-btn:hover,
.search-btn:hover {
  background: #005fa3;
}

.cloud-connect {
  text-align: center;
  padding: 16px 12px;
}

.connect-hint {
  font-size: 12px;
  color: #6d7175;
  margin-bottom: 12px;
}

.connect-btn {
  padding: 8px 16px;
  background: #006fbb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.connect-btn:hover {
  background: #005fa3;
}
</style>


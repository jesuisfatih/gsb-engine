<template>
  <!-- Shortcuts Overlay -->
  <Transition name="fade">
    <div v-if="show" class="shortcuts-overlay" @click.self="show = false">
      <div class="shortcuts-panel">
        <div class="panel-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button @click="show = false">×</button>
        </div>

        <div class="shortcuts-grid">
          <!-- Editing -->
          <div class="shortcut-section">
            <h3>✏️ Editing</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span>
              <span class="action">Undo</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>Y</kbd></span>
              <span class="action">Redo</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
              <span class="action">Save Design</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>C</kbd></span>
              <span class="action">Copy</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>V</kbd></span>
              <span class="action">Paste</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>D</kbd></span>
              <span class="action">Duplicate</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Delete</kbd></span>
              <span class="action">Delete Selected</span>
            </div>
          </div>

          <!-- Tools -->
          <div class="shortcut-section">
            <h3>🛠️ Tools</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>I</kbd></span>
              <span class="action">Add Image</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>T</kbd></span>
              <span class="action">Add Text</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>R</kbd></span>
              <span class="action">Add Rectangle</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>C</kbd></span>
              <span class="action">Add Circle</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>L</kbd></span>
              <span class="action">Add Line</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>G</kbd></span>
              <span class="action">Toggle Grid</span>
            </div>
          </div>

          <!-- View -->
          <div class="shortcut-section">
            <h3>👁️ View</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>+</kbd></span>
              <span class="action">Zoom In</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>-</kbd></span>
              <span class="action">Zoom Out</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>0</kbd></span>
              <span class="action">Zoom to Fit</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Space</kbd> + <kbd>Drag</kbd></span>
              <span class="action">Pan Canvas</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>F11</kbd></span>
              <span class="action">Fullscreen</span>
            </div>
          </div>

          <!-- Selection -->
          <div class="shortcut-section">
            <h3>🎯 Selection</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>A</kbd></span>
              <span class="action">Select All</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Esc</kbd></span>
              <span class="action">Deselect</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Shift</kbd> + <kbd>Click</kbd></span>
              <span class="action">Multi-Select</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Tab</kbd></span>
              <span class="action">Next Item</span>
            </div>
          </div>

          <!-- Alignment -->
          <div class="shortcut-section">
            <h3>📐 Alignment</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>Alt</kbd> + <kbd>←</kbd></span>
              <span class="action">Align Left</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Alt</kbd> + <kbd>→</kbd></span>
              <span class="action">Align Right</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Alt</kbd> + <kbd>↑</kbd></span>
              <span class="action">Align Top</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Alt</kbd> + <kbd>↓</kbd></span>
              <span class="action">Align Bottom</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Alt</kbd> + <kbd>H</kbd></span>
              <span class="action">Center Horizontal</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Alt</kbd> + <kbd>V</kbd></span>
              <span class="action">Center Vertical</span>
            </div>
          </div>

          <!-- AI Features -->
          <div class="shortcut-section">
            <h3>🤖 AI Features</h3>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd></span>
              <span class="action">AI Auto-Pack</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Q</kbd></span>
              <span class="action">Quality Analysis</span>
            </div>
            <div class="shortcut-item">
              <span class="keys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd></span>
              <span class="action">AI Design Assistant</span>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <p>Press <kbd>?</kbd> anytime to toggle this panel</p>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Command Palette -->
  <Transition name="fade">
    <div v-if="showCommandPalette" class="command-palette-overlay" @click.self="showCommandPalette = false">
      <div class="command-palette">
        <div class="palette-search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <input 
            v-model="commandSearch" 
            ref="commandInput"
            type="text" 
            placeholder="Type a command or search..."
            @keydown.down="navigateCommands(1)"
            @keydown.up="navigateCommands(-1)"
            @keydown.enter="executeCommand"
          />
        </div>

        <div class="command-list">
          <div 
            v-for="(cmd, idx) in filteredCommands" 
            :key="cmd.id"
            :class="['command-item', { active: idx === activeCommandIndex }]"
            @click="executeCommandById(cmd.id)"
          >
            <span class="cmd-icon">{{ cmd.icon }}</span>
            <div class="cmd-content">
              <div class="cmd-name">{{ cmd.name }}</div>
              <div class="cmd-desc">{{ cmd.description }}</div>
            </div>
            <span v-if="cmd.shortcut" class="cmd-shortcut">{{ cmd.shortcut }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

const show = ref(false);
const showCommandPalette = ref(false);
const commandSearch = ref('');
const activeCommandIndex = ref(0);
const commandInput = ref<HTMLInputElement | null>(null);

const commands = [
  { id: 'ai-pack', icon: '⚡', name: 'AI Auto-Pack', description: 'Optimize layout with AI', shortcut: 'Ctrl+Shift+A' },
  { id: 'quality', icon: '🔍', name: 'Quality Analysis', description: 'Analyze design quality', shortcut: 'Ctrl+Shift+Q' },
  { id: 'save', icon: '💾', name: 'Save Design', description: 'Save current design', shortcut: 'Ctrl+S' },
  { id: 'export', icon: '📥', name: 'Export', description: 'Export design as image', shortcut: 'Ctrl+E' },
  { id: 'undo', icon: '↶', name: 'Undo', description: 'Undo last action', shortcut: 'Ctrl+Z' },
  { id: 'redo', icon: '↷', name: 'Redo', description: 'Redo last action', shortcut: 'Ctrl+Y' },
  { id: 'grid', icon: '📐', name: 'Toggle Grid', description: 'Show/hide grid', shortcut: 'G' },
  { id: 'ai-assistant', icon: '🤖', name: 'AI Design Assistant', description: 'Open AI assistant', shortcut: 'Ctrl+Shift+D' },
  { id: 'batch', icon: '📦', name: 'Batch Operations', description: 'Multi-select and bulk edit', shortcut: 'B' },
  { id: 'chat', icon: '💬', name: 'Team Chat', description: 'Open collaboration chat', shortcut: 'Ctrl+Shift+C' },
];

const filteredCommands = computed(() => {
  if (!commandSearch.value) return commands;
  const search = commandSearch.value.toLowerCase();
  return commands.filter(cmd => 
    cmd.name.toLowerCase().includes(search) ||
    cmd.description.toLowerCase().includes(search)
  );
});

function handleKeyboard(e: KeyboardEvent) {
  // Show shortcuts overlay: ?
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    show.value = !show.value;
  }

  // Show command palette: Ctrl+K or Cmd+K
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    showCommandPalette.value = !showCommandPalette.value;
    if (showCommandPalette.value) {
      nextTick(() => commandInput.value?.focus());
    }
  }

  // Esc to close
  if (e.key === 'Escape') {
    show.value = false;
    showCommandPalette.value = false;
  }

  // AI Auto-Pack: Ctrl+Shift+A
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    executeCommandById('ai-pack');
  }

  // Quality Analysis: Ctrl+Shift+Q
  if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
    e.preventDefault();
    executeCommandById('quality');
  }

  // AI Design Assistant: Ctrl+Shift+D
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    executeCommandById('ai-assistant');
  }

  // Team Chat: Ctrl+Shift+C
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    executeCommandById('chat');
  }
}

function navigateCommands(direction: number) {
  activeCommandIndex.value = Math.max(
    0,
    Math.min(filteredCommands.value.length - 1, activeCommandIndex.value + direction)
  );
}

function executeCommand() {
  const cmd = filteredCommands.value[activeCommandIndex.value];
  if (cmd) {
    executeCommandById(cmd.id);
  }
}

function executeCommandById(id: string) {
  console.log('[Shortcuts] Executing command:', id);
  
  // Close palette
  showCommandPalette.value = false;
  commandSearch.value = '';
  activeCommandIndex.value = 0;
  
  // Dispatch event for command
  window.dispatchEvent(new CustomEvent('gsb-command', { detail: { command: id } }));
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyboard);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboard);
});
</script>

<style scoped>
.shortcuts-overlay,
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.shortcuts-panel {
  background: white;
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
}

.panel-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.panel-header button {
  width: 36px;
  height: 36px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
}

.shortcut-section h3 {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 6px;
  transition: background 0.2s;
}

.shortcut-item:hover {
  background: #f3f4f6;
}

.keys {
  display: flex;
  gap: 4px;
  font-size: 12px;
}

kbd {
  padding: 4px 8px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action {
  font-size: 13px;
  color: #6b7280;
}

.panel-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  text-align: center;
}

.panel-footer p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

/* Command Palette */
.command-palette {
  background: white;
  border-radius: 12px;
  width: 600px;
  max-width: 90vw;
  max-height: 500px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.palette-search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.palette-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #111827;
}

.command-list {
  overflow-y: auto;
  max-height: 400px;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.command-item:hover,
.command-item.active {
  background: #f3f4f6;
}

.cmd-icon {
  font-size: 20px;
}

.cmd-content {
  flex: 1;
}

.cmd-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.cmd-desc {
  font-size: 12px;
  color: #6b7280;
}

.cmd-shortcut {
  font-size: 11px;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile Responsive */
@media (max-width: 767px) {
  .shortcuts-grid {
    grid-template-columns: 1fr !important;
    padding: 16px !important;
  }

  .panel-header h2 {
    font-size: 18px !important;
  }

  .command-palette {
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
  }
}
</style>


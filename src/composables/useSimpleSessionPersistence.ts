/**
 * Simple Session Persistence
 * Saves design to localStorage for anonymous users
 * Automatically restores on page reload
 */

import { watch } from 'vue';
import { useEditorStore } from '@/modules/editor/store/editorStore';

const STORAGE_KEY = 'gsb_current_design';
const STORAGE_VERSION = 1;

interface StoredDesign {
  version: number;
  designId: string | null;
  productSlug: string;
  surfaceId: string;
  printTech: string;
  color: string | null;
  items: any[];
  sheetWpx: number;
  sheetHpx: number;
  savedAt: number;
}

export function useSimpleSessionPersistence() {
  const editorStore = useEditorStore();
  const sessionStore = useSessionStore();

  /**
   * Save current design to localStorage
   */
  function saveToLocalStorage() {
    try {
      const data: StoredDesign = {
        version: STORAGE_VERSION,
        designId: editorStore.designId,
        productSlug: editorStore.productSlug,
        surfaceId: editorStore.surfaceId,
        printTech: editorStore.printTech,
        color: editorStore.color,
        items: editorStore.items,
        sheetWpx: editorStore.sheetWpx,
        sheetHpx: editorStore.sheetHpx,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('[Session] Design saved to localStorage');
    } catch (error) {
      console.warn('[Session] Failed to save to localStorage:', error);
    }
  }

  /**
   * Restore design from localStorage
   */
  function restoreFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const data: StoredDesign = JSON.parse(stored);

      // Check version compatibility
      if (data.version !== STORAGE_VERSION) {
        console.warn('[Session] Storage version mismatch, skipping restore');
        return false;
      }

      // Check if data is recent (within 7 days)
      const ageMs = Date.now() - data.savedAt;
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (ageMs > maxAgeMs) {
        console.warn('[Session] Stored design too old, skipping restore');
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // Restore to editor store
      editorStore.designId = data.designId;
      editorStore.productSlug = data.productSlug;
      editorStore.surfaceId = data.surfaceId;
      editorStore.printTech = data.printTech;
      editorStore.color = data.color;
      editorStore.items = data.items;
      editorStore.sheetWpx = data.sheetWpx;
      editorStore.sheetHpx = data.sheetHpx;

      console.log('[Session] Design restored from localStorage');
      return true;
    } catch (error) {
      console.warn('[Session] Failed to restore from localStorage:', error);
      return false;
    }
  }

  /**
   * Clear localStorage (after successful cart add)
   */
  function clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Session] localStorage cleared');
  }

  /**
   * Setup auto-save watcher
   */
  function setupAutoSave() {
    // Watch for design changes
    watch(
      () => [
        editorStore.items,
        editorStore.productSlug,
        editorStore.surfaceId,
        editorStore.color,
      ],
      () => {
        // Debounce: save 2 seconds after last change
        clearTimeout((window as any).__gsbSaveTimeout);
        (window as any).__gsbSaveTimeout = setTimeout(() => {
          saveToLocalStorage();
        }, 2000);
      },
      { deep: true }
    );
  }

  return {
    saveToLocalStorage,
    restoreFromLocalStorage,
    clearLocalStorage,
    setupAutoSave,
  };
}


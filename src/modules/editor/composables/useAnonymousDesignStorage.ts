/**
 * Anonymous Design Storage
 * 
 * LocalStorage-based design persistence for non-authenticated users.
 * Allows customers to create designs without logging in and
 * preserves their work across sessions.
 */

import { ref, watch, onBeforeUnmount } from 'vue';
import type { LayerItem } from '../types';

export interface AnonymousDesignSnapshot {
  id: string;
  items: LayerItem[];
  productSlug: string;
  surfaceId: string;
  color: string;
  printTech: string;
  sheetWidthPx?: number;
  sheetHeightPx?: number;
  createdAt: string;
  updatedAt: string;
  previewUrl?: string;
}

const STORAGE_KEY = 'gsb:anonymous:design';
const DESIGN_ID_KEY = 'gsb:anonymous:designId';

/**
 * Generate a unique anonymous design ID
 */
function generateDesignId(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or create anonymous design ID
 */
export function getAnonymousDesignId(): string {
  if (typeof window === 'undefined') return generateDesignId();
  
  let designId = window.localStorage.getItem(DESIGN_ID_KEY);
  if (!designId) {
    designId = generateDesignId();
    window.localStorage.setItem(DESIGN_ID_KEY, designId);
  }
  return designId;
}

/**
 * Save anonymous design snapshot to localStorage
 */
export function saveAnonymousDesign(snapshot: Omit<AnonymousDesignSnapshot, 'id' | 'createdAt' | 'updatedAt'>): void {
  if (typeof window === 'undefined') return;

  const designId = getAnonymousDesignId();
  const existing = loadAnonymousDesign();
  
  const design: AnonymousDesignSnapshot = {
    ...snapshot,
    id: designId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
    console.log('[anonymous] Design saved to localStorage', designId);
  } catch (error) {
    console.warn('[anonymous] Failed to save design to localStorage', error);
  }
}

/**
 * Load anonymous design from localStorage
 */
export function loadAnonymousDesign(): AnonymousDesignSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    
    const design = JSON.parse(raw) as AnonymousDesignSnapshot;
    console.log('[anonymous] Design loaded from localStorage', design.id);
    return design;
  } catch (error) {
    console.warn('[anonymous] Failed to load design from localStorage', error);
    return null;
  }
}

/**
 * Clear anonymous design from localStorage
 */
export function clearAnonymousDesign(): void {
  if (typeof window === 'undefined') return;
  
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(DESIGN_ID_KEY);
  console.log('[anonymous] Design cleared from localStorage');
}

/**
 * Check if there's a saved anonymous design
 */
export function hasAnonymousDesign(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Composable for automatic anonymous design persistence
 */
export function useAnonymousDesignStorage(options: {
  getSnapshot: () => Omit<AnonymousDesignSnapshot, 'id' | 'createdAt' | 'updatedAt'>;
  enabled: () => boolean;
  debounceMs?: number;
  onSave?: (timestamp: string) => void;
  onError?: (error: unknown) => void;
}) {
  let saveTimer: number | null = null;
  const isSaving = ref(false);
  const lastSaved = ref<Date | null>(null);

  const scheduleSave = () => {
    if (!options.enabled()) return;
    
    if (saveTimer) window.clearTimeout(saveTimer);
    
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      performSave();
    }, options.debounceMs ?? 1500);
  };

  const performSave = () => {
    if (!options.enabled()) return;
    if (isSaving.value) return;

    isSaving.value = true;
    
    try {
      const snapshot = options.getSnapshot();
      saveAnonymousDesign(snapshot);
      const now = new Date();
      lastSaved.value = now;
      
      // Notify parent of successful save
      if (options.onSave) {
        options.onSave(now.toISOString());
      }
    } catch (error) {
      console.warn('[anonymous] Auto-save failed', error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      isSaving.value = false;
    }
  };

  const stopSaving = () => {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  onBeforeUnmount(() => {
    stopSaving();
  });

  return {
    scheduleSave,
    performSave,
    stopSaving,
    isSaving,
    lastSaved,
  };
}


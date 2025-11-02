/**
 * Parent Window Storage
 * For iframe environments where localStorage is restricted
 * Uses postMessage to communicate with parent window
 */

import { ref, watch, onMounted } from 'vue';

export interface DesignSnapshot {
  items: any[];
  productSlug: string;
  surfaceId: string;
  color: string;
  printTech: string;
  timestamp: string;
}

export function useParentStorage() {
  // Detect iframe immediately (synchronous)
  let inIframe = false;
  try {
    inIframe = typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    inIframe = true;
  }

  const isInIframe = ref(inIframe);
  const hasParentStorage = ref(inIframe);

  onMounted(() => {
    // Request saved design from parent
    if (isInIframe.value) {
      window.parent.postMessage({
        type: 'GSB_REQUEST_SAVED_DESIGN'
      }, '*');
      
      console.log('[parent-storage] Iframe detected, using parent window storage');
    }
  });

  /**
   * Save design to parent window
   */
  function saveToParent(snapshot: DesignSnapshot): void {
    if (!isInIframe.value) return;

    try {
      window.parent.postMessage({
        type: 'GSB_DESIGN_SAVE',
        snapshot
      }, '*');
      
      console.log('[parent-storage] Design sent to parent for saving');
    } catch (error) {
      console.error('[parent-storage] Failed to send to parent:', error);
    }
  }

  /**
   * Listen for restored design from parent
   */
  function onRestoreFromParent(callback: (snapshot: DesignSnapshot) => void): () => void {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'GSB_RESTORE_DESIGN' && event.data.snapshot) {
        console.log('[parent-storage] Design restored from parent');
        callback(event.data.snapshot);
      }
    };

    window.addEventListener('message', handler);

    // Return cleanup function
    return () => {
      window.removeEventListener('message', handler);
    };
  }

  return {
    isInIframe,
    hasParentStorage,
    saveToParent,
    onRestoreFromParent,
  };
}


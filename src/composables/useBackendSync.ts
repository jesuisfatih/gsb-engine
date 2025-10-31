/**
 * Backend Sync Composable
 * Automatic background sync to backend
 */

import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { saveDesignLocal, updateDesignLocal } from '@/services/designDB';
import { getAnonymousId, getSessionId } from '@/utils/anonymousId';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let syncInterval: NodeJS.Timeout | null = null;

export function useBackendSync(getSnapshot: () => any, enabled = true) {
  const route = useRoute();
  const isSyncing = ref(false);
  const lastSyncTime = ref<Date | null>(null);
  const syncError = ref<string | null>(null);

  /**
   * Sync current design to backend
   */
  async function syncToBackend(designId: string, snapshot: any, metadata?: any) {
    if (!enabled || isSyncing.value) return;

    isSyncing.value = true;
    syncError.value = null;

    try {
      const response = await axios.post(`${API_BASE}/designs/save`, {
        designId,
        anonymousId: getAnonymousId(),
        sessionId: getSessionId(),
        tenantId: route.query.t as string || '9ea467b0-edd2-4fdf-a306-3e2dee620d26',
        shopDomain: (route.query.shop as string) || 'we-dream-studio.myshopify.com',
        productGid: route.query.shopifyProduct as string,
        variantGid: route.query.shopifyVariant as string,
        productHandle: route.query.product as string,
        snapshot,
        metadata,
      }, {
        timeout: 10000, // 10 second timeout
      });

      if (response.data.success) {
        lastSyncTime.value = new Date();
        
        // Update local IndexedDB
        await updateDesignLocal(designId, {
          status: 'saved',
          syncedAt: Date.now(),
        });

        console.log('[Sync] Backend sync success:', designId);
      }
    } catch (error: any) {
      console.error('[Sync] Backend sync failed:', error);
      syncError.value = error.message || 'Sync failed';
      
      // Mark as error in local
      await updateDesignLocal(designId, {
        status: 'error',
      });
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Start background sync (every 30 seconds)
   */
  function startBackgroundSync(designId: string) {
    if (!enabled) return;

    // Initial sync
    const snapshot = getSnapshot();
    syncToBackend(designId, snapshot);

    // Periodic sync
    syncInterval = setInterval(() => {
      const currentSnapshot = getSnapshot();
      syncToBackend(designId, currentSnapshot);
    }, 30000); // Every 30 seconds

    console.log('[Sync] Background sync started');
  }

  /**
   * Stop background sync
   */
  function stopBackgroundSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('[Sync] Background sync stopped');
    }
  }

  // Cleanup on unmount
  onBeforeUnmount(() => {
    stopBackgroundSync();
  });

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    syncToBackend,
    startBackgroundSync,
    stopBackgroundSync,
  };
}


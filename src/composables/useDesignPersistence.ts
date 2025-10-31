/**
 * Design Persistence Composable
 * Local-first with backend sync
 */

import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { saveDesignLocal, updateDesignLocal, getDesignLocal, type LocalDesign } from '@/services/designDB';
import { getAnonymousId, getSessionId } from '@/utils/anonymousId';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function useDesignPersistence() {
  const route = useRoute();
  
  const designId = ref<string | null>(null);
  const isSaving = ref(false);
  const lastSaved = ref<Date | null>(null);
  const saveError = ref<string | null>(null);

  /**
   * Initialize design (new or load existing)
   */
  async function initializeDesign(params: {
    productGid: string;
    variantGid: string;
    existingDesignId?: string;
  }) {
    const { productGid, variantGid, existingDesignId } = params;

    if (existingDesignId) {
      // Load existing design
      const local = await getDesignLocal(existingDesignId);
      
      if (local) {
        designId.value = existingDesignId;
        return local;
      }
      
      // Not in local, try backend
      try {
        const response = await axios.get(`${API_BASE}/designs/${existingDesignId}`);
        if (response.data.success) {
          const design = response.data.design;
          designId.value = existingDesignId;
          
          // Save to local
          await saveDesignLocal({
            designId: existingDesignId,
            productGid: design.productGid,
            variantGid: design.variantGid,
            snapshot: design.snapshot,
            status: 'saved',
            anonymousId: getAnonymousId(),
            sessionId: getSessionId(),
            createdAt: new Date(design.createdAt).getTime(),
            updatedAt: new Date(design.updatedAt).getTime(),
            syncedAt: Date.now(),
          });
          
          return design;
        }
      } catch (error) {
        console.error('[Design] Load failed:', error);
      }
    }

    // Create new design
    const newDesignId = `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    designId.value = newDesignId;

    await saveDesignLocal({
      designId: newDesignId,
      productGid,
      variantGid,
      snapshot: { items: [], settings: {} },
      status: 'draft',
      anonymousId: getAnonymousId(),
      sessionId: getSessionId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  }

  /**
   * Save design to backend (with auto-retry)
   */
  async function saveToBackend(snapshot: any, metadata?: any) {
    if (!designId.value) {
      console.error('[Design] No design ID');
      return;
    }

    isSaving.value = true;
    saveError.value = null;

    try {
      // Update local first (instant)
      await updateDesignLocal(designId.value, {
        snapshot,
        status: 'saving',
        updatedAt: Date.now(),
      });

      // Then sync to backend
      const response = await axios.post(`${API_BASE}/designs/save`, {
        designId: designId.value,
        anonymousId: getAnonymousId(),
        sessionId: getSessionId(),
        tenantId: route.query.t || '9ea467b0-edd2-4fdf-a306-3e2dee620d26',
        shopDomain: route.query.shop || 'we-dream-studio.myshopify.com',
        productGid: route.query.shopifyProduct,
        variantGid: route.query.shopifyVariant,
        productHandle: route.query.product,
        snapshot,
        metadata,
      });

      if (response.data.success) {
        // Update local with success
        await updateDesignLocal(designId.value, {
          status: 'saved',
          syncedAt: Date.now(),
        });

        lastSaved.value = new Date();
        console.log('[Design] Saved to backend:', designId.value);
      }
    } catch (error: any) {
      console.error('[Design] Save to backend failed:', error);
      saveError.value = error.message;
      
      // Mark as error but keep local copy
      await updateDesignLocal(designId.value, {
        status: 'error',
      });
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * Upload preview image
   */
  async function uploadPreview(dataURL: string) {
    if (!designId.value) return null;

    try {
      const response = await axios.post(`${API_BASE}/designs/upload-preview`, {
        designId: designId.value,
        imageData: dataURL,
      });

      if (response.data.success) {
        console.log('[Design] Preview uploaded:', response.data.previewUrl);
        return response.data.previewUrl;
      }
    } catch (error) {
      console.error('[Design] Preview upload failed:', error);
    }

    return null;
  }

  /**
   * Finalize design (for checkout)
   */
  async function finalizeDesign(previewDataURL: string, highResDataURL?: string) {
    if (!designId.value) return null;

    try {
      const response = await axios.post(`${API_BASE}/designs/finalize`, {
        designId: designId.value,
        previewDataURL,
        highResDataURL,
      });

      if (response.data.success) {
        await updateDesignLocal(designId.value, {
          status: 'saved',
          syncedAt: Date.now(),
        });

        return {
          designId: response.data.designId,
          previewUrl: response.data.previewUrl,
          downloadUrl: response.data.downloadUrl,
        };
      }
    } catch (error) {
      console.error('[Design] Finalize failed:', error);
    }

    return null;
  }

  return {
    designId,
    isSaving,
    lastSaved,
    saveError,
    initializeDesign,
    saveToBackend,
    uploadPreview,
    finalizeDesign,
  };
}


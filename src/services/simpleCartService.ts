/**
 * Simple Cart Service (Shopify Compatible)
 * Handles: Design save → Preview upload → Cart add
 */

import { useEditorStore } from '@/modules/editor/store/editorStore';

interface AddToCartResult {
  success: boolean;
  designId: string;
  checkoutUrl?: string;
  error?: string;
}

export class SimpleCartService {
  
  /**
   * Main method: Add design to Shopify cart
   * STEP 1: Save design to backend
   * STEP 2: Upload preview to CDN  
   * STEP 3: Add to cart with references only
   */
  async addDesignToCart(): Promise<AddToCartResult> {
    const editorStore = useEditorStore();
    
    try {
      console.log('[Cart] Starting add to cart process...');
      
      // 1. Generate preview image
      const previewDataUrl = editorStore.capturePreview({
        pixelRatio: 2,
        mimeType: 'image/png',
      });
      
      if (!previewDataUrl) {
        throw new Error('Failed to generate preview');
      }
      
      // 2. Get Shopify context from localStorage
      const shopifyContext = this.getShopifyContext();
      
      // 3. Save design to backend (gets designId + CDN URL)
      const saveResponse = await fetch('/api/proxy/cart/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Design data
          snapshot: {
            items: editorStore.items,
            productSlug: editorStore.productSlug,
            surfaceId: editorStore.surfaceId,
            printTech: editorStore.printTech,
            color: editorStore.color,
            sheetWidthPx: editorStore.sheetWpx,
            sheetHeightPx: editorStore.sheetHpx,
          },
          previewDataUrl,
          
          // Shopify context
          shopifyProductGid: shopifyContext?.productGid,
          shopifyVariantId: shopifyContext?.variantId,
          
          // Metadata
          quantity: editorStore.quantity || 1,
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error(`Backend save failed: ${saveResponse.status}`);
      }
      
      const { designId, previewUrl } = await saveResponse.json();
      console.log('[Cart] ✅ Design saved to backend:', designId);
      
      // 4. Add to Shopify cart (with references only)
      const cartResult = await this.addToShopifyCart({
        variantId: shopifyContext?.variantId || '',
        quantity: editorStore.quantity || 1,
        designId,
        previewUrl,
        productSlug: editorStore.productSlug,
        surfaceId: editorStore.surfaceId,
        printTech: editorStore.printTech,
      });
      
      console.log('[Cart] ✅ Added to Shopify cart');
      
      // 5. Clear localStorage (design now in cart)
      localStorage.removeItem('gsb_current_design');
      
      return {
        success: true,
        designId,
        checkoutUrl: cartResult.checkoutUrl || '/cart',
      };
      
    } catch (error) {
      console.error('[Cart] Error:', error);
      return {
        success: false,
        designId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Add to Shopify cart (GraphQL API with fallbacks)
   */
  private async addToShopifyCart(params: {
    variantId: string;
    quantity: number;
    designId: string;
    previewUrl: string;
    productSlug: string;
    surfaceId: string;
    printTech: string;
  }): Promise<{ checkoutUrl?: string }> {
    
    // Build cart properties (ALL <255 characters)
    const properties: Record<string, string> = {
      // Internal references (hidden from customer)
      '_design_id': params.designId,        // 36 chars ✅
      '_preview_url': params.previewUrl,    // ~80 chars ✅
      
      // Customer-visible properties
      'Customization': 'Custom Design',
      'Design ID': params.designId.slice(0, 8).toUpperCase(),
      'Product': params.productSlug.replace('-', ' '),
      'Surface': params.surfaceId.replace('-', ' '),
      'Print Method': params.printTech.toUpperCase(),
    };
    
    // Verify all values <255 chars (Shopify requirement)
    Object.entries(properties).forEach(([key, value]) => {
      if (value.length > 255) {
        console.warn(`[Cart] Property "${key}" too long, truncating`);
        properties[key] = value.slice(0, 250) + '...';
      }
    });
    
    // Try Cart API first (modern)
    try {
      return await this.addViaCartAPI(params.variantId, params.quantity, properties);
    } catch (apiError) {
      console.warn('[Cart] Cart API failed, trying Ajax fallback');
      
      // Fallback to Ajax API
      return await this.addViaAjaxAPI(params.variantId, params.quantity, properties);
    }
  }
  
  /**
   * Add via Cart API (GraphQL)
   */
  private async addViaCartAPI(
    variantId: string,
    quantity: number,
    properties: Record<string, string>
  ) {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          id: variantId,
          quantity,
          properties,
        }],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Cart API error: ${response.status}`);
    }
    
    const cart = await response.json();
    return { checkoutUrl: '/cart' };
  }
  
  /**
   * Add via Ajax API (fallback)
   */
  private async addViaAjaxAPI(
    variantId: string,
    quantity: number,
    properties: Record<string, string>
  ) {
    const formData = new FormData();
    formData.append('id', variantId);
    formData.append('quantity', quantity.toString());
    
    Object.entries(properties).forEach(([key, value]) => {
      formData.append(`properties[${key}]`, value);
    });
    
    const response = await fetch('/cart/add', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Ajax API error: ${response.status}`);
    }
    
    return { checkoutUrl: '/cart' };
  }
  
  /**
   * Get Shopify context from localStorage
   */
  private getShopifyContext(): { productGid?: string; variantId?: string; returnUrl?: string } | null {
    try {
      const stored = localStorage.getItem('gsb-shopify-context');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}

export const simpleCartService = new SimpleCartService();


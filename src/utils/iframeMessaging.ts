/**
 * iframe Communication Utils
 * PostMessage API for parent ↔ iframe communication
 */

export interface EditorMessage {
  type: 'GSB_DESIGN_COMPLETE' | 'GSB_CLOSE_MODAL' | 'GSB_DESIGN_SAVED' | 'GSB_READY';
  designId?: string;
  variantId?: string;
  properties?: Record<string, string>;
  previewUrl?: string;
  checkoutUrl?: string; // ✅ ADDED: Shopify cart URL for parent
  mode?: 'gang' | 'dtf';
  metadata?: {
    sheetSize?: string;
    utilization?: number;
    itemCount?: number;
    technique?: string;
    colorCount?: number;
    minDpi?: number;
  };
}

/**
 * Check if running in iframe
 */
export function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return window.self !== window.top;
  } catch {
    return true; // Cross-origin iframe
  }
}

/**
 * Send message to parent window
 */
export function sendToParent(message: EditorMessage): void {
  if (!isInIframe()) {
    console.warn('[iframe] Not in iframe, message not sent');
    return;
  }
  
  if (typeof window === 'undefined' || !window.parent) {
    return;
  }
  
  // Send to Shopify parent
  window.parent.postMessage(message, '*');
  console.log('[iframe] Message sent to parent:', message.type);
}

/**
 * Notify parent that design is complete and ready for cart
 */
export function notifyDesignComplete(data: {
  designId: string;
  variantId: string;
  properties: Record<string, string>;
  previewUrl?: string;
  checkoutUrl?: string; // ✅ ADDED
  mode?: 'gang' | 'dtf';
  metadata?: {
    sheetSize?: string;
    utilization?: number;
    itemCount?: number;
    technique?: string;
    colorCount?: number;
    minDpi?: number;
  };
}): void {
  sendToParent({
    type: 'GSB_DESIGN_COMPLETE',
    ...data,
  });
}

/**
 * Request modal close
 */
export function requestModalClose(): void {
  sendToParent({
    type: 'GSB_CLOSE_MODAL',
  });
}

/**
 * Notify design saved (autosave)
 */
export function notifyDesignSaved(designId: string): void {
  sendToParent({
    type: 'GSB_DESIGN_SAVED',
    designId,
  });
}

/**
 * Notify editor is ready
 */
export function notifyEditorReady(): void {
  sendToParent({
    type: 'GSB_READY',
  });
}

/**
 * Listen for messages from parent
 */
export function listenToParent(callback: (message: any) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const handler = (event: MessageEvent) => {
    // Verify origin (Shopify or our domain)
    const allowedOrigins = [
      'https://app.gsb-engine.dev',
      '.myshopify.com',
    ];
    
    const isAllowed = allowedOrigins.some(origin => 
      event.origin.includes(origin) || origin.includes(event.origin)
    );
    
    if (!isAllowed) {
      return;
    }
    
    callback(event.data);
  };
  
  window.addEventListener('message', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('message', handler);
  };
}


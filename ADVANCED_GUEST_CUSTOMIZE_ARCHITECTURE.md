# 🎨 ADVANCED GUEST CUSTOMIZE & CART SYSTEM
## Anonim + Authenticated User Customization Flow
**Technology Level:** CUTTING-EDGE (2025)  
**Focus:** Shopify Storefront Customer Journey  
**Goal:** Frictionless customize → cart experience

---

## 🎯 SYSTEM OVERVIEW

### **User Types & Flow**

```
ANONIM KULLANICI (Guest)
├─ Giriş yapmadan customize yapabilir
├─ Design localStorage + SessionStorage'da saklanır
├─ Cart'a ekleme sırasında backend'e kaydedilir
├─ Session ID ile takip (cookie-less possible)
└─ Login sonrası design'lar merge edilir

GİRİŞ YAPMIŞŞ KULLANICI (Authenticated)
├─ Tüm design'lar database'e kaydedilir
├─ Real-time sync (WebSocket)
├─ Design history & version control
├─ Cloud'da saklanır (device-agnostic)
└─ Team collaboration (if applicable)
```

---

## 🏗️ ARCHITECTURE: CUTTING-EDGE SESSION MANAGEMENT

### **1. COOKIE-LESS SESSION SYSTEM** (Privacy-First)

Modern browser'larda third-party cookie'ler kısıtlanıyor. Bizim çözümümüz:

#### **Storage API + Broadcast Channel API**

```typescript
// src/composables/useGuestSession.ts
import { v4 as uuidv4 } from 'uuid';
import { BroadcastChannel } from 'broadcast-channel';

interface GuestSession {
  sessionId: string;
  deviceId: string;
  designs: Map<string, DesignSnapshot>;
  createdAt: number;
  lastSync: number;
}

class GuestSessionManager {
  private sessionId: string;
  private deviceId: string;
  private channel: BroadcastChannel;
  private db: IDBDatabase | null = null;

  constructor() {
    // Generate stable device ID (survives cookie deletion)
    this.deviceId = this.getOrCreateDeviceId();
    
    // Session ID (changes per browser session)
    this.sessionId = sessionStorage.getItem('gsb_session_id') || uuidv4();
    sessionStorage.setItem('gsb_session_id', this.sessionId);
    
    // Cross-tab communication
    this.channel = new BroadcastChannel('gsb_session_sync');
    
    // Initialize IndexedDB
    this.initDB();
  }

  /**
   * Generate stable device fingerprint using modern APIs
   */
  private async getOrCreateDeviceId(): Promise<string> {
    // 1. Try localStorage first
    const stored = localStorage.getItem('gsb_device_id');
    if (stored) return stored;
    
    // 2. Generate fingerprint (privacy-safe)
    const fingerprint = await this.generateFingerprint();
    localStorage.setItem('gsb_device_id', fingerprint);
    
    return fingerprint;
  }

  /**
   * Generate device fingerprint using WebCrypto + Canvas
   * More stable than cookies, survives incognito/clearing
   */
  private async generateFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      navigator.hardwareConcurrency || 0,
    ];
    
    // Canvas fingerprint (very stable)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('GSB Fingerprint 🎨', 2, 2);
      components.push(canvas.toDataURL());
    }
    
    // Hash using SubtleCrypto
    const encoder = new TextEncoder();
    const data = encoder.encode(components.join('|'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  /**
   * IndexedDB for offline-first design storage
   */
  private async initDB() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('GSBDesigns', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Object store for designs
        if (!db.objectStoreNames.contains('designs')) {
          const store = db.createObjectStore('designs', { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('deviceId', 'deviceId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
        
        // Object store for offline queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  /**
   * Save design to IndexedDB
   */
  async saveDesign(design: DesignSnapshot): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['designs'], 'readwrite');
    const store = transaction.objectStore('designs');
    
    const record = {
      id: design.id || uuidv4(),
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      snapshot: design,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: false,
    };
    
    await store.put(record);
    
    // Broadcast to other tabs
    this.channel.postMessage({
      type: 'design_saved',
      designId: record.id,
    });
  }

  /**
   * Sync designs to backend when going to cart
   */
  async syncToBackend(): Promise<{ guestToken: string; designIds: string[] }> {
    // 1. Get all unsynced designs from IndexedDB
    const designs = await this.getUnsyncedDesigns();
    
    // 2. Batch upload to backend
    const response = await fetch('/api/guest/designs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: this.deviceId,
        sessionId: this.sessionId,
        designs: designs.map(d => d.snapshot),
      }),
    });
    
    const { guestToken, designIds } = await response.json();
    
    // 3. Mark as synced in IndexedDB
    const transaction = this.db!.transaction(['designs'], 'readwrite');
    const store = transaction.objectStore('designs');
    
    for (const design of designs) {
      design.synced = true;
      await store.put(design);
    }
    
    // 4. Store guest token for cart
    sessionStorage.setItem('gsb_guest_token', guestToken);
    
    return { guestToken, designIds };
  }

  /**
   * Get all unsynced designs
   */
  private async getUnsyncedDesigns(): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['designs'], 'readonly');
      const store = transaction.objectStore('designs');
      const index = store.index('synced');
      const request = index.getAll(false); // synced = false
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const guestSession = new GuestSessionManager();
```

---

## 🔐 2. ADVANCED AUTHENTICATION SYSTEM

### **Hybrid Session: Guest → Authenticated Transition**

```typescript
// src/composables/useHybridAuth.ts
import { useStorage } from '@vueuse/core';
import type { RemovableRef } from '@vueuse/core';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'guest' | 'customer' | 'merchant';
}

interface SessionState {
  user: User | null;
  guestToken: string | null;
  accessToken: string | null;
  designs: string[]; // Design IDs owned by this session
}

export function useHybridAuth() {
  // Persistent across page reloads (localStorage)
  const sessionState = useStorage<SessionState>('gsb_session', {
    user: null,
    guestToken: null,
    accessToken: null,
    designs: [],
  });

  /**
   * Initialize guest session (anonymous user)
   */
  async function initGuestSession() {
    if (sessionState.value.guestToken) {
      return sessionState.value.guestToken;
    }
    
    // Request guest token from backend
    const response = await fetch('/api/guest/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: guestSession.deviceId,
        sessionId: guestSession.sessionId,
        fingerprint: await guestSession.generateFingerprint(),
      }),
    });
    
    const { guestToken, expiresAt } = await response.json();
    
    sessionState.value.guestToken = guestToken;
    sessionState.value.user = {
      id: `guest_${guestSession.deviceId.slice(0, 8)}`,
      email: '',
      name: 'Guest',
      role: 'guest',
    };
    
    return guestToken;
  }

  /**
   * Upgrade guest to authenticated user
   */
  async function upgradeToAuthenticated(email: string, password: string) {
    // 1. Login
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const { accessToken, user } = await loginResponse.json();
    
    // 2. Merge guest designs with user account
    const mergeResponse = await fetch('/api/designs/merge-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        guestToken: sessionState.value.guestToken,
        guestDesignIds: sessionState.value.designs,
      }),
    });
    
    const { mergedDesigns, conflicts } = await mergeResponse.json();
    
    // 3. Update session state
    sessionState.value.accessToken = accessToken;
    sessionState.value.user = user;
    sessionState.value.guestToken = null; // Clear guest token
    sessionState.value.designs = mergedDesigns.map(d => d.id);
    
    return { user, mergedDesigns, conflicts };
  }

  /**
   * Social login (Google, Apple, Email Magic Link)
   */
  async function loginWithProvider(provider: 'google' | 'apple' | 'magic-link', credential: string) {
    const response = await fetch(`/api/auth/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        credential,
        guestToken: sessionState.value.guestToken, // Merge designs
      }),
    });
    
    const { accessToken, user, mergedDesigns } = await response.json();
    
    sessionState.value.accessToken = accessToken;
    sessionState.value.user = user;
    sessionState.value.designs = mergedDesigns.map(d => d.id);
    
    return { user, mergedDesigns };
  }

  return {
    sessionState,
    initGuestSession,
    upgradeToAuthenticated,
    loginWithProvider,
  };
}
```

---

## 🛒 3. ADVANCED CART INTEGRATION

### **Progressive Enhancement Strategy**

```typescript
// src/services/cartService.ts

/**
 * Multi-layer cart system:
 * 1. Shopify Cart API (Preferred)
 * 2. Ajax API fallback
 * 3. Form submission fallback
 */
export class AdvancedCartService {
  
  /**
   * Add customized design to cart
   */
  async addToCart(params: AddToCartParams): Promise<CartResponse> {
    // 1. Prepare design data
    const designData = await this.prepareDesignData(params);
    
    // 2. Try Shopify Cart API (modern, recommended)
    try {
      return await this.addViaCartAPI(designData);
    } catch (apiError) {
      console.warn('[Cart] Cart API failed, trying Ajax fallback', apiError);
      
      // 3. Fallback to Ajax API
      try {
        return await this.addViaAjaxAPI(designData);
      } catch (ajaxError) {
        console.warn('[Cart] Ajax API failed, using form submission', ajaxError);
        
        // 4. Last resort: Form submission
        return await this.addViaFormSubmission(designData);
      }
    }
  }

  /**
   * METHOD 1: Shopify Cart API (Storefront API 2024-04)
   * Best: Type-safe, modern, returns cart object
   */
  private async addViaCartAPI(data: DesignData): Promise<CartResponse> {
    // 1. Get or create cart ID
    let cartId = this.getCartId();
    
    if (!cartId) {
      // Create new cart
      const createResponse = await fetch('/cart.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes: {} }),
      });
      const cart = await createResponse.json();
      cartId = cart.token;
      this.setCartId(cartId);
    }
    
    // 2. Add line item with design properties
    const response = await fetch(`/cart/add.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          id: data.variantId, // Shopify variant ID (number or GID)
          quantity: data.quantity,
          properties: {
            '_design_id': data.designId,
            '_design_snapshot': this.compressSnapshot(data.snapshot),
            '_preview_url': data.previewUrl,
            '_product_slug': data.productSlug,
            '_surface_id': data.surfaceId,
            '_print_tech': data.printTech,
            '_sheet_size': `${data.widthMm}×${data.heightMm}mm`,
            '_guest_token': data.guestToken || '',
            // Custom properties visible to customer
            'Customization': 'Yes',
            'Design Preview': data.previewThumbnail,
          },
        }],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Cart API failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      cart: result,
      checkoutUrl: '/checkout',
    };
  }

  /**
   * METHOD 2: Ajax API fallback (older themes)
   */
  private async addViaAjaxAPI(data: DesignData): Promise<CartResponse> {
    const formData = new FormData();
    formData.append('id', data.variantId.toString());
    formData.append('quantity', data.quantity.toString());
    
    // Add properties
    Object.entries(data.properties).forEach(([key, value]) => {
      formData.append(`properties[${key}]`, value);
    });
    
    const response = await fetch('/cart/add', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Ajax API failed: ${response.status}`);
    }
    
    return {
      success: true,
      checkoutUrl: '/cart',
    };
  }

  /**
   * METHOD 3: Form submission (ultimate fallback)
   */
  private async addViaFormSubmission(data: DesignData): Promise<CartResponse> {
    // Create hidden form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/cart/add';
    
    // Add fields
    const fields = {
      id: data.variantId,
      quantity: data.quantity,
      ...Object.entries(data.properties).reduce((acc, [key, value]) => {
        acc[`properties[${key}]`] = value;
        return acc;
      }, {}),
    };
    
    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });
    
    document.body.appendChild(form);
    form.submit();
    
    return {
      success: true,
      checkoutUrl: '/cart',
    };
  }

  /**
   * Compress snapshot for storage (LZ compression)
   */
  private compressSnapshot(snapshot: any): string {
    const json = JSON.stringify(snapshot);
    
    // If small enough, store as-is
    if (json.length < 5000) return json;
    
    // Otherwise, use LZ-string compression
    import('lz-string').then(LZString => {
      return LZString.compressToBase64(json);
    });
    
    return json;
  }

  /**
   * Cart ID management (Shopify cart token)
   */
  private getCartId(): string | null {
    // Try cookie first
    const cartCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('cart='));
    
    if (cartCookie) {
      return cartCookie.split('=')[1];
    }
    
    // Try sessionStorage
    return sessionStorage.getItem('shopify_cart_id');
  }

  private setCartId(cartId: string): void {
    sessionStorage.setItem('shopify_cart_id', cartId);
  }
}

export const cartService = new AdvancedCartService();
```

---

## 💾 4. OFFLINE-FIRST DESIGN PERSISTENCE

### **Service Worker + Background Sync**

```typescript
// public/sw.js - Service Worker
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache strategies
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/designs'),
  new NetworkFirst({
    cacheName: 'designs-api',
    plugins: [
      new BackgroundSyncPlugin('designsQueue', {
        maxRetentionTime: 24 * 60, // 24 hours
      }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          return response.status === 200 ? response : null;
        },
      },
    ],
  })
);

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-designs') {
    event.waitUntil(syncPendingDesigns());
  }
});

async function syncPendingDesigns() {
  // Get pending designs from IndexedDB
  const db = await openDB('GSBDesigns', 2);
  const tx = db.transaction('syncQueue', 'readonly');
  const queue = await tx.objectStore('syncQueue').getAll();
  
  // Upload each design
  for (const item of queue) {
    try {
      await fetch('/api/guest/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      
      // Remove from queue if successful
      const deleteTx = db.transaction('syncQueue', 'readwrite');
      await deleteTx.objectStore('syncQueue').delete(item.id);
    } catch (error) {
      console.warn('[SW] Sync failed for design:', item.id, error);
      // Will retry on next sync event
    }
  }
}
```

---

## 🚀 5. REAL-TIME STATE SYNC (Authenticated Users)

### **WebSocket + CRDT for Conflict-Free Sync**

```typescript
// src/composables/useRealtimeDesign.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useEditorStore } from '@/modules/editor/store/editorStore';

export function useRealtimeDesign(designId: string) {
  const editorStore = useEditorStore();
  
  // 1. Create Yjs document
  const ydoc = new Y.Doc();
  const yitems = ydoc.getArray('items');
  const ymeta = ydoc.getMap('meta');
  
  // 2. IndexedDB persistence (offline support)
  const indexeddbProvider = new IndexeddbPersistence(`design:${designId}`, ydoc);
  
  indexeddbProvider.on('synced', () => {
    console.log('[Yjs] Loaded from IndexedDB');
  });
  
  // 3. WebSocket provider (server sync)
  const websocketProvider = new WebsocketProvider(
    'wss://app.gsb-engine.dev/collaboration',
    `design:${designId}`,
    ydoc,
    {
      params: {
        token: sessionState.value.accessToken,
      },
    }
  );
  
  websocketProvider.on('status', (event: { status: string }) => {
    console.log('[Yjs] WebSocket status:', event.status);
    
    if (event.status === 'connected') {
      // Sync local changes to server
      syncLocalChanges();
    }
  });
  
  // 4. Bind Yjs to Konva stage
  yitems.observe((event) => {
    event.changes.added.forEach((item) => {
      const content = item.content.getContent()[0];
      const layer = JSON.parse(content);
      
      // Add to Konva stage
      const node = Konva.Node.create(layer);
      editorStore.stage.add(node);
    });
    
    event.changes.deleted.forEach((item) => {
      const content = item.content.getContent()[0];
      const layer = JSON.parse(content);
      
      // Remove from Konva stage
      const node = editorStore.stage.findOne(`#${layer.id}`);
      node?.destroy();
    });
  });
  
  // 5. Sync Konva changes to Yjs
  editorStore.stage.on('change', () => {
    const items = editorStore.items;
    
    ydoc.transact(() => {
      yitems.delete(0, yitems.length);
      items.forEach((item) => {
        yitems.push([JSON.stringify(item)]);
      });
    });
  });
  
  // 6. Awareness (cursor tracking)
  websocketProvider.awareness.setLocalState({
    user: {
      id: sessionState.value.user?.id,
      name: sessionState.value.user?.name,
      color: generateUserColor(sessionState.value.user?.id),
    },
    cursor: { x: 0, y: 0 },
  });
  
  websocketProvider.awareness.on('change', () => {
    const states = Array.from(websocketProvider.awareness.getStates().values());
    
    // Render other users' cursors
    renderRemoteCursors(states.filter(s => s.user?.id !== sessionState.value.user?.id));
  });
  
  // Cleanup on unmount
  onUnmounted(() => {
    websocketProvider.destroy();
    indexeddbProvider.destroy();
    ydoc.destroy();
  });
  
  return {
    ydoc,
    provider: websocketProvider,
    awareness: websocketProvider.awareness,
  };
}
```

---

## 🔄 6. BACKEND: GUEST SESSION API

### **Guest Session Endpoint**

```typescript
// server/src/routes/guest.ts
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

export const guestRouter = Router();

const createGuestSessionSchema = z.object({
  deviceId: z.string().min(32).max(128),
  sessionId: z.string().uuid(),
  fingerprint: z.string().optional(),
});

/**
 * POST /api/guest/session
 * Create guest session (no login required)
 */
guestRouter.post('/session', async (req, res, next) => {
  try {
    const { deviceId, sessionId, fingerprint } = createGuestSessionSchema.parse(req.body);
    const { prisma } = req.context;
    
    // Create or find guest user
    let guestUser = await prisma.user.findFirst({
      where: {
        email: `guest_${deviceId}@anonymous.local`,
      },
    });
    
    if (!guestUser) {
      guestUser = await prisma.user.create({
        data: {
          email: `guest_${deviceId}@anonymous.local`,
          displayName: `Guest ${deviceId.slice(0, 8)}`,
          status: 'GUEST',
          metadata: {
            deviceId,
            fingerprint,
            createdAt: new Date().toISOString(),
          },
        },
      });
    }
    
    // Generate guest token (JWT, 7 days expiry)
    const guestToken = jwt.sign(
      {
        sub: guestUser.id,
        type: 'guest',
        deviceId,
        sessionId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.json({
      guestToken,
      userId: guestUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/guest/designs/batch
 * Batch upload guest designs before cart
 */
const batchUploadSchema = z.object({
  deviceId: z.string(),
  sessionId: z.string(),
  designs: z.array(z.any()).max(50), // Max 50 designs per batch
});

guestRouter.post('/designs/batch', async (req, res, next) => {
  try {
    const { deviceId, sessionId, designs } = batchUploadSchema.parse(req.body);
    const { prisma } = req.context;
    
    // Find guest user
    const guestUser = await prisma.user.findFirst({
      where: { email: `guest_${deviceId}@anonymous.local` },
    });
    
    if (!guestUser) {
      return res.status(404).json({ error: 'Guest session not found' });
    }
    
    // Create designs in database
    const created = await Promise.all(
      designs.map(async (snapshot) => {
        return prisma.designDocument.create({
          data: {
            userId: guestUser.id,
            tenantId: null, // Guest designs have no tenant
            status: 'DRAFT',
            name: snapshot.name || 'Untitled Design',
            snapshot,
            productSlug: snapshot.productSlug,
            surfaceId: snapshot.surfaceId,
            printTech: snapshot.printTech,
            sheetWidthPx: snapshot.sheetWidthPx,
            sheetHeightPx: snapshot.sheetHeightPx,
            metadata: {
              source: 'guest',
              deviceId,
              sessionId,
              createdAt: new Date().toISOString(),
            },
          },
        });
      })
    );
    
    // Generate guest token
    const guestToken = jwt.sign(
      {
        sub: guestUser.id,
        type: 'guest',
        deviceId,
        designs: created.map(d => d.id),
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.json({
      guestToken,
      designIds: created.map(d => d.id),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/designs/merge-guest
 * Merge guest designs when user logs in
 */
const mergeGuestDesignsSchema = z.object({
  guestToken: z.string(),
  guestDesignIds: z.array(z.string()),
});

guestRouter.post('/designs/merge-guest', async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { guestToken, guestDesignIds } = mergeGuestDesignsSchema.parse(req.body);
    const { prisma } = req.context;
    
    // Verify guest token
    const decoded = jwt.verify(guestToken, process.env.JWT_SECRET!) as {
      sub: string;
      type: string;
    };
    
    if (decoded.type !== 'guest') {
      return res.status(400).json({ error: 'Invalid guest token' });
    }
    
    // Find guest designs
    const guestDesigns = await prisma.designDocument.findMany({
      where: {
        id: { in: guestDesignIds },
        userId: decoded.sub,
      },
    });
    
    // Check for conflicts (same product+surface already exists for user)
    const conflicts: any[] = [];
    const toMerge: any[] = [];
    
    for (const guestDesign of guestDesigns) {
      const existing = await prisma.designDocument.findFirst({
        where: {
          userId: req.auth.userId,
          productSlug: guestDesign.productSlug,
          surfaceId: guestDesign.surfaceId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
      });
      
      if (existing) {
        conflicts.push({
          guest: guestDesign,
          existing,
          resolution: 'keep_both', // or 'replace', 'merge_layers'
        });
      } else {
        toMerge.push(guestDesign);
      }
    }
    
    // Merge non-conflicting designs
    await prisma.designDocument.updateMany({
      where: { id: { in: toMerge.map(d => d.id) } },
      data: { userId: req.auth.userId },
    });
    
    res.json({
      mergedDesigns: toMerge,
      conflicts,
    });
  } catch (error) {
    next(error);
  }
});
```

---

## 🎨 7. ADVANCED CART PREVIEW

### **3D Product Preview in Cart**

```typescript
// src/components/CartLineItemPreview.vue
<template>
  <div class="cart-item-preview">
    <!-- 2D Preview -->
    <div v-if="mode === '2d'" class="preview-2d">
      <img 
        :src="designPreview" 
        :alt="productTitle"
        loading="lazy"
        @click="openFullPreview"
      />
    </div>
    
    <!-- 3D Interactive Preview -->
    <div v-else-if="mode === '3d'" class="preview-3d">
      <Canvas ref="threeCanvas" :design="design" :product="product" />
      
      <!-- Controls -->
      <div class="preview-controls">
        <button @click="rotate(-45)">⟲</button>
        <button @click="rotate(45)">⟳</button>
        <button @click="resetView">Reset</button>
      </div>
    </div>
    
    <!-- Edit Button -->
    <button @click="editDesign" class="btn-edit">
      <Edit :size="16" />
      Edit Design
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Edit } from 'lucide-vue-next';
import Canvas from './ThreeCanvas.vue';

const props = defineProps<{
  lineItem: ShopifyLineItem;
  design: DesignDocument;
  product: Product;
}>();

const mode = ref<'2d' | '3d'>('2d');
const threeCanvas = ref<InstanceType<typeof Canvas>>();

const designPreview = computed(() => {
  // Check if we have base64 preview in properties
  const previewProp = props.lineItem.properties?.find(
    p => p.key === '_preview_url'
  );
  
  if (previewProp?.value?.startsWith('data:image')) {
    return previewProp.value;
  }
  
  // Otherwise use CDN URL
  return props.design.previewUrl || '/placeholder.png';
});

function rotate(degrees: number) {
  threeCanvas.value?.rotate(degrees);
}

function resetView() {
  threeCanvas.value?.reset();
}

async function editDesign() {
  // Navigate back to editor with design ID
  const editorUrl = `/editor?designId=${props.design.id}&mode=edit`;
  window.location.href = editorUrl;
}

function openFullPreview() {
  // Open modal with larger preview
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="preview-modal">
      <img src="${designPreview.value}" />
      <button onclick="this.parentElement.remove()">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}
</script>
```

---

## ⚡ 8. PERFORMANCE OPTIMIZATION

### **Lazy Loading + Code Splitting**

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/editor',
      name: 'Editor',
      // Lazy load editor (large bundle)
      component: () => import(
        /* webpackChunkName: "editor" */
        /* webpackPrefetch: true */
        '@/modules/editor/views/EditorView.vue'
      ),
    },
    {
      path: '/cart',
      name: 'Cart',
      component: () => import(
        /* webpackChunkName: "cart" */
        '@/views/CartView.vue'
      ),
    },
  ],
});

// Prefetch editor when user hovers customize button
router.beforeEach((to, from, next) => {
  if (to.name === 'Editor') {
    // Prefetch 3D libraries
    import('@threlte/core');
    import('three');
  }
  next();
});

export default router;
```

### **Image Lazy Loading + Blurhash Placeholders**

```typescript
// src/components/LazyImage.vue
<template>
  <div class="lazy-image" :style="{ backgroundColor: dominantColor }">
    <!-- Blurhash placeholder -->
    <canvas 
      v-if="!loaded" 
      ref="blurhashCanvas" 
      :width="width" 
      :height="height"
      class="placeholder"
    />
    
    <!-- Actual image -->
    <img
      v-show="loaded"
      :src="src"
      :alt="alt"
      @load="onLoad"
      loading="lazy"
      decoding="async"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { decode } from 'blurhash';

const props = defineProps<{
  src: string;
  alt: string;
  blurhash?: string;
  width?: number;
  height?: number;
}>();

const loaded = ref(false);
const blurhashCanvas = ref<HTMLCanvasElement>();
const dominantColor = ref('#f0f0f0');

onMounted(() => {
  if (props.blurhash && blurhashCanvas.value) {
    // Decode blurhash
    const pixels = decode(props.blurhash, props.width || 32, props.height || 32);
    
    // Draw to canvas
    const ctx = blurhashCanvas.value.getContext('2d');
    if (ctx) {
      const imageData = ctx.createImageData(props.width || 32, props.height || 32);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
      
      // Extract dominant color
      dominantColor.value = extractDominantColor(pixels);
    }
  }
});

function onLoad() {
  loaded.value = true;
}

function extractDominantColor(pixels: Uint8ClampedArray): string {
  // Simple average of first few pixels
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 40; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
  }
  const count = 10;
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  
  return `rgb(${r}, ${g}, ${b})`;
}
</script>
```

---

## 📱 9. PROGRESSIVE WEB APP (PWA)

### **Service Worker Registration**

```typescript
// src/main.ts
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Prompt user to reload
    if (confirm('New version available! Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
    showNotification('You can now use the editor offline!');
  },
});

// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'GSB Design Engine',
        short_name: 'GSB',
        description: 'Professional customization platform',
        theme_color: '#4c1d95',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/app\.gsb-engine\.dev\/api\/designs/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'designs-api',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
});
```

---

## 🔄 10. CART SYNC ACROSS DEVICES

### **Design Cloud Sync (Authenticated Users)**

```typescript
// src/services/cloudSyncService.ts
import { useAuth } from '@/composables/useAuth';
import { useEditorStore } from '@/modules/editor/store/editorStore';

export class CloudSyncService {
  private syncInterval: number | null = null;
  private pendingChanges = new Set<string>();
  
  constructor() {
    // Listen for online/offline
    window.addEventListener('online', () => this.syncAll());
    window.addEventListener('offline', () => this.pauseSync());
    
    // Sync on visibility change (tab focus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncAll();
      }
    });
  }
  
  /**
   * Start auto-sync (every 10 seconds)
   */
  startAutoSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = window.setInterval(() => {
      this.syncPending();
    }, 10000);
  }
  
  /**
   * Mark design as dirty (needs sync)
   */
  markDirty(designId: string) {
    this.pendingChanges.add(designId);
  }
  
  /**
   * Sync pending changes
   */
  private async syncPending() {
    if (this.pendingChanges.size === 0) return;
    if (!navigator.onLine) return;
    
    const auth = useAuth();
    if (!auth.isAuthenticated.value) return;
    
    const editorStore = useEditorStore();
    const idsToSync = Array.from(this.pendingChanges);
    
    try {
      // Batch sync
      const response = await fetch('/api/designs/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken.value}`,
        },
        body: JSON.stringify({
          designs: idsToSync.map(id => ({
            id,
            snapshot: editorStore.getSnapshot(id),
            updatedAt: Date.now(),
          })),
        }),
      });
      
      if (response.ok) {
        const { synced, conflicts } = await response.json();
        
        // Clear synced items
        synced.forEach((id: string) => this.pendingChanges.delete(id));
        
        // Handle conflicts
        if (conflicts.length > 0) {
          this.resolveConflicts(conflicts);
        }
      }
    } catch (error) {
      console.warn('[CloudSync] Sync failed, will retry', error);
    }
  }
  
  /**
   * Sync all designs (manual trigger)
   */
  async syncAll() {
    const auth = useAuth();
    if (!auth.isAuthenticated.value) return;
    
    const editorStore = useEditorStore();
    const allDesigns = editorStore.getAllDesigns();
    
    allDesigns.forEach(d => this.markDirty(d.id));
    await this.syncPending();
  }
  
  /**
   * Conflict resolution (Last-Write-Wins or Manual)
   */
  private async resolveConflicts(conflicts: any[]) {
    // Strategy 1: Last-Write-Wins (automatic)
    for (const conflict of conflicts) {
      if (conflict.strategy === 'lww') {
        const local = conflict.local;
        const remote = conflict.remote;
        
        if (local.updatedAt > remote.updatedAt) {
          // Local wins, force push
          await this.forcePush(local.id, local.snapshot);
        } else {
          // Remote wins, pull and update local
          await this.pullRemote(local.id, remote.snapshot);
        }
      }
    }
    
    // Strategy 2: Manual resolution (show UI)
    const manualConflicts = conflicts.filter(c => c.strategy === 'manual');
    if (manualConflicts.length > 0) {
      this.showConflictDialog(manualConflicts);
    }
  }
}

export const cloudSync = new CloudSyncService();
```

---

## 🎯 11. CART UPSELL & RECOMMENDATIONS

### **AI-Powered Product Recommendations**

```typescript
// server/src/services/recommendationEngine.ts
import { OpenAI } from 'openai';
import { PineconeClient } from '@pinecone-database/pinecone';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new PineconeClient();

export class RecommendationEngine {
  
  /**
   * Get similar products based on current design
   */
  async getSimilarProducts(designId: string): Promise<Product[]> {
    // 1. Get design embedding
    const design = await prisma.designDocument.findUnique({
      where: { id: designId },
    });
    
    const embedding = await this.getDesignEmbedding(design.snapshot);
    
    // 2. Vector similarity search in Pinecone
    const index = pinecone.Index('products');
    const results = await index.query({
      vector: embedding,
      topK: 10,
      includeMetadata: true,
      filter: {
        available: true,
        stock: { $gt: 0 },
      },
    });
    
    // 3. Return matched products
    return results.matches.map(match => match.metadata as Product);
  }
  
  /**
   * Generate design embedding using CLIP
   */
  private async getDesignEmbedding(snapshot: any): Promise<number[]> {
    // Convert snapshot to image
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext('2d');
    
    // Render snapshot to canvas
    renderSnapshotToCanvas(ctx, snapshot);
    
    // Get data URL
    const dataUrl = canvas.toDataURL();
    
    // Use OpenAI CLIP API (or local model)
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: dataUrl,
    });
    
    return response.data[0].embedding;
  }
  
  /**
   * Bundle recommendations (buy together)
   */
  async getBundleRecommendations(cartItems: CartItem[]): Promise<Bundle[]> {
    // Collaborative filtering + association rules
    const productIds = cartItems.map(item => item.productId);
    
    const query = `
      SELECT 
        p2.id,
        p2.title,
        COUNT(*) as frequency,
        AVG(o.total) as avg_order_value
      FROM order_line_items ol1
      JOIN order_line_items ol2 ON ol1.order_id = ol2.order_id
      JOIN products p2 ON ol2.product_id = p2.id
      WHERE ol1.product_id = ANY($1)
        AND ol2.product_id != ALL($1)
      GROUP BY p2.id, p2.title
      HAVING COUNT(*) > 10
      ORDER BY frequency DESC
      LIMIT 5
    `;
    
    return await prisma.$queryRaw(query, productIds);
  }
}
```

---

## 📊 12. COMPLETE TECHNOLOGY STACK

### **Frontend (Cutting-Edge)**

```json
{
  "core": {
    "vue": "^3.5.0",
    "vite": "^6.0.0",
    "typescript": "^5.6.0"
  },
  
  "stateManagement": {
    "pinia": "^2.2.0",
    "@vueuse/core": "^11.0.0"
  },
  
  "canvas": {
    "fabric": "^6.0.0",
    "konva": "^9.3.0",
    "@threlte/core": "^8.0.0",
    "three": "^0.168.0"
  },
  
  "realtime": {
    "yjs": "^13.6.0",
    "y-websocket": "^2.0.0",
    "y-indexeddb": "^9.0.0",
    "socket.io-client": "^4.8.0"
  },
  
  "storage": {
    "idb": "^8.0.0",
    "localforage": "^1.10.0",
    "lz-string": "^1.5.0"
  },
  
  "performance": {
    "vite-plugin-pwa": "^0.20.0",
    "workbox-window": "^7.1.0",
    "web-vitals": "^4.2.0",
    "blurhash": "^2.0.0"
  },
  
  "ai": {
    "openai": "^4.67.0",
    "@xenova/transformers": "^2.17.0"
  },
  
  "ui": {
    "lucide-vue-next": "^0.552.0",
    "tailwindcss": "^3.4.0",
    "@headlessui/vue": "^1.7.0"
  }
}
```

### **Backend (Cutting-Edge)**

```json
{
  "runtime": {
    "bun": "^1.1.0",
    "node": "^22.0.0"
  },
  
  "framework": {
    "hono": "^4.6.0",
    "@trpc/server": "^11.0.0",
    "express": "^4.21.0"
  },
  
  "database": {
    "drizzle-orm": "^0.36.0",
    "@prisma/client": "^6.18.0",
    "pg": "^8.13.0"
  },
  
  "realtime": {
    "socket.io": "^4.8.0",
    "@socket.io/redis-adapter": "^8.3.0",
    "y-websocket": "^2.0.0"
  },
  
  "cache": {
    "ioredis": "^5.4.0",
    "@upstash/redis": "^1.34.0",
    "lru-cache": "^11.0.0"
  },
  
  "storage": {
    "@aws-sdk/client-s3": "^3.705.0",
    "@aws-sdk/s3-request-presigner": "^3.705.0",
    "sharp": "^0.33.0"
  },
  
  "queue": {
    "bullmq": "^5.20.0",
    "bee-queue": "^1.4.0"
  },
  
  "monitoring": {
    "dd-trace": "^5.27.0",
    "@sentry/node": "^8.38.0",
    "pino": "^9.5.0"
  },
  
  "ai": {
    "openai": "^4.67.0",
    "@tensorflow/tfjs-node": "^4.22.0"
  }
}
```

---

## 🎬 13. IMPLEMENTATION PLAN (Focused)

### **PHASE 1: Guest Session Foundation (2 weeks)**

#### **Week 1: Client-Side Storage**

```typescript
// Day 1-2: IndexedDB setup
npm install idb lz-string blurhash

// Implement:
- GuestSessionManager class
- IndexedDB schema
- Device fingerprinting
- Session persistence

// Day 3-4: Design state management
- Implement offline-first storage
- Add compression (LZ-string)
- Background sync queue
- Cross-tab synchronization (BroadcastChannel API)

// Day 5: Testing
- Test IndexedDB operations
- Test offline functionality
- Test cross-tab sync
```

#### **Week 2: Backend Guest API**

```typescript
// Day 1-2: Guest endpoints
POST /api/guest/session         - Create guest session
POST /api/guest/designs/batch   - Upload designs before cart
POST /api/designs/merge-guest   - Merge on login

// Day 3-4: Cart integration
POST /api/guest/cart/prepare    - Prepare design for cart
POST /api/guest/cart/add        - Add to Shopify cart

// Day 5: Testing
- Integration tests
- Load testing (100 concurrent guests)
```

---

### **PHASE 2: Advanced Cart Integration (2 weeks)**

#### **Week 3: Shopify Cart API v2**

```typescript
// Implement modern Cart API
class ShopifyCartAPIv2 {
  
  /**
   * Create cart with custom attributes
   */
  async createCart(lineItems: CartLineItem[]): Promise<Cart> {
    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            cost {
              totalAmount { amount currencyCode }
              subtotalAmount { amount currencyCode }
            }
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise { ... on ProductVariant { id title } }
                  attributes { key value }
                  cost { totalAmount { amount } }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;
    
    const response = await fetch(this.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.storefrontToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            lines: lineItems.map(item => ({
              quantity: item.quantity,
              merchandiseId: item.variantId,
              attributes: this.buildAttributes(item),
            })),
            attributes: [
              { key: '_gsb_session', value: this.sessionId },
              { key: '_gsb_version', value: '2.0' },
            ],
          },
        },
      }),
    });
    
    const { data } = await response.json();
    
    if (data.cartCreate.userErrors?.length > 0) {
      throw new Error(data.cartCreate.userErrors[0].message);
    }
    
    return data.cartCreate.cart;
  }
  
  /**
   * Build cart attributes from design
   */
  private buildAttributes(item: CartLineItem): CartAttribute[] {
    const attrs: CartAttribute[] = [
      { key: '_design_id', value: item.designId },
      { key: '_product_slug', value: item.productSlug },
      { key: '_surface_id', value: item.surfaceId },
      { key: '_print_tech', value: item.printTech },
    ];
    
    // Add compressed snapshot (if < 10KB)
    const compressed = this.compressSnapshot(item.snapshot);
    if (compressed.length < 10000) {
      attrs.push({ key: '_snapshot', value: compressed });
    } else {
      // Upload to CDN and store URL only
      const url = await this.uploadSnapshot(item.designId, item.snapshot);
      attrs.push({ key: '_snapshot_url', value: url });
    }
    
    // Add preview image
    if (item.previewUrl) {
      // If base64 and small, store directly
      if (item.previewUrl.startsWith('data:') && item.previewUrl.length < 10000) {
        attrs.push({ key: '_preview', value: item.previewUrl });
      } else {
        // Store as URL
        attrs.push({ key: '_preview_url', value: item.previewUrl });
      }
    }
    
    return attrs;
  }
  
  /**
   * Update cart line item (edit design in cart)
   */
  async updateLineItem(cartId: string, lineItemId: string, newDesign: Design) {
    const mutation = `
      mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart { id }
          userErrors { field message }
        }
      }
    `;
    
    const response = await fetch(this.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.storefrontToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          cartId,
          lines: [{
            id: lineItemId,
            attributes: this.buildAttributes({
              designId: newDesign.id,
              snapshot: newDesign.snapshot,
              // ... other props
            }),
          }],
        },
      }),
    });
    
    return response.json();
  }
}
```

---

#### **Week 4: Cart UI Enhancements**

```typescript
// Cart drawer with design preview
<template>
  <Teleport to="body">
    <div v-if="isOpen" class="cart-drawer">
      <div class="drawer-overlay" @click="close" />
      
      <div class="drawer-content">
        <header class="drawer-header">
          <h2>Your Cart ({{ itemCount }})</h2>
          <button @click="close"><X :size="24" /></button>
        </header>
        
        <div class="drawer-body">
          <TransitionGroup name="cart-item">
            <div 
              v-for="item in items" 
              :key="item.id" 
              class="cart-item"
            >
              <!-- 3D Preview -->
              <div class="item-preview">
                <ThreePreview 
                  :design="item.design" 
                  :product="item.product"
                  :interactive="true"
                />
                
                <!-- Edit button overlay -->
                <button 
                  class="btn-edit-overlay"
                  @click="editDesign(item.designId)"
                >
                  <Edit :size="16" />
                  Edit
                </button>
              </div>
              
              <!-- Item details -->
              <div class="item-details">
                <h3>{{ item.title }}</h3>
                <p class="variant">{{ item.variantTitle }}</p>
                
                <!-- Design info -->
                <div class="design-info">
                  <span class="badge">{{ item.printTech.toUpperCase() }}</span>
                  <span class="size">{{ item.sheetSize }}</span>
                </div>
                
                <!-- Quantity selector -->
                <div class="quantity-selector">
                  <button @click="updateQuantity(item.id, -1)">-</button>
                  <input 
                    type="number" 
                    :value="item.quantity"
                    @change="updateQuantity(item.id, $event.target.value)"
                  />
                  <button @click="updateQuantity(item.id, 1)">+</button>
                </div>
                
                <!-- Price -->
                <div class="item-price">
                  {{ formatCurrency(item.price * item.quantity) }}
                </div>
              </div>
              
              <!-- Remove button -->
              <button 
                class="btn-remove"
                @click="removeItem(item.id)"
              >
                <Trash2 :size="18" />
              </button>
            </div>
          </TransitionGroup>
          
          <!-- Upsell recommendations -->
          <div v-if="recommendations.length > 0" class="recommendations">
            <h3>You might also like</h3>
            <div class="recommendation-grid">
              <ProductCard 
                v-for="product in recommendations"
                :key="product.id"
                :product="product"
                compact
              />
            </div>
          </div>
        </div>
        
        <footer class="drawer-footer">
          <!-- Subtotal -->
          <div class="cart-summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>{{ formatCurrency(subtotal) }}</span>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <span>{{ formatCurrency(total) }}</span>
            </div>
          </div>
          
          <!-- Checkout button -->
          <button 
            class="btn-checkout"
            @click="goToCheckout"
            :disabled="itemCount === 0"
          >
            Proceed to Checkout
            <ArrowRight :size="20" />
          </button>
          
          <!-- Continue shopping -->
          <button class="btn-continue" @click="close">
            Continue Shopping
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X, Edit, Trash2, ArrowRight } from 'lucide-vue-next';
import ThreePreview from './ThreePreview.vue';
import ProductCard from './ProductCard.vue';
import { useCart } from '@/composables/useCart';
import { useRecommendations } from '@/composables/useRecommendations';

const { 
  isOpen, 
  close, 
  items, 
  itemCount, 
  subtotal, 
  total,
  updateQuantity,
  removeItem,
} = useCart();

const { recommendations } = useRecommendations(computed(() => 
  items.value.map(i => i.productId)
));

async function editDesign(designId: string) {
  // Save current cart state
  await saveCartState();
  
  // Navigate to editor
  window.location.href = `/editor?designId=${designId}&returnTo=/cart`;
}

async function goToCheckout() {
  // Ensure all designs are synced
  await syncPendingDesigns();
  
  // Navigate to Shopify checkout
  window.location.href = '/checkout';
}
</script>
```

---

## 🎯 14. FINAL ARCHITECTURE DIAGRAM

```
┌──────────────────────────────────────────────────────────────────┐
│                    CUSTOMER FLOW                                  │
│                                                                   │
│  1. Product Page                                                  │
│     ├─ gsb-shortcode.js loads                                    │
│     ├─ Detects product mapping                                   │
│     └─ Renders "Customize" button                                │
│          │                                                        │
│          ▼                                                        │
│  2. Initialize Session                                            │
│     ├─ Generate device fingerprint                               │
│     ├─ Create session ID                                         │
│     └─ POST /api/guest/session → guestToken                     │
│          │                                                        │
│          ▼                                                        │
│  3. Editor Opens                                                  │
│     ├─ Load from IndexedDB (if returning)                        │
│     ├─ Initialize Fabric.js canvas                               │
│     ├─ Connect WebSocket (if authenticated)                      │
│     └─ Start autosave (IndexedDB + backend)                      │
│          │                                                        │
│          ▼                                                        │
│  4. User Customizes                                               │
│     ├─ Add text/images (drag & drop)                             │
│     ├─ Apply filters/effects                                     │
│     ├─ Real-time preview (3D if available)                       │
│     └─ Autosave every 2s → IndexedDB                            │
│          │                                                        │
│          ▼                                                        │
│  5. Add to Cart Click                                             │
│     ├─ Sync to backend (POST /api/guest/designs/batch)          │
│     ├─ Generate preview (PNG, 72 DPI)                            │
│     ├─ Compress snapshot (LZ-string)                             │
│     └─ Store guestToken in sessionStorage                        │
│          │                                                        │
│          ▼                                                        │
│  6. Cart API Integration                                          │
│     ├─ Try: Shopify Cart API (GraphQL)                           │
│     ├─ Fallback: /cart/add.js (Ajax)                            │
│     └─ Last resort: Form submission                              │
│          │                                                        │
│          ▼                                                        │
│  7. Cart Page                                                     │
│     ├─ Show design preview (2D/3D toggle)                        │
│     ├─ "Edit" button → back to editor                            │
│     ├─ AI recommendations (similar products)                     │
│     └─ Bundle upsell                                              │
│          │                                                        │
│          ▼                                                        │
│  8. Checkout                                                      │
│     ├─ Shopify native checkout                                   │
│     ├─ Design properties in line item                            │
│     └─ Preview thumbnail visible                                 │
│          │                                                        │
│          ▼                                                        │
│  9. Order Complete (Webhook)                                      │
│     ├─ Extract design ID from properties                         │
│     ├─ Update design status → APPROVED                           │
│     ├─ Create Order + OrderLineItem                              │
│     ├─ Generate production files (PDF, SVG)                      │
│     └─ Send to fulfillment                                       │
│                                                                   │
│  [OPTIONAL] User Registers                                        │
│     ├─ POST /api/designs/merge-guest                             │
│     ├─ Transfer guest designs to user account                    │
│     ├─ Resolve conflicts (manual or automatic)                   │
│     └─ Enable cloud sync (WebSocket)                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 💎 15. KEY TECHNOLOGIES EXPLAINED

### **Why Fabric.js over Konva?**

```typescript
// Fabric.js advantages:
✅ Better filter support (brightness, contrast, blur, etc.)
✅ Built-in serialization/deserialization
✅ Group management (easier nesting)
✅ Better text rendering
✅ SVG import/export
✅ Active development (2024)

// Example: Advanced filters
import { fabric } from 'fabric';

const image = new fabric.Image(imageElement);

// Apply filters
image.filters = [
  new fabric.Image.filters.Brightness({ brightness: 0.2 }),
  new fabric.Image.filters.Contrast({ contrast: 0.3 }),
  new fabric.Image.filters.Saturation({ saturation: 0.5 }),
  new fabric.Image.filters.Blur({ blur: 0.1 }),
];

image.applyFilters();
canvas.add(image);
```

### **Why Yjs for Real-time?**

```typescript
// Yjs CRDT advantages:
✅ Conflict-free merging (no "your changes were overwritten")
✅ Offline-first (IndexedDB persistence)
✅ Small network payload (<1KB for most changes)
✅ Undo/redo built-in
✅ Compatible with any data structure
✅ Proven at scale (used by Figma, Notion)

// Example: Shared design state
const ydoc = new Y.Doc();
const yitems = ydoc.getArray('items');

// Add item
yitems.push([{ 
  id: 'text-1', 
  type: 'text', 
  content: 'Hello' 
}]);

// All connected clients see this change instantly
// Conflicts resolved automatically using CRDT algorithm
```

### **Why IndexedDB over localStorage?**

```typescript
// IndexedDB advantages:
✅ No 5MB limit (can store GBs)
✅ Async API (doesn't block UI)
✅ Structured storage (indexes, queries)
✅ Transactional (ACID guarantees)
✅ Works in Web Workers
✅ Better for large objects (designs)

// Example: Complex queries
const tx = db.transaction('designs', 'readonly');
const index = tx.objectStore('designs').index('createdAt');

// Get designs from last 7 days
const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const recent = await index.getAll(IDBKeyRange.lowerBound(weekAgo));
```

### **Why Device Fingerprinting?**

```typescript
// Device fingerprinting advantages:
✅ Survives cookie deletion
✅ Works in incognito mode (with limitations)
✅ Privacy-safe (no PII)
✅ Cross-browser stability
✅ Enables guest session continuity

// Techniques:
- Canvas fingerprinting (most stable)
- WebGL fingerprinting
- Audio context fingerprinting
- Screen resolution + timezone
- Hardware concurrency
- Font detection

// Note: Use ethically, respect privacy
```

---

## 📋 16. IMPLEMENTATION CHECKLIST

### **Guest Session System**

- [ ] Device fingerprinting implementation
- [ ] IndexedDB schema creation
- [ ] Session persistence layer
- [ ] Cross-tab sync (BroadcastChannel)
- [ ] Offline queue (Service Worker)
- [ ] Backend guest API endpoints
- [ ] Guest → authenticated merge

### **Cart Integration**

- [ ] Shopify Cart API v2 integration
- [ ] Ajax API fallback
- [ ] Form submission fallback
- [ ] Design compression (LZ-string)
- [ ] Preview image optimization
- [ ] Cart drawer UI
- [ ] Edit-in-cart functionality
- [ ] 3D preview in cart

### **Performance**

- [ ] Code splitting (editor lazy load)
- [ ] Image lazy loading + blurhash
- [ ] Service Worker + PWA
- [ ] Background sync
- [ ] IndexedDB caching
- [ ] CDN integration

### **Testing**

- [ ] Unit tests (Vitest)
- [ ] E2E tests (Playwright)
- [ ] Load testing (k6)
- [ ] Cross-browser testing
- [ ] Mobile testing

---

## 💰 17. COST ESTIMATE (Focused Scope)

### **Development (4 weeks)**
```
Senior Frontend Developer (2 weeks): $8,000
Senior Backend Developer (2 weeks):  $8,000
QA Engineer (1 week):                $2,000
DevOps (infrastructure):             $2,000
TOTAL:                               $20,000
```

### **Infrastructure (Monthly)**
```
AWS (small footprint):      $150/mo
Cloudflare (Pro):           $20/mo
Redis (Upstash):            $10/mo
R2 Storage (100GB):         $3/mo
Monitoring (basic):         $50/mo
TOTAL:                      $233/mo
```

### **One-time Costs**
```
Design/UX:          $2,000
Security audit:     $3,000
Documentation:      $1,000
TOTAL:              $6,000
```

### **GRAND TOTAL: $26K + $233/month**

---

## ✅ 18. SUCCESS CRITERIA

```typescript
const successMetrics = {
  performance: {
    editorLoadTime: '<1.5s',
    cartAddTime: '<500ms',
    offlineSupport: true,
    pwaCacheHitRate: '>80%',
  },
  
  reliability: {
    cartSuccessRate: '>99%',
    dataLossRate: '<0.01%',
    syncConflicts: '<1%',
  },
  
  ux: {
    guestToAuthConversion: '>30%',
    designEditInCart: '>40%',
    cartAbandonmentRate: '<60%',
  },
  
  business: {
    avgOrderValue: '>$50',
    customizationRate: '>60%',
    repeatPurchaseRate: '>25%',
  },
};
```

---

## 🎓 FINAL RECOMMENDATION

### **EN İLERİ SEVİYE TEKNOLOJİLER:**

✅ **Session:** Device fingerprinting + IndexedDB + JWT  
✅ **Storage:** IndexedDB + Service Worker + Background Sync  
✅ **Real-time:** Yjs CRDT + WebSocket (authenticated users)  
✅ **Canvas:** Fabric.js 6.0 (better than Konva for filters)  
✅ **Cart:** Shopify Cart API v2 (GraphQL) with fallbacks  
✅ **Performance:** PWA + CDN + lazy loading + blurhash  
✅ **AI:** OpenAI for recommendations  

### **IMPLEMENTATION TIMELINE:**

```
Week 1-2:  Guest session + IndexedDB storage
Week 3-4:  Cart API integration + UI
Week 5:    Testing + optimization
Week 6:    Production deployment

TOTAL: 6 weeks, $26K budget
```

**Bu stack ile guest + authenticated users için world-class customize experience sağlayabilirsiniz!** 🚀



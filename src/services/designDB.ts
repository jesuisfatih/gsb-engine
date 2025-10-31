/**
 * IndexedDB Design Storage (Dexie.js)
 * Local-first design persistence
 */

import Dexie, { Table } from 'dexie';

export interface LocalDesign {
  id?: number; // Auto-increment
  designId: string; // Unique design ID
  productGid: string;
  variantGid: string;
  snapshot: any; // Full design data
  previewDataURL?: string; // Base64 preview (temporary)
  status: 'draft' | 'saving' | 'saved' | 'error';
  anonymousId?: string;
  sessionId?: string;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number; // Last backend sync
}

export class DesignDatabase extends Dexie {
  designs!: Table<LocalDesign, number>;

  constructor() {
    super('GSBDesigns');
    
    this.version(1).stores({
      designs: '++id, designId, productGid, variantGid, status, createdAt, updatedAt, anonymousId',
    });
  }
}

// Singleton instance
export const db = new DesignDatabase();

/**
 * Save design to IndexedDB
 */
export async function saveDesignLocal(design: Omit<LocalDesign, 'id'>): Promise<number> {
  return await db.designs.add(design);
}

/**
 * Update design in IndexedDB
 */
export async function updateDesignLocal(designId: string, updates: Partial<LocalDesign>): Promise<number> {
  return await db.designs.where('designId').equals(designId).modify(updates);
}

/**
 * Get design from IndexedDB
 */
export async function getDesignLocal(designId: string): Promise<LocalDesign | undefined> {
  return await db.designs.where('designId').equals(designId).first();
}

/**
 * List all local designs
 */
export async function listLocalDesigns(filters?: {
  productGid?: string;
  variantGid?: string;
  status?: string;
}): Promise<LocalDesign[]> {
  let query = db.designs.orderBy('updatedAt').reverse();
  
  if (filters?.productGid) {
    query = query.filter(d => d.productGid === filters.productGid);
  }
  
  if (filters?.variantGid) {
    query = query.filter(d => d.variantGid === filters.variantGid);
  }
  
  if (filters?.status) {
    query = query.filter(d => d.status === filters.status);
  }
  
  return await query.toArray();
}

/**
 * Delete design from IndexedDB
 */
export async function deleteDesignLocal(designId: string): Promise<void> {
  await db.designs.where('designId').equals(designId).delete();
}

/**
 * Get designs that need syncing
 */
export async function getUnsyncedDesigns(): Promise<LocalDesign[]> {
  const now = Date.now();
  const staleThreshold = now - 30000; // 30 seconds
  
  return await db.designs
    .filter(d => {
      return (
        (d.status === 'draft' || d.status === 'saving') &&
        (!d.syncedAt || d.syncedAt < staleThreshold)
      );
    })
    .toArray();
}


/**
 * Design CRUD Endpoints
 * Core design persistence and management
 */

import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { uploadDesignPreview, uploadDesignHighRes, uploadDesignJSON, uploadFromDataURL } from '../services/r2Upload';
import { cacheDesign, getCachedDesign, deleteCachedDesign } from '../services/redisCache';
import { createDraftOrder, fetchProduct } from '../services/shopifyAdmin';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const saveDesignSchema = z.object({
  designId: z.string().optional(), // If updating existing
  anonymousId: z.string().optional(),
  sessionId: z.string().optional(),
  tenantId: z.string(),
  shopDomain: z.string().optional(),
  productGid: z.string(),
  variantGid: z.string(),
  productHandle: z.string().optional(),
  snapshot: z.any(), // Design data
  metadata: z.object({
    itemCount: z.number().optional(),
    sheetSize: z.string().optional(),
    technique: z.string().optional(),
    utilization: z.number().optional(),
  }).optional(),
});

const uploadPreviewSchema = z.object({
  designId: z.string(),
  imageData: z.string(), // base64 data URL
});

/**
 * POST /api/designs/save
 * Save or update design
 */
router.post('/save', async (req, res) => {
  try {
    const data = saveDesignSchema.parse(req.body);
    
    // Generate design ID if new
    const designId = data.designId || `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Upsert design
    const design = await prisma.design.upsert({
      where: { designId },
      create: {
        designId,
        tenantId: data.tenantId,
        shopDomain: data.shopDomain,
        productGid: data.productGid,
        variantGid: data.variantGid,
        productHandle: data.productHandle,
        snapshot: data.snapshot,
        anonymousId: data.anonymousId,
        sessionId: data.sessionId,
        itemCount: data.metadata?.itemCount,
        sheetSize: data.metadata?.sheetSize,
        technique: data.metadata?.technique,
        utilization: data.metadata?.utilization,
        status: 'draft',
      },
      update: {
        snapshot: data.snapshot,
        itemCount: data.metadata?.itemCount,
        sheetSize: data.metadata?.sheetSize,
        technique: data.metadata?.technique,
        utilization: data.metadata?.utilization,
        updatedAt: new Date(),
      },
    });

    // Cache in Redis (hot data)
    await cacheDesign(designId, design, 3600); // 1 hour TTL

    console.log('[Design] Saved:', designId);

    res.json({
      success: true,
      designId,
      design: {
        id: design.id,
        designId: design.designId,
        status: design.status,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[Design] Save error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/designs/upload-preview
 * Upload preview image to R2
 */
router.post('/upload-preview', async (req, res) => {
  try {
    const { designId, imageData } = uploadPreviewSchema.parse(req.body);
    
    // Upload to R2
    const result = await uploadFromDataURL(imageData, designId);
    
    // Update design record
    await prisma.design.update({
      where: { designId },
      data: {
        previewUrl: result.url,
        updatedAt: new Date(),
      },
    });

    // Update cache
    await deleteCachedDesign(designId);

    console.log('[Design] Preview uploaded:', result.url);

    res.json({
      success: true,
      previewUrl: result.url,
    });
  } catch (error: any) {
    console.error('[Design] Preview upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/designs/finalize
 * Finalize design and create all assets
 */
router.post('/finalize', async (req, res) => {
  try {
    const { designId, previewDataURL, highResDataURL } = req.body;
    
    if (!designId) {
      return res.status(400).json({ error: 'designId required' });
    }

    const uploads = await Promise.all([
      previewDataURL ? uploadFromDataURL(previewDataURL, designId) : null,
      highResDataURL ? uploadFromDataURL(highResDataURL, `${designId}_highres`) : null,
    ]);

    const previewUrl = uploads[0]?.url;
    const downloadUrl = uploads[1]?.url;

    // Update design
    const design = await prisma.design.update({
      where: { designId },
      data: {
        status: 'completed',
        previewUrl,
        downloadUrl,
        completedAt: new Date(),
      },
    });

    // Clear cache
    await deleteCachedDesign(designId);

    console.log('[Design] Finalized:', designId);

    res.json({
      success: true,
      designId,
      previewUrl,
      downloadUrl,
      design,
    });
  } catch (error: any) {
    console.error('[Design] Finalize error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/designs/:designId
 * Get design by ID
 */
router.get('/:designId', async (req, res) => {
  try {
    const { designId } = req.params;
    
    // Check cache first
    let design = await getCachedDesign(designId);
    
    if (!design) {
      // Cache miss, fetch from DB
      design = await prisma.design.findUnique({
        where: { designId },
      });
      
      if (design) {
        // Warm cache
        await cacheDesign(designId, design);
      }
    }

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json({
      success: true,
      design,
    });
  } catch (error: any) {
    console.error('[Design] Get error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/designs
 * List designs (with filters)
 */
router.get('/', async (req, res) => {
  try {
    const { anonymousId, sessionId, customerId, productGid, status, limit = 50 } = req.query;
    
    const where: any = {};
    if (anonymousId) where.anonymousId = anonymousId as string;
    if (sessionId) where.sessionId = sessionId as string;
    if (customerId) where.customerId = BigInt(customerId as string);
    if (productGid) where.productGid = productGid as string;
    if (status) where.status = status as string;

    const designs = await prisma.design.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      select: {
        id: true,
        designId: true,
        productGid: true,
        variantGid: true,
        previewUrl: true,
        status: true,
        itemCount: true,
        sheetSize: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      designs,
      count: designs.length,
    });
  } catch (error: any) {
    console.error('[Design] List error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/designs/create-draft-order
 * Create Shopify draft order with design
 */
router.post('/create-draft-order', async (req, res) => {
  try {
    const { designId, shop } = req.body;
    
    if (!designId || !shop) {
      return res.status(400).json({ error: 'designId and shop required' });
    }

    // Get design from DB
    const design = await prisma.design.findUnique({
      where: { designId },
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    // Extract numeric variant ID from GID
    const variantId = design.variantGid.split('/').pop() || '';

    // Create draft order
    const draftOrder = await createDraftOrder({
      shop,
      variantId,
      designId: design.designId,
      previewUrl: design.previewUrl || '',
      properties: {
        'Sheet Size': design.sheetSize || '',
        'Item Count': design.itemCount?.toString() || '',
        'Technique': design.technique || '',
      },
      anonymousId: design.anonymousId || undefined,
    });

    // Update design with draft order ID
    await prisma.design.update({
      where: { designId },
      data: {
        draftOrderId: BigInt(draftOrder.id),
      },
    });

    console.log('[Design] Draft order created:', draftOrder.id);

    res.json({
      success: true,
      draftOrderId: draftOrder.id,
      invoiceUrl: draftOrder.invoice_url,
    });
  } catch (error: any) {
    console.error('[Design] Draft order error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/shopify/product
 * Fetch product details from Shopify
 */
router.get('/shopify/product', async (req, res) => {
  try {
    const { productGid, shop } = req.query;
    
    if (!productGid || !shop) {
      return res.status(400).json({ error: 'productGid and shop required' });
    }

    const product = await fetchProduct(productGid as string, shop as string);

    res.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('[Shopify] Product fetch error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

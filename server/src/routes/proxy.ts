import express, { Router } from "express";
import { z } from "zod";
import type { $Enums } from "../../src/generated/prisma/client";
import { env } from "../env";
import { saveDesignToShopifyMetaobject } from "../services/shopifyMetaobjects";
import { createShopifyFilesService } from "../services/shopifyFilesService";
import { createDesignImageService } from "../services/designImageService";
import path from "path";
import fs from "fs";

const checkoutSchema = z.object({
  designId: z.string().optional(),
  productGid: z.string().min(1).optional(), // More lenient
  productTitle: z.string().optional(),
  quantity: z.number().int().positive().default(1).optional(),
  variantId: z.string().optional(),
  technique: z.string().optional(),
  surfaceId: z.string().optional(),
  previewUrl: z.string().optional(),
  sheetWidthMm: z.number().positive().optional(),
  sheetHeightMm: z.number().positive().optional(),
  printAreaIn2: z.number().nonnegative().optional(),
  colorCount: z.number().int().nonnegative().optional(),
  dpiFloor: z.number().nonnegative().optional(),
  lineItemProperties: z.record(z.string(), z.string()).optional(),
  note: z.string().max(500).optional(),
  returnUrl: z.string().optional(),
  designSnapshot: z.any().optional(),
}).passthrough(); // Allow extra fields

const orderLineSchema = z.object({
  designId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  technique: z.string().optional(),
  surfaceId: z.string().optional(),
  variantId: z.string().optional(),
  properties: z.record(z.string(), z.string()).optional(),
});

const orderCompleteSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().optional(),
  placedAt: z.coerce.date().optional(),
  currency: z.string().length(3).optional(),
  subtotal: z.number().nonnegative().optional(),
  lineItems: z.array(orderLineSchema).min(1),
});

const SUBMITTED_STATUS: $Enums.DesignStatus = "SUBMITTED";
const SHOPIFY_STORE_DOMAIN = env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_TOKEN = env.SHOPIFY_STOREFRONT_TOKEN;
const SHOPIFY_STOREFRONT_API_VERSION = env.SHOPIFY_STOREFRONT_API_VERSION ?? "2024-04";

function normalizePropertyValue(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const str = String(value);
  return str.length > 240 ? `${str.slice(0, 237)}...` : str;
}

async function createShopifyCart(options: {
  variantId: string;
  quantity: number;
  properties: Record<string, string>;
  note?: string;
}) {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) return null;
  const { variantId, quantity, properties, note } = options;
  if (!variantId || !variantId.startsWith("gid://")) return null;

  const domain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//i, "");
  const endpoint = `https://${domain}/admin/api/${SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`;

  const customAttributes = Object.entries(properties).map(([key, value]) => ({
    key,
    value,
  }));

  const mutation = `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `;

  const body = JSON.stringify({
    query: mutation,
    variables: {
      input: {
        lines: [
          {
            quantity,
            merchandiseId: variantId,
            attributes: customAttributes,
          },
        ],
        note,
      },
    },
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify cartCreate failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const errors = payload?.data?.cartCreate?.userErrors ?? [];
  if (Array.isArray(errors) && errors.length) {
    const first = errors[0];
    throw new Error(`Shopify cartCreate error: ${first?.message ?? "unknown error"}`);
  }

  const cart = payload?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) return null;
  return { checkoutUrl: cart.checkoutUrl, cartId: cart.id ?? null };
}

export const proxyRouter = Router();

/**
 * GET /editor (mounted at /apps/gsb so full path is /apps/gsb/editor)
 * Serve editor page via App Proxy (stays on Shopify domain)
 */
proxyRouter.get("/editor", async (req, res) => {
  try {
    console.log('[proxy] Editor requested via App Proxy');
    
    // Serve the built frontend
    const distPath = path.join(process.cwd(), "dist", "index.html");
    
    if (fs.existsSync(distPath)) {
      let html = fs.readFileSync(distPath, "utf-8");
      
      // Fix all asset paths to include /apps/gsb prefix
      html = html.replace(/href="\/assets\//g, 'href="/apps/gsb/assets/');
      html = html.replace(/src="\/assets\//g, 'src="/apps/gsb/assets/');
      html = html.replace(/href="\/loader\.css"/g, 'href="/apps/gsb/loader.css"');
      html = html.replace(/href="\/favicon\.ico"/g, 'href="/apps/gsb/favicon.ico"');
      html = html.replace(/href="\/manifest\.json"/g, 'href="/apps/gsb/manifest.json"');
      html = html.replace(/href="\/icon-192\.png"/g, 'href="/apps/gsb/icon-192.png"');
      // Fix service worker - both quoted and single-quoted versions
      html = html.replace(/register\(['"]\/sw\.js['"]\)/g, "register('/apps/gsb/sw.js')");
      
      // Inject Vite base path configuration BEFORE anything else - MUST BE FIRST!
      // Find </title> or first <script> tag, whichever comes first
      const titleMatch = html.match(/<\/title>/i);
      const scriptMatch = html.match(/<script/i);
      
      let injectPosition = titleMatch ? titleMatch.index! + 8 : 
                           (scriptMatch ? scriptMatch.index! : html.indexOf('<head>') + 6);
      
      const injectionScript = `
<script>
// CRITICAL: Set these FIRST, before any other scripts or Vue app loads
(function() {
  window.__vite_plugin_config__ = { base: '/apps/gsb/' };
  window.__GSB_EMBED_MODE__ = true;
  window.__GSB_BASE_PATH__ = '/apps/gsb';
  window.__GSB_DISABLE_SW__ = true;
  console.log('[GSB Inject] ✅ Variables set IMMEDIATELY - embedMode:', window.__GSB_EMBED_MODE__, 'basePath:', window.__GSB_BASE_PATH__);
  console.log('[GSB Inject] window location:', window.location.href);
})();
</script>`;
      
      html = html.slice(0, injectPosition) + injectionScript + html.slice(injectPosition);
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Frame-Options', 'ALLOW-FROM https://*.myshopify.com');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com");
      res.send(html);
    } else {
      console.error('[proxy] dist/index.html not found');
      res.status(404).send('Editor not found. Please build the frontend first.');
    }
  } catch (error) {
    console.error('[proxy] Editor serve error:', error);
    res.status(500).send('Failed to load editor');
  }
});

/**
 * GET /manifest.json - Serve PWA manifest with corrected paths
 */
proxyRouter.get("/manifest.json", (req, res) => {
  try {
    const manifestPath = path.join(process.cwd(), "dist", "manifest.json");
    
    if (fs.existsSync(manifestPath)) {
      let manifest = fs.readFileSync(manifestPath, "utf-8");
      
      // Fix all paths to include /apps/gsb prefix
      manifest = manifest.replace(/"\/icon-/g, '"/apps/gsb/icon-');
      manifest = manifest.replace(/"\/screenshots\//g, '"/apps/gsb/screenshots/');
      manifest = manifest.replace(/"\/editor/g, '"/apps/gsb/editor');
      manifest = manifest.replace(/"\/designs/g, '"/apps/gsb/designs');
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(manifest);
    } else {
      res.status(404).send('Manifest not found');
    }
  } catch (error) {
    console.error('[proxy] Manifest serve error:', error);
    res.status(500).send('Failed to load manifest');
  }
});

/**
 * GET /sw.js - Serve Service Worker with corrected paths
 */
proxyRouter.get("/sw.js", (req, res) => {
  try {
    const swPath = path.join(process.cwd(), "dist", "sw.js");
    
    if (fs.existsSync(swPath)) {
      let sw = fs.readFileSync(swPath, "utf-8");
      
      // Fix all paths to include /apps/gsb prefix
      sw = sw.replace(/'\/'/g, "'/apps/gsb/'");
      sw = sw.replace(/'\/editor'/g, "'/apps/gsb/editor'");
      sw = sw.replace(/'\/manifest\.json'/g, "'/apps/gsb/manifest.json'");
      sw = sw.replace(/'\/icon-/g, "'/apps/gsb/icon-");
      
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(sw);
    } else {
      res.status(404).send('Service Worker not found');
    }
  } catch (error) {
    console.error('[proxy] Service Worker serve error:', error);
    res.status(500).send('Failed to load service worker');
  }
});

/**
 * Serve all static files with express.static
 * Note: proxyRouter is already mounted at /apps/gsb in app.ts
 * So this serves: /apps/gsb/assets/*, /apps/gsb/*.js, etc.
 */
proxyRouter.use(express.static(path.join(process.cwd(), "dist"), {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log('[proxy] Serving static file:', filePath);
  }
}));

/**
 * POST /api/proxy/cart/prepare
 * NEW: Simple endpoint - save design, return ID + preview URL
 */
proxyRouter.post("/cart/prepare", async (req, res, next) => {
  try {
    console.log('[cart/prepare] Request received');
    
    const { prisma, tenantId, user } = req.context;
    const { snapshot, previewDataUrl, shopifyProductGid, shopifyVariantId, quantity } = req.body;
    
    // 1. Save design to database
    const design = await prisma.designDocument.create({
      data: {
        tenantId: tenantId || undefined,
        userId: user?.id || undefined,
        status: 'DRAFT',
        name: `${snapshot.productSlug || 'Design'} - ${snapshot.surfaceId || 'Custom'}`,
        snapshot: snapshot.items || snapshot,
        productSlug: snapshot.productSlug || 'custom',
        surfaceSlug: snapshot.surfaceId || 'custom',
        printTech: snapshot.printTech || 'dtf',
        color: snapshot.color || null,
        sheetWidthPx: snapshot.sheetWidthPx || 800,
        sheetHeightPx: snapshot.sheetHeightPx || 600,
        metadata: {
          source: user?.id ? 'authenticated' : 'guest',
          shopifyProductGid,
          shopifyVariantId,
          createdAt: new Date().toISOString(),
        },
      },
    });
    
    console.log('[cart/prepare] Design saved:', design.id);
    
    // 2. Generate URLs (Rakip gibi sistem)
    const baseUrl = process.env.PUBLIC_URL || 'https://app.gsb-engine.dev';
    const thumbnailUrl = `${baseUrl}/api/designs/${design.id}/thumbnail`;
    const editUrl = `${baseUrl}/editor?designId=${design.id}`;
    const printReadyUrl = `${baseUrl}/api/designs/${design.id}/print-ready`;
    
    // 3. Process preview (if base64, save as file)
    let previewUrl = previewDataUrl;
    
    if (previewDataUrl?.startsWith('data:image')) {
      try {
        const base64Data = previewDataUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save to uploads directory
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'designs', design.id);
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Save multiple versions
        const previewFilename = 'preview.png';
        const thumbnailFilename = 'thumbnail.png';
        
        await fs.writeFile(path.join(uploadsDir, previewFilename), buffer);
        
        // Create thumbnail (50% size)
        const sharp = await import('sharp');
        const thumbnailBuffer = await sharp.default(buffer)
          .resize({ width: Math.floor(buffer.length / 2), fit: 'inside' })
          .png()
          .toBuffer();
        await fs.writeFile(path.join(uploadsDir, thumbnailFilename), thumbnailBuffer);
        
        previewUrl = `${baseUrl}/uploads/designs/${design.id}/${previewFilename}`;
        
        console.log('[cart/prepare] Images saved:', { previewUrl, thumbnailUrl });
      } catch (imageError) {
        console.warn('[cart/prepare] Image save failed:', imageError);
      }
    }
    
    // 4. Update design with URLs
    await prisma.designDocument.update({
      where: { id: design.id },
      data: {
        previewUrl,
        thumbnailUrl,
        editUrl,
        printReadyUrl,
      },
    });
    
    res.json({
      designId: design.id,
      previewUrl,
      thumbnailUrl,
      editUrl,
      printReadyUrl,
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/proxy/cart
 * Add design to cart (existing implementation)
 */
proxyRouter.post("/cart", async (req, res, next) => {
  try {
    console.log('[proxy/cart] Received request body:', JSON.stringify(req.body, null, 2));
    
    // Validate with detailed error logging
    const validationResult = checkoutSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('[proxy/cart] ❌ Validation failed:');
      console.error('Issues:', validationResult.error.issues);
      console.error('Full error:', JSON.stringify(validationResult.error, null, 2));
      return res.status(422).json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      });
    }
    
    const payload = validationResult.data;
    console.log('[proxy/cart] ✅ Validation passed! Keys:', Object.keys(payload));
    
    const { prisma, tenantId } = req.context;

    let design: any;
    
    if (payload.designId) {
      const existing = await prisma.designDocument.findUnique({
        where: { id: payload.designId },
      });
      
      if (existing) {
        const previewUrl = payload.previewUrl ?? existing.previewUrl ?? undefined;
        design = await prisma.designDocument.update({
          where: { id: existing.id },
          data: {
            status: SUBMITTED_STATUS,
            submittedAt: existing.submittedAt ?? new Date(),
            previewUrl,
            autosaveSnapshot: null,
            autosaveAt: null,
          },
        });
      }
    }
    
    if (!design) {
      const snapshot = payload.designSnapshot || {};
      
      // Ensure we have minimum required data
      if (!snapshot.items || snapshot.items.length === 0) {
        console.error('[proxy/cart] No design items in snapshot!');
        return res.status(400).json({ 
          error: 'No design items provided. Please create a design before checkout.' 
        });
      }
      
      // Anonymous users need a default tenant
      let effectiveTenantId = tenantId;
      if (!effectiveTenantId) {
        // Get first tenant as default for anonymous designs
        const defaultTenant = await prisma.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        
        if (!defaultTenant) {
          console.error('[proxy/cart] No tenant found in database!');
          return res.status(500).json({ 
            error: 'System misconfiguration - please contact support.' 
          });
        }
        
        effectiveTenantId = defaultTenant.id;
        console.log('[proxy/cart] Using default tenant for anonymous user:', effectiveTenantId);
      }
      
      // Create design first (to get ID)
      design = await prisma.designDocument.create({
        data: {
          tenantId: effectiveTenantId,
          status: SUBMITTED_STATUS,
          submittedAt: new Date(),
          previewUrl: payload.previewUrl,
          name: `Anonymous Design - ${new Date().toLocaleString()}`,
          snapshot: snapshot.items || [],
          productSlug: snapshot.productSlug || 'canvas-poster',
          surfaceSlug: snapshot.surfaceId || payload.surfaceId || 'canvas-front',
          color: snapshot.color || null,
          printTech: snapshot.printTech || payload.technique || 'dtf',
          sheetWidthPx: snapshot.sheetWidthPx || 2400,
          sheetHeightPx: snapshot.sheetHeightPx || 3000,
          metadata: {
            source: 'anonymous-checkout',
            originalProductSlug: payload.productGid,
            shopifyVariantId: payload.variantId,
            createdAt: new Date().toISOString(),
          },
        },
      });
      
      // Generate and upload images to Shopify CDN
      let thumbnailUrl: string | null = null;
      let printReadyUrl: string | null = null;
      
      if (payload.previewUrl && process.env.SHOPIFY_SHOP_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
        try {
          console.log('[proxy/cart] 🖼️ Generating images...');
          const imageService = createDesignImageService();
          const shopifyService = createShopifyFilesService();
          
          // Generate thumbnail + print-ready images
          const imageSet = await imageService.generateImageSet(payload.previewUrl, {
            widthPx: snapshot.sheetWidthPx || 2400,
            heightPx: snapshot.sheetHeightPx || 3000,
            widthMm: payload.sheetWidthMm,
            heightMm: payload.sheetHeightMm,
          });
          
          const sizes = await imageService.getFileSizes(imageSet);
          console.log('[proxy/cart] 📦 Image sizes:', sizes);
          
          // Upload thumbnail to Shopify CDN
          thumbnailUrl = await shopifyService.uploadImage(
            imageSet.thumbnail,
            `design-${design.id}-thumbnail.jpg`,
            `Design ${design.id} preview`
          );
          
          // Upload print-ready to Shopify CDN
          printReadyUrl = await shopifyService.uploadImage(
            imageSet.printReady,
            `design-${design.id}-print-ready.png`,
            `Design ${design.id} print-ready`
          );
          
          console.log('[proxy/cart] ✅ Images uploaded to Shopify CDN');
          console.log('[proxy/cart] 📷 Thumbnail:', thumbnailUrl);
          console.log('[proxy/cart] 🖨️ Print-ready:', printReadyUrl);
        } catch (uploadError) {
          console.error('[proxy/cart] ❌ Image upload failed:', uploadError);
          // Fallback to local URLs if upload fails
          const baseUrl = process.env.PUBLIC_URL || 'https://app.gsb-engine.dev';
          thumbnailUrl = `${baseUrl}/api/designs/${design.id}/thumbnail`;
          printReadyUrl = `${baseUrl}/api/designs/${design.id}/print-ready`;
        }
      } else {
        // Fallback if no Shopify credentials
        const baseUrl = process.env.PUBLIC_URL || 'https://app.gsb-engine.dev';
        thumbnailUrl = `${baseUrl}/api/designs/${design.id}/thumbnail`;
        printReadyUrl = `${baseUrl}/api/designs/${design.id}/print-ready`;
      }
      
      // Generate edit URL
      const baseUrl = process.env.PUBLIC_URL || 'https://app.gsb-engine.dev';
      const editUrl = `${baseUrl}/apps/gsb/editor?designId=${design.id}`;
      
      // Update with URLs
      design = await prisma.designDocument.update({
        where: { id: design.id },
        data: { thumbnailUrl, editUrl, printReadyUrl },
      });
      
      console.log('[proxy/cart] ✅ Created anonymous design:', design.id);
      console.log('[proxy/cart] ✅ URLs:', { thumbnailUrl, editUrl, printReadyUrl });
    }

    if (design.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: design.tenantId },
        select: { settings: true },
      });
      
      const shopifyDomain = (tenant?.settings as any)?.shopify?.domain;
      const shopifyAccessToken = (tenant?.settings as any)?.shopify?.accessToken;
      
      if (shopifyDomain && shopifyAccessToken) {
        saveDesignToShopifyMetaobject(design, shopifyDomain, shopifyAccessToken)
          .then(result => {
            if (result) {
              console.log('[proxy] Design saved to Shopify metaobject:', result.handle);
            }
          })
          .catch(err => {
            console.warn('[proxy] Failed to save to Shopify metaobject:', err);
          });
      }
    }

    // ✅ Convert relative URLs to absolute for cart display
    let previewUrl = payload.previewUrl ?? design.previewUrl ?? undefined;
    if (previewUrl && previewUrl.startsWith('/uploads/')) {
      const baseUrl = process.env.PUBLIC_URL || 'https://app.gsb-engine.dev';
      previewUrl = `${baseUrl}${previewUrl}`;
      console.log('[proxy/cart] ✅ Converted relative URL to absolute:', previewUrl);
    }

    const previewAsset = previewUrl ?? design.previewUrl ?? `https://cdn.gsb.dev/mockups/${design.id}.png`;
    
    if (design.tenantId) {
      try {
        await prisma.designOutput.deleteMany({
          where: {
            designId: design.id,
            kind: { in: ['MOCKUP_2D', 'MOCKUP_3D'] },
          },
        });

        await prisma.designOutput.createMany({
          data: [
            {
              designId: design.id,
              tenantId: design.tenantId,
              kind: 'MOCKUP_2D',
              url: previewAsset,
              metadata: { mode: '2d', source: 'proxy.cart', generatedAt: new Date().toISOString() },
            },
            {
              designId: design.id,
              tenantId: design.tenantId,
              kind: 'MOCKUP_3D',
              url: `${previewAsset}?view=3d`,
              metadata: { mode: '3d', source: 'proxy.cart', generatedAt: new Date().toISOString() },
            },
          ],
        });
      } catch (outputError) {
        console.warn('[proxy] Failed to create design outputs:', outputError);
      }
    }

    const properties: Record<string, string> = {};
    const setProp = (key: string, value: unknown) => {
      const normalized = normalizePropertyValue(value);
      if (normalized !== undefined) {
        properties[key] = normalized;
      }
    };

    // ✅ RAKİP GİBİ SİSTEM - Shopify Order'da görünecek linkler
    setProp("_GSB_Design_ID", payload.designId || design.id);
    
    // Merchant Preview - HTML img tag (underscore ile başladığı için müşteriden gizlenir)
    if (design.thumbnailUrl) {
      setProp("_Preview", `<img src="${design.thumbnailUrl}" width="100" height="100" alt="Design Preview" />`);
    }
    
    // Raw URLs for other uses (use absolute previewUrl)
    setProp("_GSB_Preview_URL", design.thumbnailUrl || previewUrl || design.previewUrl);
    setProp("_GSB_Edit_URL", design.editUrl);
    setProp("_GSB_Print_Ready_URL", design.printReadyUrl);
    
    // Standard properties
    setProp("Design ID", payload.designId || design.id);
    setProp("Product", payload.productTitle);
    setProp("Surface ID", payload.surfaceId);
    setProp("Technique", payload.technique);
    // ✅ Use absolute URL if available (short), skip if too long (>255 chars)
    const finalPreviewUrl = previewUrl || design.previewUrl;
    setProp("Preview URL", finalPreviewUrl && finalPreviewUrl.length < 255 ? finalPreviewUrl : undefined);
    if (payload.sheetWidthMm && payload.sheetHeightMm) {
      const width = Math.round(payload.sheetWidthMm);
      const height = Math.round(payload.sheetHeightMm);
      setProp("Sheet Size (mm)", `${width} × ${height}`);
    }
    if (payload.printAreaIn2 !== undefined) {
      setProp("Print Area (in²)", payload.printAreaIn2.toFixed(1));
    }
    if (payload.colorCount !== undefined) {
      setProp("Color Count", payload.colorCount);
    }
    if (payload.dpiFloor !== undefined) {
      setProp("Min DPI", Math.round(payload.dpiFloor));
    }
    if (payload.returnUrl) {
      setProp("Return URL", payload.returnUrl);
    }
    if (payload.lineItemProperties) {
      for (const [key, value] of Object.entries(payload.lineItemProperties)) {
        setProp(key, value);
      }
    }

    // ✅ CRITICAL FIX: Convert GID to numeric variant ID
    // Shopify /cart/add expects numeric ID, not GID format
    const toNumericVariantId = (gid: string | undefined | null): string | null => {
      if (!gid) return null;
      if (gid.startsWith('gid://shopify/ProductVariant/')) {
        return gid.split('/').pop() || null;
      }
      return gid; // Already numeric
    };
    
    const numericVariantId = toNumericVariantId(payload.variantId);
    
    const searchParams = new URLSearchParams();
    if (numericVariantId) searchParams.set("id", numericVariantId);
    searchParams.set("quantity", String(payload.quantity));
    Object.entries(properties).forEach(([key, value]) => {
      if (value) searchParams.set(`properties[${key}]`, value);
    });

    const checkoutPath = numericVariantId
      ? `/cart/add?${searchParams.toString()}`
      : `/cart?${searchParams.toString()}`;

    let remoteCheckout: { checkoutUrl: string; cartId: string | null } | null = null;
    if (numericVariantId) {
      try {
        remoteCheckout = await createShopifyCart({
          variantId: numericVariantId, // ✅ Use numeric ID, not GID
          quantity: payload.quantity,
          properties,
          note: payload.note,
        });
      } catch (shopifyError) {
        console.warn("[proxy] Shopify cartCreate failed", shopifyError);
      }
    }

    const lineItem = {
      productGid: payload.productGid,
      variantId: payload.variantId ?? null,
      quantity: payload.quantity,
      properties,
    };

    console.log('[proxy/cart] ✅ Checkout prepared:', {
      designId: design.id,
      variantId: payload.variantId,
      checkoutUrl: remoteCheckout?.checkoutUrl ?? checkoutPath,
    });
    
    res.json({
      data: {
        designId: design.id,
        checkoutUrl: remoteCheckout?.checkoutUrl ?? checkoutPath,
        lineItem: {
          ...lineItem,
          cartId: remoteCheckout?.cartId ?? null,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ error: error.flatten() });
    }
    next(error);
  }
});

proxyRouter.post("/orders/complete", async (req, res, next) => {
  try {
    const { prisma, tenantId, user } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const payload = orderCompleteSchema.parse(req.body);

    const designs = await prisma.designDocument.findMany({
      where: {
        id: {
          in: payload.lineItems.map((item) => item.designId),
        },
        tenantId,
      },
    });

    const designMap = new Map(designs.map((design) => [design.id, design]));

    const missingDesign = payload.lineItems.find((item) => !designMap.has(item.designId));
    if (missingDesign) {
      return res.status(404).json({ error: `Design ${missingDesign.designId} not found for tenant` });
    }

    const jobs = [];

    for (const item of payload.lineItems) {
      const design = designMap.get(item.designId)!;

      if (design.status !== SUBMITTED_STATUS) {
        await prisma.designDocument.update({
          where: { id: design.id },
          data: {
            status: SUBMITTED_STATUS,
            submittedAt: design.submittedAt ?? new Date(),
          },
        });
      }

      const job = await prisma.job.create({
        data: {
          tenantId,
          
          designId: design.id,
          status: "QUEUED",
          supplierId: design.printTechniqueId ? undefined : null,
          printTechniqueId: design.printTechniqueId ?? undefined,
          notes: item.surfaceId ? `Surface: ${item.surfaceId}` : undefined,
          metadata: { orderId: payload.orderId,
            lineItem: {
              quantity: item.quantity,
              properties: item.properties ?? {},
              technique: item.technique ?? null,
              variantId: item.variantId ?? null,
            },
          },
        },
        include: {
          design: true,
        },
      });
      jobs.push(job);

      await prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: user?.id ?? null,
          event: "job.enqueue",
          entity: "Job",
          entityId: job.id,
          diff: {
            after: {
              status: job.status,
              orderId: job.orderId,
            },
          },
        },
      });

      await prisma.notification.create({
        data: {
          tenantId,
          kind: "job.queued",
          payload: {
            jobId: job.id,
            orderId: payload.orderId,
            
            designId: design.id,
            quantity: item.quantity,
          },
        },
      });
    }

    res.status(201).json({
      data: {
        
        jobs: jobs.map((job) => ({
          id: job.id,
          status: job.status,
          designId: job.designId,
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ error: error.flatten() });
    }
    next(error);
  }
});

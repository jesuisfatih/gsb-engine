import express, { Router } from "express";
import { z } from "zod";
import type { $Enums } from "../../src/generated/prisma/client";
import { env } from "../env";
import { saveDesignToShopifyMetaobject } from "../services/shopifyMetaobjects";
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
      
      // Inject Vite import.meta.env override for dynamic imports
      html = html.replace(
        '</head>',
        `<script>
          // Override Vite's base path for dynamic imports
          window.__vite_plugin_config__ = { base: '/apps/gsb/' };
          window.__GSB_EMBED_MODE__ = true;
          window.__GSB_BASE_PATH__ = '/apps/gsb';
          
          // Monkey-patch import() to fix dynamic import paths
          const originalImport = window.__vite_ssr_import__ || window.import;
          if (!window.__vite_patched__) {
            window.__vite_patched__ = true;
            const proxyImport = new Proxy(import, {
              apply(target, thisArg, argumentsList) {
                let [specifier] = argumentsList;
                if (typeof specifier === 'string' && specifier.startsWith('/assets/')) {
                  specifier = '/apps/gsb' + specifier;
                }
                return Reflect.apply(target, thisArg, [specifier]);
              }
            });
            // Note: Can't actually override import(), but we inject base path into Vite
          }
        </script></head>`
      );
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Frame-Options', 'ALLOW-FROM https://*.myshopify.com');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com");
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
        name: `${snapshot.productSlug} - ${snapshot.surfaceId}`,
        snapshot: snapshot.items || snapshot,
        productSlug: snapshot.productSlug,
        surfaceId: snapshot.surfaceId,
        printTech: snapshot.printTech,
        color: snapshot.color,
        sheetWidthPx: snapshot.sheetWidthPx,
        sheetHeightPx: snapshot.sheetHeightPx,
        metadata: {
          source: user?.id ? 'authenticated' : 'guest',
          shopifyProductGid,
          shopifyVariantId,
          createdAt: new Date().toISOString(),
        },
      },
    });
    
    console.log('[cart/prepare] Design saved:', design.id);
    
    // 2. Process preview (if base64, save as file)
    let previewUrl = previewDataUrl;
    
    if (previewDataUrl?.startsWith('data:image')) {
      try {
        const base64Data = previewDataUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save to uploads directory
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'previews');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const filename = `${design.id}.png`;
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, buffer);
        
        // Generate URL
        const baseUrl = process.env.PUBLIC_URL || 'https://app.gsb-engine.dev';
        previewUrl = `${baseUrl}/uploads/previews/${filename}`;
        
        // Update design
        await prisma.designDocument.update({
          where: { id: design.id },
          data: { previewUrl },
        });
        
        console.log('[cart/prepare] Preview saved:', previewUrl);
      } catch (imageError) {
        console.warn('[cart/prepare] Image save failed:', imageError);
      }
    }
    
    res.json({
      designId: design.id,
      previewUrl: previewUrl && previewUrl.length < 200 ? previewUrl : '',
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
    
    const payload = checkoutSchema.parse(req.body);
    console.log('[proxy/cart] Validation passed, payload:', payload);
    
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
      design = await prisma.designDocument.create({
        data: {
          tenantId: tenantId || undefined,
          status: SUBMITTED_STATUS,
          submittedAt: new Date(),
          previewUrl: payload.previewUrl,
          title: `Anonymous Design - ${new Date().toLocaleString()}`,
          snapshot: snapshot.items || [],
          productSlug: snapshot.productSlug || 'canvas-poster',
          surfaceId: snapshot.surfaceId || payload.surfaceId,
          color: snapshot.color,
          printTech: snapshot.printTech || payload.technique || 'dtf',
          sheetWidthPx: snapshot.sheetWidthPx,
          sheetHeightPx: snapshot.sheetHeightPx,
          metadata: {
            source: 'anonymous-checkout',
            createdAt: new Date().toISOString(),
          },
        },
      });
      console.log('[proxy] Created anonymous design:', design.id);
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

    const previewUrl = payload.previewUrl ?? design.previewUrl ?? undefined;

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

    setProp("Design ID", payload.designId || design.id);
    setProp("Product", payload.productTitle);
    setProp("Surface ID", payload.surfaceId);
    setProp("Technique", payload.technique);
    setProp("Preview URL", design.previewUrl && design.previewUrl.length < 1800 ? design.previewUrl : undefined);
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

    const searchParams = new URLSearchParams();
    if (payload.variantId) searchParams.set("id", payload.variantId);
    searchParams.set("quantity", String(payload.quantity));
    Object.entries(properties).forEach(([key, value]) => {
      if (value) searchParams.set(`properties[${key}]`, value);
    });

    const checkoutPath = payload.variantId
      ? `/cart/add?${searchParams.toString()}`
      : `/cart?${searchParams.toString()}`;

    let remoteCheckout: { checkoutUrl: string; cartId: string | null } | null = null;
    if (payload.variantId) {
      try {
        remoteCheckout = await createShopifyCart({
          variantId: payload.variantId,
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

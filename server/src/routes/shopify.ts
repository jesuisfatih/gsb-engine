import { Router } from "express";
import { z } from "zod";

export const shopifyRouter = Router();

/**
 * GET /api/shopify/products
 * Fetch all Shopify products for the current tenant/shop
 */
shopifyRouter.get("/products", async (req, res, next) => {
  try {
    const { tenantId, prisma } = req.context;

    if (!tenantId) {
      console.error("[shopify] Missing tenant context in request");
      return res.status(401).json({ error: "Unauthorized: Missing tenant context" });
    }

    console.log("[shopify] Fetching products for tenant:", tenantId);

    // Get tenant's Shopify credentials
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        shopifyDomain: true,
        shopifyAccessToken: true,
        settings: true,
      },
    });

    if (!tenant) {
      console.error("[shopify] Tenant not found:", tenantId);
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Check for credentials in both fields and settings
    const shopifyDomain = tenant.shopifyDomain || 
      (tenant.settings as any)?.shopify?.domain;
    const shopifyAccessToken = tenant.shopifyAccessToken || 
      (tenant.settings as any)?.shopify?.accessToken;

    if (!shopifyDomain || !shopifyAccessToken) {
      console.warn("[shopify] Missing Shopify credentials for tenant:", tenantId);
      console.warn("[shopify] Domain:", !!shopifyDomain, "Token:", !!shopifyAccessToken);
      return res.status(400).json({ 
        error: "Shopify integration not configured for this tenant",
        hint: "Please reinstall the app to complete OAuth flow",
      });
    }

    // Fetch products from Shopify Admin API
    const shopifyUrl = `https://${shopifyDomain}/admin/api/2024-04/products.json?status=active&limit=250`;
    
    console.log("[shopify] Requesting products from:", shopifyUrl);
    
    const shopifyResponse = await fetch(shopifyUrl, {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyResponse.ok) {
      console.error("[shopify] Failed to fetch products:", shopifyResponse.status, await shopifyResponse.text());
      return res.status(502).json({ 
        error: "Failed to fetch products from Shopify",
        status: shopifyResponse.status,
      });
    }

    const data = await shopifyResponse.json();
    const products = data.products || [];

    // Transform to summary format
    const summaries = products.map((product: any) => ({
      id: `gid://shopify/Product/${product.id}`,
      title: product.title,
      handle: product.handle,
      options: product.options?.map((opt: any) => opt.name) || [],
      variantsCount: product.variants?.length || 0,
    }));

    res.json(summaries);
  } catch (error) {
    console.error("[shopify] Error fetching products:", error);
    next(error);
  }
});

/**
 * GET /api/shopify/products/:productId/variants
 * Fetch variants for a specific Shopify product
 */
shopifyRouter.get("/products/:productId/variants", async (req, res, next) => {
  try {
    const { tenantId, prisma } = req.context;
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Unauthorized: Missing tenant context" });
    }

    // Extract numeric ID from GID
    const numericId = productId.includes("/") 
      ? productId.split("/").pop() 
      : productId;

    // Get tenant's Shopify credentials
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        shopifyDomain: true,
        shopifyAccessToken: true,
      },
    });

    if (!tenant?.shopifyDomain || !tenant?.shopifyAccessToken) {
      return res.status(400).json({ 
        error: "Shopify integration not configured for this tenant" 
      });
    }

    // Fetch product variants from Shopify Admin API
    const shopifyUrl = `https://${tenant.shopifyDomain}/admin/api/2024-04/products/${numericId}.json`;
    
    const shopifyResponse = await fetch(shopifyUrl, {
      headers: {
        "X-Shopify-Access-Token": tenant.shopifyAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyResponse.ok) {
      console.error("[shopify] Failed to fetch product variants:", shopifyResponse.status, await shopifyResponse.text());
      return res.status(502).json({ 
        error: "Failed to fetch product from Shopify",
        status: shopifyResponse.status,
      });
    }

    const data = await shopifyResponse.json();
    const product = data.product;

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Transform variants to summary format
    const variants = (product.variants || []).map((variant: any) => {
      const options: Record<string, string> = {};
      
      // Map option values to option names
      if (product.options && variant.option1) {
        options[product.options[0]?.name || "Option1"] = variant.option1;
      }
      if (product.options && variant.option2) {
        options[product.options[1]?.name || "Option2"] = variant.option2;
      }
      if (product.options && variant.option3) {
        options[product.options[2]?.name || "Option3"] = variant.option3;
      }

      return {
        id: `gid://shopify/ProductVariant/${variant.id}`,
        title: variant.title,
        sku: variant.sku || undefined,
        price: variant.price || undefined,
        options,
      };
    });

    res.json(variants);
  } catch (error) {
    console.error("[shopify] Error fetching variants:", error);
    next(error);
  }
});


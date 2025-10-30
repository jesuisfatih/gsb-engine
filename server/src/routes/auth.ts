import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import type { $Enums, Prisma } from "../../src/generated/prisma/client";
import { generateAccessToken } from "../auth/jwt";
import { env } from "../env";
import { requireAuthMiddleware } from "../middlewares/authenticate";
import { prisma } from "../prisma";
import { verifyShopifySessionToken, type ShopifySessionPayload } from "../shopify/sessionToken";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().optional(),
});

const refreshSchema = z.object({
  tenantId: z.string().optional(),
});

const shopifySessionSchema = z.object({
  token: z.string().min(1).optional(),
  shop: z.string().optional(),
});

const ROLE_MAP: Record<$Enums.TenantRole, RoleId> = {
  SUPER_ADMIN: "super-admin",
  MERCHANT_ADMIN: "merchant-admin",
  MERCHANT_STAFF: "merchant-staff",
};

type RoleId = "super-admin" | "merchant-admin" | "merchant-staff" | "customer";

function resolveRole(role?: $Enums.TenantRole | null): RoleId {
  if (role && ROLE_MAP[role]) return ROLE_MAP[role];
  return "customer";
}

function mapTenants(
  memberships: Array<{ tenant: { id: string; slug: string | null; displayName: string }; role: $Enums.TenantRole }>,
  activeTenantId?: string,
) {
  return memberships.map(m => ({
    id: m.tenant.id,
    slug: m.tenant.slug,
    name: m.tenant.displayName,
    role: resolveRole(m.role),
    isActive: m.tenant.id === activeTenantId,
  }));
}

function extractShopDomain(payload: ShopifySessionPayload, fallback?: string) {
  // Helper to decode base64 if needed
  function tryDecodeBase64(str: string): string {
    try {
      // Check if it looks like base64
      if (/^[A-Za-z0-9+/=]+$/.test(str) && str.length > 10) {
        const decoded = Buffer.from(str, "base64").toString("utf-8");
        // If decoded looks like a shop domain or URL, use it
        if (decoded.includes("myshopify.com") || decoded.startsWith("http")) {
          return decoded;
        }
      }
    } catch {
      // Not valid base64 or decode failed, return original
    }
    return str;
  }

  // Build candidates list with base64 decoding attempt
  const rawCandidates = [payload.dest, payload.iss, fallback].filter(Boolean) as string[];
  const candidates: string[] = [];
  
  for (const raw of rawCandidates) {
    candidates.push(raw);
    const decoded = tryDecodeBase64(raw);
    if (decoded !== raw) {
      candidates.push(decoded);
    }
  }

  console.log("[shopify-auth] 🔍 Extracting shop domain from candidates:", candidates);
  console.log("[shopify-auth] 📋 Payload:", {
    dest: payload.dest,
    iss: payload.iss,
    fallback,
  });

  for (const candidate of candidates) {
    try {
      // First, try direct myshopify.com match (e.g., "we-dream-studio.myshopify.com")
      const directMatch = candidate.match(/([a-z0-9-]+\.myshopify\.com)/i);
      if (directMatch) {
        const domain = directMatch[1].toLowerCase();
        console.log("[shopify-auth] ✅ Shop domain extracted via direct match:", domain);
        return domain;
      }
      
      // Try URL parsing
      let url: URL;
      if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
        url = new URL(candidate);
      } else {
        // Try to parse as URL anyway
        url = new URL(`https://${candidate}`);
      }
      
      const host = url.hostname.toLowerCase();
      console.log("[shopify-auth]   Trying candidate:", candidate, "→ hostname:", host, "pathname:", url.pathname);
      
      // Check if hostname is myshopify.com domain
      if (host.endsWith(".myshopify.com")) {
        console.log("[shopify-auth] ✅ Shop domain extracted from hostname:", host);
        return host;
      }
      
      // Check path segments for shop name (e.g., /store/we-dream-studio)
      const pathMatch = url.pathname.match(/\/store\/([a-z0-9-]+)/i);
      if (pathMatch) {
        const shopName = pathMatch[1];
        const domain = `${shopName}.myshopify.com`;
        console.log("[shopify-auth] ✅ Shop domain extracted from path:", domain);
        return domain;
      }
      
      // Check if hostname contains admin.shopify.com and path has shop info
      if (host.includes("admin.shopify.com") || host.includes("shopify.com")) {
        // Try to extract from pathname (e.g., /store/we-dream-studio)
        const storeMatch = url.pathname.match(/store\/([a-z0-9-]+)/i);
        if (storeMatch) {
          const domain = `${storeMatch[1]}.myshopify.com`;
          console.log("[shopify-auth] ✅ Shop domain extracted from admin URL:", domain);
          return domain;
        }
      }
    } catch (error) {
      // Try regex match for myshopify.com domain pattern as fallback
      const match = candidate.match(/([a-z0-9-]+\.myshopify\.com)/i);
      if (match) {
        const domain = match[1].toLowerCase();
        console.log("[shopify-auth] ✅ Shop domain extracted via regex fallback:", domain);
        return domain;
      }
      console.log("[shopify-auth]   Failed to parse candidate:", candidate, error instanceof Error ? error.message : String(error));
    }
  }
  
  console.warn("[shopify-auth] ❌ Unable to extract shop domain from any candidate");
  console.warn("[shopify-auth] 📋 Final payload dump:", JSON.stringify(payload, null, 2));
  return null;
}

function sanitizeSlug(domain: string) {
  return domain
    .replace(/\.myshopify\.com$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const tenantWithUsersInclude = {
  users: {
    include: { user: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.TenantInclude;

function toDisplayName(slug: string) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildProvisionEmail(slug: string, shopDomain: string) {
  const localPart = `owner+${slug}`;
  const domainPart = shopDomain.toLowerCase().replace(/[^a-z0-9.-]/g, "") || "tenant.local";
  return `${localPart}@${domainPart}`;
}

async function generateUniqueTenantSlug(tx: Prisma.TransactionClient, base: string) {
  const sanitizedBase = base || `shop-${Date.now().toString(36)}`;
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${sanitizedBase}${suffix}`.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
    if (!candidate) {
      attempt++;
      continue;
    }
    const existing = await tx.tenant.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
    if (attempt > 20) {
      const random = Math.random().toString(36).slice(2, 6);
      const fallback = `${sanitizedBase}-${random}`.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      const fallbackExisting = await tx.tenant.findUnique({ where: { slug: fallback } });
      if (!fallbackExisting) return fallback;
    }
  }
}

async function provisionTenantForShop(shopDomain: string, slugHints: string[]) {
  return prisma.$transaction(async tx => {
    const existingByDomain = await tx.tenant.findFirst({
      where: { settings: { path: ["shopify", "domain"], equals: shopDomain } },
      include: tenantWithUsersInclude,
    });
    if (existingByDomain)
      return existingByDomain;

    for (const slug of slugHints) {
      if (!slug) continue;
      const candidate = await tx.tenant.findUnique({
        where: { slug },
        include: tenantWithUsersInclude,
      });
      if (candidate)
        return candidate;
    }

    const base = slugHints.find(Boolean) ?? sanitizeSlug(shopDomain) ?? `shop-${Date.now().toString(36)}`;
    const uniqueSlug = await generateUniqueTenantSlug(tx, base);
    const displayName = toDisplayName(uniqueSlug || base);
    const email = buildProvisionEmail(uniqueSlug, shopDomain);

    const owner = await tx.user.upsert({
      where: { email },
      update: {
        displayName: `${displayName} Owner`,
        status: "ACTIVE",
      },
      create: {
        email,
        displayName: `${displayName} Owner`,
        status: "ACTIVE",
      },
    });

    const tenant = await tx.tenant.create({
      data: {
        slug: uniqueSlug,
        displayName,
        status: "ACTIVE",
        settings: {
          shopify: {
            domain: shopDomain,
            provisionedAt: new Date().toISOString(),
          },
        },
        users: {
          create: [
            {
              role: "MERCHANT_ADMIN",
              user: { connect: { id: owner.id } },
            },
          ],
        },
      },
      include: tenantWithUsersInclude,
    });

    return tenant;
  });
}

async function ensureTenantAdmin(tenantId: string, shopDomain: string) {
  return prisma.$transaction(async tx => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      include: tenantWithUsersInclude,
    });
    if (!tenant)
      throw new Error("Tenant not found during admin provisioning");

    const existing =
      tenant.users.find(member => member.role === "MERCHANT_ADMIN" && member.user) ??
      tenant.users.find(member => member.user) ??
      null;

    if (existing && existing.user) {
      return { tenant, membership: existing };
    }

    const base = sanitizeSlug(shopDomain) || tenant.slug || `tenant-${tenantId.slice(0, 6)}`;
    const displayName = toDisplayName(base);
    const email = buildProvisionEmail(base, shopDomain);

    const user = await tx.user.upsert({
      where: { email },
      update: {
        displayName: `${displayName} Owner`,
        status: "ACTIVE",
      },
      create: {
        email,
        displayName: `${displayName} Owner`,
        status: "ACTIVE",
      },
    });

    await tx.tenantUser.create({
      data: {
        tenantId,
        userId: user.id,
        role: "MERCHANT_ADMIN",
      },
    });

    const refreshed = await tx.tenant.findUnique({
      where: { id: tenantId },
      include: tenantWithUsersInclude,
    });

    if (!refreshed)
      throw new Error("Failed to refresh tenant after provisioning admin");

    const membership =
      refreshed.users.find(member => member.userId === user.id) ??
      refreshed.users.find(member => member.role === "MERCHANT_ADMIN" && member.user) ??
      null;

    if (!membership || !membership.user)
      throw new Error("Unable to create merchant admin for tenant");

    return { tenant: refreshed, membership };
  });
}

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password, tenantId } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          tenant: {
            select: {
              id: true,
              displayName: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.hashedPassword) {
    return res.status(401).json({ errors: { email: "Invalid credentials" } });
  }

  const passwordValid = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordValid) {
    return res.status(401).json({ errors: { email: "Invalid credentials" } });
  }

  if (!user.memberships.length) {
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      tenantMemberships: [],
      defaultTenantId: undefined,
    });

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.displayName,
        role: "customer" as RoleId,
        tenantId: null,
        merchantId: null,
      },
      tenants: [],
    });
  }

  const memberships = user.memberships;
  const requestedTenantId = tenantId ?? memberships[0].tenant.id;
  const membership = memberships.find(m => m.tenant.id === requestedTenantId);
  if (!membership) {
    return res.status(403).json({ errors: { email: "User does not have access to requested tenant" } });
  }

  const activeRole = resolveRole(membership.role);

  const accessToken = generateAccessToken({
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    tenantMemberships: memberships.map(m => ({ tenantId: m.tenant.id, role: m.role })),
    defaultTenantId: membership.tenant.id,
  });

  return res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.displayName,
      role: activeRole,
      tenantId: membership.tenant.id,
      merchantId: membership.tenant.id,
    },
    tenants: mapTenants(memberships, membership.tenant.id),
  });
});

authRouter.post("/refresh", (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { tenantId } = refreshSchema.parse(req.body ?? {});
  const memberships = req.auth.tenantMemberships;
  const targetTenantId = tenantId ?? req.auth.defaultTenantId ?? memberships[0]?.tenantId;

  if (tenantId && !memberships.find(m => m.tenantId === tenantId)) {
    return res.status(403).json({ error: "User does not have access to requested tenant" });
  }

  const token = generateAccessToken({
    sub: req.auth.userId,
    email: req.auth.email,
    displayName: req.auth.displayName,
    tenantMemberships: memberships,
    defaultTenantId: targetTenantId,
  });

  return res.json({ accessToken: token });
});

// OAuth callback endpoint for app installation
authRouter.get("/callback", async (req, res) => {
  console.log("[shopify-auth] OAuth callback received");
  console.log("[shopify-auth] Query params:", req.query);
  
  const { shop, code, host, hmac, state } = req.query;
  
  if (!shop || typeof shop !== "string") {
    return res.status(400).send("Missing shop parameter");
  }

  // If we have a code, this is the OAuth callback - exchange it for an access token
  if (code && typeof code === "string") {
    try {
      console.log("[shopify-auth] Exchanging OAuth code for access token...");
      
      // Exchange code for access token
      const tokenUrl = `https://${shop}/admin/oauth/access_token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.SHOPIFY_API_KEY,
          client_secret: env.SHOPIFY_API_SECRET,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("[shopify-auth] Failed to exchange OAuth code:", tokenResponse.status);
        return res.status(502).send("Failed to complete Shopify OAuth");
      }

      const tokenData = await tokenResponse.json() as { access_token: string; scope: string };
      console.log("[shopify-auth] Access token received for shop:", shop);

      // Find or create tenant for this shop
      const shopDomain = shop;
      const slugCandidate = sanitizeSlug(shopDomain);
      const slugHints = Array.from(
        new Set(
          [env.SHOPIFY_DEFAULT_TENANT_SLUG?.trim()?.toLowerCase(), slugCandidate].filter(Boolean) as string[],
        ),
      );

      let tenant = await prisma.tenant.findFirst({
        where: {
          settings: { path: ["shopify", "domain"], equals: shopDomain },
        },
      });

      if (!tenant) {
        for (const slug of slugHints) {
          const candidate = await prisma.tenant.findUnique({ where: { slug } });
          if (candidate) {
            tenant = candidate;
            break;
          }
        }
      }

      if (!tenant) {
        tenant = await provisionTenantForShop(shopDomain, slugHints);
      }

      if (!tenant) {
        return res.status(500).send("Failed to provision tenant");
      }

      // Update tenant with Shopify credentials
      const currentSettings = (tenant.settings as Record<string, unknown> | null) ?? {};
      const nextSettings = {
        ...currentSettings,
        shopify: {
          domain: shopDomain,
          accessToken: tokenData.access_token,
          scope: tokenData.scope,
          installedAt: new Date().toISOString(),
        },
      };

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          shopifyDomain: shopDomain,
          shopifyAccessToken: tokenData.access_token,
          settings: nextSettings,
        },
      });

      console.log("[shopify-auth] Tenant updated with Shopify credentials");
    } catch (error) {
      console.error("[shopify-auth] OAuth error:", error);
      return res.status(500).send("OAuth exchange failed");
    }
  }
  
  // Redirect to embedded app with shop and host params
  // CRITICAL: host parameter MUST be preserved for App Bridge to work
  const shopParam = encodeURIComponent(shop);
  const hostParam = host ? encodeURIComponent(host as string) : null;
  
  // Build redirect URL with query parameters
  let redirectUrl = `/shopify/embedded?shop=${shopParam}`;
  if (hostParam) {
    redirectUrl += `&host=${hostParam}`;
  }
  
  console.log("[shopify-auth] ✅ OAuth callback successful");
  console.log("[shopify-auth] Shop:", shop);
  console.log("[shopify-auth] Host parameter:", host ? "present" : "missing");
  console.log("[shopify-auth] Redirecting to:", redirectUrl);
  
  // Use object form of redirect to ensure query params are preserved
  return res.redirect(302, redirectUrl);
});

// GET endpoint for debugging - should not be used
authRouter.get("/shopify/session", async (req, res) => {
  console.log("[shopify-auth] ❌ GET request received - should be POST");
  console.log("[shopify-auth] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[shopify-auth] Query:", JSON.stringify(req.query, null, 2));
  console.log("[shopify-auth] URL:", req.url);
  return res.status(405).json({ 
    error: "Method not allowed. Use POST instead.",
    hint: "Frontend should send POST request with session token",
    received: "GET",
    expected: "POST",
    correctEndpoint: "POST /api/auth/shopify/session"
  });
});

authRouter.post("/shopify/session", async (req, res, next) => {
  try {
    console.log("[shopify-auth] 🚨 POST /shopify/session received!");
    console.log("[shopify-auth] Raw body:", req.body);
    console.log("[shopify-auth] Content-Type:", req.get("content-type"));
    console.log("[shopify-auth] Headers:", JSON.stringify(req.headers, null, 2));
    
    const { token: bodyToken, shop } = shopifySessionSchema.parse(req.body ?? {});
    const authHeader = req.get("authorization") || req.get("Authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const token = bearerToken || (bodyToken ?? "").trim();
    const tokenSource = bearerToken ? "header" : "body";

    console.log("[shopify-auth] Session request received");
    console.log("[shopify-auth] Token length:", token?.length || 0, "Shop:", shop);
    console.log("[shopify-auth] Token preview:", token ? `${token.substring(0, 24)}...${token.substring(token.length - 6)}` : "none", "source:", tokenSource);
    console.log("[shopify-auth] Request headers:", JSON.stringify(req.headers, null, 2));
    console.log("[shopify-auth] Request body:", JSON.stringify(req.body, null, 2));
    if (!token) {
      console.warn("[shopify-auth] Session exchange missing token in body/header");
      return res.status(400).json({ error: "Missing Shopify session token" });
    }

    const tokenSegments = token.split(".");
    if (tokenSegments.length !== 3 || tokenSegments.some(segment => segment.length === 0)) {
      console.warn("[shopify-auth] Session exchange received malformed token");
      return res.status(400).json({ error: "Invalid Shopify session token" });
    }

    if (!env.SHOPIFY_API_SECRET) {
      return res.status(500).json({ error: "Shopify API secret not configured" });
    }

    const verification = await verifyShopifySessionToken(token, {
      validateSignature: env.SHOPIFY_VALIDATE_SESSION_SIGNATURE,
      apiSecret: env.SHOPIFY_API_SECRET,
    });
    const decoded = verification.payload;
    
    console.log("[shopify-auth] 📋 Decoded token payload:", {
      iss: decoded.iss,
      dest: decoded.dest,
      aud: decoded.aud,
      audType: typeof decoded.aud,
      audIsArray: Array.isArray(decoded.aud),
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
    });
    
    if (!verification.verified) {
      console.warn("[shopify-auth] ⚠️ Session token accepted without signature verification (fallback mode)");
    }

    // Audience validation: aud can be string or array according to JWT spec
    if (env.SHOPIFY_API_KEY && decoded.aud) {
      let audMatch = false;
      
      if (Array.isArray(decoded.aud)) {
        // If aud is an array, check if API key is in the array
        audMatch = decoded.aud.includes(env.SHOPIFY_API_KEY);
        console.log("[shopify-auth] 🔍 Audience check (array):", {
          decodedAud: decoded.aud,
          apiKey: env.SHOPIFY_API_KEY,
          match: audMatch,
        });
      } else {
        // If aud is a string, do direct comparison
        audMatch = decoded.aud === env.SHOPIFY_API_KEY;
        console.log("[shopify-auth] 🔍 Audience check (string):", {
          decodedAud: decoded.aud,
          apiKey: env.SHOPIFY_API_KEY,
          match: audMatch,
        });
      }
      
      if (!audMatch) {
        console.error("[shopify-auth] ❌ Audience mismatch:", {
          expected: env.SHOPIFY_API_KEY,
          received: decoded.aud,
          receivedType: Array.isArray(decoded.aud) ? "array" : "string",
        });
        return res.status(401).json({ 
          error: "Shopify session audience mismatch",
          details: {
            expected: env.SHOPIFY_API_KEY,
            received: decoded.aud,
          },
        });
      }
      
      console.log("[shopify-auth] ✅ Audience validation passed");
    } else {
      if (!env.SHOPIFY_API_KEY) {
        console.warn("[shopify-auth] ⚠️ SHOPIFY_API_KEY not set, skipping audience validation");
      }
      if (!decoded.aud) {
        console.warn("[shopify-auth] ⚠️ Token payload missing 'aud' claim, skipping audience validation");
      }
    }

    const shopDomain = extractShopDomain(decoded, shop);
    if (!shopDomain) {
      console.error("[shopify-auth] ❌ Unable to resolve shop domain", {
        payloadDest: decoded.dest,
        payloadIss: decoded.iss,
        fallbackShop: shop,
        payload: decoded,
      });
      return res.status(400).json({ 
        error: "Unable to resolve Shopify shop domain",
        details: {
          dest: decoded.dest,
          iss: decoded.iss,
          fallbackShop: shop,
        },
      });
    }
    
    console.log("[shopify-auth] ✅ Shop domain resolved:", shopDomain);

    const slugCandidate = sanitizeSlug(shopDomain);
    const slugHints = Array.from(
      new Set(
        [env.SHOPIFY_DEFAULT_TENANT_SLUG?.trim()?.toLowerCase(), slugCandidate].filter(Boolean) as string[],
      ),
    );

    let tenant = await prisma.tenant.findFirst({
      where: {
        settings: { path: ["shopify", "domain"], equals: shopDomain },
      },
      include: tenantWithUsersInclude,
    });

    if (!tenant) {
      for (const slug of slugHints) {
        const candidate = await prisma.tenant.findUnique({
          where: { slug },
          include: tenantWithUsersInclude,
        });
        if (candidate) {
          tenant = candidate;
          break;
        }
      }
    }

    if (!tenant) {
      tenant = await provisionTenantForShop(shopDomain, slugHints);
    }

    if (!tenant) {
      return res.status(404).json({ error: "Merchant workspace not provisioned" });
    }

    let primaryMembership =
      tenant.users.find(member => member.role === "MERCHANT_ADMIN" && member.user) ??
      tenant.users.find(member => member.user) ??
      null;

    if (!primaryMembership || !primaryMembership.user) {
      const ensured = await ensureTenantAdmin(tenant.id, shopDomain);
      tenant = ensured.tenant;
      primaryMembership = ensured.membership;
    }

    if (!primaryMembership || !primaryMembership.user) {
      return res.status(403).json({ error: "No merchant user available for shop" });
    }

    const memberships = await prisma.tenantUser.findMany({
      where: { userId: primaryMembership.userId },
      include: {
        tenant: { select: { id: true, slug: true, displayName: true } },
      },
    });

    const accessToken = generateAccessToken({
      sub: primaryMembership.user.id,
      email: primaryMembership.user.email,
      displayName: primaryMembership.user.displayName,
      tenantMemberships: memberships.map(m => ({ tenantId: m.tenantId, role: m.role })),
      defaultTenantId: tenant.id,
    });

    const tenantsPayload = mapTenants(
      memberships.map(m => ({
        tenant: m.tenant,
        role: m.role,
      })),
      tenant.id,
    );

    const roleId = resolveRole(primaryMembership.role);

    // TOKEN EXCHANGE: Get Shopify access token
    console.log("[shopify-auth] Performing token exchange for shop:", shopDomain);
    let shopifyAccessToken: string | null = null;
    try {
      const tokenExchangeUrl = `https://${shopDomain}/admin/oauth/access_token`;
      const tokenExchangeResponse = await fetch(tokenExchangeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: env.SHOPIFY_API_KEY,
          client_secret: env.SHOPIFY_API_SECRET,
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: token,
          subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
          requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
        }),
      });

      if (tokenExchangeResponse.ok) {
        const tokenData = await tokenExchangeResponse.json() as { access_token: string; scope?: string };
        shopifyAccessToken = tokenData.access_token;
        console.log("[shopify-auth] Token exchange successful! Access token obtained.");
      } else {
        const errorText = await tokenExchangeResponse.text();
        console.warn("[shopify-auth] Token exchange failed:", tokenExchangeResponse.status, errorText);
      }
    } catch (error) {
      console.error("[shopify-auth] Token exchange error:", error);
    }

    const currentSettings = (tenant.settings as Record<string, unknown> | null) ?? {};
    const currentShopify = (currentSettings.shopify as Record<string, unknown> | undefined) ?? {};
    const nextShopify: Record<string, unknown> = {
      ...currentShopify,
      domain: shopDomain,
      lastSessionAt: new Date().toISOString(),
    };
    
    // Save Shopify access token if obtained
    if (shopifyAccessToken) {
      nextShopify.accessToken = shopifyAccessToken;
      console.log("[shopify-auth] Access token saved to settings");
    }
    
    if (decoded.exp) {
      nextShopify.sessionExpiresAt = new Date(decoded.exp * 1000).toISOString();
    }

    const nextSettings = {
      ...currentSettings,
      shopify: nextShopify,
    };

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { settings: nextSettings },
    });

    // Cookie configuration for Shopify embedded apps
    const isProduction = env.NODE_ENV === "production";
    const secureCookie = isProduction;
    const maxAgeSeconds = 15 * 60;
    const sessionCookieName = secureCookie ? "__Host-sid" : "sid";
    
    // For Shopify embedded apps, we MUST use SameSite=None with Secure in production
    // In development, use Lax for easier testing
    const sameSiteValue = secureCookie ? "None" : "Lax";
    
    const sessionAttributes = ["Path=/", `SameSite=${sameSiteValue}`, `Max-Age=${maxAgeSeconds}`, "HttpOnly"];
    const tenantAttributes = ["Path=/", `SameSite=${sameSiteValue}`, `Max-Age=${maxAgeSeconds}`];
    
    if (secureCookie) {
      sessionAttributes.push("Secure");
      tenantAttributes.push("Secure");
      // Partitioned cookies for better third-party cookie support
      sessionAttributes.push("Partitioned");
      tenantAttributes.push("Partitioned");
    }
    
    const cookieHeaders: string[] = [
      `${sessionCookieName}=${accessToken}; ${sessionAttributes.join("; ")}`,
      `tenantId=${tenant.id}; ${tenantAttributes.join("; ")}`,
    ];
    
    console.log("[shopify-auth] Setting session cookies:");
    console.log("[shopify-auth] - Environment:", env.NODE_ENV);
    console.log("[shopify-auth] - Secure:", secureCookie);
    console.log("[shopify-auth] - SameSite:", sameSiteValue);
    console.log("[shopify-auth] - Cookie headers:", cookieHeaders);
    
    res.setHeader("Set-Cookie", cookieHeaders);

    return res.json({
      data: {
        accessToken,
        tenantId: tenant.id,
        shopDomain,
        sessionExpiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        user: {
          id: primaryMembership.user.id,
          email: primaryMembership.user.email,
          fullName: primaryMembership.user.displayName,
          role: roleId,
          tenantId: tenant.id,
          merchantId: tenant.id,
        },
        tenants: tenantsPayload,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/session", requireAuthMiddleware, async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const memberships = await prisma.tenantUser.findMany({
    where: { userId: req.auth.userId },
    include: {
      tenant: {
        select: { id: true, displayName: true, slug: true },
      },
    },
  });

  const activeTenantId = req.auth.token.defaultTenantId ?? memberships[0]?.tenant.id;
  const activeMembership = memberships.find(m => m.tenant.id === activeTenantId);
  const role = activeMembership ? resolveRole(activeMembership.role) : "customer";

  return res.json({
    user: {
      id: req.auth.userId,
      email: req.auth.email,
      fullName: req.auth.displayName,
      role,
      tenantId: activeTenantId,
      merchantId: activeTenantId,
    },
    tenants: mapTenants(memberships, activeTenantId),
    activeTenantId,
  });
});

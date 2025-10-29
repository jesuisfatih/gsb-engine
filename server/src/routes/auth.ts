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
  const candidates = [payload.dest, payload.iss, fallback].filter(Boolean) as string[];
  for (const candidate of candidates) {
    try {
      const url = candidate.startsWith("http")
        ? new URL(candidate)
        : new URL(`https://${candidate}`);
      const host = url.hostname.toLowerCase();
      if (host.endsWith(".myshopify.com")) return host;
    } catch {
      if (/[a-z0-9-]+\.myshopify\.com$/i.test(candidate)) {
        return candidate.toLowerCase();
      }
    }
  }
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

authRouter.post("/shopify/session", async (req, res, next) => {
  try {
    const { token: bodyToken, shop } = shopifySessionSchema.parse(req.body ?? {});
    const authHeader = req.get("authorization") || req.get("Authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const token = bearerToken || (bodyToken ?? "").trim();
    const tokenSource = bearerToken ? "header" : "body";

    console.log("[shopify-auth] Session request received");
    console.log("[shopify-auth] Token length:", token?.length || 0, "Shop:", shop);
    console.log("[shopify-auth] Token preview:", token ? `${token.substring(0, 24)}...${token.substring(token.length - 6)}` : "none", "source:", tokenSource);
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
    if (!verification.verified) {
      console.warn("[shopify-auth] session token accepted without signature verification (fallback mode)");
    }

    if (env.SHOPIFY_API_KEY && decoded.aud && decoded.aud !== env.SHOPIFY_API_KEY) {
      return res.status(401).json({ error: "Shopify session audience mismatch" });
    }

    const shopDomain = extractShopDomain(decoded, shop);
    if (!shopDomain) {
      return res.status(400).json({ error: "Unable to resolve Shopify shop domain" });
    }

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

    const currentSettings = (tenant.settings as Record<string, unknown> | null) ?? {};
    const currentShopify = (currentSettings.shopify as Record<string, unknown> | undefined) ?? {};
    const nextShopify: Record<string, unknown> = {
      ...currentShopify,
      domain: shopDomain,
      lastSessionAt: new Date().toISOString(),
    };
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

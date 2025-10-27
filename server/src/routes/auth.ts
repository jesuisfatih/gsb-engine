import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { $Enums } from "../../src/generated/prisma/client";
import { prisma } from "../prisma";
import { generateAccessToken } from "../auth/jwt";
import { requireAuthMiddleware } from "../middlewares/authenticate";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().optional(),
});

const refreshSchema = z.object({
  tenantId: z.string().optional(),
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

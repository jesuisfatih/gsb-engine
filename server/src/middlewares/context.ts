import type { NextFunction, Request, Response } from "express";
import { env } from "../env";
import { prisma } from "../prisma";
import type { TenantMembership } from "../types/request-context";

function resolveTenantFromAuth(req: Request): { tenantId?: string; memberships: TenantMembership[] } | { error: string } {
  if (!req.auth) {
    return { tenantId: undefined, memberships: [] };
  }

  const memberships = req.auth.tenantMemberships.map(m => ({ tenantId: m.tenantId, role: m.role }));
  const headerTenant = req.header("x-tenant-id") ?? undefined;
  const requestedTenantId = headerTenant ?? req.auth.defaultTenantId ?? memberships[0]?.tenantId;

  if (!requestedTenantId) {
    return { error: "No tenant available for user" };
  }

  const membership = memberships.find(m => m.tenantId === requestedTenantId);
  if (!membership) {
    return { error: "User does not have access to tenant" };
  }

  return { tenantId: requestedTenantId, memberships };
}

/**
 * Attaches Prisma client and auth context to each request.
 * Validates tenant access when a JWT is present. In development, the legacy
 * `x-tenant-id` header can be used without auth if ALLOW_DEV_TENANT_HEADER=true.
 */
export function contextMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.auth) {
    const result = resolveTenantFromAuth(req);
    if ("error" in result) {
      return res.status(403).json({ error: result.error });
    }

    req.context = {
      prisma,
      tenantId: result.tenantId,
      user: {
        id: req.auth.userId,
        email: req.auth.email,
        displayName: req.auth.displayName,
      },
      memberships: result.memberships,
    };
    return next();
  }

  const headerTenant = req.header("x-tenant-id") ?? undefined;
  if (headerTenant && env.ALLOW_DEV_TENANT_HEADER) {
    req.context = {
      prisma,
      tenantId: headerTenant,
    };
    return next();
  }

  req.context = {
    prisma,
  };

  return next();
}

import type { NextFunction, Request, Response } from "express";
import type { AccessTokenPayload, TenantMembershipPayload } from "../auth/jwt";
import { verifyAccessToken } from "../auth/jwt";
import { env } from "../env";

export interface AuthInfo {
  userId: string;
  email: string;
  displayName?: string | null;
  tenantMemberships: TenantMembershipPayload[];
  defaultTenantId?: string;
  token: AccessTokenPayload;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      auth?: AuthInfo;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token;
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawToken = extractToken(req);
  if (!rawToken) return next();

  try {
    const payload = verifyAccessToken(rawToken);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      tenantMemberships: payload.tenantMemberships ?? [],
      defaultTenantId: payload.defaultTenantId,
      token: payload,
    };
    return next();
  } catch (error) {
    console.warn("[auth] invalid token", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.auth) {
    return next();
  }

  if (env.ALLOW_DEV_TENANT_HEADER && req.context?.tenantId) {
    return next();
  }

  return res.status(401).json({ error: "Authentication required" });
}

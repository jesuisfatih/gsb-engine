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

const PUBLIC_PATH_PREFIXES = [
  "/api/auth/",
  "/api/health",
  "/api/_debug/",
];

const PUBLIC_EXACT_PATHS = new Set([
  "/api/auth",
  "/api/auth/shopify/session",
  "/api/auth/shopify/callback",
  "/api/_debug/set-sid",
  "/api/health",
]);

function isPublicRequest(req: Request): boolean {
  const originalUrl = (req.originalUrl ?? req.url ?? req.path ?? "").replace(/\?.*$/, "");
  const normalised = originalUrl.endsWith("/") && originalUrl !== "/" ? originalUrl.replace(/\/+$/, "") : originalUrl;

  if (PUBLIC_EXACT_PATHS.has(normalised)) return true;
  if (PUBLIC_PATH_PREFIXES.some(prefix => normalised.startsWith(prefix))) return true;

  // When mounted under "/api", req.path may not include prefix.
  if (req.baseUrl) {
    const combined = `${req.baseUrl}${req.path ?? ""}`.replace(/\?.*$/, "");
    if (PUBLIC_EXACT_PATHS.has(combined)) return true;
    if (PUBLIC_PATH_PREFIXES.some(prefix => combined.startsWith(prefix))) return true;
  }

  return false;
}

function extractTokens(req: Request): { headerToken: string | null; cookieToken: string | null } {
  const header = req.headers.authorization;
  if (header) {
    const [scheme, token] = header.split(" ");
    if (scheme && token && scheme.toLowerCase() === "bearer") {
      return { headerToken: token, cookieToken: extractCookieToken(req) };
    }
  }

  return { headerToken: null, cookieToken: extractCookieToken(req) };
}

function extractCookieToken(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
  return cookies.accessToken ?? cookies.sid ?? cookies["__Host-sid"] ?? null;
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const { headerToken, cookieToken } = extractTokens(req);
  const publicRequest = isPublicRequest(req);
  const candidates = [headerToken, cookieToken].filter((value): value is string => Boolean(value));
  if (candidates.length === 0) return next();

  for (const rawToken of candidates) {
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
    }
  }

  delete req.auth;
  if (publicRequest) return next();
  return res.status(401).json({ error: "Invalid or expired token" });
}

export function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isPublicRequest(req)) {
    return next();
  }

  if (req.auth) {
    return next();
  }

  if (env.ALLOW_DEV_TENANT_HEADER && req.context?.tenantId) {
    return next();
  }

  return res.status(401).json({ error: "Authentication required" });
}

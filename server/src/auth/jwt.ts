import jwt from "jsonwebtoken";
import type { $Enums } from "../../../src/generated/prisma/client";
import { env } from "../env";

type TenantRole = $Enums.TenantRole;

export interface TenantMembershipPayload {
  tenantId: string;
  role: TenantRole;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  displayName?: string | null;
  tenantMemberships: TenantMembershipPayload[];
  defaultTenantId?: string;
}

export function generateAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

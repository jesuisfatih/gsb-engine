import type { PrismaClient, $Enums } from "../../../src/generated/prisma/client";

export interface TenantMembership {
  tenantId: string;
  role: $Enums.TenantRole;
}

export interface RequestUser {
  id: string;
  email: string;
  displayName?: string | null;
}

export interface RequestContext {
  prisma: PrismaClient;
  tenantId?: string;
  user?: RequestUser;
  memberships?: TenantMembership[];
}

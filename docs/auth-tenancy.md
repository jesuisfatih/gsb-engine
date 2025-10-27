# Authentication & Tenancy Resolution Plan

## Goals
- Replace header-based tenant hints with authenticated sessions.
- Map incoming requests to actual `TenantUser` records and enforce RBAC in API + UI.

## Target Architecture
1. **Identity Provider**
   - Either Shopify OAuth (for embedded app) or email/password for internal admins.
   - On login, issue a JWT containing `userId`, `tenantIds`, and default tenant.
2. **Backend Middleware**
   - Verify JWT (cookie or Authorization header).
   - Look up `TenantUser` entry, determine active tenant.
   - Attach `{ userId, tenantId, roles }` to `req.context`.
   - Enforce row-level access on Prisma queries using these ids.
3. **Front-End**
   - Store token securely (HTTP-only cookie preferred).
   - Maintain active tenant in global store; support switching for multi-tenant admins.
   - Update `$api` to refresh tokens / handle 401.

## Required Changes
- Create `authRouter` with login/refresh endpoints.
- Add `tenantUsers` records on invite / Shopify install.
- Update all API routes to validate permissions before executing business logic.
- Provide `GET /api/session` to hydrate UI with user + tenant info.

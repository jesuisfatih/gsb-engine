# Backend Roadmap (Next Steps)

With Prisma and the database schema in place, the next milestones are:

## 1. API Skeleton
* Create a Node/Express (or Fastify/Nest) service in `server/`.
* Load environment (`dotenv-flow` or `dotenv`) and instantiate a single Prisma client.
* Implement global middleware for tenant resolution (reading `X-Tenant-Id`, session, or Shopify context).
* Expose initial REST endpoints:
  - `GET /api/health` – probe for CI/CD & uptime.
  - `GET /api/tenants/:id/catalog` – bundles products, surfaces, variants.
  - `POST /api/designs` / `PATCH /api/designs/:id` – persist editor output.
  - `POST /api/gang-sheets` – save gang sheet sessions.
  - `POST /api/pricing/quote` – run pricing engine (pricing rules + technique).
* Add request validation (`zod`/`valibot`) and error handling wrappers.

## 2. Authentication & RBAC
* Integrate existing auth provider (e.g. NextAuth, custom JWT, Shopify OAuth).
* Populate `TenantUser` records on invite/SSO and map to `TenantRole`.
* Implement backend guards that enforce the role metadata exposed in the front-end CASL store.

## 3. Deployment & Ops
* Prepare environment templates for Neon / Cloud SQL / RDS; supply connection pooling notes.
* Add `npm run db:migrate:deploy` to CI before releasing backend containers/functions.
* Configure observability (structured logging, metrics) and queue workers for `background_tasks`.

## 4. Front-End Integration
* Replace Pinia stores that currently use local mocks:
  - `catalogStore` → fetch via `/api/catalog`.
  - `editorStore` design saves → call `/api/designs`.
  - `gangSheetStore` → sync snapshots with `/api/gang-sheets`.
* Surface tenant branding (`Tenant.branding`) in the Vuexy theme config.
* Drive admin dashboards from Prisma data (pricing tables, audit logs, supplier SLAs).

Completing these steps will make the platform fully server-backed and ready for multi-tenant production use.

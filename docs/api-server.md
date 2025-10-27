# API Server Skeleton

The `server/` directory now hosts a minimal Express + Prisma service that uses the shared PostgreSQL schema.
This is the foundation for merchant/super-admin dashboards, Shopify webhooks, and editor persistence.

## Project Layout

```
server/
  src/
    app.ts                # Express app composition
    main.ts               # Bootstrap entry point
    env.ts                # zod-based env parsing
    prisma.ts             # PrismaClient singleton
    middlewares/context.ts
    routes/
      catalog.ts
      designs.ts
      gang-sheets.ts
      pricing.ts
      health.ts
      index.ts
    types/
      express.d.ts        # Augments Express.Request with context
      request-context.ts
  tsconfig.json
```

## Running Locally

1. Set `DATABASE_URL` in `.env` (see `docs/prisma-setup.md`).
2. Ensure migrations are applied: `npm run db:migrate`.
3. Start the API: `npm run api:dev` (listens on port **4000** by default).
4. Try a health check: `curl http://localhost:4000/api/health`.

> The context middleware currently reads the tenant from the optional `x-tenant-id` header. 
> This will be replaced with real authentication/authorization once the auth story is implemented.

## Available Routes (Initial Stubs)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Basic readiness probe. |
| `GET` | `/api/catalog` | Fetch products/surfaces/variants (global + tenant scoped). |
| `POST` | `/api/designs` | Persist editor output snapshots under the active tenant. |
| `PATCH` | `/api/designs/:id` | Update design metadata/snapshot. |
| `POST` | `/api/gang-sheets` | Save gang sheet snapshot. |
| `GET` | `/api/gang-sheets` | List gang sheets for the tenant. |
| `POST` | `/api/pricing/quote` | Placeholder pricing engine hook. |

Each route already wires Prisma and tenant scoping, but business rules (RBAC, validation, pricing) still need to be refined.

## Next Enhancements

* Replace header-based tenant lookup with authenticated session handling (JWT/Shopify/OAuth).
* Introduce a service layer for pricing, supplier routing, and production job orchestration.
* Add background workers (BullMQ/Cloud Tasks) to process `background_tasks` table entries.
* Containerize the API and provide deployment manifests (Cloud Run, ECS, etc.).

With this skeleton in place we can move on to deployment scripts and front-end integration of these endpoints.

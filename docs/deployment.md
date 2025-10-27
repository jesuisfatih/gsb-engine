# Deployment Guide (Database + API)

This document outlines how to deploy the new Prisma-backed API alongside the front-end.

---

## 1. Environment Provisioning

1. **Database**  
   - Create a PostgreSQL instance (Neon / Cloud SQL / AWS RDS).  
   - Store the connection string as `DATABASE_URL` in your secret manager.
2. **Secrets**  
   - API services should load variables via environment (e.g. Cloud Run, ECS task definition).  
   - Avoid committing raw `.env` files—use `.env.example` as reference.

---

## 2. Build & Release Pipeline

Recommended CI steps:

```bash
# 1. Install dependencies
npm ci

# 2. Generate Prisma client
npm run db:generate

# 3. Run build & tests (front-end)
npm run build

# 4. Apply migrations against staging/production
npm run db:migrate:deploy

# 5. Build API image/bundle (example using Docker)
docker build -f Dockerfile.api -t gsb-api:latest .
```

### Sample Dockerfile (API)

```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run db:generate

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
CMD ["node", "--loader", "tsx", "server/src/main.ts"]
```

> Adjust the command if you prefer compiling TypeScript to JavaScript before shipping.

---

## 3. Deployment Targets

| Target | Notes |
|--------|-------|
| **Google Cloud Run** | Deploy API container, configure `DATABASE_URL` via Secret Manager & env vars. |
| **AWS ECS/Fargate** | Similar workflow; store secrets in Secrets Manager / Parameter Store. |
| **Vercel / Netlify Functions** | Use Prisma Accelerate or pooled connection string; configure handler to reuse Prisma client. |

Ensure connection pooling when using serverless platforms (Neon pooled connection, PgBouncer, Cloud SQL Auth Proxy).

---

## 4. Migration Strategy

* Each schema change -> `npm run db:migrate` locally, commit the generated migration.  
* In CI/CD use `npm run db:migrate:deploy` to apply pending migrations.  
* For rollback: `prisma migrate resolve --rolled-back <migration_name>` followed by redeploy with previous schema.

---

## 5. Observability

* Add structured logging in `server/src/app.ts` (Pino/Winston).  
* Expose `/api/health` for readiness/liveness checks.  
* Track Prisma metrics/logs via `prisma.$on("query")` if needed.

With this pipeline established you can iterate on the API safely while ensuring the database schema stays in sync across environments.

# Prisma Setup & Usage

This project now ships with Prisma for database access.  
Follow the steps below to connect the platform to your PostgreSQL provider (Neon, Cloud SQL, RDS, etc.).

---

## 1. Configure Connection

Update `.env` with the connection string for **your** Postgres instance:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Examples:

* **Neon** – `postgresql://user:password@ep-neon.aws.neon.tech/neondb?sslmode=require`
* **GCP Cloud SQL** (cloud proxy) – `postgresql://user:password@127.0.0.1:5432/dbname`
* **AWS RDS** – `postgresql://user:password@cluster-id.abcdefghijkl.us-east-1.rds.amazonaws.com:5432/dbname`

> The Prisma config now loads environment variables via `dotenv`, so any CLI command (`npm run db:*`) reads `.env`.

---

## 2. Useful Commands

| Script | Action |
|--------|--------|
| `npm run db:generate` | Regenerate the Prisma client after changing the schema. |
| `npm run db:push` | Push the current schema to the database (no migrations). Useful for rapid prototyping. |
| `npm run db:migrate` | Create & run a migration. Prisma will prompt for a migration name. |
| `npm run db:migrate:deploy` | Apply pending migrations in CI/CD or production. |
| `npm run db:studio` | Launch Prisma Studio to inspect/edit data. |

---

## 3. Developer Workflow

1. **Model changes** → edit `prisma/schema.prisma`.
2. **Generate migration** → `npm run db:migrate` (name it meaningfully, e.g. `init`, `add-pricing-rule-table`).
3. **Generate client** → `npm run db:generate` (automatically re-run by `migrate`).
4. **Use in code** → import from `@/generated/prisma` (see upcoming API layer).

### Multi-tenant Safety

* Every tenant-owned table includes a `tenantId` column; enforce scoping in queries.
* Add additional database policies / views when Postgres row-level security is enabled.
* API routes should read the active tenant from session/auth context and pass it to Prisma queries.

---

## 4. Target Providers

The schema is compatible with hosted Postgres services:

* **Neon** – serverless, pooled, global edge deployments.
* **Google Cloud SQL** – connect via public IP + SSL or Cloud SQL Proxy.
* **AWS RDS / Aurora** – standard Postgres with optional IAM auth.

Remember to:

* Enable SSL (`?sslmode=require`) when required.
* Provision connection pooling (PgBouncer, Cloud SQL Proxy, Neon pooled URLs) for serverless runtimes.
* Store secrets in a secure manager (Vault, Secrets Manager, Secret Manager) instead of committing `.env`.

---

The next milestone will scaffold the API layer that uses this Prisma client, followed by deployment scripts and front-end integration.

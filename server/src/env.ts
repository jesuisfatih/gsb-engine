import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default(process.env.NODE_ENV ?? "development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  ALLOW_DEV_TENANT_HEADER: z.coerce.boolean().default(false),
  SHOPIFY_STORE_DOMAIN: z.string().trim().optional(),
  SHOPIFY_STOREFRONT_TOKEN: z.string().trim().optional(),
  SHOPIFY_STOREFRONT_API_VERSION: z.string().trim().default("2024-04"),
  SHOPIFY_TEST_VARIANT_GID: z.string().trim().optional(),
  SHOPIFY_API_KEY: z.string().trim().optional(),
  SHOPIFY_API_SECRET: z.string().trim().optional(),
  SHOPIFY_DEFAULT_TENANT_SLUG: z.string().trim().optional(),
  SHOPIFY_VALIDATE_SESSION_SIGNATURE: z.coerce.boolean().default(false),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MOCKUP_SERVICE_URL: z.string().trim().optional(),
  MOCKUP_SERVICE_TOKEN: z.string().trim().optional(),
  NOTIFICATION_MODE: z.enum(["mock", "webhook", "disabled"]).default("mock"),
  NOTIFICATION_WEBHOOK_URL: z.string().trim().optional(),
  NOTIFICATION_FALLBACK_EMAIL: z.string().trim().optional(),
});

export const env = envSchema.parse(process.env);

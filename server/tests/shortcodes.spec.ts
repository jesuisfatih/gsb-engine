import request from "supertest";
import { nanoid } from "nanoid";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client";
import { createApp } from "../src/app";
import { generateAccessToken } from "../src/auth/jwt";

const prisma = new PrismaClient();
const app = createApp();

type TenantContext = {
  tenantId: string;
  userId: string;
  token: string;
};

async function createTenantContext(): Promise<TenantContext> {
  const slugSuffix = nanoid(6).toLowerCase();
  const tenant = await prisma.tenant.create({
    data: {
      slug: `shortcode-${slugSuffix}`,
      displayName: `Shortcode Tenant ${slugSuffix}`,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `shortcode-${slugSuffix}@example.com`,
      displayName: "Shortcode Tester",
    },
  });

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: "MERCHANT_ADMIN",
    },
  });

  const token = generateAccessToken({
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    tenantMemberships: [{ tenantId: tenant.id, role: "MERCHANT_ADMIN" }],
    defaultTenantId: tenant.id,
  });

  return { tenantId: tenant.id, userId: user.id, token };
}

async function cleanupTenantContext(ctx: TenantContext) {
  const { tenantId, userId } = ctx;
  await prisma.shortcodeUsage.deleteMany({ where: { tenantId } });
  await prisma.shortcode.deleteMany({ where: { tenantId } });
  await prisma.tenantUser.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.shortcodeUsage.deleteMany();
  await prisma.shortcode.deleteMany();
});

describe("Shortcode API", () => {
  it("creates shortcode and tracks usage", async () => {
    const ctx = await createTenantContext();
    const { tenantId, token } = ctx;

    try {
      const createResponse = await request(app)
        .post("/api/shortcodes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          handle: "dtf-shirt-front",
          productGid: "gid://shopify/Product/123",
          productTitle: "DTF Shirt",
          technique: "dtf",
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.embed).toBeDefined();
      expect(createResponse.body.data.usageTotal).toBe(0);

      const embedFetch = await request(app)
        .get("/api/embed/shortcodes/dtf-shirt-front")
        .set("referer", "https://shop.example.com")
        .set("user-agent", "vitest");

      expect(embedFetch.status).toBe(200);

      const listResponse = await request(app)
        .get("/api/shortcodes")
        .set("Authorization", `Bearer ${token}`);

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body.data)).toBe(true);
      const record = listResponse.body.data.find((item: any) => item.handle === "dtf-shirt-front");
      expect(record).toBeDefined();
      expect(record.usageTotal).toBeGreaterThanOrEqual(1);
      expect(record.usageLast7).toBeGreaterThanOrEqual(1);
      expect(record.embed?.div).toContain("data-gsb-shortcode");

      const embedDetails = await request(app)
        .get("/api/shortcodes/dtf-shirt-front/embed")
        .set("Authorization", `Bearer ${token}`);

      expect(embedDetails.status).toBe(200);
      expect(embedDetails.body.data.record.handle).toBe("dtf-shirt-front");
      expect(embedDetails.body.data.usageTotal).toBeGreaterThanOrEqual(1);
      expect(embedDetails.body.data.embed.div).toContain("data-gsb-shortcode");
    } finally {
      await cleanupTenantContext(ctx);
    }
  });
});

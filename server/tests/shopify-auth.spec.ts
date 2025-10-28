import "./setup-env";

import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { PrismaClient } from "../../src/generated/prisma/client";

process.env.SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET ?? "test_secret";
process.env.SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY ?? "test_api_key";

import { createApp } from "../src/app";

const prisma = new PrismaClient();
const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Shopify embedded auth", () => {
  it("exchanges App Bridge token for platform access token", async () => {
    const slugSuffix = nanoid(6).toLowerCase();
    const shopDomain = `test-shop-${slugSuffix}.myshopify.com`;
    const tenant = await prisma.tenant.create({
      data: {
        slug: `shop-${slugSuffix}`,
        displayName: `Shop ${slugSuffix}`,
        settings: {
          shopify: {
            domain: shopDomain,
          },
        },
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `merchant-${slugSuffix}@example.com`,
        displayName: "Merchant Owner",
      },
    });

    await prisma.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "MERCHANT_ADMIN",
      },
    });

    const secret = process.env.SHOPIFY_API_SECRET ?? "test_secret";
    const token = jwt.sign(
      {
        dest: `https://${shopDomain}`,
        aud: process.env.SHOPIFY_API_KEY,
      },
      secret,
      { algorithm: "HS256", expiresIn: "5m" },
    );

    const response = await request(app)
      .post("/api/auth/shopify/session")
      .send({ token });

    expect(response.status).toBe(200);
    expect(response.body?.data?.accessToken).toBeTruthy();
    expect(response.body?.data?.tenantId).toBe(tenant.id);
    expect(response.body?.data?.user?.email).toBe(user.email);
    expect(response.body?.data?.user?.role).toBe("merchant-admin");

    const setCookie = response.header["set-cookie"] ?? [];
    const cookieString = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
    expect(cookieString).toContain("accessToken=");
    expect(cookieString).toContain("tenantId=");
  });

  it("rejects tokens signed with wrong secret", async () => {
    const token = jwt.sign(
      {
        dest: "https://bogus-shop.myshopify.com",
        aud: "bogus",
      },
      "another-secret",
      { algorithm: "HS256", expiresIn: "5m" },
    );

    const response = await request(app)
      .post("/api/auth/shopify/session")
      .send({ token });

    expect(response.status).toBe(401);
    expect(response.body?.error).toBeDefined();
  });
});

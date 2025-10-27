#!/usr/bin/env tsx
import "dotenv/config";
import { env } from "../server/src/env";

const FAILED = 1;

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//i, "").trim();
}

function assertEnv(value: string | undefined, key: string) {
  if (!value) {
    console.error(`Environment variable ${key} is required for this check.`);
    process.exitCode = FAILED;
    throw new Error(`Missing ${key}`);
  }
}

async function fetchShopify<T>(endpoint: string, token: string, body: any): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  return await response.json();
}

async function verifyShopDetails(endpoint: string, token: string) {
  const result = await fetchShopify<{
    data?: { shop?: { name: string; primaryDomain?: { url: string } } };
    errors?: unknown;
  }>(endpoint, token, {
    query: `
      query ShopInfo {
        shop {
          name
          primaryDomain { url }
        }
      }
    `,
  });

  if (result.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  if (!result.data?.shop) throw new Error("Shop info missing from response.");

  const shop = result.data.shop;
  console.log(`✔ Connected to shop "${shop.name}"`);
  if (shop.primaryDomain?.url) {
    console.log(`  Primary domain: ${shop.primaryDomain.url}`);
  }
}

async function runCartSmokeTest(endpoint: string, token: string, variantId: string) {
  console.log("Running cartCreate smoke test...");
  const result = await fetchShopify<{
    data?: { cartCreate?: { cart?: { id: string; checkoutUrl: string | null }; userErrors?: Array<{ message: string; code?: string }> } };
  }>(endpoint, token, {
    query: `
      mutation CartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            code
            message
          }
        }
      }
    `,
    variables: {
      input: {
        lines: [
          {
            quantity: 1,
            merchandiseId: variantId,
            attributes: [
              { key: "Design ID", value: "gsb-verification" },
              { key: "Technique", value: "dtf" },
            ],
          },
        ],
        note: "GSB checkout verification",
      },
    },
  });

  const cartCreate = result.data?.cartCreate;
  if (!cartCreate) throw new Error("cartCreate response missing.");
  if (cartCreate.userErrors && cartCreate.userErrors.length) {
    const first = cartCreate.userErrors[0];
    throw new Error(`cartCreate user error: ${first.message}${first.code ? ` (${first.code})` : ""}`);
  }
  const checkoutUrl = cartCreate.cart?.checkoutUrl;
  if (!checkoutUrl) throw new Error("cartCreate succeeded but no checkoutUrl returned.");

  console.log(`✔ cartCreate succeeded. Checkout URL: ${checkoutUrl}`);
  console.log("  Open the URL in a browser to confirm the draft cart, then abandon/delete it.");
}

async function main() {
  const domain = env.SHOPIFY_STORE_DOMAIN;
  const token = env.SHOPIFY_STOREFRONT_TOKEN;
  const apiVersion = env.SHOPIFY_STOREFRONT_API_VERSION ?? "2024-04";
  const testVariant = env.SHOPIFY_TEST_VARIANT_GID;

  assertEnv(domain, "SHOPIFY_STORE_DOMAIN");
  assertEnv(token, "SHOPIFY_STOREFRONT_TOKEN");

  const host = normalizeDomain(domain!);
  const endpoint = `https://${host}/api/${apiVersion}/graphql.json`;

  console.log("Checking Shopify Storefront configuration...");
  console.log(`  Domain: ${host}`);
  console.log(`  API version: ${apiVersion}`);

  await verifyShopDetails(endpoint, token!);

  if (testVariant) {
    await runCartSmokeTest(endpoint, token!, testVariant);
  } else {
    console.log("ℹ Skipping cartCreate smoke test (SHOPIFY_TEST_VARIANT_GID not set).");
  }
}

main().catch(error => {
  console.error("Shopify configuration check failed:", error.message ?? error);
  process.exitCode = FAILED;
});

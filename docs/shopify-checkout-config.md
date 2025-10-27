# Shopify Checkout Configuration & Verification

This guide explains how to wire your live Shopify storefront to the Gang Sheet Builder checkout redirect and how to sanity-check the connection before shipping to merchants.

## 1. Required environment variables

Add the following keys to your `.env.local` or deployment secrets. Examples are provided in `.env.example`.

| Variable | Description |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | The shop’s domain, e.g. `example.myshopify.com`. |
| `SHOPIFY_STOREFRONT_TOKEN` | Storefront API access token with `unauthenticated_write_checkouts` scope. |
| `SHOPIFY_STOREFRONT_API_VERSION` | Optional. Defaults to `2024-04`. Keep this synced with Shopify releases. |
| `SHOPIFY_TEST_VARIANT_GID` | Optional. Variant GID used by the checkout smoke test (format `gid://shopify/ProductVariant/<id>`). |

Restart the API after updating environment variables so the proxy route can read them.

## 2. Local verification script

Run the helper script once credentials are in place:

```bash
npm run shopify:check
```

The script performs two checks:

1. **Shop ping** – Queries `shop { name }` via Storefront API to confirm domain/token are valid.
2. **Optional cartCreate smoke test** – If `SHOPIFY_TEST_VARIANT_GID` is defined, it creates a draft cart with the configured variant and prints the checkout URL. The cart is not completed and can be discarded from Shopify admin (Checkouts → Abandoned).

If any check fails, the script exits with a non-zero code and prints the error returned by Shopify.

## 3. End-to-end checkout test

Once the script passes:

1. Expose the responsive editor button on a storefront product (see `docs/shopify-app-embed.md`).
2. Open the product page in a storefront session and click the **Edit design** button.
3. Complete a sample design and submit → the app should redirect to the Shopify checkout URL returned by `/api/proxy/cart`.
4. In Shopify admin, open the resulting order (or abandoned checkout) and confirm the **Line item properties** include:
   - `Design ID`
   - `Technique`
   - `Surface ID`
   - `Preview URL`
   - Additional metrics (sheet size, area, color count) if provided
5. Cancel or refund the test order before going live.

## 4. Deployment checklist

- [ ] Environment variables set in production (domain, token, API version).
- [ ] `npm run shopify:check` succeeds in the deployment environment.
- [ ] Theme/app embed renders the responsive button and links to the correct shortcode.
- [ ] Checkout redirect verified manually, and design properties appear in Shopify order.
- [ ] Shopify secret values stored in your secrets manager (not committed).

Keep this document in sync whenever the checkout payload or Shopify API version changes.

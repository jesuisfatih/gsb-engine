/**
 * Shopify Admin API Service
 * Product fetch, Draft Order creation
 */

import axios from 'axios';

const SHOPIFY_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-01';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';

/**
 * Fetch product details by GID
 */
export async function fetchProduct(productGid: string, shop: string) {
  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        descriptionHtml
        featuredImage {
          url
          altText
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              sku
              inventoryQuantity
              image {
                url
              }
            }
          }
        }
      }
    }
  `;

  const response = await axios.post(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      query,
      variables: { id: productGid },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    }
  );

  return response.data.data.product;
}

/**
 * Create draft order with design
 */
export async function createDraftOrder(params: {
  shop: string;
  variantId: string;
  designId: string;
  previewUrl: string;
  properties: Record<string, string>;
  anonymousId?: string;
}) {
  const { shop, variantId, designId, previewUrl, properties, anonymousId } = params;

  const draftOrder = {
    line_items: [
      {
        variant_id: variantId,
        quantity: 1,
        properties: [
          { name: '_Design_ID', value: designId },
          { name: '_Preview_URL', value: previewUrl },
          ...Object.entries(properties).map(([name, value]) => ({ name, value })),
        ],
      },
    ],
    note: `GSB Design: ${designId}${anonymousId ? ` | Anonymous: ${anonymousId}` : ''}`,
    tags: ['gsb_design', 'pending_purchase'],
    metafields: [
      {
        namespace: 'gsb',
        key: 'design_id',
        value: designId,
        type: 'single_line_text_field',
      },
    ],
  };

  const response = await axios.post(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/draft_orders.json`,
    { draft_order: draftOrder },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    }
  );

  return response.data.draft_order;
}

/**
 * Convert draft order to cart (for checkout)
 */
export async function completeDraftOrder(draftOrderId: string, shop: string) {
  const response = await axios.put(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/draft_orders/${draftOrderId}/complete.json`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    }
  );

  return response.data.draft_order;
}


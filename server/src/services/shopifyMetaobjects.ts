/**
 * Shopify Metaobjects Service
 * 
 * Manages custom design data as Shopify Metaobjects for:
 * - Persistent storage in Shopify
 * - Customer account integration
 * - Re-order functionality
 * - Search and filtering
 */

import type { DesignDocument } from "../generated/prisma/client";

export interface ShopifyMetaobjectDesign {
  id: string;
  handle: string;
  designId: string;
  snapshot: string;
  previewUrl: string;
  productTitle: string;
  surfaceName: string;
  dimensions: string;
  technique: string;
  colorCount: number;
  minDpi: number;
  createdAt: string;
}

/**
 * Create or update design as Shopify Metaobject
 */
export async function saveDesignToShopifyMetaobject(
  design: DesignDocument & { product?: { title?: string }; surface?: { name?: string } },
  shopifyDomain: string,
  shopifyAccessToken: string
): Promise<{ id: string; handle: string } | null> {
  try {
    const handle = `design-${design.id}`;
    
    const mutation = `
      mutation CreateOrUpdateDesignMetaobject($metaobject: MetaobjectUpsertInput!) {
        metaobjectUpsert(metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metaobject: {
        handle,
        type: 'customer_design',
        fields: [
          { key: 'design_id', value: design.id },
          { key: 'snapshot', value: JSON.stringify(design.snapshot) },
          { key: 'preview_url', value: design.previewUrl || '' },
          { key: 'product_title', value: design.product?.title || 'Custom Product' },
          { key: 'surface_name', value: design.surface?.name || 'Standard Surface' },
          { 
            key: 'dimensions', 
            value: design.sheetWidthMm && design.sheetHeightMm
              ? `${Math.round(design.sheetWidthMm)} × ${Math.round(design.sheetHeightMm)} mm`
              : 'Custom Size'
          },
          { key: 'technique', value: design.printTech || 'DTF' },
          { 
            key: 'color_count', 
            value: String((design.metrics as any)?.colorCount || 0) 
          },
          { 
            key: 'min_dpi', 
            value: String((design.metrics as any)?.minDpi || 300) 
          },
          { key: 'created_at', value: design.createdAt.toISOString() },
        ],
      },
    };

    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAccessToken,
        },
        body: JSON.stringify({ query: mutation, variables }),
      }
    );

    if (!response.ok) {
      console.error('[metaobjects] Failed to save design:', response.status);
      return null;
    }

    const data = await response.json();
    const errors = data.data?.metaobjectUpsert?.userErrors;

    if (errors && errors.length > 0) {
      console.error('[metaobjects] Shopify errors:', errors);
      return null;
    }

    const metaobject = data.data?.metaobjectUpsert?.metaobject;
    console.log('[metaobjects] Design saved:', metaobject?.handle);

    return {
      id: metaobject?.id,
      handle: metaobject?.handle,
    };
  } catch (error) {
    console.error('[metaobjects] Error saving design:', error);
    return null;
  }
}

/**
 * Retrieve design from Shopify Metaobject
 */
export async function getDesignFromShopifyMetaobject(
  designId: string,
  shopifyDomain: string,
  shopifyAccessToken: string
): Promise<ShopifyMetaobjectDesign | null> {
  try {
    const handle = `design-${designId}`;

    const query = `
      query GetDesignMetaobject($handle: String!) {
        metaobjectByHandle(handle: $handle) {
          id
          handle
          fields {
            key
            value
          }
        }
      }
    `;

    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAccessToken,
        },
        body: JSON.stringify({ 
          query, 
          variables: { handle } 
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const metaobject = data.data?.metaobjectByHandle;

    if (!metaobject) {
      return null;
    }

    const fields = metaobject.fields.reduce((acc: any, field: any) => {
      acc[field.key] = field.value;
      return acc;
    }, {});

    return {
      id: metaobject.id,
      handle: metaobject.handle,
      designId: fields.design_id,
      snapshot: fields.snapshot,
      previewUrl: fields.preview_url,
      productTitle: fields.product_title,
      surfaceName: fields.surface_name,
      dimensions: fields.dimensions,
      technique: fields.technique,
      colorCount: parseInt(fields.color_count) || 0,
      minDpi: parseInt(fields.min_dpi) || 300,
      createdAt: fields.created_at,
    };
  } catch (error) {
    console.error('[metaobjects] Error fetching design:', error);
    return null;
  }
}

/**
 * List all designs for a customer from Shopify Metaobjects
 */
export async function listCustomerDesigns(
  customerId: string,
  shopifyDomain: string,
  shopifyAccessToken: string
): Promise<ShopifyMetaobjectDesign[]> {
  try {
    const query = `
      query ListCustomerDesigns($query: String!) {
        metaobjects(type: "customer_design", first: 50, query: $query) {
          edges {
            node {
              id
              handle
              fields {
                key
                value
              }
            }
          }
        }
      }
    `;

    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAccessToken,
        },
        body: JSON.stringify({
          query,
          variables: {
            query: `customer_id:${customerId}`,
          },
        }),
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const edges = data.data?.metaobjects?.edges || [];

    return edges.map((edge: any) => {
      const metaobject = edge.node;
      const fields = metaobject.fields.reduce((acc: any, field: any) => {
        acc[field.key] = field.value;
        return acc;
      }, {});

      return {
        id: metaobject.id,
        handle: metaobject.handle,
        designId: fields.design_id,
        snapshot: fields.snapshot,
        previewUrl: fields.preview_url,
        productTitle: fields.product_title,
        surfaceName: fields.surface_name,
        dimensions: fields.dimensions,
        technique: fields.technique,
        colorCount: parseInt(fields.color_count) || 0,
        minDpi: parseInt(fields.min_dpi) || 300,
        createdAt: fields.created_at,
      };
    });
  } catch (error) {
    console.error('[metaobjects] Error listing designs:', error);
    return [];
  }
}

/**
 * Delete design metaobject
 */
export async function deleteDesignFromShopifyMetaobject(
  designId: string,
  shopifyDomain: string,
  shopifyAccessToken: string
): Promise<boolean> {
  try {
    const handle = `design-${designId}`;

    const mutation = `
      mutation DeleteDesignMetaobject($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `;

    // First, get the metaobject ID
    const metaobject = await getDesignFromShopifyMetaobject(
      designId,
      shopifyDomain,
      shopifyAccessToken
    );

    if (!metaobject) {
      return false;
    }

    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAccessToken,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { id: metaobject.id },
        }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const errors = data.data?.metaobjectDelete?.userErrors;

    if (errors && errors.length > 0) {
      console.error('[metaobjects] Delete errors:', errors);
      return false;
    }

    console.log('[metaobjects] Design deleted:', handle);
    return true;
  } catch (error) {
    console.error('[metaobjects] Error deleting design:', error);
    return false;
  }
}


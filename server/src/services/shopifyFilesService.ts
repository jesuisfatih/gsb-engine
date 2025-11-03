/**
 * Shopify Files API Service
 * Uploads images to Shopify's CDN using GraphQL Admin API
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

interface StagedUploadTarget {
  url: string;
  resourceUrl: string;
  parameters: { name: string; value: string }[];
}

interface FileCreateResponse {
  fileCreateUrl: string;
  alt?: string;
}

export class ShopifyFilesService {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string = '2024-01';

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
  }

  /**
   * Upload an image buffer to Shopify Files API
   * Returns the CDN URL of the uploaded image
   */
  async uploadImage(
    imageBuffer: Buffer,
    filename: string,
    alt?: string
  ): Promise<string> {
    try {
      // Step 1: Create staged upload
      const stagedUpload = await this.createStagedUpload(filename);

      // Step 2: Upload file to staged URL
      await this.uploadToStagedUrl(stagedUpload, imageBuffer, filename);

      // Step 3: Create file in Shopify
      const cdnUrl = await this.createFile(stagedUpload.resourceUrl, alt);

      console.log('[ShopifyFiles] ✅ Image uploaded:', cdnUrl);
      return cdnUrl;
    } catch (error) {
      console.error('[ShopifyFiles] ❌ Upload failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Create a staged upload target
   */
  private async createStagedUpload(filename: string): Promise<StagedUploadTarget> {
    const mutation = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: [
        {
          resource: 'FILE',
          filename,
          mimeType: this.getMimeType(filename),
          httpMethod: 'POST',
        },
      ],
    };

    const response = await this.graphqlRequest(mutation, variables);

    if (response.data.stagedUploadsCreate.userErrors.length > 0) {
      throw new Error(
        `Staged upload creation failed: ${JSON.stringify(
          response.data.stagedUploadsCreate.userErrors
        )}`
      );
    }

    return response.data.stagedUploadsCreate.stagedTargets[0];
  }

  /**
   * Step 2: Upload file to the staged URL
   */
  private async uploadToStagedUrl(
    stagedUpload: StagedUploadTarget,
    imageBuffer: Buffer,
    filename: string
  ): Promise<void> {
    const form = new FormData();

    // Add all parameters from staged upload
    for (const param of stagedUpload.parameters) {
      form.append(param.name, param.value);
    }

    // Add the file
    form.append('file', imageBuffer, {
      filename,
      contentType: this.getMimeType(filename),
    });

    const uploadResponse = await fetch(stagedUpload.url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`File upload to staged URL failed: ${errorText}`);
    }
  }

  /**
   * Step 3: Create the file in Shopify
   */
  private async createFile(resourceUrl: string, alt?: string): Promise<string> {
    const mutation = `
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            ... on GenericFile {
              url
              alt
            }
            ... on MediaImage {
              image {
                url
                altText
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      files: [
        {
          originalSource: resourceUrl,
          alt: alt || 'Custom design preview',
          contentType: 'IMAGE',
        },
      ],
    };

    const response = await this.graphqlRequest(mutation, variables);

    if (response.data.fileCreate.userErrors.length > 0) {
      throw new Error(
        `File creation failed: ${JSON.stringify(response.data.fileCreate.userErrors)}`
      );
    }

    const file = response.data.fileCreate.files[0];
    
    // Return URL based on file type
    if (file.image) {
      return file.image.url;
    } else if (file.url) {
      return file.url;
    }

    throw new Error('No URL returned from fileCreate mutation');
  }

  /**
   * Make a GraphQL request to Shopify Admin API
   */
  private async graphqlRequest(query: string, variables: any): Promise<any> {
    const endpoint = `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GraphQL request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result;
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/png';
    }
  }
}

/**
 * Factory function to create ShopifyFilesService
 * Gets credentials from environment
 */
export function createShopifyFilesService(): ShopifyFilesService {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    throw new Error(
      'Missing Shopify credentials: SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN required'
    );
  }

  return new ShopifyFilesService(shopDomain, accessToken);
}


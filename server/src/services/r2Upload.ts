/**
 * Cloudflare R2 Upload Service
 * S3-compatible object storage
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const R2_ACCOUNT_ID = '3b964e63af3f0e752c640e35dab68c9b';
const R2_BUCKET = 'gsb-power';
const R2_PUBLIC_URL = 'https://power.gsb-engine.dev';

// R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Upload design preview image to R2
 */
export async function uploadDesignPreview(
  imageBuffer: Buffer,
  designId: string,
  contentType = 'image/png'
): Promise<UploadResult> {
  const key = `designs/previews/${designId}.png`;
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // 1 year
    Metadata: {
      designId,
      uploadedAt: new Date().toISOString(),
    },
  });

  await r2Client.send(command);

  return {
    url: `${R2_PUBLIC_URL}/${key}`,
    key,
    bucket: R2_BUCKET,
  };
}

/**
 * Upload high-res design for download
 */
export async function uploadDesignHighRes(
  imageBuffer: Buffer,
  designId: string,
  dpi: number = 300
): Promise<UploadResult> {
  const key = `designs/highres/${designId}_${dpi}dpi.png`;
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000',
    Metadata: {
      designId,
      dpi: dpi.toString(),
      type: 'highres',
    },
  });

  await r2Client.send(command);

  return {
    url: `${R2_PUBLIC_URL}/${key}`,
    key,
    bucket: R2_BUCKET,
  };
}

/**
 * Upload design JSON data
 */
export async function uploadDesignJSON(
  designData: any,
  designId: string
): Promise<UploadResult> {
  const key = `designs/json/${designId}.json`;
  const buffer = Buffer.from(JSON.stringify(designData, null, 2));
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/json',
    CacheControl: 'public, max-age=3600', // 1 hour
  });

  await r2Client.send(command);

  return {
    url: `${R2_PUBLIC_URL}/${key}`,
    key,
    bucket: R2_BUCKET,
  };
}

/**
 * Generate pre-signed URL for temporary access
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Upload from base64 data URL
 */
export async function uploadFromDataURL(
  dataURL: string,
  designId: string
): Promise<UploadResult> {
  // Parse data URL: data:image/png;base64,iVBORw0KG...
  const matches = dataURL.match(/^data:(.+);base64,(.+)$/);
  
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  return await uploadDesignPreview(buffer, designId, contentType);
}


/**
 * Design Image Generation Service
 * Generates thumbnail and print-ready images from design snapshots
 */

import sharp from 'sharp';

export interface DesignImageSet {
  thumbnail: Buffer; // Small preview (200x200)
  printReady: Buffer; // High-res for production (300 DPI)
}

export interface DesignDimensions {
  widthPx: number;
  heightPx: number;
  widthMm?: number;
  heightMm?: number;
}

export class DesignImageService {
  /**
   * Generate both thumbnail and print-ready images from a preview image
   */
  async generateImageSet(
    previewDataUrl: string,
    dimensions: DesignDimensions
  ): Promise<DesignImageSet> {
    // Remove data URL prefix
    const base64Data = previewDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate thumbnail (200x200, optimized for web)
    const thumbnail = await this.generateThumbnail(imageBuffer);

    // Generate print-ready (high-res, 300 DPI equivalent)
    const printReady = await this.generatePrintReady(imageBuffer, dimensions);

    return { thumbnail, printReady };
  }

  /**
   * Generate a small thumbnail (200x200) for merchant panel preview
   */
  private async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    return await sharp(imageBuffer)
      .resize(200, 200, {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer();
  }

  /**
   * Generate high-resolution print-ready image
   * Scales to 300 DPI equivalent based on physical dimensions
   */
  private async generatePrintReady(
    imageBuffer: Buffer,
    dimensions: DesignDimensions
  ): Promise<Buffer> {
    // Calculate target resolution for 300 DPI
    // If we have physical dimensions (mm), calculate exact pixels
    let targetWidth = dimensions.widthPx;
    let targetHeight = dimensions.heightPx;

    if (dimensions.widthMm && dimensions.heightMm) {
      // Convert mm to inches, then multiply by 300 DPI
      const DPI = 300;
      const MM_PER_INCH = 25.4;
      
      targetWidth = Math.round((dimensions.widthMm / MM_PER_INCH) * DPI);
      targetHeight = Math.round((dimensions.heightMm / MM_PER_INCH) * DPI);
    } else {
      // If no physical dimensions, scale up by 2x for higher quality
      targetWidth = dimensions.widthPx * 2;
      targetHeight = dimensions.heightPx * 2;
    }

    // Cap at reasonable size to avoid huge files
    const MAX_DIMENSION = 10000;
    if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(targetWidth, targetHeight);
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
    }

    return await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png({
        compressionLevel: 6, // Good balance of quality and size
        quality: 95,
      })
      .toBuffer();
  }

  /**
   * Get estimated file sizes (for logging/debugging)
   */
  async getFileSizes(imageSet: DesignImageSet): Promise<{
    thumbnailKb: number;
    printReadyKb: number;
  }> {
    return {
      thumbnailKb: Math.round(imageSet.thumbnail.length / 1024),
      printReadyKb: Math.round(imageSet.printReady.length / 1024),
    };
  }
}

export function createDesignImageService(): DesignImageService {
  return new DesignImageService();
}


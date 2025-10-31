/**
 * AI-Powered Packing Optimization
 * Uses TensorFlow.js for intelligent gang sheet packing
 */

import * as tf from '@tensorflow/tfjs';
import type { LayerItem } from '../types';

export interface PackingResult {
  items: LayerItem[];
  utilization: number;
  wastedArea: number;
  packingTime: number;
}

export class AIPackingOptimizer {
  private model: tf.LayersModel | null = null;
  private modelLoaded = false;

  /**
   * Load pre-trained packing model
   */
  async loadModel(): Promise<void> {
    if (this.modelLoaded) return;

    try {
      // Try to load custom model
      this.model = await tf.loadLayersModel('/models/packing-optimizer-v1/model.json');
      this.modelLoaded = true;
      console.log('[ai-packing] Model loaded successfully');
    } catch (error) {
      console.warn('[ai-packing] Custom model not found, using rule-based fallback');
      this.modelLoaded = false;
    }
  }

  /**
   * Optimize item packing using AI
   */
  async optimize(
    items: LayerItem[],
    sheetSize: { w: number; h: number },
    options?: {
      margin?: number;
      allowRotation?: boolean;
      priorityOrder?: 'size' | 'complexity' | 'order';
    }
  ): Promise<PackingResult> {
    const startTime = performance.now();

    await this.loadModel();

    let optimizedItems: LayerItem[];

    if (this.model && this.modelLoaded) {
      // Use AI model
      optimizedItems = await this.aiPackItems(items, sheetSize, options);
    } else {
      // Fallback to advanced rule-based algorithm
      optimizedItems = await this.advancedRuleBasedPack(items, sheetSize, options);
    }

    const packingTime = performance.now() - startTime;
    const utilization = this.calculateUtilization(optimizedItems, sheetSize);
    const usedArea = this.calculateUsedArea(optimizedItems);
    const totalArea = sheetSize.w * sheetSize.h;
    const wastedArea = totalArea - usedArea;

    return {
      items: optimizedItems,
      utilization,
      wastedArea,
      packingTime,
    };
  }

  /**
   * AI-based packing (when model is available)
   */
  private async aiPackItems(
    items: LayerItem[],
    sheetSize: { w: number; h: number },
    options?: any
  ): Promise<LayerItem[]> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Prepare input features
    const features = items.map(item => this.extractFeatures(item, sheetSize));
    const inputTensor = tf.tensor2d(features);

    // Predict optimal positions
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const positions = await prediction.array() as number[][];

    // Apply predicted positions
    const packed = items.map((item, idx) => ({
      ...item,
      x: positions[idx][0] * sheetSize.w,
      y: positions[idx][1] * sheetSize.h,
      rotation: options?.allowRotation ? positions[idx][2] * 360 : item.rotation || 0,
    }));

    // Cleanup
    inputTensor.dispose();
    prediction.dispose();

    return packed;
  }

  /**
   * Advanced rule-based packing (fallback or standalone)
   */
  private async advancedRuleBasedPack(
    items: LayerItem[],
    sheetSize: { w: number; h: number },
    options?: any
  ): Promise<LayerItem[]> {
    const margin = options?.margin || 8;
    const allowRotation = options?.allowRotation ?? true;

    // Sort items by area (largest first) - proven best strategy
    const sorted = [...items].sort((a, b) => {
      const areaA = this.getItemArea(a);
      const areaB = this.getItemArea(b);
      return areaB - areaA;
    });

    const packed: LayerItem[] = [];
    const placedRects: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (const item of sorted) {
      const itemDims = this.getItemDimensions(item);
      let bestPosition: { x: number; y: number; rotated: boolean } | null = null;
      let bestWaste = Infinity;

      // Try different positions
      const positions = this.generateCandidatePositions(
        itemDims,
        sheetSize,
        placedRects,
        margin,
        allowRotation
      );

      for (const pos of positions) {
        const waste = this.calculatePositionWaste(pos, placedRects, sheetSize);
        if (waste < bestWaste) {
          bestWaste = waste;
          bestPosition = pos;
        }
      }

      if (bestPosition) {
        const newItem = { ...item };
        newItem.x = bestPosition.x;
        newItem.y = bestPosition.y;

        if (bestPosition.rotated && allowRotation) {
          newItem.rotation = (newItem.rotation || 0) + 90;
        }

        packed.push(newItem);

        placedRects.push({
          x: newItem.x,
          y: newItem.y,
          width: bestPosition.rotated ? itemDims.height : itemDims.width,
          height: bestPosition.rotated ? itemDims.width : itemDims.height,
        });
      } else {
        // Can't fit - place anyway (will show warning)
        packed.push(item);
      }
    }

    return packed;
  }

  /**
   * Extract features for AI model
   */
  private extractFeatures(item: LayerItem, sheetSize: { w: number; h: number }): number[] {
    const dims = this.getItemDimensions(item);
    
    return [
      dims.width / sheetSize.w,  // Normalized width
      dims.height / sheetSize.h, // Normalized height
      this.getItemComplexity(item), // Complexity score
      item.kind === 'image' ? 1 : 0, // Is image
      item.kind === 'text' ? 1 : 0,  // Is text
      this.getColorCount(item), // Color count
    ];
  }

  /**
   * Generate candidate positions
   */
  private generateCandidatePositions(
    itemDims: { width: number; height: number },
    sheetSize: { w: number; h: number },
    placedRects: Array<{ x: number; y: number; width: number; height: number }>,
    margin: number,
    allowRotation: boolean
  ): Array<{ x: number; y: number; rotated: boolean }> {
    const candidates: Array<{ x: number; y: number; rotated: boolean }> = [];

    // Try corners and edges of existing items
    const touchPoints = [{ x: margin, y: margin }]; // Start at top-left

    for (const rect of placedRects) {
      touchPoints.push(
        { x: rect.x + rect.width + margin, y: rect.y }, // Right
        { x: rect.x, y: rect.y + rect.height + margin }, // Bottom
        { x: rect.x + rect.width + margin, y: rect.y + rect.height + margin } // Diagonal
      );
    }

    // Test each position
    for (const point of touchPoints) {
      // Normal orientation
      if (this.canFit(point.x, point.y, itemDims.width, itemDims.height, sheetSize, placedRects, margin)) {
        candidates.push({ x: point.x, y: point.y, rotated: false });
      }

      // Rotated orientation
      if (allowRotation && this.canFit(point.x, point.y, itemDims.height, itemDims.width, sheetSize, placedRects, margin)) {
        candidates.push({ x: point.x, y: point.y, rotated: true });
      }
    }

    return candidates;
  }

  /**
   * Check if item can fit at position
   */
  private canFit(
    x: number,
    y: number,
    width: number,
    height: number,
    sheetSize: { w: number; h: number },
    placedRects: Array<{ x: number; y: number; width: number; height: number }>,
    margin: number
  ): boolean {
    // Check sheet boundaries
    if (x + width > sheetSize.w - margin || y + height > sheetSize.h - margin) {
      return false;
    }

    // Check overlap with existing items
    for (const rect of placedRects) {
      if (this.rectsOverlap(
        { x, y, width, height },
        { x: rect.x - margin, y: rect.y - margin, width: rect.width + margin * 2, height: rect.height + margin * 2 }
      )) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two rectangles overlap
   */
  private rectsOverlap(a: any, b: any): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }

  /**
   * Calculate waste for a position
   */
  private calculatePositionWaste(
    pos: { x: number; y: number },
    placedRects: any[],
    sheetSize: { w: number; h: number }
  ): number {
    // Prefer positions closer to top-left and existing items
    const distanceFromOrigin = Math.sqrt(pos.x ** 2 + pos.y ** 2);
    const distanceFromItems = placedRects.length > 0
      ? Math.min(...placedRects.map(rect =>
          Math.sqrt((pos.x - rect.x) ** 2 + (pos.y - rect.y) ** 2)
        ))
      : distanceFromOrigin;

    return distanceFromOrigin * 0.7 + distanceFromItems * 0.3;
  }

  /**
   * Get item dimensions
   */
  private getItemDimensions(item: LayerItem): { width: number; height: number } {
    if (item.kind === 'circle') {
      const radius = (item as any).radius || 50;
      return { width: radius * 2, height: radius * 2 };
    }
    return {
      width: (item as any).width || 100,
      height: (item as any).height || 100,
    };
  }

  /**
   * Get item area
   */
  private getItemArea(item: LayerItem): number {
    const dims = this.getItemDimensions(item);
    return dims.width * dims.height;
  }

  /**
   * Calculate item complexity (for AI)
   */
  private getItemComplexity(item: LayerItem): number {
    // Simple heuristic
    if (item.kind === 'image') return 0.8;
    if (item.kind === 'text') return 0.5;
    if (item.kind === 'path') return 0.9;
    return 0.3;
  }

  /**
   * Get color count (for AI)
   */
  private getColorCount(item: LayerItem): number {
    // Simplified - in production, analyze actual colors
    return 1;
  }

  /**
   * Calculate utilization percentage
   */
  private calculateUtilization(items: LayerItem[], sheetSize: { w: number; h: number }): number {
    const usedArea = this.calculateUsedArea(items);
    const totalArea = sheetSize.w * sheetSize.h;
    return (usedArea / totalArea) * 100;
  }

  /**
   * Calculate total used area
   */
  private calculateUsedArea(items: LayerItem[]): number {
    return items.reduce((sum, item) => sum + this.getItemArea(item), 0);
  }
}

// Singleton instance
let optimizerInstance: AIPackingOptimizer | null = null;

export function getAIOptimizer(): AIPackingOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new AIPackingOptimizer();
  }
  return optimizerInstance;
}


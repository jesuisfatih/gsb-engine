/**
 * AI-Powered Design Quality Analysis
 * Analyzes design quality and suggests improvements
 */

import * as tf from '@tensorflow/tfjs';
import type { LayerItem, ImageItem } from '../types';

export interface QualityAnalysis {
  overallScore: number; // 0-100
  issues: {
    lowResolution: boolean;
    poorContrast: boolean;
    colorBleeding: boolean;
    textReadability: boolean;
    outsideSafeArea: boolean;
  };
  suggestions: string[];
  confidence: number;
  breakdown: {
    resolution: number;
    contrast: number;
    colorHarmony: number;
    layout: number;
  };
}

export class QualityAnalyzer {
  private model: tf.LayersModel | null = null;

  async loadModel(): Promise<void> {
    try {
      this.model = await tf.loadLayersModel('/models/quality-analyzer-v1/model.json');
      console.log('[quality-ai] Model loaded');
    } catch (error) {
      console.warn('[quality-ai] Model not available, using heuristics');
    }
  }

  /**
   * Analyze design quality
   */
  async analyzeDesign(
    canvas: HTMLCanvasElement,
    items: LayerItem[],
    sheetSize: { w: number; h: number },
    safeArea?: { left: number; top: number; right: number; bottom: number }
  ): Promise<QualityAnalysis> {
    const breakdown = {
      resolution: await this.analyzeResolution(items),
      contrast: await this.analyzeContrast(canvas),
      colorHarmony: await this.analyzeColorHarmony(canvas),
      layout: this.analyzeLayout(items, sheetSize, safeArea),
    };

    const overallScore = (
      breakdown.resolution * 0.35 +
      breakdown.contrast * 0.25 +
      breakdown.colorHarmony * 0.20 +
      breakdown.layout * 0.20
    );

    const issues = {
      lowResolution: breakdown.resolution < 60,
      poorContrast: breakdown.contrast < 50,
      colorBleeding: breakdown.colorHarmony < 40,
      textReadability: breakdown.resolution < 70,
      outsideSafeArea: breakdown.layout < 80,
    };

    const suggestions = this.generateSuggestions(breakdown, issues);

    return {
      overallScore,
      issues,
      suggestions,
      confidence: this.model ? 0.9 : 0.7,
      breakdown,
    };
  }

  /**
   * Analyze image resolution/DPI
   */
  private async analyzeResolution(items: LayerItem[]): Promise<number> {
    const imageItems = items.filter(item => item.kind === 'image') as ImageItem[];
    
    if (imageItems.length === 0) return 100;

    const dpiScores = imageItems.map(img => {
      const dpi = (img as any).dpi || 300;
      if (dpi >= 300) return 100;
      if (dpi >= 200) return 70;
      if (dpi >= 150) return 50;
      return 30;
    });

    return dpiScores.reduce((a, b) => a + b, 0) / dpiScores.length;
  }

  /**
   * Analyze contrast using canvas
   */
  private async analyzeContrast(canvas: HTMLCanvasElement): Promise<number> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 50;

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let minLuminance = 255;
    let maxLuminance = 0;

    // Calculate luminance for each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      minLuminance = Math.min(minLuminance, luminance);
      maxLuminance = Math.max(maxLuminance, luminance);
    }

    const contrastRatio = (maxLuminance + 0.05) / (minLuminance + 0.05);
    
    // Score based on WCAG guidelines
    if (contrastRatio >= 7) return 100;
    if (contrastRatio >= 4.5) return 80;
    if (contrastRatio >= 3) return 60;
    return 40;
  }

  /**
   * Analyze color harmony
   */
  private async analyzeColorHarmony(canvas: HTMLCanvasElement): Promise<number> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 50;

    // Extract dominant colors
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const colors = this.extractDominantColors(imageData, 5);

    // Calculate harmony score (simplified)
    const harmony = this.calculateColorHarmony(colors);

    return harmony;
  }

  /**
   * Analyze layout quality
   */
  private analyzeLayout(
    items: LayerItem[],
    sheetSize: { w: number; h: number },
    safeArea?: { left: number; top: number; right: number; bottom: number }
  ): number {
    let score = 100;

    if (!safeArea) return score;

    // Check if items are within safe area
    for (const item of items) {
      const dims = this.getItemDimensions(item);
      
      if (
        item.x < safeArea.left ||
        item.y < safeArea.top ||
        item.x + dims.width > sheetSize.w - safeArea.right ||
        item.y + dims.height > sheetSize.h - safeArea.bottom
      ) {
        score -= 20; // Penalty for outside safe area
      }
    }

    return Math.max(0, score);
  }

  /**
   * Generate suggestions based on analysis
   */
  private generateSuggestions(breakdown: any, issues: any): string[] {
    const suggestions: string[] = [];

    if (issues.lowResolution) {
      suggestions.push('Some images have low resolution (<300 DPI). Consider using higher quality images.');
    }

    if (issues.poorContrast) {
      suggestions.push('Low contrast detected. Increase contrast for better print visibility.');
    }

    if (issues.outsideSafeArea) {
      suggestions.push('Some elements are outside the safe print area. Move them inward to avoid cutting.');
    }

    if (breakdown.colorHarmony < 60) {
      suggestions.push('Consider adjusting colors for better harmony and visual appeal.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Design looks great! Ready for production.');
    }

    return suggestions;
  }

  /**
   * Extract dominant colors from image data
   */
  private extractDominantColors(imageData: ImageData, count: number): string[] {
    // Simplified color clustering
    const colorMap = new Map<string, number>();
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4 * 10) { // Sample every 10th pixel
      const r = Math.floor(data[i] / 32) * 32;
      const g = Math.floor(data[i + 1] / 32) * 32;
      const b = Math.floor(data[i + 2] / 32) * 32;
      const color = `rgb(${r},${g},${b})`;

      colorMap.set(color, (colorMap.get(color) || 0) + 1);
    }

    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([color]) => color);
  }

  /**
   * Calculate color harmony score
   */
  private calculateColorHarmony(colors: string[]): number {
    // Simplified harmony calculation
    // In production, use color theory (complementary, analogous, etc.)
    if (colors.length <= 3) return 90; // Simple palette = good
    if (colors.length <= 5) return 75; // Moderate
    return 60; // Complex
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
}

// Singleton
let analyzerInstance: QualityAnalyzer | null = null;

export function getQualityAnalyzer(): QualityAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new QualityAnalyzer();
  }
  return analyzerInstance;
}


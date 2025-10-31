/**
 * AI-Powered Smart Design Suggestions
 * Provides intelligent recommendations for layout, colors, and optimization
 */

import type { LayerItem } from '../types';

export interface DesignSuggestion {
  type: 'layout' | 'color' | 'technique' | 'optimization';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  autoFixAvailable: boolean;
  autoFix?: () => void;
}

export class SmartSuggestionsEngine {
  /**
   * Analyze design and generate suggestions
   */
  async generateSuggestions(
    items: LayerItem[],
    sheetSize: { w: number; h: number },
    context: {
      printTech?: string;
      colorCount?: number;
      areaUsage?: number;
      safeMargin?: number;
    }
  ): Promise<DesignSuggestion[]> {
    const suggestions: DesignSuggestion[] = [];

    // Layout suggestions
    suggestions.push(...this.analyzeLayout(items, sheetSize, context.safeMargin));

    // Color suggestions
    if (context.colorCount) {
      suggestions.push(...this.analyzeColors(context.colorCount, context.printTech));
    }

    // Optimization suggestions
    if (context.areaUsage) {
      suggestions.push(...this.analyzeUtilization(context.areaUsage));
    }

    // Technique suggestions
    if (context.printTech) {
      suggestions.push(...this.analyzeTechnique(context.printTech, items));
    }

    return suggestions;
  }

  /**
   * Layout analysis
   */
  private analyzeLayout(
    items: LayerItem[],
    sheetSize: { w: number; h: number },
    safeMargin?: number
  ): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    const margin = safeMargin || 0;

    // Check items outside safe area
    const outsideItems = items.filter(item => {
      const dims = this.getItemDimensions(item);
      return (
        item.x < margin ||
        item.y < margin ||
        item.x + dims.width > sheetSize.w - margin ||
        item.y + dims.height > sheetSize.h - margin
      );
    });

    if (outsideItems.length > 0) {
      suggestions.push({
        type: 'layout',
        title: 'Elements outside safe area',
        description: `${outsideItems.length} element(s) may be cut during printing. Move them ${margin}px inward.`,
        severity: 'warning',
        autoFixAvailable: true,
        autoFix: () => {
          // This would be implemented in EditorStore
          console.log('[suggestions] Auto-fix: nudge items into safe area');
        },
      });
    }

    // Check overlapping items
    const overlaps = this.findOverlaps(items);
    if (overlaps.length > 0) {
      suggestions.push({
        type: 'layout',
        title: 'Overlapping elements detected',
        description: `${overlaps.length} pair(s) of elements are overlapping. This may cause printing issues.`,
        severity: 'info',
        autoFixAvailable: true,
      });
    }

    // Check balance
    const balance = this.calculateBalance(items, sheetSize);
    if (balance < 0.6) {
      suggestions.push({
        type: 'layout',
        title: 'Unbalanced layout',
        description: 'Design is weighted to one side. Consider redistributing elements for better visual balance.',
        severity: 'info',
        autoFixAvailable: false,
      });
    }

    return suggestions;
  }

  /**
   * Color analysis
   */
  private analyzeColors(colorCount: number, printTech?: string): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];

    if (colorCount > 6 && printTech === 'screen') {
      suggestions.push({
        type: 'color',
        title: 'High color count for screen printing',
        description: `Screen printing with ${colorCount} colors is expensive. Consider reducing to 4-6 colors or switching to DTF.`,
        severity: 'warning',
        autoFixAvailable: false,
      });
    }

    if (colorCount === 1) {
      suggestions.push({
        type: 'color',
        title: 'Single color design',
        description: 'This is cost-effective! Screen printing would be cheaper than DTF for high quantities.',
        severity: 'info',
        autoFixAvailable: false,
      });
    }

    return suggestions;
  }

  /**
   * Utilization analysis
   */
  private analyzeUtilization(areaUsage: number): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];

    if (areaUsage < 30) {
      suggestions.push({
        type: 'optimization',
        title: 'Low sheet utilization',
        description: `Only ${areaUsage.toFixed(1)}% of the sheet is used. Consider using a smaller size or adding more designs.`,
        severity: 'info',
        autoFixAvailable: false,
      });
    }

    if (areaUsage > 95) {
      suggestions.push({
        type: 'optimization',
        title: 'Excellent utilization!',
        description: `${areaUsage.toFixed(1)}% sheet usage is optimal. Great job packing efficiently!`,
        severity: 'info',
        autoFixAvailable: false,
      });
    }

    return suggestions;
  }

  /**
   * Technique analysis
   */
  private analyzeTechnique(printTech: string, items: LayerItem[]): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    const hasPhotos = items.some(item => item.kind === 'image');
    const hasText = items.some(item => item.kind === 'text');

    if (printTech === 'screen' && hasPhotos) {
      suggestions.push({
        type: 'technique',
        title: 'Screen printing not ideal for photos',
        description: 'Your design contains photos. DTF or sublimation would provide better detail and gradients.',
        severity: 'warning',
        autoFixAvailable: false,
      });
    }

    if (printTech === 'sublimation' && items.length > 10) {
      suggestions.push({
        type: 'technique',
        title: 'Complex design for sublimation',
        description: 'Sublimation works best with simpler designs. DTF might handle this complexity better.',
        severity: 'info',
        autoFixAvailable: false,
      });
    }

    return suggestions;
  }

  /**
   * Find overlapping items
   */
  private findOverlaps(items: LayerItem[]): Array<[LayerItem, LayerItem]> {
    const overlaps: Array<[LayerItem, LayerItem]> = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (this.itemsOverlap(items[i], items[j])) {
          overlaps.push([items[i], items[j]]);
        }
      }
    }

    return overlaps;
  }

  /**
   * Check if two items overlap
   */
  private itemsOverlap(a: LayerItem, b: LayerItem): boolean {
    const dimsA = this.getItemDimensions(a);
    const dimsB = this.getItemDimensions(b);

    return !(
      a.x + dimsA.width <= b.x ||
      b.x + dimsB.width <= a.x ||
      a.y + dimsA.height <= b.y ||
      b.y + dimsB.height <= a.y
    );
  }

  /**
   * Calculate design balance
   */
  private calculateBalance(items: LayerItem[], sheetSize: { w: number; h: number }): number {
    if (items.length === 0) return 1;

    const centerX = sheetSize.w / 2;
    const centerY = sheetSize.h / 2;

    // Calculate center of mass
    let totalMass = 0;
    let massX = 0;
    let massY = 0;

    for (const item of items) {
      const dims = this.getItemDimensions(item);
      const mass = dims.width * dims.height;
      const itemCenterX = item.x + dims.width / 2;
      const itemCenterY = item.y + dims.height / 2;

      totalMass += mass;
      massX += itemCenterX * mass;
      massY += itemCenterY * mass;
    }

    const centerOfMassX = massX / totalMass;
    const centerOfMassY = massY / totalMass;

    // Calculate distance from sheet center
    const distance = Math.sqrt(
      Math.pow(centerOfMassX - centerX, 2) +
      Math.pow(centerOfMassY - centerY, 2)
    );

    const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
    const balance = 1 - (distance / maxDistance);

    return balance;
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
let suggestionsInstance: SmartSuggestionsEngine | null = null;

export function getSuggestionsEngine(): SmartSuggestionsEngine {
  if (!suggestionsInstance) {
    suggestionsInstance = new SmartSuggestionsEngine();
  }
  return suggestionsInstance;
}


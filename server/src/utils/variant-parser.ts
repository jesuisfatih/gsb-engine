/**
 * Parse Shopify variant options to extract dimensions
 * Examples:
 * - "20*30 Cm" -> { width: 20, height: 30, unit: "cm" }
 * - "12x16 in" -> { width: 12, height: 16, unit: "in" }
 * - "Large" -> null (not dimensional)
 */

export interface ParsedDimensions {
  width: number;
  height: number;
  unit: 'cm' | 'mm' | 'in' | 'inch';
  originalText: string;
}

export function parseDimensionsFromVariantOptions(options: Record<string, string>): ParsedDimensions | null {
  // Common dimension option keys
  const dimensionKeys = ['Size', 'Boyutunuz', 'Boyut', 'Dimensions', 'Ölçü'];
  
  for (const key of dimensionKeys) {
    const value = options[key];
    if (!value || typeof value !== 'string') continue;
    
    const parsed = parseDimensionString(value);
    if (parsed) return parsed;
  }
  
  // Try all values if no dimension key found
  for (const value of Object.values(options)) {
    if (typeof value !== 'string') continue;
    const parsed = parseDimensionString(value);
    if (parsed) return parsed;
  }
  
  return null;
}

function parseDimensionString(text: string): ParsedDimensions | null {
  const normalized = text.trim().toLowerCase();
  
  // Patterns: "20*30 cm", "20x30cm", "12 x 16 in", "20*30"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*[x*×]\s*(\d+(?:\.\d+)?)\s*(cm|mm|in|inch)?/i,
    /(\d+(?:\.\d+)?)\s*["'']\s*x\s*(\d+(?:\.\d+)?)\s*["'']/i, // 12" x 16"
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const width = parseFloat(match[1]);
      const height = parseFloat(match[2]);
      const unit = (match[3] || 'cm').toLowerCase() as 'cm' | 'mm' | 'in' | 'inch';
      
      // Convert inch variations
      const normalizedUnit = unit === 'inch' ? 'in' : unit;
      
      return {
        width,
        height,
        unit: normalizedUnit,
        originalText: text.trim(),
      };
    }
  }
  
  return null;
}

export function dimensionsToMm(dimensions: ParsedDimensions): { widthMm: number; heightMm: number } {
  let widthMm = dimensions.width;
  let heightMm = dimensions.height;
  
  switch (dimensions.unit) {
    case 'cm':
      widthMm *= 10;
      heightMm *= 10;
      break;
    case 'in':
      widthMm *= 25.4;
      heightMm *= 25.4;
      break;
    case 'mm':
      // Already in mm
      break;
  }
  
  return { widthMm, heightMm };
}


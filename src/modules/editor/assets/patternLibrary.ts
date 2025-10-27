export interface PatternAsset {
  id: string;
  name: string;
  dataUrl: string;
  previewUrl: string;
  tags?: string[];
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const stripesSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <defs>
    <pattern id="stripe" patternUnits="userSpaceOnUse" width="32" height="32">
      <rect width="32" height="32" fill="#fdf2f8"/>
      <path d="M-8 24 L8 40 M0 16 L16 32 M8 8 L24 24 M16 0 L32 16 M24 -8 L40 8" stroke="#f472b6" stroke-width="8" stroke-linecap="round"/>
    </pattern>
  </defs>
  <rect width="400" height="400" fill="url(#stripe)"/>
</svg>`;

const gridSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <defs>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="40" height="40">
      <rect width="40" height="40" fill="#f9fafb"/>
      <path d="M0 0H40M0 0V40" stroke="#d1d5db" stroke-width="1"/>
      <path d="M20 0V40M0 20H40" stroke="#9ca3af" stroke-width="0.75" stroke-linecap="square" opacity="0.6"/>
    </pattern>
  </defs>
  <rect width="400" height="400" fill="url(#grid)"/>
</svg>`;

const dotsSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <defs>
    <pattern id="dots" patternUnits="userSpaceOnUse" width="24" height="24">
      <rect width="24" height="24" fill="#eef2ff"/>
      <circle cx="6" cy="6" r="3" fill="#6366f1" opacity="0.9"/>
      <circle cx="18" cy="18" r="3" fill="#4f46e5" opacity="0.6"/>
    </pattern>
  </defs>
  <rect width="400" height="400" fill="url(#dots)"/>
</svg>`;

export const PATTERN_LIBRARY: PatternAsset[] = [
  {
    id: "pattern-stripes",
    name: "Diagonal Stripes",
    dataUrl: svgToDataUrl(stripesSvg),
    previewUrl: svgToDataUrl(stripesSvg),
    tags: ["pattern-lab", "textile"],
  },
  {
    id: "pattern-grid",
    name: "Soft Grid",
    dataUrl: svgToDataUrl(gridSvg),
    previewUrl: svgToDataUrl(gridSvg),
    tags: ["pattern-lab", "layout"],
  },
  {
    id: "pattern-dots",
    name: "Iridescent Dots",
    dataUrl: svgToDataUrl(dotsSvg),
    previewUrl: svgToDataUrl(dotsSvg),
    tags: ["pattern-lab", "playful"],
  },
];

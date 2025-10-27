export interface ToolAsset {
  id: string;
  name: string;
  description: string;
  link: string;
  sticker: string;
}

const blenderSticker = `
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240">
  <rect width="480" height="240" rx="24" fill="#1f2937"/>
  <text x="32" y="72" font-family="Inter, 'Segoe UI', sans-serif" font-size="40" fill="#fbbf24" font-weight="700">Blender + VSCode</text>
  <text x="32" y="120" font-family="Inter, 'Segoe UI', sans-serif" font-size="20" fill="#e5e7eb">
    Integrate Blender's scripting with VSCode live reload.
  </text>
  <text x="32" y="150" font-family="Inter, 'Segoe UI', sans-serif" font-size="18" fill="#a5b4fc">
    Repo: JacquesLucke/blender_vscode
  </text>
  <text x="32" y="190" font-family="Inter, 'Segoe UI', sans-serif" font-size="16" fill="#cbd5f5">
    Tip: Export GLTF from Blender to reuse inside this editor.
  </text>
</svg>`;

const patternSticker = `
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240">
  <rect width="480" height="240" rx="24" fill="#312e81"/>
  <text x="32" y="72" font-family="Inter, 'Segoe UI', sans-serif" font-size="36" fill="#fbcfe8" font-weight="700">Pattern Lab</text>
  <text x="32" y="118" font-family="Inter, 'Segoe UI', sans-serif" font-size="18" fill="#e0e7ff">
    Starter kit from pattern-lab/edition-node-gulp.
  </text>
  <text x="32" y="150" font-family="Inter, 'Segoe UI', sans-serif" font-size="16" fill="#c7d2fe">
    Use patterns as modular backgrounds & UI atoms in your designs.
  </text>
</svg>`;

export const TOOL_ASSETS: ToolAsset[] = [
  {
    id: "blender-vscode",
    name: "Blender VSCode",
    description: "Send scripts from VSCode directly into Blender while iterating on 3D merch.",
    link: "https://github.com/JacquesLucke/blender_vscode",
    sticker: `data:image/svg+xml;utf8,${encodeURIComponent(blenderSticker)}`,
  },
  {
    id: "pattern-lab",
    name: "Pattern Lab",
    description: "Atomic design workflow for storefronts and campaign landing pages.",
    link: "https://github.com/pattern-lab/edition-node-gulp",
    sticker: `data:image/svg+xml;utf8,${encodeURIComponent(patternSticker)}`,
  },
];

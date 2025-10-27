export interface MockupShape {
  viewBox: string;
  basePaths: { d: string; fill: string }[];
  accentPaths?: { d: string; fill: string; opacity?: number }[];
  designFrame: { x: number; y: number; width: number; height: number; radius?: number };
  highlight?: { d: string; fill: string; opacity?: number };
}

type MockupKey = "tshirt" | "hoodie" | "mug" | "poster" | "default";

const tshirt: MockupShape = {
  viewBox: "0 0 200 220",
  basePaths: [
    { d: "M48 28L68 24L86 8H114L132 24L152 28L176 68L158 76V206H42V76L24 68Z", fill: "var(--fabric-color)" },
    { d: "M86 8C90 20 110 20 114 8L132 24L114 28H86L68 24Z", fill: "rgba(255,255,255,0.65)" },
  ],
  accentPaths: [
    { d: "M48 28L68 24L86 8H114L132 24L152 28L176 68L158 76V206H42V76L24 68Z", fill: "url(#shade)" },
  ],
  designFrame: { x: 60, y: 72, width: 80, height: 104, radius: 10 },
  highlight: { d: "M48 28L68 24L86 8H114L132 24L152 28", fill: "#ffffff", opacity: 0.1 },
};

const hoodie: MockupShape = {
  viewBox: "0 0 220 230",
  basePaths: [
    { d: "M50 30L92 8H128L170 30L198 68L186 76V210H34V76L22 68Z", fill: "var(--fabric-color)" },
    { d: "M92 8C98 26 122 26 128 8L150 24L128 30H92L70 24Z", fill: "rgba(255,255,255,0.45)" },
  ],
  accentPaths: [
    { d: "M50 30L92 8H128L170 30L198 68L186 76V210H34V76L22 68Z", fill: "url(#shade)" },
  ],
  designFrame: { x: 68, y: 76, width: 84, height: 108, radius: 12 },
};

const mug: MockupShape = {
  viewBox: "0 0 220 200",
  basePaths: [
    { d: "M50 30H150C170 30 186 46 186 66V140C186 160 170 176 150 176H50Z", fill: "var(--fabric-color)" },
    { d: "M150 50C164 50 176 60 176 72V134C176 146 164 156 150 156Z", fill: "var(--fabric-color)" },
    { d: "M150 176C170 176 186 160 186 140V66C186 46 170 30 150 30", fill: "var(--fabric-color)" },
  ],
  accentPaths: [
    { d: "M50 30H150C170 30 186 46 186 66V140C186 160 170 176 150 176H50Z", fill: "url(#shade)" },
    { d: "M150 176C170 176 186 160 186 140V66C186 46 170 30 150 30", fill: "url(#shade)", opacity: 0.6 },
  ],
  designFrame: { x: 64, y: 62, width: 84, height: 84, radius: 8 },
};

const poster: MockupShape = {
  viewBox: "0 0 180 240",
  basePaths: [
    { d: "M40 20H140V220H40Z", fill: "#f8fafc" },
  ],
  accentPaths: [
    { d: "M40 20H140V220H40Z", fill: "url(#shade)" },
  ],
  designFrame: { x: 48, y: 32, width: 84, height: 176, radius: 6 },
};

const fallback: MockupShape = {
  viewBox: "0 0 200 200",
  basePaths: [
    { d: "M40 30H160C173 30 184 41 184 54V146C184 159 173 170 160 170H40C27 170 16 159 16 146V54C16 41 27 30 40 30Z", fill: "var(--fabric-color)" },
  ],
  accentPaths: [
    { d: "M40 30H160C173 30 184 41 184 54V146C184 159 173 170 160 170H40C27 170 16 159 16 146V54C16 41 27 30 40 30Z", fill: "url(#shade)" },
  ],
  designFrame: { x: 56, y: 54, width: 88, height: 92, radius: 12 },
};

export const MOCKUP_DEFINITIONS: Record<MockupKey, MockupShape> = {
  tshirt,
  hoodie,
  mug,
  poster,
  default: fallback,
};

export function resolveMockup(slug: string | undefined): MockupShape {
  if (!slug) return fallback;
  const key = slug.toLowerCase();
  if (key.includes("tshirt") || key.includes("tee") || key.includes("shirt")) return tshirt;
  if (key.includes("hood")) return hoodie;
  if (key.includes("mug") || key.includes("cup") || key.includes("ceramic")) return mug;
  if (key.includes("poster") || key.includes("print")) return poster;
  return MOCKUP_DEFINITIONS[slug as MockupKey] ?? fallback;
}



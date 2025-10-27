export interface GltfAsset {
  id: string;
  name: string;
  preview: string;
  modelUrl: string;
  description: string;
}

const base =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0";

export const GLTF_SAMPLES: GltfAsset[] = [
  {
    id: "damaged-helmet",
    name: "Damaged Helmet",
    preview: `${base}/DamagedHelmet/screenshot/screenshot.png`,
    modelUrl: `${base}/DamagedHelmet/glTF/DamagedHelmet.gltf`,
    description: "PBR reference asset frequently used to calibrate lighting and textures.",
  },
  {
    id: "boom-box",
    name: "Boom Box",
    preview: `${base}/BoomBox/screenshot/screenshot.png`,
    modelUrl: `${base}/BoomBox/glTF/BoomBox.gltf`,
    description: "Studio-lit boombox showcasing metallic and emissive channels.",
  },
  {
    id: "water-bottle",
    name: "Water Bottle",
    preview: `${base}/WaterBottle/screenshot/screenshot.png`,
    modelUrl: `${base}/WaterBottle/glTF/WaterBottle.gltf`,
    description: "Clean bottle asset great for merch mockups and product visualization.",
  },
];

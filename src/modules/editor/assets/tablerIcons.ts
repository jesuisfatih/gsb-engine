export interface IconAsset {
  id: string;
  name: string;
  path: string;
  viewBox: number;
  stroke?: string;
  strokeWidth?: number;
  tags?: string[];
}

const VB = 24;

export const TABLER_ICONS: IconAsset[] = [
  {
    id: "tabler-star",
    name: "Star",
    path: "M12 17.75L6.545 21l1.24-5.66L2 10.25l6.78-.56L12 4l3.22 5.69L22 10.25l-5.785 5.09L17.455 21z",
    viewBox: VB,
  },
  {
    id: "tabler-heart",
    name: "Heart",
    path: "M12 21s-6-4.35-6-9.5C6 7.5 8.5 6 10.5 6c1.5 0 2.9.9 3.5 2.1C14.1 6.9 15.5 6 17 6c2 0 4.5 1.5 4.5 5.5C21.5 16.65 12 21 12 21z",
    viewBox: VB,
  },
  {
    id: "tabler-bolt",
    name: "Lightning",
    path: "M13 2L3 14h6l-1 8 10-12h-6z",
    viewBox: VB,
  },
  {
    id: "tabler-camera",
    name: "Camera",
    path: "M4 6h4l1-2h6l1 2h4v12H4z M12 10a4 4 0 100 8 4 4 0 000-8z",
    viewBox: VB,
    stroke: "#18181b",
    strokeWidth: 1.6,
  },
  {
    id: "tabler-shirt",
    name: "Shirt",
    path: "M4 6l5-3 3 4 3-4 5 3-2 4-2-.9V20H8V9.1l-2 .9z",
    viewBox: VB,
  },
  {
    id: "tabler-mug",
    name: "Mug",
    path: "M5 7h8v10H5z M13 9h3a3 3 0 010 6h-3",
    viewBox: VB,
    stroke: "#18181b",
    strokeWidth: 1.6,
  },
  {
    id: "tabler-cube",
    name: "Cube",
    path: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 3v9m8-4.5l-8 4.5m-8-4.5l8 4.5",
    viewBox: VB,
    stroke: "#18181b",
    strokeWidth: 1.6,
  },
  {
    id: "tabler-send",
    name: "Send Arrow",
    path: "M3 12l18-8-8 18-2-8z",
    viewBox: VB,
  },
];

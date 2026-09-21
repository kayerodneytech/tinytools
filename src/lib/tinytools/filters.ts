import type { ProcessSettings } from "./process";

export type FilterValues = Pick<
  ProcessSettings,
  "brightness" | "contrast" | "saturation" | "sepia" | "grayscale" | "hueRotate"
>;

export type FilterPreset = {
  id: string;
  label: string;
  values: FilterValues;
};

const base: FilterValues = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
  hueRotate: 0,
};

export const filterPresets: FilterPreset[] = [
  { id: "none", label: "Original", values: { ...base } },
  { id: "punch", label: "Punch", values: { ...base, contrast: 118, saturation: 132 } },
  { id: "soft", label: "Soft", values: { ...base, brightness: 106, contrast: 92, saturation: 94 } },
  { id: "mono", label: "Mono", values: { ...base, grayscale: 100, contrast: 112 } },
  { id: "noir", label: "Noir", values: { ...base, grayscale: 100, contrast: 138, brightness: 94 } },
  { id: "warm", label: "Warm", values: { ...base, sepia: 28, saturation: 118, brightness: 104 } },
  { id: "cool", label: "Cool", values: { ...base, hueRotate: 190, saturation: 108 } },
  { id: "vintage", label: "Vintage", values: { ...base, sepia: 45, contrast: 92, saturation: 82 } },
  { id: "fade", label: "Fade", values: { ...base, contrast: 82, saturation: 76, brightness: 108 } },
];

export const filterPresetById = (id: string) => filterPresets.find((p) => p.id === id);

/** CSS filter string — shared by the canvas encoder and the on-screen thumbnails. */
export function filterCss(v: FilterValues, blur = 0): string {
  return [
    `brightness(${v.brightness}%)`,
    `contrast(${v.contrast}%)`,
    `saturate(${v.saturation}%)`,
    v.sepia ? `sepia(${v.sepia}%)` : "",
    v.grayscale ? `grayscale(${v.grayscale}%)` : "",
    v.hueRotate ? `hue-rotate(${v.hueRotate}deg)` : "",
    blur ? `blur(${blur}px)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

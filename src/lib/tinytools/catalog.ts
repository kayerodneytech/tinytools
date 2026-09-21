import type { ProcessSettings } from "./process";

export type ToolId =
  | "compress"
  | "convert"
  | "resize"
  | "crop"
  | "rotate"
  | "removebg"
  | "watermark"
  | "metadata"
  | "adjust"
  | "rename";

export type Tool = {
  id: ToolId;
  name: string;
  hint: string;
  /** Grouping used by the step rail so the flow reads top to bottom. */
  stage: "shape" | "look" | "export";
  panel:
    | "quality"
    | "format"
    | "size"
    | "crop"
    | "orient"
    | "bgremove"
    | "watermark"
    | "adjust"
    | "rename";
  /** split = before/after slider, result = single result canvas, crop = interactive cropper */
  preview: "split" | "result" | "crop" | "rename";
  /** Settings this step owns — used to detect an active step and to reset just that step. */
  keys: (keyof ProcessSettings)[];
  apply?: Partial<ProcessSettings>;
};

export const tools: Tool[] = [
  {
    id: "crop",
    name: "Crop",
    hint: "Free or fixed aspect ratios",
    stage: "shape",
    panel: "crop",
    preview: "crop",
    keys: ["cropRatio", "cropRect", "socialPreset"],
  },
  {
    id: "rotate",
    name: "Rotate & flip",
    hint: "90° steps, mirror",
    stage: "shape",
    panel: "orient",
    preview: "result",
    keys: ["rotate", "flipH", "flipV"],
  },
  {
    id: "resize",
    name: "Resize",
    hint: "Width, height, percent",
    stage: "shape",
    panel: "size",
    preview: "result",
    keys: ["resizeMode", "resizeValue"],
  },
  {
    id: "removebg",
    name: "Remove background",
    hint: "Server AI cutout",
    stage: "look",
    panel: "bgremove",
    preview: "split",
    keys: ["removeBg", "background"],
    apply: { removeBg: true },
  },
  {
    id: "adjust",
    name: "Filters & adjust",
    hint: "Presets, brightness, blur",
    stage: "look",
    panel: "adjust",
    preview: "split",
    keys: [
      "filterPreset",
      "brightness",
      "contrast",
      "saturation",
      "sepia",
      "grayscale",
      "hueRotate",
      "blur",
    ],
  },
  {
    id: "watermark",
    name: "Watermark",
    hint: "Text or logo, any corner",
    stage: "look",
    panel: "watermark",
    preview: "result",
    keys: [
      "watermarkText",
      "watermarkImage",
      "watermarkPosition",
      "watermarkScale",
      "watermarkMargin",
      "watermarkOpacity",
    ],
    apply: { watermarkScale: 22, watermarkMargin: 4, watermarkPosition: "bottom-right" },
  },
  {
    id: "compress",
    name: "Compress",
    hint: "Shrink file size, keep it sharp",
    stage: "export",
    panel: "quality",
    preview: "split",
    keys: ["quality"],
    apply: { quality: 75 },
  },
  {
    id: "convert",
    name: "Convert format",
    hint: "JPEG, PNG, AVIF",
    stage: "export",
    panel: "format",
    preview: "split",
    keys: ["format", "quality"],
  },
  {
    id: "metadata",
    name: "Remove metadata",
    hint: "Strip EXIF, GPS, camera",
    stage: "export",
    panel: "quality",
    preview: "split",
    keys: ["quality"],
    apply: { quality: 92 },
  },
  {
    id: "rename",
    name: "Batch rename",
    hint: "Patterns, numbering, case",
    stage: "export",
    panel: "rename",
    preview: "rename",
    keys: [
      "renamePattern",
      "renameStart",
      "renamePad",
      "renameCase",
      "renameFind",
      "renameReplace",
    ],
  },
];

export const stages: { id: Tool["stage"]; label: string }[] = [
  { id: "shape", label: "Shape" },
  { id: "look", label: "Look" },
  { id: "export", label: "Export" },
];

export const toolById = (id: string) => tools.find((t) => t.id === id);

export type SocialPlatform = "instagram" | "story" | "x" | "linkedin" | "youtube";

export const socialPresets: {
  id: string;
  label: string;
  platform: SocialPlatform;
  w: number;
  h: number;
  ratio: ProcessSettings["cropRatio"];
}[] = [
  { id: "ig-feed", label: "Instagram feed", platform: "instagram", w: 1080, h: 1080, ratio: "1:1" },
  {
    id: "ig-portrait",
    label: "Instagram portrait",
    platform: "instagram",
    w: 1080,
    h: 1350,
    ratio: "4:5",
  },
  { id: "ig-story", label: "Instagram story", platform: "story", w: 1080, h: 1920, ratio: "9:16" },
  { id: "x-post", label: "X / Twitter post", platform: "x", w: 1600, h: 900, ratio: "16:9" },
  { id: "li-post", label: "LinkedIn post", platform: "linkedin", w: 1200, h: 1200, ratio: "1:1" },
  {
    id: "yt-thumb",
    label: "YouTube thumbnail",
    platform: "youtube",
    w: 1280,
    h: 720,
    ratio: "16:9",
  },
];

export const socialPresetById = (id: string | null) => socialPresets.find((p) => p.id === id);

export const roadmap = [
  {
    group: "AI utilities",
    items: [
      "Upscale 2x / 4x",
      "Remove objects",
      "Generate alt text",
      "Smart crop",
      "Colorize photos",
    ],
  },
  {
    group: "PDF tools",
    items: ["Merge", "Split", "Compress", "Rotate pages", "PDF to images", "Image to PDF"],
  },
  {
    group: "Screenshot tools",
    items: ["Trim whitespace", "Rounded corners", "Drop shadow", "Browser frame", "Phone mockup"],
  },
  {
    group: "Developer utilities",
    items: ["Base64", "SVG optimizer", "JSON formatter", "UUID", "QR code", "Regex tester"],
  },
  {
    group: "File utilities",
    items: ["Batch rename", "ZIP / unzip", "Hash & checksum", "Duplicate finder"],
  },
];

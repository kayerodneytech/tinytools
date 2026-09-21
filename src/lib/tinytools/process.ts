import type { OutputFormat } from "./prefs";
import { buildFilename, defaultRename, type RenameOptions } from "./rename";
import { filterCss } from "./filters";

export type CropRect = { x: number; y: number; w: number; h: number };

export type WatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type ProcessSettings = {
  format: OutputFormat | "keep";
  quality: number;
  resizeMode: "none" | "width" | "height" | "percent" | "longest";
  resizeValue: number;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  grayscale: number;
  hueRotate: number;
  filterPreset: string;
  blur: number;
  background: "transparent" | "white" | "black";
  watermarkText: string;
  watermarkOpacity: number;
  watermarkImage: string | null;
  watermarkPosition: WatermarkPosition;
  watermarkScale: number;
  watermarkMargin: number;
  cropRatio: "free" | "1:1" | "4:5" | "16:9" | "9:16";
  cropRect: CropRect | null;
  socialPreset: string | null;
  removeBg: boolean;
} & RenameOptions;

export const defaultSettings: ProcessSettings = {
  format: "keep",
  quality: 80,
  resizeMode: "none",
  resizeValue: 1600,
  rotate: 0,
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
  hueRotate: 0,
  filterPreset: "none",
  blur: 0,
  background: "transparent",
  watermarkText: "",
  watermarkOpacity: 40,
  watermarkImage: null,
  watermarkPosition: "bottom-right",
  watermarkScale: 22,
  watermarkMargin: 4,
  cropRatio: "free",
  cropRect: null,
  socialPreset: null,
  removeBg: false,
  ...defaultRename,
};

export const extForFormat: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

export function isHeicFile(file: File | Blob): boolean {
  const type = (file.type ?? "").toLowerCase();
  const name = ((file as File).name ?? "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    /\.(heic|heif)$/.test(name)
  );
}

/** HEIC/HEIF cannot be decoded natively by browsers — decode to PNG via wasm first. */
export async function decodeHeic(file: File | Blob): Promise<Blob> {
  const { heicTo } = await import("heic-to");
  return await heicTo({ blob: file as Blob, type: "image/png" });
}

const watermarkCache = new Map<string, ImageBitmap>();

export async function loadWatermarkBitmap(src: string): Promise<ImageBitmap | null> {
  const cached = watermarkCache.get(src);
  if (cached) return cached;
  try {
    const blob = await (await fetch(src)).blob();
    const bmp = await createImageBitmap(blob);
    watermarkCache.set(src, bmp);
    return bmp;
  } catch {
    return null;
  }
}


export async function loadBitmap(file: File | Blob): Promise<ImageBitmap> {
  if (isHeicFile(file)) return await createImageBitmap(await decodeHeic(file));
  return await createImageBitmap(file);
}

function targetSize(w: number, h: number, s: ProcessSettings) {
  let tw = w;
  let th = h;
  const v = Math.max(1, s.resizeValue || 1);
  if (s.resizeMode === "width") {
    tw = v;
    th = Math.round((h / w) * v);
  } else if (s.resizeMode === "height") {
    th = v;
    tw = Math.round((w / h) * v);
  } else if (s.resizeMode === "percent") {
    tw = Math.max(1, Math.round((w * v) / 100));
    th = Math.max(1, Math.round((h * v) / 100));
  } else if (s.resizeMode === "longest") {
    const scale = v / Math.max(w, h);
    tw = Math.max(1, Math.round(w * scale));
    th = Math.max(1, Math.round(h * scale));
  }
  return { tw: Math.max(1, tw), th: Math.max(1, th) };
}

function cropBox(w: number, h: number, s: ProcessSettings) {
  if (s.cropRect) {
    const sw = Math.max(1, Math.round(s.cropRect.w * w));
    const sh = Math.max(1, Math.round(s.cropRect.h * h));
    return {
      sx: Math.min(w - sw, Math.max(0, Math.round(s.cropRect.x * w))),
      sy: Math.min(h - sh, Math.max(0, Math.round(s.cropRect.y * h))),
      sw,
      sh,
    };
  }
  if (s.cropRatio === "free") return { sx: 0, sy: 0, sw: w, sh: h };
  const parts = s.cropRatio.split(":").map(Number);
  const target = (parts[0] ?? 1) / (parts[1] ?? 1);
  let sw = w;
  let sh = Math.round(w / target);
  if (sh > h) {
    sh = h;
    sw = Math.round(h * target);
  }
  return { sx: Math.round((w - sw) / 2), sy: Math.round((h - sh) / 2), sw, sh };
}


export type ProcessResult = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  type: string;
  filename: string;
};

export async function processImage(
  file: File,
  settings: ProcessSettings,
  bitmap?: ImageBitmap,
  index = 0,
): Promise<ProcessResult> {
  const bmp = bitmap ?? (await loadBitmap(file));
  const crop = cropBox(bmp.width, bmp.height, settings);

  const { tw, th } = targetSize(crop.sw, crop.sh, settings);
  const rotated = settings.rotate === 90 || settings.rotate === 270;

  const canvas = document.createElement("canvas");
  canvas.width = rotated ? th : tw;
  canvas.height = rotated ? tw : th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // "keep" preserves the original file's format; HEIC has no browser encoder, so it maps to JPEG.
  const keepType = isHeicFile(file) ? "image/jpeg" : file.type || "image/png";
  const transparentCutout = settings.removeBg && settings.background === "transparent";
  // A cutout on a format without alpha would silently flatten — export PNG instead.
  const keepOut = transparentCutout && keepType !== "image/png" ? "image/png" : keepType;
  const outType = settings.format === "keep" ? keepOut : settings.format;
  const needsOpaque = outType === "image/jpeg" || settings.background !== "transparent";
  if (needsOpaque) {
    ctx.fillStyle = settings.background === "black" ? "#000000" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((settings.rotate * Math.PI) / 180);
  ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
  ctx.imageSmoothingQuality = "high";
  ctx.filter = filterCss(settings, settings.blur);
  ctx.drawImage(bmp, crop.sx, crop.sy, crop.sw, crop.sh, -tw / 2, -th / 2, tw, th);
  ctx.restore();

  const margin = Math.round((Math.min(canvas.width, canvas.height) * settings.watermarkMargin) / 100);

  const anchor = (w: number, h: number) => {
    const p = settings.watermarkPosition;
    if (p === "center") return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2 };
    const x = p === "top-left" || p === "bottom-left" ? margin : canvas.width - w - margin;
    const y = p === "top-left" || p === "top-right" ? margin : canvas.height - h - margin;
    return { x, y };
  };

  if (settings.watermarkImage) {
    const logo = await loadWatermarkBitmap(settings.watermarkImage);
    if (logo) {
      const w = Math.max(8, (canvas.width * settings.watermarkScale) / 100);
      const h = (logo.height / logo.width) * w;
      const { x, y } = anchor(w, h);
      ctx.globalAlpha = settings.watermarkOpacity / 100;
      ctx.drawImage(logo, x, y, w, h);
      ctx.globalAlpha = 1;
    }
  } else if (settings.watermarkText.trim()) {
    const size = Math.max(
      10,
      Math.round((Math.min(canvas.width, canvas.height) * settings.watermarkScale) / 100),
    );
    ctx.globalAlpha = settings.watermarkOpacity / 100;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = size / 4;
    const metrics = ctx.measureText(settings.watermarkText);
    const { x, y } = anchor(metrics.width, size);
    ctx.fillText(settings.watermarkText, x, y);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }


  const quality = Math.min(1, Math.max(0.05, settings.quality / 100));
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
      outType,
      outType === "image/png" ? undefined : quality,
    );
  });

  const ext = extForFormat[blob.type] ?? extForFormat[outType] ?? "png";
  return {
    blob,
    url: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    type: blob.type || outType,
    filename: buildFilename(file.name, ext, index, settings, {
      width: canvas.width,
      height: canvas.height,
    }),
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

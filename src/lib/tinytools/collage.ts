import {
  extForFormat,
  type ProcessResult,
  type ProcessSettings,
} from "./process";

type Rect = { x: number; y: number; w: number; h: number };

const aspectValues: Record<ProcessSettings["collageAspect"], number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "4:5": 4 / 5,
};

function gridRects(count: number, width: number, height: number): Rect[] {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const cellsInRow = row === rows - 1 ? count - row * columns : columns;
    const cellWidth = width / cellsInRow;
    return { x: column * cellWidth, y: row * (height / rows), w: cellWidth, h: height / rows };
  });
}

function layoutRects(
  count: number,
  width: number,
  height: number,
  preset: ProcessSettings["collagePreset"],
): Rect[] {
  if (preset === "columns") {
    return Array.from({ length: count }, (_, i) => ({
      x: (i * width) / count,
      y: 0,
      w: width / count,
      h: height,
    }));
  }
  if (preset === "rows") {
    return Array.from({ length: count }, (_, i) => ({
      x: 0,
      y: (i * height) / count,
      w: width,
      h: height / count,
    }));
  }
  if (preset === "feature-left") {
    if (count === 2) {
      return [
        { x: 0, y: 0, w: width * 0.62, h: height },
        { x: width * 0.62, y: 0, w: width * 0.38, h: height },
      ];
    }
    const sideWidth = width * 0.38;
    return [
      { x: 0, y: 0, w: width - sideWidth, h: height },
      ...Array.from({ length: count - 1 }, (_, i) => ({
        x: width - sideWidth,
        y: (i * height) / (count - 1),
        w: sideWidth,
        h: height / (count - 1),
      })),
    ];
  }
  if (preset === "feature-top") {
    if (count === 2) {
      return [
        { x: 0, y: 0, w: width, h: height * 0.62 },
        { x: 0, y: height * 0.62, w: width, h: height * 0.38 },
      ];
    }
    const lowerHeight = height * 0.38;
    return [
      { x: 0, y: 0, w: width, h: height - lowerHeight },
      ...Array.from({ length: count - 1 }, (_, i) => ({
        x: (i * width) / (count - 1),
        y: height - lowerHeight,
        w: width / (count - 1),
        h: lowerHeight,
      })),
    ];
  }
  return gridRects(count, width, height);
}

function drawCover(ctx: CanvasRenderingContext2D, bitmap: ImageBitmap, rect: Rect, gap: number) {
  const x = rect.x + gap / 2;
  const y = rect.y + gap / 2;
  const width = Math.max(1, rect.w - gap);
  const height = Math.max(1, rect.h - gap);
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (bitmap.width - sourceWidth) / 2;
  const sourceY = (bitmap.height - sourceHeight) / 2;
  ctx.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

export async function processCollage(
  bitmaps: ImageBitmap[],
  settings: ProcessSettings,
): Promise<ProcessResult> {
  if (bitmaps.length < 2) throw new Error("A collage needs at least two images.");

  const width = 1600;
  const height = Math.round(width / aspectValues[settings.collageAspect]);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle =
    settings.collageBackground === "black"
      ? "#111318"
      : settings.collageBackground === "soft"
        ? "#eef0f4"
        : "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const rects = layoutRects(bitmaps.length, width, height, settings.collagePreset);
  bitmaps.forEach((bitmap, index) => {
    const rect = rects[index];
    if (rect) drawCover(ctx, bitmap, rect, settings.collageGap);
  });

  const requestedType = settings.format === "keep" ? "image/jpeg" : settings.format;
  const quality = Math.min(1, Math.max(0.05, settings.quality / 100));
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Encoding failed"))),
      requestedType,
      requestedType === "image/png" ? undefined : quality,
    );
  });
  const type = blob.type || requestedType;
  const extension = extForFormat[type] ?? extForFormat[requestedType] ?? "jpg";
  return {
    blob,
    url: URL.createObjectURL(blob),
    width,
    height,
    type,
    filename: `collage.${extension}`,
  };
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CropRect, ProcessSettings } from "@/lib/tinytools/process";

type Handle = "nw" | "ne" | "sw" | "se" | "move" | null;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function ratioValue(ratio: ProcessSettings["cropRatio"]) {
  if (ratio === "free") return null;
  const [a, b] = ratio.split(":").map(Number);
  return (a ?? 1) / (b ?? 1);
}

/** Centered rect (normalized) matching a target aspect inside an image of `imgAspect`. */
export function centeredRect(imgAspect: number, target: number | null): CropRect {
  if (!target) return { x: 0, y: 0, w: 1, h: 1 };
  if (target > imgAspect) {
    const h = imgAspect / target;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  const w = target / imgAspect;
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

export function CropEditor({
  src,
  imgWidth,
  imgHeight,
  rect,
  ratio,
  onChange,
}: {
  src: string;
  imgWidth: number;
  imgHeight: number;
  rect: CropRect;
  ratio: ProcessSettings["cropRatio"];
  onChange: (r: CropRect) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: CropRect } | null>(
    null,
  );
  const imgAspect = imgWidth / imgHeight;
  const locked = ratioValue(ratio);

  const point = useCallback((clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return { x: 0, y: 0 };
    const b = el.getBoundingClientRect();
    return { x: clamp01((clientX - b.left) / b.width), y: clamp01((clientY - b.top) / b.height) };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      e.preventDefault();
      const p = point(e.clientX, e.clientY);
      const s = d.start;

      if (d.handle === "move") {
        const dx = p.x - d.startX;
        const dy = p.y - d.startY;
        onChange({
          ...s,
          x: Math.min(Math.max(0, s.x + dx), 1 - s.w),
          y: Math.min(Math.max(0, s.y + dy), 1 - s.h),
        });
        return;
      }

      // anchor is the corner opposite the dragged handle
      const ax = d.handle === "nw" || d.handle === "sw" ? s.x + s.w : s.x;
      const ay = d.handle === "nw" || d.handle === "ne" ? s.y + s.h : s.y;
      let w = Math.abs(p.x - ax);
      let h = Math.abs(p.y - ay);
      if (locked) {
        // ratio is in image pixels, so convert through the image aspect
        const hFromW = (w * imgAspect) / locked;
        const wFromH = (h * locked) / imgAspect;
        if (hFromW <= 1) {
          h = hFromW;
          w = Math.min(w, 1);
        } else {
          w = wFromH;
        }
      }
      const x = p.x < ax ? ax - w : ax;
      const y = p.y < ay ? ay - h : ay;
      if (w < 0.03 || h < 0.03) return;
      if (x < 0 || y < 0 || x + w > 1 || y + h > 1) return;
      onChange({ x, y, w, h });
    };
    const stop = () => (drag.current = null);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [imgAspect, locked, onChange, point]);

  const begin = (handle: Handle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const p = point(e.clientX, e.clientY);
    drag.current = { handle, startX: p.x, startY: p.y, start: rect };
  };

  const cropPx = {
    w: Math.round(rect.w * imgWidth),
    h: Math.round(rect.h * imgHeight),
  };

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        style={{ aspectRatio: imgAspect }}
        className="checkerboard relative max-h-[58vh] w-full touch-none overflow-hidden rounded-xl border border-border select-none"
      >
        <img
          src={src}
          alt="Crop source"
          draggable={false}
          className="absolute inset-0 size-full object-contain"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute object-contain"
            style={{
              width: `${(1 / rect.w) * 100}%`,
              height: `${(1 / rect.h) * 100}%`,
              left: `${(-rect.x / rect.w) * 100}%`,
              top: `${(-rect.y / rect.h) * 100}%`,
            }}
          />
        </div>
        <div
          onPointerDown={begin("move")}
          className="absolute cursor-move border-2 border-brand"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-brand/40" />
            ))}
          </div>
          {(["nw", "ne", "sw", "se"] as const).map((h) => (
            <span
              key={h}
              onPointerDown={begin(h)}
              className={`absolute size-3.5 rounded-full border-2 border-brand bg-surface ${
                h === "nw"
                  ? "-top-2 -left-2 cursor-nwse-resize"
                  : h === "ne"
                    ? "-top-2 -right-2 cursor-nesw-resize"
                    : h === "sw"
                      ? "-bottom-2 -left-2 cursor-nesw-resize"
                      : "-right-2 -bottom-2 cursor-nwse-resize"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="num text-center text-xs text-muted-foreground">
        Selection {cropPx.w}×{cropPx.h} px · drag inside to move, corners to resize
      </p>
    </div>
  );
}

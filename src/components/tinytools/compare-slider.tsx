"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function CompareSlider({
  before,
  after,
  alt,
  aspect,
}: {
  before: string;
  after: string;
  alt: string;
  /** width / height of the source image, used so both layers align exactly */
  aspect?: number;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      move(e.clientX);
    };
    const stop = () => (dragging.current = false);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [move]);

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        dragging.current = true;
        move(e.clientX);
      }}
      style={{ aspectRatio: aspect && Number.isFinite(aspect) ? aspect : 4 / 3 }}
      className="checkerboard relative max-h-[60vh] w-full touch-none cursor-ew-resize select-none overflow-hidden rounded-xl border border-border"
    >
      {/* Both halves are clipped so a transparent result shows the checkerboard, not the original. */}
      <img
        src={before}
        alt={`${alt} original`}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <img
        src={after}
        alt={`${alt} processed`}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-brand"
        style={{ left: `${pos}%` }}
        aria-hidden="true"
      >
        <span className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-brand bg-surface text-[10px] font-semibold shadow-soft">
          ↔
        </span>
      </div>
      <span className="num absolute bottom-2 left-2 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        original
      </span>
      <span className="num absolute right-2 bottom-2 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        result
      </span>
    </div>
  );
}

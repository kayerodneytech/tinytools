"use client";

/* eslint-disable @next/next/no-img-element -- Blob URL previews are local and cannot be optimized by Next. */

import { useRef, useState } from "react";
import { GripVertical, LocateFixed } from "lucide-react";
import { collageLayoutRects, type CollagePosition } from "@/lib/tinytools/collage";
import type { ProcessSettings } from "@/lib/tinytools/process";

type Source = { id: string; src: string; name: string };

type Props = {
  sources: Source[];
  preset: ProcessSettings["collagePreset"];
  aspect: ProcessSettings["collageAspect"];
  gap: number;
  background: ProcessSettings["collageBackground"];
  positions: Record<string, CollagePosition>;
  onPositionChange: (id: string, position: CollagePosition) => void;
  onReorder: (sourceId: string, targetId: string) => void;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function CollageEditor({
  sources,
  preset,
  aspect,
  gap,
  background,
  positions,
  onPositionChange,
  onReorder,
}: Props) {
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const reorderTarget = useRef<string | null>(null);
  const pan = useRef<{
    id: string;
    x: number;
    y: number;
    start: CollagePosition;
  } | null>(null);
  const rects = collageLayoutRects(sources.length, 1, 1, preset);
  const [aspectWidth, aspectHeight] = aspect.split(":").map(Number);
  const outputHeight = 1600 / ((aspectWidth || 1) / (aspectHeight || 1));
  const horizontalGap = gap / 1600;
  const verticalGap = gap / outputHeight;

  const moveFromHandle = (event: React.PointerEvent<HTMLButtonElement>, sourceId: string) => {
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-collage-id]")?.dataset.collageId;
    if (target && target !== sourceId && target !== reorderTarget.current) {
      reorderTarget.current = target;
      onReorder(sourceId, target);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Drag an image to reposition it inside its frame.</span>
        <span className="inline-flex items-center gap-1">
          <GripVertical className="size-3" /> Drag the handle to rearrange
        </span>
      </div>
      <div
        className="relative w-full touch-none overflow-hidden rounded-xl border border-border shadow-sm select-none"
        style={{
          aspectRatio: `${aspectWidth || 1} / ${aspectHeight || 1}`,
          background:
            background === "black" ? "#111318" : background === "soft" ? "#eef0f4" : "#fff",
        }}
      >
        {sources.map((source, index) => {
          const rect = rects[index];
          if (!rect) return null;
          const position = positions[source.id] ?? { x: 0.5, y: 0.5 };
          return (
            <div
              key={source.id}
              data-collage-id={source.id}
              className={`absolute overflow-hidden rounded-sm bg-accent ${
                reorderingId === source.id ? "ring-2 ring-brand ring-inset" : ""
              }`}
              style={{
                left: `${(rect.x + horizontalGap / 2) * 100}%`,
                top: `${(rect.y + verticalGap / 2) * 100}%`,
                width: `${Math.max(0.001, rect.w - horizontalGap) * 100}%`,
                height: `${Math.max(0.001, rect.h - verticalGap) * 100}%`,
              }}
            >
              <img
                src={source.src}
                alt={source.name}
                draggable={false}
                className="size-full cursor-move object-cover"
                style={{ objectPosition: `${position.x * 100}% ${position.y * 100}%` }}
                onDoubleClick={() => onPositionChange(source.id, { x: 0.5, y: 0.5 })}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  pan.current = {
                    id: source.id,
                    x: event.clientX,
                    y: event.clientY,
                    start: position,
                  };
                }}
                onPointerMove={(event) => {
                  if (pan.current?.id !== source.id) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  onPositionChange(source.id, {
                    x: clamp(pan.current.start.x - (event.clientX - pan.current.x) / bounds.width),
                    y: clamp(pan.current.start.y - (event.clientY - pan.current.y) / bounds.height),
                  });
                }}
                onPointerUp={() => {
                  pan.current = null;
                }}
                onPointerCancel={() => {
                  pan.current = null;
                }}
              />
              <span className="pointer-events-none absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-background/85 text-[10px] font-semibold shadow-sm backdrop-blur">
                {index + 1}
              </span>
              <button
                type="button"
                aria-label={`Rearrange ${source.name}`}
                title="Drag to rearrange"
                className="absolute top-1.5 right-1.5 flex size-7 touch-none items-center justify-center rounded-lg bg-background/90 text-foreground shadow-sm backdrop-blur active:cursor-grabbing"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  reorderTarget.current = source.id;
                  setReorderingId(source.id);
                }}
                onPointerMove={(event) => moveFromHandle(event, source.id)}
                onPointerUp={() => {
                  reorderTarget.current = null;
                  setReorderingId(null);
                }}
                onPointerCancel={() => {
                  reorderTarget.current = null;
                  setReorderingId(null);
                }}
                onKeyDown={(event) => {
                  const targetIndex =
                    event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? index - 1
                      : event.key === "ArrowRight" || event.key === "ArrowDown"
                        ? index + 1
                        : index;
                  const target = sources[targetIndex];
                  if (target && target.id !== source.id) {
                    event.preventDefault();
                    onReorder(source.id, target.id);
                  }
                }}
              >
                <GripVertical className="size-4" />
              </button>
              {(position.x !== 0.5 || position.y !== 0.5) && (
                <button
                  type="button"
                  aria-label={`Center ${source.name}`}
                  title="Reset position"
                  onClick={() => onPositionChange(source.id, { x: 0.5, y: 0.5 })}
                  className="absolute right-1.5 bottom-1.5 flex size-7 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-sm backdrop-blur"
                >
                  <LocateFixed className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

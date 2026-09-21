"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, FolderOpen, UploadCloud } from "lucide-react";

type Props = {
  onFiles: (files: File[]) => void;
  compact?: boolean;
};

const isSupportedImage = (f: File) =>
  f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);

export function DropZone({ onFiles, compact }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list).filter(isSupportedImage);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter(isSupportedImage);
      if (files.length) onFiles(files);
    };
    const prevent = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      accept(e.dataTransfer?.files ?? null);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setOver(false);
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragenter", prevent);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragenter", prevent);
    };
  }, [accept, onFiles]);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`group cursor-pointer rounded-2xl border border-dashed transition-all duration-200 ${
        over
          ? "border-brand bg-brand-soft"
          : "border-border-strong bg-surface hover:border-brand hover:bg-accent/40"
      } ${compact ? "px-5 py-6" : "px-8 py-16"}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-muted-foreground transition-colors group-hover:text-brand">
          <UploadCloud className="size-5" />
        </span>
        <div>
          <p className={compact ? "text-sm font-medium" : "text-lg font-semibold"}>
            Drop files here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drop anywhere on the page · batch friendly · private by default
          </p>
        </div>
        {!compact && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1.5">
              <ClipboardPaste className="size-3.5" /> Paste
              <kbd className="num rounded bg-accent px-1 text-[10px]">⌘V</kbd>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1.5">
              <FolderOpen className="size-3.5" /> Browse files
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

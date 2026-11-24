"use client";

/* eslint-disable @next/next/no-img-element -- Blob URL previews are local and cannot be optimized by Next. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropZone } from "./drop-zone";
import { CompareSlider } from "./compare-slider";
import { CropEditor, centeredRect, ratioValue } from "./crop-editor";
import { ToolControls } from "./tool-controls";
import { SocialMockup } from "./social-mockup";
import {
  orderedTools,
  socialPresetById,
  stages,
  tools,
  toolById,
  type Tool,
} from "@/lib/tinytools/catalog";
import {
  decodeHeic,
  defaultSettings,
  downloadBlob,
  isHeicFile,
  loadBitmap,
  processImage,
  type ProcessResult,
  type ProcessSettings,
} from "@/lib/tinytools/process";
import { formatBytes, percentDelta } from "@/lib/tinytools/format";
import { buildFilename } from "@/lib/tinytools/rename";
import { getPrefs, pushRecentTool, setPrefs, usePrefs } from "@/lib/tinytools/prefs";
import { cutoutBitmap } from "@/lib/tinytools/bg";
import { processCollage } from "@/lib/tinytools/collage";
import type { CollagePosition } from "@/lib/tinytools/collage";
import { setExportApi, type ExportOptions } from "@/lib/tinytools/export-bus";
import { ToolIcon } from "./tool-icon";
import { CollageEditor } from "./collage-editor";
import { hasAiContentMetadata } from "@/lib/tinytools/metadata";

type Item = {
  id: string;
  file: File;
  /** Decodable copy of the file (HEIC is converted up front). */
  source: Blob;
  url: string;
  width: number;
  height: number;
  bitmap: ImageBitmap;
  result?: ProcessResult;
  status: "idle" | "working" | "done" | "error";
  collage?: CollageRecipe;
  hasAiMetadata?: boolean;
};

type CollageRecipe = {
  sourceIds: string[];
  positions: Record<string, CollagePosition>;
  preset: ProcessSettings["collagePreset"];
  aspect: ProcessSettings["collageAspect"];
  gap: number;
  background: ProcessSettings["collageBackground"];
};

let counter = 0;

/** A step counts as active once any of its settings differ from the defaults. */
function isStepActive(tool: Tool, settings: ProcessSettings) {
  if (tool.id === "collage") return settings.collageEnabled;
  return tool.keys.some((k) => JSON.stringify(settings[k]) !== JSON.stringify(defaultSettings[k]));
}

function resetKeys(tool: Tool): Partial<ProcessSettings> {
  const patch: Record<string, unknown> = {};
  for (const k of tool.keys) patch[k] = defaultSettings[k];
  return patch as Partial<ProcessSettings>;
}

export function Workspace() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toolId, setToolId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ProcessSettings>(defaultSettings);
  const [prefs] = usePrefs();
  const [busy, setBusy] = useState(false);
  const [collageResult, setCollageResult] = useState<ProcessResult | undefined>();
  const [collageWorking, setCollageWorking] = useState(false);
  const [collageError, setCollageError] = useState("");
  const [collagePositions, setCollagePositions] = useState<Record<string, CollagePosition>>({});
  const [collageSourceIds, setCollageSourceIds] = useState<string[]>([]);
  const [editingCollageId, setEditingCollageId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const seq = useRef(0);
  const collageSeq = useRef(0);

  const active = items.find((i) => i.id === activeId) ?? items[0];
  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.id === active?.id),
  );
  const tool: Tool | undefined = toolId ? toolById(toolId) : undefined;

  const addFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        // Prefer a decoded HEIC copy, but keep the original when the browser can handle it itself.
        let source: Blob = file;
        let useNativeDecoder = false;
        if (isHeicFile(file)) {
          try {
            source = await decodeHeic(file);
          } catch {
            source = file;
            useNativeDecoder = true;
          }
        }
        const bitmap = useNativeDecoder ? await createImageBitmap(file) : await loadBitmap(source);
        const id = `f${++counter}`;
        const item: Item = {
          id,
          file,
          source,
          url: URL.createObjectURL(source),
          width: bitmap.width,
          height: bitmap.height,
          bitmap,
          hasAiMetadata: false,
          status: "idle" as const,
        };
        setItems((current) => [...current, item]);
        setActiveId((current) => current ?? id);

        // Metadata inspection should never delay the image appearing in the workspace.
        void hasAiContentMetadata(file).then((hasAiMetadata) => {
          if (!hasAiMetadata) return;
          setItems((current) =>
            current.map((candidate) =>
              candidate.id === id ? { ...candidate, hasAiMetadata: true } : candidate,
            ),
          );
        });
      } catch {
        // Unsupported files are ignored; the rest of the selection can continue normally.
      }
    }
  }, []);

  const aspect = active ? active.width / active.height : 4 / 3;

  /** Opening a step never discards other steps — the recipe accumulates. */
  const openTool = useCallback(
    (id: string) => {
      const t = toolById(id);
      if (!t) return;
      const collage = id === "collage" ? active?.collage : undefined;
      if (id === "collage") {
        const sourceIds =
          collage?.sourceIds ?? items.filter((item) => !item.collage).map((item) => item.id);
        setCollageSourceIds(sourceIds);
        setCollagePositions(collage?.positions ?? {});
        setEditingCollageId(collage ? active?.id ?? null : null);
        setCollageResult(
          collage && active
            ? {
                blob: active.source,
                url: active.url,
                width: active.width,
                height: active.height,
                type: active.source.type,
                filename: active.file.name,
              }
            : undefined,
        );
      }
      setToolId(id);
      pushRecentTool(id);
      setSettings((s) => {
        const touched = isStepActive(t, s);
        const next: ProcessSettings = { ...s };
        if (!touched) {
          if (t.panel === "quality" || t.panel === "format") {
            const p = getPrefs();
            next.format = p.format;
            next.quality = p.quality;
          }
          Object.assign(next, t.apply ?? {});
        }
        next.collageEnabled = id === "collage";
        if (collage) {
          next.collagePreset = collage.preset;
          next.collageAspect = collage.aspect;
          next.collageGap = collage.gap;
          next.collageBackground = collage.background;
        }
        if (t.preview === "crop" && !next.cropRect) next.cropRect = { x: 0, y: 0, w: 1, h: 1 };
        return next;
      });
    },
    [active, items],
  );

  const patchSettings = useCallback(
    (patch: Partial<ProcessSettings>) => {
      setSettings((s) => {
        const next = { ...s, ...patch };
        if (patch.cropRatio !== undefined && tool?.preview === "crop") {
          next.cropRect = centeredRect(aspect, ratioValue(patch.cropRatio));
        }
        return next;
      });
    },
    [aspect, tool?.preview],
  );

  /** Background removal is expensive, so cutouts are computed once per file and cached. */
  const bitmapFor = useCallback(
    async (item: Item) =>
      settings.removeBg ? await cutoutBitmap(item.id, item.source) : item.bitmap,
    [settings.removeBg],
  );

  const clearStep = useCallback((id: string) => {
    const t = toolById(id);
    if (!t) return;
    setSettings((s) => ({ ...s, ...resetKeys(t) }));
  }, []);

  const activeSteps = useMemo(
    () => orderedTools.filter((tool) => isStepActive(tool, settings)),
    [settings],
  );

  // Live preview: reprocess the active file whenever settings change.
  useEffect(() => {
    if (!active || settings.collageEnabled) return;
    const token = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        setItems((prev) =>
          prev.map((i) => (i.id === active.id ? { ...i, status: "working" as const } : i)),
        );
        const bmp = await bitmapFor(active);
        const result = await processImage(active.file, settings, bmp, activeIndex);
        if (token !== seq.current) return;
        setItems((prev) =>
          prev.map((i) => (i.id === active.id ? { ...i, result, status: "done" } : i)),
        );
      } catch {
        setItems((prev) => prev.map((i) => (i.id === active.id ? { ...i, status: "error" } : i)));
      }
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, active?.id, activeIndex]);

  const collageSources = useMemo(
    () =>
      collageSourceIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is Item => Boolean(item)),
    [collageSourceIds, items],
  );
  const collageSourceSignature = collageSources.map((item) => item.id).join(",");
  const collagePositionList = useMemo(
    () => collageSources.map((item) => collagePositions[item.id] ?? { x: 0.5, y: 0.5 }),
    [collageSources, collagePositions],
  );
  const collagePositionSignature = collagePositionList
    .map((position) => `${position.x.toFixed(4)}:${position.y.toFixed(4)}`)
    .join(",");

  // Persist edits immediately so switching tools never loses the collage arrangement.
  useEffect(() => {
    if (!editingCollageId || collageSources.length < 2) return;
    const recipe: CollageRecipe = {
      sourceIds: collageSources.map((item) => item.id),
      positions: Object.fromEntries(
        collageSources.map((item, index) => [
          item.id,
          collagePositionList[index] ?? { x: 0.5, y: 0.5 },
        ]),
      ),
      preset: settings.collagePreset,
      aspect: settings.collageAspect,
      gap: settings.collageGap,
      background: settings.collageBackground,
    };
    setItems((current) =>
      current.map((item) =>
        item.id === editingCollageId ? { ...item, collage: recipe } : item,
      ),
    );
    // Signatures cover source order and positions without reacting to generated item previews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editingCollageId,
    collageSourceSignature,
    collagePositionSignature,
    settings.collagePreset,
    settings.collageAspect,
    settings.collageGap,
    settings.collageBackground,
  ]);

  // Collages are a single composition made from every uploaded image.
  useEffect(() => {
    if (!settings.collageEnabled) {
      collageSeq.current += 1;
      setCollageWorking(false);
      return;
    }
    const token = ++collageSeq.current;
    if (collageSources.length < 2) {
      setCollageResult(undefined);
      setCollageError("Add at least two images to create a collage.");
      setCollageWorking(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCollageWorking(true);
      setCollageError("");
      try {
        const bitmaps = await Promise.all(collageSources.map(bitmapFor));
        const result = await processCollage(bitmaps, settings, collagePositionList);
        if (token !== collageSeq.current) return;
        const bitmap = await createImageBitmap(result.blob);
        const file = new File([result.blob], result.filename, { type: result.type });
        const recipe: CollageRecipe = {
          sourceIds: collageSources.map((item) => item.id),
          positions: Object.fromEntries(
            collageSources.map((item, index) => [
              item.id,
              collagePositionList[index] ?? { x: 0.5, y: 0.5 },
            ]),
          ),
          preset: settings.collagePreset,
          aspect: settings.collageAspect,
          gap: settings.collageGap,
          background: settings.collageBackground,
        };
        setCollageResult(result);
        if (editingCollageId) {
          setItems((current) =>
            current.map((item) =>
              item.id === editingCollageId
                ? {
                    ...item,
                    file,
                    source: result.blob,
                    url: result.url,
                    width: result.width,
                    height: result.height,
                    bitmap,
                    result,
                    status: "done" as const,
                    collage: recipe,
                  }
                : item,
            ),
          );
        } else {
          const id = `c${++counter}`;
          const collageItem: Item = {
            id,
            file,
            source: result.blob,
            url: result.url,
            width: result.width,
            height: result.height,
            bitmap,
            result,
            status: "done",
            collage: recipe,
          };
          setItems((current) => [...current, collageItem]);
          setEditingCollageId(id);
          setActiveId(id);
        }
      } catch (error) {
        if (token !== collageSeq.current) return;
        setCollageError(error instanceof Error ? error.message : "Could not create the collage.");
      } finally {
        if (token === collageSeq.current) setCollageWorking(false);
      }
    }, 120);
    return () => clearTimeout(timer);
    // Signatures intentionally represent the collage inputs without reacting to generated previews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, collageSourceSignature, collagePositionSignature, bitmapFor, editingCollageId]);

  const applyToAll = useCallback(async () => {
    setBusy(true);
    setBatchProgress({ current: 0, total: items.length });
    setPrefs({
      format: settings.format,
      quality: settings.quality,
      resizeMode: settings.resizeMode,
      resizeValue: settings.resizeValue,
    });
    for (const [idx, item] of items.entries()) {
      setBatchProgress({ current: idx + 1, total: items.length });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "working" } : i)));
      try {
        const result = await processImage(item.file, settings, await bitmapFor(item), idx);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, result, status: "done" } : i)),
        );
      } catch {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error" } : i)));
      }
    }
    setBusy(false);
    setBatchProgress(null);
  }, [items, settings, bitmapFor]);

  const runExport = useCallback(
    async (opts: ExportOptions) => {
      if (settings.collageEnabled) {
        if (collageSources.length < 2) return;
        const exportSettings: ProcessSettings = {
          ...settings,
          ...(opts.format ? { format: opts.format } : {}),
          ...(opts.quality ? { quality: opts.quality } : {}),
        };
        setBusy(true);
        setBatchProgress({ current: 1, total: 1 });
        try {
          const result = await processCollage(
            await Promise.all(collageSources.map(bitmapFor)),
            exportSettings,
            collagePositionList,
          );
          setCollageResult(result);
          if (opts.as === "pdf") {
            const { downloadPdf } = await import("@/lib/tinytools/pdf");
            await downloadPdf([result], opts.pdfPageSize);
          } else {
            downloadBlob(result.blob, result.filename);
          }
        } finally {
          setBusy(false);
          setBatchProgress(null);
        }
        return;
      }
      const targets = opts.scope === "current" ? (active ? [active] : []) : items;
      if (!targets.length) return;
      const exportSettings: ProcessSettings = {
        ...settings,
        ...(opts.format ? { format: opts.format } : {}),
        ...(opts.quality ? { quality: opts.quality } : {}),
      };
      setBusy(true);
      setBatchProgress({ current: 0, total: targets.length });
      const results: ProcessResult[] = [];
      for (const [idx, item] of targets.entries()) {
        setBatchProgress({ current: idx + 1, total: targets.length });
        try {
          const fresh = await processImage(
            item.file,
            exportSettings,
            await bitmapFor(item),
            items.indexOf(item),
          );
          results.push(fresh);
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, result: fresh, status: "done" as const } : i,
            ),
          );
        } catch {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error" } : i)));
        }
        void idx;
      }
      if (opts.as === "pdf") {
        const { downloadPdf } = await import("@/lib/tinytools/pdf");
        await downloadPdf(results, opts.pdfPageSize);
      } else {
        for (const result of results) {
          downloadBlob(result.blob, result.filename);
          await new Promise((r) => setTimeout(r, 140));
        }
      }
      setBusy(false);
      setBatchProgress(null);
    },
    [active, items, settings, bitmapFor, collagePositionList, collageSources],
  );

  // The nav's Export menu drives the same pipeline as the in-page buttons.
  useEffect(() => {
    setExportApi({
      count: settings.collageEnabled ? 1 : items.length,
      hasCurrent: !!active,
      busy,
      run: runExport,
    });
    return () => setExportApi(null);
  }, [items.length, active, busy, runExport, settings.collageEnabled]);

  const reset = useCallback(() => {
    setCollageResult(undefined);
    setItems([]);
    setActiveId(null);
    setToolId(null);
    setSettings(defaultSettings);
    setCollageError("");
    setCollagePositions({});
    setCollageSourceIds([]);
    setEditingCollageId(null);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setActiveId((current) => (current === id ? null : current));
    setEditingCollageId((current) => (current === id ? null : current));
  }, []);

  // Keyboard shortcuts: Enter exports the current image, Escape closes the tool, Delete removes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if (typing) return;
      if (e.key === "Escape") setToolId(null);
      const hasResult = settings.collageEnabled ? collageResult : active?.result;
      if (e.key === "Enter" && hasResult) {
        void runExport({ scope: "current", as: "files" });
      }
      if ((e.key === "Delete" || e.key === "Backspace") && active) {
        removeItem(active.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, collageResult, removeItem, runExport, settings.collageEnabled]);

  const suggestions = useMemo(() => {
    if (!active) return [];
    const out: { id: string; label: string }[] = [];
    if (active.hasAiMetadata) {
      out.push({ id: "metadata", label: "Remove the AI-generated content tag" });
    }
    if (active.file.size > 800_000)
      out.push({ id: "compress", label: "Compress — this file is heavy" });
    if (active.width > 2400) out.push({ id: "resize", label: "Resize for web" });
    if (items.length > 1) out.push({ id: "collage", label: `Make a collage from ${items.length} images` });
    if (items.length > 1) out.push({ id: "rename", label: `Batch rename ${items.length} files` });
    out.push({ id: "crop", label: "Crop for social media" });
    return out.slice(0, 3);
  }, [active, items.length]);

  const recent = prefs.recentTools.map(toolById).filter(Boolean) as Tool[];
  const landingTools = [
    ...orderedTools.filter((tool) => tool.featured),
    ...recent.filter((tool) => !tool.featured),
    ...orderedTools.filter((tool) => !tool.featured && !recent.includes(tool)),
  ];
  const toolGroups = [
    {
      id: "featured",
      label: "Featured",
      items: orderedTools.filter((tool) => tool.featured),
    },
    ...stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      items: tools.filter((tool) => tool.stage === stage.id && !tool.featured),
    })),
  ];
  const totalBefore = items.reduce((n, i) => n + i.file.size, 0);
  const totalAfter = items.reduce((n, i) => n + (i.result?.blob.size ?? i.file.size), 0);
  const socialPreset = socialPresetById(settings.socialPreset);
  const resultFilename = active?.result?.filename ?? "";
  const resultExt = resultFilename.slice(resultFilename.lastIndexOf(".") + 1) || "png";
  const visibleResult =
    tool?.id === "collage" ? (settings.collageEnabled ? collageResult : undefined) : active?.result;
  const updateCollagePosition = (id: string, position: CollagePosition) => {
    setCollagePositions((current) => ({ ...current, [id]: position }));
  };
  const reorderCollageItem = (sourceId: string, targetId: string) => {
    setCollageSourceIds((current) => {
      const sourceIndex = current.indexOf(sourceId);
      const targetIndex = current.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      next[sourceIndex] = targetId;
      next[targetIndex] = sourceId;
      return next;
    });
  };

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Drop a file. Click. Download. Done.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Simple tools for compressing, converting, resizing and cleaning up images.
          </p>
        </div>
        <DropZone onFiles={addFiles} />
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {recent.length ? "Recently used" : "Tools"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {landingTools.map((t) => (
              <div
                key={t.id}
                className="panel px-3.5 py-3 transition-shadow hover:shadow-lift"
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  <ToolIcon id={t.id} /> {t.name}
                  {t.featured && (
                    <span className="rounded-full border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-brand uppercase">
                      Featured
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Stack as many steps as you need — shape, look, then export.
          </p>
        </div>
      </div>
    );
  }

  // `active` is derived from `items`; keep the invariant explicit for TypeScript.
  if (!active) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:space-y-5 sm:px-5 sm:py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">
          {items.length} file{items.length > 1 ? "s" : ""} ready
        </h1>
        <span className="num text-xs text-muted-foreground">
          {formatBytes(totalBefore)}
          {totalAfter !== totalBefore && (
            <>
              {" "}
              → {formatBytes(totalAfter)} · {percentDelta(totalBefore, totalAfter)}% smaller
            </>
          )}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <Trash2 /> Clear
          </Button>
        </div>
      </div>

      {/* Tool bar: everything is one click away at the top, grouped shape → look → export. */}
      <div className="panel sticky top-12 z-30 space-y-2 p-2.5 sm:top-14 sm:p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tools</p>
          {activeSteps.length > 0 && (
            <button
              type="button"
              onClick={() => setSettings(defaultSettings)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Reset all
            </button>
          )}
        </div>
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:overflow-visible sm:px-0 sm:pb-0">
          {toolGroups.map((group, si) => (
            <div key={group.id} className="flex shrink-0 items-center gap-1.5 sm:flex-wrap">
              {si > 0 && <span className="mr-1 hidden h-5 w-px bg-border sm:block" />}
              <span className="mr-0.5 hidden text-[11px] tracking-wide text-muted-foreground uppercase sm:inline">
                {group.label}
              </span>
              {group.items.map((t) => {
                const on = isStepActive(t, settings);
                return (
                  <span
                    key={t.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                      toolId === t.id
                        ? "border-brand bg-brand-soft"
                        : on
                          ? "border-border bg-elevated"
                          : "border-border bg-surface hover:bg-accent/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openTool(t.id)}
                      title={t.hint}
                      className="flex items-center gap-1.5 text-left"
                    >
                      {on && (
                        <span className="flex size-3.5 items-center justify-center rounded-full bg-brand text-background">
                          <Check className="size-2.5" />
                        </span>
                      )}
                      {!on && <ToolIcon id={t.id} />}
                      <span className="text-xs font-medium whitespace-nowrap">{t.name}</span>
                      {t.featured && (
                        <span className="rounded-full border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-brand uppercase">
                          Featured
                        </span>
                      )}
                    </button>
                    {on && (
                      <button
                        type="button"
                        aria-label={`Clear ${t.name}`}
                        onClick={() => clearStep(t.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:gap-5">
        <aside className="order-2 space-y-3 lg:order-1 lg:space-y-4">
          <DropZone onFiles={addFiles} compact />

          <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:max-h-[calc(100vh-20rem)] lg:grid-cols-2 lg:overflow-y-auto lg:pr-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`animate-in-soft group relative w-20 shrink-0 overflow-hidden rounded-xl border p-1 text-left transition-colors lg:w-auto lg:min-w-0 lg:p-1.5 ${
                  active?.id === item.id
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-surface hover:bg-accent/50"
                }`}
              >
                <span className="checkerboard relative block aspect-square overflow-hidden rounded-lg bg-accent/40">
                  <img src={item.url} alt="" className="size-full object-cover" />
                  {item.collage && (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[9px] font-semibold shadow-sm backdrop-blur">
                      <ToolIcon id="collage" className="size-3" /> Collage
                    </span>
                  )}
                  {item.status === "working" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
                      <LoaderCircle className="size-5 animate-spin text-brand" />
                    </span>
                  )}
                  {item.status === "error" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-destructive/15">
                      <AlertCircle className="size-5 text-destructive" />
                    </span>
                  )}
                </span>
                <span className="hidden min-w-0 px-1 pt-2 pb-1 lg:block">
                  <span className="block truncate text-xs font-medium" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="num mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {item.width}×{item.height} · {formatBytes(item.file.size)}
                  </span>
                  {item.result && (
                    <span className="num block truncate text-[10px] text-success">
                      Result {formatBytes(item.result.blob.size)}
                    </span>
                  )}
                </span>
                <span
                  role="button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-sm backdrop-blur lg:top-2 lg:right-2 lg:size-6 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus:opacity-100"
                >
                  <X className="size-3.5" />
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="order-1 space-y-4 lg:order-2">
          {activeSteps.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Recipe:</span>
              {activeSteps.map((t, idx) => (
                <span key={t.id} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-muted-foreground">→</span>}
                  <button
                    type="button"
                    onClick={() => openTool(t.id)}
                    className="rounded-md border border-brand/40 bg-brand-soft px-2 py-1 font-medium"
                  >
                    {t.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {!tool ? (
            <div className="panel space-y-4 p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-brand" /> Suggested for {active?.file.name}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openTool(s.id)}
                    className="rounded-xl border border-border bg-elevated px-3 py-3 text-left text-xs transition-colors hover:border-brand"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {(active?.result || active) && (
                <img
                  src={active.result?.url ?? active.url}
                  alt={active.file.name}
                  className="checkerboard max-h-[42vh] w-full rounded-xl border border-border object-contain"
                />
              )}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
              <div className="panel order-2 space-y-4 p-4 xl:order-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{tool.name}</p>
                  <button
                    type="button"
                    onClick={() => setToolId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
                <ToolControls
                  tool={tool}
                  settings={settings}
                  onChange={patchSettings}
                  sampleSrc={active?.url}
                  itemCount={tool.id === "collage" ? collageSources.length : items.length}
                />
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  {tool.id === "collage" ? (
                    <Button
                      size="sm"
                      onClick={() => void runExport({ scope: "current", as: "files" })}
                      disabled={
                        busy || collageWorking || collageSources.length < 2 || !collageResult
                      }
                      className="w-full"
                    >
                      {busy ? "Exporting collage…" : "Download collage"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={applyToAll}
                      disabled={busy || items.length < 2}
                      className="w-full"
                    >
                      {batchProgress
                        ? `Processing ${batchProgress.current} of ${batchProgress.total}…`
                        : `Apply to all ${items.length} files`}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => clearStep(tool.id)}
                  >
                    <RotateCcw /> Reset this step
                  </Button>
                </div>
              </div>

              <div
                className="panel relative order-1 space-y-4 p-3 sm:p-4 xl:order-2"
                aria-busy={tool.id === "collage" ? collageWorking : active?.status === "working"}
              >
                {(tool.id === "collage"
                  ? collageWorking && !collageResult
                  : active?.status === "working") && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/72 backdrop-blur-[2px]">
                    <div className="flex max-w-xs flex-col items-center gap-2 px-6 text-center">
                      <LoaderCircle className="size-7 animate-spin text-brand" />
                      <p className="text-sm font-medium">
                        {collageWorking
                          ? "Arranging your collage…"
                          : settings.removeBg
                            ? "Removing background…"
                            : "Updating preview…"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {collageWorking
                          ? `Combining ${collageSources.length} images.`
                          : settings.removeBg
                          ? "Removing the background. This may take a moment."
                          : "Applying your current recipe to this image."}
                      </p>
                    </div>
                  </div>
                )}
                {visibleResult ? (
                  <>
                    {tool.id === "collage" ? (
                      <CollageEditor
                        sources={collageSources.map((item) => ({
                          id: item.id,
                          src: item.url,
                          name: item.file.name,
                        }))}
                        preset={settings.collagePreset}
                        aspect={settings.collageAspect}
                        gap={settings.collageGap}
                        background={settings.collageBackground}
                        positions={collagePositions}
                        onPositionChange={updateCollagePosition}
                        onReorder={reorderCollageItem}
                      />
                    ) : tool.preview === "crop" && socialPreset ? (
                      <SocialMockup
                        src={visibleResult.url}
                        platform={socialPreset.platform}
                        alt={`${active.file.name} on ${socialPreset.label}`}
                      />
                    ) : tool.preview === "crop" ? (
                      <CropEditor
                        src={active.url}
                        imgWidth={active.width}
                        imgHeight={active.height}
                        rect={settings.cropRect ?? { x: 0, y: 0, w: 1, h: 1 }}
                        ratio={settings.cropRatio}
                        onChange={(r) => setSettings((s) => ({ ...s, cropRect: r }))}
                      />
                    ) : tool.preview === "rename" ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">
                          Export filenames ({items.length})
                        </p>
                        <div className="max-h-[52vh] space-y-1 overflow-y-auto">
                          {items.map((i, idx) => (
                            <div
                              key={i.id}
                              className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-2.5 py-2 text-xs"
                            >
                              <span className="num w-6 shrink-0 text-muted-foreground">
                                {idx + 1}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                {i.file.name}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="num min-w-0 flex-1 truncate font-medium">
                                {i.result && i.id === active.id
                                  ? i.result.filename
                                  : buildFilename(i.file.name, resultExt, idx, settings)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : tool.preview === "split" ? (
                      <CompareSlider
                        before={active.url}
                        after={visibleResult.url}
                        alt={active.file.name}
                        aspect={aspect}
                      />
                    ) : (
                      <img
                        src={visibleResult.url}
                        alt={`${active.file.name} result`}
                        className="checkerboard max-h-[58vh] w-full rounded-xl border border-border object-contain"
                      />
                    )}

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <Stat
                        label={tool.id === "collage" ? "Sources" : "Original"}
                        value={formatBytes(tool.id === "collage" ? totalBefore : active.file.size)}
                      />
                      <Stat label="Result" value={formatBytes(visibleResult.blob.size)} />
                      <Stat
                        label={tool.id === "collage" ? "Images" : "Saved"}
                        value={
                          tool.id === "collage"
                            ? String(collageSources.length)
                            : `${percentDelta(active.file.size, visibleResult.blob.size)}%`
                        }
                        accent
                      />
                    </div>
                    <div className="num text-center text-xs text-muted-foreground">
                      {visibleResult.width}×{visibleResult.height} ·{" "}
                      {visibleResult.type.replace("image/", "").toUpperCase()} ·{" "}
                      {visibleResult.filename}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const result = visibleResult;
                          if (!result) return;
                          try {
                            await navigator.clipboard.write([
                              new ClipboardItem({
                                [result.blob.type]: result.blob,
                              }),
                            ]);
                          } catch {
                            /* clipboard image write unsupported */
                          }
                        }}
                      >
                        Copy
                      </Button>
                      <span className="num self-center text-[11px] text-muted-foreground">
                        Enter to export current · Esc to close
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    {collageError || "Rendering preview…"}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-accent/50 px-2 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`num text-sm font-semibold ${accent ? "text-brand" : ""}`}>{value}</p>
    </div>
  );
}

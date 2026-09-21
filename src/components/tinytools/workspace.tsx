"use client";

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
import { socialPresetById, stages, tools, toolById, type Tool } from "@/lib/tinytools/catalog";
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
import { setExportApi, type ExportOptions } from "@/lib/tinytools/export-bus";
import { ToolIcon } from "./tool-icon";

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
};

let counter = 0;

/** A step counts as active once any of its settings differ from the defaults. */
function isStepActive(tool: Tool, settings: ProcessSettings) {
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
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const seq = useRef(0);

  const active = items.find((i) => i.id === activeId) ?? items[0];
  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.id === active?.id),
  );
  const tool: Tool | undefined = toolId ? toolById(toolId) : undefined;

  const addFiles = useCallback(async (files: File[]) => {
    const loaded = await Promise.all(
      files.map(async (file) => {
        // HEIC needs a decoded copy for both the bitmap and the on-screen preview.
        const source = isHeicFile(file) ? await decodeHeic(file) : file;
        const bitmap = await loadBitmap(source);
        return {
          id: `f${++counter}`,
          file,
          source,
          url: URL.createObjectURL(source),
          width: bitmap.width,
          height: bitmap.height,
          bitmap,
          status: "idle" as const,
        };
      }),
    );
    setItems((prev) => [...prev, ...loaded]);
    setActiveId((prev) => prev ?? loaded[0]?.id ?? null);
  }, []);

  const aspect = active ? active.width / active.height : 4 / 3;

  /** Opening a step never discards other steps — the recipe accumulates. */
  const openTool = useCallback((id: string) => {
    const t = toolById(id);
    if (!t) return;
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
      if (t.preview === "crop" && !next.cropRect) next.cropRect = { x: 0, y: 0, w: 1, h: 1 };
      return next;
    });
  }, []);

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

  const activeSteps = useMemo(() => tools.filter((t) => isStepActive(t, settings)), [settings]);

  // Live preview: reprocess the active file whenever settings change.
  useEffect(() => {
    if (!active) return;
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
    [active, items, settings, bitmapFor],
  );

  // The nav's Export menu drives the same pipeline as the in-page buttons.
  useEffect(() => {
    setExportApi({ count: items.length, hasCurrent: !!active, busy, run: runExport });
    return () => setExportApi(null);
  }, [items.length, active, busy, runExport]);

  const reset = useCallback(() => {
    setItems([]);
    setActiveId(null);
    setToolId(null);
    setSettings(defaultSettings);
  }, []);

  // Keyboard shortcuts: Enter exports the current image, Escape closes the tool, Delete removes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if (typing) return;
      if (e.key === "Escape") setToolId(null);
      if (e.key === "Enter" && active?.result) {
        void runExport({ scope: "current", as: "files" });
      }
      if ((e.key === "Delete" || e.key === "Backspace") && active) {
        setItems((prev) => prev.filter((i) => i.id !== active.id));
        setActiveId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, runExport]);

  const suggestions = useMemo(() => {
    if (!active) return [];
    const out: { id: string; label: string }[] = [];
    if (active.file.size > 800_000)
      out.push({ id: "compress", label: "Compress — this file is heavy" });
    if (active.width > 2400) out.push({ id: "resize", label: "Resize for web" });
    if (items.length > 1) out.push({ id: "rename", label: `Batch rename ${items.length} files` });
    out.push({ id: "crop", label: "Crop for social media" });
    return out.slice(0, 3);
  }, [active, items.length]);

  const recent = prefs.recentTools.map(toolById).filter(Boolean) as Tool[];
  const totalBefore = items.reduce((n, i) => n + i.file.size, 0);
  const totalAfter = items.reduce((n, i) => n + (i.result?.blob.size ?? i.file.size), 0);
  const socialPreset = socialPresetById(settings.socialPreset);
  const resultFilename = active?.result?.filename ?? "";
  const resultExt = resultFilename.slice(resultFilename.lastIndexOf(".") + 1) || "png";

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Drop a file. Click. Download. Done.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Lightweight utilities for compressing, converting, resizing and cleaning up images —
            running entirely in your browser.
          </p>
        </div>
        <DropZone onFiles={addFiles} />
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {recent.length ? "Recently used" : "Tools"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(recent.length ? [...recent, ...tools.filter((t) => !recent.includes(t))] : tools).map(
              (t) => (
                <div key={t.id} className="panel px-3.5 py-3 transition-shadow hover:shadow-lift">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <ToolIcon id={t.id} /> {t.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
                </div>
              ),
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Stack as many steps as you need — shape, look, then export.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-5 py-8">
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
      <div className="panel sticky top-2 z-20 space-y-2 p-3">
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {stages.map((stage, si) => (
            <div key={stage.id} className="flex flex-wrap items-center gap-1.5">
              {si > 0 && <span className="mr-1 hidden h-5 w-px bg-border sm:block" />}
              <span className="mr-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                {stage.label}
              </span>
              {tools
                .filter((t) => t.stage === stage.id)
                .map((t) => {
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

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <DropZone onFiles={addFiles} compact />

          <div className="grid max-h-[calc(100vh-20rem)] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`animate-in-soft group relative min-w-0 overflow-hidden rounded-xl border p-1.5 text-left transition-colors ${
                  active?.id === item.id
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-surface hover:bg-accent/50"
                }`}
              >
                <span className="checkerboard relative block aspect-square overflow-hidden rounded-lg bg-accent/40">
                  <img src={item.url} alt="" className="size-full object-cover" />
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
                <span className="block min-w-0 px-1 pt-2 pb-1">
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
                    setItems((prev) => prev.filter((i) => i.id !== item.id));
                  }}
                  className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-background/85 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="size-3.5" />
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
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
              <div className="panel space-y-4 p-4">
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
                />
                <div className="flex flex-col gap-2 border-t border-border pt-3">
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
                className="panel relative space-y-4 p-4"
                aria-busy={active?.status === "working"}
              >
                {active?.status === "working" && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/72 backdrop-blur-[2px]">
                    <div className="flex max-w-xs flex-col items-center gap-2 px-6 text-center">
                      <LoaderCircle className="size-7 animate-spin text-brand" />
                      <p className="text-sm font-medium">
                        {settings.removeBg ? "Removing background…" : "Updating preview…"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {settings.removeBg
                          ? "Sending this image to the server for AI cutout."
                          : "Applying your current recipe to this image."}
                      </p>
                    </div>
                  </div>
                )}
                {active?.result ? (
                  <>
                    {tool.preview === "crop" && socialPreset ? (
                      <SocialMockup
                        src={active.result.url}
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
                        after={active.result.url}
                        alt={active.file.name}
                        aspect={aspect}
                      />
                    ) : (
                      <img
                        src={active.result.url}
                        alt={`${active.file.name} result`}
                        className="checkerboard max-h-[58vh] w-full rounded-xl border border-border object-contain"
                      />
                    )}

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <Stat label="Original" value={formatBytes(active.file.size)} />
                      <Stat label="Result" value={formatBytes(active.result.blob.size)} />
                      <Stat
                        label="Saved"
                        value={`${percentDelta(active.file.size, active.result.blob.size)}%`}
                        accent
                      />
                    </div>
                    <div className="num text-center text-xs text-muted-foreground">
                      {active.result.width}×{active.result.height} ·{" "}
                      {active.result.type.replace("image/", "").toUpperCase()} ·{" "}
                      {active.result.filename}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const result = active.result;
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
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    Rendering preview…
                  </p>
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

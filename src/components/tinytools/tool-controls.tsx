"use client";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { socialPresets, type Tool } from "@/lib/tinytools/catalog";
import { filterPresets, filterCss } from "@/lib/tinytools/filters";
import { renameTokens } from "@/lib/tinytools/rename";
import type { ProcessSettings } from "@/lib/tinytools/process";
import type { OutputFormat } from "@/lib/tinytools/prefs";
import { PlatformIcon } from "./tool-icon";
import { useEffect, useState } from "react";
import {
  readSavedWatermarks,
  removeSavedWatermark,
  saveWatermark,
  type SavedWatermark,
} from "@/lib/tinytools/watermarks";

type Props = {
  tool: Tool;
  settings: ProcessSettings;
  onChange: (patch: Partial<ProcessSettings>) => void;
  /** Sample image used to render live filter preset thumbnails. */
  sampleSrc?: string | undefined;
};

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {value && <span className="num text-xs text-foreground">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Chips<T extends string | number>({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onSelect(o.value)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            value === o.value
              ? "border-brand bg-brand-soft text-foreground"
              : "border-border bg-elevated text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const formatOptions: { label: string; value: OutputFormat | "keep" }[] = [
  { label: "Same as original", value: "keep" },
  { label: "JPEG", value: "image/jpeg" },
  { label: "PNG", value: "image/png" },
  { label: "AVIF", value: "image/avif" },
];

export function ToolControls({ tool, settings, onChange, sampleSrc }: Props) {
  const [savedWatermarks, setSavedWatermarks] = useState<SavedWatermark[]>([]);
  const [watermarkError, setWatermarkError] = useState("");

  useEffect(() => setSavedWatermarks(readSavedWatermarks()), []);

  return (
    <div className="space-y-5">
      {tool.panel === "bgremove" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">Remove background</span>
            <Switch
              checked={settings.removeBg}
              onCheckedChange={(v) => onChange({ removeBg: v })}
            />
          </div>
          <Row label="Fill behind subject">
            <Chips
              options={[
                { label: "Transparent", value: "transparent" },
                { label: "White", value: "white" },
                { label: "Black", value: "black" },
              ]}
              value={settings.background}
              onSelect={(v) => onChange({ background: v as ProcessSettings["background"] })}
            />
          </Row>
          <p className="rounded-lg bg-accent/60 px-3 py-2 text-xs text-muted-foreground">
            Cutouts run locally on your device. The first run downloads the model, so give it a few
            seconds. Transparent cutouts export as PNG.
          </p>
        </>
      )}

      {(tool.panel === "quality" || tool.panel === "format") && (
        <>
          {tool.panel === "format" && (
            <Row label="Output format">
              <Chips
                options={formatOptions}
                value={settings.format}
                onSelect={(v) => onChange({ format: v })}
              />
            </Row>
          )}
          <Row label="Quality" value={`${settings.quality}%`}>
            <Slider
              min={10}
              max={100}
              step={1}
              value={[settings.quality]}
              onValueChange={([v]) => onChange({ quality: v ?? 80 })}
            />
          </Row>
          <Row label="Preset">
            <Chips
              options={[
                { label: "Maximum compression", value: 45 },
                { label: "Balanced", value: 75 },
                { label: "Near lossless", value: 95 },
              ]}
              value={settings.quality}
              onSelect={(v) => onChange({ quality: v })}
            />
          </Row>
          {tool.id === "metadata" && (
            <p className="rounded-lg bg-accent/60 px-3 py-2 text-xs text-muted-foreground">
              Re-encoding drops all EXIF, GPS, camera and author data.
            </p>
          )}
        </>
      )}

      {tool.panel === "size" && (
        <>
          <Row label="Resize by">
            <Chips
              options={[
                { label: "None", value: "none" },
                { label: "Width", value: "width" },
                { label: "Height", value: "height" },
                { label: "Percent", value: "percent" },
                { label: "Longest side", value: "longest" },
              ]}
              value={settings.resizeMode}
              onSelect={(v) => onChange({ resizeMode: v })}
            />
          </Row>
          {settings.resizeMode !== "none" && (
            <Row label={settings.resizeMode === "percent" ? "Percent" : "Pixels"}>
              <Input
                type="number"
                min={1}
                value={settings.resizeValue}
                onChange={(e) => onChange({ resizeValue: Number(e.target.value) })}
              />
            </Row>
          )}
          <Row label="Common sizes">
            <Chips
              options={[
                { label: "Thumbnail 400", value: 400 },
                { label: "Website 1200", value: 1200 },
                { label: "Full 1920", value: 1920 },
                { label: "Wallpaper 2560", value: 2560 },
              ]}
              value={settings.resizeMode === "longest" ? settings.resizeValue : -1}
              onSelect={(v) => onChange({ resizeMode: "longest", resizeValue: v })}
            />
          </Row>
        </>
      )}

      {tool.panel === "crop" && (
        <>
          <Row label="Aspect ratio">
            <Chips
              options={[
                { label: "Free", value: "free" },
                { label: "Square 1:1", value: "1:1" },
                { label: "Portrait 4:5", value: "4:5" },
                { label: "Wide 16:9", value: "16:9" },
                { label: "Story 9:16", value: "9:16" },
              ]}
              value={settings.cropRatio}
              onSelect={(v) => onChange({ cropRatio: v, socialPreset: null })}
            />
          </Row>
          <p className="rounded-lg bg-accent/60 px-3 py-2 text-xs text-muted-foreground">
            Drag the selection on the image to crop freely. Choosing a ratio locks the shape.
          </p>
          <Row label="Social crop templates">
            <div className="grid gap-1.5">
              {socialPresets.map((p) => {
                const active = settings.socialPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        socialPreset: p.id,
                        cropRatio: p.ratio,
                        resizeMode: "longest",
                        resizeValue: Math.max(p.w, p.h),
                      })
                    }
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      active
                        ? "border-brand bg-brand-soft"
                        : "border-border bg-elevated hover:bg-accent/50"
                    }`}
                  >
                    <PlatformIcon platform={p.platform} className="size-4 shrink-0" />
                    <span className="font-medium">{p.label}</span>
                    <span className="num ml-auto text-muted-foreground">
                      {p.w}×{p.h}
                    </span>
                  </button>
                );
              })}
            </div>
          </Row>
        </>
      )}

      {tool.panel === "orient" && (
        <>
          <Row label="Rotate">
            <Chips
              options={[
                { label: "0°", value: 0 },
                { label: "90°", value: 90 },
                { label: "180°", value: 180 },
                { label: "270°", value: 270 },
              ]}
              value={settings.rotate}
              onSelect={(v) => onChange({ rotate: v as 0 | 90 | 180 | 270 })}
            />
          </Row>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Flip horizontal</span>
            <Switch checked={settings.flipH} onCheckedChange={(v) => onChange({ flipH: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Flip vertical</span>
            <Switch checked={settings.flipV} onCheckedChange={(v) => onChange({ flipV: v })} />
          </div>
        </>
      )}

      {tool.panel === "watermark" && (
        <>
          <Row label="Logo image">
            <div className="space-y-2">
              {savedWatermarks.length > 0 && (
                <div className="grid grid-cols-5 gap-1.5">
                  {savedWatermarks.map((logo) => (
                    <div key={logo.id} className="group relative">
                      <button
                        type="button"
                        title={`Use ${logo.name}`}
                        onClick={() => onChange({ watermarkImage: logo.dataUrl })}
                        className={`checkerboard aspect-square w-full overflow-hidden rounded-lg border p-1 transition-colors ${
                          settings.watermarkImage === logo.dataUrl
                            ? "border-brand ring-1 ring-brand"
                            : "border-border hover:border-brand/60"
                        }`}
                      >
                        <img
                          src={logo.dataUrl}
                          alt={logo.name}
                          className="size-full object-contain"
                        />
                      </button>
                      <button
                        type="button"
                        aria-label={`Forget ${logo.name}`}
                        onClick={() => {
                          setSavedWatermarks(removeSavedWatermark(logo.id));
                          if (settings.watermarkImage === logo.dataUrl) {
                            onChange({ watermarkImage: null });
                          }
                        }}
                        className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {settings.watermarkImage ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated p-2">
                  <img
                    src={settings.watermarkImage}
                    alt="Watermark logo"
                    className="checkerboard size-10 rounded-md object-contain"
                  />
                  <span className="flex-1 text-xs text-muted-foreground">Logo in use</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onChange({ watermarkImage: null })}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-elevated px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand hover:text-foreground">
                {settings.watermarkImage ? "Replace logo" : "Upload logo (PNG with transparency)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setWatermarkError("");
                      try {
                        const { items, selected } = await saveWatermark(file);
                        setSavedWatermarks(items);
                        onChange({ watermarkImage: selected.dataUrl });
                      } catch (error) {
                        setWatermarkError(
                          error instanceof Error ? error.message : "Could not save this logo",
                        );
                      }
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {watermarkError && <p className="text-xs text-destructive">{watermarkError}</p>}
              <p className="text-[11px] text-muted-foreground">
                Your five most recent logos are saved only in this browser. Maximum 1.5 MB each.
              </p>
            </div>
          </Row>
          <Row label="Text (used when no logo)">
            <Input
              placeholder="© your studio"
              disabled={!!settings.watermarkImage}
              value={settings.watermarkText}
              onChange={(e) => onChange({ watermarkText: e.target.value })}
            />
          </Row>
          <Row label="Position">
            <Chips
              options={[
                { label: "Top left", value: "top-left" },
                { label: "Top right", value: "top-right" },
                { label: "Bottom left", value: "bottom-left" },
                { label: "Bottom right", value: "bottom-right" },
                { label: "Center", value: "center" },
              ]}
              value={settings.watermarkPosition}
              onSelect={(v) => onChange({ watermarkPosition: v })}
            />
          </Row>
          <Row label="Size" value={`${settings.watermarkScale}%`}>
            <Slider
              min={3}
              max={60}
              step={1}
              value={[settings.watermarkScale]}
              onValueChange={([v]) => onChange({ watermarkScale: v ?? 22 })}
            />
          </Row>
          <Row label="Margin" value={`${settings.watermarkMargin}%`}>
            <Slider
              min={0}
              max={20}
              step={0.5}
              value={[settings.watermarkMargin]}
              onValueChange={([v]) => onChange({ watermarkMargin: v ?? 4 })}
            />
          </Row>
          <Row label="Opacity" value={`${settings.watermarkOpacity}%`}>
            <Slider
              min={5}
              max={100}
              value={[settings.watermarkOpacity]}
              onValueChange={([v]) => onChange({ watermarkOpacity: v ?? 40 })}
            />
          </Row>
        </>
      )}

      {tool.panel === "adjust" && (
        <>
          <Row label="Filter preset">
            <div className="grid grid-cols-3 gap-1.5">
              {filterPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ filterPreset: p.id, ...p.values })}
                  className={`overflow-hidden rounded-lg border text-left transition-colors ${
                    settings.filterPreset === p.id
                      ? "border-brand ring-1 ring-brand"
                      : "border-border hover:border-brand/50"
                  }`}
                >
                  <span className="checkerboard block aspect-square bg-accent/60">
                    {sampleSrc && (
                      <img
                        src={sampleSrc}
                        alt=""
                        className="size-full object-cover"
                        style={{ filter: filterCss(p.values) }}
                      />
                    )}
                  </span>
                  <span className="block px-1.5 py-1 text-[11px] font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </Row>

          <div className="space-y-5 border-t border-border pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Custom
              </span>
              {settings.filterPreset === "custom" && (
                <span className="text-[11px] text-brand">Custom</span>
              )}
            </div>
            <Row label="Brightness" value={`${settings.brightness}%`}>
              <Slider
                min={20}
                max={200}
                value={[settings.brightness]}
                onValueChange={([v]) => onChange({ filterPreset: "custom", brightness: v ?? 100 })}
              />
            </Row>
            <Row label="Contrast" value={`${settings.contrast}%`}>
              <Slider
                min={20}
                max={200}
                value={[settings.contrast]}
                onValueChange={([v]) => onChange({ filterPreset: "custom", contrast: v ?? 100 })}
              />
            </Row>
            <Row label="Saturation" value={`${settings.saturation}%`}>
              <Slider
                min={0}
                max={250}
                value={[settings.saturation]}
                onValueChange={([v]) => onChange({ filterPreset: "custom", saturation: v ?? 100 })}
              />
            </Row>
            <Row label="Warmth" value={`${settings.sepia}%`}>
              <Slider
                min={0}
                max={100}
                value={[settings.sepia]}
                onValueChange={([v]) => onChange({ filterPreset: "custom", sepia: v ?? 0 })}
              />
            </Row>
            <Row label="Black & white" value={`${settings.grayscale}%`}>
              <Slider
                min={0}
                max={100}
                value={[settings.grayscale]}
                onValueChange={([v]) => onChange({ filterPreset: "custom", grayscale: v ?? 0 })}
              />
            </Row>
            <Row label="Hue shift" value={`${settings.hueRotate}°`}>
              <Slider
                min={0}
                max={360}
                value={[settings.hueRotate]}
                onValueChange={([v]) => onChange({ filterPreset: "custom", hueRotate: v ?? 0 })}
              />
            </Row>
            <Row label="Blur" value={`${settings.blur}px`}>
              <Slider
                min={0}
                max={12}
                step={0.5}
                value={[settings.blur]}
                onValueChange={([v]) => onChange({ blur: v ?? 0 })}
              />
            </Row>
          </div>
        </>
      )}

      {tool.panel === "rename" && (
        <>
          <Row label="Filename pattern">
            <Input
              placeholder="{name}-{n}"
              value={settings.renamePattern}
              onChange={(e) => onChange({ renamePattern: e.target.value })}
            />
          </Row>
          <Row label="Insert token">
            <div className="flex flex-wrap gap-1.5">
              {renameTokens.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ renamePattern: `${settings.renamePattern}${t}` })}
                  className="num rounded-lg border border-border bg-elevated px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Quick patterns">
            <Chips
              options={[
                { label: "name", value: "{name}" },
                { label: "name-01", value: "{name}-{n}" },
                { label: "photo-01", value: "photo-{n}" },
                { label: "date-01", value: "{date}-{n}" },
                { label: "name-1200x800", value: "{name}-{w}x{h}" },
              ]}
              value={settings.renamePattern}
              onSelect={(v) => onChange({ renamePattern: v })}
            />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Start at">
              <Input
                type="number"
                min={0}
                value={settings.renameStart}
                onChange={(e) => onChange({ renameStart: Number(e.target.value) })}
              />
            </Row>
            <Row label="Digits">
              <Input
                type="number"
                min={1}
                max={6}
                value={settings.renamePad}
                onChange={(e) => onChange({ renamePad: Number(e.target.value) })}
              />
            </Row>
          </div>
          <Row label="Case">
            <Chips
              options={[
                { label: "Keep", value: "keep" },
                { label: "lower", value: "lower" },
                { label: "UPPER", value: "upper" },
                { label: "kebab-case", value: "kebab" },
              ]}
              value={settings.renameCase}
              onSelect={(v) => onChange({ renameCase: v })}
            />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Find">
              <Input
                placeholder="IMG_"
                value={settings.renameFind}
                onChange={(e) => onChange({ renameFind: e.target.value })}
              />
            </Row>
            <Row label="Replace with">
              <Input
                placeholder="empty"
                value={settings.renameReplace}
                onChange={(e) => onChange({ renameReplace: e.target.value })}
              />
            </Row>
          </div>
          <p className="rounded-lg bg-accent/60 px-3 py-2 text-xs text-muted-foreground">
            The extension always follows the export format.
          </p>
        </>
      )}
    </div>
  );
}

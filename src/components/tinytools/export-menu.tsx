"use client";

import { useState } from "react";
import { ChevronDown, Download, FileText, Images, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useExportApi,
  type ExportOptions,
  type PdfPageSize,
} from "@/lib/tinytools/export-bus";
import type { OutputFormat } from "@/lib/tinytools/prefs";

export function ExportMenu() {
  const api = useExportApi();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [scope, setScope] = useState<ExportOptions["scope"]>("all");
  const [as, setAs] = useState<ExportOptions["as"]>("files");
  const [format, setFormat] = useState<OutputFormat | "keep">("keep");
  const [quality, setQuality] = useState(85);
  const [pdfPageSize, setPdfPageSize] = useState<PdfPageSize>("same");

  if (!api || !api.count) {
    return (
      <span className="hidden text-xs text-muted-foreground sm:inline">
        Processed locally in your browser
      </span>
    );
  }

  const go = (opts: ExportOptions) => {
    setOpen(false);
    void api.run(opts);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" disabled={api.busy}>
          {api.busy ? <LoaderCircle className="animate-spin" /> : <Download />}
          Export
          <ChevronDown className="opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        {!custom ? (
          <div className="space-y-0.5">
            <MenuItem
              icon={<Download />}
              label="Export current image"
              hint={api.hasCurrent ? "Enter" : "Select an image first"}
              disabled={!api.hasCurrent}
              onClick={() => go({ scope: "current", as: "files" })}
            />
            <MenuItem
              icon={<Images />}
              label={`Export all (${api.count})`}
              hint="Separate files"
              onClick={() => go({ scope: "all", as: "files" })}
            />
            <MenuItem
              icon={<FileText />}
              label="Export all as one PDF"
              hint="Choose page size"
              onClick={() => {
                setScope("all");
                setAs("pdf");
                setCustom(true);
              }}
            />
            <div className="my-1 h-px bg-border" />
            <MenuItem
              icon={<ChevronDown className="-rotate-90" />}
              label="Custom export…"
              hint="Format, quality, scope"
              onClick={() => setCustom(true)}
            />
          </div>
        ) : (
          <div className="space-y-3 p-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Images</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as ExportOptions["scope"])}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current image</SelectItem>
                  <SelectItem value="all">All {api.count} images</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Output</Label>
              <Select value={as} onValueChange={(v) => setAs(v as ExportOptions["as"])}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="files">Image files</SelectItem>
                  <SelectItem value="pdf">Single PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat | "keep")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Same as original</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/avif">AVIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {as === "pdf" && (
              <div className="space-y-1.5">
                <Label className="text-xs">PDF page size</Label>
                <Select
                  value={pdfPageSize}
                  onValueChange={(v) => setPdfPageSize(v as PdfPageSize)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same">Same as image</SelectItem>
                    <SelectItem value="a3">A3</SelectItem>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="a5">A5</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Images fit the page without cropping.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Quality</Label>
                <span className="num text-xs text-muted-foreground">{quality}</span>
              </div>
              <Slider
                value={[quality]}
                min={20}
                max={100}
                step={1}
                onValueChange={([v]) => setQuality(v ?? quality)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => setCustom(false)}>
                Back
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => go({ scope, as, format, quality, pdfPageSize })}
              >
                Export
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </button>
  );
}

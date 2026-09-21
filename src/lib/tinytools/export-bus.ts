import { useEffect, useState } from "react";
import type { OutputFormat } from "./prefs";

export type PdfPageSize = "same" | "a3" | "a4" | "a5";

export type ExportOptions = {
  scope: "current" | "all";
  as: "files" | "pdf";
  format?: OutputFormat | "keep";
  quality?: number;
  pdfPageSize?: PdfPageSize;
};

export type ExportApi = {
  count: number;
  hasCurrent: boolean;
  busy: boolean;
  run: (opts: ExportOptions) => void | Promise<void>;
};

let api: ExportApi | null = null;
const listeners = new Set<(a: ExportApi | null) => void>();

/** The workspace owns the files; the nav only needs a handle to trigger exports. */
export function setExportApi(next: ExportApi | null) {
  api = next;
  listeners.forEach((l) => l(api));
}

export function useExportApi(): ExportApi | null {
  const [state, setState] = useState<ExportApi | null>(null);
  useEffect(() => {
    setState(api);
    const l = (a: ExportApi | null) => setState(a);
    listeners.add(l);
    return () => listeners.delete(l) as unknown as void;
  }, []);
  return state;
}

import { baseName, extOf } from "./format";

export type RenameCase = "keep" | "lower" | "upper" | "kebab";

export type RenameOptions = {
  renamePattern: string;
  renameStart: number;
  renamePad: number;
  renameCase: RenameCase;
  renameFind: string;
  renameReplace: string;
};

export const renameTokens = ["{name}", "{n}", "{date}", "{w}", "{h}", "{ext}"];

export const defaultRename: RenameOptions = {
  renamePattern: "{name}",
  renameStart: 1,
  renamePad: 2,
  renameCase: "keep",
  renameFind: "",
  renameReplace: "",
};

function applyCase(value: string, mode: RenameCase): string {
  if (mode === "lower") return value.toLowerCase();
  if (mode === "upper") return value.toUpperCase();
  if (mode === "kebab")
    return value
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .replace(/-+/g, "-")
      .toLowerCase();
  return value;
}

/** Builds the export filename from the rename pattern. Extension always comes from the encoder. */
export function buildFilename(
  originalName: string,
  ext: string,
  index: number,
  o: RenameOptions,
  meta?: { width?: number; height?: number },
): string {
  let name = baseName(originalName);
  if (o.renameFind) name = name.split(o.renameFind).join(o.renameReplace);

  const n = String(o.renameStart + index).padStart(Math.max(1, o.renamePad), "0");
  const date = new Date().toISOString().slice(0, 10);

  let out = (o.renamePattern || "{name}")
    .replace(/\{name\}/g, name)
    .replace(/\{n\}/g, n)
    .replace(/\{date\}/g, date)
    .replace(/\{w\}/g, String(meta?.width ?? ""))
    .replace(/\{h\}/g, String(meta?.height ?? ""))
    .replace(/\{ext\}/g, extOf(originalName));

  out = applyCase(out, o.renameCase).replace(/[/\\:*?"<>|]/g, "-").trim();
  if (!out) out = name || "file";
  return `${out}.${ext}`;
}

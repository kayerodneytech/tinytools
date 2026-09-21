export type SavedWatermark = {
  id: string;
  name: string;
  dataUrl: string;
  savedAt: number;
};

const KEY = "tinytools.watermarks.v1";
const MAX_ITEMS = 5;
const MAX_FILE_SIZE = 1_500_000;

export function readSavedWatermarks(): SavedWatermark[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as SavedWatermark[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.dataUrl?.startsWith("data:image/"))
      : [];
  } catch {
    return [];
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read watermark"));
    reader.readAsDataURL(file);
  });
}

export async function saveWatermark(file: File): Promise<{
  items: SavedWatermark[];
  selected: SavedWatermark;
}> {
  if (file.size > MAX_FILE_SIZE) throw new Error("Choose a logo smaller than 1.5 MB");
  const dataUrl = await fileToDataUrl(file);
  const selected: SavedWatermark = {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    dataUrl,
    savedAt: Date.now(),
  };
  const items = [
    selected,
    ...readSavedWatermarks().filter((item) => item.id !== selected.id),
  ].slice(0, MAX_ITEMS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    throw new Error("Browser storage is full. Remove an older saved logo and try again.");
  }
  return { items, selected };
}

export function removeSavedWatermark(id: string): SavedWatermark[] {
  const items = readSavedWatermarks().filter((item) => item.id !== id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* Keep the in-memory UI usable when storage is unavailable. */
  }
  return items;
}

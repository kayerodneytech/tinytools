/** Background removal runs fully in the browser (wasm segmentation model). */
const cache = new Map<string, ImageBitmap>();

export async function cutoutBitmap(key: string, source: Blob): Promise<ImageBitmap> {
  const hit = cache.get(key);
  if (hit) return hit;
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(source, { output: { format: "image/png" } });
  const bmp = await createImageBitmap(blob);
  cache.set(key, bmp);
  return bmp;
}

export function dropCutout(key: string) {
  cache.get(key)?.close?.();
  cache.delete(key);
}

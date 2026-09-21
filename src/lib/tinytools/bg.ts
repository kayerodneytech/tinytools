/** Background removal runs on the server via /api/remove-bg; cutouts are cached in-memory per file. */
const cache = new Map<string, ImageBitmap>();

export async function cutoutBitmap(key: string, source: Blob): Promise<ImageBitmap> {
  const hit = cache.get(key);
  if (hit) return hit;

  const form = new FormData();
  const filename =
    source instanceof File && source.name
      ? source.name
      : `image.${source.type === "image/png" ? "png" : "jpg"}`;
  form.append("file", source, filename);

  const res = await fetch("/api/remove-bg", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let detail = `Background removal failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      /* ignore non-JSON errors */
    }
    throw new Error(detail);
  }

  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  cache.set(key, bmp);
  return bmp;
}

export function dropCutout(key: string) {
  cache.get(key)?.close?.();
  cache.delete(key);
}

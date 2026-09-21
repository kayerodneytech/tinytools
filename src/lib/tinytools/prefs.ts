import { useCallback, useEffect, useState } from "react";

const KEY = "tinytools.prefs.v1";

export type OutputFormat = "image/jpeg" | "image/png" | "image/avif";

export type Prefs = {
  format: OutputFormat | "keep";
  quality: number;
  resizeMode: "none" | "width" | "height" | "percent" | "longest";
  resizeValue: number;
  recentTools: string[];
  favorites: string[];
  theme: "light" | "dark";
};

export const defaultPrefs: Prefs = {
  format: "keep",
  quality: 80,
  resizeMode: "none",
  resizeValue: 1600,
  recentTools: [],
  favorites: [],
  theme: "light",
};

function read(): Prefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(KEY);
    const prefs = raw ? { ...defaultPrefs, ...(JSON.parse(raw) as Partial<Prefs>) } : defaultPrefs;
    // WebP is no longer offered — any stored preference falls back to the original format.
    if ((prefs.format as string) === "image/webp") prefs.format = "keep";
    return prefs;
  } catch {
    return defaultPrefs;
  }
}

const listeners = new Set<(p: Prefs) => void>();
let cache: Prefs | null = null;

export function getPrefs(): Prefs {
  if (!cache) cache = read();
  return cache;
}

export function setPrefs(patch: Partial<Prefs>) {
  cache = { ...getPrefs(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l(cache as Prefs));
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setState] = useState<Prefs>(defaultPrefs);

  useEffect(() => {
    setState(getPrefs());
    const l = (p: Prefs) => setState(p);
    listeners.add(l);
    return () => listeners.delete(l) as unknown as void;
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => setPrefs(patch), []);
  return [prefs, update];
}

export function pushRecentTool(id: string) {
  const recent = [id, ...getPrefs().recentTools.filter((t) => t !== id)].slice(0, 5);
  setPrefs({ recentTools: recent });
}

export function toggleFavorite(id: string) {
  const favorites = getPrefs().favorites;
  setPrefs({
    favorites: favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id],
  });
}

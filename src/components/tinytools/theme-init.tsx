"use client";

import { useEffect, type ReactNode } from "react";
import { getPrefs } from "@/lib/tinytools/prefs";

/** Applies persisted light/dark theme before paint of interactive UI. */
export function ThemeInit({ children }: { children: ReactNode }) {
  useEffect(() => {
    const theme = getPrefs().theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  return children;
}

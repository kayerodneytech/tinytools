"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getPrefs, setPrefs } from "@/lib/tinytools/prefs";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initial = getPrefs().theme;
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setPrefs({ theme: next });
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, toggle };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}

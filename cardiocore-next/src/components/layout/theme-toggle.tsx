"use client";

import React, { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "cardiocore_theme";

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getThemeSnapshot(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export const ThemeToggle: React.FC = () => {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "dark");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore quota or private browsing exceptions
      }
      window.dispatchEvent(new Event("storage"));
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label="Toggle colour theme"
      className="text-xs gap-1.5 font-medium border-[var(--border)]"
    >
      {theme === "dark" ? (
        <>
          <span className="w-2 h-2 rounded-full bg-[var(--teal)] inline-block" />
          Dark Mode
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-[var(--amber)] inline-block" />
          Light Mode
        </>
      )}
    </Button>
  );
};

"use client";

import React, { useSyncExternalStore } from "react";

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
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--tint)] hover:border-[var(--teal)]/40 transition-all duration-200 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]/40"
    >
      {theme === "dark" ? (
        /* Sun Icon for Dark Mode (click to switch to Light) */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-amber-400 rotate-0 transition-transform duration-300"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        /* Moon Icon for Light Mode (click to switch to Dark) */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-[var(--teal-700)] dark:text-[var(--teal)] rotate-0 transition-transform duration-300"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
};

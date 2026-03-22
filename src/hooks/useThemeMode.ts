import { createEffect, createSignal } from "solid-js";

export type ThemeMode = "light" | "dark";
export type ResolvedTheme = ThemeMode;

const STORAGE_KEY = "video-transform-theme-mode";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function getSystemThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = localStorage.getItem(STORAGE_KEY);
  return isThemeMode(storedTheme) ? storedTheme : getSystemThemeMode();
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = createSignal<ThemeMode>(getStoredThemeMode());

  createEffect(() => {
    const nextThemeMode = themeMode();

    document.documentElement.dataset.theme = nextThemeMode;
    document.documentElement.dataset.themeMode = nextThemeMode;
    document.documentElement.style.colorScheme = nextThemeMode;
    localStorage.setItem(STORAGE_KEY, nextThemeMode);
  });

  function cycleThemeMode() {
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  }

  return {
    cycleThemeMode,
    resolvedTheme: themeMode,
    themeMode,
  };
}

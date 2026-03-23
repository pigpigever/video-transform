import { getCurrentWindow, type Color } from "@tauri-apps/api/window";
import { createEffect, createSignal } from "solid-js";

export type ThemeMode = "light" | "dark";
export type ResolvedTheme = ThemeMode;

const STORAGE_KEY = "video-transform-theme-mode";

type NativeWindowHandle = ReturnType<typeof getCurrentWindow> & {
  setBackgroundColor?: (color: Color | null) => Promise<void>;
};

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

function parseColor(value: string): Color | null {
  const normalizedValue = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(normalizedValue)) {
    return [
      Number.parseInt(normalizedValue.slice(1, 3), 16),
      Number.parseInt(normalizedValue.slice(3, 5), 16),
      Number.parseInt(normalizedValue.slice(5, 7), 16),
      255,
    ];
  }

  if (/^#[0-9a-f]{8}$/i.test(normalizedValue)) {
    return [
      Number.parseInt(normalizedValue.slice(1, 3), 16),
      Number.parseInt(normalizedValue.slice(3, 5), 16),
      Number.parseInt(normalizedValue.slice(5, 7), 16),
      Number.parseInt(normalizedValue.slice(7, 9), 16),
    ];
  }

  return null;
}

function getNativeWindowColor(): Color | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseColor(
    getComputedStyle(document.documentElement).getPropertyValue("--window-bg"),
  );
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = createSignal<ThemeMode>(getStoredThemeMode());
  const appWindow = getCurrentWindow() as NativeWindowHandle;

  createEffect(() => {
    const nextThemeMode = themeMode();

    document.documentElement.dataset.theme = nextThemeMode;
    document.documentElement.dataset.themeMode = nextThemeMode;
    document.documentElement.style.colorScheme = nextThemeMode;
    localStorage.setItem(STORAGE_KEY, nextThemeMode);

    const nativeWindowColor = getNativeWindowColor();

    void appWindow.setTheme(nextThemeMode).catch(() => {
      // Ignore native theme sync failures and keep the web theme usable.
    });
    void appWindow.setTitleBarStyle("transparent").catch(() => {
      // Ignore unsupported platforms and keep the regular title bar.
    });

    const backgroundSync = appWindow.setBackgroundColor?.(nativeWindowColor);
    void backgroundSync?.catch(() => {
      // Ignore unsupported background sync and keep the web theme usable.
    });
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

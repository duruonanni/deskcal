export type ThemeMode = "auto" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export function normalizeThemeMode(raw: unknown): ThemeMode {
  return raw === "light" || raw === "dark" || raw === "auto" ? raw : "auto";
}

export function resolveScheme(mode: ThemeMode, prefersDark: boolean): ColorScheme {
  if (mode === "light" || mode === "dark") return mode;
  return prefersDark ? "dark" : "light";
}

export function prefersDarkFromWindow(win: { matchMedia?: (q: string) => { matches: boolean } }): boolean {
  try {
    return Boolean(win.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  } catch {
    return false;
  }
}

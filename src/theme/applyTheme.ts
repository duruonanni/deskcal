import type { ColorScheme } from "./resolveScheme";
import type { ThemeTokens } from "./themePack";

const CSS_VAR: Record<keyof ThemeTokens, string> = {
  cardFillRgb: "--card-fill-rgb",
  text: "--text",
  textMuted: "--text-muted",
  textDim: "--text-dim",
  accent: "--accent",
  accentOnAccent: "--accent-on-accent",
  tileTodayBg: "--tile-today-bg",
  tileRestBg: "--tile-rest-bg",
  tileWorkBg: "--tile-work-bg",
  borderSoft: "--border-soft",
  shadow: "--shadow",
  textOutline: "--text-outline",
  dialogBg: "--dialog-bg",
  dialogText: "--dialog-text",
};

export function applyThemeToDocument(options: {
  scheme: ColorScheme;
  fillAlpha: number;
  textOutlineEnabled: boolean;
  overlay: ThemeTokens | null;
}): void {
  const root = document.documentElement;
  root.dataset.theme = options.scheme;
  root.style.setProperty("--card-fill-alpha", String(options.fillAlpha));
  if (options.overlay) {
    for (const [key, cssName] of Object.entries(CSS_VAR)) {
      root.style.setProperty(cssName, options.overlay[key as keyof ThemeTokens]);
    }
  } else {
    for (const cssName of Object.values(CSS_VAR)) {
      root.style.removeProperty(cssName);
    }
  }
  root.style.setProperty(
    "--text-shadow",
    options.textOutlineEnabled ? "var(--text-outline)" : "none",
  );
}

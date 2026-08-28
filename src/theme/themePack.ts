export const THEME_TOKEN_KEYS = [
  "cardFillRgb",
  "text",
  "textMuted",
  "textDim",
  "accent",
  "accentOnAccent",
  "tileTodayBg",
  "tileRestBg",
  "tileWorkBg",
  "borderSoft",
  "shadow",
  "textOutline",
  "dialogBg",
  "dialogText",
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;

export interface ThemePack {
  light?: ThemeTokens;
  dark?: ThemeTokens;
}

export type ParseThemePackResult =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "ok"; pack: ThemePack };

function isTokens(value: unknown): value is ThemeTokens {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return THEME_TOKEN_KEYS.every((key) => typeof rec[key] === "string" && rec[key].length > 0);
}

export function parseThemePack(raw: string | null | undefined): ParseThemePackResult {
  if (raw == null || raw.trim() === "") return { status: "missing" };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: "invalid" };
  }
  if (!json || typeof json !== "object") return { status: "invalid" };
  const rec = json as Record<string, unknown>;
  const light = rec.light === undefined ? undefined : rec.light;
  const dark = rec.dark === undefined ? undefined : rec.dark;
  if (light !== undefined && !isTokens(light)) return { status: "invalid" };
  if (dark !== undefined && !isTokens(dark)) return { status: "invalid" };
  if (!light && !dark) return { status: "invalid" };
  return {
    status: "ok",
    pack: {
      light: light as ThemeTokens | undefined,
      dark: dark as ThemeTokens | undefined,
    },
  };
}

export function tokensForScheme(pack: ThemePack, scheme: "light" | "dark"): ThemeTokens | null {
  if (scheme === "light") return pack.light ?? pack.dark ?? null;
  return pack.dark ?? pack.light ?? null;
}

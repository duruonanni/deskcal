import { describe, expect, it } from "vitest";
import { parseThemePack } from "./themePack";

const TOKEN_KEYS = [
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

function stubPole() {
  return Object.fromEntries(TOKEN_KEYS.map((k) => [k, k === "cardFillRgb" ? "255, 250, 244" : "#111"]));
}

describe("parseThemePack", () => {
  it("returns missing for empty input", () => {
    expect(parseThemePack(null).status).toBe("missing");
  });

  it("returns invalid on junk JSON", () => {
    expect(parseThemePack("{").status).toBe("invalid");
  });

  it("accepts light-only pack", () => {
    const parsed = parseThemePack(JSON.stringify({ light: stubPole() }));
    expect(parsed.status).toBe("ok");
    if (parsed.status === "ok") {
      expect(parsed.pack.light).toBeTruthy();
      expect(parsed.pack.dark).toBeUndefined();
    }
  });

  it("rejects pole missing keys", () => {
    expect(parseThemePack(JSON.stringify({ light: { text: "#000" } })).status).toBe("invalid");
  });
});

import { describe, expect, it } from "vitest";
import { normalizeThemeMode, resolveScheme } from "./resolveScheme";

describe("resolveScheme", () => {
  it("locks light and dark", () => {
    expect(resolveScheme("light", true)).toBe("light");
    expect(resolveScheme("dark", false)).toBe("dark");
  });

  it("follows OS when auto", () => {
    expect(resolveScheme("auto", true)).toBe("dark");
    expect(resolveScheme("auto", false)).toBe("light");
  });

  it("treats unknown mode as auto", () => {
    expect(normalizeThemeMode("purple")).toBe("auto");
    expect(resolveScheme(normalizeThemeMode("nope"), true)).toBe("dark");
  });
});

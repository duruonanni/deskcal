import { describe, expect, it } from "vitest";
import { t } from "./messages";

describe("editorial glass copy", () => {
  it("has distinct zh and en theme labels", () => {
    expect(t("zh", "themeAuto")).toBe("跟随系统");
    expect(t("en", "themeAuto")).toBe("Follow system");
    expect(t("zh", "themeLight")).toBe("浅色");
    expect(t("en", "themeLight")).toBe("Light");
    expect(t("zh", "themeDark")).toBe("深色");
    expect(t("en", "themeDark")).toBe("Dark");
  });

  it("explains true transparency", () => {
    expect(t("zh", "opacityHelp")).toContain("桌面");
    expect(t("en", "opacityHelp").toLowerCase()).toContain("desktop");
  });

  it("localizes tile marks", () => {
    expect(t("zh", "restMark")).toBe("休");
    expect(t("en", "restMark")).toBe("Off");
    expect(t("zh", "workMark")).toBe("班");
    expect(t("en", "workMark")).toBe("Work");
  });
});

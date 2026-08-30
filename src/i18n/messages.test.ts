import { describe, expect, it } from "vitest";

import { t } from "./messages";

describe("editorial glass copy", () => {
  it("explains cell opacity floor", () => {
    expect(t("zh", "opacityHelp")).toContain("70%");
    expect(t("en", "opacityHelp").toLowerCase()).toContain("70%");
  });

  it("localizes tile marks", () => {
    expect(t("zh", "restMark")).toBe("休");
    expect(t("en", "restMark")).toBe("Off");
    expect(t("zh", "workMark")).toBe("班");
    expect(t("en", "workMark")).toBe("Work");
  });

  it("localizes week navigation and holidays", () => {
    expect(t("zh", "prevWeek")).toBe("上一周");
    expect(t("en", "nextWeek")).toBe("Next week");
    expect(t("zh", "holidaysRefreshFailed")).toContain("离线");
    expect(t("en", "holidaysRefreshFailed").toLowerCase()).toContain("offline");
  });

  it("warns about custom holiday source URLs", () => {
    expect(t("zh", "holidaySourceUrlWarning")).toContain("谨慎");
    expect(t("en", "holidaySourceUrlWarning").toLowerCase()).toContain("caution");
  });

  it("localizes the settings version label", () => {
    expect(t("zh", "appVersionLabel")).toBe("版本");
    expect(t("en", "appVersionLabel")).toBe("Version");
  });
});

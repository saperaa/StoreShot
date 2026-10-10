import { describe, expect, it } from "vitest";
import {
  defaultDirection,
  normalizeLocaleTag,
  resolveDirection,
  RTL_LANGUAGES,
} from "../../src/i18n/direction.js";

describe("locale direction", () => {
  it("defaults Arabic to RTL", () => {
    expect(defaultDirection("ar")).toBe("rtl");
    expect(defaultDirection("ar-EG")).toBe("rtl");
  });

  it("defaults other RTL languages to RTL", () => {
    for (const tag of ["he", "fa", "ur", "ckb", "ps"]) {
      expect(defaultDirection(tag), tag).toBe("rtl");
    }
  });

  it("defaults Western locales to LTR", () => {
    expect(defaultDirection("en-US")).toBe("ltr");
    expect(defaultDirection("fr")).toBe("ltr");
    expect(defaultDirection("de-DE")).toBe("ltr");
  });

  it("explicit overrides win over language defaults", () => {
    expect(resolveDirection("en-US", { "en-US": "rtl" })).toBe("rtl");
    expect(resolveDirection("ar", { ar: "ltr" })).toBe("ltr");
    expect(resolveDirection("ar-EG", { ar: "ltr" })).toBe("ltr");
  });

  it("normalizes underscores and case", () => {
    expect(normalizeLocaleTag("en_us")).toBe("en-US");
    expect(normalizeLocaleTag("AR-EG")).toBe("ar-EG");
    expect(() => normalizeLocaleTag("not a locale!")).toThrow(/Invalid locale tag/);
  });

  it("ships a documented RTL language list", () => {
    expect(RTL_LANGUAGES).toContain("ar");
    expect(RTL_LANGUAGES.length).toBeGreaterThan(5);
  });
});

import { describe, expect, it } from "vitest";
import { resolveLocalizedText } from "../../src/i18n/text.js";

describe("localized text resolution", () => {
  it("plain strings apply to every locale", () => {
    expect(resolveLocalizedText("Hello", "ar")).toEqual({ value: "Hello", matchedVia: "exact" });
  });

  it("matches the exact locale tag first", () => {
    const text = { ar: "عام", "ar-EG": "مصري" };
    expect(resolveLocalizedText(text, "ar-EG")).toEqual({ value: "مصري", matchedVia: "exact" });
  });

  it("falls back to the primary language", () => {
    const text = { ar: "عام", "en-US": "General" };
    expect(resolveLocalizedText(text, "ar-EG")).toEqual({ value: "عام", matchedVia: "language" });
  });

  it("reports missing translations as none", () => {
    expect(resolveLocalizedText({ "en-US": "Hi" }, "ar")).toEqual({
      value: undefined,
      matchedVia: "none",
    });
  });

  it("treats undefined fields as absent", () => {
    expect(resolveLocalizedText(undefined, "ar").value).toBeUndefined();
  });
});

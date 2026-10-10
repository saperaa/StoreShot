import { describe, expect, it } from "vitest";
import { contrastRatio, mix, parseHexColor, withAlpha } from "../../src/util/colors.js";

describe("color utilities", () => {
  it("parses 3 and 6 digit hex", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor("#62E6B5")).toEqual({ r: 98, g: 230, b: 181 });
    expect(() => parseHexColor("red")).toThrow(/Invalid hex color/);
  });

  it("mixes colors linearly", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("produces rgba strings", () => {
    expect(withAlpha("#62E6B5", 0.5)).toBe("rgba(98, 230, 181, 0.5)");
  });

  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    // White on the default dark background must be comfortably readable.
    expect(contrastRatio("#FFFFFF", "#0E1524")).toBeGreaterThan(10);
  });
});

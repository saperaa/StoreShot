import { describe, expect, it } from "vitest";
import { buildOutputPath, outputFileName } from "../../src/output/naming.js";

describe("output naming", () => {
  it("zero-pads indices for deterministic ordering", () => {
    expect(outputFileName(0, "home")).toBe("01-home.png");
    expect(outputFileName(9, "home")).toBe("10-home.png");
    expect(outputFileName(0, "compose-task")).toBe("01-compose-task.png");
  });

  it("builds nested output paths from safe segments", () => {
    const p = buildOutputPath("/out", "app-store-iphone-6-3", "ar-EG", "02-insights.png");
    expect(p.replaceAll("\\", "/")).toBe("/out/app-store-iphone-6-3/ar-EG/02-insights.png");
  });

  it("rejects path traversal in segments", () => {
    expect(() => outputFileName(0, "../evil")).toThrow(/Unsafe/);
    expect(() => buildOutputPath("/out", "..", "ar", "01-x.png")).toThrow(/Unsafe/);
    expect(() => buildOutputPath("/out", "ok", "../../evil", "01-x.png")).toThrow(/Unsafe/);
  });
});

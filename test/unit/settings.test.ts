import { describe, expect, it } from "vitest";
import { boolSetting, numberSetting, unknownSettingKeys } from "../../src/templates/settings.js";
import { getTemplate, listTemplates, templateIds } from "../../src/templates/registry.js";

const defs = [
  { key: "glow", type: "number" as const, default: 0.6, min: 0, max: 1, description: "" },
  { key: "chip", type: "boolean" as const, default: true, description: "" },
];

describe("template settings", () => {
  it("falls back to declared defaults", () => {
    expect(numberSetting(defs, {}, "glow")).toBe(0.6);
    expect(boolSetting(defs, {}, "chip")).toBe(true);
  });

  it("reads provided values", () => {
    expect(numberSetting(defs, { glow: 0.2 }, "glow")).toBe(0.2);
    expect(boolSetting(defs, { chip: false }, "chip")).toBe(false);
  });

  it("clamps numbers to the declared range and ignores wrong types", () => {
    expect(numberSetting(defs, { glow: 5 }, "glow")).toBe(1);
    expect(numberSetting(defs, { glow: "high" as unknown as number }, "glow")).toBe(0.6);
  });

  it("reports unknown keys for validation warnings", () => {
    expect(unknownSettingKeys(defs, { glow: 1, nope: true })).toEqual(["nope"]);
  });
});

describe("template registry", () => {
  it("ships at least four distinct templates", () => {
    expect(templateIds()).toEqual(["minimal", "gradient", "device-focus", "spotlight"]);
    expect(listTemplates().length).toBeGreaterThanOrEqual(4);
  });

  it("every template has RTL-safe metadata and a render function", () => {
    for (const template of listTemplates()) {
      expect(template.id).toMatch(/^[a-z-]+$/);
      expect(template.name.length).toBeGreaterThan(2);
      expect(typeof template.render).toBe("function");
      expect(template.settings.length).toBeGreaterThan(0);
    }
    expect(getTemplate("spotlight")).toBeDefined();
    expect(getTemplate("does-not-exist")).toBeUndefined();
  });
});

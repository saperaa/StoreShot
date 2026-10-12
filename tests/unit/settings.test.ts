import { describe, expect, it } from "vitest";
import {
  boolSetting,
  numberSetting,
  stringSetting,
  unknownSettingKeys,
} from "../../src/templates/settings.js";
import {
  getTemplate,
  listTemplates,
  templateIds,
  TEMPLATE_ALIASES,
} from "../../src/templates/registry.js";

const defs = [
  { key: "glow", type: "number" as const, default: 0.6, min: 0, max: 1, description: "" },
  { key: "chip", type: "boolean" as const, default: true, description: "" },
  {
    key: "deviceMode",
    type: "string" as const,
    default: "auto",
    values: ["auto", "bare", "front", "angled"],
    description: "",
  },
] as const;

describe("template settings", () => {
  it("falls back to declared defaults", () => {
    expect(numberSetting(defs, {}, "glow")).toBe(0.6);
    expect(boolSetting(defs, {}, "chip")).toBe(true);
    expect(stringSetting(defs, {}, "deviceMode")).toBe("auto");
  });

  it("reads provided values", () => {
    expect(numberSetting(defs, { glow: 0.2 }, "glow")).toBe(0.2);
    expect(boolSetting(defs, { chip: false }, "chip")).toBe(false);
    expect(stringSetting(defs, { deviceMode: "angled" }, "deviceMode")).toBe("angled");
  });

  it("clamps numbers to the declared range and ignores wrong types", () => {
    expect(numberSetting(defs, { glow: 5 }, "glow")).toBe(1);
    expect(numberSetting(defs, { glow: "high" as unknown as number }, "glow")).toBe(0.6);
  });

  it("rejects string values outside the declared set", () => {
    expect(stringSetting(defs, { deviceMode: "hologram" }, "deviceMode")).toBe("auto");
    expect(stringSetting(defs, { deviceMode: 7 as unknown as string }, "deviceMode")).toBe("auto");
  });

  it("reports unknown keys for validation warnings", () => {
    expect(unknownSettingKeys(defs, { glow: 1, nope: true })).toEqual(["nope"]);
  });
});

describe("template registry", () => {
  it("ships fourteen art-directed templates", () => {
    expect(templateIds()).toEqual([
      "editorial",
      "cinematic",
      "cinematic-3d",
      "swiss",
      "campaign",
      "immersive",
      "showcase",
      "discovery",
      "atelier",
      "aurora",
      "linea",
      "tilt",
      "float",
      "strata",
    ]);
    expect(listTemplates().length).toBe(14);
  });

  it("every template has metadata, settings and a render function", () => {
    for (const template of listTemplates()) {
      expect(template.id).toMatch(/^[a-z0-9-]+$/);
      expect(template.name.length).toBeGreaterThan(2);
      expect(typeof template.render).toBe("function");
      expect(template.settings.length).toBeGreaterThanOrEqual(3);
    }
    expect(getTemplate("does-not-exist")).toBeUndefined();
  });

  it("resolves pre-v0.2 template ids to their redesigns", () => {
    for (const [alias, canonical] of Object.entries(TEMPLATE_ALIASES)) {
      const resolved = getTemplate(alias);
      expect(resolved, alias).toBeDefined();
      expect(resolved!.id).toBe(canonical);
    }
    expect(getTemplate("minimal")!.id).toBe("swiss");
    expect(getTemplate("spotlight")!.id).toBe("cinematic");
  });
});

import { describe, expect, it } from "vitest";
import { recommendCompositions, selectComposition } from "../../src/design/direct.js";
import { storeshotConfigSchema } from "../../src/config/schema.js";
import { resolveConfig } from "../../src/config/resolve.js";
import type { LoadedConfig } from "../../src/config/load.js";

describe("deterministic art direction", () => {
  it("decor assets pick the floating-product composition", () => {
    const choice = selectComposition({ hasDecor: true, orientation: "portrait" });
    expect(choice.templateId).toBe("float");
    expect(choice.reason).toContain("decor");
  });

  it("finance prioritizes trust and clarity", () => {
    expect(
      selectComposition({ category: "finance", hasDecor: false, orientation: "portrait" })
        .templateId,
    ).toBe("swiss");
  });

  it("productivity favors restraint", () => {
    expect(
      selectComposition({ category: "productivity", hasDecor: false, orientation: "portrait" })
        .templateId,
    ).toBe("linea");
  });

  it("games get the dramatic layered composition", () => {
    expect(
      selectComposition({ category: "games", hasDecor: false, orientation: "portrait" }).templateId,
    ).toBe("strata");
  });

  it("food and shopping get the energetic poster", () => {
    for (const category of ["food", "shopping"] as const) {
      expect(
        selectComposition({ category, hasDecor: false, orientation: "portrait" }).templateId,
      ).toBe("tilt");
    }
  });

  it("falls back to the editorial default without metadata", () => {
    expect(selectComposition({ hasDecor: false, orientation: "portrait" }).templateId).toBe(
      "editorial",
    );
  });

  it("decor wins over the declared category", () => {
    expect(
      selectComposition({ category: "finance", hasDecor: true, orientation: "portrait" })
        .templateId,
    ).toBe("float");
  });

  it("recommendCompositions puts the selection first", () => {
    const input = { category: "games" as const, hasDecor: false, orientation: "portrait" as const };
    const ranked = recommendCompositions(input);
    expect(ranked[0]!.templateId).toBe(selectComposition(input).templateId);
    expect(ranked.length).toBeGreaterThan(1);
    expect(new Set(ranked.map((r) => r.templateId)).size).toBe(ranked.length);
  });
});

const baseConfig = {
  app: { name: "Test App" },
  locales: ["en-US"],
  screenshots: [{ id: "home", image: "./screens/home.png", title: "Hello" }],
  exports: [{ store: "google-play", profile: "phone" }],
};

function loadedWith(overrides: Record<string, unknown>): LoadedConfig {
  const parsed = storeshotConfigSchema.parse({ ...baseConfig, ...overrides });
  return { raw: parsed, path: "/project/storeshot.config.json", dir: "/project" };
}

describe('"auto" template resolution', () => {
  it("resolves through the deterministic rules and records the reason", () => {
    const resolved = resolveConfig(
      loadedWith({ template: "auto", app: { name: "Bank", category: "finance" } }),
    );
    expect(resolved.template.definition.id).toBe("swiss");
    expect(resolved.template.autoSelected?.id).toBe("swiss");
    expect(resolved.template.autoSelected?.reason).toContain("finance");
  });

  it("an explicit template id is never re-routed", () => {
    const resolved = resolveConfig(
      loadedWith({ template: "linea", app: { name: "Bank", category: "finance" } }),
    );
    expect(resolved.template.definition.id).toBe("linea");
    expect(resolved.template.autoSelected).toBeUndefined();
  });

  it("resolves decor entries to config-relative paths", () => {
    const resolved = resolveConfig(
      loadedWith({
        template: "auto",
        screenshots: [
          {
            id: "home",
            image: "./screens/home.png",
            title: "Hello",
            decor: [
              { id: "tomato", image: "./decor/tomato.png" },
              { id: "leaf", image: "decor/leaf.webp" },
            ],
          },
        ],
      }),
    );
    const shot = resolved.screenshots[0]!;
    expect(shot.decor.map((d) => d.id)).toEqual(["tomato", "leaf"]);
    expect(shot.decor[0]!.imagePath).toMatch(/decor[\\/]tomato\.png$/);
    expect(resolved.template.definition.id).toBe("float");
  });

  it("rejects duplicate decor ids and bad categories", () => {
    expect(() =>
      storeshotConfigSchema.parse({
        ...baseConfig,
        app: { name: "X", category: "astrology" },
      }),
    ).toThrow();
    expect(() =>
      resolveConfig(
        loadedWith({
          screenshots: [
            {
              id: "home",
              image: "./screens/home.png",
              decor: [
                { id: "x", image: "./a.png" },
                { id: "x", image: "./b.png" },
              ],
            },
          ],
        }),
      ),
    ).toThrow(/duplicate decor id/i);
  });
});

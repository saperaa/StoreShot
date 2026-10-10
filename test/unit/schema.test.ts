import { describe, expect, it } from "vitest";
import { storeshotConfigSchema } from "../../src/config/schema.js";
import { resolveConfig } from "../../src/config/resolve.js";
import type { LoadedConfig } from "../../src/config/load.js";
import { ConfigError } from "../../src/errors.js";

const baseConfig = {
  app: { name: "Test App" },
  locales: ["en-US", "ar"],
  screenshots: [
    {
      id: "home",
      image: "./screens/home.png",
      title: { "en-US": "Hello", ar: "مرحبا" },
    },
  ],
  exports: [{ store: "app-store", profile: "iphone-6-3" }],
};

function loadedWith(overrides: Record<string, unknown>): LoadedConfig {
  const parsed = storeshotConfigSchema.parse({ ...baseConfig, ...overrides });
  return { raw: parsed, path: "/project/storeshot.config.json", dir: "/project" };
}

describe("configuration schema", () => {
  it("accepts a minimal config and applies defaults", () => {
    const config = storeshotConfigSchema.parse(baseConfig);
    expect(config.template).toBe("gradient");
    expect(config.theme.background).toBe("#0E1524");
    expect(config.output.dir).toBe("./storeshots");
    expect(config.locales).toEqual(["en-US", "ar"]);
  });

  it("accepts an app story for context", () => {
    const config = storeshotConfigSchema.parse({
      ...baseConfig,
      app: { name: "X", story: "A habit tracker for night-shift nurses." },
    });
    expect(config.app.story).toBe("A habit tracker for night-shift nurses.");
  });

  it("rejects invalid hex colors with a helpful message", () => {
    const result = storeshotConfigSchema.safeParse({
      ...baseConfig,
      theme: { accent: "notacolor" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(" ");
      expect(message).toMatch(/hex color/);
    }
  });

  it("rejects malformed locale tags", () => {
    const result = storeshotConfigSchema.safeParse({
      ...baseConfig,
      locales: ["en-US", "not a locale!"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one screenshot and one export", () => {
    expect(storeshotConfigSchema.safeParse({ ...baseConfig, screenshots: [] }).success).toBe(false);
    expect(storeshotConfigSchema.safeParse({ ...baseConfig, exports: [] }).success).toBe(false);
  });

  it("rejects unknown stores", () => {
    const result = storeshotConfigSchema.safeParse({
      ...baseConfig,
      exports: [{ store: "steam", profile: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects future config versions loudly", () => {
    const result = storeshotConfigSchema.safeParse({ ...baseConfig, configVersion: 2 });
    expect(result.success).toBe(false);
  });
});

describe("config resolution", () => {
  it("resolves locales with directions and html lang", () => {
    const resolved = resolveConfig(loadedWith({}));
    expect(resolved.locales.map((l) => [l.tag, l.dir])).toEqual([
      ["en-US", "ltr"],
      ["ar", "rtl"],
    ]);
    expect(resolved.locales[1]!.htmlLang).toBe("ar");
  });

  it("rejects unknown templates with the list of available ones", () => {
    expect(() => resolveConfig(loadedWith({ template: "nope" }))).toThrow(ConfigError);
    try {
      resolveConfig(loadedWith({ template: "nope" }));
    } catch (error) {
      const message = (error as ConfigError).message;
      expect(message).toMatch(/minimal/);
      expect(message).toMatch(/gradient/);
      expect(message).toMatch(/device-focus/);
    }
  });

  it("rejects unknown store profiles with the available list", () => {
    expect(() =>
      resolveConfig(loadedWith({ exports: [{ store: "google-play", profile: "iphone-6-3" }] })),
    ).toThrow(/Unknown profile "iphone-6-3" for store "google-play"/);
  });

  it("reports missing translations per screenshot, locale and field", () => {
    try {
      resolveConfig(
        loadedWith({
          screenshots: [{ id: "home", image: "./x.png", title: { "en-US": "Only English" } }],
        }),
      );
      expect.unreachable("should have thrown");
    } catch (error) {
      const message = (error as ConfigError).message;
      expect(message).toMatch(/"home"/);
      expect(message).toMatch(/"ar"/);
      expect(message).toMatch(/title/);
    }
  });

  it("rejects duplicate screenshot ids and direction overrides for unknown locales", () => {
    expect(() =>
      resolveConfig(
        loadedWith({
          screenshots: [
            { id: "home", image: "./a.png" },
            { id: "HOME", image: "./b.png" },
          ],
        }),
      ),
    ).toThrow(/Duplicate screenshot id/);

    expect(() => resolveConfig(loadedWith({ direction: { zz: "rtl" } }))).toThrow(
      /does not match any configured locale/,
    );
  });

  it("accepts custom export sizes inside store rules and rejects ones outside", () => {
    const ok = resolveConfig(
      loadedWith({
        exports: [{ store: "google-play", profile: "phone", size: { width: 720, height: 1280 } }],
      }),
    );
    expect(ok.exports[0]!.width).toBe(720);
    expect(ok.exports[0]!.customSize).toBe(true);

    expect(() =>
      resolveConfig(
        loadedWith({
          exports: [{ store: "google-play", profile: "phone", size: { width: 640, height: 2000 } }],
        }),
      ),
    ).toThrow(/2x the shortest side/);
  });
});

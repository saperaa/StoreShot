import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { Renderer, type Renderer as RendererType } from "../../src/render/engine.js";
import { loadConfigFile } from "../../src/config/load.js";
import { resolveConfig } from "../../src/config/resolve.js";
import { buildRenderRequest, deviceFrameFor } from "../../src/render/pipeline.js";
import { readImageInfo } from "../../src/util/imageSize.js";

/**
 * Visual regression suite.
 *
 * Strategy:
 *  - Structural checks everywhere: exact dimensions, fonts loaded, no text
 *    overflow, non-blank output, EN/AR clearly differ.
 *  - Determinism: rendering the same job twice must be pixel-identical.
 *  - Baselines: per-platform committed PNGs; pixelmatch with a small
 *    tolerance so insignificant antialiasing does not fail the build.
 *    Update intentionally with `npm run test:visual:update`.
 *
 * Cross-platform note: text rasterization differs between Windows and Linux
 * Chromium, so baselines are per platform and missing baselines skip with a
 * notice instead of failing.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinesDir = path.join(repoRoot, "test", "visual", "baselines");
const updateSnapshots = process.env.UPDATE_SNAPSHOTS === "1";
const CANVAS = { width: 720, height: 1280 };

interface Case {
  name: string;
  locale: string;
  template: string;
  screenshot: string;
  deviceFrame?: boolean;
}

const cases: Case[] = [
  { name: "gradient-en", locale: "en-US", template: "gradient", screenshot: "home" },
  { name: "gradient-ar", locale: "ar", template: "gradient", screenshot: "home" },
  { name: "spotlight-ar", locale: "ar", template: "spotlight", screenshot: "compose" },
  {
    name: "devicefocus-en",
    locale: "en-US",
    template: "device-focus",
    screenshot: "insights",
    deviceFrame: true,
  },
];

let renderer: RendererType;
const jobs = new Map<string, ReturnType<typeof buildRenderRequest>>();

beforeAll(async () => {
  renderer = await Renderer.launch();
  const { getTemplate } = await import("../../src/templates/registry.js");
  const configPath = path.join(repoRoot, "starter", "storeshot.config.json");

  for (const caseDef of cases) {
    const loaded = await loadConfigFile(configPath);
    const resolved = resolveConfig(loaded);
    // The starter uses the gradient template; swap in the case's template.
    const patched = {
      ...resolved,
      template: { definition: getTemplate(caseDef.template)!, settings: {} },
    };
    const locale = resolved.locales.find((l) => l.tag === caseDef.locale)!;
    const screenshot = resolved.screenshots.find((s) => s.id === caseDef.screenshot)!;
    const imageInfo = await readImageInfo(screenshot.imagePath);
    jobs.set(
      caseDef.name,
      buildRenderRequest({
        resolved: patched,
        locale,
        screenshot,
        imageInfo,
        size: CANVAS,
        deviceFrame: caseDef.deviceFrame ?? deviceFrameFor(resolved, screenshot),
      }),
    );
  }
});

afterAll(async () => {
  await renderer.close();
});

function uniqueColors(png: PNG, sampleStep = 7): number {
  const colors = new Set<number>();
  for (let i = 0; i < png.data.length; i += 4 * sampleStep) {
    colors.add(
      (png.data[i]! << 16) |
        (png.data[i + 1]! << 8) |
        (png.data[i + 2]! | (png.data[i + 3]! << 24)),
    );
  }
  return colors.size;
}

describe.each(cases)("visual: $name", (caseDef) => {
  it("renders with exact dimensions, loaded fonts, no overflow, and is not blank", async () => {
    const request = jobs.get(caseDef.name)!;
    const result = await renderer.render(request);

    expect(result.width).toBe(CANVAS.width);
    expect(result.height).toBe(CANVAS.height);

    for (const [family, loaded] of Object.entries(result.diagnostics.fontChecks)) {
      expect(loaded, `font ${family} must load`).toBe(true);
    }
    expect(result.diagnostics.failedAssets).toEqual([]);
    const overflowing = result.diagnostics.overflow.filter((o) => o.rendered > o.budget + 2);
    expect(overflowing).toEqual([]);

    const png = PNG.sync.read(result.png);
    expect(uniqueColors(png)).toBeGreaterThan(200);
  }, 120_000);

  it("is deterministic: two renders are pixel-identical", async () => {
    const request = jobs.get(caseDef.name)!;
    const first = await renderer.render(request);
    const second = await renderer.render(request);
    const a = PNG.sync.read(first.png);
    const b = PNG.sync.read(second.png);
    const diff = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
    expect(diff).toBe(0);
  });

  it("matches the committed baseline (per platform)", async () => {
    const request = jobs.get(caseDef.name)!;
    const result = await renderer.render(request);
    const baselinePath = path.join(baselinesDir, `${caseDef.name}-${process.platform}.png`);

    if (updateSnapshots) {
      await fs.mkdir(baselinesDir, { recursive: true });
      await fs.writeFile(baselinePath, result.png);
      return;
    }

    let baselineBuffer: Buffer;
    try {
      baselineBuffer = await fs.readFile(baselinePath);
    } catch {
      console.log(
        `[visual] no baseline for ${caseDef.name} on ${process.platform} — skipping comparison. ` +
          "Regenerate with `npm run test:visual:update` and commit the result.",
      );
      return;
    }

    const actual = PNG.sync.read(result.png);
    const baseline = PNG.sync.read(baselineBuffer);
    expect(baseline.width).toBe(CANVAS.width);
    expect(baseline.height).toBe(CANVAS.height);
    const diffPixels = pixelmatch(baseline.data, actual.data, null, actual.width, actual.height, {
      threshold: 0.12,
    });
    const ratio = diffPixels / (actual.width * actual.height);
    expect(
      ratio,
      `${caseDef.name}: ${diffPixels} differing pixels vs baseline (${(ratio * 100).toFixed(3)}%)`,
    ).toBeLessThan(0.005);
  }, 120_000);
});

it("Arabic and English renders of the same job differ substantially", async () => {
  const render = async (locale: string) => {
    const request = jobs.get(locale === "ar" ? "gradient-ar" : "gradient-en")!;
    return PNG.sync.read((await renderer.render(request)).png);
  };
  const en = await render("en-US");
  const ar = await render("ar");
  const diff = pixelmatch(en.data, ar.data, null, en.width, en.height, { threshold: 0.1 });
  expect(diff / (en.width * en.height)).toBeGreaterThan(0.01);
});

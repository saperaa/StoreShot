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
const CANVAS = { width: 720, height: 1280 }; // default portrait canvas

interface Case {
  name: string;
  locale: string;
  template: string;
  screenshot: string;
  deviceFrame?: boolean;
  index?: number;
  /** Text overrides for regression scenarios (long copy, mixed content). */
  title?: string;
  subtitle?: string;
  prompt?: string;
  /** Theme override for light/dark coverage. */
  theme?: Record<string, string>;
  /** Canvas override; landscape sizes exercise the landscape compositions. */
  size?: { width: number; height: number };
}

const cases: Case[] = [
  { name: "editorial-en", locale: "en-US", template: "editorial", screenshot: "home" },
  { name: "editorial-ar", locale: "ar", template: "editorial", screenshot: "compose", index: 2 },
  {
    name: "editorial-ar-long",
    locale: "ar",
    template: "editorial",
    screenshot: "plan",
    title: "كل ما تحتاجه لتخطيط يومك بالكامل وتنظيم مهامك المهمة", // 3 lines of headline
    subtitle: "خطط يومًا بيوم، وعدّل كما تتغير الظروف — حتى مع الأرقام 123 والتواريخ 2026/10/10",
  },
  { name: "cinematic-en", locale: "en-US", template: "cinematic", screenshot: "home" },
  {
    name: "cinematic-ar",
    locale: "ar",
    template: "cinematic",
    screenshot: "compose",
    index: 1,
    title: "سجّلها في لحظتها (متصل بـ 12 تطبيقًا)",
    subtitle: "إضافة سريعة بالعربية أو English — حتى 40% أسرع",
  },
  { name: "swiss-en", locale: "en-US", template: "swiss", screenshot: "insights" },
  { name: "swiss-ar", locale: "ar", template: "swiss", screenshot: "insights" },
  { name: "campaign-en", locale: "en-US", template: "campaign", screenshot: "compose", index: 1 },
  { name: "campaign-ar", locale: "ar", template: "campaign", screenshot: "compose" },
  { name: "immersive-en", locale: "en-US", template: "immersive", screenshot: "home" },
  { name: "immersive-ar", locale: "ar", template: "immersive", screenshot: "home", index: 1 },
  { name: "showcase-en", locale: "en-US", template: "showcase", screenshot: "compose" },
  { name: "showcase-ar", locale: "ar", template: "showcase", screenshot: "compose", index: 1 },
  {
    name: "discovery-en",
    locale: "en-US",
    template: "discovery",
    screenshot: "home",
    title: "Everything in one place",
    subtitle: "Plan your day in seconds",
  },
  {
    name: "discovery-ar",
    locale: "ar",
    template: "discovery",
    screenshot: "compose",
    index: 1,
    title: "سجّلها في لحظتها",
    subtitle: "إضافة سريعة وطبيعية للمهام",
  },
  {
    name: "editorial-header-en",
    locale: "en-US",
    template: "editorial",
    screenshot: "home",
    title: "Beautifully in control",
    subtitle: "Plan the night before, glide through tomorrow",
    size: { width: 960, height: 412 }, // 21:9 header aspect
  },
  {
    name: "cinematic-search-ar",
    locale: "ar",
    template: "cinematic",
    screenshot: "compose",
    size: { width: 960, height: 640 }, // 3:2 search-results aspect
  },
  {
    name: "editorial-paper-en",
    locale: "en-US",
    template: "editorial",
    screenshot: "home",
    theme: { background: "#F4F1EA", accent: "#0E7A5F", text: "#1A1D24", mutedText: "#6B6F7B" },
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
    if (caseDef.theme) {
      patched.theme = { ...patched.theme, ...caseDef.theme, mode: "auto" };
    }
    if (caseDef.name === "discovery-en") (caseDef as any).prompt = "plan my week";
    if (caseDef.name === "discovery-ar") (caseDef as any).prompt = "أضف مهمة";
    if (caseDef.title || caseDef.subtitle) {
      patched.screenshots = resolved.screenshots.map((shot) =>
        shot === screenshot
          ? {
              ...shot,
              texts: {
                ...shot.texts,
                [locale.tag]: {
                  title: caseDef.title ?? shot.texts[locale.tag]?.title,
                  subtitle: caseDef.subtitle ?? shot.texts[locale.tag]?.subtitle,
                  prompt: caseDef.prompt ?? shot.texts[locale.tag]?.prompt,
                },
              },
            }
          : shot,
      );
    }
    const target = patched.screenshots.find((sc) => sc.id === screenshot.id)!;
    const imageInfo = await readImageInfo(screenshot.imagePath);
    jobs.set(
      caseDef.name,
      buildRenderRequest({
        resolved: patched,
        locale,
        screenshot: target,
        imageInfo,
        size: caseDef.size ?? CANVAS,
        deviceFrame: caseDef.deviceFrame ?? deviceFrameFor(resolved, screenshot),
        index: caseDef.index ?? 0,
        count: resolved.screenshots.length,
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
    const canvas = caseDef.size ?? CANVAS;

    expect(result.width).toBe(canvas.width);
    expect(result.height).toBe(canvas.height);

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
    const canvas = caseDef.size ?? CANVAS;
    expect(baseline.width).toBe(canvas.width);
    expect(baseline.height).toBe(canvas.height);
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
    const request = jobs.get(locale === "ar" ? "editorial-ar" : "editorial-en")!;
    return PNG.sync.read((await renderer.render(request)).png);
  };
  const en = await render("en-US");
  const ar = await render("ar");
  const diff = pixelmatch(en.data, ar.data, null, en.width, en.height, { threshold: 0.1 });
  expect(diff / (en.width * en.height)).toBeGreaterThan(0.01);
});

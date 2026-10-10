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
const baselinesDir = path.join(repoRoot, "tests", "visual", "baselines");
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
  /** Theme override for light/dark coverage. */
  theme?: Record<string, string>;
  /** Marketing prompt override for the search-layer cases. */
  prompt?: string;
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
    screenshot: "focus",
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
  {
    // Cinematic 3D variation A — angled hero, framed device, grounded shadow.
    name: "c3d-en-a",
    locale: "en-US",
    template: "cinematic-3d",
    screenshot: "home",
    deviceFrame: true,
  },
  {
    // Cinematic 3D variation B — two-device depth stack, Arabic composition.
    name: "c3d-ar-b",
    locale: "ar",
    template: "cinematic-3d",
    screenshot: "insights",
    deviceFrame: true,
    index: 1,
  },
  {
    // Cinematic 3D landscape — asymmetric crop, shaft, floor pool.
    name: "c3d-landscape-en",
    locale: "en-US",
    template: "cinematic-3d",
    screenshot: "home",
    deviceFrame: true,
    size: { width: 960, height: 412 }, // 21:9 header aspect
  },
  {
    // RTL landscape system: short Arabic headline on a 21:9 header.
    name: "ar-land-header-short",
    locale: "ar",
    template: "editorial",
    screenshot: "home",
    title: "يومك تحت سيطرتك، بأناقة",
    subtitle: "خطّط الليلة، وانطلق غدًا بثقة.",
    size: { width: 960, height: 412 },
  },
  {
    // RTL landscape system: long Arabic headline on a 21:9 header.
    name: "ar-land-header-long",
    locale: "ar",
    template: "editorial",
    screenshot: "home",
    title: "كل ما تحتاجه لتخطيط يومك بالكامل وتنظيم مهامك المهمة بدون مجهود",
    subtitle: "رؤى أسبوعية واضحة، وتنبيهات ذكية تلازم إيقاع حياتك اليومي.",
    size: { width: 960, height: 412 },
  },
  {
    // RTL landscape system: long Arabic headline on a 3:2 search creative.
    name: "ar-land-search-long",
    locale: "ar",
    template: "cinematic",
    screenshot: "compose",
    title: "كل ما تحتاجه لتخطيط يومك بالكامل وتنظيم مهامك المهمة بدون مجهود",
    subtitle: "رؤى أسبوعية واضحة، وتنبيهات ذكية تلازم إيقاع حياتك اليومي.",
    size: { width: 960, height: 640 },
  },
  {
    // RTL landscape system: short Arabic headline on a 16:9 universal header.
    name: "ar-land-universal-short",
    locale: "ar",
    template: "cinematic-3d",
    screenshot: "home",
    deviceFrame: true,
    title: "يومك تحت سيطرتك، بأناقة",
    subtitle: "خطّط الليلة، وانطلق غدًا بثقة.",
    size: { width: 960, height: 540 },
  },
  {
    // RTL landscape system: long Arabic headline on a Play feature graphic.
    name: "ar-land-feature-graphic-long",
    locale: "ar",
    template: "campaign",
    screenshot: "compose",
    title: "كل ما تحتاجه لتخطيط يومك بالكامل وتنظيم مهامك المهمة بدون مجهود",
    subtitle: "رؤى أسبوعية واضحة، وتنبيهات ذكية تلازم إيقاع حياتك اليومي.",
    size: { width: 1024, height: 500 },
  },
  {
    // Warm Premium family: paper tones, serif display, plate margin.
    name: "atelier-en",
    locale: "en-US",
    template: "atelier",
    screenshot: "home",
    theme: { background: "#F5EFE4", accent: "#B4552D", text: "#221C14", mutedText: "#7A6F5D" },
  },
  {
    // Warm Premium family, Arabic studio-panel composition.
    name: "atelier-ar",
    locale: "ar",
    template: "atelier",
    screenshot: "compose",
    index: 1,
    theme: { background: "#F5EFE4", accent: "#B4552D", text: "#221C14", mutedText: "#7A6F5D" },
  },
  {
    // Vibrant Gradient family: structured two-tone light field.
    name: "aurora-en",
    locale: "en-US",
    template: "aurora",
    screenshot: "home",
    theme: { background: "#171233", accent: "#8B5CF6", text: "#FFFFFF", mutedText: "#B7AFC9" },
  },
  {
    // Vibrant Gradient family, constellation composition, Arabic.
    name: "aurora-ar",
    locale: "ar",
    template: "aurora",
    screenshot: "insights",
    index: 1,
    theme: { background: "#171233", accent: "#8B5CF6", text: "#FFFFFF", mutedText: "#B7AFC9" },
  },
  {
    // Minimal Product family: near-white field, plinth presentation.
    name: "linea-en",
    locale: "en-US",
    template: "linea",
    screenshot: "home",
    theme: { background: "#FAFAF8", accent: "#14161A", text: "#14161A", mutedText: "#8A8F98" },
  },
  {
    // Minimal Product family, caption composition, Arabic.
    name: "linea-ar",
    locale: "ar",
    template: "linea",
    screenshot: "focus",
    index: 1,
    theme: { background: "#FAFAF8", accent: "#14161A", text: "#14161A", mutedText: "#8A8F98" },
  },
  {
    // New families across landscape formats.
    name: "atelier-landscape-ar",
    locale: "ar",
    template: "atelier",
    screenshot: "home",
    theme: { background: "#F5EFE4", accent: "#B4552D", text: "#221C14", mutedText: "#7A6F5D" },
    size: { width: 960, height: 412 },
  },
  {
    // Regression: campaign variant B head CSS was entirely invalid (doubled
    // px units) — the headline rendered at the canvas origin, full width,
    // and Arabic glyphs touched the right edge. Long title, portrait, B.
    name: "campaign-ar-portrait-b-long",
    locale: "ar",
    template: "campaign",
    screenshot: "compose",
    index: 1,
    title: "كل ما تحتاجه لتخطيط يومك بالكامل وتنظيم مهامك المهمة بدون مجهود",
    subtitle: "رؤى أسبوعية واضحة، وتنبيهات ذكية تلازم إيقاع حياتك اليومي.",
  },
  {
    // Regression: same failure class on the landscape header.
    name: "campaign-ar-landscape-long",
    locale: "ar",
    template: "campaign",
    screenshot: "compose",
    index: 1,
    title: "كل ما تحتاجه لتخطيط يومك بالكامل وتنظيم مهامك المهمة بدون مجهود",
    subtitle: "رؤى أسبوعية واضحة، وتنبيهات ذكية تلازم إيقاع حياتك اليومي.",
    size: { width: 960, height: 412 },
  },
  {
    // English comparison for the same compositions.
    name: "campaign-en-portrait-b",
    locale: "en-US",
    template: "campaign",
    screenshot: "compose",
    index: 1,
    title: "Everything you need to plan your whole day without effort",
    subtitle: "Weekly insight and gentle reminders that follow your rhythm.",
  },
  {
    name: "aurora-landscape-en",
    locale: "en-US",
    template: "aurora",
    screenshot: "home",
    theme: { background: "#171233", accent: "#8B5CF6", text: "#FFFFFF", mutedText: "#B7AFC9" },
    size: { width: 960, height: 412 },
  },
  {
    name: "linea-landscape-en",
    locale: "en-US",
    template: "linea",
    screenshot: "home",
    theme: { background: "#FAFAF8", accent: "#14161A", text: "#14161A", mutedText: "#8A8F98" },
    size: { width: 960, height: 412 },
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
    caseDef.prompt = "plan my week";
    
    if (caseDef.name === "discovery-ar") caseDef.prompt = "أضف مهمة";
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

import { darken, lighten } from "../util/colors.js";
import { buildTokens, type DesignTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, renderDeviceGroup, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Cinematic 3D" — a product-studio scene, not a frame on a fill.
 *
 * The device is a physical object in perspective (rotateY up to 30° at a
 * portrait-lens distance, with an extruded metal side face on the near edge),
 * lit by a diagonal studio shaft, grounded by an in-frame contact shadow, and
 * set against a background with real depth: light shaft, clear mid-plane,
 * darker floor with a light pool. Three materially different compositions:
 *
 *   A — Angled hero: large editorial headline over a big perspective phone.
 *   B — Two-device showcase: a dimmed supporting screen in the far plane,
 *       the hero phone angled toward it in the foreground.
 *   C — Tonal split: an accent-tinted panel behind half the canvas; the
 *       angled phone straddles the boundary between the two tones.
 *
 * Arabic gets its own art direction inside every variant: a dedicated,
 * taller headline region with Arabic-first typography metrics (heavier
 * weight, one extra line of budget, no tracking), so the Arabic frames are
 * designed — not translated. The phone itself is never mirrored; RTL flips
 * the composition through logical properties only.
 */

const SETTINGS = [
  {
    key: "variation",
    type: "string" as const,
    default: "auto",
    values: ["auto", "a", "b", "c"],
    description: 'Composition: "auto" cycles A/B/C across the sequence, or force one.',
  },
  {
    key: "headlineScale",
    type: "number" as const,
    default: 1,
    min: 0.8,
    max: 1.25,
    description: "Headline size multiplier (0.8-1.25).",
  },
  {
    key: "deviceScale",
    type: "number" as const,
    default: 1,
    min: 0.8,
    max: 1.15,
    description: "Device size multiplier (0.8-1.15).",
  },
  {
    key: "deviceMode",
    type: "string" as const,
    default: "auto",
    values: ["auto", "bare", "front", "angled"],
    description: 'Device presentation: "auto", "bare", "front" or "angled".',
  },
] as const;

function variationOf(ctx: TemplateContext): "a" | "b" | "c" {
  const forced = stringSetting(SETTINGS, ctx.settings, "variation");
  if (forced === "a" || forced === "b" || forced === "c") return forced;
  return (["a", "b", "c"] as const)[ctx.index % 3]!;
}

/** Shared studio background: angled light shaft, clear mid-plane, lit floor pool. */
function studioScene(tokens: DesignTokens, rtl: boolean): string {
  return [
    `linear-gradient(${rtl ? 115 : 245}deg, ${tokens.accentGlow(0.2)} 0%, transparent 46%)`,
    `radial-gradient(55% 30% at ${rtl ? "72%" : "28%"} -4%, ${tokens.accentGlow(0.24)} 0%, transparent 70%)`,
    `radial-gradient(120% 55% at 50% 118%, ${darken(tokens.bg, 0.45)} 0%, transparent 60%)`,
    `linear-gradient(180deg, ${lighten(tokens.bg, 0.02)} 0%, ${tokens.bg} 46%, ${darken(tokens.bg, 0.22)} 100%)`,
  ].join(", ");
}

/**
 * Diagonal studio light shaft — a blurred wedge entering from the light corner
 * and crossing the mid-frame. Gives the diagonal between headline and device
 * real structure instead of a flat gradient void.
 */
function lightShaft(tokens: DesignTokens, rtl: boolean, w: number, h: number): string {
  return `<div class="c3-shaft" data-bleed="true" style="inset-inline-start:${px(
    -w * 0.07,
  )}; top:${px(-h * 0.16)}; width:${px(w * 0.52)}; height:${px(
    h * 1.4,
  )}; transform:rotate(${rtl ? -27 : 27}deg); background:linear-gradient(to bottom, ${tokens.accentGlow(
    0.3,
  )} 0%, ${tokens.accentGlow(0.12)} 30%, transparent 60%); filter:blur(${px(w * 0.04)}); z-index:0;"></div>`;
}

/** Floor light pool — the grounded shadow of the key light, centered on cx. */
function floorGlow(tokens: DesignTokens, w: number, h: number, y: number, cx = 0.5): string {
  return `<div class="c3-floor" style="top:${px(y)}; left:${px(w * cx - w * 0.36)}; width:${px(
    w * 0.72,
  )}; height:${px(h * 0.16)}; background: radial-gradient(ellipse at center, ${tokens.accentGlow(0.18)} 0%, transparent 68%);"></div>`;
}

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  const variation = variationOf(ctx);
  if (variation === "b") return renderTwoDevice(ctx);
  if (variation === "c") return renderTonalSplit(ctx);
  return renderAngledHero(ctx);
}

/* ------------------------------------------------------------------ A ----- */
function renderAngledHero(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "angled");

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.72 * deviceScale,
    maxHeight: h * 0.6 * deviceScale,
    ...(mode === "angled" ? { rotateY: rtl ? 30 : -30, rotateX: 4, rotateZ: rtl ? 1.5 : -1.5 } : {}),
  });

  // Arabic headline: heavier weight, an extra line of budget, slightly
  // smaller display size — Arabic letterforms carry more visual mass.
  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "overline",
    sizes: {
      kicker: w * 0.024,
      title: (rtl ? w * 0.094 : w * 0.104) * headlineScale,
      subtitle: w * 0.032,
    },
    lines: { title: 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.6,
  });

  const css = `
.c3a-root { background: ${studioScene(tokens, rtl)}; ${headlineVars(tokens, "editorial", h * 0.02, h * 0.022)} }
.c3a-glowcard {
  position: absolute;
  top: ${px(h * 0.34)};
  inset-inline-end: ${px(-w * 0.07)};
  width: ${px(w * 0.5)};
  height: ${px(w * 0.72)};
  border-radius: ${px(w * 0.12)};
  background: ${tokens.accentGlow(0.08)};
  filter: blur(${px(w * 0.025)});
  transform: rotate(8deg);
  z-index: 1;
}
.c3a-head { position: absolute; top: ${px(h * 0.08)}; inset-inline-start: ${px(w * 0.085)}; z-index: 3; max-width: ${px(
    w * 0.74,
  )}; }
/* The device is GROUNDED: its base and the contact shadow sit inside the
   canvas. An object whose floor contact is cropped below the frame floats —
   no amount of shadow below the fold can ground it. */
.c3a-device {
  position: absolute;
  bottom: ${px(h * 0.035)};
  inset-inline-end: ${px(w * 0.05)};
  z-index: 2;
}
.c3a-shadow {
  position: absolute;
  bottom: ${px(h * 0.012)};
  inset-inline-end: ${px(w * 0.07)};
  width: ${px(w * 0.58)};
  height: ${px(h * 0.042)};
  border-radius: 50%;
  background: radial-gradient(ellipse at center, ${tokens.blackShadow(0.85)} 0%, transparent 72%);
  /* Cast away from the key light: shifted and skewed toward the far side. */
  transform: translateX(${px((rtl ? -1 : 1) * w * 0.05)}) skewX(${rtl ? -22 : 22}deg) scaleX(1.2);
  filter: blur(${px(w * 0.008)});
  z-index: 1;
}
.c3a-reflect {
  position: absolute;
  top: ${px(h * 0.965)};
  inset-inline-end: ${px(w * 0.05)};
  width: ${px(device.width)};
  height: ${px(h * 0.14)};
  overflow: hidden;
  opacity: 0.16;
  filter: blur(6px) brightness(0.9);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 80%);
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 80%);
  z-index: 0;
}
.c3a-reflect img { width: ${px(device.width)}; transform: translateY(-${px(device.height * 0.86)}) scaleY(-1); }
`;

  const html = `
<div class="shot c3a-root">
  ${lightShaft(tokens, rtl, w, h)}
  <div class="c3a-glowcard" data-bleed="true"></div>
  ${floorGlow(tokens, w, h, h * 0.93, rtl ? 0.34 : 0.66)}
  <div class="c3a-head">${head}</div>
  <div class="c3a-reflect"><img src="${ctx.image.url}" alt=""></div>
  <div class="c3a-shadow"></div>
  <div class="c3a-device">${device.html}</div>
</div>`;

  return { css, html };
}

/* ------------------------------------------------------------------ B ----- */
function renderTwoDevice(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "angled");

  // One scene, two planes: the shared group primitive owns z-order and the
  // depth treatment (smaller, dimmer, softer far plane), so the secondary
  // reads as context for the hero rather than decoration.
  const group = renderDeviceGroup({
    hero: {
      image: ctx.image,
      mode,
      maxWidth: w * 0.64 * deviceScale,
      maxHeight: h * 0.6 * deviceScale,
      // Near edge faces the supporting device so the two read as one scene.
      ...(mode === "angled" ? { rotateY: rtl ? -26 : 26, rotateX: 3, rotateZ: 0 } : {}),
    },
    secondary: {
      spec: { image: ctx.image, mode: "front" },
      side: "start",
      depth: { scale: 0.78, brightness: 0.33, blurRatio: 0.004, lift: 0.5, rotate: 2 },
    },
  });

  const head = headline({
    ctx,
    tokens,
    style: "cinematic",
    kicker: "chip",
    align: "center",
    sizes: {
      kicker: w * 0.022,
      title: (rtl ? w * 0.082 : w * 0.088) * headlineScale,
      subtitle: w * 0.031,
    },
    lines: { title: rtl ? 3 : 2, subtitle: 2 },
    subtitleMaxWidth: w * 0.7,
  });

  const css = `
.c3b-root { background: ${studioScene(tokens, rtl)}; ${headlineVars(tokens, "cinematic", h * 0.018, h * 0.02)} }
.c3b-head { position: absolute; top: ${px(h * 0.075)}; left: ${px(w * 0.09)}; right: ${px(
    w * 0.09,
  )}; display: flex; flex-direction: column; align-items: center; z-index: 4; }
.c3b-hero-shadow {
  position: absolute;
  bottom: ${px(h * 0.012)};
  inset-inline-end: ${px(w * 0.08)};
  width: ${px(w * 0.5)};
  height: ${px(h * 0.04)};
  border-radius: 50%;
  background: radial-gradient(ellipse at center, ${tokens.blackShadow(0.85)} 0%, transparent 72%);
  transform: translateX(${px((rtl ? -1 : 1) * w * 0.04)}) skewX(${rtl ? -22 : 22}deg) scaleX(1.18);
  filter: blur(${px(w * 0.008)});
  z-index: 2;
}
.c3b-veil {
  position: absolute;
  inset-inline-start: 0; top: ${px(h * 0.24)}; bottom: 0; width: ${px(w * 0.6)};
  background: linear-gradient(to top, ${tokens.blackShadow(0.42)}, transparent 74%);
  z-index: 2;
}
.c3b-group {
  position: absolute;
  bottom: ${px(h * 0.03)};
  inset-inline-end: ${px(w * 0.055)};
  z-index: 3;
}
`;

  const html = `
<div class="shot c3b-root">
  ${lightShaft(tokens, rtl, w, h)}
  ${floorGlow(tokens, w, h, h * 0.78, rtl ? 0.3 : 0.7)}
  <div class="c3b-head">${head}</div>
  <div class="c3b-veil"></div>
  <div class="c3b-hero-shadow"></div>
  <div class="c3b-group" data-bleed="true">${group.html}</div>
</div>`;

  return { css, html };
}

/* ------------------------------------------------------------------ C ----- */
function renderTonalSplit(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "angled");

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.7 * deviceScale,
    maxHeight: h * 0.68 * deviceScale,
    ...(mode === "angled" ? { rotateY: rtl ? 29 : -29, rotateX: 4, rotateZ: 0 } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "overline",
    sizes: {
      kicker: w * 0.023,
      title: (rtl ? w * 0.086 : w * 0.096) * headlineScale,
      subtitle: w * 0.032,
    },
    lines: { title: rtl ? 4 : 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.38,
  });

  const css = `
.c3c-root { background: ${studioScene(tokens, rtl)}; ${headlineVars(tokens, "editorial", h * 0.018, h * 0.02)} }
.c3c-panel {
  position: absolute;
  top: 0; bottom: 0;
  inset-inline-end: 0;
  width: ${px(w * 0.54)};
  /* Deliberately lighter tone + accent pool: the panel must read as a panel,
     not a gradient falloff. */
  background:
    radial-gradient(90% 50% at 50% 100%, ${tokens.accentGlow(0.16)} 0%, transparent 70%),
    linear-gradient(180deg, ${lighten(tokens.surfaceAlt, 0.035)} 0%, ${tokens.surfaceAlt} 100%);
  border-inline-start: 2px solid ${tokens.accentGlow(0.55)};
  box-shadow: -${px(w * 0.03)} 0 ${px(w * 0.08)} ${tokens.blackShadow(0.35)};
  z-index: 1;
}
.c3c-orb {
  position: absolute;
  top: ${px(h * 0.06)};
  inset-inline-end: ${px(w * 0.12)};
  width: ${px(w * 0.3)};
  height: ${px(w * 0.3)};
  border-radius: 50%;
  background: ${tokens.accentGlow(0.14)};
  filter: blur(${px(w * 0.035)});
  z-index: 1;
}
.c3c-head {
  position: absolute;
  top: 50%;
  transform: translateY(-52%);
  inset-inline-start: ${px(w * 0.085)};
  width: ${px(w * 0.38)};
  z-index: 3;
}
.c3c-device {
  position: absolute;
  bottom: ${px(h * 0.035)};
  inset-inline-start: ${px(w * 0.28)};
  z-index: 2;
}
.c3c-shadow {
  position: absolute;
  bottom: ${px(h * 0.012)};
  inset-inline-start: ${px(w * 0.3)};
  width: ${px(w * 0.56)};
  height: ${px(h * 0.042)};
  border-radius: 50%;
  background: radial-gradient(ellipse at center, ${tokens.blackShadow(0.85)} 0%, transparent 72%);
  transform: translateX(${px((rtl ? -1 : 1) * w * 0.05)}) skewX(${rtl ? -22 : 22}deg) scaleX(1.2);
  filter: blur(${px(w * 0.008)});
  z-index: 1;
}
.c3c-rule {
  position: absolute;
  top: ${px(h * 0.12)};
  bottom: ${px(h * 0.12)};
  inset-inline-start: ${px(w * 0.235)};
  width: 1px;
  background: ${tokens.line};
  z-index: 0;
}
`;

  const html = `
<div class="shot c3c-root">
  <div class="c3c-panel"></div>
  <div class="c3c-orb" data-bleed="false"></div>
  <div class="c3c-rule"></div>
  ${floorGlow(tokens, w, h, h * 0.93, rtl ? 0.66 : 0.34)}
  <div class="c3c-head">${head}</div>
  <div class="c3c-shadow"></div>
  <div class="c3c-device">${device.html}</div>
</div>`;

  return { css, html };
}

/* ----------------------------------------------------------- landscape --- */
function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "angled");
  const isRtl = ctx.dir === "rtl";
const longTitle = isLongTitle(ctx);
const { pad, textWidth } = landscapeMetrics(w, h, { rtl: isRtl, longTitle });

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.32 * deviceScale,
    maxHeight: h * 1.18 * deviceScale,
    ...(mode === "angled" ? { rotateY: rtl ? 28 : -28, rotateX: 4, rotateZ: 0 } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: landscapeSizes(h, w, isRtl, longTitle),
    lines: landscapeLines(isRtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.c3l-root { background: ${studioScene(tokens, rtl)}; ${headlineVars(tokens, "display", h * 0.028, h * 0.032)} }
.c3l-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(
    textWidth,
  )}; z-index: 3; }
.c3l-glowcard {
  position: absolute;
  top: ${px(-h * 0.18)};
  inset-inline-end: ${px(w * 0.1)};
  width: ${px(w * 0.26)};
  height: ${px(h * 1.25)};
  border-radius: ${px(h * 0.3)};
  background: ${tokens.accentGlow(0.14)};
  filter: blur(${px(h * 0.045)});
  z-index: 1;
}
/* Asymmetric vertical crop: more bleed at the top than the bottom, so the
   base + floor pool stay visible and the crop reads as dynamic, not accidental. */
.c3l-device { position: absolute; inset-inline-end: ${px(w * 0.07)}; bottom: ${px(-h * 0.12)}; z-index: 2; }
`;

  const html = `
<div class="shot c3l-root">
  ${lightShaft(tokens, rtl, w, h)}
  <div class="c3l-glowcard" data-bleed="true"></div>
  ${floorGlow(tokens, w, h, h * 0.86, rtl ? 0.3 : 0.7)}
  <div class="c3l-head">${head}</div>
  <div class="c3l-device" data-bleed="true">${device.html}</div>
</div>`;

  return { css, html };
}

export const cinematic3dTemplate: TemplateDefinition = {
  id: "cinematic-3d",
  name: "Cinematic 3D",
  description:
    "A product-studio scene: the phone in real perspective (rotateY up to 30°, portrait-lens optics, extruded metal side face) under a diagonal light shaft, grounded by an in-frame contact shadow and a lit floor pool. Three compositions — angled hero, two-device depth stack, tonal split — each with a dedicated Arabic art direction.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

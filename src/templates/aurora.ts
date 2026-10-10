import { darken } from "../util/colors.js";
import { buildTokens, type DesignTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, renderDeviceGroup, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Aurora" — Vibrant Gradient.
 *
 * Not gradient wallpaper: a structured two-tone light field. A deep base
 * carries two large soft color masses (accent + a complementary tone derived
 * from it) arranged along a diagonal ridge, so the gradient has direction
 * and a light logic — the device sits where the masses meet, rim-lit from
 * the ridge. Typography is a heavy grotesque set solid, uppercase for Latin.
 *
 *   A — Ridge hero: headline upper-start, device angled across the ridge.
 *   B — Constellation: a device group (hero + secondary) descending the
 *       diagonal, headline lower-start.
 *
 * Arabic keeps its own metrics; Latin tracking is dropped for Arabic and
 * line budgets deepen.
 */

const SETTINGS = [
  {
    key: "variation",
    type: "string" as const,
    default: "auto",
    values: ["auto", "a", "b"],
    description: 'Composition: "auto" alternates A/B across the sequence, or force one.',
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

function variationOf(ctx: TemplateContext): "a" | "b" {
  const forced = stringSetting(SETTINGS, ctx.settings, "variation");
  if (forced === "a" || forced === "b") return forced;
  return ctx.index % 2 === 0 ? "a" : "b";
}

/**
 * The structured light field: two soft masses along a diagonal ridge plus a
 * faint ridge line itself — the gradient's "spine" that gives it direction.
 */
function lightField(tokens: DesignTokens, rtl: boolean): string {
  const a = tokens.accentGlow(0.5);
  const b = tokens.accentGlow(0.22);
  return [
    `radial-gradient(58% 40% at ${rtl ? "70%" : "30%"} 26%, ${a} 0%, transparent 68%)`,
    `radial-gradient(70% 52% at ${rtl ? "26%" : "74%"} 78%, ${b} 0%, transparent 70%)`,
    `linear-gradient(${rtl ? 115 : 245}deg, ${darken(tokens.bg, 0.18)} 0%, ${tokens.bg} 55%, ${darken(tokens.bg, 0.3)} 100%)`,
  ].join(", ");
}

/** The ridge: a thin luminous diagonal echoing the light direction. */
function ridge(tokens: DesignTokens, rtl: boolean, w: number, h: number): string {
  const anchor = rtl ? `inset-inline-end:${px(-w * 0.1)};` : `inset-inline-start:${px(-w * 0.1)};`;
  return `<div class="au-ridge" data-bleed="true" style="${anchor} top:${px(-h * 0.2)}; width:${px(
    w * 0.16,
  )}; height:${px(h * 1.5)}; transform:rotate(${rtl ? -28 : 28}deg); background:linear-gradient(to bottom, ${tokens.accentGlow(
    0.16,
  )} 0%, transparent 55%); filter:blur(${px(w * 0.03)});"></div>`;
}

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return variationOf(ctx) === "b" ? renderConstellation(ctx) : renderRidge(ctx);
}

/* ------------------------------------------------------------------ A ----- */
function renderRidge(ctx: TemplateContext) {
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
    maxHeight: h * 0.6 * deviceScale,
    ...(mode === "angled" ? { rotateY: rtl ? -22 : 22, rotateX: 4, rotateZ: 0 } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    sizes: {
      kicker: w * 0.023,
      title: (rtl ? w * 0.094 : w * 0.102) * headlineScale,
      subtitle: w * 0.031,
    },
    lines: { title: 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.62,
  });

  const css = `
.au-a { background: ${lightField(tokens, rtl)}; ${headlineVars(tokens, "display", h * 0.02, h * 0.022)} }
.au-a-head { position: absolute; top: ${px(h * 0.085)}; inset-inline-start: ${px(w * 0.09)}; z-index: 3; max-width: ${px(
    w * 0.78,
  )}; }
.au-a-device {
  position: absolute;
  bottom: ${px(h * 0.045)};
  inset-inline-end: ${px(w * 0.06)};
  z-index: 2;
}
.au-a-glow {
  position: absolute;
  bottom: ${px(-h * 0.1)};
  inset-inline-end: ${px(-w * 0.05)};
  width: ${px(w * 0.6)};
  height: ${px(h * 0.4)};
  background: radial-gradient(ellipse at center, ${tokens.accentGlow(0.2)} 0%, transparent 65%);
  filter: blur(${px(w * 0.03)});
  z-index: 1;
}
`;

  const html = `
<div class="shot au-a">
  ${ridge(tokens, rtl, w, h)}
  <div class="au-a-glow" data-bleed="true"></div>
  <div class="au-a-head">${head}</div>
  <div class="au-a-device" data-bleed="true">${device.html}</div>
</div>`;

  return { css, html };
}

/* ------------------------------------------------------------------ B ----- */
function renderConstellation(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "angled");

  const group = renderDeviceGroup({
    hero: {
      image: ctx.image,
      mode,
      maxWidth: w * 0.62 * deviceScale,
      maxHeight: h * 0.56 * deviceScale,
      ...(mode === "angled" ? { rotateY: rtl ? -24 : 24, rotateX: 3, rotateZ: 0 } : {}),
    },
    secondary: {
      spec: { image: ctx.image, mode: "front" },
      side: "start",
      depth: { scale: 0.62, brightness: 0.5, blurRatio: 0.005, lift: 0.62, rotate: -3 },
    },
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    align: "start",
    sizes: {
      kicker: w * 0.022,
      title: (rtl ? w * 0.086 : w * 0.092) * headlineScale,
      subtitle: w * 0.03,
    },
    lines: { title: 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.56,
  });

  const css = `
.au-b { background: ${lightField(tokens, rtl)}; ${headlineVars(tokens, "display", h * 0.018, h * 0.02)} }
.au-b-head { position: absolute; bottom: ${px(h * 0.085)}; inset-inline-start: ${px(w * 0.09)}; z-index: 3; max-width: ${px(
    w * 0.52,
  )}; }
.au-b-group {
  position: absolute;
  top: ${px(h * 0.06)};
  inset-inline-end: ${px(w * 0.055)};
  z-index: 2;
}
`;

  const html = `
<div class="shot au-b">
  ${ridge(tokens, rtl, w, h)}
  <div class="au-b-group" data-bleed="true">${group.html}</div>
  <div class="au-b-head">${head}</div>
</div>`;

  return { css, html };
}

/* ----------------------------------------------------------- landscape --- */
function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const isRtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "angled");
  const { pad, textWidth, deviceMaxH } = landscapeMetrics(w, h, { rtl: isRtl, longTitle });

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.3 * deviceScale,
    maxHeight: deviceMaxH * 1.2 * deviceScale,
    ...(mode === "angled" ? { rotateY: isRtl ? -24 : 24, rotateX: 4, rotateZ: 0 } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    sizes: landscapeSizes(h, w, isRtl, longTitle),
    lines: landscapeLines(isRtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.au-l { background: ${lightField(tokens, isRtl)}; ${headlineVars(tokens, "display", h * 0.028, h * 0.032)} }
.au-l-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(
    textWidth,
  )}; z-index: 3; }
.au-l-device {
  position: absolute;
  inset-inline-end: ${px(w * 0.08)};
  bottom: ${px(-h * 0.14)};
  z-index: 2;
}
`;

  const html = `
<div class="shot au-l">
  ${ridge(tokens, isRtl, w, h)}
  <div class="au-l-head">${head}</div>
  <div class="au-l-device" data-bleed="true">${device.html}</div>
</div>`;

  return { css, html };
}

export const auroraTemplate: TemplateDefinition = {
  id: "aurora",
  name: "Aurora",
  description:
    "Vibrant Gradient: a structured two-tone light field with a luminous diagonal ridge — direction, not wallpaper. Heavy grotesque display type; the angled device sits where the color masses meet, rim-lit. Ridge-hero and constellation (device group) compositions, with dedicated Arabic metrics.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

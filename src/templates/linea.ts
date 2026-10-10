import { buildTokens, type DesignTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Linea" — Minimal Product.
 *
 * Restraint as the art direction: a near-white field, one hairline
 * structure line, a small tracked-in kicker, a medium-weight headline that
 * never shouts, and one perfectly presented device with a flat, honest
 * shadow. Whitespace is the composition. Two compositions:
 *
 *   A — Gallery: tiny kicker + headline top-start, device presented
 *       center-right like an object on a plinth, one rule underneath.
 *   B — Caption: two-thirds whitespace; the headline sits low like a
 *       museum caption beside the device.
 *
 * Arabic gets its own metrics and never inherits Latin tracking/uppercase.
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

/** The plinth shadow: flat, small, honest — no glow, no blur theatrics. */
function plinth(tokens: DesignTokens, w: number, cx: number, y: number): string {
  return `<div class="ln-shadow" style="left:${px(w * cx - w * 0.26)}; top:${px(
    y,
  )}; width:${px(w * 0.52)}; height:${px(w * 0.02)}; background: ${tokens.blackShadow(
    0.14,
  )}; border-radius: 50%;"></div>`;
}

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return variationOf(ctx) === "b" ? renderCaption(ctx) : renderGallery(ctx);
}

/* ------------------------------------------------------------------ A ----- */
function renderGallery(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.58 * deviceScale,
    maxHeight: h * 0.56 * deviceScale,
    glare: false,
  });

  const head = headline({
    ctx,
    tokens,
    style: "swiss",
    kicker: "overline",
    sizes: {
      kicker: w * 0.02,
      title: (rtl ? w * 0.078 : w * 0.084) * headlineScale,
      subtitle: w * 0.028,
    },
    lines: { title: 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.6,
  });

  const css = `
.ln-a { background: ${tokens.bg}; ${headlineVars(tokens, "swiss", h * 0.016, h * 0.018)} }
.ln-a-head { position: absolute; top: ${px(h * 0.1)}; inset-inline-start: ${px(w * 0.11)}; z-index: 3; max-width: ${px(
    w * 0.7,
  )}; }
.ln-a-device {
  position: absolute;
  bottom: ${px(h * 0.16)};
  left: 55%;
  transform: translateX(-50%);
  z-index: 2;
}
/* The single structural line: under the object, like a plinth edge. */
.ln-a-rule {
  position: absolute;
  inset-inline: ${px(w * 0.14)};
  bottom: ${px(h * 0.125)};
  height: 1px;
  background: ${tokens.line};
  z-index: 1;
}
`;

  const html = `
<div class="shot ln-a">
  <div class="ln-a-head">${head}</div>
  ${plinth(tokens, w, 0.55, h * 0.845)}
  <div class="ln-a-rule"></div>
  <div class="ln-a-device">${device.html}</div>
</div>`;

  return { css, html };
}

/* ------------------------------------------------------------------ B ----- */
function renderCaption(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.6 * deviceScale,
    maxHeight: h * 0.62 * deviceScale,
    glare: false,
  });

  const head = headline({
    ctx,
    tokens,
    style: "swiss",
    kicker: "none",
    sizes: {
      kicker: w * 0.02,
      title: (rtl ? w * 0.07 : w * 0.075) * headlineScale,
      subtitle: w * 0.027,
    },
    lines: { title: 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.38,
  });

  const css = `
.ln-b { background: ${tokens.bg}; ${headlineVars(tokens, "swiss", h * 0.016, h * 0.018)} }
.ln-b-device {
  position: absolute;
  top: ${px(h * 0.085)};
  inset-inline-end: ${px(w * 0.1)};
  z-index: 2;
}
.ln-b-head {
  position: absolute;
  bottom: ${px(h * 0.11)};
  inset-inline-start: ${px(w * 0.11)};
  width: ${px(w * 0.4)};
  z-index: 3;
}
/* Museum caption detail: a short rule above the headline block. */
.ln-b-rule {
  position: absolute;
  bottom: ${px(h * 0.335)};
  inset-inline-start: ${px(w * 0.11)};
  width: ${px(w * 0.12)};
  height: 2px;
  background: ${tokens.accent};
  z-index: 3;
}
`;

  const html = `
<div class="shot ln-b">
  <div class="ln-b-device">${device.html}</div>
  ${plinth(tokens, w, 0.68, h * 0.735)}
  <div class="ln-b-rule"></div>
  <div class="ln-b-head">${head}</div>
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
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const { pad, textWidth, deviceMaxH } = landscapeMetrics(w, h, { rtl: isRtl, longTitle });

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.26 * deviceScale,
    maxHeight: deviceMaxH * 1.14 * deviceScale,
    glare: false,
  });

  const head = headline({
    ctx,
    tokens,
    style: "swiss",
    kicker: "overline",
    sizes: landscapeSizes(h, w, isRtl, longTitle),
    lines: landscapeLines(isRtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth * 0.85,
  });

  const css = `
.ln-l { background: ${tokens.bg}; ${headlineVars(tokens, "swiss", h * 0.028, h * 0.032)} }
.ln-l-head {
  position: absolute;
  inset-inline-start: ${px(pad)};
  bottom: ${px(pad)};
  width: ${px(textWidth)};
  z-index: 3;
}
/* Baseline rule the headline sits on — the whole landscape structure. */
.ln-l-rule {
  position: absolute;
  inset-inline-start: ${px(pad)};
  bottom: ${px(pad * 2.9)};
  width: ${px(textWidth)};
  height: 1px;
  background: ${tokens.line};
  z-index: 3;
}
.ln-l-device {
  position: absolute;
  inset-inline-end: ${px(w * 0.1)};
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}
`;

  const html = `
<div class="shot ln-l">
  <div class="ln-l-rule"></div>
  <div class="ln-l-head">${head}</div>
  <div class="ln-l-device">${device.html}</div>
</div>`;

  return { css, html };
}

export const lineaTemplate: TemplateDefinition = {
  id: "linea",
  name: "Linea",
  description:
    "Minimal Product: a near-white field, one hairline structure line, tracked kicker and a medium-weight headline that never shouts. The device is presented like an object on a plinth with a flat, honest shadow. Gallery and museum-caption compositions, with dedicated Arabic metrics.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

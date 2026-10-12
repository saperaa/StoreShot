import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { fieldBackground, layer, ringLayer, rotatedBounds } from "../design/composition.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Tilt" — the angled-device poster.
 *
 * One bold display headline at the reading edge and the device spun in 2D
 * and bleeding off the far corner — the energetic store-listing staple.
 * An accent ring sits behind the device and crops with it, so the frame
 * reads as a designed object, not a screenshot in a frame. Variation B
 * mirrors the composition to the opposite corner. RTL layouts mirror the
 * device side automatically through logical properties.
 *
 * Composition layers (z-order is explicit):
 *   0 background field · 1 accent ring · 2 device · 3 headline
 */

const SETTINGS = [
  {
    key: "variation",
    type: "string" as const,
    default: "auto",
    values: ["auto", "a", "b"],
    description: 'Composition: "auto" alternates corners across the sequence, or force one.',
  },
  {
    key: "tilt",
    type: "number" as const,
    default: 13,
    min: 4,
    max: 22,
    description: "Device rotation in degrees (4-22).",
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

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return renderPortrait(ctx);
}

function renderPortrait(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);
  const flip = variationOf(ctx) === "b";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const tilt = numberSetting(SETTINGS, ctx.settings, "tilt");
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.6 * deviceScale,
    maxHeight: h * 0.56 * deviceScale,
  });

  // The device leans into the far corner: variant A occupies the inline-end
  // side tilted counter-clockwise, B mirrors it. The rotation sign follows
  // the reading direction so mirrored compositions stay symmetric.
  const deg = (flip ? 1 : -1) * (rtl ? -1 : 1) * tilt;
  const bounds = rotatedBounds(device.width, device.height, deg);
  // Physical device side: variant A occupies the inline-end edge, B the
  // inline-start — in RTL those logical edges swap physical sides.
  const cxFrac = flip === rtl ? 0.7 : 0.3;
  const cx = w * cxFrac;
  const cy = h * 0.74;
  const deviceLayer = layer(device.html, {
    insetInlineEnd: flip ? undefined : w - cx - device.width / 2,
    insetInlineStart: flip ? cx - device.width / 2 : undefined,
    top: cy - device.height / 2,
    rotate: deg,
    z: 2,
    // Bleed only the far corner: the bounds checker verifies the rest.
    bleed: bounds.width / 2 > Math.min(cx, w - cx) || bounds.height / 2 > h - cy,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: {
      kicker: w * 0.021,
      title: w * 0.104 * (rtl ? 0.86 : 1) * (longTitle ? 0.85 : 1),
      subtitle: w * 0.029,
    },
    lines: { title: rtl ? (longTitle ? 5 : 4) : longTitle ? 4 : 3, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.74,
  });

  const ring = ringLayer({
    cx,
    cy,
    diameter: w * 0.78,
    stroke: Math.max(6, w * 0.024),
    color: tokens.accentGlow(0.5),
    z: 1,
    bleed: true,
  });

  const css = `
.tl { background: ${fieldBackground(tokens, "beam", flip ? 205 : 155, { x: `${Math.round(cxFrac * 100)}%`, y: "78%" })}; ${headlineVars(tokens, "display", h * 0.02, h * 0.022)} }
.tl-head { position: absolute; top: ${px(h * 0.085)}; inset-inline-start: ${px(w * 0.085)}; inset-inline-end: ${px(w * 0.085)}; z-index: 3; }
.tl-underline { width: ${px(w * 0.18)}; height: ${px(Math.max(7, h * 0.006))}; border-radius: 999px; background: ${tokens.accent}; margin-block-start: ${px(h * 0.03)}; }
`;

  const html = `
<div class="shot tl">
  ${ring}
  ${deviceLayer}
  <div class="tl-head">${head}<div class="tl-underline"></div></div>
</div>`;

  return { css, html };
}

function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);
  const flip = variationOf(ctx) === "b";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const tilt = numberSetting(SETTINGS, ctx.settings, "tilt");
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );
  const { pad, textWidth, deviceMaxH } = landscapeMetrics(w, h, { rtl, longTitle });

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.34 * deviceScale,
    maxHeight: deviceMaxH * 1.1 * deviceScale,
  });

  const deg = (flip ? 1 : -1) * (rtl ? -1 : 1) * Math.min(tilt, 15);
  const bounds = rotatedBounds(device.width, device.height, deg);
  const cxFrac = flip === rtl ? 0.7 : 0.3;
  const cx = w * cxFrac;
  const cy = h * 0.56;
  const deviceLayer = layer(device.html, {
    insetInlineEnd: flip ? undefined : w - cx - device.width / 2,
    insetInlineStart: flip ? cx - device.width / 2 : undefined,
    top: cy - device.height / 2,
    rotate: deg,
    z: 2,
    bleed:
      bounds.width / 2 > Math.min(cx, w - cx) || bounds.height / 2 > Math.min(cy, h - cy) * 1.15,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: landscapeSizes(h, w, rtl, longTitle),
    lines: landscapeLines(rtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const ring = ringLayer({
    cx,
    cy,
    diameter: deviceMaxH * 0.86,
    stroke: Math.max(6, h * 0.045),
    color: tokens.accentGlow(0.45),
    z: 1,
    bleed: true,
  });

  const css = `
.tl.landscape { background: ${fieldBackground(tokens, "beam", flip ? 155 : 25, { x: `${Math.round(cxFrac * 100)}%`, y: "56%" })}; ${headlineVars(tokens, "display", h * 0.05, h * 0.05)} }
.tl-l-head { position: absolute; inset-inline-start: ${px(flip ? w - pad - textWidth : pad)}; top: 50%; transform: translateY(-50%); width: ${px(textWidth)}; z-index: 3; }
.tl-l-head .hl { ${flip ? "align-items: flex-end; text-align: end;" : ""} }
.tl-l-underline { width: ${px(Math.min(w * 0.14, textWidth * 0.4))}; height: ${px(Math.max(6, h * 0.014))}; border-radius: 999px; background: ${tokens.accent}; margin-block-start: ${px(h * 0.05)}; }
`;

  const html = `
<div class="shot tl landscape">
  ${ring}
  ${deviceLayer}
  <div class="tl-l-head">${head}<div class="tl-l-underline"></div></div>
</div>`;

  return { css, html };
}

export const tiltTemplate: TemplateDefinition = {
  id: "tilt",
  name: "Tilted Poster",
  description:
    "The angled-device poster: an oversized display headline at the reading edge, the device spun in 2D and bleeding off the far corner over a cropped accent ring. Two mirrored compositions alternate across the sequence; landscape headers get a dedicated split layout.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

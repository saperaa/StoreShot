import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { decorLayer, fieldBackground, layer, ringLayer } from "../design/composition.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Strata" — a layered showcase.
 *
 * Depth sandwich, from back to front: a strong directional background, a
 * rotated slab bleeding off the canvas, a cropped accent ring, the device
 * (angled by default), floating decor when supplied, and finally the
 * headline panel whose raised card overlaps the device's lower edge — so
 * foreground, mid-ground and background are unambiguous. Variant B flips
 * the slab's rotation. With no decor the scene still reads in five layers.
 *
 * Layers: 0 slab · 1 ring · 2 device · 3 front decor · 4 headline panel
 */

const SETTINGS = [
  {
    key: "variation",
    type: "string" as const,
    default: "auto",
    values: ["auto", "a", "b"],
    description: 'Composition: "auto" alternates the slab angle across the sequence, or force one.',
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

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return renderPortrait(ctx);
}

/** Up to two decor accents floating at the top corners (front depth). */
function topDecor(ctx: TemplateContext, landscape: boolean): string {
  if (ctx.decor.length === 0) return "";
  const { width: w, height: h } = ctx.canvas;
  const spots = landscape
    ? [
        { x: 0.52, y: 0.16, s: 0.07, r: -8 },
        { x: 0.94, y: 0.2, s: 0.055, r: 10 },
      ]
    : [
        { x: 0.13, y: 0.16, s: 0.13, r: -8 },
        { x: 0.87, y: 0.13, s: 0.11, r: 10 },
      ];
  return ctx.decor
    .slice(0, 2)
    .map((item, i) => {
      const spot = spots[(i + ctx.index) % spots.length]!;
      const iw = spot.s * w;
      const ih = (iw * item.height) / item.width;
      return decorLayer(item, {
        left: spot.x * w - iw / 2,
        top: spot.y * h - ih / 2,
        width: iw,
        rotate: spot.r * (ctx.dir === "rtl" ? -1 : 1),
        z: 3,
      });
    })
    .join("");
}

function renderPortrait(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);
  const flip = ctx.index % 2 === 1;
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "angled",
  );

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.6 * deviceScale,
    maxHeight: h * 0.5 * deviceScale,
    ...(mode === "angled" ? { rotateY: rtl ? 9 : -9, rotateZ: flip ? 2 : -2 } : {}),
  });

  // The slab tilts against the device; B mirrors both for a related poster.
  const slabDeg = flip ? 7 : -7;
  const slab = layer(
    `<div style="width:${px(w * 1.25)}; height:${px(h * 0.44)}; border-radius:${px(w * 0.05)};` +
      ` background: linear-gradient(160deg, ${tokens.surface} 0%, ${tokens.surfaceAlt} 100%);"></div>`,
    { left: w * 0.5 - w * 0.625, top: h * 0.42 - h * 0.22, rotate: slabDeg, z: 0, bleed: true },
  );

  const ring = ringLayer({
    cx: w * 0.86,
    cy: h * 0.14,
    diameter: w * 0.5,
    stroke: Math.max(6, w * 0.02),
    color: tokens.accentGlow(0.5),
    z: 1,
    bleed: true,
  });

  const deviceLayer = layer(device.html, {
    left: w * 0.5 - device.width / 2,
    top: h * 0.4 - device.height / 2,
    z: 2,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    sizes: {
      kicker: w * 0.02,
      title: w * 0.076 * (rtl ? 0.88 : 1) * (longTitle ? 0.85 : 1),
      subtitle: w * 0.027,
    },
    lines: { title: rtl ? (longTitle ? 4 : 3) : longTitle ? 3 : 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.76,
  });

  const css = `
.st { background: ${fieldBackground(tokens, "beam", flip ? 200 : 160)}; ${headlineVars(tokens, "display", h * 0.016, h * 0.018)} }
.st-panel {
  position: absolute;
  inset-inline: ${px(w * 0.07)};
  top: ${px(h * 0.68)};
  padding: ${px(h * 0.032)} ${px(w * 0.07)} ${px(h * 0.04)};
  border-radius: ${px(w * 0.045)};
  background: ${tokens.surface};
  border: 1px solid ${tokens.lineSoft};
  box-shadow: ${tokens.shadowLg};
  z-index: 4;
}
`;

  const html = `
<div class="shot st">
  ${slab}
  ${ring}
  ${deviceLayer}
  ${topDecor(ctx, false)}
  <div class="st-panel">${head}</div>
</div>`;

  return { css, html };
}

function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);
  const flip = ctx.index % 2 === 1;
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "angled",
  );
  const { pad, textWidth, deviceMaxH } = landscapeMetrics(w, h, { rtl, longTitle });

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.34 * deviceScale,
    maxHeight: deviceMaxH * 1.06 * deviceScale,
    ...(mode === "angled" ? { rotateY: rtl ? 9 : -9, rotateZ: flip ? 2 : -2 } : {}),
  });

  const slabDeg = flip ? 6 : -6;
  const slab = layer(
    `<div style="width:${px(w * 0.5)}; height:${px(h * 1.5)}; border-radius:${px(h * 0.12)};` +
      ` background: linear-gradient(160deg, ${tokens.surface} 0%, ${tokens.surfaceAlt} 100%);"></div>`,
    { insetInlineEnd: -w * 0.06, top: h * 0.5 - h * 0.75, rotate: slabDeg, z: 0, bleed: true },
  );

  const cx = w * 0.72;
  const deviceLayer = layer(device.html, {
    insetInlineEnd: w - cx - device.width / 2,
    top: h * 0.52 - device.height / 2,
    z: 2,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    sizes: landscapeSizes(h, w, rtl, longTitle),
    lines: landscapeLines(rtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.st.landscape { background: ${fieldBackground(tokens, "beam", flip ? 160 : 20)}; ${headlineVars(tokens, "display", h * 0.05, h * 0.05)} }
.st-l-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-50%); width: ${px(textWidth)}; z-index: 4; }
.st-l-panel { padding: ${px(h * 0.06)} ${px(w * 0.028)}; border-radius: ${px(h * 0.09)}; background: ${tokens.surface}; border: 1px solid ${tokens.lineSoft}; box-shadow: ${tokens.shadowLg}; }
`;

  const html = `
<div class="shot st landscape">
  ${slab}
  ${deviceLayer}
  ${topDecor(ctx, true)}
  <div class="st-l-head"><div class="st-l-panel">${head}</div></div>
</div>`;

  return { css, html };
}

export const strataTemplate: TemplateDefinition = {
  id: "strata",
  name: "Layered Strata",
  description:
    "A layered showcase with unambiguous depth: directional background, a rotated slab bleeding off the canvas, a cropped accent ring, the angled device, optional front-depth decor, and a raised headline card overlapping the device's lower edge. Slab angle alternates across the sequence.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

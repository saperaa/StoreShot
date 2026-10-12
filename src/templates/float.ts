import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { decorLayer, fieldBackground, layer, ringLayer } from "../design/composition.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Float" — the floating-product composition.
 *
 * The device hangs center stage while optional decorative assets (transparent
 * PNG/WebP supplied as `decor` in the config) orbit it at alternating depths —
 * some behind, some in front, each slightly rotated. Products, badges and
 * brand marks float; nothing is required: without decor the same slots hold
 * quiet geometric rings in the accent color, so the template never looks
 * empty.
 *
 * Layers: 0 background · 1 back-depth decor · 2 device · 3 front decor · 4 headline
 */

const SETTINGS = [
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

interface Slot {
  /** Center position as a fraction of the canvas. */
  x: number;
  y: number;
  /** Item width as a fraction of canvas width. */
  s: number;
  /** Depth: behind the device (1) or in front of it (3). */
  z: 1 | 3;
  /** Rotation in degrees. */
  r: number;
}

// Six orbital slots; the sequence index rotates which slot each asset takes,
// so consecutive frames keep the identity but rearrange the constellation.
const PORTRAIT_SLOTS: readonly Slot[] = [
  { x: 0.15, y: 0.32, s: 0.17, z: 3, r: -8 },
  { x: 0.85, y: 0.3, s: 0.13, z: 3, r: 10 },
  { x: 0.12, y: 0.58, s: 0.11, z: 1, r: 14 },
  { x: 0.88, y: 0.6, s: 0.16, z: 1, r: -12 },
  { x: 0.24, y: 0.82, s: 0.1, z: 3, r: 6 },
  { x: 0.78, y: 0.84, s: 0.12, z: 1, r: -6 },
];

const LANDSCAPE_SLOTS: readonly Slot[] = [
  { x: 0.5, y: 0.18, s: 0.075, z: 3, r: -8 },
  { x: 0.82, y: 0.22, s: 0.065, z: 3, r: 10 },
  { x: 0.54, y: 0.8, s: 0.06, z: 1, r: 14 },
  { x: 0.9, y: 0.66, s: 0.08, z: 1, r: -12 },
  { x: 0.66, y: 0.42, s: 0.05, z: 3, r: 6 },
  { x: 0.96, y: 0.44, s: 0.055, z: 1, r: -6 },
];

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return renderPortrait(ctx);
}

/** Decor in slots, or geometric rings in the same slots when unconfigured. */
function floatingItems(
  ctx: TemplateContext,
  tokens: ReturnType<typeof buildTokens>,
  slots: readonly Slot[],
): string {
  const { width: w, height: h } = ctx.canvas;
  const offset = ctx.index % slots.length;
  const parts: string[] = [];

  if (ctx.decor.length > 0) {
    for (const [i, item] of ctx.decor.entries()) {
      const slot = slots[(i + offset) % slots.length]!;
      const iw = slot.s * w;
      const ih = (iw * item.height) / item.width;
      parts.push(
        decorLayer(item, {
          left: slot.x * w - iw / 2,
          top: slot.y * h - ih / 2,
          width: iw,
          rotate: slot.r * (ctx.dir === "rtl" ? -1 : 1),
          z: slot.z,
          className: slot.z === 1 ? "flt-back" : "",
        }),
      );
    }
    return parts.join("");
  }

  // No assets: the same constellation, quietly geometric.
  for (const i of [0, 1, 3]) {
    const slot = slots[(i + offset) % slots.length]!;
    parts.push(
      ringLayer({
        cx: slot.x * w,
        cy: slot.y * h,
        diameter: slot.s * w * 1.15,
        stroke: Math.max(4, w * 0.008),
        color: tokens.accentGlow(0.4),
        z: slot.z,
        fill: i === 3,
      }),
    );
  }
  return parts.join("");
}

function renderPortrait(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.52 * deviceScale,
    maxHeight: h * 0.52 * deviceScale,
  });
  const deviceLayer = layer(device.html, {
    left: w * 0.5 - device.width / 2,
    top: h * 0.62 - device.height / 2,
    z: 2,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    align: "center",
    sizes: {
      kicker: w * 0.02,
      title: w * 0.088 * (rtl ? 0.86 : 1) * (longTitle ? 0.85 : 1),
      subtitle: w * 0.028,
    },
    lines: { title: rtl ? (longTitle ? 4 : 3) : longTitle ? 3 : 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.78,
  });

  const css = `
.flt { background: ${fieldBackground(tokens, "wash")}; ${headlineVars(tokens, "display", h * 0.018, h * 0.02)} }
.flt-head { position: absolute; top: ${px(h * 0.075)}; inset-inline: ${px(w * 0.08)}; z-index: 4; }
.flt-back .deco-img { filter: brightness(0.9); }
`;

  const html = `
<div class="shot flt">
  ${floatingItems(ctx, tokens, PORTRAIT_SLOTS)}
  ${deviceLayer}
  <div class="flt-head">${head}</div>
</div>`;

  return { css, html };
}

function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );
  const { pad, textWidth, deviceMaxH } = landscapeMetrics(w, h, { rtl, longTitle });

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.3 * deviceScale,
    maxHeight: deviceMaxH * deviceScale,
  });
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
.flt.landscape { background: ${fieldBackground(tokens, "wash", 25)}; ${headlineVars(tokens, "display", h * 0.05, h * 0.05)} }
.flt-l-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-50%); width: ${px(textWidth)}; z-index: 4; }
.flt-back .deco-img { filter: brightness(0.9); }
`;

  const html = `
<div class="shot flt landscape">
  ${floatingItems(ctx, tokens, LANDSCAPE_SLOTS)}
  ${deviceLayer}
  <div class="flt-l-head">${head}</div>
</div>`;

  return { css, html };
}

export const floatTemplate: TemplateDefinition = {
  id: "float",
  name: "Floating Product",
  description:
    "A floating-product scene: the device hangs center stage while optional transparent PNG/WebP decor orbits at alternating depths — in front, behind, rotated. Without decor the same slots hold quiet accent rings, so the composition never looks empty. Portrait and landscape layouts included.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

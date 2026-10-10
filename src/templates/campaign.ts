import { withAlpha } from "../util/colors.js";
import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { escapeHtml } from "../util/escapeHtml.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Campaign" — a launch poster.
 *
 * Poster-scale typography, a solid brand tag, and one bold diagonal brand
 * band the angled device breaks through. The band and tilt flip with the
 * sequence position, so consecutive frames feel like a series of posters,
 * not copies of one.
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
    key: "band",
    type: "boolean" as const,
    default: true,
    description: "Show the diagonal brand band behind the device.",
  },
  {
    key: "deviceMode",
    type: "string" as const,
    default: "auto",
    values: ["auto", "bare", "front", "angled"],
    description: 'Device presentation: "auto" (follows deviceFrame), "bare", "front" or "angled".',
  },
] as const;

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return renderPortrait(ctx);
}

function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const band = ctx.settings["band"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "angled",
  );
  const flip = ctx.index % 2 === 1;
  const isRtl = ctx.dir === "rtl";
const longTitle = isLongTitle(ctx);
const { pad, textWidth } = landscapeMetrics(w, h, { rtl: isRtl, longTitle });

  const tilt = flip ? 9 : -11;
  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.36 * deviceScale,
    maxHeight: h * 1.28 * deviceScale,
    ...(mode === "angled" ? { rotateY: tilt, rotateZ: flip ? 3 : -4 } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "campaign",
    kicker: "chip",
    sizes: landscapeSizes(h, w, isRtl, longTitle),
    lines: landscapeLines(isRtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.shot-campaign.landscape {
  background: linear-gradient(90deg, ${tokens.bg} 0%, ${tokens.surfaceAlt} 130%);
  ${headlineVars(tokens, "campaign", h * 0.032, h * 0.032)}
}
.cpl-device { position: absolute; inset-inline-end: ${px(w * 0.1)}; bottom: ${px(-h * 0.24)}; z-index: 2; display: flex; justify-content: center; }
.cpl-band {
  position: absolute;
  top: ${px(-h * 0.15)};
  inset-inline-end: ${px(w * 0.14)};
  width: ${px(w * 0.4)};
  height: ${px(h * 1.55)};
  background: ${tokens.accent};
  transform: rotate(${flip ? 9 : -9}deg);
  z-index: 0;
}
.cpl-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(textWidth)}; z-index: 3; }
.cpl-underline { width: ${px(w * 0.09)}; height: ${px(Math.max(8, h * 0.012))}; border-radius: 999px; background: ${tokens.accent}; margin-block-start: ${px(h * 0.05)}; }

.cpl-chip-solid {
  display: inline-flex; align-items: center; gap: 0.6em;
  background: ${tokens.accent}; color: ${tokens.onAccent};
  font-weight: 700; border-radius: 999px; padding: 0.6em 1.4em;
}
`;

  const headHtml = head.replace('class="hl-chip"', 'class="hl-chip cpl-chip-solid"');

  const html = `
<div class="shot shot-campaign landscape">
  ${band ? '<div class="cpl-band"></div>' : ""}
  <div class="cpl-head">${headHtml}<div class="cpl-underline"></div></div>
  <div class="cpl-device" data-bleed="true">${device.html}</div>
</div>`;

  return { css, html };
}

function renderPortrait(ctx: TemplateContext) {
  if (ctx.index % 2 === 1) return renderPortraitB(ctx);
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const band = ctx.settings["band"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "angled",
  );
  const flip = ctx.index % 2 === 1;
  // Arabic-first + content-aware: Arabic titles get their own optical scale
  // and a deeper line budget so real marketing copy fits without shrinking.
  const rtl = ctx.dir === "rtl";
  const longTitle = isLongTitle(ctx);

  const tilt = flip ? 9 : -11;
  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.58 * deviceScale,
    maxHeight: h * 0.52 * deviceScale,
    ...(mode === "angled" ? { rotateY: tilt, rotateZ: flip ? 3 : -4 } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "campaign",
    kicker: "chip",
    sizes: {
      kicker: w * 0.022,
      title: w * 0.092 * (rtl ? 0.86 : 1) * (longTitle ? 0.85 : 1),
      subtitle: w * 0.028,
    },
    lines: { title: rtl ? (longTitle ? 5 : 4) : longTitle ? 4 : 3, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.7,
  });

  const bandAngle = flip ? 12 : -12;

  const css = `
.shot-campaign {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, ${tokens.bg} 0%, ${tokens.surfaceAlt} 130%);
  ${headlineVars(tokens, "campaign", h * 0.02, h * 0.02)}
}
.cp-band {
  position: absolute;
  top: ${px(h * 0.5)};
  left: ${px(-w * 0.3)};
  width: ${px(w * 1.6)};
  height: ${px(h * 0.19)};
  background: ${tokens.accent};
  transform: rotate(${bandAngle}deg);
  z-index: 0;
}
.cp-band2 {
  position: absolute;
  top: ${px(h * 0.5)};
  left: ${px(-w * 0.3)};
  width: ${px(w * 1.6)};
  height: ${px(h * 0.028)};
  background: ${withAlpha(tokens.text, 0.22)};
  transform: rotate(${bandAngle}deg) translateY(${px(-h * 0.035)});
  z-index: 0;
}
.cp-head { position: absolute; top: ${px(h * 0.1)}; inset-inline-start: ${px(w * 0.09)}; inset-inline-end: ${px(w * 0.09)}; z-index: 3; }
.cp-underline {
  width: ${px(w * 0.2)};
  height: ${px(Math.max(8, h * 0.006))};
  border-radius: ${px(Math.max(4, h * 0.003))};
  background: ${tokens.accent};
  margin-block-start: ${px(h * 0.028)};
}
.cp-device {
  position: absolute;
  bottom: ${px(h * 0.07)};
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  justify-content: center;
}
.cp-chip-solid {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  background: ${tokens.accent};
  color: ${tokens.onAccent};
  font-weight: 700;
  border-radius: 999px;
  padding: 0.6em 1.4em;
}
`;

  // The campaign chip replaces the outlined headline chip: solid brand tag.
  const headHtml = head.replace('class="hl-chip"', 'class="hl-chip cp-chip-solid"');

  const html = `
<div class="shot shot-campaign">
  ${band ? '<div class="cp-band"></div><div class="cp-band2"></div>' : ""}
  <div class="cp-head">
    ${headHtml}
    <div class="cp-underline"></div>
  </div>
  <div class="cp-device">${device.html}</div>
</div>`;

  return { css, html };
}

function renderPortraitB(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
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
    maxWidth: w * 0.62 * deviceScale,
    maxHeight: h * 0.56 * deviceScale,
    ...(mode === "angled" ? { rotateY: -12, rotateZ: -3 } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "campaign",
    kicker: "chip",
    sizes: {
      kicker: w * 0.022,
      title: w * 0.092 * (ctx.dir === "rtl" ? 0.86 : 1) * (isLongTitle(ctx) ? 0.85 : 1),
      subtitle: w * 0.027,
    },
    lines: { title: ctx.dir === "rtl" ? (isLongTitle(ctx) ? 5 : 4) : isLongTitle(ctx) ? 4 : 3, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.7,
  });

  const css = [
    ".shot-campaign.b {",
    "  background: linear-gradient(180deg, " + tokens.bg + " 0%, " + tokens.surfaceAlt + " 140%);",
    "  " + headlineVars(tokens, "campaign", h * 0.02, h * 0.02),
    "}",
    ".cpb-giantword {",
    "  position: absolute;",
    "  top: " + px(h * 0.31) + ";",
    "  left: 50%;",
    "  transform: translateX(-50%);",
    "  font-family: var(--font-sans);",
    "  font-weight: 700;",
    "  font-size: " + px(w * 0.3) + ";",
    "  line-height: 0.95;",
    "  letter-spacing: -0.02em;",
    "  color: " + tokens.text + ";",
    "  opacity: 0.07;",
    "  white-space: nowrap;",
    "  z-index: 0;",
    "}",
    ".cpb-head { position: absolute; top: " +
      px(h * 0.085) + "; inset-inline-start: " +
      px(w * 0.09) + "; inset-inline-end: " +
      px(w * 0.09) + "; z-index: 3; }",
    ".cpb-device { position: absolute; bottom: " +
      px(-h * 0.08) + "; left: 50%; transform: translateX(-50%); z-index: 2; display: flex; justify-content: center; }",
    ".cpb-underline { width: " +
      px(w * 0.2) + "; height: " +
      px(Math.max(8, h * 0.006)) + "; border-radius: 999px; background: " +
      tokens.accent +
      "; margin-block-start: " +
      px(h * 0.028) + "; }",
    ".cpb-chip-solid { display: inline-flex; align-items: center; gap: 0.6em; background: " +
      tokens.accent +
      "; color: " +
      tokens.onAccent +
      "; font-weight: 700; border-radius: 999px; padding: 0.6em 1.4em; }",
  ].join("\n");

  const headHtml = head.replace('class="hl-chip"', 'class="hl-chip cpb-chip-solid"');

  const html = [
    '<div class="shot shot-campaign b">',
    '  <div class="cpb-giantword" data-bleed="true">' + escapeHtml(ctx.app.name) + "</div>",
    '  <div class="cpb-head">' + headHtml + '<div class="cpb-underline"></div></div>',
    '  <div class="cpb-device" data-bleed="true">' + device.html + "</div>",
    "</div>",
  ].join("\n");

  return { css, html };
}

export const campaignTemplate: TemplateDefinition = {
  id: "campaign",
  name: "Bold Brand Campaign",
  description:
    "Launch-poster energy: the largest headline in the library, a solid brand tag, and an angled device breaking through a diagonal brand band that flips across the sequence.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

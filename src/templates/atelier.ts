import { darken, lighten } from "../util/colors.js";
import { buildTokens, type DesignTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Atelier" — Warm Premium.
 *
 * A studio-craft art direction: warm paper tones, ink typography, a serif
 * display voice (Fraunces), hairline rules and folio details borrowed from
 * fine print. The device rests on the paper with a warm ambient shadow —
 * no glows, no neon. Two compositions:
 *
 *   A — Paper sheet: headline over the fold, device grounded below it with
 *       a warm contact shadow and a thin frame margin drawn like a plate.
 *   B — Studio panel: a deep umber panel occupies the lower third; the
 *       device rises out of it, headline in the warm zone above.
 *
 * Arabic keeps its own metrics (heavier weight, deeper line budget) and the
 * folio/overline vocabulary uses Arabic-safe styling (no letter-spacing).
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

/** Warm paper: layered cream with a soft vignette toward the fold. */
function paper(tokens: DesignTokens, rtl: boolean): string {
  return [
    `radial-gradient(120% 70% at 50% -18%, ${lighten(tokens.bg, 0.05)} 0%, transparent 60%)`,
    `radial-gradient(90% 50% at ${rtl ? "78%" : "22%"} 108%, ${darken(tokens.bg, 0.06)} 0%, transparent 62%)`,
    `linear-gradient(180deg, ${tokens.bg} 0%, ${lighten(tokens.bg, 0.02)} 58%, ${darken(tokens.bg, 0.03)} 100%)`,
  ].join(", ");
}

/** Warm ambient contact shadow — soft, wide, low opacity. */
function warmShadow(tokens: DesignTokens, w: number, h: number, cx: number, y: number): string {
  return `<div class="at-shadow" style="left:${px(w * cx - w * 0.3)}; top:${px(y)}; width:${px(
    w * 0.6,
  )}; height:${px(h * 0.035)}; background: radial-gradient(ellipse at center, ${tokens.blackShadow(
    0.32,
  )} 0%, transparent 70%); filter: blur(${px(w * 0.01)});"></div>`;
}

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return variationOf(ctx) === "b" ? renderPanel(ctx) : renderSheet(ctx);
}

/* ------------------------------------------------------------------ A ----- */
function renderSheet(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.68 * deviceScale,
    maxHeight: h * 0.56 * deviceScale,
    glare: false,
  });

  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "overline",
    sizes: {
      kicker: w * 0.023,
      title: (rtl ? w * 0.09 : w * 0.098) * headlineScale,
      subtitle: w * 0.031,
    },
    lines: { title: 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.62,
  });

  const css = `
.at-a { background: ${paper(tokens, rtl)}; ${headlineVars(tokens, "editorial", h * 0.018, h * 0.02)} }
.at-a-head { position: absolute; top: ${px(h * 0.09)}; inset-inline-start: ${px(w * 0.1)}; z-index: 3; max-width: ${px(w * 0.8)}; }
/* The plate margin: a hairline rectangle drawn around the device zone,
   like a printed plate boundary. */
.at-a-plate {
  position: absolute;
  top: ${px(h * 0.315)};
  bottom: ${px(h * 0.075)};
  inset-inline-start: ${px(w * 0.12)};
  width: ${px(w * 0.76)};
  border: 1px solid ${tokens.line};
  border-radius: ${px(w * 0.02)};
  z-index: 1;
}
.at-a-device {
  position: absolute;
  bottom: ${px(h * 0.105)};
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}
.at-a-folio {
  position: absolute;
  bottom: ${px(h * 0.028)};
  inset-inline-start: ${px(w * 0.12)};
  font-size: ${px(Math.max(14, w * 0.02))};
  color: ${tokens.muted};
  z-index: 3;
}
[dir="ltr"] .at-a-folio { letter-spacing: 0.14em; text-transform: uppercase; }
`;

  const html = `
<div class="shot at-a">
  <div class="at-a-head">${head}</div>
  <div class="at-a-plate"></div>
  ${warmShadow(tokens, w, h, 0.5, h * 0.87)}
  <div class="at-a-device">${device.html}</div>
  <div class="at-a-folio">${escapeCopy(ctx, tokens)} · ${String(ctx.index + 1).padStart(2, "0")}</div>
</div>`;

  return { css, html };
}

/* ------------------------------------------------------------------ B ----- */
function renderPanel(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const rtl = ctx.dir === "rtl";
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.66 * deviceScale,
    maxHeight: h * 0.6 * deviceScale,
    glare: false,
  });

  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "chip",
    sizes: {
      kicker: w * 0.022,
      title: (rtl ? w * 0.088 : w * 0.094) * headlineScale,
      subtitle: w * 0.03,
    },
    lines: { title: 3, subtitle: 2 },
    subtitleMaxWidth: w * 0.66,
  });

  const css = `
.at-b { background: ${paper(tokens, rtl)}; ${headlineVars(tokens, "editorial", h * 0.018, h * 0.02)} }
.at-b-panel {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: ${px(h * 0.34)};
  background: linear-gradient(180deg, ${darken(tokens.bg, 0.34)} 0%, ${darken(tokens.bg, 0.42)} 100%);
  z-index: 1;
}
.at-b-rule {
  position: absolute;
  inset-inline: ${px(w * 0.1)};
  bottom: ${px(h * 0.34)};
  height: 1px;
  background: ${tokens.line};
  z-index: 2;
}
.at-b-head { position: absolute; top: ${px(h * 0.1)}; inset-inline-start: ${px(w * 0.1)}; z-index: 3; max-width: ${px(w * 0.8)}; }
.at-b-device {
  position: absolute;
  bottom: ${px(h * 0.16)};
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}
`;

  const html = `
<div class="shot at-b">
  <div class="at-b-head">${head}</div>
  <div class="at-b-rule"></div>
  <div class="at-b-panel"></div>
  ${warmShadow(tokens, w, h, 0.5, h * 0.83)}
  <div class="at-b-device">${device.html}</div>
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
    maxWidth: w * 0.3 * deviceScale,
    maxHeight: deviceMaxH * 1.16 * deviceScale,
    glare: false,
  });

  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "overline",
    sizes: landscapeSizes(h, w, isRtl, longTitle),
    lines: landscapeLines(isRtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.at-l { background: ${paper(tokens, isRtl)}; ${headlineVars(tokens, "editorial", h * 0.028, h * 0.032)} }
.at-l-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(
    textWidth,
  )}; z-index: 3; }
.at-l-rule {
  position: absolute;
  inset-inline-start: ${px(pad)};
  top: ${px(pad * 0.55)};
  width: ${px(textWidth)};
  height: 1px;
  background: ${tokens.line};
  z-index: 3;
}
.at-l-device {
  position: absolute;
  inset-inline-end: ${px(w * 0.09)};
  bottom: ${px(-h * 0.16)};
  z-index: 2;
}
`;

  const html = `
<div class="shot at-l">
  <div class="at-l-rule"></div>
  <div class="at-l-head">${head}</div>
  <div class="at-l-device" data-bleed="true">${device.html}</div>
</div>`;

  return { css, html };
}

/** Folio line: app name, locale-safe (no uppercasing for Arabic). */
function escapeCopy(ctx: TemplateContext, _tokens: DesignTokens): string {
  const name = ctx.app.name ?? "";
  return name.replace(/[<>&"]/g, "");
}

export const atelierTemplate: TemplateDefinition = {
  id: "atelier",
  name: "Atelier",
  description:
    "Warm Premium: cream paper, ink serif typography, hairline plate margins and folio details, the device resting on the paper with warm ambient shadows. Two compositions — paper sheet and studio panel — with dedicated Arabic metrics.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

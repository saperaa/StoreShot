import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars, masthead, mastheadVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { escapeHtml } from "../util/escapeHtml.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Editorial" — a print-magazine opening page.
 *
 * Masthead with folio, a ghost page numeral behind a serif headline set in
 * the display face, and the device crossing a hairline "fold". The numeral
 * and the device anchor alternate with sequence position, so a five-image
 * campaign reads like consecutive pages instead of one repeated cover.
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
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const { pad, textWidth } = landscapeMetrics(w, h);

  // Banner crop: the device bleeds off the bottom edge so a portrait phone
  // fills the right zone instead of floating small in the middle.
  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.34 * deviceScale,
    maxHeight: h * 1.22 * deviceScale,
  });

  const sizes = landscapeSizes(h, w);
  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "overline",
    sizes,
    lines: { title: 3, subtitle: 3 },
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const folio = String(ctx.index + 1).padStart(2, "0");

  const css = `
.shot-editorial.landscape {
  background:
    radial-gradient(50% 110% at 72% 55%, ${tokens.mode === "dark" ? tokens.accentGlow(0.05) : "rgba(255,255,255,0.55)"} 0%, transparent 70%),
    linear-gradient(${tokens.bg} 60%, ${tokens.surfaceAlt} 160%),
    ${tokens.bg};
  ${headlineVars(tokens, "editorial", h * 0.032, h * 0.036)}
  ${mastheadVars(tokens)}
}
.edl-numeral {
  position: absolute;
  bottom: ${px(-h * 0.1)};
  inset-inline-end: ${px(w * 0.3)};
  font-family: var(--font-display);
  font-weight: 600;
  font-size: ${px(h * 0.92)};
  line-height: 1;
  color: ${tokens.surfaceAlt};
  z-index: 0;
}
.edl-masthead { position: absolute; top: ${px(pad * 0.55)}; inset-inline-start: ${px(pad)}; width: calc(100% - ${px(pad * 2)}); z-index: 3; }
.edl-rule { position: absolute; top: ${px(pad * 1.4)}; inset-inline-start: ${px(pad)}; width: calc(100% - ${px(pad * 2)}); height: 1px; background: ${tokens.line}; z-index: 3; }
.edl-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(textWidth)}; z-index: 3; }
.edl-columnrule { position: absolute; top: ${px(pad * 1.7)}; bottom: ${px(pad * 0.9)}; inset-inline-start: ${px(w * 0.52)}; width: 1px; background: ${tokens.lineSoft}; z-index: 1; }
.edl-device {
  position: absolute;
  inset-inline-end: ${px(w * 0.085)};
  bottom: ${px(-h * 0.22)};
  z-index: 2;
}
.edl-caption { position: absolute; bottom: ${px(pad * 0.5)}; inset-inline-start: ${px(pad)}; font-size: ${px(Math.max(18, h * 0.024))}; color: ${tokens.muted}; letter-spacing: 0.08em; z-index: 3; }
[dir="ltr"] .edl-caption { text-transform: uppercase; }
`;

  const html = `
<div class="shot shot-editorial landscape">
  <div class="edl-numeral">${folio}</div>
  <div class="edl-masthead">${masthead(ctx, tokens, h * 0.03)}</div>
  <div class="edl-rule"></div>
  <div class="edl-head">${head}</div>
  <div class="edl-columnrule"></div>
  <div class="edl-device">${device.html}</div>
  <div class="edl-caption">FIG. ${folio} — ${escapeHtml((ctx.role ?? ctx.app.name).toUpperCase())}</div>
</div>`;

  return { css, html };
}

function renderPortrait(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const alternate = ctx.index % 2 === 1;

  const margin = w * 0.075;

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.6 * deviceScale,
    maxHeight: h * 0.47 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "overline",
    sizes: { kicker: w * 0.024, title: w * 0.092, subtitle: w * 0.0295 },
    lines: { title: 3, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.62,
  });

  const folio = ctx.index + 1;

  const css = `
.shot-editorial {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 60% at 50% 0%, ${tokens.mode === "dark" ? tokens.accentGlow(0.035) : "rgba(255,255,255,0.5)"} 0%, transparent 60%),
    ${tokens.bg};
  ${headlineVars(tokens, "editorial", h * 0.02, h * 0.022)}
  ${mastheadVars(tokens)}
}
.ed-frame { position: absolute; inset: 0; }
.ed-numeral {
  position: absolute;
  top: ${px(-h * 0.028)};
  inset-inline-end: ${px(margin * 0.4)};
  font-family: var(--font-display);
  font-weight: 600;
  font-size: ${px(w * 0.30)};
  line-height: 1;
  color: ${tokens.surfaceAlt};
  z-index: 0;
  font-variant-numeric: tabular-nums;
}
.ed-head { position: absolute; top: ${px(h * 0.175)}; inset-inline-start: ${px(margin)}; z-index: 2; max-width: ${px(w * 0.78)}; }
.ed-fold {
  position: absolute;
  top: ${px(h * 0.405)};
  inset-inline-start: ${px(margin)};
  width: calc(100% - ${px(margin * 2)});
  height: 1px;
  background: ${tokens.line};
  z-index: 1;
}
.ed-device {
  position: absolute;
  bottom: ${px(h * 0.075)};
  z-index: 2;
  ${alternate ? `inset-inline-end: ${px(margin)};` : `inset-inline-start: ${px(margin)};`}
}
.ed-caption {
  position: absolute;
  bottom: ${px(h * 0.028)};
  inset-inline-start: ${px(margin)};
  font-size: ${px(w * 0.019)};
  color: ${tokens.muted};
  letter-spacing: 0.08em;
  z-index: 2;
}
[dir="ltr"] .ed-caption { text-transform: uppercase; }
.ed-masthead { position: absolute; top: ${px(h * 0.072)}; inset-inline-start: ${px(margin)}; width: calc(100% - ${px(margin * 2)}); z-index: 2; }
.ed-masthead-rule { position: absolute; top: ${px(h * 0.115)}; inset-inline-start: ${px(margin)}; width: calc(100% - ${px(margin * 2)}); height: 1px; background: ${tokens.line}; z-index: 2; }
`;

  const html = `
<div class="shot shot-editorial">
  <div class="ed-frame">
    <div class="ed-numeral">${String(folio).padStart(2, "0")}</div>
    <div class="ed-masthead">${masthead(ctx, tokens, w * 0.022)}</div>
    <div class="ed-masthead-rule"></div>
    <div class="ed-head">${head}</div>
    <div class="ed-fold"></div>
    <div class="ed-device">${device.html}</div>
    <div class="ed-caption">${captionFor(ctx)}</div>
  </div>
</div>`;

  return { css, html };
}

function captionFor(ctx: TemplateContext): string {
  const label = escapeHtml((ctx.role ?? ctx.app.name).toUpperCase());
  return `FIG. ${String(ctx.index + 1).padStart(2, "0")} — ${label}`;
}

export const editorialTemplate: TemplateDefinition = {
  id: "editorial",
  name: "Editorial Premium",
  description:
    "Magazine art direction: masthead and folio, a serif display headline over a ghost page numeral, and the device crossing a hairline fold. Alternates its layout page by page across the sequence.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

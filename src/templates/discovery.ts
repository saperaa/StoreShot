import { darken, lighten } from "../util/colors.js";
import { buildTokens, type DesignTokens } from "../design/tokens.js";
import { escapeHtml } from "../util/escapeHtml.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Discovery" — Apple-inspired product-page art direction, redesigned around
 * the rendered result: the marketing message is the largest element on the
 * canvas, the device is big enough to read real UI, and every zone connects
 * to its neighbor. One dominant device per composition — a second layer only
 * exists where it earns its place.
 *
 * Three genuinely different compositions, cycled deterministically across the
 * sequence (or forced with the "variation" setting):
 *
 *   A — Typography-led: an oversized start-aligned headline with the device
 *       rising into the type band from the inline-end, overlapping it.
 *   B — Product-led: a centered axis — overline, strong headline, the search
 *       layer as a bridge, and the largest device, cropped by the floor.
 *   C — Editorial split: a measured text column with a rail, the screenshot
 *       presented frameless on a shelf in a tonal panel.
 *
 * The interface-inspired search layer is a MARKETING element rendered outside
 * the app screenshot, only when the config provides a localized prompt.
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
    key: "ghostType",
    type: "boolean" as const,
    default: true,
    description: "Show the oversized app-name backdrop typography.",
  },
  {
    key: "deviceMode",
    type: "string" as const,
    default: "auto",
    values: ["auto", "bare", "front", "angled"],
    description: 'Device presentation: "auto" (follows deviceFrame), "bare", "front" or "angled".',
  },
] as const;

function variationOf(ctx: TemplateContext): "a" | "b" | "c" {
  const forced = stringSetting(SETTINGS, ctx.settings, "variation");
  if (forced === "a" || forced === "b" || forced === "c") return forced;
  return (["a", "b", "c"] as const)[ctx.index % 3]!;
}

/** Marketing-only search layer. Rendered OUTSIDE the app screenshot; only when a prompt exists. */
function searchLayer(
  ctx: TemplateContext,
  tokens: DesignTokens,
  size: number,
  className = "dc-search",
): string {
  const prompt = ctx.texts.prompt;
  if (prompt === undefined || prompt.length === 0) return "";
  return `<div class="${className}" data-field="prompt" data-max-height="${Math.round(size * 2.2)}">
  <span class="dc-search-icon"></span>
  <span class="dc-search-text">${escapeHtml(prompt)}</span>
  <span class="dc-search-kbd">${escapeHtml(ctx.app.name)}</span>
</div>`;
}

function searchCss(tokens: DesignTokens, size: number): string {
  return `
.dc-search {
  display: inline-flex;
  align-items: center;
  gap: 0.65em;
  width: 100%;
  height: ${px(size * 1.5)};
  padding-inline: ${px(size * 0.95)};
  border-radius: 999px;
  background: ${tokens.mode === "dark" ? "rgba(255,255,255,0.07)" : "#FFFFFF"};
  border: 1px solid ${tokens.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.12)"};
  box-shadow: 0 ${px(size * 0.3)}px ${px(size * 0.9)}px ${tokens.blackShadow(tokens.mode === "dark" ? 0.4 : 0.12)};
  font-size: ${px(size)};
  color: ${tokens.text};
}
.dc-search-icon {
  width: 1em; height: 1em; border: ${Math.max(3, size * 0.08)}px solid ${tokens.muted};
  border-radius: 50%; position: relative; flex: none;
}
.dc-search-icon::after {
  content: ""; position: absolute; width: 0.45em; height: ${Math.max(3, size * 0.08)}px;
  background: ${tokens.muted}; border-radius: 999px;
  transform: rotate(45deg); translate: 0.75em 0.7em;
}
.dc-search-text { font-weight: 500; opacity: 0.95; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dc-search-kbd {
  margin-inline-start: auto; flex: none;
  font-size: 0.74em; font-weight: 600; color: ${tokens.muted};
  border: 1px solid ${tokens.line}; border-radius: 0.5em; padding: 0.32em 0.7em;
}
`;
}

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  const variation = variationOf(ctx);
  if (variation === "b") return renderProductLed(ctx);
  if (variation === "c") return renderEditorialSplit(ctx);
  return renderTypographyLed(ctx);
}

/* ------------------------------------------------------------------ A ----- */
function renderTypographyLed(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const ghostType = ctx.settings["ghostType"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );
  const pad = Math.round(w * 0.085);

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.56 * deviceScale,
    maxHeight: h * 0.55 * deviceScale,
  });

  // Content-aware typographic scale: concise copy gets the full display
  // size; longer headlines step down one deliberate notch with a fourth
  // line of room. Budgets stay enforced — nothing shrinks silently.
  const longTitle = (ctx.texts.title ?? "").length > 24;
  const titleSize = longTitle ? w * 0.104 : w * 0.128;
  const titleLines = longTitle ? 4 : 3;

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: { kicker: w * 0.026, title: titleSize, subtitle: w * 0.038 },
    lines: { title: titleLines, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.68,
  });

  const css = `
.shot-discovery.a {
  background:
    linear-gradient(185deg, ${lighten(tokens.bg, 0.02)} 0%, ${tokens.bg} 42%, ${darken(tokens.bg, 0.16)} 100%);
  ${headlineVars(tokens, "display", h * 0.02, h * 0.022)}
}
.dca-ghost {
  position: absolute;
  top: ${px(h * 0.315)};
  inset-inline-start: ${px(-w * 0.03)};
  font-family: var(--font-display);
  font-weight: 700;
  font-size: ${px(w * 0.3)};
  line-height: 0.95;
  color: ${tokens.text};
  opacity: 0.055;
  white-space: nowrap;
  z-index: 0;
  max-width: 110%;
  overflow: hidden;
}
.dca-search { position: absolute; top: ${px(h * 0.088)}; inset-inline-start: ${px(pad)}; width: ${px(w * 0.56)}; z-index: 4; }
.dca-head { position: absolute; top: ${px(h * 0.175)}; inset-inline-start: ${px(pad)}; z-index: 3; max-width: ${px(w * 0.72)}; }
.dca-accentblock {
  position: absolute;
  top: ${px(h * 0.4)};
  inset-inline-end: ${px(-w * 0.06)};
  width: ${px(w * 0.46)};
  height: ${px(w * 0.46)};
  border-radius: ${px(w * 0.1)};
  background: ${tokens.accentGlow(0.13)};
  transform: rotate(10deg);
  z-index: 1;
}
.dca-device {
  position: absolute;
  bottom: ${px(-h * 0.115)};
  inset-inline-end: ${px(w * 0.055)};
  z-index: 2;
}
.dca-floor { position: absolute; bottom: 0; left: 0; right: 0; height: ${px(h * 0.2)}; background: linear-gradient(to top, ${tokens.blackShadow(0.34)}, transparent); z-index: 1; }
${searchCss(tokens, w * 0.03)}
`;

  const html = `
<div class="shot shot-discovery a">
  ${ghostType ? `<div class="dca-ghost" data-bleed="true">${escapeHtml(ctx.app.name)}</div>` : ""}
  <div class="dca-search">${searchLayer(ctx, tokens, w * 0.03)}</div>
  <div class="dca-head">${head}</div>
  <div class="dca-accentblock" data-bleed="true"></div>
  <div class="dca-device" data-bleed="true">${device.html}</div>
  <div class="dca-floor"></div>
</div>`;

  return { css, html };
}

/* ------------------------------------------------------------------ B ----- */
function renderProductLed(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
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
    maxWidth: w * 0.62 * deviceScale,
    maxHeight: h * 0.52 * deviceScale,
  });

  const longTitle = (ctx.texts.title ?? "").length > 24;
  const head = headline({
    ctx,
    tokens,
    style: "cinematic",
    kicker: "masthead",
    align: "center",
    sizes: { kicker: w * 0.026, title: longTitle ? w * 0.078 : w * 0.094, subtitle: w * 0.036 },
    lines: { title: longTitle ? 4 : 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.74,
  });

  const css = `
.shot-discovery.b {
  background:
    radial-gradient(85% 34% at 50% 88%, ${tokens.accentGlow(0.16)} 0%, transparent 62%),
    linear-gradient(180deg, ${lighten(tokens.bg, 0.03)} 0%, ${tokens.bg} 40%, ${darken(tokens.bg, 0.2)} 100%);
  ${headlineVars(tokens, "cinematic", h * 0.017, h * 0.019)}
}
.dcb-head { position: absolute; top: ${px(h * 0.085)}; left: ${px(w * 0.09)}; right: ${px(w * 0.09)}; display: flex; flex-direction: column; align-items: center; z-index: 3; }
.dcb-search { position: absolute; top: ${px(h * 0.4)}; left: 50%; transform: translateX(-50%); width: ${px(w * 0.62)}; z-index: 3; }
.dcb-device { position: absolute; bottom: ${px(-h * 0.1)}; left: 50%; transform: translateX(-50%); z-index: 2; }
.dcb-floor { position: absolute; bottom: 0; left: 0; right: 0; height: ${px(h * 0.24)}; background: linear-gradient(to top, ${tokens.blackShadow(0.4)}, transparent); z-index: 1; }
.dcb-hairline { position: absolute; top: ${px(h * 0.375)}; left: ${px(w * 0.16)}; right: ${px(w * 0.16)}; height: 1px; background: ${tokens.lineSoft}; z-index: 1; }
${searchCss(tokens, w * 0.031)}
`;

  const html = `
<div class="shot shot-discovery b">
  <div class="dcb-head">${head}</div>
  <div class="dcb-hairline"></div>
  <div class="dcb-search">${searchLayer(ctx, tokens, w * 0.031)}</div>
  <div class="dcb-device" data-bleed="true">${device.html}</div>
  <div class="dcb-floor"></div>
</div>`;

  return { css, html };
}

/* ------------------------------------------------------------------ C ----- */
function renderEditorialSplit(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "bare",
  );
  const pad = Math.round(w * 0.08);
  const split = Math.round(w * 0.47);

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.4 * deviceScale,
    maxHeight: h * 0.58 * deviceScale,
  });

  const longTitle = (ctx.texts.title ?? "").length > 24;
  const head = headline({
    ctx,
    tokens,
    style: "editorial",
    kicker: "overline",
    sizes: { kicker: w * 0.024, title: longTitle ? w * 0.072 : w * 0.088, subtitle: w * 0.032 },
    lines: { title: 5, subtitle: 3 },
    scale: headlineScale,
    subtitleMaxWidth: split - pad - Math.round(w * 0.02),
  });

  const css = `
.shot-discovery.c {
  background: ${tokens.bg};
  ${headlineVars(tokens, "editorial", h * 0.018, h * 0.02)}
}
.dcc-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-end: 0;
  width: ${px(w - split)};
  background: ${tokens.surface};
  border-inline-start: 1px solid ${tokens.line};
  z-index: 0;
}
.dcc-rail { position: absolute; top: ${px(pad * 0.7)}; bottom: ${px(pad * 0.7)}; inset-inline-start: ${px(split)}; width: 1px; background: ${tokens.line}; z-index: 2; }
.dcc-column {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  inset-inline-start: ${px(pad)};
  width: ${px(split - pad - w * 0.035)};
  z-index: 3;
  display: flex;
  flex-direction: column;
}
.dcc-column .dcc-search { margin-block-start: ${px(h * 0.045)}; }
.dcc-tick { width: ${px(w * 0.03)}; height: ${px(w * 0.03)}; background: ${tokens.accent}; border-radius: ${px(w * 0.008)}; margin-block-end: ${px(h * 0.028)}; }
.dcc-stage {
  position: absolute;
  inset-inline-end: 0;
  top: 0; bottom: 0;
  width: ${px(w - split)};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.dcc-device { position: relative; top: ${px(-h * 0.015)}; filter: drop-shadow(0 ${px(w * 0.03)}px ${px(w * 0.07)}px ${tokens.blackShadow(tokens.mode === "dark" ? 0.45 : 0.18)}); }
.dcc-shelf { position: absolute; inset-inline-start: ${px(w * 0.055)}; inset-inline-end: ${px(w * 0.055)}; top: ${px(h * 0.815)}; height: 1px; background: ${tokens.line}; z-index: 1; }
${searchCss(tokens, w * 0.027)}
`;

  const html = `
<div class="shot shot-discovery c">
  <div class="dcc-panel"></div>
  <div class="dcc-rail"></div>
  <div class="dcc-column">
    <div class="dcc-tick"></div>
    ${head}
    <div class="dcc-search">${searchLayer(ctx, tokens, w * 0.027)}</div>
  </div>
  <div class="dcc-stage">
    <div class="dcc-device">${device.html}</div>
  </div>
  <div class="dcc-shelf"></div>
</div>`;

  return { css, html };
}

/* ----------------------------------------------------------- landscape --- */
function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const ghostType = ctx.settings["ghostType"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );
  const isRtl = ctx.dir === "rtl";
const longTitle = isLongTitle(ctx);
const { pad, textWidth } = landscapeMetrics(w, h, { rtl: isRtl, longTitle });

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.34 * deviceScale,
    maxHeight: h * 1.26 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    align: "start",
    sizes: landscapeSizes(h, w, isRtl, longTitle),
    lines: landscapeLines(isRtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.shot-discovery.landscape {
  background:
    radial-gradient(40% 90% at 74% 55%, ${tokens.accentGlow(0.13)} 0%, transparent 72%),
    linear-gradient(100deg, ${lighten(tokens.bg, 0.03)} 0%, ${tokens.bg} 45%, ${darken(tokens.bg, 0.3)} 100%);
  ${headlineVars(tokens, "display", h * 0.028, h * 0.032)}
}
.dcl-ghost {
  position: absolute;
  bottom: ${px(-h * 0.18)};
  inset-inline-start: ${px(w * 0.36)};
  font-family: var(--font-display);
  font-weight: 700;
  font-size: ${px(h * 0.5)};
  line-height: 1;
  white-space: nowrap;
  color: ${tokens.text};
  opacity: 0.05;
  z-index: 0;
  max-width: 120%;
  overflow: hidden;
}
.dcl-column { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(textWidth)}; z-index: 3; display: flex; flex-direction: column; gap: ${px(h * 0.045)}; }
.dcl-search { width: 100%; }
.dcl-device { position: absolute; inset-inline-end: ${px(w * 0.09)}; bottom: ${px(-h * 0.24)}; z-index: 2; }
.dcl-floor { position: absolute; bottom: 0; left: 0; right: 0; height: ${px(h * 0.4)}; background: linear-gradient(to top, ${tokens.blackShadow(0.4)}, transparent); z-index: 1; }
${searchCss(tokens, h * 0.036)}
`;

  const html = `
<div class="shot shot-discovery landscape">
  ${ghostType ? `<div class="dcl-ghost" data-bleed="true">${escapeHtml(ctx.app.name)}</div>` : ""}
  <div class="dcl-column">
    ${searchLayer(ctx, tokens, h * 0.036)}
    ${head}
  </div>
  <div class="dcl-device" data-bleed="true">${device.html}</div>
  <div class="dcl-floor"></div>
</div>`;

  return { css, html };
}

export const discoveryTemplate: TemplateDefinition = {
  id: "discovery",
  name: "Discovery",
  description:
    "Apple-inspired product-page art direction in three compositions cycled across the sequence: typography-led (oversized headline with the device rising into the type band), product-led (centered axis with the search layer as a bridge to a large device), and an editorial split (measured text column beside a tonal product panel). Optional localized search layer rendered outside the app screenshot.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

import { darken, lighten } from "../util/colors.js";
import { buildTokens } from "../design/tokens.js";
import { escapeHtml } from "../util/escapeHtml.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Discovery" — Apple-inspired product-page art direction.
 *
 * Built around how marketplace, search and discovery apps are marketed on
 * the App Store: a floating interface-inspired search layer (rendered as a
 * marketing element OUTSIDE the app screenshot, with fully localized
 * placeholder text from screenshots[].prompt), oversized ghost typography
 * as background texture, and layered app screens with deliberate depth.
 *
 * The search layer is optional and contextual — it only renders when the
 * config provides a prompt, so a meditation app never gets a search bar.
 *
 * Sequence variants (deterministic by index):
 *   A (even): search layer top, centered headline, layered screens bleeding
 *             off the bottom edge.
 *   B (odd):  headline top-start with giant background type, the device
 *             cropped by the bottom AND side edges, search layer floating
 *             mid-canvas beside it.
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
    key: "ghostType",
    type: "boolean" as const,
    default: true,
    description: "Show the oversized app-name typography behind the composition.",
  },
  {
    key: "deviceMode",
    type: "string" as const,
    default: "auto",
    values: ["auto", "bare", "front", "angled"],
    description: 'Device presentation: "auto" (follows deviceFrame), "bare", "front" or "angled".',
  },
] as const;

function searchLayer(ctx: TemplateContext, tokens: ReturnType<typeof buildTokens>, size: number): string {
  const prompt = ctx.texts.prompt;
  if (prompt === undefined || prompt.length === 0) return "";
  return `<div class="dc-search" data-field="prompt" data-max-height="${Math.round(size * 2.4)}">
  <span class="dc-search-icon"></span>
  <span class="dc-search-text">${escapeHtml(prompt)}</span>
  <span class="dc-search-kbd">${escapeHtml(ctx.app.name)}</span>
</div>`;
}

const SEARCH_CSS = (tokens: ReturnType<typeof buildTokens>, size: number) => `
.dc-search {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  width: 100%;
  height: ${px(size * 1.35)};
  padding-inline: ${px(size * 0.9)};
  border-radius: 999px;
  background: ${tokens.mode === "dark" ? "rgba(255,255,255,0.08)" : "#FFFFFF"};
  border: 1px solid ${tokens.line};
  box-shadow: 0 ${px(size * 0.35)}px ${px(size * 1.1)}px ${tokens.blackShadow(tokens.mode === "dark" ? 0.45 : 0.16)};
  backdrop-filter: blur(6px);
  font-size: ${px(size)};
  color: ${tokens.text};
}
.dc-search-icon {
  width: 1.05em; height: 1.05em; border: ${Math.max(2, size * 0.07)}px solid ${tokens.muted};
  border-radius: 50%; position: relative; flex: none;
}
.dc-search-icon::after {
  content: ""; position: absolute; width: 0.42em; height: ${Math.max(2, size * 0.07)}px;
  background: ${tokens.muted}; border-radius: 999px;
  transform: rotate(45deg); translate: 0.78em 0.72em;
}
.dc-search-text { font-weight: 500; opacity: 0.92; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dc-search-kbd {
  margin-inline-start: auto; flex: none;
  font-size: 0.72em; font-weight: 600; color: ${tokens.muted};
  border: 1px solid ${tokens.line}; border-radius: 0.5em; padding: 0.3em 0.7em;
}
`;

function render(ctx: TemplateContext) {
  if (ctx.canvas.width > ctx.canvas.height) return renderLandscape(ctx);
  return ctx.index % 2 === 1 ? renderPortraitB(ctx) : renderPortraitA(ctx);
}

/** Variant A — discovery flow: search layer, centered headline, layered screens bleeding off the bottom. */
function renderPortraitA(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const ghostType = ctx.settings["ghostType"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const pad = Math.round(w * 0.08);

  const back = renderDevice({
    image: ctx.image,
    mode: "bare",
    maxWidth: w * 0.74 * deviceScale,
    maxHeight: h * 0.5 * deviceScale,
  });
  const front = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.6 * deviceScale,
    maxHeight: h * 0.52 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    align: "center",
    sizes: { kicker: w * 0.022, title: w * 0.075, subtitle: w * 0.029 },
    lines: { title: 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.7,
  });

  const css = `
.shot-discovery.a {
  background:
    radial-gradient(90% 40% at 50% 0%, ${tokens.accentGlow(0.09)} 0%, transparent 60%),
    linear-gradient(180deg, ${lighten(tokens.bg, 0.03)} 0%, ${tokens.bg} 45%, ${darken(tokens.bg, 0.25)} 100%);
  ${headlineVars(tokens, "display", h * 0.018, h * 0.02)}
}
.dc-ghost {
  position: absolute;
  top: ${px(h * 0.5)};
  left: 50%;
  transform: translate(-50%, -50%) rotate(90deg);
  transform-origin: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: ${px(w * 0.34)};
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: ${tokens.text};
  opacity: 0.045;
  z-index: 0;
}
.dc-search-zone { position: absolute; top: ${px(h * 0.085)}; left: ${px(pad)}; right: ${px(pad)}; z-index: 3; }
.dc-head { position: absolute; top: ${px(h * 0.335)}; left: ${px(pad)}; right: ${px(pad)}; display: flex; justify-content: center; z-index: 3; }
.dc-stack { position: absolute; bottom: ${px(-h * 0.16)}; left: 0; right: 0; height: ${px(h * 0.62)}; z-index: 2; }
.dc-back {
  position: absolute;
  bottom: ${px(h * 0.035)};
  inset-inline-start: ${px(-w * 0.16)};
  z-index: 1;
  filter: brightness(0.66) saturate(0.9);
  transform: rotate(-4deg);
}
.dc-front {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}
.dc-floor { position: absolute; bottom: 0; left: 0; right: 0; height: ${px(h * 0.22)}; background: linear-gradient(to top, ${tokens.blackShadow(0.4)}, transparent); z-index: 1; }
${SEARCH_CSS(tokens, w * 0.031)}
`;

  const html = `
<div class="shot shot-discovery a">
  ${ghostType ? `<div class="dc-ghost">${escapeHtml(ctx.app.name)}</div>` : ""}
  <div class="dc-search-zone">${searchLayer(ctx, tokens, w * 0.031)}</div>
  <div class="dc-head">${head}</div>
  <div class="dc-stack">
    <div class="dc-back">${back.html}</div>
    <div class="dc-front">${front.html}</div>
  </div>
  <div class="dc-floor"></div>
</div>`;

  return { css, html };
}

/** Variant B — oversized type behind an edge-cropped device, floating search layer beside it. */
function renderPortraitB(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const ghostType = ctx.settings["ghostType"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");

  const front = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.78 * deviceScale,
    maxHeight: h * 0.66 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: { kicker: w * 0.022, title: w * 0.082, subtitle: w * 0.028 },
    lines: { title: 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.6,
  });

  const css = `
.shot-discovery.b {
  background:
    radial-gradient(70% 34% at 30% 6%, ${tokens.accentGlow(0.1)} 0%, transparent 62%),
    linear-gradient(180deg, ${tokens.bg} 0%, ${darken(tokens.bg, 0.22)} 130%);
  ${headlineVars(tokens, "display", h * 0.016, h * 0.018)}
}
.dcb-ghost {
  position: absolute;
  top: ${px(h * 0.4)};
  inset-inline-start: ${px(-w * 0.06)};
  font-family: var(--font-display);
  font-weight: 700;
  font-size: ${px(w * 0.4)};
  line-height: 0.92;
  color: ${tokens.text};
  opacity: 0.05;
  z-index: 0;
  max-width: ${px(w * 1.1)};
  overflow-wrap: anywhere;
}
.dcb-head { position: absolute; top: ${px(h * 0.09)}; inset-inline-start: ${px(w * 0.085)}; z-index: 3; max-width: ${px(w * 0.62)}; }
.dcb-search { position: absolute; top: ${px(h * 0.52)}; inset-inline-start: ${px(w * 0.085)}; width: ${px(w * 0.4)}; z-index: 3; transform: rotate(-2deg); }
.dcb-device {
  position: absolute;
  bottom: ${px(-h * 0.2)};
  inset-inline-end: ${px(-w * 0.14)};
  z-index: 2;
}
.dcb-floor { position: absolute; bottom: 0; left: 0; right: 0; height: ${px(h * 0.3)}; background: linear-gradient(to top, ${tokens.blackShadow(0.42)}, transparent); z-index: 1; }
${SEARCH_CSS(tokens, w * 0.027)}
`;

  const html = `
<div class="shot shot-discovery b">
  ${ghostType ? `<div class="dcb-ghost">${escapeHtml(ctx.app.name)}</div>` : ""}
  <div class="dcb-head">${head}</div>
  <div class="dcb-search">${searchLayer(ctx, tokens, w * 0.027)}</div>
  <div class="dcb-device">${front.html}</div>
  <div class="dcb-floor"></div>
</div>`;

  return { css, html };
}

/** Landscape — text column left, edge-cropped device stack right, search layer above the headline. */
function renderLandscape(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const ghostType = ctx.settings["ghostType"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const { pad, textWidth } = landscapeMetrics(w, h);

  const front = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.34 * deviceScale,
    maxHeight: h * 1.26 * deviceScale,
  });
  const back = renderDevice({
    image: ctx.image,
    mode: "bare",
    maxWidth: w * 0.3 * deviceScale,
    maxHeight: h * 1.0 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    align: "start",
    sizes: landscapeSizes(h, w),
    lines: { title: 3, subtitle: 3 },
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.shot-discovery.landscape {
  background:
    radial-gradient(40% 90% at 74% 55%, ${tokens.accentGlow(0.12)} 0%, transparent 72%),
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
  opacity: 0.045;
  z-index: 0;
}
.dcl-column { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(textWidth)}; z-index: 3; display: flex; flex-direction: column; gap: ${px(h * 0.045)}; }
.dcl-search { width: 100%; }
.dcl-stack { position: absolute; inset-inline-end: ${px(w * 0.06)}; bottom: 0; width: ${px(w * 0.42)}; height: 100%; z-index: 2; }
.dcl-back { position: absolute; bottom: ${px(-h * 0.1)}; inset-inline-start: 0; z-index: 1; filter: brightness(0.65) saturate(0.9); transform: rotate(3deg); }
.dcl-front { position: absolute; bottom: ${px(-h * 0.22)}; inset-inline-end: ${px(w * 0.03)}; z-index: 2; }
.dcl-floor { position: absolute; bottom: 0; left: 0; right: 0; height: ${px(h * 0.4)}; background: linear-gradient(to top, ${tokens.blackShadow(0.4)}, transparent); z-index: 1; }
${SEARCH_CSS(tokens, h * 0.036)}
`;

  const html = `
<div class="shot shot-discovery landscape">
  ${ghostType ? `<div class="dcl-ghost">${escapeHtml(ctx.app.name)}</div>` : ""}
  <div class="dcl-column">
    ${searchLayer(ctx, tokens, h * 0.036)}
    ${head}
  </div>
  <div class="dcl-stack">
    <div class="dcl-back">${back.html}</div>
    <div class="dcl-front">${front.html}</div>
  </div>
  <div class="dcl-floor"></div>
</div>`;

  return { css, html };
}

export const discoveryTemplate: TemplateDefinition = {
  id: "discovery",
  name: "Discovery",
  description:
    "Apple-inspired product-page art direction: an optional localized search-bar layer (only when the config provides a prompt), oversized ghost typography, and layered app screens cropped by the canvas edges. Alternates between a centered discovery flow and an edge-cropped typographic layout across the sequence.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

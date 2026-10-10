import { buildTokens } from "../design/tokens.js";
import { escapeHtml } from "../util/escapeHtml.js";
import { headline, headlineVars, masthead, mastheadVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Swiss" — international typographic style.
 *
 * A visible module grid, one heavy accent bar, a disciplined diagonal
 * composition (headline block top-start, frameless device bottom-end) and a
 * figure caption. Nothing decorative: every line is either grid or content.
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
    description: "Screenshot size multiplier (0.8-1.15).",
  },
  {
    key: "grid",
    type: "boolean" as const,
    default: true,
    description: "Show the structural column grid.",
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
  const grid = ctx.settings["grid"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "bare");
  const { pad, textWidth } = landscapeMetrics(w, h);

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.34 * deviceScale,
    maxHeight: h * 1.06 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "swiss",
    kicker: "overline",
    sizes: landscapeSizes(h, w),
    lines: { title: 3, subtitle: 3 },
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const columns = grid
    ? [1, 2, 3]
        .map(
          (i) =>
            `<div class="swl-col" style="inset-inline-start: ${px((w / 4) * i)}"></div>`,
        )
        .join("\n    ")
    : "";

  const css = `
.shot-swiss.landscape {
  background: ${tokens.bg};
  ${headlineVars(tokens, "swiss", h * 0.03, h * 0.034)}
  ${mastheadVars(tokens)}
}
.swl-bar { position: absolute; top: 0; left: 0; right: 0; height: ${px(Math.max(10, h * 0.014))}; background: ${tokens.accent}; }
.swl-col { position: absolute; top: ${px(pad * 1.3)}; bottom: ${px(pad * 0.9)}; width: 1px; background: ${tokens.lineSoft}; }
.swl-meta { position: absolute; top: ${px(pad * 0.55)}; inset-inline-start: ${px(pad)}; width: calc(100% - ${px(pad * 2)}); }
.swl-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(textWidth)}; z-index: 2; }
.swl-baseline { position: absolute; bottom: ${px(pad)}; inset-inline-start: ${px(pad)}; width: calc(100% - ${px(pad * 2)}); height: 1px; background: ${tokens.line}; z-index: 1; }
.swl-device { position: absolute; inset-inline-end: ${px(w * 0.1)}; bottom: ${px(-h * 0.07)}; z-index: 2; }
.swl-caption { position: absolute; bottom: ${px(pad * 0.55)}; inset-inline-end: ${px(w * 0.08)}; font-size: ${px(h * 0.024)}; color: ${tokens.muted}; letter-spacing: 0.1em; z-index: 2; font-weight: 500; }
[dir="ltr"] .swl-caption { text-transform: uppercase; }
`;

  const html = `
<div class="shot shot-swiss landscape">
  <div class="swl-bar"></div>
    ${columns}
  <div class="swl-meta">${masthead(ctx, tokens, h * 0.026)}</div>
  <div class="swl-head">${head}</div>
  <div class="swl-baseline"></div>
  <div class="swl-device">${device.html}</div>
  <div class="swl-caption">FIG. ${String(ctx.index + 1).padStart(2, "0")} — ${escapeHtml((ctx.role ?? ctx.app.name).toUpperCase())}</div>
</div>`;

  return { css, html };
}

function renderPortrait(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const grid = ctx.settings["grid"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const deviceStart = ctx.index % 2 === 1; // alternate grid anchor

  const margin = w * 0.085;

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.56 * deviceScale,
    maxHeight: h * 0.5 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "swiss",
    kicker: "overline",
    sizes: { kicker: w * 0.021, title: w * 0.086, subtitle: w * 0.027 },
    lines: { title: 3, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.58,
  });

  const columns = grid
    ? [1, 2, 3]
        .map(
          (i) =>
            `<div class="sw-col" style="inset-inline-start: ${px(margin + ((w - margin * 2) / 4) * i)}"></div>`,
        )
        .join("\n")
    : "";

  const css = `
.shot-swiss {
  position: absolute;
  inset: 0;
  background: ${tokens.bg};
  ${headlineVars(tokens, "swiss", h * 0.018, h * 0.02)}
  ${mastheadVars(tokens)}
}
.sw-bar { position: absolute; top: 0; left: 0; right: 0; height: ${px(Math.max(10, h * 0.007))}; background: ${tokens.accent}; }
.sw-col { position: absolute; top: ${px(h * 0.14)}; bottom: ${px(h * 0.1)}; width: 1px; background: ${tokens.lineSoft}; }
.sw-meta { position: absolute; top: ${px(h * 0.085)}; inset-inline-start: ${px(margin)}; width: calc(100% - ${px(margin * 2)}); }
.sw-head { position: absolute; top: ${px(h * 0.155)}; inset-inline-start: ${px(margin)}; z-index: 2; max-width: ${px(w * 0.74)}; }
.sw-baseline { position: absolute; bottom: ${px(h * 0.1)}; inset-inline-start: ${px(margin)}; width: calc(100% - ${px(margin * 2)}); height: 1px; background: ${tokens.line}; z-index: 1; }
.sw-device {
  position: absolute;
  bottom: ${px(h * 0.118)};
  z-index: 2;
  ${deviceStart ? `inset-inline-start: ${px(margin)};` : `inset-inline-end: ${px(margin)};`}
}
.sw-caption {
  position: absolute;
  bottom: ${px(h * 0.055)};
  inset-inline-start: ${px(margin)};
  font-size: ${px(w * 0.0185)};
  color: ${tokens.muted};
  letter-spacing: 0.1em;
  z-index: 2;
  font-weight: 500;
}
[dir="ltr"] .sw-caption { text-transform: uppercase; }
.sw-accentblock {
  position: absolute;
  bottom: ${px(h * 0.1)};
  ${deviceStart ? "inset-inline-start" : "inset-inline-end"}: ${px(margin)};
  width: ${px(w * 0.028)};
  height: ${px(w * 0.028)};
  background: ${tokens.accent};
  z-index: 3;
}
`;

  const html = `
<div class="shot shot-swiss">
  <div class="sw-bar"></div>
  ${columns}
  <div class="sw-meta">${masthead(ctx, tokens, w * 0.021)}</div>
  <div class="sw-head">${head}</div>
  <div class="sw-baseline"></div>
  <div class="sw-device">${device.html}</div>
  <div class="sw-accentblock"></div>
  <div class="sw-caption">FIG. ${String(ctx.index + 1).padStart(2, "0")} / ${String(ctx.count).padStart(2, "0")} — ${escapeHtml((ctx.role ?? ctx.app.name).toUpperCase())}</div>
</div>`;

  return { css, html };
}

export const swissTemplate: TemplateDefinition = {
  id: "swiss",
  name: "Swiss Minimal",
  description:
    "International typographic style: a visible module grid, one heavy accent bar, disciplined diagonal composition and a figure caption for the frameless screen.",
  defaultDeviceFrame: false,
  settings: SETTINGS,
  render,
};

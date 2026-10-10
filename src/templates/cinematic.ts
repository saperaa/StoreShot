import { darken } from "../util/colors.js";
import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { isLongTitle, landscapeLines, landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Cinematic" — a hero product shot in controlled light.
 *
 * A key light picks the device out of a deep background; a reflection on the
 * floor grounds it. Even positions put the headline above the product, odd
 * positions put it over a bottom scrim with the device towering — the same
 * campaign language, two camera setups.
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
    key: "reflection",
    type: "boolean" as const,
    default: true,
    description: "Show a soft floor reflection under the device.",
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
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );
  const isRtl = ctx.dir === "rtl";
const longTitle = isLongTitle(ctx);
const { pad, textWidth } = landscapeMetrics(w, h, { rtl: isRtl, longTitle });

  // Banner crop: the device rises from the bottom edge and bleeds off it.
  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.36 * deviceScale,
    maxHeight: h * 1.3 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "cinematic",
    kicker: "chip",
    align: "start",
    sizes: landscapeSizes(h, w, isRtl, longTitle),
    lines: landscapeLines(isRtl, longTitle),
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const keyLight = tokens.accentGlow(0.18);
  const css = [
    ".shot-cinematic.landscape {",
    "  background:",
    "    radial-gradient(38% 95% at 73% 60%, " + keyLight + " 0%, transparent 72%),",
    "    radial-gradient(60% 90% at 20% -20%, " + darken(tokens.bg, 0.4) + " 0%, transparent 55%),",
    "    linear-gradient(" + tokens.bg + " 55%, " + darken(tokens.bg, 0.55) + " 130%);",
    "  " + headlineVars(tokens, "cinematic", h * 0.03, h * 0.034),
    "}",
    ".cil-head { position: absolute; inset-inline-start: " +
      px(pad) +
      "px; top: 50%; transform: translateY(-52%); width: " +
      px(textWidth) +
      "px; z-index: 3; }",
    ".cil-device { position: absolute; inset-inline-end: " +
      px(w * 0.09) +
      "px; bottom: " +
      px(-h * 0.26) +
      "px; z-index: 2; }",
    ".cil-floor { position: absolute; left: 0; right: 0; bottom: 0; height: " +
      px(h * 0.42) +
      "px; background: linear-gradient(to top, " +
      tokens.blackShadow(0.38) +
      ", transparent); z-index: 1; }",
    ".cil-rail { position: absolute; top: " +
      px(h * 0.66) +
      "px; inset-inline-start: " +
      px(w * 0.46) +
      "px; width: " +
      px(w * 0.42) +
      "px; height: 1px; background: " +
      tokens.line +
      "; z-index: 1; }",
  ].join("\n");

  const html = [
    '<div class="shot shot-cinematic landscape">',
    '  <div class="cil-floor"></div>',
    '  <div class="cil-rail"></div>',
    '  <div class="cil-head">' + head + "</div>",
    '  <div class="cil-device" data-bleed="true">' + device.html + "</div>",
    "</div>",
  ].join("\n");

  return { css, html };
}

function renderPortrait(ctx: TemplateContext) {
  if (ctx.index % 2 === 1) return renderPortraitB(ctx);
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const reflection = ctx.settings["reflection"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "front",
  );
  const headlineBelow = ctx.index % 2 === 1; // alternate camera setup

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.74 * deviceScale,
    maxHeight: h * (headlineBelow ? 0.72 : 0.66) * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "cinematic",
    kicker: "chip",
    align: "center",
    sizes: { kicker: w * 0.023, title: w * 0.082, subtitle: w * 0.032 },
    lines: { title: 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.72,
  });

  const keyLight = tokens.accentGlow(0.16);
  const css = `
.shot-cinematic {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(80% 40% at 38% ${headlineBelow ? "22%" : "32%"}, ${keyLight} 0%, transparent 68%),
    radial-gradient(140% 90% at 50% 110%, ${darken(tokens.bg, 0.5)} 0%, transparent 55%),
    ${tokens.bg};
  ${headlineVars(tokens, "cinematic", h * 0.018, h * 0.02)}
}
.ci-stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ci-device-wrap { position: relative; display: flex; justify-content: center; width: 100%; }
.ci-reflection {
  width: ${px(device.width)};
  height: ${px(device.height * 0.16)};
  overflow: hidden;
  opacity: 0.22;
  filter: blur(6px);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
  transform: translateY(2px);
}
.ci-reflection img { width: 100%; transform: translateY(-${px(device.height * 0.84)}) scaleY(-1); }
.ci-reflection img { width: ${px(device.width)}; }
.ci-head-top { position: absolute; top: ${px(h * 0.085)}; left: 0; right: 0; display: flex; justify-content: center; }
.ci-head-bottom {
  position: absolute;
  bottom: ${px(h * 0.055)};
  left: ${px(w * 0.1)};
  right: ${px(w * 0.1)};
  display: flex;
  justify-content: center;
  z-index: 3;
}
.ci-scrim {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: ${px(h * 0.38)};
  background: linear-gradient(to top, rgba(3,5,9,0.92) 0%, rgba(3,5,9,0.5) 55%, transparent 100%);
  z-index: 2;
}
`;

  const deviceBlock = `<div class="ci-device-wrap">
  ${device.html}
</div>
${reflection ? `<div class="ci-reflection"><img src="${ctx.image.url}" alt=""></div>` : ""}
<div class="ci-rail" style="position:absolute; top:${px(headlineBelow ? h * 0.075 : h * 0.335)}; left:${px(w * 0.14)}; right:${px(w * 0.14)}; height:1px; background:${tokens.lineSoft};"></div>`;

  const html = `
<div class="shot shot-cinematic">
  <div class="ci-stage">
    ${headlineBelow ? "" : `<div class="ci-head-top">${head}</div>`}
    <div style="position:absolute; top:${px(headlineBelow ? h * 0.115 : h * 0.36)}; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding-bottom:${px(h * 0.075)}; width:100%;">
      ${deviceBlock}
    </div>
    ${headlineBelow ? `<div class="ci-scrim"></div><div class="ci-head-bottom">${head}</div>` : ""}
  </div>
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
    "front",
  );

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.86 * deviceScale,
    maxHeight: h * 0.92 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "cinematic",
    kicker: "chip",
    align: "center",
    sizes: { kicker: w * 0.023, title: w * 0.084, subtitle: w * 0.032 },
    lines: { title: 3, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.74,
  });

  const css = [
    ".shot-cinematic.b {",
    "  background:",
    "    radial-gradient(95% 50% at 50% 30%, " + tokens.accentGlow(0.22) + " 0%, transparent 68%),",
    "    linear-gradient(" + tokens.bg + " 40%, " + darken(tokens.bg, 0.5) + " 130%);",
    "  " + headlineVars(tokens, "cinematic", h * 0.018, h * 0.02),
    "}",
    ".cib-device { position: absolute; bottom: " +
      px(-h * 0.3) +
      "px; left: 50%; transform: translateX(-50%); z-index: 2; }",
    ".cib-scrim { position: absolute; bottom: 0; left: 0; right: 0; height: " +
      px(h * 0.4) +
      "px; background: linear-gradient(to top, rgba(3,5,9,0.9) 0%, rgba(3,5,9,0.5) 55%, transparent 100%); z-index: 3; }",
    ".cib-head { position: absolute; bottom: " +
      px(h * 0.075) +
      "px; left: " +
      px(w * 0.1) +
      "px; right: " +
      px(w * 0.1) +
      "px; display: flex; justify-content: center; z-index: 4; }",
  ].join("\n");

  const html = [
    '<div class="shot shot-cinematic b">',
    '  <div class="cib-device" data-bleed="true">' + device.html + "</div>",
    '  <div class="cib-scrim"></div>',
    '  <div class="cib-head">' + head + "</div>",
    "</div>",
  ].join("\n");

  return { css, html };
}

export const cinematicTemplate: TemplateDefinition = {
  id: "cinematic",
  name: "Cinematic Product",
  description:
    "Hero product photography language: key light, floor reflection, and two alternating camera setups — headline above the product, or the product towering over a scrimmed headline.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

import { darken } from "../util/colors.js";
import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { landscapeMetrics, landscapeSizes } from "../design/layout.js";
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
  const reflection = ctx.settings["reflection"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const { pad, textWidth, deviceMaxH } = landscapeMetrics(w, h);

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.34 * deviceScale,
    maxHeight: deviceMaxH * 0.92 * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "cinematic",
    kicker: "chip",
    align: "start",
    sizes: landscapeSizes(h),
    lines: { title: 3, subtitle: 3 },
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const keyLight = tokens.accentGlow(0.16);
  const css = [
    ".shot-cinematic.landscape {",
    "  background:",
    "    radial-gradient(42% 75% at 74% 38%, " + keyLight + " 0%, transparent 70%),",
    "    radial-gradient(70% 120% at 50% -30%, " + darken(tokens.bg, 0.5) + " 0%, transparent 60%),",
    "    " + tokens.bg + ";",
    "  " + headlineVars(tokens, "cinematic", h * 0.03, h * 0.034),
    "}",
    ".cil-head { position: absolute; inset-inline-start: " + px(pad) + "px; top: 50%; transform: translateY(-52%); width: " + px(textWidth) + "px; z-index: 3; }",
    ".cil-device { position: absolute; inset-inline-end: " + px(w * 0.075) + "px; top: 50%; transform: translateY(-50%); z-index: 2; }",
    ".cil-reflection {",
    "  position: absolute;",
    "  inset-inline-end: " + px(w * 0.075) + "px;",
    "  top: calc(50% + " + px(deviceMaxH * 0.92 * deviceScale * 0.5) + "px);",
    "  width: " + px(device.width) + "px;",
    "  height: " + px(device.height * 0.14) + "px;",
    "  overflow: hidden; opacity: 0.2; filter: blur(5px);",
    '  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 80%);',
    "  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 80%);",
    "}",
    ".cil-reflection img { width: " + px(device.width) + "px; transform: translateY(-" + px(device.height * 0.86) + "px) scaleY(-1); }",
  ].join("\n");

  const html = [
    '<div class="shot shot-cinematic landscape">',
    '  <div class="cil-head">' + head + "</div>",
    '  <div class="cil-device">' + device.html + "</div>",
    reflection ? '  <div class="cil-reflection"><img src="' + ctx.image.url + '" alt=""></div>' : "",
    "</div>",
  ].join("\n");

  return { css, html };
}

function renderPortrait(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const reflection = ctx.settings["reflection"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "front");
  const headlineBelow = ctx.index % 2 === 1; // alternate camera setup

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.64 * deviceScale,
    maxHeight: h * (headlineBelow ? 0.62 : 0.56) * deviceScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "cinematic",
    kicker: "chip",
    align: "center",
    sizes: { kicker: w * 0.022, title: w * 0.072, subtitle: w * 0.03 },
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
.ci-head-top { position: absolute; top: ${px(h * 0.095)}; left: 0; right: 0; display: flex; justify-content: center; }
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
  height: ${px(h * 0.34)};
  background: linear-gradient(to top, rgba(3,5,9,0.88) 0%, rgba(3,5,9,0.45) 55%, transparent 100%);
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

export const cinematicTemplate: TemplateDefinition = {
  id: "cinematic",
  name: "Cinematic Product",
  description:
    "Hero product photography language: key light, floor reflection, and two alternating camera setups — headline above the product, or the product towering over a scrimmed headline.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

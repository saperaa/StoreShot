import { withAlpha } from "../util/colors.js";
import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { numberSetting, stringSetting } from "./settings.js";
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
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const band = ctx.settings["band"] !== false;
  const mode = resolveDeviceMode(stringSetting(SETTINGS, ctx.settings, "deviceMode"), ctx.deviceFrame, "angled");
  const flip = ctx.index % 2 === 1;

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
    sizes: { kicker: w * 0.022, title: w * 0.092, subtitle: w * 0.028 },
    lines: { title: 3, subtitle: 2 },
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

export const campaignTemplate: TemplateDefinition = {
  id: "campaign",
  name: "Bold Brand Campaign",
  description:
    "Launch-poster energy: the largest headline in the library, a solid brand tag, and an angled device breaking through a diagonal brand band that flips across the sequence.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

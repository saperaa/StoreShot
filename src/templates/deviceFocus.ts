import { withAlpha } from "../util/colors.js";
import { numberSetting } from "./settings.js";
import { deviceFrame } from "./deviceFrame.js";
import { textBlockHtml } from "./textBlock.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Device Focus" — the screenshot is the hero. A tilted accent ribbon marks
 * the top zone for the headline; the screenshot sits in a proportionally
 * accurate device frame anchored to the bottom edge.
 */

const SETTINGS = [
  {
    key: "bandAngle",
    type: "number" as const,
    default: -9,
    min: -20,
    max: 20,
    description: "Tilt of the top accent ribbon, in degrees.",
  },
  {
    key: "bandOpacity",
    type: "number" as const,
    default: 0.45,
    min: 0,
    max: 1,
    description: "Opacity of the top accent ribbon (0-1).",
  },
  {
    key: "screenshotMaxWidth",
    type: "number" as const,
    default: 0.8,
    min: 0.5,
    max: 1,
    description: "Screenshot width as a fraction of canvas width when no device frame is used.",
  },
] as const;

function render(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const angle = numberSetting(SETTINGS, ctx.settings, "bandAngle");
  const bandOpacity = numberSetting(SETTINGS, ctx.settings, "bandOpacity");
  const maxWidth = numberSetting(SETTINGS, ctx.settings, "screenshotMaxWidth");

  const slotHeight = Math.round(h * 0.58);
  const shotWidth = Math.round(w * (ctx.deviceFrame ? 0.92 : maxWidth));

  const sizes = { kicker: w * 0.024, title: w * 0.072, subtitle: w * 0.032 };
  const textHtml = textBlockHtml(ctx, sizes, { title: 2, subtitle: 2 });

  let imageHtml: string;
  let extraCss: string;
  if (ctx.deviceFrame) {
    const frame = deviceFrame(ctx.image, { slotHeight, maxWidth: shotWidth });
    imageHtml = frame.html;
    extraCss = frame.css;
  } else {
    imageHtml = `<img class="app-shot" src="${ctx.image.url}" alt="${ctx.image.alt}">`;
    extraCss = "";
  }

  const css = `
.shot-devicefocus {
  position: absolute;
  inset: 0;
  background: ${ctx.theme.background};
  overflow: hidden;
}
.shot-devicefocus .df-band,
.shot-devicefocus .df-band2 {
  position: absolute;
  inset-inline-start: -25%;
  width: 150%;
  transform: rotate(${angle}deg);
}
.shot-devicefocus .df-band {
  top: ${px(-h * 0.3)};
  height: ${px(h * 0.52)};
  background: ${withAlpha(ctx.theme.accent, bandOpacity * 0.5)};
}
.shot-devicefocus .df-band2 {
  top: ${px(-h * 0.18)};
  height: ${px(h * 0.46)};
  background: ${withAlpha(ctx.theme.accent, bandOpacity * 0.22)};
}
.shot-devicefocus .df-text {
  position: absolute;
  top: ${px(h * 0.085)};
  inset-inline-start: ${px(w * 0.08)};
  inset-inline-end: ${px(w * 0.08)};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.shot-devicefocus .t-kicker {
  color: ${ctx.theme.accent};
  font-weight: 600;
}
.shot-devicefocus .t-title {
  color: ${ctx.theme.text};
  font-weight: 700;
  line-height: 1.14;
  margin-block-start: ${px(h * 0.014)};
}
.shot-devicefocus .t-subtitle {
  color: ${ctx.theme.muted};
  font-weight: 400;
  line-height: 1.5;
  margin-block-start: ${px(h * 0.016)};
  max-width: 88%;
}
[dir="ltr"] .t-kicker {
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
[dir="rtl"] .t-kicker {
  letter-spacing: 0.01em;
}
.shot-devicefocus .df-device {
  position: absolute;
  bottom: ${px(h * 0.045)};
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.shot-devicefocus .app-shot {
  width: ${px(shotWidth)};
  max-height: ${px(h * 0.55)};
  object-fit: contain;
  border-radius: ${px(w * 0.025)};
  border: 1px solid ${withAlpha(ctx.theme.text, 0.08)};
  box-shadow: 0 ${px(h * 0.025)}px ${px(w * 0.06)}px rgba(0, 0, 0, 0.5);
}
${extraCss}`;

  const html = `
<div class="shot shot-devicefocus">
  <div class="df-band"></div>
  <div class="df-band2"></div>
  <div class="df-text">
    ${textHtml}
  </div>
  <div class="df-device">
    ${imageHtml}
  </div>
</div>`;

  return { css, html };
}

export const deviceFocusTemplate: TemplateDefinition = {
  id: "device-focus",
  name: "Device Focus",
  description:
    "Screenshot-first layout: the app image sits in a proportional device frame anchored to the bottom, under a tilted accent ribbon that carries the headline. Great for showcasing a key screen.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

import { darken, lighten, withAlpha } from "../util/colors.js";
import { numberSetting } from "./settings.js";
import { deviceFrame } from "./deviceFrame.js";
import { textBlockHtml } from "./textBlock.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Spotlight" — the loud one. An oversized accent arch rises from the bottom
 * edge behind the app screenshot; an outlined echo arch floats behind it.
 * Huge start-aligned headline at the top. Made for launch-day hero shots.
 */

const SETTINGS = [
  {
    key: "archWidth",
    type: "number" as const,
    default: 0.72,
    min: 0.5,
    max: 1,
    description: "Arch width as a fraction of canvas width (0.5-1).",
  },
  {
    key: "echo",
    type: "number" as const,
    default: 0.03,
    min: 0,
    max: 0.08,
    description: "Offset of the decorative outline arch, as a fraction of canvas width.",
  },
  {
    key: "screenshotMaxWidth",
    type: "number" as const,
    default: 0.78,
    min: 0.5,
    max: 1,
    description: "Screenshot width as a fraction of canvas width when no device frame is used.",
  },
] as const;

function render(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const archWidth = numberSetting(SETTINGS, ctx.settings, "archWidth");
  const echo = numberSetting(SETTINGS, ctx.settings, "echo");
  const maxWidth = numberSetting(SETTINGS, ctx.settings, "screenshotMaxWidth");

  const { background: bg, accent, text } = ctx.theme;
  const archH = h * 0.5;
  const archW = w * archWidth;
  const radius = archW / 2;

  const shotWidth = Math.round(w * (ctx.deviceFrame ? 0.92 : maxWidth));
  const maxShotHeight = Math.round(h * 0.56);

  const sizes = { kicker: w * 0.024, title: w * 0.098, subtitle: w * 0.034 };
  const textHtml = textBlockHtml(ctx, sizes, { title: 2, subtitle: 2 });

  let imageHtml: string;
  let extraCss: string;
  if (ctx.deviceFrame) {
    const frame = deviceFrame(ctx.image, { slotHeight: maxShotHeight, maxWidth: shotWidth });
    imageHtml = frame.html;
    extraCss = frame.css;
  } else {
    imageHtml = `<img class="app-shot" src="${ctx.image.url}" alt="${ctx.image.alt}">`;
    extraCss = "";
  }

  const css = `
.shot-spotlight {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(90% 55% at 50% 30%, ${lighten(bg, 0.05)} 0%, ${bg} 70%);
  overflow: hidden;
}
.sp-arch {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: ${px(archW)};
  height: ${px(archH)};
  border-radius: ${px(radius)} ${px(radius)} 0 0;
  background: linear-gradient(180deg, ${accent} 0%, ${darken(accent, 0.35)} 100%);
  opacity: 0.92;
}
.sp-echo {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(calc(-50% + ${px(echo * w)}));
  width: ${px(archW + w * 0.035)};
  height: ${px(archH * 1.06)};
  border-radius: 999px 999px 0 0;
  border: ${px(Math.max(2, w * 0.0035))} solid ${withAlpha(accent, 0.45)};
  border-bottom: none;
}
[dir="rtl"] .sp-echo {
  transform: translateX(calc(-50% - ${px(echo * w)}));
}
.sp-text {
  position: absolute;
  top: ${px(h * 0.095)};
  inset-inline-start: ${px(w * 0.085)};
  inset-inline-end: ${px(w * 0.085)};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.shot-spotlight .t-kicker {
  display: inline-flex;
  align-items: center;
  gap: ${px(w * 0.016)};
  color: ${accent};
  font-weight: 700;
}
.shot-spotlight .t-kicker::before {
  content: "";
  width: ${px(w * 0.032)};
  height: ${px(Math.max(5, w * 0.005))};
  border-radius: 999px;
  background: ${accent};
}
.shot-spotlight .t-title {
  color: ${text};
  font-weight: 700;
  line-height: 1.12;
  margin-block-start: ${px(h * 0.016)};
  letter-spacing: ${ctx.dir === "ltr" ? "-0.015em" : "0"};
}
.shot-spotlight .t-subtitle {
  color: ${ctx.theme.muted};
  font-weight: 400;
  line-height: 1.5;
  margin-block-start: ${px(h * 0.018)};
  max-width: 84%;
}
[dir="ltr"] .t-kicker {
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
[dir="rtl"] .t-kicker {
  letter-spacing: 0.01em;
}
.sp-device {
  position: absolute;
  bottom: ${px(h * 0.055)};
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2;
}
.shot-spotlight .app-shot {
  width: ${px(shotWidth)};
  max-height: ${px(maxShotHeight)};
  object-fit: contain;
  border-radius: ${px(w * 0.03)};
  border: 1px solid ${withAlpha(text, 0.1)};
  box-shadow: 0 ${px(h * 0.02)}px ${px(w * 0.05)}px rgba(0, 0, 0, 0.45);
}
${extraCss}`;

  const html = `
<div class="shot shot-spotlight">
  <div class="sp-echo"></div>
  <div class="sp-arch"></div>
  <div class="sp-text">
    ${textHtml}
  </div>
  <div class="sp-device">
    ${imageHtml}
  </div>
</div>`;

  return { css, html };
}

export const spotlightTemplate: TemplateDefinition = {
  id: "spotlight",
  name: "Spotlight",
  description:
    "Oversized accent arch rising behind the screenshot with a floating outline echo and a huge headline. Built for launch-day hero shots.",
  defaultDeviceFrame: false,
  settings: SETTINGS,
  render,
};

import { darken, lighten, withAlpha } from "../util/colors.js";
import { boolSetting, numberSetting } from "./settings.js";
import { deviceFrame } from "./deviceFrame.js";
import { textBlockHtml } from "./textBlock.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Gradient" — rich layered background with glow fields, an outlined ring and
 * a dotted grid. Centered composition; the screenshot anchors the bottom with
 * a deep shadow.
 */

const SETTINGS = [
  {
    key: "glow",
    type: "number" as const,
    default: 0.6,
    min: 0,
    max: 1,
    description: "Intensity of the accent glow fields (0-1).",
  },
  {
    key: "ring",
    type: "boolean" as const,
    default: true,
    description: "Show the decorative outlined ring.",
  },
  {
    key: "grid",
    type: "boolean" as const,
    default: true,
    description: "Show the decorative dotted grid.",
  },
  {
    key: "chip",
    type: "boolean" as const,
    default: true,
    description: "Show the app name as an outlined pill above the title.",
  },
  {
    key: "screenshotMaxWidth",
    type: "number" as const,
    default: 0.86,
    min: 0.5,
    max: 1,
    description: "Screenshot width as a fraction of canvas width (0.5-1).",
  },
] as const;

function render(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const glow = numberSetting(SETTINGS, ctx.settings, "glow");
  const showRing = boolSetting(SETTINGS, ctx.settings, "ring");
  const showGrid = boolSetting(SETTINGS, ctx.settings, "grid");
  const showChip = boolSetting(SETTINGS, ctx.settings, "chip");
  const maxWidth = numberSetting(SETTINGS, ctx.settings, "screenshotMaxWidth");

  const { background: bg, accent, text } = ctx.theme;
  const maxShotHeight = Math.round(h * 0.57);
  const shotWidth = Math.round(w * (ctx.deviceFrame ? Math.min(maxWidth + 0.04, 1) : maxWidth));

  const sizes = { kicker: w * 0.024, title: w * 0.088, subtitle: w * 0.038 };
  const textHtml = textBlockHtml(ctx, sizes, { title: 3, subtitle: 2 });

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

  const gridDot = Math.max(1.5, w * 0.0016);
  const gridCell = Math.max(10, w * 0.02);

  const css = `
.shot-gradient {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${px(h * 0.125)} ${px(w * 0.08)} ${px(h * 0.05)};
  background:
    radial-gradient(120% 70% at 82% 14%, ${withAlpha(accent, 0.05 + glow * 0.13)} 0%, transparent 55%),
    radial-gradient(95% 62% at 10% 98%, ${withAlpha(accent, glow * 0.3)} 0%, transparent 62%),
    radial-gradient(140% 85% at 14% 6%, ${withAlpha(accent, glow * 0.2)} 0%, transparent 58%),
    linear-gradient(168deg, ${lighten(bg, 0.05)} 0%, ${bg} 52%, ${darken(bg, 0.32)} 100%);
  overflow: hidden;
}
.shot-gradient .g-ring {
  position: absolute;
  inset-inline-end: ${px(-w * 0.09)};
  top: ${px(h * 0.085)};
  width: ${px(w * 0.3)};
  height: ${px(w * 0.3)};
  border: ${px(Math.max(2, w * 0.004))} solid ${withAlpha(accent, 0.5)};
  border-radius: 50%;
}
.shot-gradient .g-grid {
  position: absolute;
  inset-inline-start: ${px(w * 0.065)};
  top: ${px(h * 0.3)};
  width: ${px(w * 0.24)};
  height: ${px(w * 0.24)};
  background-image: radial-gradient(${withAlpha(text, 0.3)} ${gridDot}px, transparent ${gridDot + 0.5}px);
  background-size: ${gridCell}px ${gridCell}px;
}
.shot-gradient .g-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 100%;
}
.shot-gradient .t-kicker {
  display: ${showChip ? "inline-flex" : "block"};
  align-items: center;
  padding: ${px(h * 0.011)} ${px(w * 0.032)};
  border-radius: 999px;
  border: 1px solid ${withAlpha(accent, showChip ? 0.65 : 0)};
  color: ${accent};
  font-weight: 600;
}
.shot-gradient .t-title {
  color: ${text};
  font-weight: 700;
  line-height: 1.16;
  margin-block-start: ${px(h * 0.02)};
}
.shot-gradient .t-subtitle {
  color: ${ctx.theme.muted};
  font-weight: 400;
  line-height: 1.5;
  margin-block-start: ${px(h * 0.018)};
  max-width: 88%;
}
[dir="ltr"] .t-kicker {
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
[dir="rtl"] .t-kicker {
  letter-spacing: 0.01em;
}
.shot-gradient .g-image {
  margin-block-start: auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.shot-gradient .app-shot {
  width: ${px(shotWidth)};
  max-height: ${px(maxShotHeight)};
  object-fit: contain;
  border-radius: ${px(w * 0.03)};
  border: 1px solid ${withAlpha(text, 0.08)};
  box-shadow: 0 ${px(h * 0.03)}px ${px(w * 0.08)}px rgba(0, 0, 0, 0.5);
}
${extraCss}`;

  const decorations = `
${showRing ? '<div class="g-ring"></div>' : ""}
${showGrid ? '<div class="g-grid"></div>' : ""}`;

  const html = `
<div class="shot shot-gradient">
  ${decorations}
  <div class="g-content">
    ${textHtml}
  </div>
  <div class="g-image">
    ${imageHtml}
  </div>
</div>`;

  return { css, html };
}

export const gradientTemplate: TemplateDefinition = {
  id: "gradient",
  name: "Gradient",
  description:
    "Layered gradient background with accent glow fields, a decorative ring and dotted grid. Centered composition with an outlined app-name pill. Works well for consumer and social apps.",
  defaultDeviceFrame: false,
  settings: SETTINGS,
  render,
};

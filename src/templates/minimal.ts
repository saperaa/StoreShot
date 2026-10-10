import { withAlpha } from "../util/colors.js";
import { numberSetting } from "./settings.js";
import { deviceFrame } from "./deviceFrame.js";
import { textBlockHtml } from "./textBlock.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Minimal" — flat editorial layout.
 * Strong typographic hierarchy, generous whitespace, one accent detail.
 * Text block is start-aligned; the screenshot anchors the lower half.
 */

const SETTINGS = [
  {
    key: "screenshotMaxWidth",
    type: "number" as const,
    default: 0.84,
    min: 0.5,
    max: 1,
    description: "Screenshot width as a fraction of canvas width (0.5-1).",
  },
  {
    key: "cornerRadius",
    type: "number" as const,
    default: 0.022,
    min: 0,
    max: 0.08,
    description: "Screenshot corner radius as a fraction of canvas width.",
  },
] as const;

function render(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const maxWidth = numberSetting(SETTINGS, ctx.settings, "screenshotMaxWidth");
  const radius = numberSetting(SETTINGS, ctx.settings, "cornerRadius");
  const showFrame = ctx.deviceFrame;

  const shotWidth = Math.round(w * (showFrame ? Math.min(maxWidth + 0.04, 1) : maxWidth));
  const maxShotHeight = Math.round(h * 0.56);

  const sizes = { kicker: w * 0.026, title: w * 0.084, subtitle: w * 0.036 };
  const textHtml = textBlockHtml(ctx, sizes, { title: 3, subtitle: 2 });

  let imageHtml: string;
  let extraCss: string;
  if (showFrame) {
    const frame = deviceFrame(ctx.image, { slotHeight: maxShotHeight, maxWidth: shotWidth });
    imageHtml = frame.html;
    extraCss = frame.css;
  } else {
    imageHtml = `<img class="app-shot" src="${ctx.image.url}" alt="${ctx.image.alt}">`;
    extraCss = "";
  }

  const css = `
.shot-minimal {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: ${ctx.theme.background};
  padding: ${px(h * 0.11)} ${px(w * 0.085)} ${px(h * 0.055)};
}
.shot-minimal .m-rule {
  width: ${px(w * 0.07)};
  height: ${px(Math.max(6, w * 0.006))};
  border-radius: ${px(Math.max(3, w * 0.003))};
  background: ${ctx.theme.accent};
  margin-block-end: ${px(h * 0.032)};
}
.shot-minimal .t-kicker {
  color: ${ctx.theme.accent};
  font-weight: 600;
}
.shot-minimal .t-title {
  color: ${ctx.theme.text};
  font-weight: 700;
  line-height: 1.16;
  margin-block-start: ${px(h * 0.012)};
}
.shot-minimal .t-subtitle {
  color: ${ctx.theme.muted};
  font-weight: 400;
  line-height: 1.5;
  margin-block-start: ${px(h * 0.02)};
  max-width: 92%;
}
[dir="ltr"] .t-kicker {
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
[dir="rtl"] .t-kicker {
  letter-spacing: 0.01em;
}
.shot-minimal .m-image {
  margin-block-start: auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  align-self: center;
  width: 100%;
}
.shot-minimal .app-shot {
  width: ${px(shotWidth)};
  max-height: ${px(maxShotHeight)};
  object-fit: contain;
  border-radius: ${px(w * radius)};
  border: 1px solid ${withAlpha(ctx.theme.text, 0.07)};
  box-shadow: 0 ${px(h * 0.018)}px ${px(w * 0.05)}px rgba(0, 0, 0, 0.42);
}
${extraCss}`;

  const html = `
<div class="shot shot-minimal">
  <div class="m-top">
    <div class="m-rule"></div>
    ${textHtml}
  </div>
  <div class="m-image">
    ${imageHtml}
  </div>
</div>`;

  return { css, html };
}

export const minimalTemplate: TemplateDefinition = {
  id: "minimal",
  name: "Minimal",
  description:
    "Flat editorial layout with a strong typographic hierarchy, an accent rule and generous whitespace. Ideal for productivity and utility apps.",
  defaultDeviceFrame: false,
  settings: SETTINGS,
  render,
};

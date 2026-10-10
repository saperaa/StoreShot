import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice, resolveDeviceMode } from "../design/device.js";
import { landscapeMetrics, landscapeSizes } from "../design/layout.js";
import { numberSetting, stringSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Immersive" — the device inhabits a scene.
 *
 * Two devices in real perspective (a dimmed twin behind the hero), a horizon
 * line grounding them, a rim-light gradient picking out the frame, and
 * viewfinder corner ticks. The rotation flips with sequence position so the
 * pair feels arranged, not stamped.
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
    key: "twin",
    type: "boolean" as const,
    default: true,
    description: "Show the second, dimmed device behind the hero device.",
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
  const twin = ctx.settings["twin"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "angled",
  );
  const flip = ctx.index % 2 === 1;
  const { pad, textWidth } = landscapeMetrics(w, h);

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.38 * deviceScale,
    maxHeight: h * 1.18 * deviceScale,
    ...(mode === "angled" ? { rotateY: flip ? 8 : -8, rotateZ: 0, backLayer: twin } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: landscapeSizes(h, w),
    lines: { title: 3, subtitle: 3 },
    scale: headlineScale,
    subtitleMaxWidth: textWidth,
  });

  const css = `
.shot-immersive.landscape {
  background:
    radial-gradient(34% 90% at 74% 65%, ${tokens.accentGlow(0.17)} 0%, transparent 74%),
    ${tokens.bg};
  ${headlineVars(tokens, "display", h * 0.03, h * 0.034)}
}
.iml-head { position: absolute; inset-inline-start: ${px(pad)}; top: 50%; transform: translateY(-52%); width: ${px(textWidth)}; z-index: 3; }
.iml-horizon { position: absolute; top: ${px(h * 0.24)}; left: ${px(w * 0.5)}; right: ${px(pad)}; height: 1px; background: ${tokens.line}; z-index: 0; }
.iml-device { position: absolute; inset-inline-end: ${px(w * 0.09)}; bottom: ${px(-h * 0.18)}; z-index: 2; display: flex; justify-content: center; }
.iml-tick { position: absolute; width: ${px(h * 0.045)}; height: ${px(h * 0.045)}; border-color: ${tokens.accent}; border-style: solid; border-width: 0; z-index: 1; }
.iml-tick.tl { top: ${px(pad * 0.45)}; inset-inline-start: ${px(pad * 0.45)}; border-top-width: 2px; border-inline-start-width: 2px; }
.iml-tick.br { bottom: ${px(pad * 0.45)}; inset-inline-end: ${px(pad * 0.45)}; border-bottom-width: 2px; border-inline-end-width: 2px; }
`;

  const html = `
<div class="shot shot-immersive landscape">
  <div class="iml-horizon"></div>
  <div class="iml-tick tl"></div>
  <div class="iml-tick br"></div>
  <div class="iml-head">${head}</div>
  <div class="iml-device" data-bleed="true">${device.html}</div>
</div>`;

  return { css, html };
}

function renderPortrait(ctx: TemplateContext) {
  if (ctx.index % 2 === 1) return renderPortraitB(ctx);
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const twin = ctx.settings["twin"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "angled",
  );
  const flip = ctx.index % 2 === 1;

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.56 * deviceScale,
    maxHeight: h * 0.55 * deviceScale,
    ...(mode === "angled" ? { rotateY: flip ? 8 : -8, rotateZ: 0, backLayer: twin } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: { kicker: w * 0.022, title: w * 0.068, subtitle: w * 0.027 },
    lines: { title: 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.62,
  });

  const css = `
.shot-immersive {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 38% at 50% 62%, ${tokens.accentGlow(0.13)} 0%, transparent 70%),
    radial-gradient(130% 80% at 50% -20%, ${tokens.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.55)"} 0%, transparent 60%),
    ${tokens.bg};
  ${headlineVars(tokens, "display", h * 0.018, h * 0.02)}
}
.im-head { position: absolute; top: ${px(h * 0.085)}; inset-inline-start: ${px(w * 0.085)}; inset-inline-end: ${px(w * 0.085)}; z-index: 3; }
.im-horizon {
  position: absolute;
  top: ${px(h * 0.615)};
  left: ${px(w * 0.06)};
  right: ${px(w * 0.06)};
  height: 1px;
  background: ${tokens.line};
  z-index: 0;
}
.im-device {
  position: absolute;
  bottom: ${px(h * 0.055)};
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  justify-content: center;
}
.im-tick {
  position: absolute;
  width: ${px(w * 0.045)};
  height: ${px(w * 0.045)};
  border-color: ${tokens.accent};
  border-style: solid;
  border-width: 0;
  z-index: 1;
}
.im-tick.tl { top: ${px(h * 0.045)}; inset-inline-start: ${px(w * 0.045)}; border-top-width: 2px; border-inline-start-width: 2px; }
.im-tick.br { bottom: ${px(h * 0.045)}; inset-inline-end: ${px(w * 0.045)}; border-bottom-width: 2px; border-inline-end-width: 2px; }
`;

  const html = `
<div class="shot shot-immersive">
  <div class="im-horizon"></div>
  <div class="im-tick tl"></div>
  <div class="im-tick br"></div>
  <div class="im-head">${head}</div>
  <div class="im-device">${device.html}</div>
</div>`;

  return { css, html };
}

function renderPortraitB(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const deviceScale = numberSetting(SETTINGS, ctx.settings, "deviceScale");
  const twin = ctx.settings["twin"] !== false;
  const mode = resolveDeviceMode(
    stringSetting(SETTINGS, ctx.settings, "deviceMode"),
    ctx.deviceFrame,
    "angled",
  );

  const device = renderDevice({
    image: ctx.image,
    mode,
    maxWidth: w * 0.7 * deviceScale,
    maxHeight: h * 0.66 * deviceScale,
    ...(mode === "angled" ? { rotateY: 10, rotateZ: 2, backLayer: twin } : {}),
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "overline",
    sizes: { kicker: w * 0.022, title: w * 0.07, subtitle: w * 0.027 },
    lines: { title: 3, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.5,
  });

  const css = [
    ".shot-immersive.b {",
    "  background:",
    "    radial-gradient(65% 40% at 78% 55%, " + tokens.accentGlow(0.16) + " 0%, transparent 70%),",
    "    " + tokens.bg + ";",
    "  " + headlineVars(tokens, "display", h * 0.018, h * 0.02),
    "}",
    ".imb-head { position: absolute; top: " +
      px(h * 0.105) +
      "px; inset-inline-start: " +
      px(w * 0.085) +
      "px; z-index: 3; max-width: " +
      px(w * 0.52) +
      "px; }",
    ".imb-vline { position: absolute; top: " +
      px(h * 0.12) +
      "px; bottom: " +
      px(h * 0.12) +
      "px; inset-inline-start: " +
      px(w * 0.52) +
      "px; width: 1px; background: " +
      tokens.line +
      "; z-index: 0; }",
    ".imb-device { position: absolute; bottom: " +
      px(-h * 0.1) +
      "px; inset-inline-end: " +
      px(-w * 0.16) +
      "px; z-index: 2; }",
    ".imb-tick { position: absolute; width: " +
      px(w * 0.045) +
      "px; height: " +
      px(w * 0.045) +
      "px; border-color: " +
      tokens.accent +
      "; border-style: solid; border-width: 0; z-index: 1; }",
    ".imb-tick.tl { top: " +
      px(h * 0.045) +
      "px; inset-inline-start: " +
      px(w * 0.045) +
      "px; border-top-width: 2px; border-inline-start-width: 2px; }",
    ".imb-tick.br { bottom: " +
      px(h * 0.045) +
      "px; inset-inline-end: " +
      px(w * 0.045) +
      "px; border-bottom-width: 2px; border-inline-end-width: 2px; }",
  ].join("\n");

  const html = [
    '<div class="shot shot-immersive b">',
    '  <div class="imb-vline"></div>',
    '  <div class="imb-tick tl"></div>',
    '  <div class="imb-tick br"></div>',
    '  <div class="imb-head">' + head + "</div>",
    '  <div class="imb-device" data-bleed="true">' + device.html + "</div>",
    "</div>",
  ].join("\n");

  return { css, html };
}

export const immersiveTemplate: TemplateDefinition = {
  id: "immersive",
  name: "Immersive 3D Device",
  description:
    "The device inhabits a scene: real CSS perspective with a dimmed twin behind the hero, a horizon line, rim light and viewfinder ticks. Rotation flips across the sequence.",
  defaultDeviceFrame: true,
  settings: SETTINGS,
  render,
};

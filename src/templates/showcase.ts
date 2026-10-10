import { buildTokens } from "../design/tokens.js";
import { headline, headlineVars } from "../design/primitives.js";
import { renderDevice } from "../design/device.js";
import { numberSetting } from "./settings.js";
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

/**
 * "Showcase" — the interface itself is the hero.
 *
 * No device: two layered views of the real UI. A dimmed background copy
 * breaks the top edge of an elevated slab; the crisp foreground copy sits
 * in front of it with a deep shadow. The offset direction alternates with
 * the sequence position.
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
    key: "shotScale",
    type: "number" as const,
    default: 1,
    min: 0.8,
    max: 1.15,
    description: "Screenshot size multiplier (0.8-1.15).",
  },
  {
    key: "layers",
    type: "boolean" as const,
    default: true,
    description: "Show the dimmed background layer behind the main screenshot.",
  },
] as const;

function render(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const tokens = buildTokens(ctx.theme);
  const headlineScale = numberSetting(SETTINGS, ctx.settings, "headlineScale");
  const shotScale = numberSetting(SETTINGS, ctx.settings, "shotScale");
  const layers = ctx.settings["layers"] !== false;
  const flip = ctx.index % 2 === 1;

  const front = renderDevice({
    image: ctx.image,
    mode: "bare",
    maxWidth: w * 0.68 * shotScale,
    maxHeight: h * 0.44 * shotScale,
  });
  const back = renderDevice({
    image: ctx.image,
    mode: "bare",
    maxWidth: w * 0.8 * shotScale,
    maxHeight: h * 0.5 * shotScale,
  });

  const head = headline({
    ctx,
    tokens,
    style: "display",
    kicker: "chip",
    sizes: { kicker: w * 0.022, title: w * 0.076, subtitle: w * 0.028 },
    lines: { title: 2, subtitle: 2 },
    scale: headlineScale,
    subtitleMaxWidth: w * 0.66,
  });

  const slabTop = h * 0.42;

  const css = `
.shot-showcase {
  position: absolute;
  inset: 0;
  background: ${tokens.bg};
  ${headlineVars(tokens, "display", h * 0.018, h * 0.02)}
}
.sh-head { position: absolute; top: ${px(h * 0.085)}; inset-inline-start: ${px(w * 0.085)}; z-index: 3; max-width: ${px(w * 0.8)}; }
.sh-slab {
  position: absolute;
  top: ${px(slabTop)};
  left: 0; right: 0; bottom: 0;
  background: ${tokens.surface};
  border-top: 1px solid ${tokens.line};
  border-radius: ${px(w * 0.055)} ${px(w * 0.055)} 0 0;
  box-shadow: 0 -${px(h * 0.012)}px ${px(w * 0.05)}px ${tokens.blackShadow(tokens.mode === "dark" ? 0.35 : 0.12)};
}
.sh-slab::before {
  content: "";
  position: absolute;
  top: ${px(h * 0.045)};
  inset-inline: ${px(w * 0.09)};
  height: 1px;
  background: ${tokens.lineSoft};
}
.sh-back {
  position: absolute;
  top: ${px(slabTop - h * 0.085)};
  ${flip ? "inset-inline-end" : "inset-inline-start"}: ${px(w * 0.06)};
  z-index: 1;
  filter: brightness(0.62) saturate(0.9);
}
.sh-back::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(to ${flip ? "inline-start" : "inline-end"}, transparent 40%, ${tokens.surface} 96%);
  opacity: 0.55;
}
.sh-front {
  position: absolute;
  bottom: ${px(h * 0.085)};
  ${flip ? "inset-inline-start" : "inset-inline-end"}: ${px(w * 0.085)};
  z-index: 2;
}
`;

  const html = `
<div class="shot shot-showcase">
  <div class="sh-head">${head}</div>
  <div class="sh-slab"></div>
  ${layers ? `<div class="sh-back">${back.html}</div>` : ""}
  <div class="sh-front">${front.html}</div>
</div>`;

  return { css, html };
}

export const showcaseTemplate: TemplateDefinition = {
  id: "showcase",
  name: "Product Showcase",
  description:
    "The interface is the hero: a dimmed layer of the real UI breaks the top edge of an elevated slab while the crisp foreground view sits in front of it. No device frame.",
  defaultDeviceFrame: false,
  settings: SETTINGS,
  render,
};

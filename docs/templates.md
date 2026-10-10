# Template authoring guide

StoreShot templates are TypeScript modules that turn a render context into
HTML + CSS. There is no plugin system to learn — a template is a pure
function, which makes them easy to review, test and pixel-compare.

## Anatomy

A template lives in `src/templates/<name>.ts` and exports a
`TemplateDefinition`:

```ts
import { px, type TemplateContext, type TemplateDefinition } from "./types.js";

const SETTINGS = [
  {
    key: "cornerRadius",
    type: "number" as const,
    default: 0.03,
    min: 0,
    max: 0.1,
    description: "Screenshot corner radius as a fraction of canvas width.",
  },
] as const;

function render(ctx: TemplateContext) {
  const { width: w, height: h } = ctx.canvas;
  const radius = w * 0.03;

  const css = `
.shot-mytemplate { position: absolute; inset: 0; background: ${ctx.theme.background}; }
.shot-mytemplate .app-shot { border-radius: ${px(radius)}; }`;

  const html = `
<div class="shot shot-mytemplate">
  <img class="app-shot" src="${ctx.image.url}" alt="${ctx.image.alt}">
</div>`;

  return { css, html };
}

export const myTemplate: TemplateDefinition = {
  id: "my-template",
  name: "My Template",
  description: "One sentence that sells the layout.",
  defaultDeviceFrame: false,
  settings: SETTINGS,
  render,
};
```

Register it in `src/templates/registry.ts` and add a visual test case +
baseline (`test/visual/render.test.ts`).

## The render context

| Field                               | What it gives you                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ctx.app`                           | `name`, optional `tagline`/`story`.                                                                          |
| `ctx.locale`, `ctx.lang`, `ctx.dir` | Resolved locale (`ar`), primary language, `"ltr"`/`"rtl"`.                                                   |
| `ctx.texts`                         | `{ title?, subtitle? }` already resolved for this locale, HTML-safe handling included (use `textBlockHtml`). |
| `ctx.theme`                         | `background`, `accent`, `text`, `muted` — user's colors.                                                     |
| `ctx.image`                         | Screenshot `url` (sandbox-relative), natural `width`/`height`, `alt`.                                        |
| `ctx.deviceFrame`                   | Whether to draw the phone frame (template default or per-screenshot override).                               |
| `ctx.settings`                      | User settings — always read through `SETTINGS` accessors.                                                    |
| `canvas`                            | Exact export pixel size. **All sizes must derive from it** (`w * 0.08` etc.), never absolute pixels.         |

## Hard rules

1. **RTL mirroring is automatic — keep it that way.** Use CSS logical
   properties (`inset-inline-start`, `padding-inline-end`,
   `margin-block-start`, `text-align: start`). The page already carries
   `dir="rtl"` for RTL locales. If you must differ per direction, use
   `[dir="rtl"]` selectors — never re-order or reverse user text.
2. **Never clamp text.** Emit kicker/title/subtitle through
   `textBlockHtml(ctx, sizes, lines)`; it adds the `data-field` and
   `data-max-height` attributes the overflow validator measures. Text blocks
   must not use `overflow: hidden`, fixed heights or `-webkit-line-clamp`.
3. **Never crop the app screenshot.** The screenshot is the user's real UI.
   Use `object-fit: contain`, or the shared `deviceFrame()` helper which
   sizes the frame to the image's exact aspect ratio.
4. **No network, no external files.** Only `ctx.image.url` and the injected
   `@font-face` families. Anything else is aborted at render time.
5. **Derive every size from the canvas.** The same template must look right
   at 720×1280 and 2064×2752.
6. **Round to whole pixels** with `px()` — sub-pixel layout is a source of
   cross-platform drift.
7. **Don't `letter-spacing` Arabic.** Tracking breaks glyph connections.
   Use `[dir="ltr"] { letter-spacing: … }` and keep RTL at `0.01em` or none.

## Typography helpers

- `textBlockHtml(ctx, sizes, lines)` — kicker (app name) + title + subtitle
  with measurement attributes. `sizes` are font sizes in px, `lines` the
  per-field line budgets.
- `fontStack(dir)` from `src/render/html.ts` already orders the Arabic and
  Latin families correctly for the page direction.
- Available weights: 400, 600, 700 (`regular`, `semibold`, `bold`).

## Settings

Declare every setting with type, default and (for numbers) a range. Read
values only through `numberSetting` / `boolSetting`; unknown keys produce a
validation warning automatically via `unknownSettingKeys`.

## Testing your template

1. Add a case to `cases` in `test/visual/render.test.ts`.
2. `npm run test:visual:update` to write baselines for your platform.
3. `npm test` — the suite asserts exact dimensions, loaded fonts, no
   overflow, non-blank output, determinism and baseline parity.

Look at `src/templates/minimal.ts` (smallest), `gradient.ts` (decorations)
and `device-focus.ts` (device frame) for working examples.

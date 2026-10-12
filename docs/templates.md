# Template authoring guide

StoreShot templates are TypeScript modules that turn a render context into
HTML + CSS. A template is a pure function over `(context) → {css, html}` —
no plugin system, no build step, fully deterministic.

## The library

| id | family | default device | settings |
| --- | --- | --- | --- |
| `editorial` | Editorial Swiss | `front` | `headlineScale`, `deviceScale`, `deviceMode` |
| `cinematic` | Dark Cinematic | `front` | `headlineScale`, `deviceScale`, `reflection`, `deviceMode` |
| `cinematic-3d` | Dark Cinematic | `angled` (perspective, metal edges) | `headlineScale`, `deviceScale`, `variation`, `deviceMode` |
| `swiss` | Editorial Swiss | `bare` | `headlineScale`, `deviceScale`, `grid`, `deviceMode` |
| `campaign` | Bold Brand Campaign | `angled` | `headlineScale`, `deviceScale`, `band`, `deviceMode` |
| `immersive` | Bold Brand Campaign | `angled` + twin | `headlineScale`, `deviceScale`, `twin`, `deviceMode` |
| `showcase` | Bold Brand Campaign | layered bare | `headlineScale`, `shotScale`, `layers` |
| `discovery` | — (Apple-inspired) | framed + layered | `headlineScale`, `deviceScale`, `ghostType`, `deviceMode` |
| `atelier` | Warm Premium | `front` | `headlineScale`, `deviceScale`, `variation`, `deviceMode` |
| `aurora` | Vibrant Gradient | `angled` (light-field rim) | `headlineScale`, `deviceScale`, `variation`, `deviceMode` |
| `linea` | Minimal Product | `front` (plinth) | `headlineScale`, `deviceScale`, `variation`, `deviceMode` |
| `tilt` | Dynamic Composition | `front` (2D-rotated, bleeding) | `headlineScale`, `deviceScale`, `tilt`, `variation`, `deviceMode` |
| `float` | Dynamic Composition | `front` + optional decor | `headlineScale`, `deviceScale`, `deviceMode` |
| `strata` | Dynamic Composition | `angled` (layered slab) | `headlineScale`, `deviceScale`, `variation`, `deviceMode` |

Every family is a distinct design system — typography voice, composition
rules, background treatment and device presentation — not a palette swap of
one layout. The showcase in [`gallery/families`](gallery/families) renders
the same app through all six.

Common settings: `headlineScale` (0.8–1.25), `deviceScale` (0.8–1.15),
`deviceMode` (`"auto" | "bare" | "front" | "angled"`; `auto` follows the
screenshot's `deviceFrame` flag). `"template": "auto"` delegates selection
to the deterministic art-direction rules (`app.category` + supplied decor +
export orientation) — see [configuration](configuration.md).

Pre-v0.2 ids (`minimal`, `gradient`, `device-focus`, `spotlight`) resolve to
their redesigns (`swiss`, `campaign`, `immersive`, `cinematic`) with a
deprecation notice.

## Architecture layers

```
src/design/tokens.ts       theme → design tokens (modes, surfaces, shadows, lines)
src/design/device.ts       device rendering: bare / front / angled (+ twin, ground)
src/design/primitives.ts   headline blocks (5 typographic characters), masthead, chips
src/design/composition.ts  z-ordered layers, 2D transforms, decor assets, backgrounds
src/design/direct.ts       deterministic template selection ("auto")
src/templates/*.ts         one file per template: composition rules only
src/render/html.ts         document shell, font stacks, shared component CSS
```

Templates should compose these layers, not re-derive them.

## The render context

| Field | What it gives you |
| --- | --- |
| `ctx.app` | `name`, optional `tagline`/`story`. |
| `ctx.locale`, `ctx.lang`, `ctx.dir` | Resolved locale, primary language, `"ltr"`/`"rtl"`. |
| `ctx.texts` | `{ title?, subtitle? }` resolved for this locale. |
| `ctx.theme` | User colors + `surface`/`mode` token inputs — always go through `buildTokens(ctx.theme)`. |
| `ctx.image` | Screenshot `url`, natural `width`/`height`, `alt`. |
| `ctx.decor` | Decorative assets for this screenshot: `{ id, url, width, height, alt }[]` — place them with `decorLayer()`; may be empty. |
| `ctx.deviceFrame` | The screenshot's frame flag — feed it to `resolveDeviceMode(...)` unless your template has a fixed presentation. |
| `ctx.settings` | User settings — read only through the `SETTINGS` accessors. |
| `ctx.index`, `ctx.count` | Sequence position — the ONLY sanctioned source of variation. |
| `ctx.role` | Optional semantic role from the config (`"hero"`, `"trust"`…). |
| `ctx.canvas` | Exact export pixel size. Derive every dimension from it. |

## Hard rules

1. **RTL is structural.** Use CSS logical properties; the page carries
   `dir`. Do not mirror the app screenshot, device hardware, or rotations
   that represent physical objects. Split per-direction styling with
   `[dir="rtl"]` selectors. Never reorder or reverse user text.
2. **Text goes through `headline()`**, which attaches the `data-field` /
   `data-max-height` measurement attributes. Never clamp, shrink or
   line-clamp text — the validator fails the build instead.
3. **The screenshot is sacred.** `object-fit: cover` only inside
   `renderDevice` (the slot is sized to the exact aspect, so nothing is
   cropped). Never stretch, filter into illegibility, or cover UI without a
   deliberate, documented reason.
4. **All sizes derive from the canvas** and round through `px()`. The same
   template must look right at 720×1280 and 2064×2752.
5. **Variation comes from `ctx.index` only.** Deterministic in, identical
   pixels out — no randomness, no dates, no environment reads.
6. **No network, no absolute paths.** Only `ctx.image.url` and the injected
   `@font-face` families.
7. **Interface-inspired marketing layers** (search bars, chips) are marketing, not app UI: render them outside the screenshot, source their text from localized config fields (`texts.prompt`), and make them conditional — never add a search bar to an app that has no search.
8. **No letter-spacing on Arabic** (`[dir="ltr"]` selectors only) — tracking
   breaks glyph connections.

## Device modes

```ts
import { renderDevice, resolveDeviceMode } from "../design/device.js";

const mode = resolveDeviceMode(
  stringSetting(SETTINGS, ctx.settings, "deviceMode"),
  ctx.deviceFrame,
  "front", // what "auto + deviceFrame" means for this template
);

const device = renderDevice({
  image: ctx.image,
  mode,
  maxWidth: w * 0.6,
  maxHeight: h * 0.47,
  ...(mode === "angled" ? { rotateY: tilt, rotateZ: -3 } : {}),
});
```

`renderDevice` guarantees: exact screen aspect, chrome stays inside the
slot, layered realistic shadows, optional glare/island/home-indicator/back
layer/ground shadow. `device.html` is a self-contained block you position
with absolute/flow layout; `device.width/height` tell you what it measured.

## Layers, transforms and decor

`src/design/composition.ts` carries the layered-composition contract:

```ts
import { layer, decorLayer, rotatedBounds, fieldBackground, ringLayer } from "../design/composition.js";

// Explicit z-order, px positioning (physical or RTL-mirrored logical
// edges), 2D rotate/scale, intentional bleed:
const deviceLayer = layer(device.html, {
  insetInlineEnd: -w * 0.06, top: h * 0.4, rotate: -13, z: 2, bleed: true,
});

// rotatedBounds(w, h, deg, scale) = the axis-aligned box the bounds
// checker measures — use it to decide whether bleed is honest.
const box = rotatedBounds(device.width, device.height, -13);

// Optional transparent PNG/WebP from the config's `decor` list:
const accent = ctx.decor.length > 0
  ? decorLayer(ctx.decor[0]!, { left: 40, top: 60, width: 90, rotate: -8, z: 3 })
  : ringLayer({ cx: 80, cy: 100, diameter: 120, stroke: 8, color: tokens.accentGlow(0.4), z: 1 });
```

- `.dev`, `.deco` and `[data-field]` elements are bounds-checked **after**
  transforms; `data-bleed="true"` (the `bleed` option) marks a crop
  intentional. Never put text in a bleed layer.
- Decor renders at natural aspect — rotate and scale the `.deco` wrapper,
  never the image's own aspect.
- `fieldBackground(tokens, "solid" | "wash" | "beam")` builds the
  background; `bandLayer`/`ringLayer` are the geometric treatments.

## Headlines

```ts
import { headline, headlineVars } from "../design/primitives.js";

const head = headline({
  ctx, tokens, style: "editorial",       // editorial|swiss|campaign|cinematic|display
  kicker: "overline",                    // overline|chip|masthead|none
  sizes: { kicker: w * 0.024, title: w * 0.092, subtitle: w * 0.03 },
  lines: { title: 3, subtitle: 2 },      // layout budgets — be honest here
  scale: headlineScale,
  subtitleMaxWidth: w * 0.62,
});
// css: `.shot-x { ${headlineVars(tokens, "editorial", gap, gapS)} ... }`
```

The display font (`--font-display`) is Fraunces on LTR pages and IBM Plex
Sans Arabic on RTL pages, with graceful cross-fallthrough for mixed text.

## Testing

1. Add a case to `cases` in `tests/visual/render.test.ts` (use `title`/
   `subtitle`/`theme` overrides for Arabic long-copy and light-mode cases).
2. `npm run test:visual:update` writes per-platform baselines; commit them.
3. `npm test` asserts dimensions, fonts loaded, no overflow, non-blank
   output, determinism and baseline parity.

Working examples, smallest to largest: `showcase.ts`, `swiss.ts`,
`cinematic.ts`, `editorial.ts`.

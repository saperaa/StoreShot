# Before / after — v0.1 → today

Same example app, same source screenshots, same CLI command. Left: the v0.1
templates (centered text on colored rectangles). Right: the current creative
system — art-directed templates, realistic device rendering, A/B sequence
layouts, and the Apple-inspired Discovery template with localized
interface-inspired layers. English and Arabic examples, all rendered by the
real CLI.

### v0.1 "gradient" → today's "campaign"

| v0.1 | Today |
| --- | --- |
| ![v0.1 gradient](before-after/before/v1-gradient.png) | ![v4 campaign](before-after/after/v4-campaign.png) |

### v0.1 "minimal" → today's "editorial"

| v0.1 | Today |
| --- | --- |
| ![v0.1 minimal](before-after/before/v1-minimal.png) | ![v4 editorial](before-after/after/v4-editorial.png) |

### Arabic, v0.1 "spotlight" → today's "editorial"

| v0.1 | Today |
| --- | --- |
| ![v0.1 spotlight ar](before-after/before/v1-spotlight-ar.png) | ![v4 editorial ar](before-after/after/v4-editorial-ar.png) |

### New in the current system — "discovery" (Apple-inspired, with a localized search layer)

![Discovery template](before-after/after/v4-discovery.png)

Reproduce everything on the right:

```bash
npm install && npm run build && npx playwright-core install chromium
node scripts/build-gallery.mjs
```

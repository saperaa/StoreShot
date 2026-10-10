# Before / after — the v0.2 redesign

Same example app, same source screenshots, same CLI command. Left: v0.1
templates (centered text on colored rectangles, flat CSS "frames"). Right:
the v0.2 art-directed system (design tokens, realistic device rendering,
sequence-aware compositions).

### v0.1 "gradient" → v0.2 "campaign"

| Before | After |
| --- | --- |
| ![v0.1 gradient](before-after/before/v1-gradient.png) | ![v0.2 campaign](before-after/after/v2-campaign.png) |

### v0.1 "minimal" → v0.2 "swiss"

| Before | After |
| --- | --- |
| ![v0.1 minimal](before-after/before/v1-minimal.png) | ![v0.2 swiss](before-after/after/v2-swiss.png) |

### v0.1 "spotlight" → v0.2 "editorial"

| Before | After |
| --- | --- |
| ![v0.1 spotlight](before-after/before/v1-spotlight.png) | ![v0.2 editorial](before-after/after/v2-editorial.png) |

Reproduce the "after" column:

```bash
npm install && npm run build && npx playwright-core install chromium
node scripts/build-gallery.mjs
```

The old template ids still render (mapped to their redesigns, with a
deprecation notice); see the changelog for the mapping.

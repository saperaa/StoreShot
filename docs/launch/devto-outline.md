# dev.to / blog article outline
# Write the article from this outline — do not paste it raw.

**Working title:** "I built an offline, deterministic alternative to cloud
screenshot generators — because Arabic apps deserve store pages too"

**Angle:** personal build story → the two hard technical problems → honest
limitations. Developer audience, not marketing.

1. **Hook** — the combinatorial screenshot problem (stores × locales ×
   sizes) and why the available tools failed me: Ruby pipelines that break
   Arabic ligatures, SaaS that wants the unreleased app in the cloud.
2. **Constraint-driven design** — deterministic local rendering (Chromium),
   config-as-code, CI-safe output. Why determinism matters for regression
   testing screenshots.
3. **RTL as a first-class citizen** — the actual hard part: shaping,
   direction, why you never mirror a phone, and why Arabic needs its own
   layout metrics instead of mirrored coordinates. Include a real EN/AR
   pair: docs/gallery/flagship/app-store-iphone-6-3/en-US/01-home.png vs
   docs/gallery/flagship/app-store-iphone-6-3/ar/04-focus.png
4. **Geometry validation** — measuring rendered text in the browser after
   fonts load; failing builds on clipped headlines or text over app UI.
   Show a real violation message.
5. **What it doesn't do** (credibility) — no design-tool replacement, no
   automatic copywriting, browser download on first run.
6. **Close** — repo, npm, "issue templates welcome, RTL bug reports
   especially".

**Rules:** real screenshots from docs/gallery/, real CLI output blocks, no
feature claims beyond the README, disclose authorship ("I built this").

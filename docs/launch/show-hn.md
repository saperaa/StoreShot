# Show HN draft (news.ycombinator.com)

**Title:** Show HN: StoreShot – Open-source CLI for App Store & Google Play screenshots

**Text:**

Hi HN — I open-sourced a CLI that turns raw app screenshots into store-ready
marketing images: https://github.com/saperaa/StoreShot

Why I built it: shipping for two app stores × several locales × five device
sizes means hundreds of near-identical PNGs, and the existing options were
either Ruby toolchains that break on Arabic text or SaaS uploaders that want
your unreleased app in the cloud. StoreShot renders locally with Chromium,
deterministically, from one JSON config — Arabic/RTL is a first-class
citizen (proper shaping through Chromium's text engine, never string
reversal), not a mirror-flip afterthought.

Six art directions are genuinely different design systems, not background
swaps (Dark Cinematic · Editorial Swiss · Bold Campaign · Warm Premium · Vibrant Gradient · Minimal Product). Output is verified at exact store dimensions — Apple's
21:9 product-page headers, 3:2 search creatives, 16:9 universals and Google
Play feature graphics included — and text that would clip fails the build
instead of shipping ugly.

Try it:

    npm install --save-dev storeshot-cli && npx storeshot install && npx storeshot init

MIT, TypeScript, zero cloud. Happy to answer anything about the RTL
handling or the geometry validation — those were the hard parts.

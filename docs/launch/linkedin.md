# LinkedIn draft (personal profile — link in first comment per etiquette)

I just open-sourced StoreShot — a CLI that turns raw app screenshots into
store-ready marketing images for the App Store and Google Play. 📱

The problem it solves is one every mobile team knows: every release
regenerates the same screenshots across stores, locales and device sizes —
and the existing tools either choke on right-to-left text or want your
unreleased app uploaded to someone's cloud.

StoreShot takes a different angle:

→ Local & deterministic — renders with Chromium on your machine, same
pixels every run, safe for CI.
→ Arabic/RTL as a first-class citizen — real text shaping, dedicated RTL
layout metrics, not mirrored English.
→ Layout validation — if a headline would clip the canvas or sit on top of
your app UI, the build fails. Ugly output never ships.
→ Six genuinely different art directions, from dark cinematic to warm
paper to minimal product.

MIT licensed, TypeScript, zero dependencies on external services:
https://github.com/saperaa/StoreShot

If you ship mobile apps — especially bilingual ones — I'd genuinely value
your feedback on the RTL handling.

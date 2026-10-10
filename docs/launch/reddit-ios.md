# Reddit draft — r/iOSProgramming
# Read the sub rules + participate in threads BEFORE posting. No link in the title.

**Title:** I open-sourced a local CLI that generates App Store screenshots (incl. the new 21:9 headers and 3:2 search creatives) — Arabic/RTL done properly

**Body:**

Every release I used to rebuild the same screenshots in a design tool:
5 frames × 2 locales × the device sizes du jour, plus Apple's newer creative
assets (3840×1646 headers, 5244×2950 universal, 3840×2560 search). So I
built a CLI that does it from one JSON config, rendering locally with
Chromium — nothing uploads anywhere, output is deterministic.

What made it worth sharing here:

- The new Apple creative assets are first-class profiles, verified against
  Apple's spec pages (dimensions dated in the repo).
- App Store validation is built in: it measures the rendered text in the
  actual browser and FAILS the build if a headline would clip the canvas or
  overlap the phone — catching the stuff you normally notice after upload.
- A single config renders every locale; Arabic gets its own layout metrics,
  not mirrored English coordinates.

Six art directions ship with it (Dark Cinematic · Editorial Swiss · Bold Campaign · Warm Premium · Vibrant Gradient · Minimal Product), and it does Google Play
feature graphics with the same engine.

Repo (MIT): https://github.com/saperaa/StoreShot
npm: https://www.npmjs.com/package/storeshot-cli

Happy to go deep on any part — the geometry validation and RTL typography
are the interesting bits.

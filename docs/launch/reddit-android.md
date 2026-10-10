# Reddit draft — r/androiddev
# Read the sub rules + participate in threads BEFORE posting.

**Title:** Open-sourced a CLI for Google Play screenshots (and App Store) that renders locally — no uploads, no SaaS

**Body:**

Store listings for us meant: screenshot sizes per device, a 1024×500
feature graphic, localized listings, and either a design tool marathon or a
SaaS that wants the unreleased build in the cloud. So I open-sourced the
tool I wanted: one JSON config in, verified-size PNGs out, rendered locally
with Chromium.

- Google Play feature graphic (1024×500) and phone/tablet screenshots are
  first-class profiles; Apple's formats come from the same engine.
- Multi-locale from one config — including proper Arabic/RTL (Chromium does
  the text shaping; layouts get their own RTL metrics, phones never get
  mirrored).
- Layout validation: marketing text that would clip or overlap the app UI
  fails the build with a message naming the exact field and locale.
- Deterministic: same config, same pixels — safe for CI.

    npm install --save-dev storeshot-cli && npx storeshot install && npx storeshot init

Repo (MIT): https://github.com/saperaa/StoreShot · npm: https://www.npmjs.com/package/storeshot-cli

# X/Twitter thread draft (post images with the tweets — paths below)

1/ I open-sourced a CLI that generates App Store & Google Play screenshots
from one JSON config — locally, deterministically, with Arabic/RTL done
properly.

https://github.com/saperaa/StoreShot

🧵 Why it exists ↓

2/ Every release = the same screenshots, rebuilt: stores × locales × device
sizes. Tools either break on RTL text or upload your unreleased app to a
cloud renderer. StoreShot does it locally with Chromium. Same config, same
pixels — CI-safe.

3/ Six art directions, actually different design systems — typography,
composition, device treatment all change:

[image: docs/gallery/families/dark-cinematic/p/en-US/01-hero.png]
[image: docs/gallery/families/warm-premium/p/en-US/01-hero.png]

4/ Arabic is not mirrored English — it gets its own layout metrics, real
text shaping, and copy budgets that don't clip:

[image: docs/gallery/flagship/app-store-iphone-6-3/ar/04-focus.png]

5/ And the part I'm proudest of: geometry validation. Marketing text that
would clip the canvas, overlap the phone, or hide the app UI fails the
build with the exact field named. Ugly screenshots don't ship.

6/ Try it:

npm install --save-dev storeshot-cli
npx storeshot install && npx storeshot init

MIT · TypeScript · zero cloud
https://github.com/saperaa/StoreShot · https://www.npmjs.com/package/storeshot-cli

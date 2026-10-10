# Store export profiles

Every profile records **when it was verified and against which official
page**. Re-check the linked source before a release if the date is old, and
open a PR with the updated numbers + date when they change.

## App Store (Apple)

Source: [Screenshot specifications — App Store Connect Help](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
Verified: **2026-10-10**

| Profile      | Pixels (portrait) | Class / notes                                                                                        |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `iphone-6-3` | 1206 × 2622       | Dynamic Island medium display — **currently required** iPhone size class. 1179 × 2556 also accepted. |
| `iphone-6-9` | 1320 × 2868       | Dynamic Island large display. 1260 × 2736 and 1290 × 2796 also accepted.                             |
| `ipad-13`    | 2064 × 2752       | Required when the app supports iPad. 2048 × 2732 also accepted.                                      |

Rules from the same page:

- JPEG or PNG, **no alpha channel or transparency**.
- Minimum 1 screenshot per required device size; up to 10 per device size.
- Provide the largest size you have — App Store Connect scales down to
  smaller devices automatically.
- Landscape sizes are the same numbers rotated; StoreShot currently ships
  portrait profiles only (landscape is a matter of swapping width/height
  via `exports[].size` if you need it today).

## Google Play

Source: [Use store listings to showcase your app — Play Console Help](https://support.google.com/googleplay/android-developer/answer/1078870)
Verified: **2026-10-10**

| Profile  | Pixels      | Notes                                                 |
| -------- | ----------- | ----------------------------------------------------- |
| `phone`  | 1080 × 1920 | Comfortably inside Play's dimension and ratio limits. |
| `tablet` | 1600 × 2560 | For tablet device types.                              |

Rules from the same page (enforced by StoreShot for custom sizes):

- JPEG or **24-bit PNG (no alpha)**.
- Minimum dimension 320 px, maximum 3840 px.
- The longest side can be at most **2×** the shortest side.
- Minimum **2 screenshots** to publish a listing; up to 8 per device type.

## What StoreShot does NOT check

Correct dimensions do not guarantee a compliant listing. You remain
responsible for:

- Store policies on screenshot authenticity (screenshots must show the real
  app UI).
- Alpha-free exports (StoreShot composites opaque backgrounds, so outputs
  have no alpha — but re-encoding through other tools can change that).
- Apple's minimum-screenshot and device-class coverage requirements for a
  submission.
- Play's policy that screenshots must not look like ads.

## Adding a profile

Profiles are data, not code — see `src/profiles/storeProfiles.ts`. Add the
entry with `verifiedOn` (today) and the exact `sourceUrl` you checked, add a
unit test, and update this file.

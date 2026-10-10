# Configuration reference

StoreShot reads a single JSON file — `storeshot.config.json` (or `storeshot.json`) — from the project directory. Relative paths inside the file resolve against **the config file's directory**, not the working directory.

Editor autocompletion: add `"$schema": "./node_modules/storeshot-cli/schema.json"` as the first key. The schema is also published at `storeshot-cli/schema.json`.

## Complete example

```jsonc
{
  "$schema": "./node_modules/storeshot-cli/schema.json",
  "configVersion": 1,
  "app": {
    "name": "Qamar",
    "tagline": "Tasks that flow with your day",
    "story": "A calm task manager for people who plan tomorrow the night before.",
  },
  "locales": ["en-US", "ar", "ar-EG"],
  "direction": { "ar-EG": "rtl" },
  "template": { "id": "gradient", "settings": { "glow": 0.8 } },
  "theme": {
    "background": "#0E1524",
    "accent": "#62E6B5",
    "text": "#FFFFFF",
    "mutedText": "#9AA7BD",
  },
  "fonts": {
    "latin": { "regular": "./fonts/Inter-Regular.ttf", "bold": "./fonts/Inter-Bold.ttf" },
    "arabic": { "regular": "./fonts/Cairo-Regular.ttf", "bold": "./fonts/Cairo-Bold.ttf" },
  },
  "screenshots": [
    {
      "id": "home",
      "image": "./screens/home.png",
      "title": { "en-US": "Everything in one place", "ar": "كل ما تحتاجه في مكان واحد" },
      "subtitle": { "en-US": "Plan your day in seconds", "ar": "خطّط يومك في ثوانٍ" },
      "deviceFrame": true,
    },
  ],
  "exports": [
    { "store": "app-store", "profile": "iphone-6-3", "name": "ios", "outputDir": "./store/ios" },
    { "store": "google-play", "profile": "phone", "size": { "width": 1080, "height": 1920 } },
  ],
  "output": { "dir": "./storeshots", "clean": false },
}
```

## Top-level fields

| Field           | Type             | Default      | Description                                                             |
| --------------- | ---------------- | ------------ | ----------------------------------------------------------------------- |
| `$schema`       | string           | —            | JSON Schema path for editor support.                                    |
| `configVersion` | `1`              | `1`          | Schema version. Only `1` exists.                                        |
| `app`           | object           | required     | App identity, see below.                                                |
| `locales`       | string[]         | `["en-US"]`  | BCP-47 style tags, e.g. `en-US`, `ar`, `ar-EG`, `fr`.                   |
| `direction`     | map              | `{}`         | Per-locale direction overrides (`"ltr"`/`"rtl"`). Keys are locale tags. |
| `template`      | string \| object | `"gradient"` | Template id, or `{ "id", "settings" }`.                                 |
| `theme`         | object           | see below    | Colors.                                                                 |
| `fonts`         | object           | bundled Plex | Per-script font files.                                                  |
| `screenshots`   | array            | required     | ≥ 1 entry, ordered — order defines output numbering.                    |
| `exports`       | array            | required     | ≥ 1 export profile.                                                     |
| `output`        | object           | see below    | Output location.                                                        |

### `app`

- `name` (required) — appears as the kicker above every title.
- `tagline` (optional) — reserved branding metadata; not rendered.
- `story` (optional) — one or two sentences about what the app does and for whom. Kept with the project so copy editors and translators have context. Not rendered.

### `theme`

All values are hex colors (`#RGB` or `#RRGGBB`).

- `background` (default `#0E1524`) — canvas background.
- `accent` (default `#62E6B5`) — highlights, chips, rules, decorations.
- `text` (default `#FFFFFF`) — title color.
- `mutedText` (default `#9AA7BD`) — subtitle color.

The validator warns when `text` on `background` has a WCAG contrast ratio below 3:1.

### `fonts`

Each family accepts `regular`, `semibold` and `bold` file paths (TTF/OTF). Missing files fall back to the bundled font for that weight with a warning. If your custom font contains both Latin and Arabic glyphs you can point both families at the same files.

Bundled defaults: **IBM Plex Sans** (Latin) and **IBM Plex Sans Arabic**, both SIL OFL 1.1.

### `screenshots[]`

- `id` (required) — slug used in output file names: letters, digits, `-`, `_`.
- `image` (required) — path to a PNG/JPEG/WebP screenshot of _your app_. StoreShot never modifies the image content; it composes the marketing frame around it.
- `title`, `subtitle` (optional) — a plain string (applies to all locales) or a per-locale map. When a map, every configured locale must have an entry (exact tag or primary language, e.g. `ar` covers `ar-EG`); missing ones fail validation.
- `deviceFrame` (optional) — per-screenshot override of the template default.

### `exports[]`

- `store` — `"app-store"` or `"google-play"`.
- `profile` — a profile id from the table in [`store-profiles.md`](store-profiles.md).
- `size` (optional) — custom `{ "width", "height" }` in pixels (16–8000). Google Play's published limits (320–3840px per side, longest ≤ 2× shortest) are enforced; App Store custom sizes produce a warning.
- `name` (optional) — sub-directory name inside the output root. Defaults to `<store>-<profile>`. Must be unique across exports.
- `outputDir` (optional) — per-export output directory override.

### `output`

- `dir` (default `./storeshots`) — output root.
- `clean` (default `false`) — delete each export's output directory before generating.

## Output layout

```
<output.dir>/<export.name>/<locale>/<NN>-<screenshot.id>.png
storeshots/app-store-iphone-6-3/ar/01-home.png
```

`NN` is the 1-based, zero-padded position in `screenshots` — stable, deterministic ordering.

## Exit codes

| Code | Meaning                                                            |
| ---- | ------------------------------------------------------------------ |
| 0    | Success (warnings allowed).                                        |
| 1    | Configuration or validation error — fix the project.               |
| 2    | Rendering/runtime error (browser missing, asset IO during render). |

Environment variables: `STORESHOT_BROWSER_CHANNEL` (use an installed browser, e.g. `msedge`), `STORESHOT_DEBUG=1` (stack traces).

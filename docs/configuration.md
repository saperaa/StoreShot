# Configuration reference

StoreShot reads a single JSON file — `storeshot.config.json` (or `storeshot.json`) — from the project directory. Relative paths inside the file resolve against **the config file's directory**, not the working directory.

Editor autocompletion: add `"$schema": "./node_modules/storeshot-cli/schema.json"` as the first key.

## Complete example

```jsonc
{
  "$schema": "./node_modules/storeshot-cli/schema.json",
  "configVersion": 1,
  "app": {
    "name": "Qamar",
    "tagline": "Tasks that flow with your day",
    "story": "A calm task manager for people who plan tomorrow the night before."
  },
  "locales": ["en-US", "ar"],
  "direction": { "ar": "rtl" },
  "template": { "id": "editorial", "settings": { "headlineScale": 1.1 } },
  "theme": {
    "background": "#0E1524",
    "accent": "#62E6B5",
    "text": "#FFFFFF",
    "mutedText": "#9AA7BD",
    "mode": "auto"
  },
  "fonts": {
    "display": { "regular": "./fonts/MySerif.ttf" }
  },
  "screenshots": [
    {
      "id": "home",
      "role": "hero",
      "image": "./screens/home.png",
      "title": { "en-US": "Everything in one place", "ar": "كل ما تحتاجه في مكان واحد" },
      "subtitle": { "en-US": "Plan your day in seconds", "ar": "خطّط يومك في ثوانٍ" },
      "deviceFrame": true
    }
  ],
  "exports": [
    { "store": "app-store", "profile": "iphone-6-3", "name": "ios" },
    { "store": "google-play", "profile": "phone", "size": { "width": 1080, "height": 1920 } }
  ],
  "output": { "dir": "./storeshots", "clean": false }
}
```

## Top-level fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `$schema` | string | — | JSON Schema path for editor support. |
| `configVersion` | `1` | `1` | Schema version. Only `1` exists. |
| `app` | object | required | `name` (rendered as the kicker), optional `tagline` and `story` (kept for editors/translators, not rendered), optional `category` (feeds `"template": "auto"`). |
| `locales` | string[] | `["en-US"]` | BCP-47 style tags. `ar`, `he`, `fa`, `ur` and more default to RTL automatically. |
| `direction` | map | `{}` | Per-locale direction overrides (`"ltr"`/`"rtl"`); a language key (`"ar"`) covers regional tags (`"ar-EG"`). |
| `template` | string \| object | `"gradient"` (alias of `campaign`) | Template id, `{ "id", "settings" }`, or `"auto"` for deterministic art direction (below). |
| `theme` | object | see below | Design-token inputs. |
| `fonts` | object | bundled | Per-family font files: `latin`, `arabic`, `display`. |
| `screenshots` | array | required | ≥ 1 entry; **order defines both output numbering and the sequence position** templates vary against. |
| `exports` | array | required | ≥ 1 export profile. |
| `output` | object | see below | Output location. |

### `theme`

All colors are hex (`#RGB`/`#RRGGBB`).

- `background` (default `#0E1524`)
- `accent` (default `#62E6B5`)
- `text` (default `#FFFFFF`) — headline color
- `mutedText` (default `#9AA7BD`) — subtitle color
- `surface` (optional) — elevated-panel token; defaults to a stepped shade of the background
- `mode` (default `"auto"`) — `"light"`/`"dark"` forces shadow depth, hairline opacity and contrast behavior instead of deriving them from the background luminance

### `fonts`

Each family accepts `regular`, `semibold`, `bold` file paths. Bundled defaults: IBM Plex Sans (latin), IBM Plex Sans Arabic (arabic), and **Fraunces** — a variable font — for `display` headlines. A lone `display.regular` file is treated as a variable font covering the full weight range; provide `bold`/`semibold` for static families. Missing files fall back to the bundled font with a warning.

### `screenshots[]`

- `id` (required) — slug for output names: letters, digits, `-`, `_`
- `image` (required) — PNG/JPEG/WebP screenshot of your app. StoreShot never alters its content.
- `prompt` (optional) — localized marketing text for interface-inspired layers (the Discovery template's search-bar placeholder, e.g. `"Find a flight"` / `"ابحث عن رحلة"`). Rendered strictly outside the app screenshot.
- `role` (optional) — semantic role in the campaign (`"hero"`, `"feature"`, `"workflow"`, `"trust"`…). Templates surface it in captions; use it to describe your sequence, not to switch templates.
- `title`, `subtitle` — plain string (all locales) or per-locale map; every configured locale needs an entry (exact tag or primary language).
- `deviceFrame` (optional) — what the template's `"auto"` device mode resolves to (`true` → the template's framed presentation, `false` → frameless). Override completely with the template's `deviceMode` setting.
- `decor` (optional) — decorative assets for composition templates: `[{ "id": "tomato", "image": "./decor/tomato.png" }]` (max 16). Transparent PNG or WebP; the template owns position, rotation and depth. Templates must still compose cleanly with zero decor — see `float` and `strata`. Validated like source images (missing/unreadable files fail the build).

### `app.category` and `"template": "auto"`

Setting `"template": "auto"` delegates template selection to deterministic
art-direction rules: the declared `app.category` (`food`, `shopping`,
`finance`, `productivity`, `games`, `health`, `education`, `travel`,
`social`, `other`), whether any screenshot supplies `decor`, and the first
export's orientation. The chosen template and the rule that fired are
printed during `generate`. StoreShot never guesses a category from free
text, and an explicit template id always wins — `"auto"` is an opt-in, not
a default. The same rules are exported as `selectComposition()` /
`recommendCompositions()` for embedders.

### Template settings (v0.2)

All templates: `headlineScale` (0.8–1.25), `deviceScale` (0.8–1.15), `deviceMode` (`"auto"|"bare"|"front"|"angled"`).

| Template | Extra settings |
| --- | --- |
| `cinematic` | `reflection` (bool, default true) |
| `swiss` | `grid` (bool, default true) |
| `campaign` | `band` (bool, default true) |
| `immersive` | `twin` (bool, default true) |
| `showcase` | `layers` (bool, default true), `shotScale` instead of `deviceScale` |
| `tilt` | `tilt` (4–22°, device rotation), `variation` (`auto`/`a`/`b`) |
| `strata` | `variation` (`auto`/`a`/`b`) |

### `exports[]` and `output`

Same as v0.1: `store` (`app-store`/`google-play`), `profile`, optional `size`/`name`/`outputDir`; `output.dir`, `output.clean`. Profiles and their verification dates: [`store-profiles.md`](store-profiles.md).

## Output layout

```
<output.dir>/<export.name>/<locale>/<NN>-<screenshot.id>.png
storeshots/app-store-iphone-6-3/ar/01-home.png
```

## Breaking changes in v0.2 (and how to migrate)

- **Template library replaced.** Old ids still render via aliases — `minimal`→`swiss`, `gradient`→`campaign`, `device-focus`→`immersive`, `spotlight`→`cinematic` — and both `generate` and `validate` print a deprecation notice. Rename `template` in your config to silence it.
- **Template settings changed.** v0.1 settings (e.g. `gradient`'s `glow`/`ring`) no longer exist; unknown keys are validation warnings. See the table above for the new sets.
- Everything else (CLI, schema fields, output naming, profiles, fonts config) is unchanged; new fields are additive and optional.

## Exit codes & environment

| Code | Meaning |
| --- | --- |
| 0 | Success (warnings allowed). |
| 1 | Configuration or validation error. |
| 2 | Rendering/runtime error (browser missing, asset IO during render). |

`STORESHOT_BROWSER_CHANNEL` (use an installed browser, e.g. `msedge`), `STORESHOT_DEBUG=1` (stack traces).

# RTL & Arabic troubleshooting

StoreShot's RTL behavior in one sentence: **direction comes from the locale,
shaping and bidi come from Chromium's text engine, and mirroring comes from
CSS logical properties** — StoreShot never reverses or reorders your strings.

How direction is decided:

1. `direction` overrides in the config, matched by exact tag then primary
   language (`"ar"` covers `ar-EG`).
2. Otherwise the primary language subtag: `ar`, `he`, `fa`, `ur`, `ckb`,
   `ps`, `sd`, `ug`, `dv`, `yi`, `nqo` → RTL; everything else → LTR.

## Symptom → cause → fix

### Letters appear disconnected (ا ل ا ن ج ل ي ز ي ة style)

You are looking at _presentation forms_ — the text itself contains
non-joining characters, or something upstream broke it. StoreShot cannot
produce this from normal Arabic input: it passes strings to Chromium
untouched. Check that your JSON file is saved as **UTF-8 without BOM** and
that the strings weren't pre-processed by another tool. Copy-paste the text
from a plain-text editor into `storeshot.config.json`.

### Text renders as boxes/tofu

The configured font is missing its Arabic glyphs. `storeshot validate`
warns when a font family fails to load; the bundled IBM Plex Sans Arabic
covers Arabic + Latin. If you set `fonts.arabic` to a Latin-only font,
Arabic falls through to the next family in the stack.

### Mixed Arabic/English renders in the wrong order (e.g. "Qamar عربي")

This is the Unicode bidi algorithm doing its job — neutral characters
(punctuation, spaces) between an LTR and an RTL run resolve by paragraph
direction. StoreShot pages set `dir` from the locale, so an Arabic page
treats Arabic as the base direction. If a specific phrase still reads
wrongly, wrap the Latin part with Unicode isolate characters
(`\u2066…\u2069`, LRI/PDI) in the config string — this is a Unicode-level
fix, not something the tool should hard-code.

### Parentheses or brackets look flipped

They are mirrored on purpose: `(` in RTL context _displays_ as `)`. That is
correct Arabic typography. If you typed the "correct-looking" bracket in a
LTR editor, it will come out wrong in RTL — type the natural character and
let the engine mirror it.

### Numerals: ٣ vs 3

Chromium picks digits by the surrounding script. Both Western (`3`) and
Arabic-Indic (`٣`) digits render correctly; which one appears follows the
font/locale. To force one style, use the characters you want in the config
string.

### Arabic title overflows and the build fails

That is StoreShot refusing to ship a clipped headline. Shorten the copy for
that locale, pick a template with a bigger text budget (`gradient`,
`spotlight` allow 2–3 title lines), or use a larger export size.
`storeshot validate` prints the exact screenshot id, locale, field and the
rendered-vs-budget heights.

### Layout doesn't mirror, only text alignment changed

All bundled templates mirror via logical properties. If you are writing a
custom template, audit every `left:`/`right:`/`padding-left` — they must be
`inset-inline-*`/`padding-inline-*` (see
[docs/templates.md](templates.md)).

### Diacritics (tashkeel) look cramped between wrapped lines

Line-heights for Arabic titles are set with Arabic metrics in mind. If your
copy is diacritic-heavy, prefer the `gradient` or `minimal` templates
(wider line budgets) over `device-focus`.

## Quick experiments

```bash
storeshot generate --locale ar          # only the Arabic outputs
storeshot validate                      # per-locale text-fit report
```

Still stuck? Open an issue with your locale, the config snippet and the
generated PNG — RTL bugs are treated as high priority.

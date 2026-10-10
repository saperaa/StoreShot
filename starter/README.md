# Qamar — StoreShot starter project

This is a working StoreShot project. It generates store screenshots for a
fictional tasks app in English and Arabic.

## Try it now

```bash
storeshot generate
```

Output lands in `storeshots/`:

```
storeshots/
  app-store-iphone-6-3/en-US/01-home.png … 05-plan.png
  app-store-iphone-6-3/ar/…
  google-play-phone/…
```

## Make it yours

1. **Replace the screenshots** — delete the five images in `screens/` and drop
   in real screenshots of your app (PNG, JPEG or WebP). Keep the same file
   names, or update the `image` paths in `storeshot.config.json`.
2. **Rename the app** — change `app.name` (it appears as the kicker on every frame).
3. **Write your copy** — edit the `title` and `subtitle` strings for `en-US`
   and `ar`. Any locale works; `ar`, `he`, `fa`, `ur` and friends default to
   RTL automatically.
4. **Pick a template** — `editorial` (default), `cinematic`, `swiss`,
   `campaign`, `immersive` or `showcase`:

   ```json
   "template": "cinematic"
   ```

   Run `storeshot templates` to see the settings each one takes. Frames
   alternate their layout across the sequence automatically.

5. **Tune the theme** — `theme.background`, `theme.accent`, `theme.text` and
   `theme.mutedText` take hex colors.

## Useful commands

```bash
storeshot validate            # check config, assets, translations, text fit
storeshot generate --locale ar
storeshot generate --export google-play-phone
storeshot templates           # list templates + settings
```

Full documentation: https://github.com/storeshot/storeshot

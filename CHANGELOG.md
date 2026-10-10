# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-10-10

First public release.

### Added

- CLI (`storeshot`) with `init`, `generate`, `validate`, `templates` and
  `install` commands; interactive project wizard on `init` (TTY) with
  `--yes` for CI.
- JSON configuration with a published JSON Schema (`storeshot-cli/schema.json`),
  Zod validation and actionable, aggregated error messages.
- Arabic/RTL first-class support: locale-driven `dir`, CSS logical-property
  mirroring, Chromium text shaping, bundled IBM Plex Sans / IBM Plex Sans
  Arabic (SIL OFL 1.1), per-locale direction overrides.
- Four templates: `minimal`, `gradient`, `device-focus`, `spotlight` — all
  RTL-aware, all with documented settings.
- Store export profiles verified against official Apple / Google
  documentation on 2026-10-10, custom size support with Google Play rule
  enforcement, and a documented list of constraints StoreShot does not
  check.
- Deterministic local rendering through Playwright Chromium with network
  blocking, exact-pixel output verification and per-asset diagnostics.
- Validation covering schema, missing/corrupt/low-res assets, font
  fallbacks, missing translations, unknown templates/profiles/settings,
  contrast warnings, and rendered text-overflow measurement per locale ×
  screenshot × export.
- Exit codes for CI (`0` / `1` / `2`) and `storeshot validate --json`.
- Test suite: unit (schema, i18n, profiles, naming, image headers),
  integration (init/generate/validate through the built CLI) and visual
  regression (determinism + per-platform baselines with a documented update
  flow).
- Starter project shipped inside the npm package; showcase gallery and docs
  (configuration, template authoring, RTL troubleshooting, store profiles).

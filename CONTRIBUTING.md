# Contributing to StoreShot

Thanks for helping build the screenshot generator Arabic deserves. This
project lives or dies by RTL correctness, deterministic output and honest
error messages — keep those three in mind for every change.

## Getting set up

```bash
git clone https://github.com/storeshot/storeshot
cd storeshot
npm install
npx playwright-core install chromium   # one-time
npm run build
npm test
```

Requirements: Node.js ≥ 20. Works on Windows, macOS and Linux.

## Project map

```
src/cli.ts               command wiring (commander)
src/commands/            init (wizard), generate, validate, templates, install
src/config/              zod schema, loader, resolver
src/i18n/                locale → direction defaults, text resolution
src/profiles/            store export profiles (verified data)
src/render/              engine (Playwright), HTML shell, fonts, pipeline
src/templates/           the visual templates + registry
src/validation/          project validation incl. rendered overflow check
starter/                 the shipped starter project (npm package)
docs/                    configuration / templates / RTL / store-profiles guides
test/{unit,integration,visual}
```

## Workflow

1. Fork + branch (`feat/my-thing`).
2. Make the change. `npm run lint && npm run typecheck && npm test` must
   pass, including visual baselines (see below).
3. PR with a clear description and, for anything visual, before/after
   images rendered by the actual tool.

## Visual regression baselines

`test/visual` compares renders against per-platform committed baselines in
`test/visual/baselines/`. Text rasterization differs between Windows and
Linux Chromium, so baselines are platform-suffixed (`gradient-ar-win32.png`).

- Changed rendering **intentionally**? Regenerate your platform's baselines
  with `npm run test:visual:update` and commit them, then say so in the PR.
- CI runs on Linux: if no `linux` baseline exists for a case it _skips_ with
  a notice. A maintainer (or the manual `visual-baselines` workflow) refreshes
  them — pixel diffs are reviewed in PRs exactly like code.

## Ground rules

- **Never reverse, reorder or "fix" Arabic strings in code.** Shaping and
  bidi belong to Chromium. RTL layout belongs to CSS logical properties.
- **No network in the render path.** The engine aborts non-file requests;
  don't work around it.
- **Derive template sizes from the canvas**, never fixed pixels; round with
  `px()`.
- **Every store profile number needs a source URL and a verification date.**
- New templates: follow [docs/templates.md](docs/templates.md), add tests
  and baselines.
- Error messages must be actionable: name the file/locale/field and say how
  to fix it.

## Releases

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/) and
versions follow SemVer. Publishing (maintainers): `npm run prepublishOnly`
runs lint, typecheck, schema generation and the full test suite; the npm
package is `storeshot-cli`.

## Reporting bugs

Use the issue templates. For rendering bugs, always include: the config
(redacted), the locale, StoreShot version (`storeshot --version`), OS, and
the generated PNG if possible.

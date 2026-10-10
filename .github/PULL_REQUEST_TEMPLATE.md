## What does this change do?

<!-- One or two sentences. -->

## Why?

<!-- The problem or use case. Link issues with "Fixes #123" where applicable. -->

## Checklist

- [ ] `npm run lint`, `npm run typecheck` and `npm test` pass locally.
- [ ] Visual changes regenerate baselines via `npm run test:visual:update`
      (committed, platform-suffixed) — or this PR has no visual impact.
- [ ] New/changed store profiles include a `sourceUrl` and today's
      `verifiedOn`, and update `docs/store-profiles.md`.
- [ ] New/changed templates work in both LTR and RTL locales (attach renders).
- [ ] Arabic strings are never reordered, reversed or reshaped in code.
- [ ] Docs updated (`docs/`, README, CHANGELOG unreleased section).

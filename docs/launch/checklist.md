# Launch & growth checklist

Prioritized, honest, no-spam. Everything here is a **manual submission by
the maintainer** — the generated drafts in this folder are starting points,
not autoposts. Read each platform's rules before posting; several
communities require participation before self-promotion.

Ready-to-edit drafts: `show-hn.md`, `reddit-ios.md`, `reddit-android.md`,
`linkedin.md`, `x-thread.md`, `github-discussion.md`, `devto-outline.md`
(regenerate with `node scripts/gen-launch-content.mjs`).

## Tier 1 — this week (highest leverage, lowest effort)

- [ ] **GitHub Discussions "Show and tell" post** — you own the venue, zero
      rules risk. Draft: `github-discussion.md`. Enables a discovery surface
      inside the repo.
- [ ] **awesome-list PRs** (one-line additions, non-marketing tone). Start
      with the ones whose contribution guides welcome tools:
      - `awesome-nodejs/README.md` → Command-line apps section:
        `StoreShot - Generate store-ready App Store & Google Play screenshots from a JSON config, with first-class Arabic/RTL.`
      - `awesome-cli-apps` → similar one-liner.
      - After those merge: `awesome-swift`, `awesome-flutter`,
        `awesome-react-native` (each community's framing: "screenshot
        automation for <platform> releases").
      - Etiquette: open a PR per list, match the list's line style, no
        adjectives the list doesn't use. One PR per week per list max.
- [ ] **Repo housekeeping that compounds**: pin an issue ("Roadmap — what
      should the 7th art direction be?") to convert visitors into
      contributors; enable Discussions (done via repo settings).

## Tier 2 — after ~50 stars or first external PR

- [ ] **Show HN** (draft: `show-hn.md`). Tuesday–Thursday, ~13:00 UTC.
      Be present in comments for 24h; lead with the technical problems
      (RTL typography, geometry validation), not the product.
- [ ] **Reddit** — one sub at a time, weeks apart, participating in each
      first (drafts: `reddit-ios.md`, `reddit-android.md`).
      r/iOSProgramming → r/androiddev → r/FlutterDev. Check each sub's
      self-promo rules on the day; skip any that disallow it.
- [ ] **dev.to article** (outline: `devto-outline.md`) — a build-story
      article outperforms announcements in search over months; it's the
      asset that keeps ranking for "app store screenshot generator".

## Tier 3 — after real traction

- [ ] **Product Hunt** — only once there are testimonials/screenshots from
      other users; launching empty looks worse than not launching.
- [ ] **AlternativeTo** — list as a fastlane frameit / SaaS-screenshot
      alternative (factual comparison table exists in the README).
- [ ] **X/LinkedIn** (drafts ready) — pair tweets with real gallery images;
      the before/after pair is the strongest single asset.

## Metrics that matter (all public, no tracking)

- npm downloads: https://www.npmjs.com/package/storeshot-cli (weekly chart,
  already on the README badge).
- GitHub stars/traffic: repo Insights → Traffic (unique visitors +
  referring sites show which Tier-1/2 channel works).
- Conversion proxy: stars-per-unique-visitor in Insights.

## Non-goals (hard rules)

No purchased engagement, no vote-asking, no posting the same text to
multiple subs in one week, no AI-generated comment replies, no analytics in
the CLI itself.

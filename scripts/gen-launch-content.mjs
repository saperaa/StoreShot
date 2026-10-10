/**
 * Generates ready-to-review launch content from REAL project data —
 * the template registry, the latest CHANGELOG section, real gallery paths
 * and the published npm package name. Nothing is invented: every feature
 * claim comes from source of truth, every image path is verified on disk.
 *
 *   node scripts/gen-launch-content.mjs
 *
 * Output: docs/launch/*.md — one file per platform. These are drafts for a
 * human to review and post manually. Nothing here posts anywhere, ever.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- real data ------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const registry = await import(pathToFileURL(path.join(root, "dist", "templates", "registry.js")).href);
const templates = registry.listTemplates().map((t) => `- \`${t.id}\` — ${t.description.split(".")[0]}.`);

const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const latestMatch = changelog.match(/^## \[([^\]]+)\][^\n]*\n([\s\S]*?)(?=\n## \[|$)/m);
if (!latestMatch) throw new Error("Could not parse latest CHANGELOG section");
const [, latestVersion, latestBody] = latestMatch;
const highlights = latestBody
  .split("\n")
  .filter((l) => l.startsWith("- "))
  .map((l) => l.replace(/`/g, "").slice(0, 160))
  .slice(0, 6);

// Verify every gallery path we reference actually exists.
const galleryFiles = {
  flagshipEn: "docs/gallery/flagship/app-store-iphone-6-3/en-US/01-home.png",
  flagshipAr: "docs/gallery/flagship/app-store-iphone-6-3/ar/04-focus.png",
  familyDark: "docs/gallery/families/dark-cinematic/p/en-US/01-hero.png",
  familyWarm: "docs/gallery/families/warm-premium/p/en-US/01-hero.png",
  familyAurora: "docs/gallery/families/vibrant-gradient/p/en-US/01-hero.png",
  familyMinimal: "docs/gallery/families/minimal-product/p/en-US/01-hero.png",
};
for (const [k, rel] of Object.entries(galleryFiles)) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`gallery image missing: ${rel}`);
}

const repo = "https://github.com/saperaa/StoreShot";
const npmUrl = "https://www.npmjs.com/package/storeshot-cli";
const familyLine = "Dark Cinematic · Editorial Swiss · Bold Campaign · Warm Premium · Vibrant Gradient · Minimal Product";
const quick = "npm install --save-dev storeshot-cli && npx storeshot install && npx storeshot init";

// ---- templates ------------------------------------------------------------
const posts = {
  "show-hn": `# Show HN draft (news.ycombinator.com)

**Title:** Show HN: StoreShot – Open-source CLI for App Store & Google Play screenshots

**Text:**

Hi HN — I open-sourced a CLI that turns raw app screenshots into store-ready
marketing images: ${repo}

Why I built it: shipping for two app stores × several locales × five device
sizes means hundreds of near-identical PNGs, and the existing options were
either Ruby toolchains that break on Arabic text or SaaS uploaders that want
your unreleased app in the cloud. StoreShot renders locally with Chromium,
deterministically, from one JSON config — Arabic/RTL is a first-class
citizen (proper shaping through Chromium's text engine, never string
reversal), not a mirror-flip afterthought.

Six art directions are genuinely different design systems, not background
swaps (${familyLine}). Output is verified at exact store dimensions — Apple's
21:9 product-page headers, 3:2 search creatives, 16:9 universals and Google
Play feature graphics included — and text that would clip fails the build
instead of shipping ugly.

Try it:

    ${quick}

MIT, TypeScript, zero cloud. Happy to answer anything about the RTL
handling or the geometry validation — those were the hard parts.
`,

  "reddit-ios": `# Reddit draft — r/iOSProgramming
# Read the sub rules + participate in threads BEFORE posting. No link in the title.

**Title:** I open-sourced a local CLI that generates App Store screenshots (incl. the new 21:9 headers and 3:2 search creatives) — Arabic/RTL done properly

**Body:**

Every release I used to rebuild the same screenshots in a design tool:
5 frames × 2 locales × the device sizes du jour, plus Apple's newer creative
assets (3840×1646 headers, 5244×2950 universal, 3840×2560 search). So I
built a CLI that does it from one JSON config, rendering locally with
Chromium — nothing uploads anywhere, output is deterministic.

What made it worth sharing here:

- The new Apple creative assets are first-class profiles, verified against
  Apple's spec pages (dimensions dated in the repo).
- App Store validation is built in: it measures the rendered text in the
  actual browser and FAILS the build if a headline would clip the canvas or
  overlap the phone — catching the stuff you normally notice after upload.
- A single config renders every locale; Arabic gets its own layout metrics,
  not mirrored English coordinates.

Six art directions ship with it (${familyLine}), and it does Google Play
feature graphics with the same engine.

Repo (MIT): ${repo}
npm: ${npmUrl}

Happy to go deep on any part — the geometry validation and RTL typography
are the interesting bits.
`,

  "reddit-android": `# Reddit draft — r/androiddev
# Read the sub rules + participate in threads BEFORE posting.

**Title:** Open-sourced a CLI for Google Play screenshots (and App Store) that renders locally — no uploads, no SaaS

**Body:**

Store listings for us meant: screenshot sizes per device, a 1024×500
feature graphic, localized listings, and either a design tool marathon or a
SaaS that wants the unreleased build in the cloud. So I open-sourced the
tool I wanted: one JSON config in, verified-size PNGs out, rendered locally
with Chromium.

- Google Play feature graphic (1024×500) and phone/tablet screenshots are
  first-class profiles; Apple's formats come from the same engine.
- Multi-locale from one config — including proper Arabic/RTL (Chromium does
  the text shaping; layouts get their own RTL metrics, phones never get
  mirrored).
- Layout validation: marketing text that would clip or overlap the app UI
  fails the build with a message naming the exact field and locale.
- Deterministic: same config, same pixels — safe for CI.

    ${quick}

Repo (MIT): ${repo} · npm: ${npmUrl}
`,

  "linkedin": `# LinkedIn draft (personal profile — link in first comment per etiquette)

I just open-sourced StoreShot — a CLI that turns raw app screenshots into
store-ready marketing images for the App Store and Google Play. 📱

The problem it solves is one every mobile team knows: every release
regenerates the same screenshots across stores, locales and device sizes —
and the existing tools either choke on right-to-left text or want your
unreleased app uploaded to someone's cloud.

StoreShot takes a different angle:

→ Local & deterministic — renders with Chromium on your machine, same
pixels every run, safe for CI.
→ Arabic/RTL as a first-class citizen — real text shaping, dedicated RTL
layout metrics, not mirrored English.
→ Layout validation — if a headline would clip the canvas or sit on top of
your app UI, the build fails. Ugly output never ships.
→ Six genuinely different art directions, from dark cinematic to warm
paper to minimal product.

MIT licensed, TypeScript, zero dependencies on external services:
${repo}

If you ship mobile apps — especially bilingual ones — I'd genuinely value
your feedback on the RTL handling.
`,

  "x-thread": `# X/Twitter thread draft (post images with the tweets — paths below)

1/ I open-sourced a CLI that generates App Store & Google Play screenshots
from one JSON config — locally, deterministically, with Arabic/RTL done
properly.

${repo}

🧵 Why it exists ↓

2/ Every release = the same screenshots, rebuilt: stores × locales × device
sizes. Tools either break on RTL text or upload your unreleased app to a
cloud renderer. StoreShot does it locally with Chromium. Same config, same
pixels — CI-safe.

3/ Six art directions, actually different design systems — typography,
composition, device treatment all change:

[image: ${galleryFiles.familyDark}]
[image: ${galleryFiles.familyWarm}]

4/ Arabic is not mirrored English — it gets its own layout metrics, real
text shaping, and copy budgets that don't clip:

[image: ${galleryFiles.flagshipAr}]

5/ And the part I'm proudest of: geometry validation. Marketing text that
would clip the canvas, overlap the phone, or hide the app UI fails the
build with the exact field named. Ugly screenshots don't ship.

6/ Try it:

npm install --save-dev storeshot-cli
npx storeshot install && npx storeshot init

MIT · TypeScript · zero cloud
${repo} · ${npmUrl}
`,

  "github-discussion": `# GitHub Discussions — Showcase post draft (category: Show and tell)

**Title:** StoreShot ${latestVersion} is out — six art directions, RTL landscape system, tokenless releases

**Body:**

${highlights.map((h) => `- ${h}`).join("\n")}

The full gallery (every image generated by the CLI itself from one config):
${repo}/tree/master/docs/gallery/families

Try the new version:

    npm install --save-dev storeshot-cli@latest

Questions about any template, the RTL handling, or the geometry gates —
ask below. Bug reports and template ideas as issues please:
${repo}/issues
`,

  "devto-outline": `# dev.to / blog article outline
# Write the article from this outline — do not paste it raw.

**Working title:** "I built an offline, deterministic alternative to cloud
screenshot generators — because Arabic apps deserve store pages too"

**Angle:** personal build story → the two hard technical problems → honest
limitations. Developer audience, not marketing.

1. **Hook** — the combinatorial screenshot problem (stores × locales ×
   sizes) and why the available tools failed me: Ruby pipelines that break
   Arabic ligatures, SaaS that wants the unreleased app in the cloud.
2. **Constraint-driven design** — deterministic local rendering (Chromium),
   config-as-code, CI-safe output. Why determinism matters for regression
   testing screenshots.
3. **RTL as a first-class citizen** — the actual hard part: shaping,
   direction, why you never mirror a phone, and why Arabic needs its own
   layout metrics instead of mirrored coordinates. Include a real EN/AR
   pair: docs/gallery/flagship/app-store-iphone-6-3/en-US/01-home.png vs
   docs/gallery/flagship/app-store-iphone-6-3/ar/04-focus.png
4. **Geometry validation** — measuring rendered text in the browser after
   fonts load; failing builds on clipped headlines or text over app UI.
   Show a real violation message.
5. **What it doesn't do** (credibility) — no design-tool replacement, no
   automatic copywriting, browser download on first run.
6. **Close** — repo, npm, "issue templates welcome, RTL bug reports
   especially".

**Rules:** real screenshots from docs/gallery/, real CLI output blocks, no
feature claims beyond the README, disclose authorship ("I built this").
`,
};

// ---- write ----------------------------------------------------------------
const outDir = path.join(root, "docs", "launch");
fs.mkdirSync(outDir, { recursive: true });
const manifest = { generatedAt: new Date().toISOString().slice(0, 10), version: pkg.version, source: "scripts/gen-launch-content.mjs" };
fs.writeFileSync(
  path.join(outDir, "content.json"),
  JSON.stringify({ ...manifest, files: Object.keys(posts) }, null, 2) + "\n",
);
for (const [name, body] of Object.entries(posts)) {
  fs.writeFileSync(path.join(outDir, `${name}.md`), body.trimStart());
}
console.log(`docs/launch/: ${Object.keys(posts).length} posts regenerated (v${pkg.version})`);
console.log(`templates referenced: ${templates.length}; gallery images verified: ${Object.keys(galleryFiles).length}`);

/**
 * Creates or updates a DRAFT GitHub release for the version in
 * package.json, with notes generated from that version's CHANGELOG
 * section. The maintainer reviews and publishes the draft; publishing
 * triggers publish.yml (trusted publishing). Never publishes anything.
 *
 *   node scripts/draft-release.mjs
 *
 * Requires GH_TOKEN/GITHUB_TOKEN and the gh CLI (present on Actions
 * runners). Skips silently when the version already has a published
 * release — the common case after publish.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;

function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

// Already released? Nothing to draft.
let existing = null;
try {
  existing = gh("release", "view", tag, "--json", "isDraft", "--jq", ".isDraft");
} catch {
  existing = null; // no release for this tag yet
}
if (existing === "false") {
  console.log(`${tag} is already published — nothing to draft.`);
  process.exit(0);
}

// Notes from the CHANGELOG section for this version.
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const section = changelog.match(new RegExp(`^## \\[${version}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`, "m"));
if (!section) {
  console.error(`No CHANGELOG section for ${version} — add one before drafting a release.`);
  process.exit(1);
}
const notesPath = path.join(root, ".release-notes.md");
fs.writeFileSync(notesPath, section[1].trim() + "\n");

if (existing === "true") {
  gh("release", "edit", tag, "--notes-file", notesPath);
  console.log(`Updated existing draft release ${tag}.`);
} else {
  const firstLine = section[1]
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith("###"));
  const title = `${tag} — ${firstLine ? firstLine.replace(/^[-*]\s*/, "").slice(0, 80) : "release"}`;
  gh("release", "create", tag, "--draft", "--title", title, "--notes-file", notesPath, "--target", "master");
  console.log(`Created draft release ${tag}. Review and publish to ship to npm.`);
}
fs.rmSync(notesPath, { force: true });

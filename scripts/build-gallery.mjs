/**
 * Builds the committed example gallery in docs/gallery/ using the real CLI.
 *
 *   node scripts/build-gallery.mjs
 *
 * Layout:
 *   docs/gallery/<template>/<locale>/NN-<id>.png   — one hero frame per template
 *   docs/gallery/campaign/<locale>/…               — the full 5-image editorial sequence
 *   docs/gallery/themes/…                          — light + violet personalities
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "dist", "cli.js");
const gallery = path.join(root, "docs", "gallery");
const screens = path.join(root, "starter", "screens");

fs.rmSync(gallery, { recursive: true, force: true });
fs.mkdirSync(gallery, { recursive: true });

const base = {
  $schema: "./node_modules/storeshot-cli/schema.json",
  configVersion: 1,
  app: { name: "Qamar", tagline: "Tasks that flow with your day" },
  locales: ["en-US", "ar"],
  direction: { ar: "rtl" },
  exports: [{ store: "app-store", profile: "iphone-6-3", name: "frame" }],
  output: { dir: "./out" },
};

const prompt = {
  home: { "en-US": "plan my week", ar: "خطّط أسبوعي" },
  compose: { "en-US": "add a task", ar: "أضف مهمة" },
  insights: { "en-US": "track my streak", ar: "تابع سلسلة إنجازي" },
};

const copy = {
  home: {
    "en-US": ["Your day, beautifully under control", "Plan the night before, glide through tomorrow"],
    ar: ["يومك تحت سيطرتك، بأناقة", "خطّط من الليلة، وأنجز براحة غدًا"],
  },
  compose: {
    "en-US": ["Capture it the moment you think of it", "Quick, natural task entry"],
    ar: ["سجّلها في لحظة خطرت لك", "إضافة سريعة وطبيعية للمهام"],
  },
  insights: {
    "en-US": ["Progress you can actually see", "Weekly insights and streaks"],
    ar: ["تقدّم تراه بعينك", "رؤى أسبوعية وسلاسل إنجاز تحفّزك"],
  },
};

const screenFile = { home: "home", compose: "compose", insights: "stats" };

function frameConfig(template, screenId, locale, theme, extraSettings = {}) {
  const [title, subtitle] = copy[screenId][locale];
  return {
    ...base,
    locales: [locale],
    direction: locale === "ar" ? { ar: "rtl" } : {},
    template: { id: template, settings: extraSettings },
    theme,
    screenshots: [
      {
        id: screenId,
        role: "hero",
        image: path.resolve(screens, `${screenFile[screenId]}.png`),
        title,
        subtitle,
        ...(template === "discovery" ? { prompt: prompt[screenId][locale] } : {}),
      },
    ],
  };
}

function run(config, outDir) {
  const dir = path.join(gallery, ".work");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "storeshot.config.json"), JSON.stringify(config, null, 2));
  const staging = path.join(dir, "out");
  execFileSync(process.execPath, [cli, "generate", "-e", "frame", "-o", staging], {
    cwd: dir,
    stdio: "inherit",
  });
  // Flatten: <staging>/frame/<locale>/01-x.png -> <outDir>/01-x.png
  const pngs = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".png")) pngs.push(p);
    }
  };
  walk(staging);
  fs.mkdirSync(outDir, { recursive: true });
  for (const png of pngs) fs.copyFileSync(png, path.join(outDir, path.basename(png)));
  fs.rmSync(dir, { recursive: true, force: true });
}

const dark = {
  background: "#0E1524",
  accent: "#62E6B5",
  text: "#FFFFFF",
  mutedText: "#9AA7BD",
};
const paper = {
  background: "#F4F1EA",
  accent: "#0E7A5F",
  text: "#1A1D24",
  mutedText: "#6B6F7B",
  mode: "light",
};
const violet = {
  background: "#161029",
  accent: "#9F8CFF",
  text: "#FFFFFF",
  mutedText: "#A79FC6",
};

// One hero frame per template, both locales.
const templates = [
  ["editorial", "home"],
  ["cinematic", "home"],
  ["swiss", "insights"],
  ["campaign", "compose"],
  ["immersive", "home"],
  ["showcase", "compose"],
  ["discovery", "home"],
];
for (const [template, screen] of templates) {
  for (const locale of ["en-US", "ar"]) {
    run(
      frameConfig(template, screen, locale, dark),
      path.join(gallery, template, locale),
    );
    console.log(`gallery: ${template}/${locale}`);
  }
}

// Personality variants: editorial on paper (light), cinematic in violet.
run(frameConfig("editorial", "home", "en-US", paper), path.join(gallery, "themes", "editorial-paper"));
{
  const playConfig = frameConfig("discovery", "compose", "en-US", dark);
  playConfig.exports = [{ store: "google-play", profile: "feature-graphic", name: "frame" }];
  run(playConfig, path.join(gallery, "google-play", "feature-graphic"));
}
run(frameConfig("cinematic", "compose", "ar", violet), path.join(gallery, "themes", "cinematic-violet"));
run(frameConfig("swiss", "insights", "ar", paper), path.join(gallery, "themes", "swiss-paper"));
console.log("gallery: themes");

// Apple creative assets: product page header (21:9 + 16:9 universal) and the
// dedicated search-results asset (3:2), in landscape compositions.
const landscapeConfigs = [
  ["editorial", "home", "en-US", dark, "header-21-9", { title: "Beautifully in control", subtitle: "Plan the night before, glide through tomorrow" }],
  ["editorial", "home", "en-US", dark, "header-16-9", { title: "Beautifully in control", subtitle: "Plan the night before, glide through tomorrow" }],
  ["editorial", "home", "en-US", dark, "search-results-3-2", { title: "Beautifully in control", subtitle: "Plan the night before, glide through tomorrow" }],
  ["cinematic", "compose", "ar", violet, "header-21-9", { title: "سجّلها في لحظتها", subtitle: "إضافة سريعة وطبيعية للمهام" }],
];
for (const [template, screen, locale, theme, profile, copy] of landscapeConfigs) {
  const [file] = [screenFile[screen]];
  fs.mkdirSync(path.join(gallery, ".work"), { recursive: true });
  fs.writeFileSync(
    path.join(gallery, ".work", "storeshot.config.json"),
    JSON.stringify(
      {
        ...base,
        locales: [locale],
        direction: locale === "ar" ? { ar: "rtl" } : {},
        template,
        theme,
        screenshots: [
          {
            id: screen,
            role: "hero",
            image: path.resolve(screens, file + ".png"),
            title: copy.title,
            subtitle: copy.subtitle,
          },
        ],
        exports: [{ store: "app-store", profile, name: "frame" }],
      },
      null,
      2,
    ),
  );
  execFileSync(process.execPath, [
    cli,
    "generate",
    "-e",
    "frame",
    "-o",
    path.join(gallery, "landscape", profile + (locale === "ar" ? "-ar" : "")),
  ], { cwd: path.join(gallery, ".work"), stdio: "inherit" });
  fs.rmSync(path.join(gallery, ".work"), { recursive: true, force: true });
  console.log("gallery: landscape/" + profile + (locale === "ar" ? "-ar" : ""));
}

fs.rmSync(path.join(gallery, ".work"), { recursive: true, force: true });
console.log("done");

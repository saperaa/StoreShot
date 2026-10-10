import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigError } from "../errors.js";
import { log } from "../util/log.js";
import { CONFIG_FILE_NAMES } from "../config/schema.js";
import { runWizard, wizardDefaults, type WizardAnswers } from "./wizard.js";

const STARTER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../starter");

export interface InitOptions {
  force?: boolean;
  yes?: boolean;
}

export async function runInit(targetArg: string | undefined, options: InitOptions): Promise<void> {
  const target = path.resolve(process.cwd(), targetArg ?? ".");
  const existing = await firstExisting(target, CONFIG_FILE_NAMES);
  if (existing && !options.force) {
    throw new ConfigError(
      `${path.relative(process.cwd(), existing) || existing} already exists. ` +
        "Use --force to overwrite it and the starter files.",
    );
  }

  try {
    await fs.stat(STARTER_DIR);
  } catch {
    throw new ConfigError(
      "Starter project template is missing from the installed package. " +
        "Reinstall storeshot-cli (the published package should ship a `starter/` directory).",
    );
  }

  // Ask what the user wants when interactive; otherwise use starter defaults.
  const defaults = wizardDefaults(path.basename(target));
  let answers: WizardAnswers | undefined;
  if (!options.yes && process.stdin.isTTY) {
    answers = await runWizard(defaults);
  } else if (!options.yes) {
    log.info("Non-interactive session: creating the project with starter defaults.");
  }

  await fs.mkdir(target, { recursive: true });
  await copyDir(STARTER_DIR, target);

  if (answers) {
    await personalizeConfig(target, answers);
  }

  log.success(`Initialized StoreShot project in ${target}`);
  for (const file of await listFilesDeep(target)) {
    log.dim(`  ${path.relative(target, file)}`);
  }

  if (answers) {
    log.line("");
    log.info(`Project story: "${answers.story ?? "(none given)"}"`);
    log.dim("  Saved as app.story in storeshot.config.json — keep it next to your copy");
    log.dim("  so editors and translators always have the app's context.");
    const uncovered = answers.locales.filter((tag) => tag !== "en-US" && tag !== "ar");
    if (uncovered.length > 0) {
      log.warn(
        `Placeholder copy: ${uncovered.join(", ")} start from the English example strings. ` +
          "Edit the titles/subtitles in storeshot.config.json.",
      );
    }
  }

  log.line("");
  log.info("Next steps:");
  log.line(
    `  1. Replace the example screenshots in ${path.join(path.basename(target), "screens")}`,
  );
  log.line("     with real screenshots of your app.");
  log.line("  2. Edit titles and subtitles in storeshot.config.json for your locales.");
  log.line("  3. Run storeshot generate, then check the storeshots/ folder.");
  log.line("");
  log.dim("Validate first with: storeshot validate");
}

/** Write the wizard's answers into the copied starter configuration. */
async function personalizeConfig(target: string, answers: WizardAnswers): Promise<void> {
  const configPath = path.join(target, "storeshot.config.json");
  const config = JSON.parse(await fs.readFile(configPath, "utf8")) as Record<string, unknown> & {
    app: Record<string, unknown>;
    theme: Record<string, unknown>;
    screenshots: Array<{
      id: string;
      image: string;
      title: Record<string, string>;
      subtitle: Record<string, string>;
    }>;
  };

  config.app.name = answers.appName;
  if (answers.story) config.app.story = answers.story;
  config.locales = answers.locales;
  config.template = answers.templateId;
  config.theme = { ...config.theme, ...answers.theme };
  // Locale-specific example copy ships for en-US and ar. Every other locale
  // starts from the English strings as a placeholder (flagged in the output).
  const hasEn = answers.locales.includes("en-US");
  const hasAr = answers.locales.includes("ar");
  // The starter's direction override exists to demonstrate the feature; only
  // keep it when it still matches a configured locale.
  if (!hasAr) delete config.direction;
  for (const screenshot of config.screenshots) {
    screenshot.title = localizeMap(screenshot.title, answers.locales, hasEn);
    screenshot.subtitle = localizeMap(screenshot.subtitle, answers.locales, hasEn);
  }

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function localizeMap(
  map: Record<string, string>,
  locales: string[],
  hasEn: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};
  const fallback = map["en-US"]!;
  for (const tag of locales) {
    result[tag] = map[tag] ?? (tag === "ar" && !hasEn ? map["ar"]! : fallback);
  }
  return result;
}

async function copyDir(from: string, to: string): Promise<void> {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyDir(source, destination);
    } else {
      await fs.copyFile(source, destination);
    }
  }
}

async function listFilesDeep(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...(await listFilesDeep(path.join(root, entry.name))));
    } else {
      files.push(path.join(root, entry.name));
    }
  }
  return files.sort();
}

async function firstExisting(dir: string, names: readonly string[]): Promise<string | undefined> {
  for (const name of names) {
    const candidate = path.join(dir, name);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // not present
    }
  }
  return undefined;
}

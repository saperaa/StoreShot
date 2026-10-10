import readline from "node:readline/promises";
import pc from "picocolors";
import { normalizeLocaleTag } from "../i18n/direction.js";
import { TEMPLATES } from "../templates/registry.js";
import { log } from "../util/log.js";

/**
 * Interactive project wizard for `storeshot init`.
 *
 * Asks what the user wants — app identity, story, locales, template and
 * theme — then writes those choices into the starter configuration. Runs
 * only when stdin is a TTY; CI and piped invocations fall back to defaults
 * (or `--yes` skips it explicitly).
 */

export interface WizardAnswers {
  appName: string;
  story: string | undefined;
  locales: string[];
  templateId: string;
  theme: { background: string; accent: string; text: string; mutedText: string };
}

export interface ThemePreset {
  label: string;
  background: string;
  accent: string;
  text: string;
  mutedText: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    label: "Midnight + Mint",
    background: "#0E1524",
    accent: "#62E6B5",
    text: "#FFFFFF",
    mutedText: "#9AA7BD",
  },
  {
    label: "Deep Violet",
    background: "#151029",
    accent: "#9F8CFF",
    text: "#FFFFFF",
    mutedText: "#A79FC6",
  },
  {
    label: "Charcoal + Coral",
    background: "#17181C",
    accent: "#FF7A66",
    text: "#FFFFFF",
    mutedText: "#A5A7B0",
  },
  {
    label: "Daylight",
    background: "#F2F5FA",
    accent: "#0E9F6E",
    text: "#111827",
    mutedText: "#5B6472",
  },
];

const RTL_HINT = "ar, he, fa, ur and more are laid out right-to-left automatically";

export function wizardDefaults(directoryName: string): WizardAnswers {
  return {
    appName: directoryName || "My App",
    story: undefined,
    locales: ["en-US"],
    templateId: "gradient",
    theme: THEME_PRESETS[0]!,
  };
}

export async function runWizard(defaults: WizardAnswers): Promise<WizardAnswers> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    log.line("");
    log.line(pc.bold("Let's set up your store screenshots."));
    log.dim("Press Enter to accept the [default] on any question.\n");

    const appName = (await rl.question(`What is your app called? [${defaults.appName}] `)).trim();
    const name = appName || defaults.appName;

    const storyAnswer = (
      await rl.question(
        `In one sentence, what does ${pc.bold(name)} do? (its story — kept in the config for you and translators) `,
      )
    ).trim();

    const localesAnswer = (
      await rl.question(
        `Which locales? (space or comma separated) [${defaults.locales.join(" ")}] `,
      )
    ).trim();
    let locales = localesAnswer.length > 0 ? parseLocales(localesAnswer) : defaults.locales;
    while (locales.length === 0) {
      const retry = (
        await rl.question(`  Please enter at least one locale tag (e.g. "en-US ar"): `)
      ).trim();
      locales = retry.length > 0 ? parseLocales(retry) : defaults.locales;
    }
    const rtlOnes = locales.filter((tag) =>
      ["ar", "he", "fa", "ur", "ckb", "ps", "sd", "ug", "dv", "yi"].includes(tag.split("-")[0]!),
    );
    if (rtlOnes.length > 0) {
      log.dim(`  ${rtlOnes.join(", ")} will render right-to-left automatically (${RTL_HINT}).`);
    }

    log.line("");
    log.line("Pick a template:");
    TEMPLATES.forEach((template, i) => {
      log.line(`  ${pc.cyan(`${i + 1}.`)} ${pc.bold(template.name)} — ${template.description}`);
    });
    const templateAnswer = (await rl.question(`Choice [1] `)).trim();
    const templateIndex = Number.parseInt(templateAnswer, 10);
    const template =
      TEMPLATES[Number.isInteger(templateIndex) ? templateIndex - 1 : 0] ?? TEMPLATES[0]!;

    log.line("");
    log.line("Pick a theme:");
    THEME_PRESETS.forEach((preset, i) => {
      log.line(
        `  ${pc.cyan(`${i + 1}.`)} ${preset.label} ${pc.dim(`${preset.background} / ${preset.accent}`)}`,
      );
    });
    const themeAnswer = (await rl.question(`Choice [1] `)).trim();
    const themeIndex = Number.parseInt(themeAnswer, 10);
    const theme =
      THEME_PRESETS[Number.isInteger(themeIndex) ? themeIndex - 1 : 0] ?? THEME_PRESETS[0]!;

    log.line("");
    return {
      appName: name,
      story: storyAnswer.length > 0 ? storyAnswer : undefined,
      locales,
      templateId: template.id,
      theme,
    };
  } finally {
    rl.close();
  }
}

function parseLocales(input: string): string[] {
  const tags: string[] = [];
  for (const part of input.split(/[\s,]+/).filter(Boolean)) {
    try {
      tags.push(normalizeLocaleTag(part));
    } catch {
      log.warn(`"${part}" is not a valid locale tag; skipping it.`);
    }
  }
  return [...new Set(tags)];
}

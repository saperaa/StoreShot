import { ConfigError } from "../errors.js";
import { resolveFontFiles, type ResolvedFonts } from "../render/assets.js";
import {
  getProfile,
  listProfiles,
  validateCustomSize,
  type StoreId,
} from "../profiles/storeProfiles.js";
import { getTemplate, templateIds } from "../templates/registry.js";
import { selectComposition } from "../design/direct.js";
import type { AppCategory } from "./schema.js";
import type { TemplateDefinition } from "../templates/types.js";
import { htmlLang, normalizeLocaleTag, resolveDirection } from "../i18n/direction.js";
import { resolveLocalizedText, type LocalizedText } from "../i18n/text.js";
import { resolveFromConfigDir } from "../util/paths.js";
import type { LoadedConfig } from "./load.js";

export interface ResolvedLocale {
  tag: string;
  lang: string;
  dir: "ltr" | "rtl";
  htmlLang: string;
}

export interface ResolvedScreenshot {
  id: string;
  /** Absolute path of the source screenshot. */
  imagePath: string;
  /** Decorative assets (transparent PNG/WebP), resolved to absolute paths. */
  decor: Array<{ id: string; imagePath: string }>;
  /** Per-screenshot device-frame override (undefined = template default). */
  deviceFrame: boolean | undefined;
  /** Optional semantic role from the config ("hero", "feature", …). */
  role: string | undefined;
  /** Screen fitting controls ("cover"/"contain" + focal point). */
  fit: "cover" | "contain" | undefined;
  focalPoint: { x: number; y: number } | undefined;
  /** Resolved text per locale tag. */
  texts: Record<string, { title?: string; subtitle?: string }>;
}

export interface ResolvedExport {
  store: StoreId;
  profileId: string;
  /** Sub-directory name inside the output root. */
  name: string;
  /** Absolute output directory for this export. */
  outputDir: string;
  width: number;
  height: number;
  customSize: boolean;
}

export interface ResolvedConfig {
  configPath: string;
  configDir: string;
  app: { name: string; tagline?: string; story?: string; category?: AppCategory };
  theme: {
    background: string;
    accent: string;
    text: string;
    muted: string;
    surface?: string;
    mode: "auto" | "light" | "dark";
  };
  fonts: ResolvedFonts;
  locales: ResolvedLocale[];
  template: {
    definition: TemplateDefinition;
    settings: Record<string, unknown>;
    /** Set when "template": "auto" chose this definition — carries the rule reason. */
    autoSelected?: { id: string; reason: string };
  };
  screenshots: ResolvedScreenshot[];
  exports: ResolvedExport[];
  output: { dir: string; clean: boolean };
  /** Deprecation notices surfaced to the CLI (never fatal). */
  deprecations: string[];
}

/**
 * Normalize a validated config into everything the renderer needs.
 * Throws a single ConfigError listing every problem found.
 */
export function resolveConfig(loaded: LoadedConfig): ResolvedConfig {
  const errors: string[] = [];
  const raw = loaded.raw;

  // --- locales + directions -------------------------------------------------
  const locales: ResolvedLocale[] = [];
  const seenLocales = new Set<string>();
  for (const tag of raw.locales) {
    const normalized = normalizeLocaleTag(tag);
    if (seenLocales.has(normalized)) {
      errors.push(`Duplicate locale "${normalized}" in locales.`);
      continue;
    }
    seenLocales.add(normalized);
    locales.push({
      tag: normalized,
      lang: normalized.split("-")[0]!,
      dir: resolveDirection(normalized, raw.direction),
      htmlLang: htmlLang(normalized),
    });
  }

  for (const overrideKey of Object.keys(raw.direction)) {
    let normalized: string;
    try {
      normalized = normalizeLocaleTag(overrideKey);
    } catch {
      errors.push(`Invalid locale tag in direction overrides: "${overrideKey}".`);
      continue;
    }
    const matchesConfigured = locales.some(
      (locale) => locale.tag === normalized || locale.lang === normalized,
    );
    if (!matchesConfigured) {
      errors.push(
        `Direction override for "${normalized}" does not match any configured locale ` +
          `(${locales.map((l) => l.tag).join(", ")}).`,
      );
    }
  }

  // --- template --------------------------------------------------------------
  const deprecations: string[] = [];
  const templateRef =
    typeof raw.template === "string"
      ? { id: raw.template, settings: raw.templateSettings ?? {} }
      : { id: raw.template.id, settings: raw.template.settings ?? raw.templateSettings ?? {} };

  // "auto" delegates to the deterministic art-direction rules: declared
  // category + assets actually present + export orientation. An explicit
  // template id is the user's override and never re-routed.
  let autoSelected: { id: string; reason: string } | undefined;
  let wantedId = templateRef.id;
  if (wantedId === "auto") {
    const hasDecor = raw.screenshots.some((shot) => (shot.decor?.length ?? 0) > 0);
    const firstExport = raw.exports[0];
    const firstProfile = firstExport
      ? getProfile(firstExport.store, firstExport.profile)
      : undefined;
    const landscape = firstExport?.size
      ? firstExport.size.width > firstExport.size.height
      : firstProfile
        ? firstProfile.width > firstProfile.height
        : false;
    const choice = selectComposition({
      category: raw.app.category,
      hasDecor,
      orientation: landscape ? "landscape" : "portrait",
    });
    wantedId = choice.templateId;
    autoSelected = { id: choice.templateId, reason: choice.reason };
  }

  const definition = getTemplate(wantedId);
  if (!definition) {
    errors.push(
      `Unknown template "${wantedId}". Available templates: ${templateIds().join(", ")}, auto.`,
    );
  } else if (definition.id !== wantedId) {
    deprecations.push(
      `Template "${templateRef.id}" was redesigned in v0.2 and now renders as ` +
        `"${definition.id}". Update "template" to "${definition.id}" to silence this notice.`,
    );
  }

  // --- screenshots + translations ---------------------------------------------
  const screenshots: ResolvedScreenshot[] = [];
  const seenIds = new Set<string>();
  for (const shot of raw.screenshots) {
    if (seenIds.has(shot.id.toLowerCase())) {
      errors.push(`Duplicate screenshot id "${shot.id}".`);
      continue;
    }
    seenIds.add(shot.id.toLowerCase());

    const texts: Record<string, { title?: string; subtitle?: string; prompt?: string }> = {};
    for (const locale of locales) {
      const entry: { title?: string; subtitle?: string; prompt?: string } = {};
      for (const field of ["title", "subtitle", "prompt"] as const) {
        const value: LocalizedText | undefined = shot[field];
        if (value === undefined) continue;
        const resolved = resolveLocalizedText(value, locale.tag);
        if (resolved.value === undefined) {
          const found =
            typeof value === "string"
              ? "(plain string)"
              : Object.keys(value).join(", ") || "(empty)";
          errors.push(
            `Screenshot "${shot.id}" is missing a "${locale.tag}" translation for "${field}" ` +
              `(defined for: ${found}).`,
          );
        } else {
          entry[field] = resolved.value;
        }
      }
      texts[locale.tag] = entry;
    }
    const decor: Array<{ id: string; imagePath: string }> = [];
    const seenDecor = new Set<string>();
    for (const item of shot.decor ?? []) {
      if (seenDecor.has(item.id)) {
        errors.push(`Screenshot "${shot.id}": duplicate decor id "${item.id}".`);
        continue;
      }
      seenDecor.add(item.id);
      decor.push({ id: item.id, imagePath: resolveFromConfigDir(loaded.dir, item.image) });
    }

    screenshots.push({
      id: shot.id,
      imagePath: resolveFromConfigDir(loaded.dir, shot.image),
      decor,
      deviceFrame: shot.deviceFrame,
      role: shot.role,
      fit: shot.fit,
      focalPoint: shot.focalPoint,
      texts,
    });
  }

  // --- exports -----------------------------------------------------------------
  const exports: ResolvedExport[] = [];
  const seenExportNames = new Set<string>();
  for (const exportEntry of raw.exports) {
    const profile = getProfile(exportEntry.store, exportEntry.profile);
    if (!profile) {
      const available = listProfiles(exportEntry.store)
        .map((p) => p.id)
        .join(", ");
      errors.push(
        `Unknown profile "${exportEntry.profile}" for store "${exportEntry.store}". ` +
          `Available profiles: ${available}.`,
      );
      continue;
    }
    const name = exportEntry.name ?? `${exportEntry.store}-${exportEntry.profile}`;
    if (seenExportNames.has(name)) {
      errors.push(`Duplicate export name "${name}". Give one of them an explicit "name".`);
      continue;
    }
    seenExportNames.add(name);

    let width = profile.width;
    let height = profile.height;
    let customSize = false;
    if (exportEntry.size) {
      width = exportEntry.size.width;
      height = exportEntry.size.height;
      customSize = true;
      const problems = validateCustomSize(exportEntry.store, width, height);
      for (const problem of problems) {
        errors.push(`Export "${name}": custom size ${width}x${height} rejected — ${problem}.`);
      }
    }

    exports.push({
      store: exportEntry.store,
      profileId: exportEntry.profile,
      name,
      outputDir: exportEntry.outputDir
        ? resolveFromConfigDir(loaded.dir, exportEntry.outputDir)
        : resolveFromConfigDir(loaded.dir, raw.output.dir),
      width,
      height,
      customSize,
    });
  }

  if (errors.length > 0) {
    throw new ConfigError(
      errors
        .map((e) => `  - ${e}`)
        .join("\n")
        .replace(/^/, "Configuration problems:\n"),
    );
  }

  return {
    configPath: loaded.path,
    configDir: loaded.dir,
    app: {
      name: raw.app.name,
      tagline: raw.app.tagline,
      story: raw.app.story,
      category: raw.app.category,
    },
    theme: {
      background: raw.theme.background,
      accent: raw.theme.accent,
      text: raw.theme.text,
      muted: raw.theme.mutedText,
      surface: raw.theme.surface,
      mode: raw.theme.mode,
    },
    fonts: resolveFontFiles(loaded.dir, raw.fonts),
    locales,
    template: {
      definition: definition!,
      settings: templateRef.settings,
      autoSelected,
    },
    screenshots,
    exports,
    output: { dir: resolveFromConfigDir(loaded.dir, raw.output.dir), clean: raw.output.clean },
    deprecations,
  };
}

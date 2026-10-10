import fs from "node:fs/promises";
import { StoreShotError } from "../errors.js";
import { loadConfigFile } from "../config/load.js";
import { resolveConfig, type ResolvedConfig } from "../config/resolve.js";
import { buildRenderRequest, deviceFrameFor } from "../render/pipeline.js";
import { Renderer } from "../render/engine.js";
import { unknownSettingKeys } from "../templates/settings.js";
import { hasSupportedImageExtension } from "../util/extensions.js";
import { readImageInfo, type ImageInfo } from "../util/imageSize.js";
import { contrastRatio } from "../util/colors.js";
import { listProfiles } from "../profiles/storeProfiles.js";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  hint?: string;
}

export interface ValidationOutcome {
  resolved: ResolvedConfig | undefined;
  issues: ValidationIssue[];
  overflowChecked: boolean;
}

export interface ValidateOptions {
  /** Render each combination to measure text overflow. Needs a browser. */
  measureOverflow: boolean;
}

/**
 * Full project validation: configuration, assets, translations, store rules
 * and (optionally) rendered text-fit measurement.
 *
 * What this CAN detect: schema violations, missing/corrupt/low-res assets,
 * missing translations, unknown templates and profiles, invalid custom
 * sizes, low text contrast, and text that renders taller than its layout
 * budget.
 *
 * What it CANNOT detect: subjective visual quality, store policy
 * compliance, or whether screenshots look like the real app UI.
 */
export async function validateProject(
  configPath: string | undefined,
  options: ValidateOptions,
): Promise<ValidationOutcome> {
  const issues: ValidationIssue[] = [];

  let resolved: ResolvedConfig | undefined;
  try {
    const loaded = await loadConfigFile(configPath);
    resolved = resolveConfig(loaded);
  } catch (error) {
    if (error instanceof StoreShotError) {
      return {
        resolved: undefined,
        issues: [{ severity: "error", code: "config", message: error.message }],
        overflowChecked: false,
      };
    }
    throw error;
  }

  // --- template settings ------------------------------------------------------
  const template = resolved.template.definition;
  for (const key of unknownSettingKeys(template.settings, resolved.template.settings)) {
    issues.push({
      severity: "warning",
      code: "unknown-template-setting",
      message: `Template "${template.id}" has no setting "${key}".`,
      hint: `Known settings: ${template.settings.map((s) => s.key).join(", ")}.`,
    });
  }
  for (const def of template.settings) {
    const value = resolved.template.settings[def.key];
    if (value === undefined) continue;
    if (def.type === "number") {
      if (typeof value !== "number") {
        issues.push({
          severity: "warning",
          code: "invalid-template-setting",
          message: `Setting "${def.key}" of template "${template.id}" expects a number, got ${typeof value}. Using the default (${def.default}).`,
        });
      } else if (
        def.min !== undefined &&
        def.max !== undefined &&
        (value < def.min || value > def.max)
      ) {
        issues.push({
          severity: "warning",
          code: "template-setting-out-of-range",
          message: `Setting "${def.key}" of template "${template.id}" is ${value}; clamping to [${def.min}, ${def.max}].`,
        });
      }
    } else if (def.type === "boolean" && typeof value !== "boolean") {
      issues.push({
        severity: "warning",
        code: "invalid-template-setting",
        message: `Setting "${def.key}" of template "${template.id}" expects a boolean, got ${typeof value}. Using the default (${def.default}).`,
      });
    }
  }

  // --- fonts --------------------------------------------------------------------
  for (const warning of resolved.fonts.warnings) {
    issues.push({ severity: "warning", code: "font-fallback", message: warning });
  }

  // --- images -------------------------------------------------------------------
  const imageInfos = new Map<string, ImageInfo>();
  for (const screenshot of resolved.screenshots) {
    if (!hasSupportedImageExtension(screenshot.imagePath)) {
      issues.push({
        severity: "error",
        code: "unsupported-image-format",
        message: `Screenshot "${screenshot.id}": unsupported file format ${screenshot.imagePath}.`,
        hint: "Use PNG, JPEG or WebP sources.",
      });
      continue;
    }
    try {
      const stat = await fs.stat(screenshot.imagePath);
      if (!stat.isFile()) {
        throw new Error("not a file");
      }
      imageInfos.set(screenshot.id, await readImageInfo(screenshot.imagePath));
    } catch {
      issues.push({
        severity: "error",
        code: "missing-image",
        message: `Screenshot "${screenshot.id}": image not found or unreadable: ${screenshot.imagePath}.`,
        hint: "Paths resolve relative to the configuration file.",
      });
    }
  }

  const maxExportWidth = Math.max(...resolved.exports.map((e) => e.width));
  for (const screenshot of resolved.screenshots) {
    const info = imageInfos.get(screenshot.id);
    if (info && info.width < maxExportWidth * 0.4) {
      issues.push({
        severity: "warning",
        code: "low-resolution-source",
        message: `Screenshot "${screenshot.id}" is ${info.width}px wide; exports go up to ${maxExportWidth}px wide.`,
        hint: "Sources below ~40% of the export width will look soft in the final listing.",
      });
    }
  }

  // --- store-specific size notes -------------------------------------------------
  for (const exportEntry of resolved.exports) {
    if (exportEntry.customSize && exportEntry.store === "app-store") {
      const official = listProfiles("app-store")
        .map((p) => `${p.width}x${p.height}`)
        .join(", ");
      issues.push({
        severity: "warning",
        code: "custom-app-store-size",
        message: `Export "${exportEntry.name}" uses a custom size ${exportEntry.width}x${exportEntry.height} for the App Store.`,
        hint: `Apple only accepts official device sizes. Verified options: ${official}.`,
      });
    }
  }

  // --- contrast -------------------------------------------------------------------
  const titleContrast = contrastRatio(resolved.theme.text, resolved.theme.background);
  if (titleContrast < 3) {
    issues.push({
      severity: "warning",
      code: "low-contrast",
      message: `Title color ${resolved.theme.text} on background ${resolved.theme.background} has a contrast ratio of ${titleContrast.toFixed(1)}:1.`,
      hint: "Ratios below 3:1 are hard to read on store listings.",
    });
  }

  // --- output directory writability ------------------------------------------------
  const outputRoots = new Set(resolved.exports.map((e) => e.outputDir));
  for (const outputDir of outputRoots) {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.access(outputDir, fs.constants.W_OK);
    } catch (error) {
      issues.push({
        severity: "error",
        code: "output-dir",
        message: `Output directory is not writable: ${outputDir} (${error instanceof Error ? error.message : String(error)}).`,
      });
    }
  }

  // --- rendered overflow measurement -------------------------------------------------
  let overflowChecked = false;
  if (options.measureOverflow && issues.every((issue) => issue.severity !== "error")) {
    let renderer: Renderer | undefined;
    try {
      renderer = await Renderer.launch();
    } catch {
      issues.push({
        severity: "warning",
        code: "overflow-check-skipped",
        message: "Text-overflow measurement was skipped: no Chromium browser available.",
        hint: "Run `storeshot install`, then re-run validate.",
      });
    }
    if (renderer) {
      try {
        overflowChecked = true;
        for (const exportEntry of resolved.exports) {
          for (const locale of resolved.locales) {
            for (const screenshot of resolved.screenshots) {
              const info = imageInfos.get(screenshot.id);
              if (!info) continue;
              const request = buildRenderRequest({
                resolved,
                locale,
                screenshot,
                imageInfo: info,
                size: { width: exportEntry.width, height: exportEntry.height },
                deviceFrame: deviceFrameFor(resolved, screenshot),
              });
              const result = await renderer.render(request);
              for (const family of Object.keys(result.diagnostics.fontChecks)) {
                if (!result.diagnostics.fontChecks[family]) {
                  issues.push({
                    severity: "warning",
                    code: "font-not-loaded",
                    message: `Font family "${family}" did not load for ${request.label}; text falls back to system fonts.`,
                  });
                }
              }
              for (const overflow of result.diagnostics.overflow) {
                if (overflow.rendered > overflow.budget + 2) {
                  issues.push({
                    severity: "error",
                    code: "text-overflow",
                    message: `Screenshot "${screenshot.id}" [${locale.tag}] ${overflow.field}: text needs ${overflow.rendered}px of height but the layout budget is ${overflow.budget}px.`,
                    hint: "Shorten the copy for this locale, pick a more compact template, or use a larger export size.",
                  });
                }
              }
            }
          }
        }
      } finally {
        await renderer.close();
      }
    }
  }

  return { resolved, issues, overflowChecked };
}

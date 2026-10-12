import fs from "node:fs/promises";
import path from "node:path";
import { ConfigError, StoreShotError } from "../errors.js";
import { loadConfigFile } from "../config/load.js";
import { resolveConfig, type ResolvedConfig, type ResolvedLocale } from "../config/resolve.js";
import { Renderer } from "../render/engine.js";
import { buildRenderRequest, deviceFrameFor } from "../render/pipeline.js";
import { buildOutputPath, outputFileName } from "../output/naming.js";
import { hasSupportedImageExtension } from "../util/extensions.js";
import { readImageInfo, type ImageInfo } from "../util/imageSize.js";
import { normalizeLocaleTag } from "../i18n/direction.js";
import { log } from "../util/log.js";

export interface GenerateOptions {
  config?: string;
  locale?: string[];
  export?: string[];
  output?: string;
  allowOverflow: boolean;
}

interface WrittenFile {
  relativePath: string;
  width: number;
  height: number;
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  const loaded = await loadConfigFile(options.config);
  const resolved = resolveConfig(loaded);
  for (const notice of resolved.deprecations) {
    log.warn(notice);
  }

  const locales = filterLocales(resolved, options.locale);
  const exports_ = filterExports(resolved, options.export);
  if (options.output) {
    for (const exportEntry of exports_) {
      exportEntry.outputDir = path.isAbsolute(options.output)
        ? options.output
        : path.resolve(resolved.configDir, options.output);
    }
  }

  // --- source image checks (fail before touching the browser) ------------------
  const imageInfos = new Map<string, ImageInfo>();
  const decorInfos = new Map<string, Record<string, ImageInfo>>();
  const missing: string[] = [];
  for (const screenshot of resolved.screenshots) {
    try {
      if (!hasSupportedImageExtension(screenshot.imagePath)) throw new Error("unsupported");
      imageInfos.set(screenshot.id, await readImageInfo(screenshot.imagePath));
    } catch {
      missing.push(`"${screenshot.id}": ${screenshot.imagePath}`);
    }
    const perShot: Record<string, ImageInfo> = {};
    for (const item of screenshot.decor) {
      try {
        if (!hasSupportedImageExtension(item.imagePath)) throw new Error("unsupported");
        perShot[item.id] = await readImageInfo(item.imagePath);
      } catch {
        missing.push(`"${screenshot.id}" decor "${item.id}": ${item.imagePath}`);
      }
    }
    decorInfos.set(screenshot.id, perShot);
  }
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing or unreadable screenshot source image(s):\n  - ${missing.join("\n  - ")}`,
    );
  }

  if (resolved.output.clean) {
    for (const outputDir of new Set(exports_.map((e) => e.outputDir))) {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  }

  const total = exports_.length * locales.length * resolved.screenshots.length;
  log.info(
    `Generating ${total} screenshot${total === 1 ? "" : "s"} ` +
      `(${resolved.template.definition.id} template, ${locales.map((l) => l.tag).join(" + ")})`,
  );
  if (resolved.template.autoSelected) {
    log.info(
      `Art direction "auto" selected the "${resolved.template.autoSelected.id}" template — ` +
        `${resolved.template.autoSelected.reason}. Set an explicit "template" id to override.`,
    );
  }

  const renderer = await Renderer.launch();
  const written: WrittenFile[] = [];
  const overflowErrors: string[] = [];
  const fontWarnings = new Set<string>();
  let index = 0;

  try {
    for (const exportEntry of exports_) {
      for (const locale of locales) {
        for (const [shotIndex, screenshot] of resolved.screenshots.entries()) {
          index += 1;
          const label = `${exportEntry.name}/${locale.tag}/${screenshot.id}`;
          const fileName = outputFileName(shotIndex, screenshot.id);
          const outputPath = buildOutputPath(
            exportEntry.outputDir,
            exportEntry.name,
            locale.tag,
            fileName,
          );

          const request = buildRenderRequest({
            resolved,
            locale,
            screenshot,
            imageInfo: imageInfos.get(screenshot.id)!,
            decorInfo: decorInfos.get(screenshot.id),
            size: { width: exportEntry.width, height: exportEntry.height },
            deviceFrame: deviceFrameFor(resolved, screenshot),
            index: shotIndex,
            count: resolved.screenshots.length,
          });

          const result = await renderer.render(request);
          log.dim(`  [${index}/${total}] ${label}`);

          for (const [family, ok] of Object.entries(result.diagnostics.fontChecks)) {
            if (!ok) fontWarnings.add(family);
          }

          const overflowing = result.diagnostics.overflow.filter((o) => o.rendered > o.budget + 2);
          if (overflowing.length > 0 && !options.allowOverflow) {
            for (const item of overflowing) {
              overflowErrors.push(
                `Screenshot "${screenshot.id}" [${locale.tag}] ${item.field}: needs ${item.rendered}px, budget is ${item.budget}px`,
              );
            }
            continue; // do not write a knowingly-bad asset
          }

          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, result.png);
          written.push({
            relativePath: path.relative(process.cwd(), outputPath),
            width: result.width,
            height: result.height,
          });
        }
      }
    }
  } finally {
    process.stdout.write("\n");
    await renderer.close();
  }

  for (const family of fontWarnings) {
    log.warn(`Font family "${family}" did not load; system fallback fonts were used.`);
  }

  log.line("");
  if (written.length === 0) {
    log.warn(`No screenshots were written (${overflowErrors.length} blocked by text overflow).`);
  } else {
    log.success(`Wrote ${written.length} of ${total} screenshot(s):`);
  }
  const byExport = new Map<string, WrittenFile[]>();
  for (const file of written) {
    const key = path.dirname(path.dirname(file.relativePath));
    const list = byExport.get(key) ?? [];
    list.push(file);
    byExport.set(key, list);
  }
  for (const [exportDir, files] of byExport) {
    log.line(`  ${exportDir}`);
    for (const file of files) {
      log.dim(
        `    ${path.basename(path.dirname(file.relativePath))}/${path.basename(file.relativePath)}  ${file.width}x${file.height}`,
      );
    }
  }
  if (written.length > 0) {
    log.dim("  All PNG dimensions verified against the configured export sizes.");
  }

  if (overflowErrors.length > 0) {
    log.line("");
    throw new StoreShotError(
      `${overflowErrors.length} text block(s) do not fit their layout:\n  - ${overflowErrors.join("\n  - ")}\n\n` +
        "Fix the copy for those locales (storeshot validate lists them too), or pass --allow-overflow to render anyway.",
      1,
    );
  }
}

function filterLocales(
  resolved: ResolvedConfig,
  requested: string[] | undefined,
): ResolvedLocale[] {
  if (!requested || requested.length === 0) return resolved.locales;
  const selected: ResolvedLocale[] = [];
  for (const tag of requested) {
    const normalized = normalizeLocaleTag(tag);
    const match = resolved.locales.find((locale) => locale.tag === normalized);
    if (!match) {
      throw new ConfigError(
        `Locale "${normalized}" is not configured. Configured locales: ${resolved.locales.map((l) => l.tag).join(", ")}.`,
      );
    }
    selected.push(match);
  }
  return selected;
}

function filterExports(resolved: ResolvedConfig, requested: string[] | undefined) {
  if (!requested || requested.length === 0) return resolved.exports;
  const selected = resolved.exports.filter((exportEntry) => {
    const name = exportEntry.name;
    const storeProfile = `${exportEntry.store}/${exportEntry.profileId}`;
    return (
      requested.includes(name) ||
      requested.includes(storeProfile) ||
      requested.includes(exportEntry.store)
    );
  });
  const unknown = requested.filter(
    (selector) =>
      !resolved.exports.some(
        (e) =>
          selector === e.name || selector === `${e.store}/${e.profileId}` || selector === e.store,
      ),
  );
  if (unknown.length > 0) {
    throw new ConfigError(
      `Unknown export selector(s): ${unknown.join(", ")}. Available: ${resolved.exports
        .map((e) => e.name)
        .join(", ")}.`,
    );
  }
  return selected;
}

import path from "node:path";
import { escapeHtml } from "../util/escapeHtml.js";
import type {
  ResolvedConfig,
  ResolvedExport,
  ResolvedLocale,
  ResolvedScreenshot,
} from "../config/resolve.js";
import { planFontAssets } from "./assets.js";
import { buildDocument } from "./html.js";
import type { RenderAsset, RenderRequest } from "./engine.js";
import type { TemplateContext } from "../templates/types.js";

export const IMAGE_ASSET_DIR = "img";

/**
 * Assemble the full HTML document + asset manifest for one screenshot render.
 * Pure: no IO, no browser. The engine materializes the sandbox from this.
 */
export function buildRenderRequest(input: {
  resolved: ResolvedConfig;
  locale: ResolvedLocale;
  screenshot: ResolvedScreenshot;
  imageInfo: { width: number; height: number };
  /** Measured dimensions for each decorative asset id (empty = no decor). */
  decorInfo?: Record<string, { width: number; height: number }>;
  size: { width: number; height: number };
  deviceFrame: boolean;
  /** Zero-based sequence index and total, for sequence-aware templates. */
  index: number;
  count: number;
}): RenderRequest {
  const { resolved, locale, screenshot, imageInfo, size } = input;
  const template = resolved.template.definition;

  const ext = path.extname(screenshot.imagePath) || ".png";
  const imageUrl = `${IMAGE_ASSET_DIR}/shot${ext}`;

  const decorItems = (screenshot.decor ?? []).map((item) => {
    const itemExt = path.extname(item.imagePath) || ".png";
    const info = input.decorInfo?.[item.id];
    return {
      id: item.id,
      url: `${IMAGE_ASSET_DIR}/decor-${item.id}${itemExt}`,
      width: info?.width ?? 0,
      height: info?.height ?? 0,
      alt: escapeHtml(`${resolved.app.name} — ${item.id}`),
      source: item.imagePath,
    };
  });

  const ctx: TemplateContext = {
    app: resolved.app,
    locale: locale.tag,
    lang: locale.lang,
    dir: locale.dir,
    texts: screenshot.texts[locale.tag] ?? {},
    theme: resolved.theme,
    image: {
      url: imageUrl,
      width: imageInfo.width,
      height: imageInfo.height,
      alt: escapeHtml(`${resolved.app.name} — screenshot ${screenshot.id}`),
      fit: screenshot.fit,
      focalPoint: screenshot.focalPoint,
    },
    // Templates must handle zero decor; items without measured dimensions
    // are dropped rather than guessed.
    decor: decorItems
      .filter((item) => item.width > 0 && item.height > 0)
      .map(({ id, url, width, height, alt }) => ({ id, url, width, height, alt })),
    deviceFrame: input.deviceFrame,
    settings: resolved.template.settings,
    canvas: { width: size.width, height: size.height },
    index: input.index,
    count: input.count,
    role: screenshot.role,
  };

  const { css, html } = template.render(ctx);
  const fontPlan = planFontAssets(resolved.fonts);

  const assets: RenderAsset[] = [
    ...fontPlan.assets,
    { name: imageUrl, source: screenshot.imagePath },
    ...decorItems.map((item) => ({ name: item.url, source: item.source })),
  ];

  const document = buildDocument(
    {
      lang: locale.htmlLang,
      dir: locale.dir,
      width: size.width,
      height: size.height,
      fonts: fontPlan.faces,
      fontFamilies: fontPlan.faces.map((face) => face.family),
    },
    css,
    html,
  );

  const label = `${locale.tag}/${screenshot.id} at ${size.width}x${size.height}`;
  return { html: document, assets, width: size.width, height: size.height, label };
}

export function deviceFrameFor(resolved: ResolvedConfig, screenshot: ResolvedScreenshot): boolean {
  return screenshot.deviceFrame ?? resolved.template.definition.defaultDeviceFrame;
}

export function exportSize(exportEntry: ResolvedExport): { width: number; height: number } {
  return { width: exportEntry.width, height: exportEntry.height };
}

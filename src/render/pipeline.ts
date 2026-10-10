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
  size: { width: number; height: number };
  deviceFrame: boolean;
}): RenderRequest {
  const { resolved, locale, screenshot, imageInfo, size } = input;
  const template = resolved.template.definition;

  const ext = path.extname(screenshot.imagePath) || ".png";
  const imageUrl = `${IMAGE_ASSET_DIR}/shot${ext}`;

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
    },
    deviceFrame: input.deviceFrame,
    settings: resolved.template.settings,
    canvas: { width: size.width, height: size.height },
  };

  const { css, html } = template.render(ctx);
  const fontPlan = planFontAssets(resolved.fonts);

  const assets: RenderAsset[] = [
    ...fontPlan.assets,
    { name: imageUrl, source: screenshot.imagePath },
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

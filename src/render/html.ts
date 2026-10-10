import type { TextDirection } from "../templates/types.js";
import { DEVICE_CSS } from "../design/device.js";
import { HEADLINE_CSS, MASTHEAD_CSS } from "../design/primitives.js";

/**
 * Document shell shared by every template.
 *
 * Rendering rules that keep output deterministic:
 *  - html/body are exactly the export viewport, overflow hidden
 *  - full CSS reset so browser defaults cannot shift layouts
 *  - fonts referenced from the render sandbox directory (no absolute paths,
 *    no network)
 *  - `dir` and `lang` set from the resolved locale; templates use CSS logical
 *    properties so RTL mirrors automatically
 *  - two font stacks exposed as CSS variables: --font-sans (UI/latin) and
 *    --font-display (headlines). The display stack is direction-aware: on RTL
 *    pages Arabic headlines use the Arabic family first and embedded Latin
 *    words fall through to the display serif.
 */

export interface FontFaceDef {
  family: string;
  weight: number | string;
  /** Deterministic file name inside the render sandbox, e.g. "latin-400.ttf". */
  sandboxName: string;
}

export interface DocumentOptions {
  lang: string;
  dir: TextDirection;
  width: number;
  height: number;
  fonts: FontFaceDef[];
  /** Families to verify after loading, surfaced through render diagnostics. */
  fontFamilies: string[];
}

const BASE_CSS = `
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
body {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
img {
  display: block;
}
/* Kicker budget in headline() assumes a 1.4 line-height. */
.t-kicker {
  line-height: 1.4;
}
/* Text measurement boxes: inline-block makes the measured height equal
   line-height x lines, independent of per-script ink metrics (Arabic
   ascenders/diacritics measure taller than the line box otherwise). */
.t-text {
  display: inline-block;
}
`;

export function fontStack(dir: TextDirection): string {
  const arabic = '"StoreShot Arabic"';
  const latin = '"StoreShot Latin"';
  const fallbacks =
    '-apple-system, "Segoe UI", "Noto Sans Arabic", "Noto Sans", "Tahoma", sans-serif';
  return dir === "rtl" ? `${arabic}, ${latin}, ${fallbacks}` : `${latin}, ${arabic}, ${fallbacks}`;
}

export function displayStack(dir: TextDirection): string {
  const arabic = '"StoreShot Arabic"';
  const display = '"StoreShot Display"';
  const latin = '"StoreShot Latin"';
  const fallbacks = '-apple-system, "Segoe UI", "Noto Sans Arabic", "Noto Sans", "Tahoma", serif';
  return dir === "rtl"
    ? `${arabic}, ${display}, ${latin}, ${fallbacks}`
    : `${display}, ${arabic}, ${latin}, ${fallbacks}`;
}

export function buildDocument(options: DocumentOptions, css: string, bodyHtml: string): string {
  const fontFaces = options.fonts
    .map(
      (face) =>
        `@font-face { font-family: "${face.family}"; font-style: normal; ` +
        `font-weight: ${face.weight}; src: url("fonts/${face.sandboxName}") format("truetype"); }`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${options.lang}" dir="${options.dir}">
<head>
<meta charset="utf-8">
<style>
${BASE_CSS}
${DEVICE_CSS}
${HEADLINE_CSS}
${MASTHEAD_CSS}
${fontFaces}
body {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  background: #ffffff;
  --font-sans: ${fontStack(options.dir)};
  --font-display: ${displayStack(options.dir)};
}
${css}
</style>
</head>
<body data-font-families="${options.fontFamilies.join(",")}">
${bodyHtml}
</body>
</html>`;
}

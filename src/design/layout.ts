/**
 * Shared metrics for landscape compositions (product page headers, search
 * results assets, feature graphics). The height is the limiting dimension on
 * wide canvases, so type scales and device slots derive from it. Templates
 * keep their own composition; these constants keep proportions coherent
 * across the library.
 *
 * RTL / Arabic get their own numbers, not mirrored English ones: Arabic
 * script runs wider per character and wraps to more lines at the same optical
 * size, and the reading edge needs more breathing room than a Latin masthead
 * column. Copy length adapts the layout (wider column, extra line budget)
 * deterministically from the configured title — composition adapts to
 * content; text is never silently shrunk to fit.
 */

/** Titles at or beyond this many characters switch to the long-copy layout. */
export const LONG_TITLE_CHARS = 40;

export interface LandscapeMetrics {
  /** Outer padding on all sides. */
  pad: number;
  /** Width of the text column (the device column takes the rest). */
  textWidth: number;
  /** Maximum device height. */
  deviceMaxH: number;
}

export interface LandscapeOptions {
  /** RTL locale (Arabic, Hebrew…): Arabic-first metrics. */
  rtl?: boolean;
  /** Long marketing copy: wider column and a deeper line budget. */
  longTitle?: boolean;
}

export function landscapeMetrics(width: number, height: number, opts: LandscapeOptions = {}): LandscapeMetrics {
  const rtl = opts.rtl ?? false;
  const long = opts.longTitle ?? false;
  return {
    // Arabic ascenders/descenders and stacked ligatures read cramped at the
    // Latin inset; long copy also wants a wider measure, so it gets its
    // breathing from the pad instead of the device gutter.
    pad: Math.round(height * (rtl ? 0.105 : 0.085)),
    textWidth: Math.round(width * (long ? (rtl ? 0.44 : 0.47) : rtl ? 0.4 : 0.43)),
    deviceMaxH: Math.round(height * 0.86),
  };
}

export function landscapeSizes(
  height: number,
  width?: number,
  rtl = false,
  longTitle = false,
): { kicker: number; title: number; subtitle: number } {
  // On very wide canvases (21:9 headers) the height alone would set an
  // oversized headline; clamp the title by width too. Arabic letterforms
  // carry more visual mass than Latin caps at the same point size, so the
  // RTL scale keeps the optical weight equal — not the em value. Long copy
  // takes one deliberate step down so five-line headlines stay comfortable
  // on short banners (feature graphics) — the overflow gate still enforces
  // the result, and the step is a rule, not a silent shrink.
  const scale = rtl ? 0.88 : 1;
  const long = longTitle ? 0.85 : 1;
  const title = (width ? Math.min(height * 0.14, width * 0.052) : height * 0.14) * scale * long;
  return {
    kicker: height * 0.03 * scale,
    title,
    subtitle: height * 0.044 * (rtl ? 0.96 : 1),
  };
}

/**
 * Line budgets for landscape headline blocks. Arabic wraps to roughly one
 * extra line per Latin line at equal optical size; long copy needs one more
 * line still. The overflow gate still enforces the result — these budgets
 * exist so real marketing copy fits without shrinking.
 */
export function landscapeLines(rtl = false, longTitle = false): { title: number; subtitle: number } {
  if (rtl) return { title: longTitle ? 5 : 4, subtitle: 3 };
  return { title: longTitle ? 4 : 3, subtitle: 3 };
}

/** Deterministic long-copy detection shared by every landscape template. */
export function isLongTitle(ctx: { texts: { title?: string } }): boolean {
  return (ctx.texts.title ?? "").length >= LONG_TITLE_CHARS;
}

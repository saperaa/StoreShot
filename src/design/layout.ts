/**
 * Shared metrics for landscape compositions (product page headers, search
 * results assets). The height is the limiting dimension on wide canvases, so
 * type scales and device slots derive from it. Templates keep their own
 * composition; these constants keep proportions coherent across the library.
 */

export interface LandscapeMetrics {
  /** Outer padding on all sides. */
  pad: number;
  /** Width of the text column (the device column takes the rest). */
  textWidth: number;
  /** Maximum device height. */
  deviceMaxH: number;
}

export function landscapeMetrics(width: number, height: number): LandscapeMetrics {
  return {
    pad: Math.round(height * 0.085),
    textWidth: Math.round(width * 0.43),
    deviceMaxH: Math.round(height * 0.86),
  };
}

export function landscapeSizes(
  height: number,
  width?: number,
): { kicker: number; title: number; subtitle: number } {
  // On very wide canvases (21:9 headers) the height alone would set an
  // oversized headline; clamp the title by width too.
  const title = width ? Math.min(height * 0.14, width * 0.052) : height * 0.14;
  return {
    kicker: height * 0.03,
    title,
    subtitle: height * 0.044,
  };
}

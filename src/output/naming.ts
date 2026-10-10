import path from "node:path";
import { assertSafeSegment } from "../util/paths.js";

/**
 * Deterministic output layout:
 *   <outputDir>/<exportName>/<locale>/<index-two-digits>-<screenshotId>.png
 * Ordering follows the screenshots array in the configuration.
 */
export function outputFileName(index: number, screenshotId: string): string {
  const safeId = assertSafeSegment("screenshot id", screenshotId);
  return `${String(index + 1).padStart(2, "0")}-${safeId}.png`;
}

export function buildOutputPath(
  outputDir: string,
  exportName: string,
  localeTag: string,
  fileName: string,
): string {
  return path.join(
    outputDir,
    assertSafeSegment("export name", exportName),
    assertSafeSegment("locale tag", localeTag),
    assertSafeSegment("file name", fileName),
  );
}

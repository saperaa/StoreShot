import path from "node:path";

/** Resolve a possibly-relative config path against the config file's directory. */
export function resolveFromConfigDir(configDir: string, p: string): string {
  const normalized = p.replace(/\\/g, "/");
  return path.isAbsolute(normalized) ? path.normalize(p) : path.resolve(configDir, p);
}

/**
 * A path segment that StoreShot itself controls inside the output tree
 * (export name, locale tag, file name). Must never contain separators.
 */
export function assertSafeSegment(kind: string, segment: string): string {
  if (
    segment.length === 0 ||
    segment === "." ||
    segment === ".." ||
    segment.includes("/") ||
    segment.includes("\\") ||
    segment.includes("\0")
  ) {
    throw new Error(`Unsafe ${kind} in output path: ${JSON.stringify(segment)}`);
  }
  return segment;
}

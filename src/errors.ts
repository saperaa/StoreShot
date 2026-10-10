/**
 * Error taxonomy for StoreShot.
 *
 * Exit codes:
 *   0 — success
 *   1 — configuration / validation error (user needs to fix their project:
 *       copy that cannot fit its layout region, unbreakable runs, sources)
 *   2 — rendering / runtime error (browser launch, asset IO during render)
 */

export class StoreShotError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = new.target.name;
    this.exitCode = exitCode;
  }
}

/** The configuration file is missing, unreadable, or fails schema validation. */
export class ConfigError extends StoreShotError {
  constructor(message: string) {
    super(message, 1);
  }
}

/**
 * The composition cannot be laid out with the given content: text clipped at
 * a canvas edge, out of its region, or a screen that cannot present its
 * source. Actionable from the project (shorten copy, change settings,
 * fix the source image) — so it exits like a validation error, not a crash.
 */
export class LayoutError extends StoreShotError {
  constructor(message: string) {
    super(message, 1);
  }
}

/** A rendering or browser-level failure. */
export class RenderError extends StoreShotError {
  constructor(message: string) {
    super(message, 2);
  }
}

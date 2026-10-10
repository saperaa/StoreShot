/**
 * Error taxonomy for StoreShot.
 *
 * Exit codes:
 *   0 — success
 *   1 — configuration / validation error (user needs to fix their project)
 *   2 — rendering / runtime error (browser launch, asset IO during render, etc.)
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

/** A rendering or browser-level failure. */
export class RenderError extends StoreShotError {
  constructor(message: string) {
    super(message, 2);
  }
}

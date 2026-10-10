import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { RenderError } from "../errors.js";
import { log } from "../util/log.js";

/**
 * Download the bundled Chromium used for rendering.
 * Wraps `playwright-core install chromium` so users do not need to know about
 * Playwright internals.
 */
export async function runInstall(): Promise<void> {
  const require = createRequire(import.meta.url);
  let cliPath: string;
  try {
    const packageJsonPath = require.resolve("playwright-core/package.json");
    cliPath = path.join(path.dirname(packageJsonPath), "cli.js");
  } catch {
    throw new RenderError(
      "Could not locate the playwright-core package inside the StoreShot installation.",
    );
  }

  log.info("Downloading Chromium (one-time setup, ~170 MB)…");
  const result = spawnSync(process.execPath, [cliPath, "install", "chromium"], {
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new RenderError(
      `Chromium installation failed${result.status ? ` (exit code ${result.status})` : ""}. ` +
        "Check your network connection and try again, or set STORESHOT_BROWSER_CHANNEL to use an " +
        "installed browser such as chrome or msedge.",
    );
  }
  log.success("Chromium installed. Run `storeshot generate` to render screenshots.");
}

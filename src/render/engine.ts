import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { RenderError } from "../errors.js";
import { assertPngDimensions } from "../util/imageSize.js";
import { measurePage } from "./pageMeasure.js";

/**
 * HTML -> PNG rendering engine.
 *
 * Determinism contract:
 *  - Every render happens in a fresh sandbox directory with a known set of
 *    local files; external network requests are blocked at the route level.
 *  - The viewport equals the export size exactly (deviceScaleFactor 1), so
 *    the PNG is pixel-for-pixel the requested canvas.
 *  - Captures only happen after `document.fonts.ready` AND every <img> has
 *    decoded, plus two animation frames of settle time.
 *  - The sandbox is deleted afterwards; nothing leaks into the project.
 */

export interface RenderAsset {
  /** Relative path inside the sandbox, e.g. "fonts/latin-400.ttf". */
  name: string;
  /** Absolute path of the source file on disk. */
  source: string;
}

export interface RenderRequest {
  html: string;
  assets: RenderAsset[];
  width: number;
  height: number;
  /** Human-readable label used in error messages. */
  label: string;
}

export interface OverflowMeasurement {
  field: string;
  rendered: number;
  budget: number;
}

export interface RenderDiagnostics {
  /** Which requested font families resolved to loaded faces. */
  fontChecks: Record<string, boolean>;
  /** Assets referenced by the page that failed to load. */
  failedAssets: string[];
  /** Any external (non-file://) URL the page tried to request. */
  blockedExternalRequests: string[];
  /** Text fields whose rendered height exceeds their declared budget. */
  overflow: OverflowMeasurement[];
}

export interface RenderResult {
  png: Buffer;
  width: number;
  height: number;
  diagnostics: RenderDiagnostics;
}

export class Renderer {
  #browser: Browser;

  private constructor(browser: Browser) {
    this.#browser = browser;
  }

  static async launch(): Promise<Renderer> {
    const requestedChannel = process.env.STORESHOT_BROWSER_CHANNEL;
    const channels: Array<string | undefined> = requestedChannel
      ? [requestedChannel]
      : [undefined, "chrome", "msedge"];

    const failures: string[] = [];
    for (const channel of channels) {
      try {
        const browser = await chromium.launch({
          ...(channel ? { channel } : {}),
          args: [
            "--allow-file-access-from-files",
            "--force-color-profile=srgb",
            "--disable-lcd-text",
          ],
        });
        return new Renderer(browser);
      } catch (error) {
        failures.push(
          `${channel ? `channel "${channel}"` : "bundled Chromium"}: ${
            error instanceof Error ? error.message.split("\n")[0] : String(error)
          }`,
        );
      }
    }
    throw new RenderError(
      "Could not launch a Chromium-based browser for rendering.\n" +
        `Attempts:\n  - ${failures.join("\n  - ")}\n\n` +
        "Fix: run `storeshot install` to download the bundled Chromium, or set " +
        "STORESHOT_BROWSER_CHANNEL to an installed browser (chrome, msedge).",
    );
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "storeshot-"));
    let context: BrowserContext | undefined;
    try {
      for (const asset of request.assets) {
        const destination = path.join(sandbox, asset.name.replace(/\.\.[\\/]/g, ""));
        await fs.mkdir(path.dirname(destination), { recursive: true });
        try {
          await fs.copyFile(asset.source, destination);
        } catch (error) {
          throw new RenderError(
            `Could not read asset ${asset.source} while rendering ${request.label}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      await fs.writeFile(path.join(sandbox, "index.html"), request.html, "utf8");

      context = await this.#browser.newContext({
        viewport: { width: request.width, height: request.height },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });

      const diagnostics: RenderDiagnostics = {
        fontChecks: {},
        failedAssets: [],
        blockedExternalRequests: [],
        overflow: [],
      };

      await context.route("**/*", (route) => {
        const url = route.request().url();
        if (url.startsWith("file://")) return route.continue();
        diagnostics.blockedExternalRequests.push(url);
        return route.abort();
      });

      const page = await context.newPage();
      await page.goto(pathToFileURL(path.join(sandbox, "index.html")).href, {
        waitUntil: "load",
      });

      const measured = await page.evaluate(measurePage);
      diagnostics.fontChecks = measured.fontChecks;
      diagnostics.failedAssets = measured.failedAssets;
      diagnostics.overflow = measured.overflow;

      if (diagnostics.failedAssets.length > 0) {
        throw new RenderError(
          `Failed to load image asset(s) while rendering ${request.label}: ` +
            `${diagnostics.failedAssets.join(", ")}.`,
        );
      }
      if (diagnostics.blockedExternalRequests.length > 0) {
        throw new RenderError(
          `The template for ${request.label} attempted a network request ` +
            `(${diagnostics.blockedExternalRequests[0]}). StoreShot renders fully offline; ` +
            "this is a bug in a template or an asset path that resolves to a URL.",
        );
      }

      const png = Buffer.from(
        await page.screenshot({
          type: "png",
          fullPage: false,
          animations: "disabled",
          caret: "hide",
        }),
      );

      assertPngDimensions(png, request.width, request.height, request.label);
      return { png, width: request.width, height: request.height, diagnostics };
    } finally {
      await context?.close().catch(() => undefined);
      await fs.rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    await this.#browser.close().catch(() => undefined);
  }
}

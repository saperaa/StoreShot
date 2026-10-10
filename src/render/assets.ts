import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StoreshotConfig } from "../config/schema.js";
import type { RenderAsset } from "./engine.js";

/**
 * Font resolution and the fallback strategy.
 *
 * StoreShot ships IBM Plex Sans and IBM Plex Sans Arabic (SIL OFL 1.1 — see
 * assets/fonts/_licenses/). Users can point the config at their own font
 * files. Missing files produce a warning and fall back to the packaged font
 * for that family, so rendering never silently switches to a browser default.
 */

export interface FontFiles {
  regular?: string;
  semibold?: string;
  bold?: string;
}

export interface ResolvedFonts {
  latin: FontFiles;
  arabic: FontFiles;
  warnings: string[];
}

export const PACKAGED_FONT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/fonts",
);

export const DEFAULT_FONTS: Record<"latin" | "arabic", FontFiles> = {
  latin: {
    regular: "IBMPlexSans-Regular.ttf",
    semibold: "IBMPlexSans-SemiBold.ttf",
    bold: "IBMPlexSans-Bold.ttf",
  },
  arabic: {
    regular: "IBMPlexSansArabic-Regular.ttf",
    semibold: "IBMPlexSansArabic-SemiBold.ttf",
    bold: "IBMPlexSansArabic-Bold.ttf",
  },
};

export function packagedFontPath(fileName: string): string {
  return path.join(PACKAGED_FONT_DIR, fileName);
}

export function resolveFontFiles(
  configDir: string,
  fonts: StoreshotConfig["fonts"],
): ResolvedFonts {
  const warnings: string[] = [];

  const resolveFamily = (
    family: "latin" | "arabic",
    userFiles: FontFiles | undefined,
  ): FontFiles => {
    if (!userFiles) {
      // Packaged defaults; verify they exist so a broken install is loud.
      const result: FontFiles = {};
      for (const [weight, name] of Object.entries(DEFAULT_FONTS[family])) {
        const absolute = packagedFontPath(name);
        if (fs.existsSync(absolute)) {
          result[weight as keyof FontFiles] = absolute;
        } else {
          warnings.push(
            `Packaged ${family} font missing: ${name}. Reinstall storeshot-cli to restore bundled fonts.`,
          );
        }
      }
      return result;
    }

    const result: FontFiles = {};
    let foundAny = false;
    for (const weight of ["regular", "semibold", "bold"] as const) {
      const relative = userFiles[weight];
      if (!relative) continue;
      const absolute = path.isAbsolute(relative) ? relative : path.resolve(configDir, relative);
      if (fs.existsSync(absolute)) {
        result[weight] = absolute;
        foundAny = true;
      } else {
        warnings.push(
          `Configured ${family}.${weight} font not found: ${relative}. ` +
            `Falling back to the ${weight} bundled font for this family.`,
        );
      }
    }
    if (foundAny) {
      // Fill gaps for missing weights from the packaged family so the
      // browser always finds a real file for 400/600/700.
      for (const [weight, name] of Object.entries(DEFAULT_FONTS[family])) {
        if (!result[weight as keyof FontFiles]) {
          const absolute = packagedFontPath(name);
          if (fs.existsSync(absolute)) result[weight as keyof FontFiles] = absolute;
        }
      }
      return result;
    }
    warnings.push(`No usable font files found for fonts.${family}; using bundled ${family} fonts.`);
    return resolveFamily(family, undefined);
  };

  return {
    latin: resolveFamily("latin", fonts?.latin),
    arabic: resolveFamily("arabic", fonts?.arabic),
    warnings,
  };
}

export interface PlannedFontFace {
  family: "StoreShot Latin" | "StoreShot Arabic";
  weight: 400 | 600 | 700;
  sandboxName: string;
}

/**
 * Turn resolved font files into sandbox @font-face entries plus the asset
 * copies the engine must materialize. Only weights with a real file are
 * declared; missing weights fall back to whichever neighbors exist.
 */
export function planFontAssets(fonts: ResolvedFonts): {
  faces: PlannedFontFace[];
  assets: RenderAsset[];
} {
  const faces: PlannedFontFace[] = [];
  const assets: RenderAsset[] = [];
  const seen = new Map<string, string>(); // absolute path -> sandbox name

  const addFamily = (family: "StoreShot Latin" | "StoreShot Arabic", files: FontFiles) => {
    for (const weight of [400, 600, 700] as const) {
      const file = files[weight === 400 ? "regular" : weight === 600 ? "semibold" : "bold"];
      if (!file) continue;
      let sandboxName = seen.get(file);
      if (!sandboxName) {
        const ext = path.extname(file) || ".ttf";
        sandboxName = `${family === "StoreShot Latin" ? "latin" : "arabic"}-${weight}${ext}`;
        seen.set(file, sandboxName);
        assets.push({ name: `fonts/${sandboxName}`, source: file });
      }
      faces.push({ family, weight, sandboxName });
    }
  };

  addFamily("StoreShot Latin", fonts.latin);
  addFamily("StoreShot Arabic", fonts.arabic);
  return { faces, assets };
}

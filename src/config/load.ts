import fs from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import { ConfigError } from "../errors.js";
import { CONFIG_FILE_NAMES, storeshotConfigSchema, type StoreshotConfig } from "./schema.js";

export interface LoadedConfig {
  raw: StoreshotConfig;
  /** Absolute path of the config file. */
  path: string;
  /** Directory containing the config file; relative asset paths resolve from here. */
  dir: string;
}

export function formatZodIssues(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const location = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    return `  - ${location}: ${issue.message}`;
  });
  return `Invalid configuration:\n${lines.join("\n")}\n\nSee the configuration reference: https://github.com/saperaa/StoreShot/blob/main/docs/configuration.md`;
}

/**
 * Load and validate a StoreShot configuration file.
 * Throws {@link ConfigError} with actionable messages on any problem.
 */
export async function loadConfigFile(explicitPath?: string): Promise<LoadedConfig> {
  const candidates = explicitPath
    ? [explicitPath]
    : CONFIG_FILE_NAMES.map((name) => path.resolve(process.cwd(), name));

  let configPath: string | undefined;
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        configPath = candidate;
        break;
      }
    } catch {
      // try next candidate
    }
  }

  if (!configPath) {
    if (explicitPath) {
      throw new ConfigError(`Configuration file not found: ${explicitPath}`);
    }
    throw new ConfigError(
      `No configuration file found in ${process.cwd()}. ` +
        `Expected one of: ${CONFIG_FILE_NAMES.join(", ")}. ` +
        `Run "storeshot init" to create a starter project.`,
    );
  }

  let text: string;
  try {
    text = await fs.readFile(configPath, "utf8");
  } catch (error) {
    throw new ConfigError(
      `Could not read configuration file ${configPath}: ${describeFsError(error)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigError(
      `Configuration file ${path.basename(configPath)} is not valid JSON: ${message}`,
    );
  }

  const result = storeshotConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(formatZodIssues(result.error));
  }

  return { raw: result.data, path: configPath, dir: path.dirname(configPath) };
}

function describeFsError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "EACCES" || code === "EPERM") return "permission denied";
  if (code === "EISDIR") return "expected a file but found a directory";
  return error instanceof Error ? error.message : String(error);
}

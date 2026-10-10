import type { TemplateSettingDef } from "./types.js";

/** Read a boolean setting, falling back to the template's declared default. */
export function boolSetting(
  defs: readonly TemplateSettingDef[],
  settings: Record<string, unknown>,
  key: string,
): boolean {
  const def = defs.find((d) => d.key === key);
  const fallback = def?.default;
  const value = settings[key];
  if (typeof value === "boolean") return value;
  return typeof fallback === "boolean" ? fallback : false;
}

/** Read a number setting with its default, clamped to its declared range. */
export function numberSetting(
  defs: readonly TemplateSettingDef[],
  settings: Record<string, unknown>,
  key: string,
): number {
  const def = defs.find((d) => d.key === key);
  if (!def || typeof def.default !== "number") return 0;
  const value = settings[key];
  let n = typeof value === "number" && Number.isFinite(value) ? value : def.default;
  if (def.min !== undefined) n = Math.max(def.min, n);
  if (def.max !== undefined) n = Math.min(def.max, n);
  return n;
}

/** Setting keys the template does not know about (reported as warnings). */
export function unknownSettingKeys(
  defs: readonly TemplateSettingDef[],
  settings: Record<string, unknown>,
): string[] {
  const known = new Set(defs.map((d) => d.key));
  return Object.keys(settings).filter((key) => !known.has(key));
}

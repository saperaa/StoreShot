import { normalizeLocaleTag } from "./direction.js";

/** Either one string shared by every locale, or a per-locale map. */
export type LocalizedText = string | Record<string, string>;

export type TextMatch = "exact" | "language" | "none";

export interface ResolvedText {
  value: string | undefined;
  matchedVia: TextMatch;
}

/**
 * Resolve the text for a locale from a localized value.
 *
 * Lookup order:
 *   1. Exact tag match ("ar-EG" -> "ar-EG")
 *   2. Primary-language match ("ar-EG" falls back to an "ar" key)
 *   3. Nothing (caller reports a missing translation)
 *
 * Plain strings apply to every locale.
 */
export function resolveLocalizedText(
  text: LocalizedText | undefined,
  locale: string,
): ResolvedText {
  if (text === undefined) return { value: undefined, matchedVia: "none" };
  if (typeof text === "string") return { value: text, matchedVia: "exact" };

  const wanted = normalizeLocaleTag(locale);
  const wantedLang = wanted.split("-")[0]!;

  for (const [key, value] of Object.entries(text)) {
    let normalized: string;
    try {
      normalized = normalizeLocaleTag(key);
    } catch {
      continue;
    }
    if (normalized === wanted) return { value, matchedVia: "exact" };
  }
  for (const [key, value] of Object.entries(text)) {
    let normalized: string;
    try {
      normalized = normalizeLocaleTag(key);
    } catch {
      continue;
    }
    if (normalized.split("-")[0] === wantedLang) return { value, matchedVia: "language" };
  }
  return { value: undefined, matchedVia: "none" };
}

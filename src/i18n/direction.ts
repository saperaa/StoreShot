/**
 * Locale parsing and text-direction defaults.
 *
 * Direction is derived from the locale's primary language subtag using the
 * IANA language subtag registry. Users can override any locale explicitly in
 * configuration via the top-level `direction` map.
 */

/** Primary language subtags written right-to-left. */
export const RTL_LANGUAGES: readonly string[] = [
  "ar", // Arabic
  "ckb", // Kurdish (Sorani)
  "dv", // Divehi
  "fa", // Persian
  "he", // Hebrew
  "nqo", // N'Ko
  "ps", // Pashto
  "sd", // Sindhi
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
];

const RTL_SET = new Set(RTL_LANGUAGES);

export const LOCALE_TAG_PATTERN = /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/;

export interface ParsedLocale {
  /** Primary language subtag, lowercase, e.g. "ar". */
  lang: string;
  /** Full normalized tag with dashes, e.g. "ar-EG". */
  tag: string;
}

/** Normalize a locale tag: underscores become dashes; case is preserved for the region. */
export function normalizeLocaleTag(tag: string): string {
  const cleaned = tag.trim().replace(/_/g, "-");
  if (!LOCALE_TAG_PATTERN.test(cleaned)) {
    throw new Error(
      `Invalid locale tag ${JSON.stringify(tag)}. Use BCP-47 style tags such as "en-US" or "ar".`,
    );
  }
  const parts = cleaned.split("-");
  parts[0] = parts[0]!.toLowerCase();
  if (parts.length >= 2 && parts[1]!.length === 4) {
    // Script subtags are title case, e.g. "ar-XX" -> not applicable here, keep as-is.
    parts[1] = parts[1]![0]!.toUpperCase() + parts[1]!.slice(1).toLowerCase();
  } else if (parts.length >= 2) {
    parts[1] = parts[1]!.toUpperCase();
  }
  return parts.join("-");
}

export function parseLocale(tag: string): ParsedLocale {
  const normalized = normalizeLocaleTag(tag);
  return { lang: normalized.split("-")[0]!, tag: normalized };
}

/** Default direction for a locale tag, based on its primary language. */
export function defaultDirection(tag: string): "ltr" | "rtl" {
  return RTL_SET.has(parseLocale(tag).lang) ? "rtl" : "ltr";
}

/** Resolve direction for a locale, honoring explicit per-locale overrides. */
export function resolveDirection(
  tag: string,
  overrides: Readonly<Record<string, "ltr" | "rtl">> = {},
): "ltr" | "rtl" {
  const normalized = normalizeLocaleTag(tag);
  const lang = normalized.split("-")[0]!;
  const exact = overrides[normalized];
  if (exact) return exact;
  // A language-level override ("ar") also covers regional tags ("ar-EG").
  const languageLevel = overrides[lang];
  if (languageLevel) return languageLevel;
  return defaultDirection(normalized);
}

/** Value for the `<html lang>` attribute. */
export function htmlLang(tag: string): string {
  return normalizeLocaleTag(tag);
}

import type { AppCategory } from "../config/schema.js";

/**
 * Deterministic art direction: pick a template from declared project
 * metadata.
 *
 * This is deliberately a small rule set, not a classifier. It consumes only
 * information the project states explicitly — the configured app category,
 * whether decorative assets were actually provided, and the export
 * orientation. It never reads free text to guess a category, and `"auto"`
 * is opt-in: an explicit template id always wins.
 */

export interface CompositionInput {
  /** Declared `app.category` (undefined = no opinion). */
  category?: AppCategory;
  /** Whether any screenshot supplies decorative assets. */
  hasDecor: boolean;
  /** Orientation of the primary export (landscape headers favor restraint). */
  orientation: "portrait" | "landscape";
}

export interface CompositionChoice {
  templateId: string;
  /** Human-readable rule that fired, surfaced to the user. */
  reason: string;
}

/**
 * Category → template rules. Each rule states the design intent it
 * encodes; the order is the evaluation order.
 */
const CATEGORY_RULES: ReadonlyArray<{
  categories: readonly AppCategory[];
  templateId: string;
  reason: string;
}> = [
  {
    categories: ["finance"],
    templateId: "swiss",
    reason: 'finance apps prioritize trust and readable data — the typographic grid of "swiss"',
  },
  {
    categories: ["productivity", "education"],
    templateId: "linea",
    reason: 'productivity apps favor clarity and restraint — the quiet presentation of "linea"',
  },
  {
    categories: ["games"],
    templateId: "strata",
    reason: 'games carry dramatic compositions — the layered depth of "strata"',
  },
  {
    categories: ["food", "shopping"],
    templateId: "tilt",
    reason: 'food and shopping apps suit energetic compositions — the tilted poster of "tilt"',
  },
  {
    categories: ["social"],
    templateId: "aurora",
    reason: 'social apps suit vibrant color fields — the light-field composition of "aurora"',
  },
  {
    categories: ["health", "travel"],
    templateId: "cinematic",
    reason:
      'lifestyle apps suit aspirational photography — the product-studio staging of "cinematic"',
  },
];

/**
 * Choose a template deterministically.
 *
 * Rule order: explicit decorative assets first (the project supplied
 * artwork, so a template that can show it wins), then the declared
 * category, then a neutral editorial default. Landscape exports pick the
 * same template — every template ships a dedicated landscape composition.
 */
export function selectComposition(input: CompositionInput): CompositionChoice {
  if (input.hasDecor) {
    return {
      templateId: "float",
      reason:
        "the project supplies decorative assets — the floating-product composition of " +
        '"float" can show them',
    };
  }
  const rule = CATEGORY_RULES.find(
    (r) => input.category !== undefined && r.categories.includes(input.category),
  );
  if (rule) return { templateId: rule.templateId, reason: rule.reason };
  return {
    templateId: "editorial",
    reason: "no declared category — the editorial default stays safe for any app",
  };
}

/**
 * Ranked recommendations for display (templates listing, docs). The first
 * entry is what selectComposition returns; the rest are sensible
 * alternatives for the same input.
 */
export function recommendCompositions(input: CompositionInput): CompositionChoice[] {
  const first = selectComposition(input);
  const alternatives: CompositionChoice[] = [];
  if (input.hasDecor) {
    alternatives.push(
      { templateId: "tilt", reason: "energetic alternative that tolerates absent assets" },
      { templateId: "strata", reason: "layered alternative with strong depth" },
    );
  } else if (input.category !== undefined && input.category !== "other") {
    alternatives.push(
      { templateId: "editorial", reason: "restrained alternative for any category" },
      { templateId: "cinematic", reason: "photographic alternative" },
    );
  } else {
    alternatives.push(
      { templateId: "cinematic", reason: "photographic alternative" },
      { templateId: "linea", reason: "minimal alternative" },
    );
  }
  return [first, ...alternatives.filter((a) => a.templateId !== first.templateId)];
}

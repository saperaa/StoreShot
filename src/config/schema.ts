import { z } from "zod";
import { LOCALE_TAG_PATTERN } from "../i18n/direction.js";

export const CONFIG_FILE_NAMES = ["storeshot.config.json", "storeshot.json"] as const;

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const hexColor = z
  .string()
  .trim()
  .regex(HEX_COLOR_PATTERN, 'must be a hex color like "#62E6B5" (#RGB or #RRGGBB)');

const localeTag = z
  .string()
  .trim()
  .min(1)
  .regex(LOCALE_TAG_PATTERN, 'must be a BCP-47 style locale tag like "en-US" or "ar"');

/** One font weight = one font file. All optional; anything missing falls back. */
export const fontFilesSchema = z.object({
  regular: z.string().trim().min(1).optional(),
  semibold: z.string().trim().min(1).optional(),
  bold: z.string().trim().min(1).optional(),
});

export const themeSchema = z
  .object({
    background: hexColor.default("#0E1524"),
    accent: hexColor.default("#62E6B5"),
    text: hexColor.default("#FFFFFF"),
    mutedText: hexColor.default("#9AA7BD"),
    /** Elevated panel color (design token). */
    surface: hexColor.optional(),
    /** Force light/dark token behavior instead of deriving from the background. */
    mode: z.enum(["auto", "light", "dark"]).default("auto"),
  })
  .prefault({});

/** Either a single string for all locales, or a per-locale map. */
export const localizedTextSchema = z.union([
  z.string().trim().min(1),
  z.record(z.string(), z.string().trim().min(1)),
]);

export const templateRefSchema = z.union([
  z.string().trim().min(1),
  z.object({
    id: z.string().trim().min(1),
    settings: z.record(z.string(), z.unknown()).optional(),
  }),
]);

/**
 * A decorative asset for compositions that support floating objects
 * (transparent PNG/WebP — product shots, badges, brand marks). Position,
 * rotation and depth are the template's job; the config only supplies the
 * artwork. Templates must compose cleanly without any decor.
 */
export const decorItemSchema = z.object({
  /** Stable identifier the template can address (e.g. "tomato"). */
  id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "may contain letters, digits, dashes and underscores"),
  /** Transparent PNG or WebP, resolved relative to the config file. */
  image: z.string().trim().min(1),
});

export const screenshotSchema = z.object({
  /** Stable identifier used in output file names. */
  id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "may contain letters, digits, dashes and underscores"),
  image: z.string().trim().min(1),
  /** Optional decorative assets for composition templates (see `decorItemSchema`). */
  decor: z.array(decorItemSchema).max(16).optional(),
  title: localizedTextSchema.optional(),
  subtitle: localizedTextSchema.optional(),
  /** Per-screenshot override of the template's device-frame default. */
  deviceFrame: z.boolean().optional(),
  /** Optional semantic role in the campaign ("hero", "feature", "trust"…). */
  role: z.string().trim().min(1).optional(),
  /** Optional localized marketing prompt, e.g. a search-bar placeholder ("Find a flight"). */
  prompt: localizedTextSchema.optional(),
  /** How the source screenshot fills the device screen. "cover" may crop (use focalPoint to choose what stays); "contain" never crops. */
  fit: z.enum(["cover", "contain"]).optional(),
  /** Focal point for cover cropping: { "x": 0.5, "y": 0.4 } (0-1, default center-top). */
  focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
});

/**
 * Declared app categories for deterministic art direction. Used only when
 * the project opts in (`"template": "auto"`) — StoreShot never guesses a
 * category from free text.
 */
export const APP_CATEGORIES = [
  "food",
  "shopping",
  "finance",
  "productivity",
  "games",
  "health",
  "education",
  "travel",
  "social",
  "other",
] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];

export const exportSchema = z.object({
  store: z.enum(["app-store", "google-play"]),
  profile: z.string().trim().min(1),
  /** Override the profile's pixel size (advanced). */
  size: z
    .object({
      width: z.number().int().min(16).max(8000),
      height: z.number().int().min(16).max(8000),
    })
    .optional(),
  /** Sub-directory name for this export. Defaults to "<store>-<profile>". */
  name: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "may contain letters, digits, dashes and underscores")
    .optional(),
  /** Per-export output directory override (relative to the config file). */
  outputDir: z.string().trim().min(1).optional(),
});

export const storeshotConfigSchema = z.object({
  $schema: z.string().optional(),
  /** Schema/config version. Only 1 exists today. */
  configVersion: z.literal(1).default(1),
  app: z.object({
    name: z.string().trim().min(1),
    tagline: z.string().trim().min(1).optional(),
    /**
     * One or two sentences about what the app does and who it is for.
     * StoreShot keeps it next to the project so anyone editing copy or
     * translations has the full context. Not rendered on screenshots.
     */
    story: z.string().trim().min(1).optional(),
    /**
     * Declared store category. Feeds the deterministic art-direction rules
     * when `"template": "auto"`; no effect otherwise.
     */
    category: z.enum(APP_CATEGORIES).optional(),
  }),
  theme: themeSchema,
  fonts: z
    .object({
      latin: fontFilesSchema.optional(),
      arabic: fontFilesSchema.optional(),
      /** Display/headline family (bundled default: Fraunces, a variable font). */
      display: fontFilesSchema.optional(),
    })
    .optional(),
  locales: z.array(localeTag).min(1).default(["en-US"]),
  /** Explicit direction overrides, e.g. { "ar": "rtl" }. */
  direction: z.record(z.string(), z.enum(["ltr", "rtl"])).default({}),
  template: templateRefSchema.default("gradient"),
  /** Shorthand settings when `template` is a plain id. */
  templateSettings: z.record(z.string(), z.unknown()).optional(),
  screenshots: z.array(screenshotSchema).min(1),
  exports: z.array(exportSchema).min(1),
  output: z
    .object({
      dir: z.string().trim().min(1).default("./storeshots"),
      /** Delete the output directory contents before generating. */
      clean: z.boolean().default(false),
    })
    .prefault({}),
});

export type StoreshotConfig = z.infer<typeof storeshotConfigSchema>;
export type ScreenshotConfig = z.infer<typeof screenshotSchema>;
export type ExportConfig = z.infer<typeof exportSchema>;

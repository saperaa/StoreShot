/** Contract every StoreShot template implements. See docs/template-guide.md. */

export type TextDirection = "ltr" | "rtl";

export interface TemplateTexts {
  title?: string;
  subtitle?: string;
  /** Localized marketing prompt for interface-inspired layers (search bar…). */
  prompt?: string;
}

export interface TemplateImage {
  /** Virtual URL inside the render sandbox, e.g. "img/shot.png". */
  url: string;
  width: number;
  height: number;
  alt: string;
  /** Fitting strategy for the device screen (default "cover"). */
  fit?: "cover" | "contain";
  /** Focal point for cover crops, 0-1 (default 0.5 / 0.4). */
  focalPoint?: { x: number; y: number };
}

/**
 * A decorative asset supplied by the config (transparent PNG/WebP): floating
 * product shots, badges, marks. Templates position them through decorLayer;
 * every template must still compose cleanly when the list is empty.
 */
export interface TemplateDecorItem {
  /** Config-supplied identifier (also usable in template settings). */
  id: string;
  url: string;
  /** Natural pixel size — used to preserve aspect and transparency. */
  width: number;
  height: number;
  alt: string;
}

export interface TemplateTheme {
  background: string;
  accent: string;
  text: string;
  muted: string;
  /** Elevated panel color (design token input; optional). */
  surface?: string;
  /** "light" | "dark" | "auto" token override (optional). */
  mode?: "light" | "dark" | "auto";
}

export interface TemplateContext {
  app: { name: string; tagline?: string; story?: string };
  locale: string;
  /** Primary language subtag, lowercase. */
  lang: string;
  dir: TextDirection;
  texts: TemplateTexts;
  theme: TemplateTheme;
  image: TemplateImage;
  /** Optional decorative assets for this screenshot (empty when unconfigured). */
  decor: TemplateDecorItem[];
  deviceFrame: boolean;
  settings: Record<string, unknown>;
  canvas: { width: number; height: number };
  /** Zero-based position of this screenshot in the configured sequence. */
  index: number;
  /** Total screenshots in the sequence. */
  count: number;
  /** Optional semantic role from the config (e.g. "hero", "feature"). */
  role?: string;
}

export interface TemplateRender {
  /** Extra <style> rules. Rules are emitted inside the page's stylesheet. */
  css: string;
  /** Markup placed inside the page body. */
  html: string;
}

export interface TemplateSettingDef {
  key: string;
  type: "boolean" | "number" | "string";
  default: number | boolean | string;
  /** For numbers. */
  min?: number;
  max?: number;
  /** For strings: the accepted values. */
  values?: readonly string[];
  description: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  defaultDeviceFrame: boolean;
  settings: readonly TemplateSettingDef[];
  render(ctx: TemplateContext): TemplateRender;
}

/** Round to integer pixels to keep layouts deterministic. */
export function px(n: number): string {
  return `${Math.round(n)}px`;
}

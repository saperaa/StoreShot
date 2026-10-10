/** Contract every StoreShot template implements. See docs/template-guide.md. */

export type TextDirection = "ltr" | "rtl";

export interface TemplateTexts {
  title?: string;
  subtitle?: string;
}

export interface TemplateImage {
  /** Virtual URL inside the render sandbox, e.g. "img/shot.png". */
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface TemplateTheme {
  background: string;
  accent: string;
  text: string;
  muted: string;
}

export interface TemplateContext {
  app: { name: string; tagline?: string };
  locale: string;
  /** Primary language subtag, lowercase. */
  lang: string;
  dir: TextDirection;
  texts: TemplateTexts;
  theme: TemplateTheme;
  image: TemplateImage;
  deviceFrame: boolean;
  settings: Record<string, unknown>;
  canvas: { width: number; height: number };
}

export interface TemplateRender {
  /** Extra <style> rules. Rules are emitted inside the page's stylesheet. */
  css: string;
  /** Markup placed inside the page body. */
  html: string;
}

export interface TemplateSettingDef {
  key: string;
  type: "boolean" | "number";
  default: number | boolean;
  /** For numbers. */
  min?: number;
  max?: number;
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

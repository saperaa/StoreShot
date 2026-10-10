import type { TemplateDefinition } from "./types.js";
import { minimalTemplate } from "./minimal.js";
import { gradientTemplate } from "./gradient.js";
import { deviceFocusTemplate } from "./deviceFocus.js";
import { spotlightTemplate } from "./spotlight.js";

export const TEMPLATES: readonly TemplateDefinition[] = [
  minimalTemplate,
  gradientTemplate,
  deviceFocusTemplate,
  spotlightTemplate,
];

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

export function listTemplates(): readonly TemplateDefinition[] {
  return TEMPLATES;
}

export function templateIds(): string[] {
  return TEMPLATES.map((template) => template.id);
}

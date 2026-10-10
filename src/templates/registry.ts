import type { TemplateDefinition } from "./types.js";
import { editorialTemplate } from "./editorial.js";
import { cinematicTemplate } from "./cinematic.js";
import { cinematic3dTemplate } from "./cinematic3d.js";
import { swissTemplate } from "./swiss.js";
import { campaignTemplate } from "./campaign.js";
import { immersiveTemplate } from "./immersive.js";
import { showcaseTemplate } from "./showcase.js";
import { discoveryTemplate } from "./discovery.js";

export const TEMPLATES: readonly TemplateDefinition[] = [
  editorialTemplate,
  cinematicTemplate,
  cinematic3dTemplate,
  swissTemplate,
  campaignTemplate,
  immersiveTemplate,
  showcaseTemplate,
  discoveryTemplate,
];

/**
 * Pre-v0.2 template ids still resolve (to their redesigned successors) so
 * existing configurations keep rendering. resolveConfig surfaces a
 * deprecation notice whenever an alias is used.
 */
export const TEMPLATE_ALIASES: Readonly<Record<string, string>> = {
  minimal: "swiss",
  gradient: "campaign",
  "device-focus": "immersive",
  spotlight: "cinematic",
};

export function getTemplate(id: string): TemplateDefinition | undefined {
  const canonical = TEMPLATES.find((template) => template.id === id);
  if (canonical) return canonical;
  const alias = TEMPLATE_ALIASES[id];
  if (alias) return TEMPLATES.find((template) => template.id === alias);
  return undefined;
}

export function listTemplates(): readonly TemplateDefinition[] {
  return TEMPLATES;
}

export function templateIds(): string[] {
  return TEMPLATES.map((template) => template.id);
}

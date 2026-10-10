import { escapeHtml } from "../util/escapeHtml.js";
import { px } from "./types.js";
import type { TemplateContext } from "./types.js";

/**
 * Shared kicker/title/subtitle markup used by every template.
 *
 * Every text element carries:
 *   - `data-field` so diagnostics can name the offending field
 *   - `data-max-height` = the vertical budget (lines x line-height x font-size)
 *
 * The measurement attributes live on an inner <span> that holds ONLY the
 * text, so decorative chrome around it (e.g. the gradient template's pill
 * padding) is never mistaken for text overflow.
 *
 * Templates must NOT clamp these elements with overflow:hidden or fixed
 * heights; the validator measures real rendered heights against the budget
 * and fails the build when a text block does not fit.
 */

export interface TextBlockSizes {
  kicker: number;
  title: number;
  subtitle: number;
}

export interface TextBlockLines {
  kicker?: number;
  title: number;
  subtitle: number;
}

export function textBlockHtml(
  ctx: TemplateContext,
  sizes: TextBlockSizes,
  lines: TextBlockLines,
): string {
  const parts: string[] = [];
  const kickerLines = lines.kicker ?? 1;
  const kickerBudget = Math.ceil(kickerLines * sizes.kicker * 1.4);
  parts.push(
    `<div class="t-kicker" style="font-size:${px(sizes.kicker)}">` +
      `<span class="t-text" data-field="kicker" data-max-height="${kickerBudget}">${escapeHtml(
        ctx.app.name,
      )}</span></div>`,
  );
  if (ctx.texts.title !== undefined) {
    const budget = Math.ceil(lines.title * sizes.title * 1.16);
    parts.push(
      `<div class="t-title" style="font-size:${px(sizes.title)}">` +
        `<span class="t-text" data-field="title" data-max-height="${budget}">${escapeHtml(
          ctx.texts.title,
        )}</span></div>`,
    );
  }
  if (ctx.texts.subtitle !== undefined) {
    const budget = Math.ceil(lines.subtitle * sizes.subtitle * 1.5);
    parts.push(
      `<div class="t-subtitle" style="font-size:${px(sizes.subtitle)}">` +
        `<span class="t-text" data-field="subtitle" data-max-height="${budget}">${escapeHtml(
          ctx.texts.subtitle,
        )}</span></div>`,
    );
  }
  return parts.join("\n");
}

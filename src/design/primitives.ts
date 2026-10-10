import { escapeHtml } from "../util/escapeHtml.js";
import type { DesignTokens } from "./tokens.js";
import type { TemplateContext } from "../templates/types.js";
import { px } from "../templates/types.js";

/**
 * Composition primitives shared by every template: headline blocks with
 * distinct typographic characters, mastheads, overlines, rules and chips.
 *
 * All text elements carry data-field/data-max-height on an inner span so the
 * overflow validator measures real rendered text, never decorative chrome.
 */

export type HeadlineStyle = "editorial" | "swiss" | "campaign" | "cinematic" | "display";

export interface HeadlineSizes {
  kicker: number;
  title: number;
  subtitle: number;
}

export interface HeadlineLines {
  kicker?: number;
  title: number;
  subtitle: number;
}

export interface HeadlineOptions {
  ctx: TemplateContext;
  tokens: DesignTokens;
  style: HeadlineStyle;
  sizes: HeadlineSizes;
  lines: HeadlineLines;
  align?: "start" | "center";
  kicker?: "overline" | "chip" | "masthead" | "none";
  /** Multiply the title size (user-facing headlineScale setting, ~0.8-1.3). */
  scale?: number;
  /** Subtitle max width in px (keeps measure comfortable). */
  subtitleMaxWidth?: number;
  /** Extra class on the block root for template-level styling. */
  className?: string;
}

const STYLE_SPEC: Record<
  HeadlineStyle,
  {
    font: string;
    weight: number;
    tracking: string;
    titleLh: number;
    subtitleLh: number;
    upper: boolean;
  }
> = {
  editorial: {
    font: "var(--font-display)",
    weight: 600,
    tracking: "-0.01em",
    titleLh: 1.05,
    subtitleLh: 1.6,
    upper: false,
  },
  swiss: {
    font: "var(--font-sans)",
    weight: 700,
    tracking: "-0.015em",
    titleLh: 1.06,
    subtitleLh: 1.55,
    upper: false,
  },
  campaign: {
    font: "var(--font-sans)",
    weight: 700,
    tracking: "-0.01em",
    titleLh: 1.02,
    subtitleLh: 1.5,
    upper: true,
  },
  cinematic: {
    font: "var(--font-sans)",
    weight: 600,
    tracking: "0em",
    titleLh: 1.16,
    subtitleLh: 1.6,
    upper: false,
  },
  display: {
    font: "var(--font-sans)",
    weight: 700,
    tracking: "-0.02em",
    titleLh: 1.05,
    subtitleLh: 1.55,
    upper: false,
  },
};

export function headline(options: HeadlineOptions): string {
  const { ctx, style, sizes, lines } = options;
  const spec = STYLE_SPEC[style];
  const align = options.align ?? "start";
  const scale = options.scale ?? 1;
  const titleSize = Math.round(sizes.title * scale);
  const kickerKind = options.kicker ?? "overline";
  const parts: string[] = [];

  parts.push(`<div class="hl hl-${style} hl-${align} ${options.className ?? ""}">`);

  if (kickerKind !== "none") {
    const kickerSize = Math.round(sizes.kicker);
    const kickerBudget = Math.ceil((lines.kicker ?? 1) * kickerSize * 1.4);
    const name = escapeHtml(ctx.app.name);
    const label = `<span class="t-text" data-field="kicker" data-max-height="${kickerBudget}">${name}</span>`;
    if (kickerKind === "chip") {
      parts.push(`<div class="hl-chip" style="font-size:${px(kickerSize)}">${label}</div>`);
    } else if (kickerKind === "overline") {
      parts.push(
        `<div class="hl-overline" style="font-size:${px(kickerSize)}"><span class="hl-dash"></span>${label}</div>`,
      );
    } else {
      parts.push(`<div class="hl-masthead" style="font-size:${px(kickerSize)}">${label}</div>`);
    }
  }

  if (ctx.texts.title !== undefined) {
    const budget = Math.ceil(lines.title * titleSize * spec.titleLh);
    parts.push(
      `<div class="hl-title" data-max-lines="${lines.title}" style="font-size:${px(
        titleSize,
      )}; line-height:${spec.titleLh}">` +
        `<span class="t-text" data-field="title" data-max-height="${budget}">${escapeHtml(
          ctx.texts.title,
        )}</span></div>`,
    );
  }

  if (ctx.texts.subtitle !== undefined) {
    const budget = Math.ceil(lines.subtitle * sizes.subtitle * spec.subtitleLh);
    parts.push(
      `<div class="hl-subtitle" style="font-size:${px(sizes.subtitle)}; line-height:${
        spec.subtitleLh
      }${options.subtitleMaxWidth ? `; max-width:${px(options.subtitleMaxWidth)}` : ""}">` +
        `<span class="t-text" data-field="subtitle" data-max-height="${budget}">${escapeHtml(
          ctx.texts.subtitle,
        )}</span></div>`,
    );
  }

  parts.push("</div>");
  return parts.join("");
}

/** Shared styles every headline style needs; emitted once per page. */
export const HEADLINE_CSS = `
.hl { display: flex; flex-direction: column; align-items: flex-start; }
.hl-center { align-items: center; text-align: center; }
/* Kicker budgets in headline() assume 1.4. */
.hl-overline, .hl-chip, .hl-masthead { line-height: 1.4; }
.hl .hl-title { color: var(--hl-text); font-family: var(--hl-title-font); font-weight: var(--hl-title-weight); letter-spacing: var(--hl-title-tracking); margin-block-start: var(--hl-gap); }
.hl .hl-subtitle { color: var(--hl-muted); font-family: var(--font-sans); font-weight: 400; margin-block-start: var(--hl-gap-s); }
[dir="rtl"] .hl .hl-title, [dir="rtl"] .hl .hl-subtitle { letter-spacing: 0 !important; text-transform: none; }
.hl .hl-overline { display: inline-flex; align-items: center; gap: 0.7em; color: var(--hl-accent); font-family: var(--font-sans); font-weight: 600; }
.hl .hl-overline .hl-dash { width: 2.2em; height: 0.16em; border-radius: 999px; background: var(--hl-accent); flex: none; }
[dir="ltr"] .hl .hl-overline, [dir="ltr"] .hl .hl-masthead, [dir="ltr"] .hl .hl-chip { text-transform: uppercase; letter-spacing: 0.16em; }
[dir="rtl"] .hl .hl-overline, [dir="rtl"] .hl .hl-masthead, [dir="rtl"] .hl .hl-chip { letter-spacing: 0.02em; }
.hl .hl-chip { display: inline-flex; align-items: center; padding: 0.55em 1.25em; border-radius: 999px; border: 1px solid var(--hl-accent-line); color: var(--hl-accent); font-family: var(--font-sans); font-weight: 600; background: var(--hl-chip-bg); }
.hl .hl-masthead { color: var(--hl-muted); font-family: var(--font-sans); font-weight: 600; }
`;

/** Configure the headline style for one page (applies to .hl-* elements). */
export function headlineVars(
  tokens: DesignTokens,
  style: HeadlineStyle,
  gap: number,
  gapS: number,
): string {
  const spec = STYLE_SPEC[style];
  return [
    `--hl-text: ${tokens.text}`,
    `--hl-muted: ${tokens.muted}`,
    `--hl-accent: ${tokens.accent}`,
    `--hl-accent-line: ${tokens.accentGlow(0.55)}`,
    `--hl-chip-bg: ${tokens.accentGlow(tokens.mode === "dark" ? 0.1 : 0.08)}`,
    `--hl-title-font: ${spec.font}`,
    `--hl-title-weight: ${spec.weight}`,
    `--hl-title-tracking: ${spec.tracking}`,
    `--hl-gap: ${px(gap)}`,
    `--hl-gap-s: ${px(gapS)}`,
  ].join("; ");
}

/** Top masthead bar: app name on one end, sequence position on the other. */
export function masthead(ctx: TemplateContext, tokens: DesignTokens, size: number): string {
  const index = String(ctx.index + 1).padStart(2, "0");
  const count = String(ctx.count).padStart(2, "0");
  return `<div class="mh" style="font-size:${px(size)}">
  <span class="mh-name">${escapeHtml(ctx.app.name)}</span>
  <span class="mh-dots"></span>
  <span class="mh-index">${index} / ${count}</span>
</div>`;
}

export const MASTHEAD_CSS = `
.mh { display: flex; align-items: center; gap: 1em; color: var(--mh-muted); font-family: var(--font-sans); font-weight: 600; }
.mh .mh-name { color: var(--mh-text); }
.mh .mh-index { font-variant-numeric: tabular-nums; opacity: 0.85; }
.mh .mh-dots { flex: 1; height: 1px; background: var(--mh-line); }
[dir="ltr"] .mh { text-transform: uppercase; letter-spacing: 0.14em; }
[dir="rtl"] .mh { letter-spacing: 0.02em; }
`;

export function mastheadVars(tokens: DesignTokens): string {
  return `--mh-text: ${tokens.text}; --mh-muted: ${tokens.muted}; --mh-line: ${tokens.lineSoft};`;
}

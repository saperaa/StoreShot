import { darken, lighten, relativeLuminance, withAlpha } from "../util/colors.js";

/**
 * Design tokens derived from the user's theme.
 *
 * Templates never consume raw theme colors directly — they consume tokens, so
 * light and dark compositions, shadows and hairlines stay coherent across the
 * whole library without per-template guesswork.
 */

export interface ThemeInput {
  background: string;
  accent: string;
  text: string;
  muted: string;
  /** Elevated panel color; defaults to a stepped shade of the background. */
  surface?: string;
  /** Force light/dark shadow & contrast behavior. Default: derived. */
  mode?: "auto" | "light" | "dark";
}

export interface DesignTokens {
  mode: "light" | "dark";
  bg: string;
  surface: string;
  /** A second, slightly stronger step for layered panels. */
  surfaceAlt: string;
  text: string;
  muted: string;
  accent: string;
  /** Readable text color on accent surfaces. */
  onAccent: string;
  /** Hairline rules and borders. */
  line: string;
  lineSoft: string;
  /** Layered box-shadows tuned for the mode. */
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  /** Soft ambient color for glows/floors, as rgba(). */
  accentGlow(alpha: number): string;
  blackShadow(alpha: number): string;
}

export function buildTokens(theme: ThemeInput): DesignTokens {
  const mode: "light" | "dark" =
    theme.mode && theme.mode !== "auto"
      ? theme.mode
      : relativeLuminance(theme.background) < 0.35
        ? "dark"
        : "light";

  const surface = theme.surface ?? (mode === "dark" ? lighten(theme.background, 0.05) : "#FFFFFF");
  const surfaceAlt =
    mode === "dark" ? lighten(theme.background, 0.09) : darken(theme.background, 0.04);

  const onAccent = relativeLuminance(theme.accent) > 0.45 ? "#0B1220" : "#FFFFFF";

  const black = mode === "dark" ? "rgba(0,0,0," : "rgba(23,28,38,";
  const shadow = (a: number, y: number, blur: number, spread = 0) =>
    `0 ${y}px ${blur}px ${spread}px ${black}${a})`;

  return {
    mode,
    bg: theme.background,
    surface,
    surfaceAlt,
    text: theme.text,
    muted: theme.muted,
    accent: theme.accent,
    onAccent,
    line: withAlpha(theme.text, mode === "dark" ? 0.14 : 0.16),
    lineSoft: withAlpha(theme.text, mode === "dark" ? 0.07 : 0.09),
    shadowSm: shadow(mode === "dark" ? 0.4 : 0.14, 6, 18),
    shadowMd: shadow(mode === "dark" ? 0.5 : 0.18, 14, 44),
    shadowLg: shadow(mode === "dark" ? 0.62 : 0.22, 28, 90, mode === "dark" ? -10 : 0),
    accentGlow: (alpha: number) => withAlpha(theme.accent, alpha),
    blackShadow: (alpha: number) => `${black}${alpha})`,
  };
}

export type { ThemeInput as DesignThemeInput };

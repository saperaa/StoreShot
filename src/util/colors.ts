export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(input: string): boolean {
  return HEX_PATTERN.test(input.trim());
}

export function parseHexColor(input: string): Rgb {
  const trimmed = input.trim();
  if (!isHexColor(trimmed)) {
    throw new Error(`Invalid hex color: ${JSON.stringify(input)} (expected #RGB or #RRGGBB)`);
  }
  let hex = trimmed.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function cssColor(rgb: Rgb, alpha = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function withAlpha(hex: string, alpha: number): string {
  return cssColor(parseHexColor(hex), alpha);
}

export function mix(a: string, b: string, t: number): string {
  const ca = parseHexColor(a);
  const cb = parseHexColor(b);
  const clamped = Math.min(1, Math.max(0, t));
  const to = (x: number, y: number) => Math.round(x + (y - x) * clamped);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const mixed = {
    r: to(ca.r, cb.r),
    g: to(ca.g, cb.g),
    b: to(ca.b, cb.b),
  };
  return `#${toHex(mixed.r)}${toHex(mixed.g)}${toHex(mixed.b)}`;
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1..21. */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

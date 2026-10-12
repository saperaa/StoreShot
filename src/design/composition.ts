import { escapeHtml } from "../util/escapeHtml.js";
import type { DesignTokens } from "./tokens.js";
import type { TemplateDecorItem } from "../templates/types.js";
import { px } from "../templates/types.js";

/**
 * Layered composition primitives: explicit z-ordering, 2D transforms,
 * decorative assets and geometric background treatments.
 *
 * These complement the device/headline systems: renderDevice produces a
 * device block, layer() places and transforms it, decorLayer() drops in
 * optional transparent assets, and the field/band/ring helpers build the
 * background. Every primitive carries the geometry-safety contract the
 * renderer enforces:
 *
 *  - Elements that intentionally leave the canvas must pass `bleed: true`
 *    (emitted as data-bleed="true"), otherwise the engine reports
 *    accidental clipping as a layout violation.
 *  - Decor layers render `.deco` elements, which the engine bounds-checks
 *    the same way it checks devices.
 *  - All positions are explicit pixels derived from ctx.canvas — no
 *    randomness, no ambient state.
 */

export interface LayerPlacement {
  /** Physical edges, px. */
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  /** Logical edges, px — mirrored automatically in RTL compositions. */
  insetInlineStart?: number;
  insetInlineEnd?: number;
  /** 2D rotation in degrees around `origin` (default center). */
  rotate?: number;
  /** Uniform scale multiplier on top of the element's own size. */
  scale?: number;
  /** Explicit z-order — the composition contract requires it on every layer. */
  z: number;
  /** Intentional off-canvas bleed; skips the bounds safety check. */
  bleed?: boolean;
  /** transform-origin (default "50% 50%"). */
  origin?: string;
  /** Extra class for template-level styling. */
  className?: string;
}

/**
 * Wrap markup in a positioned, optionally transformed layer. Physical
 * offsets position the element's box BEFORE the transform; rotate/scale
 * apply around `origin`. Use rotatedBounds() to predict where the
 * transformed box lands when deciding whether bleed is needed.
 */
export function layer(innerHtml: string, p: LayerPlacement): string {
  const style: string[] = ["position:absolute", `z-index:${p.z}`];
  if (p.left !== undefined) style.push(`left:${px(p.left)}`);
  if (p.top !== undefined) style.push(`top:${px(p.top)}`);
  if (p.right !== undefined) style.push(`right:${px(p.right)}`);
  if (p.bottom !== undefined) style.push(`bottom:${px(p.bottom)}`);
  if (p.insetInlineStart !== undefined) style.push(`inset-inline-start:${px(p.insetInlineStart)}`);
  if (p.insetInlineEnd !== undefined) style.push(`inset-inline-end:${px(p.insetInlineEnd)}`);
  const transforms: string[] = [];
  if (p.rotate) transforms.push(`rotate(${p.rotate}deg)`);
  if (p.scale !== undefined && p.scale !== 1) transforms.push(`scale(${p.scale})`);
  if (transforms.length > 0) style.push(`transform:${transforms.join(" ")}`);
  if (p.origin) style.push(`transform-origin:${p.origin}`);
  return (
    `<div class="layer${p.className ? ` ${p.className}` : ""}" ` +
    `style="${style.join("; ")}"${p.bleed ? ' data-bleed="true"' : ""}>${innerHtml}</div>`
  );
}

/** Center an element of known size on a canvas point (all in px). */
export function centeredLayer(
  innerHtml: string,
  size: { width: number; height: number },
  center: { x: number; y: number },
  p: Omit<LayerPlacement, "left" | "top" | "insetInlineStart" | "insetInlineEnd">,
): string {
  return layer(innerHtml, {
    ...p,
    left: center.x - size.width / 2,
    top: center.y - size.height / 2,
  });
}

/**
 * Axis-aligned bounding box of a w×h box after rotate(deg)·scale — the
 * geometry the bounds checker sees (getBoundingClientRect). Templates use
 * this to decide whether a transform is intentional bleed or accidental
 * clipping, and to keep rotated devices off the text.
 */
export function rotatedBounds(
  width: number,
  height: number,
  rotateDeg = 0,
  scale = 1,
): { width: number; height: number } {
  const rad = (Math.abs(rotateDeg) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    width: (width * cos + height * sin) * scale,
    height: (width * sin + height * cos) * scale,
  };
}

/* ---------------------------------------------------------------- decor --- */

export interface DecorPlacement extends LayerPlacement {
  /** Rendered width in px; height derives from the asset's natural aspect. */
  width: number;
}

/**
 * A decorative asset layer: transparent PNG/WebP at a computed position,
 * rotation and depth. The image renders at its natural aspect ratio
 * (height: auto), so transparency and shape survive; the wrapping `.deco`
 * element is what the geometry checker measures.
 */
export function decorLayer(item: TemplateDecorItem, p: DecorPlacement): string {
  const height = (p.width * item.height) / item.width;
  const img =
    `<img class="deco-img" src="${item.url}" alt="${escapeHtml(item.alt)}" ` +
    `style="width:${px(p.width)}; height:${px(height)}; display:block;">`;
  return layer(img, {
    ...p,
    className: `deco deco-${item.id}${p.className ? ` ${p.className}` : ""}`,
  });
}

/* ----------------------------------------------------------- background --- */

/**
 * Background field for a composition: a solid theme color, a soft vertical
 * wash into the elevated surface, or a directional beam with a soft accent
 * glow (the "high-contrast background" behind dramatic compositions).
 * Returns a CSS `background` value. `glow` anchors the beam's light pool —
 * anchor it near the composition's hero element.
 */
export function fieldBackground(
  tokens: DesignTokens,
  kind: "solid" | "wash" | "beam" = "wash",
  angle = 180,
  glow: { x: string; y: string } = { x: "18%", y: "92%" },
): string {
  if (kind === "solid") return tokens.bg;
  if (kind === "beam") {
    // Directional light: a soft accent beam sweeping across the field,
    // stronger near one corner — direction, not wallpaper.
    return [
      `radial-gradient(120% 90% at ${glow.x} ${glow.y}, ${tokens.accentGlow(0.32)} 0%, transparent 55%)`,
      `linear-gradient(${angle}deg, ${tokens.bg} 0%, ${tokens.surfaceAlt} 135%)`,
    ].join(", ");
  }
  return `linear-gradient(${angle}deg, ${tokens.bg} 0%, ${tokens.surfaceAlt} 135%)`;
}

export interface BandPlacement {
  /** Rotation of the band in degrees. */
  angle: number;
  /** Vertical position of the band's top edge, px (pre-transform). */
  top: number;
  /** Band thickness, px. */
  height: number;
  /** Band width; defaults to 160% of the canvas so rotations never gap. */
  width?: number;
  left?: number;
  color: string;
  z: number;
  bleed?: boolean;
}

/** A flat diagonal color band behind (or in front of) the device. */
export function bandLayer(p: BandPlacement): string {
  const html = `<div style="width:${px(p.width ?? 0)}; height:${px(p.height)}; background:${p.color};"></div>`;
  return layer(html, {
    left: p.left ?? 0,
    top: p.top,
    rotate: p.angle,
    z: p.z,
    bleed: p.bleed,
  });
}

export interface RingPlacement {
  /** Center of the ring, px. */
  cx: number;
  cy: number;
  /** Outer diameter, px. */
  diameter: number;
  /** Stroke thickness, px. */
  stroke: number;
  color: string;
  z: number;
  bleed?: boolean;
  /** Render as a filled disc instead of a ring. */
  fill?: boolean;
}

/** A decorative ring (or filled disc) — the geometric counterpart to decor assets. */
export function ringLayer(p: RingPlacement): string {
  const html =
    `<div style="width:${px(p.diameter)}; height:${px(p.diameter)}; border-radius:50%;` +
    (p.fill ? ` background:${p.color};` : ` border:${px(p.stroke)} solid ${p.color};`) +
    `"></div>`;
  return centeredLayer(
    html,
    { width: p.diameter, height: p.diameter },
    { x: p.cx, y: p.cy },
    {
      z: p.z,
      bleed: p.bleed,
    },
  );
}

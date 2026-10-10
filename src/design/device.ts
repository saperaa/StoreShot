import type { TemplateImage } from "../templates/types.js";

/**
 * Device presentation system.
 *
 * Three modes:
 *  - "bare": the screenshot alone, rounded and shadowed (UI is the hero)
 *  - "front": premium front-facing device — aluminum rail, glass bezel,
 *    exact-aspect screen, specular glare, island, side buttons
 *  - "angled": the device in perspective with an optional second device
 *    layered behind it, plus a ground shadow
 *
 * The inner screen always matches the screenshot's natural aspect ratio
 * exactly: the app UI is scaled proportionally and never stretched, cropped
 * or covered (the island overlaps only the app's own status-bar area, the
 * way real device photos do).
 *
 * Generic premium hardware only — this deliberately does not imitate a
 * specific phone model.
 */

export type DeviceMode = "bare" | "front" | "angled";

/** Map the "deviceMode" template setting (default "auto") to a concrete mode. */
export function resolveDeviceMode(
  value: string | undefined,
  deviceFrame: boolean,
  framedDefault: DeviceMode,
): DeviceMode {
  if (value === "bare" || value === "front" || value === "angled") return value;
  return deviceFrame ? framedDefault : "bare";
}

export interface DeviceSpec {
  image: TemplateImage;
  mode: DeviceMode;
  /** Maximum device width in px (the whole assembly, including rails). */
  maxWidth: number;
  /** Maximum device height in px (the whole assembly). */
  maxHeight: number;
  /** Rotate the device in 3D (angled mode only). */
  rotateY?: number;
  rotateZ?: number;
  /** Layer a second, dimmed device behind (angled mode only). */
  backLayer?: boolean;
  /** Subtle specular glare over the screen (front/angled). Default true. */
  glare?: boolean;
  /** Home indicator bar at the screen base (front/angled). Default true. */
  homeIndicator?: boolean;
  /** Dynamic-island cutout (front/angled). Default true. */
  island?: boolean;
  /** Extra class on the root for template-level positioning. */
  className?: string;
}

export interface DeviceRender {
  html: string;
  css: string;
  width: number;
  height: number;
  mode: DeviceMode;
}

/** Global component CSS — instances configure themselves with custom props. */
export const DEVICE_CSS = `
.dev {
  position: relative;
  width: var(--dw);
  height: var(--dh);
  flex: none;
}
.dev .dev-rail {
  position: absolute;
  inset: 0;
  border-radius: var(--dradius);
  background: linear-gradient(150deg, #454b58 0%, #12151d 28%, #2e3440 55%, #0b0d12 100%);
  box-shadow: var(--dshadow);
}
.dev .dev-glass {
  position: absolute;
  inset: var(--drail);
  border-radius: calc(var(--dradius) - var(--drail) * 0.5);
  background: #04060a;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.dev .dev-screen {
  position: absolute;
  inset: var(--dbezel);
  border-radius: var(--dsradius);
  overflow: hidden;
  background: #000;
}
.dev .dev-screen img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.dev .dev-glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 22%, transparent 46%);
  opacity: var(--dglare);
  pointer-events: none;
}
.dev .dev-island {
  position: absolute;
  top: calc(var(--dbezel) + var(--disland-gap));
  left: 50%;
  transform: translateX(-50%);
  width: var(--disland-w);
  height: var(--disland-h);
  border-radius: calc(var(--disland-h) / 2);
  background: #04060a;
}
.dev .dev-home {
  position: absolute;
  bottom: calc(var(--dbezel) * 0.42);
  left: 50%;
  transform: translateX(-50%);
  width: var(--dhome-w);
  height: var(--dhome-h);
  border-radius: calc(var(--dhome-h) / 2);
  background: rgba(255, 255, 255, 0.82);
}
.dev .dev-btn {
  position: absolute;
  width: var(--dbtn-w);
  border-radius: 2px;
  background: linear-gradient(180deg, #3b414d, #191d26);
}
.dev .dev-btn.vol1 { inset-inline-start: calc(var(--dbtn-w) * -1 - 2px); top: 21%; height: 7%; }
.dev .dev-btn.vol2 { inset-inline-start: calc(var(--dbtn-w) * -1 - 2px); top: 29.5%; height: 5%; }
.dev .dev-btn.pwr { inset-inline-end: calc(var(--dbtn-w) * -1 - 2px); top: 25%; height: 9.5%; }
.dev .dev-back {
  position: absolute;
  inset: 0;
  border-radius: var(--dradius);
  background: linear-gradient(150deg, #323847 0%, #0d0f15 60%);
  filter: brightness(0.62) saturate(0.85);
}
.dev-stage {
  perspective: var(--dpersp);
  perspective-origin: 50% 42%;
  transform-style: preserve-3d;
}
.dev-tilt {
  transform-style: preserve-3d;
  transform: rotateY(var(--drot-y)) rotateZ(var(--drot-z));
}
.dev-ground {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--dground-off) * -1);
  width: var(--dground-w);
  height: var(--dground-h);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, var(--dground-c) 0%, transparent 68%);
  pointer-events: none;
}
`;

export function renderDevice(spec: DeviceSpec): DeviceRender {
  const aspect = spec.image.width / spec.image.height;
  const glare = spec.glare !== false;
  const island = spec.island !== false;
  const home = spec.homeIndicator !== false;

  if (spec.mode === "bare") {
    // Fit the screenshot into the slot; one dimension is rounded and the
    // other derived from it so the aspect survives integer pixels exactly.
    let width = spec.maxWidth;
    let height = width / aspect;
    if (height > spec.maxHeight) {
      height = spec.maxHeight;
      width = height * aspect;
    }
    if (width / spec.maxWidth <= height / spec.maxHeight) {
      width = Math.round(width);
      height = Math.round(width / aspect);
    } else {
      height = Math.round(height);
      width = Math.round(height * aspect);
    }
    const radius = Math.round(Math.min(Math.max(width * 0.045, 12), 46));
    return {
      mode: "bare",
      width: Math.round(width),
      height: Math.round(height),
      css: "",
      html: `<div class="dev dev-bare ${spec.className ?? ""}" style="--dw:${Math.round(
        width,
      )}px; --dh:${Math.round(height)}px; border-radius:${radius}px; box-shadow: 0 10px 34px rgba(10, 14, 22, 0.30), 0 34px 90px rgba(10, 14, 22, 0.34); border: 1px solid rgba(255,255,255,0.10); overflow: hidden;">
  <img src="${spec.image.url}" alt="${spec.image.alt}" style="width:100%;height:100%;object-fit:cover;display:block;">
</div>`,
    };
  }

  // --- framed modes ------------------------------------------------------
  const scaleRef = Math.sqrt(spec.maxWidth * spec.maxHeight);
  const rail = Math.max(3, Math.round(scaleRef * 0.006));
  const bezel = Math.max(7, Math.round(scaleRef * 0.014));
  const chrome = (rail + bezel) * 2;

  // Fit the SCREEN into the slot minus chrome, so the whole assembly
  // (screen + bezel + rails) never exceeds the requested bounds.
  let screenW = Math.max(1, spec.maxWidth - chrome);
  let screenH = screenW / aspect;
  if (screenH > spec.maxHeight - chrome) {
    screenH = Math.max(1, spec.maxHeight - chrome);
    screenW = screenH * aspect;
  }
  const width = Math.round(screenW);
  const height = Math.round(screenH);
  const totalW = width + chrome;
  const totalH = height + chrome;

  const radius = Math.round(Math.min(Math.max(totalW * 0.085, 30), 72));
  const screenRadius = Math.max(14, radius - bezel - rail * 0.4);
  const islandW = Math.round(Math.min(Math.max(width * 0.32, 84), 250));
  const islandH = Math.round(Math.min(Math.max(width * 0.052, 18), 42));
  const islandGap = Math.round(Math.max(6, height * 0.016));
  const homeW = Math.round(width * 0.36);
  const homeH = Math.round(Math.min(Math.max(width * 0.014, 5), 9));
  const btnW = Math.max(3, Math.round(totalW * 0.006));

  const shadow =
    spec.mode === "angled"
      ? `0 ${Math.round(totalH * 0.02)}px ${Math.round(totalW * 0.06)}px rgba(5,8,14,0.55), 0 ${Math.round(
          totalH * 0.06,
        )}px ${Math.round(totalW * 0.16)}px rgba(5,8,14,0.45)`
      : `0 ${Math.round(totalH * 0.012)}px ${Math.round(totalW * 0.035)}px rgba(5,8,14,0.45), 0 ${Math.round(
          totalH * 0.04,
        )}px ${Math.round(totalW * 0.11)}px rgba(5,8,14,0.4), 0 ${Math.round(
          totalH * 0.09,
        )}px ${Math.round(totalW * 0.22)}px rgba(5,8,14,0.3)`;

  const vars = [
    `--dw:${Math.round(totalW)}px`,
    `--dh:${Math.round(totalH)}px`,
    `--dradius:${radius}px`,
    `--dsradius:${screenRadius}px`,
    `--drail:${rail}px`,
    `--dbezel:${bezel}px`,
    `--disland-w:${islandW}px`,
    `--disland-h:${islandH}px`,
    `--disland-gap:${islandGap}px`,
    `--dhome-w:${homeW}px`,
    `--dhome-h:${homeH}px`,
    `--dbtn-w:${btnW}px`,
    `--dglare:${glare ? 1 : 0}`,
    `--dshadow:${shadow}`,
  ].join("; ");

  const screenInner = `
    <img src="${spec.image.url}" alt="${spec.image.alt}">
    ${glare ? '<div class="dev-glare"></div>' : ""}
    ${island ? '<div class="dev-island"></div>' : ""}
    ${home ? '<div class="dev-home"></div>' : ""}`;

  if (spec.mode === "front") {
    return {
      mode: "front",
      width: Math.round(totalW),
      height: Math.round(totalH),
      css: "",
      html: `<div class="dev dev-front ${spec.className ?? ""}" style="${vars}">
  <div class="dev-rail"></div>
  <div class="dev-btn vol1"></div><div class="dev-btn vol2"></div><div class="dev-btn pwr"></div>
  <div class="dev-glass">
    <div class="dev-screen">${screenInner}</div>
  </div>
</div>`,
    };
  }

  // angled: perspective stage + optional second device behind
  const rotY = spec.rotateY ?? -9;
  const rotZ = spec.rotateZ ?? 0;
  const backOffset = Math.round(totalW * 0.1);

  return {
    mode: "angled",
    width: Math.round(totalW + backOffset),
    height: Math.round(totalH),
    css: "",
    html: `<div class="dev-stage ${spec.className ?? ""}" style="--dpersp:${Math.round(
      totalW * 2.6,
    )}px; position: relative; width:${Math.round(totalW + backOffset)}px; height:${Math.round(
      totalH,
    )}px;">
  ${
    spec.backLayer === false
      ? ""
      : `<div class="dev dev-back" style="${vars}; position:absolute; inset-inline-end:0; top:0; transform: rotateY(${rotY * -1.35}deg) rotateZ(${rotZ * -0.5}deg) translateZ(-70px) scale(0.965);"></div>`
  }
  <div class="dev-tilt" style="--drot-y:${rotY}deg; --drot-z:${rotZ}deg; position:absolute; inset-inline-start:0; top:0; width:${Math.round(
    totalW,
  )}px; height:${Math.round(totalH)}px;">
    <div class="dev dev-front" style="${vars}">
      <div class="dev-rail"></div>
      <div class="dev-btn vol1"></div><div class="dev-btn vol2"></div><div class="dev-btn pwr"></div>
      <div class="dev-glass">
        <div class="dev-screen">${screenInner}</div>
      </div>
    </div>
  </div>
  <div class="dev-ground" style="--dground-w:${Math.round(
    totalW * 1.18,
  )}px; --dground-h:${Math.round(totalW * 0.2)}px; --dground-off:${Math.round(
      totalH * 0.012,
    )}px; --dground-c: rgba(4,7,12,0.55);"></div>
</div>`,
  };
}

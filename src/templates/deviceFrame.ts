import type { TemplateImage } from "./types.js";

/**
 * CSS-drawn phone frame around the app screenshot.
 * The frame's inner screen is sized to the screenshot's exact aspect ratio,
 * so the app UI is never cropped or distorted.
 */

export interface DeviceFrameResult {
  html: string;
  css: string;
  width: number;
  height: number;
}

export interface DeviceFrameOptions {
  /** Vertical space the frame may occupy. */
  slotHeight: number;
  /** Maximum frame width (usually a fraction of the canvas width). */
  maxWidth: number;
}

export function deviceFrame(image: TemplateImage, opts: DeviceFrameOptions): DeviceFrameResult {
  const aspect = image.width / image.height;
  const bezel = 16;
  let frameHeight = opts.slotHeight;
  let screenHeight = frameHeight - bezel * 2;
  let screenWidth = screenHeight * aspect;
  let frameWidth = screenWidth + bezel * 2;

  if (frameWidth > opts.maxWidth) {
    frameWidth = opts.maxWidth;
    screenWidth = frameWidth - bezel * 2;
    screenHeight = screenWidth / aspect;
    frameHeight = screenHeight + bezel * 2;
  }

  const radius = Math.max(28, frameWidth * 0.075);
  const screenRadius = Math.max(20, radius - bezel * 0.55);
  const islandWidth = Math.min(Math.max(screenWidth * 0.32, 90), 235);
  const islandHeight = Math.min(Math.max(screenWidth * 0.052, 20), 40);
  const homeWidth = screenWidth * 0.36;
  const homeHeight = Math.min(Math.max(screenWidth * 0.014, 6), 10);

  const css = `
.dframe {
  position: relative;
  width: ${Math.round(frameWidth)}px;
  height: ${Math.round(frameHeight)}px;
  padding: ${bezel}px;
  background: linear-gradient(160deg, #1A1F29 0%, #05070B 55%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${Math.round(radius)}px;
  box-shadow:
    0 ${Math.round(frameHeight * 0.018)}px ${Math.round(frameWidth * 0.07)}px rgba(0, 0, 0, 0.55),
    inset 0 0 0 1px rgba(0, 0, 0, 0.6);
}
.dframe-screen {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: ${Math.round(screenRadius)}px;
  background: #000;
}
.dframe-screen img {
  width: 100%;
  height: 100%;
  display: block;
}
.dframe-island {
  position: absolute;
  top: ${Math.max(8, Math.round(screenHeight * 0.018))}px;
  left: 50%;
  transform: translateX(-50%);
  width: ${Math.round(islandWidth)}px;
  height: ${Math.round(islandHeight)}px;
  border-radius: ${Math.round(islandHeight / 2)}px;
  background: #05070B;
}
.dframe-home {
  position: absolute;
  bottom: ${Math.max(6, Math.round(screenHeight * 0.014))}px;
  left: 50%;
  transform: translateX(-50%);
  width: ${Math.round(homeWidth)}px;
  height: ${Math.round(homeHeight)}px;
  border-radius: ${Math.round(homeHeight / 2)}px;
  background: rgba(255, 255, 255, 0.88);
}
.dframe::before,
.dframe::after {
  content: "";
  position: absolute;
  width: 4px;
  border-radius: 3px;
  background: #262C38;
}
.dframe::before {
  left: -5px;
  top: 22%;
  height: ${Math.round(frameHeight * 0.1)}px;
  box-shadow: 0 ${Math.round(frameHeight * 0.075)}px 0 #262C38;
}
.dframe::after {
  right: -5px;
  top: 26%;
  height: ${Math.round(frameHeight * 0.16)}px;
}`;

  const html = `
<div class="dframe">
  <div class="dframe-screen">
    <img src="${image.url}" alt="${image.alt}">
    <div class="dframe-island"></div>
    <div class="dframe-home"></div>
  </div>
</div>`;

  return { html, css, width: Math.round(frameWidth), height: Math.round(frameHeight) };
}

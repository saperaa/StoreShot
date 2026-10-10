import { describe, expect, it } from "vitest";
import { buildTokens } from "../../src/design/tokens.js";
import { renderDevice, resolveDeviceMode } from "../../src/design/device.js";
import type { TemplateImage } from "../../src/templates/types.js";

const image: TemplateImage = { url: "img/shot.png", width: 1080, height: 2340, alt: "x" };

describe("design tokens", () => {
  it("derives dark mode from the background luminance", () => {
    const dark = buildTokens({ background: "#0E1524", accent: "#62E6B5", text: "#fff", muted: "#9AA7BD" });
    const light = buildTokens({ background: "#F4F1EA", accent: "#0E7A5F", text: "#111", muted: "#666" });
    expect(dark.mode).toBe("dark");
    expect(light.mode).toBe("light");
  });

  it("honors an explicit mode override", () => {
    const forced = buildTokens({
      background: "#F4F1EA",
      accent: "#0E7A5F",
      text: "#111",
      muted: "#666",
      mode: "dark",
    });
    expect(forced.mode).toBe("dark");
  });

  it("steps surfaces from the background and picks readable onAccent", () => {
    const tokens = buildTokens({ background: "#0E1524", accent: "#62E6B5", text: "#fff", muted: "#9AA7BD" });
    expect(tokens.surface).not.toBe(tokens.bg);
    expect(tokens.onAccent).toBe("#0B1220"); // light accent -> dark text on it
  });
});

describe("device mode resolution", () => {
  it("auto follows deviceFrame with the template's framed default", () => {
    expect(resolveDeviceMode(undefined, true, "front")).toBe("front");
    expect(resolveDeviceMode(undefined, true, "angled")).toBe("angled");
    expect(resolveDeviceMode(undefined, false, "front")).toBe("bare");
  });

  it("explicit modes win", () => {
    expect(resolveDeviceMode("angled", false, "front")).toBe("angled");
    expect(resolveDeviceMode("nonsense", true, "front")).toBe("front");
  });
});

describe("device rendering math", () => {
  it("bare mode preserves the exact aspect ratio within the slot", () => {
    const device = renderDevice({ image, mode: "bare", maxWidth: 600, maxHeight: 1200 });
    const aspect = device.width / device.height;
    expect(aspect).toBeCloseTo(1080 / 2340, 3);
    expect(device.width).toBeLessThanOrEqual(600 + 1);
    expect(device.height).toBeLessThanOrEqual(1200 + 1);
  });

  it("bare mode shrinks by height when the slot is short", () => {
    const device = renderDevice({ image, mode: "bare", maxWidth: 900, maxHeight: 500 });
    expect(device.height).toBeLessThanOrEqual(501);
    expect(device.width / device.height).toBeCloseTo(1080 / 2340, 3);
  });

  it("front mode adds symmetric chrome around the screen", () => {
    const device = renderDevice({ image, mode: "front", maxWidth: 600, maxHeight: 1200 });
    expect(device.mode).toBe("front");
    expect(device.width).toBeGreaterThan(0);
    expect(device.height).toBeGreaterThan(0);
    // The whole assembly must stay inside the slot.
    expect(device.width).toBeLessThanOrEqual(600 + 1);
    expect(device.height).toBeLessThanOrEqual(1200 + 1);
    expect(device.html).toContain("dev-screen");
    expect(device.html).toContain("img");
  });

  it("angled mode renders a perspective stage with layered devices", () => {
    const device = renderDevice({
      image,
      mode: "angled",
      maxWidth: 600,
      maxHeight: 1200,
      rotateY: -9,
    });
    expect(device.html).toContain("dev-stage");
    expect(device.html).toContain("--drot-y:-9deg");
    expect(device.html).toContain("dev-ground");
  });

  it("angled mode can drop the back layer", () => {
    const device = renderDevice({
      image,
      mode: "angled",
      maxWidth: 600,
      maxHeight: 1200,
      backLayer: false,
    });
    expect(device.html).not.toContain("dev-back");
  });
});

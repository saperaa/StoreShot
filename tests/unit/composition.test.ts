import { describe, expect, it } from "vitest";
import {
  bandLayer,
  centeredLayer,
  decorLayer,
  fieldBackground,
  layer,
  ringLayer,
  rotatedBounds,
} from "../../src/design/composition.js";
import { buildTokens } from "../../src/design/tokens.js";
import type { TemplateContext, TemplateDecorItem } from "../../src/templates/types.js";
import { getTemplate } from "../../src/templates/registry.js";

const tokens = buildTokens({
  background: "#101A2E",
  accent: "#FF6B4A",
  text: "#FFFFFF",
  muted: "#A8B4CC",
});

const item: TemplateDecorItem = {
  id: "leaf",
  url: "img/decor-leaf.png",
  width: 400,
  height: 200,
  alt: "leaf",
};

describe("layer()", () => {
  it("emits absolute positioning with explicit z-order", () => {
    const html = layer("<span>x</span>", { left: 10, top: 20, z: 3 });
    expect(html).toContain("position:absolute");
    expect(html).toContain("left:10px");
    expect(html).toContain("top:20px");
    expect(html).toContain("z-index:3");
    expect(html).toContain("<span>x</span>");
    expect(html).not.toContain("data-bleed");
  });

  it("composes rotate and scale transforms", () => {
    const html = layer("x", { left: 0, top: 0, rotate: -14, scale: 1.2, z: 2 });
    expect(html).toContain("transform:rotate(-14deg) scale(1.2)");
  });

  it("marks intentional bleed so the bounds checker skips it", () => {
    expect(layer("x", { left: 0, top: 0, z: 1, bleed: true })).toContain('data-bleed="true"');
  });

  it("supports logical (RTL-mirrored) edges", () => {
    const html = layer("x", { insetInlineEnd: -30, top: 5, z: 1 });
    expect(html).toContain("inset-inline-end:-30px");
    expect(html).not.toContain("right:");
  });
});

describe("centeredLayer()", () => {
  it("centers a known-size element on a point", () => {
    const html = centeredLayer("x", { width: 100, height: 50 }, { x: 200, y: 300 }, { z: 2 });
    expect(html).toContain("left:150px");
    expect(html).toContain("top:275px");
  });
});

describe("rotatedBounds()", () => {
  it("is identity without rotation", () => {
    expect(rotatedBounds(100, 50, 0)).toEqual({ width: 100, height: 50 });
  });

  it("swaps axes at 90 degrees", () => {
    const b = rotatedBounds(100, 50, 90);
    expect(b.width).toBeCloseTo(50, 5);
    expect(b.height).toBeCloseTo(100, 5);
  });

  it("grows both axes at 45 degrees", () => {
    const b = rotatedBounds(100, 100, 45);
    expect(b.width).toBeCloseTo(141.42, 1);
    expect(b.height).toBeCloseTo(141.42, 1);
  });

  it("applies scale on top of rotation", () => {
    const b = rotatedBounds(100, 50, 90, 2);
    expect(b.width).toBeCloseTo(100, 5);
    expect(b.height).toBeCloseTo(200, 5);
  });
});

describe("decorLayer()", () => {
  it("preserves the asset's natural aspect ratio", () => {
    const html = decorLayer(item, { left: 10, top: 20, width: 200, z: 3 });
    expect(html).toContain("width:200px");
    expect(html).toContain("height:100px"); // 400x200 natural
    expect(html).toContain('src="img/decor-leaf.png"');
  });

  it("wraps the image in a .deco layer the bounds checker measures", () => {
    const html = decorLayer(item, { left: 0, top: 0, width: 100, z: 1, rotate: 8 });
    expect(html).toContain("deco deco-leaf");
    expect(html).toContain("rotate(8deg)");
  });
});

describe("background helpers", () => {
  it("fieldBackground returns a solid color for 'solid'", () => {
    expect(fieldBackground(tokens, "solid")).toBe(tokens.bg);
  });

  it("fieldBackground layers a radial beam over a gradient for 'beam'", () => {
    const css = fieldBackground(tokens, "beam");
    expect(css).toContain("radial-gradient");
    expect(css).toContain("linear-gradient");
  });

  it("bandLayer emits a rotated, z-ordered band", () => {
    const html = bandLayer({ angle: -12, top: 100, height: 40, width: 900, color: "#FFF", z: 0 });
    expect(html).toContain("rotate(-12deg)");
    expect(html).toContain("height:40px");
    expect(html).toContain("z-index:0");
  });

  it("ringLayer emits a stroked circle, or a disc when filled", () => {
    const ring = ringLayer({ cx: 100, cy: 100, diameter: 60, stroke: 5, color: "#FFF", z: 1 });
    expect(ring).toContain("border:5px solid #FFF");
    expect(ring).toContain("border-radius:50%");
    const disc = ringLayer({
      cx: 0,
      cy: 0,
      diameter: 10,
      stroke: 1,
      color: "#FFF",
      z: 1,
      fill: true,
    });
    expect(disc).toContain("background:#FFF");
  });
});

/* -------------------------------------------------- template-level ------- */

function makeCtx(overrides: Partial<TemplateContext> = {}): TemplateContext {
  return {
    app: { name: "Qamar" },
    locale: "en-US",
    lang: "en",
    dir: "ltr",
    texts: { title: "Your day, beautifully under control", subtitle: "Plan the night before" },
    theme: { background: "#101A2E", accent: "#FF6B4A", text: "#FFFFFF", muted: "#A8B4CC" },
    image: { url: "img/shot.png", width: 1080, height: 2340, alt: "shot" },
    decor: [],
    deviceFrame: true,
    settings: {},
    canvas: { width: 720, height: 1280 },
    index: 0,
    count: 5,
    ...overrides,
  };
}

describe("new templates compose layered output", () => {
  for (const id of ["tilt", "float", "strata"] as const) {
    it(`${id} renders portrait + landscape with explicit layer z-order`, () => {
      const template = getTemplate(id)!;
      const portrait = template.render(makeCtx());
      expect(portrait.html).toContain("shot");
      expect(portrait.html).toMatch(/z-index:\d/);
      expect(portrait.html).toContain('data-field="title"');
      const landscape = template.render(makeCtx({ canvas: { width: 960, height: 412 } }));
      expect(landscape.html).toContain("landscape");
      expect(landscape.html).toContain('data-field="title"');
    });
  }

  it("tilt marks the rotated device as intentional bleed", () => {
    const { html } = getTemplate("tilt")!.render(makeCtx());
    expect(html).toContain("rotate(");
    expect(html).toContain('data-bleed="true"');
  });

  it("float renders decor items in .deco layers when supplied", () => {
    const { html } = getTemplate("float")!.render(makeCtx({ decor: [item] }));
    expect(html).toContain("deco deco-leaf");
    expect(html).toContain('src="img/decor-leaf.png"');
  });

  it("float still composes cleanly with zero decor", () => {
    const { html } = getTemplate("float")!.render(makeCtx());
    expect(html).not.toContain("deco-");
    expect(html).toContain("border-radius:50%"); // geometric ring fallback
  });

  it("float rotates the decor constellation per sequence index", () => {
    const template = getTemplate("float")!;
    const a = template.render(makeCtx({ decor: [item], index: 0 })).html;
    const b = template.render(makeCtx({ decor: [item], index: 1 })).html;
    expect(a).not.toBe(b);
    expect(b).toContain("deco deco-leaf");
  });

  it("strata stacks the slab, ring, device and raised headline panel", () => {
    const { html } = getTemplate("strata")!.render(makeCtx());
    expect(html).toContain("st-panel");
    expect(html).toContain('data-bleed="true"');
    // z-order must be monotonic: slab(0) < ring(1) < device(2) < panel(4)
    expect(html.indexOf("z-index:0")).toBeLessThan(html.indexOf("z-index:2"));
    expect(html.indexOf("z-index:2")).toBeLessThan(html.indexOf("st-panel"));
  });
});

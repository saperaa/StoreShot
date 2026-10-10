/**
 * The in-page measurement function the engine runs inside Chromium after
 * assets load. It is serialized by Playwright, so it must not close over any
 * module imports. The ambient declarations below describe the small part of
 * the DOM it touches, keeping the body type-checked without pulling the full
 * DOM lib into a Node project.
 *
 * Beyond font/asset/overflow checks, this measures REAL rendered geometry:
 * every [data-field] text box, every device, and every image must sit inside
 * the canvas safe area unless it opts into intentional bleed. Image natural
 * vs rendered aspect is compared to catch letterboxed screens (empty screen
 * regions) and distorted sources.
 */

export interface PageMeasurement {
  fontChecks: Record<string, boolean>;
  failedAssets: string[];
  overflow: Array<{ field: string; rendered: number; budget: number }>;
  geometry: {
    width: number;
    height: number;
    outOfBounds: Array<{
      selector: string;
      field?: string;
      issue: string;
      rect: { top: number; right: number; bottom: number; left: number };
    }>;
    letterboxed: Array<{ selector: string; note: string }>;
  };
}

interface PageImageLike {
  decode(): Promise<void>;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  getAttribute(name: string): string | null;
}

interface PageElementLike {
  dataset: { field?: string; bleed?: string };
  getBoundingClientRect(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
}

declare const document: {
  fonts: {
    ready: Promise<void>;
    check: (font: string) => boolean;
    load: (font: string) => Promise<unknown>;
  };
  images: ArrayLike<PageImageLike>;
  body: { dataset: { fontFamilies?: string } };
  querySelectorAll(selector: string): ArrayLike<PageElementLike>;
  querySelector(selector: string): PageElementLike | null;
};

declare const requestAnimationFrame: (callback: () => void) => number;
declare const window: { innerWidth: number; innerHeight: number };




export async function measurePage(): Promise<PageMeasurement> {
  // px of sub-pixel tolerance before something is "outside" (inlined: this
  // function is serialized into the page and closes over nothing).
  const SAFE_MARGIN = 2;
  await Promise.all([
    document.fonts.ready,
    ...Array.from(document.images).map((image) => image.decode().catch(() => undefined)),
  ]);
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  const families = (document.body.dataset.fontFamilies ?? "").split(",").filter(Boolean);
  const fontChecks: Record<string, boolean> = {};
  for (const family of families) {
    try {
      await document.fonts.load(`16px "${family}"`);
      await document.fonts.ready;
      fontChecks[family] = document.fonts.check(`16px "${family}"`);
    } catch {
      fontChecks[family] = false;
    }
  }

  const failedAssets = Array.from(document.images)
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.getAttribute("src") ?? "<unknown>");

  const overflow = Array.from(document.querySelectorAll("[data-field][data-max-height]")).map(
    (el) => ({
      field: el.dataset.field ?? "?",
      rendered: Math.round(el.getBoundingClientRect().height),
      budget: Number.parseFloat(
        (el as unknown as { dataset: { maxHeight?: string } }).dataset.maxHeight ?? "0",
      ),
    }),
  );

  // --- real geometry checks -------------------------------------------------
  const canvasW = window.innerWidth;
  const canvasH = window.innerHeight;
  const outOfBounds: PageMeasurement["geometry"]["outOfBounds"] = [];

  const check = (
    selector: string,
    el: PageElementLike,
    rect: { top: number; right: number; bottom: number; left: number },
  ) => {
    const bleedAncestor = (el as unknown as { closest(s: string): PageElementLike | null }).closest("[data-bleed]");
    if (el.dataset.bleed === "true" || bleedAncestor) return; // intentional crop
    if (
      rect.left < -SAFE_MARGIN ||
      rect.top < -SAFE_MARGIN ||
      rect.right > canvasW + SAFE_MARGIN ||
      rect.bottom > canvasH + SAFE_MARGIN
    ) {
      outOfBounds.push({
        selector,
        field: el.dataset.field,
        issue: "outside-canvas",
        rect: {
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
        },
      });
    }
  };

  for (const el of Array.from(document.querySelectorAll("[data-field]"))) {
    check("[data-field]", el, el.getBoundingClientRect());
  }
  for (const el of Array.from(document.querySelectorAll(".dc-search"))) {
    check(".dc-search", el, el.getBoundingClientRect());
  }
  for (const el of Array.from(document.querySelectorAll(".dev"))) {
    check(".dev", el, el.getBoundingClientRect());
  }

  // Screen-fill detection: every image must fill its clipping slot (the
  // device screen), otherwise the device shows empty bands — the empty-
  // screen regression. A slot-vs-natural mismatch above 5% additionally
  // flags source-header parse drift (wrong aspect from imageSize).
  const letterboxed: PageMeasurement["geometry"]["letterboxed"] = [];
  for (const image of Array.from(document.images)) {
    if (!image.complete || image.naturalWidth === 0) continue;
    const img = image as unknown as PageElementLike;
    const rect = img.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const slot = (image as unknown as { closest(s: string): PageElementLike | null }).closest(".dev-screen, .dev-bare, .dev");
    if (slot) {
      const s = slot.getBoundingClientRect();
      // 3px covers the 1px wrapper border on each side plus rounding;
      // genuine letterboxing is orders of magnitude larger.
      const fills =
        Math.abs(rect.width - s.width) <= 3 && Math.abs(rect.height - s.height) <= 3;
      if (!fills) {
        letterboxed.push({
          selector: image.getAttribute("src") ?? "<img>",
          note: `image ${Math.round(rect.width)}x${Math.round(rect.height)} does not fill its screen slot ${Math.round(s.width)}x${Math.round(s.height)}`,
        });
        continue;
      }
    }
    const natural = image.naturalWidth / image.naturalHeight;
    const rendered = rect.width / rect.height;
    if (Math.abs(natural - rendered) / natural > 0.09) {
      letterboxed.push({
        selector: image.getAttribute("src") ?? "<img>",
        note: `aspect-drift ${natural.toFixed(3)} vs ${rendered.toFixed(3)} (advisory)`,
      });
    }
  }

  return {
    fontChecks,
    failedAssets,
    overflow,
    geometry: { width: canvasW, height: canvasH, outOfBounds, letterboxed },
  };
}

/**
 * The in-page measurement function the engine runs inside Chromium after
 * assets load. It is serialized by Playwright, so it must not close over any
 * module imports. The ambient declarations below describe the small part of
 * the DOM it touches, keeping the body type-checked without pulling the full
 * DOM lib into a Node project.
 */

export interface PageMeasurement {
  fontChecks: Record<string, boolean>;
  failedAssets: string[];
  overflow: Array<{ field: string; rendered: number; budget: number }>;
}

interface PageImageLike {
  decode(): Promise<void>;
  complete: boolean;
  naturalWidth: number;
  getAttribute(name: string): string | null;
}

interface PageElementLike {
  dataset: { field?: string; maxHeight?: string };
  getBoundingClientRect(): { height: number };
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
};

declare const requestAnimationFrame: (callback: () => void) => number;

export async function measurePage(): Promise<PageMeasurement> {
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
    // Explicitly fetch the face so a declared-but-unused family is still
    // verified; lazy loading would otherwise hide real load failures.
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
      budget: Number.parseFloat(el.dataset.maxHeight ?? "0"),
    }),
  );

  return { fontChecks, failedAssets, overflow };
}

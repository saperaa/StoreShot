/**
 * Store export profiles.
 *
 * Dimensions below were verified against the official documentation on the
 * date recorded in `verifiedOn`. See docs/store-profiles.md before relying on
 * a profile for a real submission, and re-check the linked source if that
 * date is old.
 */

export type StoreId = "app-store" | "google-play";

export interface StoreProfileDef {
  store: StoreId;
  id: string;
  label: string;
  width: number;
  height: number;
  notes: string;
  /** When the dimensions were last checked against `sourceUrl`. */
  verifiedOn: string;
  sourceUrl: string;
}

const APPLE_SOURCE =
  "https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications";
const APPLE_CREATIVE_SOURCE =
  "https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications";
const GOOGLE_SOURCE = "https://support.google.com/googleplay/android-developer/answer/1078870";

export const STORE_PROFILES: readonly StoreProfileDef[] = [
  {
    store: "app-store",
    id: "iphone-6-3",
    label: 'iPhone 6.3" (Dynamic Island)',
    width: 1206,
    height: 2622,
    notes:
      "Currently required size class for iPhone (Dynamic Island, medium display). " +
      "1179x2556 is also accepted within the same class.",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_SOURCE,
  },
  {
    store: "app-store",
    id: "iphone-6-1",
    label: 'iPhone 6.1"',
    width: 1179,
    height: 2556,
    notes:
      'Alternative size accepted for the 6.1"/6.3" screenshot slot ' +
      "(1206x2622 via the iphone-6-3 profile is the other accepted size).",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_SOURCE,
  },
  {
    store: "app-store",
    id: "iphone-6-9",
    label: 'iPhone 6.9" (Dynamic Island, large display)',
    width: 1320,
    height: 2868,
    notes:
      'Highest resolution of the 6.9" class (1260x2736 and 1290x2796 are also accepted). ' +
      "Provide the largest size; App Store Connect scales down automatically.",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_SOURCE,
  },
  {
    store: "app-store",
    id: "header-21-9",
    label: "Product page header (21:9)",
    width: 3840,
    height: 1646,
    notes:
      "The wide banner at the top of the product page. JPEG or PNG, no alpha. " +
      "Apple also accepts a video here; StoreShot renders still images only. " +
      "Landscape composition.",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_CREATIVE_SOURCE,
  },
  {
    store: "app-store",
    id: "header-16-9",
    label: "Universal header / search asset (16:9)",
    width: 5244,
    height: 2950,
    notes:
      "One 16:9 PNG covers BOTH the product page header and the search results asset " +
      "(PNG only for this size, no alpha). Landscape composition.",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_CREATIVE_SOURCE,
  },
  {
    store: "app-store",
    id: "search-results-3-2",
    label: "Search results asset (3:2)",
    width: 3840,
    height: 2560,
    notes:
      "The dedicated search-results creative. Apple accepts 1920x1280 up to 3840x2560; " +
      "this is the maximum. JPEG or PNG, no alpha. Landscape composition.",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_CREATIVE_SOURCE,
  },
  {
    store: "app-store",
    id: "preview-frame-6-3",
    label: 'App preview poster frame (6.3")',
    width: 886,
    height: 1920,
    notes:
      'Still image at the 6.1"/6.3" app-preview aspect. The actual preview must be a ' +
      "video (.mov/.m4v/.mp4) you produce elsewhere; use this as its poster frame or " +
      "design starting point.",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_SOURCE,
  },
  {
    store: "app-store",
    id: "ipad-13",
    label: 'iPad 13"',
    width: 2064,
    height: 2752,
    notes: "Required for apps that run on iPad. 2048x2732 is also accepted within the same class.",
    verifiedOn: "2026-10-10",
    sourceUrl: APPLE_SOURCE,
  },
  {
    store: "google-play",
    id: "phone",
    label: "Phone (1080x1920)",
    width: 1080,
    height: 1920,
    notes: "Comfortably inside Play's 320-3840px and 2:1 aspect-ratio limits.",
    verifiedOn: "2026-10-10",
    sourceUrl: GOOGLE_SOURCE,
  },
  {
    store: "google-play",
    id: "tablet",
    label: "Tablet (1600x2560)",
    width: 1600,
    height: 2560,
    notes: "For 7–10 inch tablet listings; inside Play dimension and ratio limits.",
    verifiedOn: "2026-10-10",
    sourceUrl: GOOGLE_SOURCE,
  },
];

export interface StoreRules {
  /** Constraints StoreShot enforces when a custom size is used. */
  minSide?: number;
  maxSide?: number;
  /** longest side / shortest side must not exceed this. */
  maxAspectRatio?: number;
  /** Human-readable constraints that StoreShot does NOT check automatically. */
  uncheckedConstraints: string[];
}

export const STORE_RULES: Readonly<Record<StoreId, StoreRules>> = {
  "app-store": {
    uncheckedConstraints: [
      "Screenshots must match one of Apple's official device dimensions exactly",
      "PNG or JPEG without alpha channel or transparency",
      "App Store Connect requires screenshots for the required iPhone size class, and for iPad if the app supports it",
      "Up to 10 screenshots per device size",
    ],
  },
  "google-play": {
    minSide: 320,
    maxSide: 3840,
    maxAspectRatio: 2,
    uncheckedConstraints: [
      "JPEG or 24-bit PNG without alpha channel",
      "At least 2 screenshots are required to publish a listing",
      "Up to 8 screenshots per device type",
      "Screenshots must not look like ads or contain excessive text overlays (policy, not checked)",
    ],
  },
};

export function getProfile(store: StoreId, id: string): StoreProfileDef | undefined {
  return STORE_PROFILES.find((profile) => profile.store === store && profile.id === id);
}

export function listProfiles(store?: StoreId): StoreProfileDef[] {
  return STORE_PROFILES.filter((profile) => store === undefined || profile.store === store);
}

/** Validate a custom size against the store's published rules. Returns problem descriptions. */
export function validateCustomSize(store: StoreId, width: number, height: number): string[] {
  const rules = STORE_RULES[store];
  const problems: string[] = [];
  if (rules.minSide !== undefined) {
    if (width < rules.minSide || height < rules.minSide) {
      problems.push(`both sides must be at least ${rules.minSide}px`);
    }
  }
  if (rules.maxSide !== undefined) {
    if (width > rules.maxSide || height > rules.maxSide) {
      problems.push(`both sides must be at most ${rules.maxSide}px`);
    }
  }
  if (rules.maxAspectRatio !== undefined) {
    const ratio = Math.max(width, height) / Math.min(width, height);
    if (ratio > rules.maxAspectRatio) {
      problems.push(
        `the longest side may be at most ${rules.maxAspectRatio}x the shortest side ` +
          `(yours is ${ratio.toFixed(2)}x)`,
      );
    }
  }
  return problems;
}

export function formatProfileLabel(profile: StoreProfileDef): string {
  return `${profile.store}/${profile.id} (${profile.width}x${profile.height}, ${profile.label})`;
}

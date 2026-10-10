import { describe, expect, it } from "vitest";
import {
  getProfile,
  listProfiles,
  STORE_PROFILES,
  validateCustomSize,
} from "../../src/profiles/storeProfiles.js";

describe("store profiles", () => {
  it("finds profiles by store and id", () => {
    const profile = getProfile("app-store", "iphone-6-3");
    expect(profile).toBeDefined();
    expect(profile!.width).toBe(1206);
    expect(profile!.height).toBe(2622);
  });

  it("returns nothing for an unknown profile", () => {
    expect(getProfile("app-store", "iphone-99")).toBeUndefined();
    expect(getProfile("google-play", "iphone-6-3")).toBeUndefined();
  });

  it("lists profiles per store", () => {
    expect(listProfiles("app-store").length).toBeGreaterThanOrEqual(8);
    expect(listProfiles("google-play").length).toBeGreaterThanOrEqual(2);
    expect(listProfiles().length).toBe(STORE_PROFILES.length);
  });

  it("ships the creative-asset profiles verified on 2026-10-10", () => {
    const header219 = getProfile("app-store", "header-21-9")!;
    expect([header219.width, header219.height]).toEqual([3840, 1646]);

    const universal = getProfile("app-store", "header-16-9")!;
    expect([universal.width, universal.height]).toEqual([5244, 2950]);

    const search = getProfile("app-store", "search-results-3-2")!;
    expect([search.width, search.height]).toEqual([3840, 2560]);

    const iphone61 = getProfile("app-store", "iphone-6-1")!;
    expect([iphone61.width, iphone61.height]).toEqual([1179, 2556]);

    const previewFrame = getProfile("app-store", "preview-frame-6-3")!;
    expect([previewFrame.width, previewFrame.height]).toEqual([886, 1920]);
    expect(previewFrame.notes).toMatch(/video/i);
  });

  it("every profile carries verification metadata", () => {
    for (const profile of STORE_PROFILES) {
      expect(profile.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(profile.sourceUrl).toMatch(/^https:\/\//);
      expect(profile.width).toBeGreaterThan(0);
      expect(profile.height).toBeGreaterThan(0);
    }
  });

  it("enforces Google Play custom-size rules", () => {
    expect(validateCustomSize("google-play", 1080, 1920)).toEqual([]);
    expect(validateCustomSize("google-play", 100, 200).length).toBeGreaterThan(0); // below min side
    expect(validateCustomSize("google-play", 4000, 1000).length).toBeGreaterThan(0); // above max side
    expect(validateCustomSize("google-play", 640, 2000).length).toBeGreaterThan(0); // ratio > 2
  });

  it("accepts any custom size for the App Store (warned about, not blocked)", () => {
    expect(validateCustomSize("app-store", 1234, 2000)).toEqual([]);
  });
});

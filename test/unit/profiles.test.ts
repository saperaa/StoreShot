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
    expect(listProfiles("app-store").length).toBeGreaterThanOrEqual(3);
    expect(listProfiles("google-play").length).toBeGreaterThanOrEqual(2);
    expect(listProfiles().length).toBe(STORE_PROFILES.length);
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

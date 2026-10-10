import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli, starterDir } from "../helpers/cli.js";
import { readImageInfo } from "../../src/util/imageSize.js";

const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), "storeshot-gen-"));
const projectDir = path.join(workRoot, "project");

/** Small config: one screenshot, two locales, a small custom export size. */
const smallConfig = {
  app: { name: "Qamar" },
  locales: ["en-US", "ar"],
  template: "gradient",
  screenshots: [
    {
      id: "home",
      image: "./screens/home.png",
      title: { "en-US": "Everything in one place", ar: "كل ما تحتاجه في مكان واحد" },
      subtitle: { "en-US": "Simple and fast", ar: "سهولة وسرعة في كل خطوة" },
    },
  ],
  exports: [{ store: "google-play", profile: "phone", size: { width: 360, height: 720 } }],
};

/** Apple creative assets render in landscape composition through the CLI. */
const headerConfig = {
  ...smallConfig,
  template: "editorial",
  screenshots: [
    {
      id: "home",
      image: "./screens/home.png",
      title: { "en-US": "Beautifully in control", ar: "بأناقة وتحكّم" },
    },
  ],
  exports: [{ store: "app-store", profile: "header-21-9", name: "header" }],
};

describe("storeshot generate", () => {
  beforeAll(async () => {
    await fs.mkdir(projectDir, { recursive: true });
    await fs.cp(path.join(starterDir, "screens"), path.join(projectDir, "screens"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(projectDir, "storeshot.config.json"),
      JSON.stringify(smallConfig, null, 2),
    );
  });

  afterAll(async () => {
    await fs.rm(workRoot, { recursive: true, force: true });
  });

  it("generates both locales at the exact configured dimensions", async () => {
    const result = await runCli(["generate"], projectDir);
    expect(result.code, result.stderr).toBe(0);

    for (const locale of ["en-US", "ar"]) {
      const file = path.join(projectDir, "storeshots", "google-play-phone", locale, "01-home.png");
      const info = await readImageInfo(file);
      expect(info).toEqual({ width: 360, height: 720, type: "png" });
    }
  });

  it("generates a single locale when filtered", async () => {
    const result = await runCli(["generate", "--locale", "ar", "--output", "only-ar"], projectDir);
    expect(result.code, result.stderr).toBe(0);
    const localeDir = path.join(projectDir, "only-ar", "google-play-phone");
    expect(await fs.readdir(path.join(localeDir, "ar"))).toEqual(["01-home.png"]);
    await expect(fs.readdir(path.join(localeDir, "en-US"))).rejects.toThrow();
  });

  it("fails with exit code 1 and names the field when Arabic text overflows", async () => {
    const overflowConfig = {
      ...smallConfig,
      screenshots: [
        {
          ...smallConfig.screenshots[0]!,
          title: {
            "en-US": "Everything in one place",
            ar: "كل ما تحتاجه لتخطيط يومك بالكامل وتنظيم مهامك ومراجعة تقدمك اليومي في مكان واحد جميل ومنظم",
          },
        },
      ],
    };
    await fs.writeFile(
      path.join(projectDir, "overflow.config.json"),
      JSON.stringify(overflowConfig, null, 2),
    );
    const result = await runCli(
      ["generate", "-c", "overflow.config.json", "-o", "overflow-out"],
      projectDir,
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/"home"/);
    expect(result.stderr).toMatch(/\[ar\]/);
    expect(result.stderr).toMatch(/title/);
  });

  it("renders the 21:9 product page header at exact dimensions", async () => {
    await fs.writeFile(
      path.join(projectDir, "header.config.json"),
      JSON.stringify(headerConfig, null, 2),
    );
    const result = await runCli(
      ["generate", "-c", "header.config.json", "-o", "header-out"],
      projectDir,
    );
    expect(result.code, result.stderr).toBe(0);
    const info = await readImageInfo(
      path.join(projectDir, "header-out", "header", "en-US", "01-home.png"),
    );
    expect(info).toEqual({ width: 3840, height: 1646, type: "png" });
  });

  it("fails up front when a source image is missing", async () => {
    const missingConfig = {
      ...smallConfig,
      screenshots: [{ ...smallConfig.screenshots[0]!, image: "./screens/nope.png" }],
    };
    await fs.writeFile(
      path.join(projectDir, "missing.config.json"),
      JSON.stringify(missingConfig, null, 2),
    );
    const result = await runCli(["generate", "-c", "missing.config.json"], projectDir);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/nope\.png/);
  });
});

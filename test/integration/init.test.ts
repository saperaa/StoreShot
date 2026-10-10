import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";

const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), "storeshot-init-"));

describe("storeshot init", () => {
  beforeAll(async () => {
    const result = await runCli(["init", "demo-app", "--yes"], workRoot);
    expect(result.code).toBe(0);
  });

  afterAll(async () => {
    await fs.rm(workRoot, { recursive: true, force: true });
  });

  it("creates a valid, parseable configuration", async () => {
    const configPath = path.join(workRoot, "demo-app", "storeshot.config.json");
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(config.app.name).toBe("Qamar");
    expect(config.locales).toContain("ar");
    expect(config.exports.length).toBeGreaterThan(0);
  });

  it("ships example screenshots and a project README", async () => {
    const dir = path.join(workRoot, "demo-app");
    const screens = await fs.readdir(path.join(dir, "screens"));
    expect(screens.filter((f) => f.endsWith(".png")).length).toBe(3);
    const readme = await fs.readFile(path.join(dir, "README.md"), "utf8");
    expect(readme).toMatch(/storeshot generate/);
  });

  it("refuses to overwrite an existing project without --force", async () => {
    const result = await runCli(["init", "demo-app"], workRoot);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/--force/);
  });

  it("overwrites with --force", async () => {
    const result = await runCli(["init", "demo-app", "--yes", "--force"], workRoot);
    expect(result.code).toBe(0);
  });
});

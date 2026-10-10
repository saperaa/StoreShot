import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli, starterDir } from "../helpers/cli.js";

const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), "storeshot-val-"));
const projectDir = path.join(workRoot, "project");

describe("storeshot validate", () => {
  beforeAll(async () => {
    await fs.mkdir(projectDir, { recursive: true });
    await fs.cp(path.join(starterDir, "screens"), path.join(projectDir, "screens"), {
      recursive: true,
    });
  });

  afterAll(async () => {
    await fs.rm(workRoot, { recursive: true, force: true });
  });

  it("passes on a healthy project including the rendered text-fit check", async () => {
    await fs.copyFile(
      path.join(starterDir, "storeshot.config.json"),
      path.join(projectDir, "storeshot.config.json"),
    );
    const result = await runCli(["validate"], projectDir);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr + result.stdout).toMatch(/check out|No errors/);
  });

  it("reports schema errors with JSON paths and exits 1", async () => {
    await fs.writeFile(
      path.join(projectDir, "broken.config.json"),
      JSON.stringify({
        app: { name: "X" },
        theme: { accent: "blue" },
        screenshots: [],
        exports: [{ store: "app-store", profile: "iphone-6-3" }],
      }),
    );
    const result = await runCli(["validate", "-c", "broken.config.json"], projectDir);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/theme\.accent/);
  });

  it("detects missing source images by screenshot id", async () => {
    await fs.writeFile(
      path.join(projectDir, "missing.config.json"),
      JSON.stringify({
        app: { name: "X" },
        screenshots: [{ id: "hero", image: "./screens/not-there.png" }],
        exports: [{ store: "app-store", profile: "iphone-6-3" }],
      }),
    );
    const result = await runCli(["validate", "-c", "missing.config.json"], projectDir);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/"hero"/);
    expect(result.stderr).toMatch(/not-there\.png/);
  });

  it("emits machine-readable JSON with --json", async () => {
    const result = await runCli(
      ["validate", "-c", "missing.config.json", "--json", "--fast"],
      projectDir,
    );
    expect(result.code).toBe(1);
    const payload = JSON.parse(result.stdout) as {
      ok: boolean;
      overflowChecked: boolean;
      issues: Array<{ severity: string; code: string }>;
    };
    expect(payload.ok).toBe(false);
    expect(payload.issues.some((i) => i.code === "missing-image")).toBe(true);
  });

  it("warns when an App Store export uses a custom size", async () => {
    await fs.writeFile(
      path.join(projectDir, "custom.config.json"),
      JSON.stringify({
        app: { name: "X" },
        screenshots: [{ id: "home", image: "./screens/home.png" }],
        exports: [
          { store: "app-store", profile: "iphone-6-3", size: { width: 1000, height: 2000 } },
        ],
      }),
    );
    const result = await runCli(["validate", "-c", "custom.config.json", "--fast"], projectDir);
    expect(result.code).toBe(0); // warnings only
    expect(result.stderr).toMatch(/custom-app-store-size|custom size/);
  });
});

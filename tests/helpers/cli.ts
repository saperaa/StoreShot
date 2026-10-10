import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const cliEntry = path.join(repoRoot, "dist", "cli.js");
export const starterDir = path.join(repoRoot, "starter");

/** Run the built CLI in a working directory and collect its output. */
export function runCli(args: string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

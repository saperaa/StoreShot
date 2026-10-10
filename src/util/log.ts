import pc from "picocolors";

function writeLine(prefix: string, message: string): void {
  process.stderr.write(`${prefix} ${message}\n`);
}

export const log = {
  info(message: string): void {
    writeLine(pc.cyan("info"), message);
  },
  success(message: string): void {
    writeLine(pc.green("✔"), message);
  },
  warn(message: string): void {
    writeLine(pc.yellow("warning"), message);
  },
  error(message: string): void {
    writeLine(pc.red("error"), message);
  },
  dim(message: string): void {
    process.stderr.write(`${pc.dim(message)}\n`);
  },
  /** Plain stdout line, used for progress and summaries (CI friendly). */
  line(message: string): void {
    process.stdout.write(`${message}\n`);
  },
};

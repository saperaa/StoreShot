import pc from "picocolors";
import { validateProject } from "../validation/validate.js";
import { log } from "../util/log.js";

export interface ValidateCommandOptions {
  config?: string;
  json?: boolean;
  fast?: boolean;
}

export async function runValidate(options: ValidateCommandOptions): Promise<number> {
  const outcome = await validateProject(options.config, {
    measureOverflow: !options.fast,
  });

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: outcome.issues.every((issue) => issue.severity !== "error"),
          overflowChecked: outcome.overflowChecked,
          issues: outcome.issues,
        },
        null,
        2,
      )}\n`,
    );
    return outcome.issues.some((issue) => issue.severity === "error") ? 1 : 0;
  }

  const errors = outcome.issues.filter((issue) => issue.severity === "error");
  const warnings = outcome.issues.filter((issue) => issue.severity === "warning");

  for (const warning of warnings) {
    log.warn(`${warning.message}${warning.hint ? `\n         ${pc.dim(warning.hint)}` : ""}`);
  }
  for (const error of errors) {
    log.error(`${error.message}${error.hint ? `\n       ${pc.dim(error.hint)}` : ""}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    log.success("Configuration, assets, translations and store profiles all check out.");
    if (outcome.overflowChecked) log.dim("  Rendered text-fit check passed for every combination.");
    return 0;
  }
  if (errors.length === 0) {
    log.success(`No errors (${warnings.length} warning${warnings.length === 1 ? "" : "s"}).`);
    return 0;
  }
  log.error(
    `${errors.length} error${errors.length === 1 ? "" : "s"} found. Nothing was generated.`,
  );
  return 1;
}

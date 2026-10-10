#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import pc from "picocolors";
import { runInit } from "./commands/init.js";
import { runGenerate } from "./commands/generate.js";
import { runValidate } from "./commands/validate.js";
import { runTemplates } from "./commands/templates.js";
import { runInstall } from "./commands/install.js";
import { StoreShotError } from "./errors.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("storeshot")
  .description(
    "Generate professional, RTL-ready App Store and Google Play screenshots from a JSON config.\n" +
      "Renders locally with Chromium — no accounts, no uploads, deterministic output.",
  )
  .version(version);

program
  .command("init")
  .description(
    "Create a starter project — asks what you want, then wires up config, fonts and example screenshots",
  )
  .argument("[directory]", "target directory (defaults to the current directory)")
  .option("--force", "overwrite an existing configuration")
  .option("-y, --yes", "skip the interactive questions and use starter defaults")
  .action(
    wrap(async (directory: string | undefined, options: { force?: boolean; yes?: boolean }) => {
      await runInit(directory, options);
    }),
  );

program
  .command("generate")
  .description("Generate every configured screenshot for every locale and export profile")
  .option("-c, --config <path>", "path to storeshot.config.json (auto-detected by default)")
  .option("-l, --locale <tag...>", "generate only these locales (e.g. --locale ar en-US)")
  .option(
    "-e, --export <selector...>",
    "generate only these exports (by name, store/profile, or store)",
  )
  .option("-o, --output <dir>", "override the output directory")
  .option("--allow-overflow", "render even when text overflows its layout budget")
  .action(
    wrap(
      async (options: {
        config?: string;
        locale?: string[];
        export?: string[];
        output?: string;
        allowOverflow?: boolean;
      }) => {
        await runGenerate({
          config: options.config,
          locale: options.locale,
          export: options.export,
          output: options.output,
          allowOverflow: options.allowOverflow ?? false,
        });
      },
    ),
  );

program
  .command("validate")
  .description("Validate configuration, assets, translations, store profiles and text fit")
  .option("-c, --config <path>", "path to storeshot.config.json (auto-detected by default)")
  .option("--json", "print machine-readable JSON (for CI)")
  .option("--fast", "skip the rendered text-overflow measurement")
  .action(
    wrap(async (options: { config?: string; json?: boolean; fast?: boolean }) => {
      process.exitCode = await runValidate({
        config: options.config,
        json: options.json,
        fast: options.fast,
      });
    }),
  );

program
  .command("templates")
  .description("List the available visual templates and their settings")
  .action(
    wrap(async () => {
      runTemplates();
    }),
  );

program
  .command("install")
  .description("Download the bundled Chromium browser used for rendering (one-time setup)")
  .action(
    wrap(async () => {
      await runInstall();
    }),
  );

program.addHelpText(
  "after",
  `
Examples:
  $ storeshot init my-app
  $ storeshot generate                       # all locales + exports
  $ storeshot generate --locale ar           # Arabic only
  $ storeshot generate --export app-store/iphone-6-3
  $ storeshot validate --json                # CI-friendly validation

First time? Run "storeshot install" to download the rendering browser,
then "storeshot init" to create a starter project.`,
);

function wrap<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>,
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    try {
      await action(...(args as Args));
    } catch (error) {
      if (error instanceof StoreShotError) {
        process.stderr.write(`\n${pc.red("error:")} ${error.message}\n`);
        process.exitCode = error.exitCode;
        return;
      }
      if (process.env.STORESHOT_DEBUG) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `\n${pc.red("error:")} Unexpected failure: ${message}\n` +
          `This is likely a bug in StoreShot. Re-run with STORESHOT_DEBUG=1 for a stack trace ` +
          `and report it at https://github.com/storeshot/storeshot/issues\n`,
      );
      process.exitCode = 2;
    }
  };
}

program.parseAsync(process.argv).catch((error: unknown) => {
  if (process.env.STORESHOT_DEBUG) throw error;
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${pc.red("error:")} ${message}\n`);
  process.exitCode = 2;
});

import pc from "picocolors";
import { listTemplates } from "../templates/registry.js";
import { log } from "../util/log.js";

export function runTemplates(): void {
  const templates = listTemplates();
  log.line(pc.bold("Available templates"));
  log.line("");
  for (const template of templates) {
    log.line(`  ${pc.cyan(template.id.padEnd(14))} ${template.name}`);
    log.line(`  ${" ".repeat(14)} ${pc.dim(template.description)}`);
    log.line(
      `  ${" ".repeat(14)} ${pc.dim(`device frame by default: ${template.defaultDeviceFrame ? "yes" : "no"}`)}`,
    );
    if (template.settings.length > 0) {
      log.line(
        `  ${" ".repeat(14)} ${pc.dim(`settings: ${template.settings.map((s) => s.key).join(", ")}`)}`,
      );
    }
    log.line("");
  }
  log.dim('Use a template in storeshot.config.json: "template": "<id>"');
  log.dim('Or with settings: "template": { "id": "gradient", "settings": { "glow": 0.8 } }');
}

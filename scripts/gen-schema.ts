/**
 * Emit schema.json (draft 2020-12) for editor autocompletion.
 * Referenced from configs as "$schema": "./node_modules/storeshot-cli/schema.json".
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { storeshotConfigSchema } from "../src/config/schema.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const jsonSchema = z.toJSONSchema(storeshotConfigSchema, {
  io: "input",
  target: "draft-2020-12",
  unrepresentable: "any",
});

jsonSchema["$id"] = "https://unpkg.com/storeshot-cli/schema.json";
jsonSchema["title"] = "StoreShot configuration";
jsonSchema["description"] =
  "Configuration for StoreShot — App Store / Google Play screenshot generator with first-class Arabic and RTL support.";

const target = path.join(root, "schema.json");
await fs.writeFile(target, `${JSON.stringify(jsonSchema, null, 2)}\n`, "utf8");

// Round-trip sanity: the emitted schema must be valid JSON and parseable.
JSON.parse(await fs.readFile(target, "utf8"));
console.log(`Wrote ${path.relative(root, target)}`);

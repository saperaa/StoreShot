/**
 * StoreShot public API.
 *
 * The CLI is the main interface, but everything it uses is exported so the
 * tool can be embedded in build scripts and tests.
 */

export { storeshotConfigSchema, CONFIG_FILE_NAMES } from "./config/schema.js";
export type { StoreshotConfig, ScreenshotConfig, ExportConfig } from "./config/schema.js";
export { loadConfigFile, formatZodIssues } from "./config/load.js";
export type { LoadedConfig } from "./config/load.js";
export { resolveConfig } from "./config/resolve.js";
export type {
  ResolvedConfig,
  ResolvedLocale,
  ResolvedScreenshot,
  ResolvedExport,
} from "./config/resolve.js";
export { Renderer } from "./render/engine.js";
export type {
  RenderRequest,
  RenderResult,
  RenderDiagnostics,
  RenderAsset,
} from "./render/engine.js";
export { buildRenderRequest } from "./render/pipeline.js";
export { planFontAssets, resolveFontFiles } from "./render/assets.js";
export { buildDocument } from "./render/html.js";
export { TEMPLATES, getTemplate, listTemplates, templateIds } from "./templates/registry.js";
export type { TemplateDefinition, TemplateContext, TemplateDecorItem } from "./templates/types.js";
export { selectComposition, recommendCompositions } from "./design/direct.js";
export type { CompositionInput, CompositionChoice } from "./design/direct.js";
export { APP_CATEGORIES } from "./config/schema.js";
export type { AppCategory } from "./config/schema.js";
export {
  STORE_PROFILES,
  STORE_RULES,
  getProfile,
  listProfiles,
  validateCustomSize,
} from "./profiles/storeProfiles.js";
export {
  RTL_LANGUAGES,
  defaultDirection,
  resolveDirection,
  normalizeLocaleTag,
} from "./i18n/direction.js";
export { resolveLocalizedText } from "./i18n/text.js";
export { readImageInfo, parseImageHeader, assertPngDimensions } from "./util/imageSize.js";
export { validateProject } from "./validation/validate.js";
export { ConfigError, RenderError, StoreShotError } from "./errors.js";

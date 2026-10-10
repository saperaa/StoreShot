import path from "node:path";

export const SUPPORTED_SOURCE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;

export function hasSupportedImageExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return (SUPPORTED_SOURCE_EXTENSIONS as readonly string[]).includes(ext);
}

import { ConfigError } from "../errors.js";
import { SUPPORTED_SOURCE_EXTENSIONS } from "./extensions.js";

export type ImageType = "png" | "jpeg" | "webp";

export interface ImageInfo {
  width: number;
  height: number;
  type: ImageType;
}

/**
 * Read pixel dimensions from a PNG / JPEG / WebP file by parsing its header.
 * Avoids pulling in a full image library; we only ever need width/height.
 */
export async function readImageInfo(filePath: string): Promise<ImageInfo> {
  const { open } = await import("node:fs/promises");
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(96);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return parseImageHeader(buffer.subarray(0, bytesRead), filePath);
  } finally {
    await handle.close();
  }
}

export function parseImageHeader(bytes: Buffer, source = "<buffer>"): ImageInfo {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes.subarray(1, 4).toString("ascii") === "PNG") {
    // IHDR: length (4) + "IHDR" (4), then width (4 BE) and height (4 BE).
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    assertSaneDimensions(width, height, source, "PNG");
    return { width, height, type: "png" };
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const info = parseJpegHeader(bytes);
    if (!info) {
      throw new ConfigError(`Could not parse JPEG header of ${source}. Is the file a valid JPEG?`);
    }
    return { ...info, type: "jpeg" };
  }

  if (
    bytes.length >= 16 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    const info = parseWebpHeader(bytes);
    if (!info) {
      throw new ConfigError(`Could not parse WebP header of ${source}. Is the file a valid WebP?`);
    }
    return { ...info, type: "webp" };
  }

  const exts = SUPPORTED_SOURCE_EXTENSIONS.join(", ");
  throw new ConfigError(
    `Unsupported image file ${source}. StoreShot can read PNG, JPEG and WebP sources (${exts}).`,
  );
}

function assertSaneDimensions(width: number, height: number, source: string, kind: string): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ConfigError(`Invalid ${kind} dimensions for ${source}: ${width}x${height}`);
  }
}

function parseJpegHeader(bytes: Buffer): { width: number; height: number } | undefined {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] ?? 0;
    // Standalone markers without a length payload.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC).
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame && offset + 9 <= bytes.length) {
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      return { width, height };
    }
    offset += 2 + length;
  }
  return undefined;
}

function parseWebpHeader(bytes: Buffer): { width: number; height: number } | undefined {
  const chunk = bytes.subarray(12, 16).toString("ascii");
  const b = (i: number): number => bytes[i] ?? 0;
  if (chunk === "VP8X" && bytes.length >= 30) {
    // VP8X payload: flags(1) + reserved(3) + width-1 (24-bit LE) + height-1 (24-bit LE)
    const width = 1 + (b(24) | (b(25) << 8) | (b(26) << 16));
    const height = 1 + (b(27) | (b(28) << 8) | (b(29) << 16));
    return { width, height };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    // Chunk header is 8 bytes (fourcc + size); payload: signature byte, then
    // 14+14 bits of width-1/height-1 packed little-endian.
    const bits = bytes.readUInt32LE(12 + 8 + 1);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    const width = bytes.readUInt16LE(12 + 6) & 0x3fff;
    const height = bytes.readUInt16LE(12 + 8) & 0x3fff;
    return { width, height };
  }
  return undefined;
}

/** Verify that a PNG buffer has exactly the expected pixel dimensions. */
export function assertPngDimensions(
  png: Buffer,
  expectedWidth: number,
  expectedHeight: number,
  label: string,
): void {
  if (png.length < 24 || png[0] !== 0x89) {
    throw new ConfigError(`Rendered output for ${label} is not a valid PNG.`);
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new ConfigError(
      `Rendered output for ${label} has dimensions ${width}x${height}, ` +
        `expected ${expectedWidth}x${expectedHeight}.`,
    );
  }
}

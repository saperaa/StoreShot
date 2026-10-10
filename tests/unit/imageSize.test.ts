import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { assertPngDimensions, parseImageHeader } from "../../src/util/imageSize.js";

function pngBuffer(width: number, height: number): Buffer {
  return PNG.sync.write(new PNG({ width, height }));
}

// Minimal JPEG skeleton: SOI + APP0 + SOF0 (with dimensions) + SOS + EOI.
function jpegBuffer(width: number, height: number): Buffer {
  const sof = Buffer.from([
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe0, 0x00, 0x07, 0x4a, 0x46, 0x49, 0x46, 0x00]), // APP0, length 7, "JFIF\0"
    sof,
    Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]), // SOS
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}

// Minimal WebP: RIFF container with a VP8L header (signature + dimensions).
function webpBuffer(width: number, height: number): Buffer {
  const bits = (((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14)) >>> 0;
  const payload = Buffer.alloc(5);
  payload[0] = 0x2f; // VP8L signature
  payload.writeUInt32LE(bits, 1);
  const chunkSize = Buffer.alloc(4);
  chunkSize.writeUInt32LE(payload.length, 0);
  const body = Buffer.concat([
    Buffer.from("WEBP", "ascii"),
    Buffer.from("VP8L", "ascii"),
    chunkSize,
    payload,
  ]);
  const header = Buffer.alloc(8);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

describe("image header parsing", () => {
  it("reads PNG dimensions", () => {
    expect(parseImageHeader(pngBuffer(320, 640))).toEqual({
      width: 320,
      height: 640,
      type: "png",
    });
  });

  it("reads JPEG dimensions", () => {
    expect(parseImageHeader(jpegBuffer(1080, 1920))).toEqual({
      width: 1080,
      height: 1920,
      type: "jpeg",
    });
  });

  it("reads WebP dimensions", () => {
    expect(parseImageHeader(webpBuffer(640, 480))).toEqual({
      width: 640,
      height: 480,
      type: "webp",
    });
  });

  it("rejects unsupported formats", () => {
    expect(() => parseImageHeader(Buffer.from("GIF89a..."))).toThrow(/Unsupported image file/);
  });

  it("verifies PNG output dimensions", () => {
    const png = pngBuffer(100, 50);
    expect(() => assertPngDimensions(png, 100, 50, "test")).not.toThrow();
    expect(() => assertPngDimensions(png, 200, 50, "test")).toThrow(/expected 200x50/);
  });
});

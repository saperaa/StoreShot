/**
 * Display-size downscaler for the committed gallery.
 *
 * GitHub renders README images at ~1000px wide; full store-export
 * resolution (1206–5244px) is wasted bytes in the repo and nobody zooms a
 * committed PNG. Area-averaging (box filter) keeps text edges clean — no
 * new dependencies, pure pngjs.
 *
 * Rules: portraits cap at 860px wide, landscape boards at 1920px.
 * docs/seo/social-preview.png is skipped — it is the exact 1280x640 asset
 * GitHub's social preview upload expects.
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

export function resizePng(srcPng, targetW) {
  const targetH = Math.max(1, Math.round((srcPng.height * targetW) / srcPng.width));
  const out = new PNG({ width: targetW, height: targetH });
  const sx = srcPng.width / targetW;
  const sy = srcPng.height / targetH;
  for (let y = 0; y < targetH; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < targetW; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1 && yy < srcPng.height; yy++) {
        for (let xx = x0; xx < x1 && xx < srcPng.width; xx++) {
          const i = (srcPng.width * yy + xx) << 2;
          r += srcPng.data[i];
          g += srcPng.data[i + 1];
          b += srcPng.data[i + 2];
          a += srcPng.data[i + 3];
          n++;
        }
      }
      const o = (targetW * y + x) << 2;
      out.data[o] = Math.round(r / n);
      out.data[o + 1] = Math.round(g / n);
      out.data[o + 2] = Math.round(b / n);
      out.data[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

export function downscaleFile(file, cap) {
  const png = PNG.sync.read(fs.readFileSync(file));
  if (png.width <= cap) return false;
  fs.writeFileSync(file, PNG.sync.write(resizePng(png, cap)));
  return true;
}

export function downscaleTree(root) {
  let touched = 0;
  let saved = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".png")) continue;
      if (full.includes(path.join("docs", "seo"))) continue; // exact upload asset
      const png = PNG.sync.read(fs.readFileSync(full));
      const cap = png.width / png.height < 0.75 ? 860 : 1920;
      if (png.width <= cap) continue;
      const before = fs.statSync(full).size;
      fs.writeFileSync(full, PNG.sync.write(resizePng(png, cap)));
      touched++;
      saved += before - fs.statSync(full).size;
    }
  };
  walk(root);
  return { touched, saved };
}

// CLI: node scripts/downscale.mjs [dir=docs/gallery]
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/downscale.mjs")) {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("docs", "gallery");
  const { touched, saved } = downscaleTree(target);
  console.log(`downscaled ${touched} file(s), saved ${(saved / 1e6).toFixed(1)} MB in ${target}`);
}

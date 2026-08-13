/**
 * Regenerates the rose-pine site icons (no dependencies — zlib + manual PNG).
 *
 *   node scripts/generate-icons.mjs
 *
 * Writes into apps/web/public/:
 *   - apple-touch-icon.png (180×180)
 *   - icon-192.png           (192×192)
 *   - icon-512.png           (512×512)
 *
 * Design matches the SVG favicon: #191724 rounded square, "R" glyph in #ebbcba.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const BG = [0x19, 0x17, 0x24]; // rose-pine base  #191724
const FG = [0xeb, 0xbc, 0xba]; // rose-pine rose   #ebbcba

/** 5×7 pixel "R" */
const GLYPH = ["11110", "10001", "10001", "11110", "10100", "10010", "10001"];

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, size, r) {
  const clamp = (v) => Math.max(r, Math.min(v, size - 1 - r));
  const dx = x - clamp(x);
  const dy = y - clamp(y);
  return dx * dx + dy * dy <= r * r;
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = Math.round(size * 0.1875);
  const scale = Math.floor(size / 8);
  const ox = Math.floor((size - 5 * scale) / 2);
  const oy = Math.floor((size - 7 * scale) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!insideRoundedRect(x, y, size, r)) continue;
      const i = (y * size + x) * 4;
      const gx = Math.floor((x - ox) / scale);
      const gy = Math.floor((y - oy) / scale);
      const on = gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && GLYPH[gy][gx] === "1";
      const [r8, g8, b8] = on ? FG : BG;
      rgba[i] = r8;
      rgba[i + 1] = g8;
      rgba[i + 2] = b8;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

const targets = [
  { size: 180, file: "apple-touch-icon.png" },
  { size: 192, file: "icon-192.png" },
  { size: 512, file: "icon-512.png" },
];

const outDir = join(here, "..", "public");
mkdirSync(outDir, { recursive: true });
for (const t of targets) {
  const png = encodePng(t.size, t.size, render(t.size));
  writeFileSync(join(outDir, t.file), png);
  console.log(`${t.file} ${t.size}x${t.size} ${png.length} bytes`);
}

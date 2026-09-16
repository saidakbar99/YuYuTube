import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function encodePng(size, rgb) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BG = [15, 15, 15];
const DISC = [255, 0, 0];
const GLYPH = [255, 255, 255];
const SAMPLES = 3;

function coverage(size, scale, test) {
  const c = size / 2;
  const s = size * scale;
  return (x, y) => {
    let hits = 0;
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const px = x + (sx + 0.5) / SAMPLES - c;
        const py = y + (sy + 0.5) / SAMPLES - c;
        if (test(px, py, s)) hits++;
      }
    }
    return hits / (SAMPLES * SAMPLES);
  };
}

const inDisc = (px, py, s) => px * px + py * py <= (s / 2) * (s / 2);

function inTriangle(px, py, s) {
  const ax = -0.3 * s;
  const shifted = px - 0.06 * s;
  if (shifted < ax || shifted > 0.42 * s) return false;
  const t = (shifted - ax) / (0.42 * s - ax);
  const half = 0.4 * s * (1 - t);
  return Math.abs(py) <= half;
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);

function render(size, glyphScale) {
  const disc = coverage(size, glyphScale, inDisc);
  const tri = coverage(size, glyphScale * 0.52, inTriangle);
  const rgb = Buffer.alloc(size * size * 3);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = disc(x, y);
      const t = tri(x, y);
      const base = [0, 1, 2].map((i) => mix(BG[i], DISC[i], d));
      const color = [0, 1, 2].map((i) => mix(base[i], GLYPH[i], t));
      const at = (y * size + x) * 3;
      rgb[at] = color[0];
      rgb[at + 1] = color[1];
      rgb[at + 2] = color[2];
    }
  }
  return encodePng(size, rgb);
}

mkdirSync("public/icons", { recursive: true });

const files = [
  ["public/icons/icon-192.png", 192, 0.72],
  ["public/icons/icon-512.png", 512, 0.72],
  ["public/icons/icon-maskable-512.png", 512, 0.54],
  ["public/icons/apple-touch-icon.png", 180, 0.72],
];

for (const [path, size, scale] of files) {
  writeFileSync(path, render(size, scale));
  console.log(`wrote ${path} (${size}x${size})`);
}

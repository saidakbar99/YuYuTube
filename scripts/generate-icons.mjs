import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------- design

// A smiling sun. Nothing like a red play button: that one makes him ask for the real YouTube.
const FACE_TOP = [255, 224, 102];
const FACE_BOTTOM = [255, 170, 30];
const FEATURE = [107, 62, 30]; // eyes and smile
const CHEEK = [255, 120, 110];
const CHEEK_ALPHA = 0.5;
const TILE = [191, 230, 255]; // sky behind opaque home-screen icons

/**
 * face: face diameter as a fraction of the canvas
 * tile: paint an opaque background (iOS fills transparency with black; maskable needs full bleed)
 * bold: small favicons need chunkier eyes and smile to stay legible
 */
function geometry(size, { face, tile = false, bold = 1 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size * face) / 2;
  const at = (x, y) => [cx + x * r, cy + y * r];
  return {
    size,
    tile,
    face: { cx, cy, r },
    eyes: [-1, 1].map((side) => ({ c: at(side * 0.34, -0.2), rx: 0.1 * r * bold, ry: 0.15 * r * bold })),
    cheeks: [-1, 1].map((side) => ({ c: at(side * 0.58, 0.18), r: 0.13 * r })),
    // The lower part of a circle, from `from` to `to` radians (y points down, so π/2 is straight down).
    smile: { c: at(0, -0.02), r: 0.5 * r, half: 0.075 * r * bold, from: Math.PI * 0.22, to: Math.PI * 0.78 },
  };
}

// ---------------------------------------------------------------- raster

const sdCircle = (px, py, [cx, cy], r) => Math.hypot(px - cx, py - cy) - r;

// Close enough to exact for features this round, which is all the antialiasing needs.
function sdEllipse(px, py, { c: [cx, cy], rx, ry }) {
  const k = Math.hypot((px - cx) / rx, (py - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
}

// An arc with round caps.
function sdArc(px, py, { c: [cx, cy], r, half, from, to }) {
  const dx = px - cx;
  const dy = py - cy;
  const angle = Math.atan2(dy, dx);
  if (angle >= from && angle <= to) return Math.abs(Math.hypot(dx, dy) - r) - half;
  const cap = (a) => Math.hypot(dx - Math.cos(a) * r, dy - Math.sin(a) * r);
  return Math.min(cap(from), cap(to)) - half;
}

const coverage = (d) => Math.min(1, Math.max(0, 0.5 - d));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function over([r, g, b, a], color, alpha) {
  const out = alpha + a * (1 - alpha);
  if (out === 0) return [0, 0, 0, 0];
  const blend = (i) => (color[i] * alpha + [r, g, b][i] * a * (1 - alpha)) / out;
  return [blend(0), blend(1), blend(2), out];
}

function rasterize({ size, tile, face, eyes, cheeks, smile }) {
  const rgba = Buffer.alloc(size * size * 4);
  const top = face.cy - face.r;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      let pixel = tile ? [...TILE, 1] : [0, 0, 0, 0];
      const shade = Math.min(1, Math.max(0, (py - top) / (face.r * 2)));
      const inFace = coverage(sdCircle(px, py, [face.cx, face.cy], face.r));
      pixel = over(pixel, mix(FACE_TOP, FACE_BOTTOM, shade), inFace);
      for (const cheek of cheeks) pixel = over(pixel, CHEEK, CHEEK_ALPHA * coverage(sdCircle(px, py, cheek.c, cheek.r)));
      for (const eye of eyes) pixel = over(pixel, FEATURE, coverage(sdEllipse(px, py, eye)));
      pixel = over(pixel, FEATURE, coverage(sdArc(px, py, smile)));

      const at = (y * size + x) * 4;
      rgba[at] = Math.round(pixel[0]);
      rgba[at + 1] = Math.round(pixel[1]);
      rgba[at + 2] = Math.round(pixel[2]);
      rgba[at + 3] = Math.round(pixel[3] * 255);
    }
  }
  return rgba;
}

// ---------------------------------------------------------------- encoders

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

function png(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// PNG-compressed ICO entries, supported everywhere since Windows Vista.
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + i * 16;
    header[at] = size >= 256 ? 0 : size;
    header[at + 1] = size >= 256 ? 0 : size;
    header.writeUInt16LE(1, at + 4); // colour planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

function svg({ size, face, eyes, cheeks, smile }) {
  const n = (v) => +v.toFixed(2);
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  const point = (a) => `${n(smile.c[0] + Math.cos(a) * smile.r)} ${n(smile.c[1] + Math.sin(a) * smile.r)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hex(FACE_TOP)}"/>
      <stop offset="1" stop-color="${hex(FACE_BOTTOM)}"/>
    </linearGradient>
  </defs>
  <circle cx="${n(face.cx)}" cy="${n(face.cy)}" r="${n(face.r)}" fill="url(#sun)"/>
${cheeks.map((c) => `  <circle cx="${n(c.c[0])}" cy="${n(c.c[1])}" r="${n(c.r)}" fill="${hex(CHEEK)}" fill-opacity="${CHEEK_ALPHA}"/>`).join("\n")}
${eyes.map((e) => `  <ellipse cx="${n(e.c[0])}" cy="${n(e.c[1])}" rx="${n(e.rx)}" ry="${n(e.ry)}" fill="${hex(FEATURE)}"/>`).join("\n")}
  <path d="M${point(smile.from)} A${n(smile.r)} ${n(smile.r)} 0 0 1 ${point(smile.to)}" fill="none" stroke="${hex(FEATURE)}" stroke-width="${n(smile.half * 2)}" stroke-linecap="round"/>
</svg>
`;
}

// ---------------------------------------------------------------- output

const favicon = { face: 1, bold: 1.25 };
const standalone = { face: 0.86 };
const homeScreen = { face: 0.72, tile: true };
// Android may crop to an 80%-diameter circle; the face stays well inside it.
const maskable = { face: 0.66, tile: true };

const raster = (size, options) => png(size, rasterize(geometry(size, options)));

const outputs = [
  ["src/app/favicon.ico", () => ico([16, 32, 48].map((size) => ({ size, data: raster(size, favicon) })))],
  ["src/app/icon.svg", () => svg(geometry(64, favicon))],
  ["src/app/apple-icon.png", () => raster(180, homeScreen)],
  ["public/icons/icon-192.png", () => raster(192, standalone)],
  ["public/icons/icon-512.png", () => raster(512, standalone)],
  ["public/icons/icon-maskable-192.png", () => raster(192, maskable)],
  ["public/icons/icon-maskable-512.png", () => raster(512, maskable)],
];

mkdirSync("public/icons", { recursive: true });

for (const [path, build] of outputs) {
  writeFileSync(path, build());
  console.log(`wrote ${path}`);
}

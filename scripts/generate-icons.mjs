import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------- design

const RED_TOP = [255, 64, 64];
const RED_BOTTOM = [214, 0, 0];
const PLAY = [255, 255, 255];
const TILE = [255, 255, 255]; // background of opaque home-screen icons

const BADGE_ASPECT = 0.7; // badge height / width
const BADGE_RADIUS = 0.3; // corner radius / badge height
const PLAY_HEIGHT = 0.46; // triangle height / badge height
const PLAY_ROUND = 0.1; // triangle corner radius / triangle height

/**
 * badge: badge width as a fraction of the canvas
 * tile: paint an opaque background (iOS fills transparency with black; maskable needs full bleed)
 * playScale: small favicons need a chunkier triangle to stay legible
 */
function geometry(size, { badge, tile = false, playScale = 1 }) {
  const cx = size / 2;
  const cy = size / 2;
  const bw = size * badge;
  const bh = bw * BADGE_ASPECT;

  const th = bh * PLAY_HEIGHT * playScale;
  const tw = th * 0.9;
  const shift = tw * 0.08; // optical centring: a triangle's mass sits left of its box
  const vertices = [
    [cx - tw / 2 + shift, cy - th / 2],
    [cx - tw / 2 + shift, cy + th / 2],
    [cx + tw / 2 + shift, cy],
  ];

  const round = th * PLAY_ROUND;
  return {
    size,
    tile,
    badge: { cx, cy, hw: bw / 2, hh: bh / 2, r: bh * BADGE_RADIUS },
    play: { vertices: inset(vertices, round), round },
  };
}

// Shrink toward the incentre so that re-growing by `round` restores the original size.
function inset([a, b, c], round) {
  const len = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const la = len(b, c);
  const lb = len(c, a);
  const lc = len(a, b);
  const perimeter = la + lb + lc;
  const ix = (la * a[0] + lb * b[0] + lc * c[0]) / perimeter;
  const iy = (la * a[1] + lb * b[1] + lc * c[1]) / perimeter;
  const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  const k = (2 * area / perimeter - round) / (2 * area / perimeter);
  return [a, b, c].map(([x, y]) => [ix + (x - ix) * k, iy + (y - iy) * k]);
}

// ---------------------------------------------------------------- raster

function sdRoundBox(px, py, hw, hh, r) {
  const qx = Math.abs(px) - hw + r;
  const qy = Math.abs(py) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// Inigo Quilez's exact triangle distance.
function sdTriangle(px, py, [[x0, y0], [x1, y1], [x2, y2]]) {
  const edges = [
    [x1 - x0, y1 - y0, px - x0, py - y0],
    [x2 - x1, y2 - y1, px - x1, py - y1],
    [x0 - x2, y0 - y2, px - x2, py - y2],
  ];
  const [e0x, e0y] = edges[0];
  const [e2x, e2y] = edges[2];
  const s = Math.sign(e0x * e2y - e0y * e2x);

  let dist = Infinity;
  let side = Infinity;
  for (const [ex, ey, vx, vy] of edges) {
    const t = Math.min(1, Math.max(0, (vx * ex + vy * ey) / (ex * ex + ey * ey)));
    const qx = vx - ex * t;
    const qy = vy - ey * t;
    dist = Math.min(dist, qx * qx + qy * qy);
    side = Math.min(side, s * (vx * ey - vy * ex));
  }
  return -Math.sqrt(dist) * Math.sign(side);
}

const coverage = (d) => Math.min(1, Math.max(0, 0.5 - d));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function over([r, g, b, a], color, alpha) {
  const out = alpha + a * (1 - alpha);
  if (out === 0) return [0, 0, 0, 0];
  const blend = (i) => (color[i] * alpha + [r, g, b][i] * a * (1 - alpha)) / out;
  return [blend(0), blend(1), blend(2), out];
}

function rasterize({ size, tile, badge, play }) {
  const rgba = Buffer.alloc(size * size * 4);
  const top = badge.cy - badge.hh;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      let pixel = tile ? [...TILE, 1] : [0, 0, 0, 0];
      const shade = Math.min(1, Math.max(0, (py - top) / (badge.hh * 2)));
      pixel = over(pixel, mix(RED_TOP, RED_BOTTOM, shade), coverage(sdRoundBox(px - badge.cx, py - badge.cy, badge.hw, badge.hh, badge.r)));
      pixel = over(pixel, PLAY, coverage(sdTriangle(px, py, play.vertices) - play.round));

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

function svg({ size, badge, play }) {
  const n = (v) => +v.toFixed(2);
  const points = play.vertices.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hex(RED_TOP)}"/>
      <stop offset="1" stop-color="${hex(RED_BOTTOM)}"/>
    </linearGradient>
  </defs>
  <rect x="${n(badge.cx - badge.hw)}" y="${n(badge.cy - badge.hh)}" width="${n(badge.hw * 2)}" height="${n(badge.hh * 2)}" rx="${n(badge.r)}" fill="url(#red)"/>
  <polygon points="${points}" fill="${hex(PLAY)}" stroke="${hex(PLAY)}" stroke-width="${n(play.round * 2)}" stroke-linejoin="round"/>
</svg>
`;
}

// ---------------------------------------------------------------- output

const favicon = { badge: 1, playScale: 1.12 };
const standalone = { badge: 0.86 };
const homeScreen = { badge: 0.72, tile: true };
// Android may crop to an 80%-diameter circle; at 0.62 the badge's furthest corner sits at ~82% of that radius.
const maskable = { badge: 0.62, tile: true };

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

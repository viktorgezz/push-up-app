// Renders the app icon (two stacked chevrons on volt) to PNG and SVG, and the iOS
// launch screens (the icon centred on the app background), without any image
// dependencies: geometry is rasterized with 4×4 supersampling.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import SPLASH_SCREENS from './splash-screens.json' with { type: 'json' };

const OUT = new URL('../public/icons/', import.meta.url);
const SPLASH_OUT = new URL('../public/splash/', import.meta.url);
const BG = [212, 255, 58];
const FG = [11, 11, 12];
/** App background (--bg); iOS shows the launch screen until the first paint. */
const SPLASH_BG = [11, 11, 12];
/** Icon size on the launch screen, in points. */
const SPLASH_ICON_PT = 120;
const SS = 4;

// Icon geometry in a 64-unit box: two chevrons as thick round-capped polylines.
const STROKE = 7;
const CHEVRONS = [
  { pts: [[12, 34], [32, 16], [52, 34]], alpha: 1 },
  { pts: [[12, 50], [32, 32], [52, 50]], alpha: 0.45 },
];

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Coverage of the glyph at a point in the 64-unit box (0..1). */
function glyphAlpha(x, y) {
  let a = 0;
  for (const { pts, alpha } of CHEVRONS) {
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(x, y, pts[i], pts[i + 1]) <= STROKE / 2) a = Math.max(a, alpha);
    }
  }
  return a;
}

/** Inside the rounded square of the icon (rx 14, as in the SVG) in the 64-unit box. */
function inRoundedSquare(x, y) {
  const r = 14;
  const dx = Math.max(Math.abs(x - 32) - (32 - r), 0);
  const dy = Math.max(Math.abs(y - 32) - (32 - r), 0);
  return Math.abs(x - 32) <= 32 && Math.abs(y - 32) <= 32 && dx * dx + dy * dy <= r * r;
}

/** scale < 1 shrinks the glyph toward the centre (maskable safe zone). */
function render(size, scale = 1) {
  const px = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * 64;
          const v = ((y + (sy + 0.5) / SS) / size) * 64;
          cover += glyphAlpha(32 + (u - 32) / scale, 32 + (v - 32) / scale);
        }
      }
      cover /= SS * SS;
      const o = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * cover);
    }
  }
  return encodePng(size, size, px);
}

/** Launch screen: the rounded icon centred on the app background. */
function renderSplash(width, height, ratio) {
  const px = Buffer.alloc(width * height * 3).fill(Buffer.from(SPLASH_BG));
  const size = SPLASH_ICON_PT * ratio;
  const x0 = Math.round((width - size) / 2);
  const y0 = Math.round((height - size) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * 64;
          const v = ((y + (sy + 0.5) / SS) / size) * 64;
          const a = glyphAlpha(u, v);
          for (let c = 0; c < 3; c++) sum[c] += inRoundedSquare(u, v) ? BG[c] + (FG[c] - BG[c]) * a : SPLASH_BG[c];
        }
      }
      const o = ((y0 + y) * width + x0 + x) * 3;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(sum[c] / (SS * SS));
    }
  }
  return encodePng(width, height, px);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${hex(BG)}"/>
  <g fill="none" stroke="${hex(FG)}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">
${CHEVRONS.map(({ pts, alpha }) => `    <polyline points="${pts.map((p) => p.join(',')).join(' ')}"${alpha < 1 ? ` opacity="${alpha}"` : ''}/>`).join('\n')}
  </g>
</svg>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL('icon-192.png', OUT), render(192));
writeFileSync(new URL('icon-512.png', OUT), render(512));
writeFileSync(new URL('icon-maskable-512.png', OUT), render(512, 0.8));
writeFileSync(new URL('apple-touch-icon.png', OUT), render(180));
writeFileSync(new URL('favicon.svg', OUT), svg);
console.log('Icons written to public/icons/');

// Portrait and landscape for every screen; the names match the tags vite.config.ts injects.
mkdirSync(SPLASH_OUT, { recursive: true });
for (const { width, height, ratio } of SPLASH_SCREENS) {
  for (const [w, h] of [
    [width, height],
    [height, width],
  ]) {
    writeFileSync(new URL(`${w * ratio}x${h * ratio}.png`, SPLASH_OUT), renderSplash(w * ratio, h * ratio, ratio));
  }
}
console.log(`Launch screens written to public/splash/ (${SPLASH_SCREENS.length * 2})`);

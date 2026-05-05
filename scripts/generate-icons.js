/**
 * Generates logo192.png and logo512.png for the Tag Charting PWA.
 * Uses only Node.js built-ins — no external dependencies.
 * Run: node scripts/generate-icons.js
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── PNG encoder ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crcBuf]);
}

function encodePNG(rgba, w, h) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const rows = Buffer.alloc((1 + w * 4) * h);
  for (let y = 0; y < h; y++) {
    rows[(1 + w * 4) * y] = 0; // filter: None
    rgba.copy(rows, (1 + w * 4) * y + 1, y * w * 4, (y + 1) * w * 4);
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon renderer ───────────────────────────────────────────────────────────
// Re-creates the TagIcon SVG (viewBox 0 0 28 34) as a pixel image.
// Uses signed-distance functions (SDF) for anti-aliased rendering.

function sdfRoundedRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdfCircle(px, py, cx, cy, r) {
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - r;
}

function sdfSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.sqrt((pax - bax * h) ** 2 + (pay - bay * h) ** 2);
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Background: #0d0d12
  for (let i = 0; i < size * size; i++) {
    buf[i * 4]     = 13;
    buf[i * 4 + 1] = 13;
    buf[i * 4 + 2] = 18;
    buf[i * 4 + 3] = 255;
  }

  // Map SVG viewBox (0 0 28 34) → square icon with padding
  const SVG_W = 28, SVG_H = 34;
  const PAD   = 0.10; // 10% padding each side (safe zone for maskable)
  const scale = size * (1 - PAD * 2) / Math.max(SVG_W, SVG_H);
  const ox    = (size - SVG_W * scale) / 2;
  const oy    = (size - SVG_H * scale) / 2;

  const sx = (v) => ox + v * scale;
  const sy = (v) => oy + v * scale;

  // #c9a84c → 201, 168, 76
  const AR = 201, AG = 168, AB = 76;

  function blendPixel(x, y, r, g, b, alpha) {
    if (x < 0 || x >= size || y < 0 || y >= size || alpha <= 0) return;
    const i = (Math.round(y) * size + Math.round(x)) * 4;
    const a = alpha / 255;
    buf[i]     = Math.round(buf[i]     * (1 - a) + r * a);
    buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + g * a);
    buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + b * a);
    buf[i + 3] = 255;
  }

  // Rasterise a signed-distance value into a pixel
  function sdfPixel(x, y, d, r, g, b, fillOpacity, strokeHW) {
    // Fill: d < 0 = inside shape
    if (fillOpacity > 0) {
      const fa = Math.max(0, Math.min(1, -d + 0.5));
      if (fa > 0) blendPixel(x, y, r, g, b, Math.round(fa * fillOpacity));
    }
    // Stroke: |d| ≤ strokeHW
    if (strokeHW > 0) {
      const sa = Math.max(0, Math.min(1, strokeHW - Math.abs(d) + 0.5));
      if (sa > 0) blendPixel(x, y, r, g, b, Math.round(sa * 255));
    }
  }

  const strokeHW = Math.max(1.0, 0.9 * scale); // half-width of strokes

  // ── 1. Tag body: <rect x="1.5" y="6" width="25" height="26.5" rx="3.5"> ──
  const rcx  = sx(1.5 + 12.5);
  const rcy  = sy(6 + 13.25);
  const rhw  = 12.5 * scale;
  const rhh  = 13.25 * scale;
  const rrx  = 3.5 * scale;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const d = sdfRoundedRect(px + 0.5, py + 0.5, rcx, rcy, rhw, rhh, rrx);
      sdfPixel(px, py, d, AR, AG, AB, 28 /* ~11% fill */, strokeHW);
    }
  }

  // ── 2. Arch: M9 7.5 Q14 1 19 7.5 (quadratic bezier) ─────────────────────
  const archPts = [];
  const [ax0, ay0] = [sx(9), sy(7.5)];
  const [acx, acy] = [sx(14), sy(1)];
  const [ax1, ay1] = [sx(19), sy(7.5)];
  for (let t = 0; t <= 24; t++) {
    const u = t / 24;
    archPts.push([
      (1 - u) ** 2 * ax0 + 2 * (1 - u) * u * acx + u ** 2 * ax1,
      (1 - u) ** 2 * ay0 + 2 * (1 - u) * u * acy + u ** 2 * ay1,
    ]);
  }

  // Compute bounding box of arch + margin for the rasterisation pass
  const archMinX = Math.floor(Math.min(...archPts.map(p => p[0])) - strokeHW - 2);
  const archMaxX = Math.ceil (Math.max(...archPts.map(p => p[0])) + strokeHW + 2);
  const archMinY = Math.floor(Math.min(...archPts.map(p => p[1])) - strokeHW - 2);
  const archMaxY = Math.ceil (Math.max(...archPts.map(p => p[1])) + strokeHW + 2);

  for (let py = Math.max(0, archMinY); py <= Math.min(size - 1, archMaxY); py++) {
    for (let px = Math.max(0, archMinX); px <= Math.min(size - 1, archMaxX); px++) {
      let minD = Infinity;
      for (let s = 0; s < archPts.length - 1; s++) {
        minD = Math.min(minD, sdfSegment(px + 0.5, py + 0.5, archPts[s][0], archPts[s][1], archPts[s + 1][0], archPts[s + 1][1]));
      }
      sdfPixel(px, py, minD - strokeHW, AR, AG, AB, 255, 0);
    }
  }

  // ── 3. Hole: <circle cx="14" cy="9.5" r="2.5"> (ring) ───────────────────
  const [hcx, hcy] = [sx(14), sy(9.5)];
  const hr = 2.5 * scale;
  const hMargin = Math.ceil(hr + strokeHW + 2);

  for (let py = Math.max(0, Math.floor(hcy - hMargin)); py <= Math.min(size - 1, Math.ceil(hcy + hMargin)); py++) {
    for (let px = Math.max(0, Math.floor(hcx - hMargin)); px <= Math.min(size - 1, Math.ceil(hcx + hMargin)); px++) {
      const d = Math.abs(sdfCircle(px + 0.5, py + 0.5, hcx, hcy, hr));
      sdfPixel(px, py, d - strokeHW, AR, AG, AB, 255, 0);
    }
  }

  // ── 4. Chart line: polyline 5,30 10,24.5 15,26 20,18.5 24,21 ─────────────
  const chartSVG = [[5, 30], [10, 24.5], [15, 26], [20, 18.5], [24, 21]];
  const chart    = chartSVG.map(([x, y]) => [sx(x), sy(y)]);
  const chartHW  = Math.max(1.0, 1.1 * scale);

  const chartMinX = Math.floor(Math.min(...chart.map(p => p[0])) - chartHW - 2);
  const chartMaxX = Math.ceil (Math.max(...chart.map(p => p[0])) + chartHW + 2);
  const chartMinY = Math.floor(Math.min(...chart.map(p => p[1])) - chartHW - 2);
  const chartMaxY = Math.ceil (Math.max(...chart.map(p => p[1])) + chartHW + 2);

  for (let py = Math.max(0, chartMinY); py <= Math.min(size - 1, chartMaxY); py++) {
    for (let px = Math.max(0, chartMinX); px <= Math.min(size - 1, chartMaxX); px++) {
      let minD = Infinity;
      for (let s = 0; s < chart.length - 1; s++) {
        minD = Math.min(minD, sdfSegment(px + 0.5, py + 0.5, chart[s][0], chart[s][1], chart[s + 1][0], chart[s + 1][1]));
      }
      sdfPixel(px, py, minD - chartHW, AR, AG, AB, 255, 0);
    }
  }

  return encodePNG(buf, size, size);
}

// ─── Write icons ──────────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, '..', 'public');

for (const size of [192, 512]) {
  const outPath = path.join(publicDir, `logo${size}.png`);
  fs.writeFileSync(outPath, renderIcon(size));
  console.log(`✓ ${outPath} (${size}×${size})`);
}

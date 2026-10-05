// Everything drawn on a canvas: wall text, labels, floors and the generated paintings.
import * as THREE from 'three';

export const FONT = {
  serif: '"EB Garamond", Georgia, serif',
  sans: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
  mono: '"Space Mono", Consolas, monospace',
};

let maxAnisotropy = 8;
export function setAnisotropy(n) {
  maxAnisotropy = n;
}

export function prepareTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function canvasTexture(canvas) {
  return prepareTexture(new THREE.CanvasTexture(canvas));
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  return [canvas, canvas.getContext('2d')];
}

// canvas text needs the web fonts to be loaded first
export async function loadFonts() {
  if (!document.fonts) return;
  const faces = [
    '400 32px "EB Garamond"', '500 32px "EB Garamond"', 'italic 400 32px "EB Garamond"',
    '300 32px "IBM Plex Sans"', '400 32px "IBM Plex Sans"', '500 32px "IBM Plex Sans"',
    '400 32px "Space Mono"', '700 32px "Space Mono"',
  ];
  const all = Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
  await Promise.race([all, new Promise((r) => setTimeout(r, 5000))]);
}

// text

function setFont(ctx, b) {
  ctx.font = `${b.style || 'normal'} ${b.weight || 400} ${b.size}px ${FONT[b.font || 'sans']}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${b.spacing || 0}px`;
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  lines.push(line);
  return lines;
}

// Blocks stack top to bottom, sizes in canvas pixels:
//   { text, font: 'serif'|'sans'|'mono', size, weight, style, color, lineHeight, spacing, upper, gap }
//   { rule: true, width, thickness, color, gap }
//   { cols: [{ text, x, font, size, ... }], size, lineHeight, gap }
function layoutBlocks(ctx, blocks, x, y, maxWidth, align, draw) {
  const top = y;
  for (const b of blocks) {
    if (!b) continue;
    y += b.gap || 0;

    if (b.rule) {
      const w = b.width ?? maxWidth;
      const t = b.thickness ?? 2;
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      if (draw) {
        ctx.fillStyle = b.color || 'rgba(0,0,0,0.3)';
        ctx.fillRect(x0, y, w, t);
      }
      y += t;
      continue;
    }

    const lh = b.size * (b.lineHeight || 1.25);
    const baseline = lh / 2 + b.size * 0.34;

    if (b.cols) {
      if (draw) {
        ctx.textAlign = 'left';
        for (const c of b.cols) {
          const cb = { ...b, ...c };
          setFont(ctx, cb);
          ctx.fillStyle = cb.color || '#1c1a17';
          ctx.fillText(cb.upper ? cb.text.toUpperCase() : cb.text, x + (c.x || 0), y + baseline);
        }
      }
      y += lh;
      continue;
    }

    setFont(ctx, b);
    ctx.textAlign = align;
    ctx.fillStyle = b.color || '#1c1a17';
    const text = String(b.text ?? '');
    for (const para of (b.upper ? text.toUpperCase() : text).split('\n')) {
      for (const line of wrap(ctx, para, maxWidth)) {
        if (draw) ctx.fillText(line, x, y + baseline);
        y += lh;
      }
    }
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return y - top;
}

// Text panel sized in metres, `ppm` is pixels per metre. Without `height` it fits the text (texture.userData.height).
export function textTexture({
  width, height, ppm = 400, background = null, padding = 0.08,
  align = 'left', valign = 'top', blocks,
}) {
  if (height == null) {
    const [, measure] = makeCanvas(width * ppm, 1);
    height = layoutBlocks(measure, blocks, 0, 0, (width - padding * 2) * ppm, align, false) / ppm + padding * 2;
  }
  const [canvas, ctx] = makeCanvas(width * ppm, height * ppm);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const pad = padding * ppm;
  const x = align === 'center' ? canvas.width / 2 : align === 'right' ? canvas.width - pad : pad;
  const maxWidth = canvas.width - pad * 2;
  let y = pad;
  if (valign !== 'top') {
    const h = layoutBlocks(ctx, blocks, x, 0, maxWidth, align, false);
    y = valign === 'middle' ? (canvas.height - h) / 2 : canvas.height - pad - h;
  }
  layoutBlocks(ctx, blocks, x, y, maxWidth, align, true);
  const tex = canvasTexture(canvas);
  tex.userData.height = height;
  return tex;
}

// surfaces

// Tileable planks. hue / sat / light pick the wood.
export function woodTexture({ hue = 27, sat = 26, light = 33, seed = 11 } = {}) {
  const S = 1024;
  const [canvas, ctx] = makeCanvas(S, S);
  const rnd = rng(seed);
  const cols = 7;
  const pw = S / cols;

  for (let c = 0; c < cols; c++) {
    const x = c * pw;
    const start = -rnd() * S;
    let y = start;
    while (y < start + S) {
      const len = Math.min(S * (0.35 + rnd() * 0.5), start + S - y);
      const tone = `hsl(${hue + rnd() * 5}, ${sat + rnd() * 8}%, ${light + rnd() * 6}%)`;
      const grain = Array.from({ length: 16 }, () => [rnd() * pw, rnd() - 0.5, rnd() - 0.5, 0.03 + rnd() * 0.06, 1 + rnd() * 2]);
      for (const off of [-S, 0, S]) {
        const y0 = y + off;
        if (y0 > S || y0 + len < 0) continue;
        ctx.fillStyle = tone;
        ctx.fillRect(x, y0, pw, len);
        for (const [gx, a, b, alpha, lw] of grain) {
          ctx.strokeStyle = `rgba(45,25,10,${alpha})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(x + gx, y0);
          ctx.bezierCurveTo(x + gx + a * 14, y0 + len * 0.33, x + gx + b * 14, y0 + len * 0.66, x + gx, y0 + len);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(25,12,5,0.55)';
        ctx.fillRect(x, y0, pw, 2);
      }
      y += len;
    }
    ctx.fillStyle = 'rgba(25,12,5,0.6)';
    ctx.fillRect(x, 0, 2, S);
  }

  const tex = canvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Tileable stone, about 1.2 m per tile
export function stoneTexture({ hue = 32, sat = 14, light = 63, seed = 23 } = {}) {
  const S = 1024;
  const n = 4;
  const t = S / n;
  const [canvas, ctx] = makeCanvas(S, S);
  const rnd = rng(seed);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = i * t;
      const y = j * t;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, t, t);
      ctx.clip();
      ctx.fillStyle = `hsl(${hue + rnd() * 8}, ${sat + rnd() * 6}%, ${light + rnd() * 6}%)`;
      ctx.fillRect(x, y, t, t);
      for (let k = 0; k < 30; k++) {
        const cx = x + rnd() * t;
        const cy = y + rnd() * t;
        const r = 10 + rnd() * 60;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const dark = rnd() > 0.5;
        g.addColorStop(0, dark ? 'rgba(90,75,60,0.08)' : 'rgba(255,250,240,0.12)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      ctx.strokeStyle = 'rgba(110,95,80,0.18)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(x + rnd() * t, y);
        ctx.bezierCurveTo(x + rnd() * t, y + t * 0.33, x + rnd() * t, y + t * 0.66, x + rnd() * t, y + t);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(80,68,55,0.45)';
      ctx.fillRect(x, y, t, 3);
      ctx.fillRect(x, y, 3, t);
    }
  }
  const tex = canvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// skylight glass with thin mullions
export function skylightTexture() {
  const S = 256;
  const [canvas, ctx] = makeCanvas(S, S);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#8f8a82';
  for (let i = 0; i <= 4; i++) {
    const p = Math.min(S - 4, i * (S / 4) - 2);
    ctx.fillRect(Math.max(0, p), 0, 4, S);
    ctx.fillRect(0, Math.max(0, p), S, 4);
  }
  const tex = canvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Baked ambient occlusion. It holds data rather than colour, so no sRGB conversion.
function dataTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// walls, darker at the floor and ceiling (`height` in metres)
export function wallAOTexture(height) {
  const [canvas, ctx] = makeCanvas(4, 512);
  const f = (m) => Math.min(0.49, m / height);
  const g = ctx.createLinearGradient(0, 512, 0, 0); // canvas bottom = floor
  g.addColorStop(0, '#5a5a5a');
  g.addColorStop(f(0.3), '#a8a8a8');
  g.addColorStop(f(1.4), '#ffffff');
  g.addColorStop(1 - f(1.0), '#ffffff');
  g.addColorStop(1, '#9a9a9a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  return dataTexture(canvas);
}

// floors and ceilings, darker at the edges
export function edgeAOTexture() {
  const S = 256;
  const [canvas, ctx] = makeCanvas(S, S);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'multiply';
  const e = S * 0.09;
  const sides = [[0, 0, e, 0], [S, 0, S - e, 0], [0, 0, 0, e], [0, S, 0, S - e]];
  for (const [x0, y0, x1, y1] of sides) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#6a6a6a');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  return dataTexture(canvas);
}

// soft radial falloff for picture-light washes and contact shadows
export function glowTexture() {
  const [canvas, ctx] = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return canvasTexture(canvas);
}

// generated paintings

const PALETTES = [
  ['#1d3557', '#e63946', '#f1faee', '#a8dadc', '#457b9d'],
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
  ['#3d2c2e', '#a26769', '#d5b9b2', '#ece2d0', '#582c4d'],
  ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#f2e8cf'],
  ['#5f0f40', '#9a031e', '#fb8b24', '#e36414', '#0f4c5c'],
  ['#283618', '#606c38', '#fefae0', '#dda15e', '#bc6c25'],
  ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'],
];
const ASPECTS = [4 / 3, 1, 3 / 4, 3 / 2, 5 / 4, 16 / 9];

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lum = (hex) => {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();

let grain;
function grainPattern(ctx) {
  if (!grain) {
    const [c, g] = makeCanvas(128, 128);
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grain = c;
  }
  return ctx.createPattern(grain, 'repeat');
}

const STYLES = {
  // Colour fields with soft edges
  fields(ctx, W, H, pal, rnd) {
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, W, H);
    const m = W * 0.07;
    const n = 2 + Math.floor(rnd() * 2);
    const gap = H * 0.05;
    const weights = Array.from({ length: n }, () => 0.6 + rnd());
    const total = weights.reduce((a, b) => a + b, 0);
    let y = m;
    const avail = H - m * 2 - gap * (n - 1);
    ctx.filter = 'blur(7px)';
    weights.forEach((w, i) => {
      const h = (avail * w) / total;
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = pal[1 + (i % 4)];
      ctx.fillRect(m, y, W - m * 2, h);
      y += h + gap;
    });
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  },

  // Nested squares
  squares(ctx, W, H, pal) {
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, W, H);
    const s = Math.min(W, H);
    [0.82, 0.6, 0.38].forEach((f, i) => {
      const size = s * f;
      const x = (W - size) / 2;
      const y = (H - size) / 2 + s * (0.82 - f) * 0.18;
      ctx.fillStyle = pal[i + 1];
      ctx.fillRect(x, y, size, size);
    });
  },

  // A landscape: sky, sun and layered ridges
  horizon(ctx, W, H, pal, rnd) {
    const sorted = [...pal].sort((a, b) => lum(b) - lum(a));
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, sorted[2]);
    sky.addColorStop(0.7, sorted[0]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = sorted[1];
    ctx.beginPath();
    ctx.arc(W * (0.25 + rnd() * 0.5), H * (0.28 + rnd() * 0.18), H * (0.1 + rnd() * 0.08), 0, Math.PI * 2);
    ctx.fill();
    const dark = sorted[4];
    for (let l = 0; l < 4; l++) {
      const base = H * (0.52 + l * 0.12);
      ctx.fillStyle = mix(sorted[3], dark, l / 3);
      ctx.beginPath();
      ctx.moveTo(0, H);
      let h = 0;
      let v = 0;
      for (let x = 0; x <= W + 16; x += 16) {
        v = v * 0.9 + (rnd() - 0.5) * 9;
        h = Math.max(-H * 0.2, Math.min(H * 0.12, h + v));
        ctx.lineTo(x, base + h);
      }
      ctx.lineTo(W, H);
      ctx.fill();
    }
  },

  // Circles, bars and lines on a pale ground
  shapes(ctx, W, H, pal, rnd) {
    const sorted = [...pal].sort((a, b) => lum(b) - lum(a));
    ctx.fillStyle = sorted[0];
    ctx.fillRect(0, 0, W, H);
    const s = Math.min(W, H);
    ctx.fillStyle = sorted[3];
    ctx.beginPath();
    ctx.arc(W * (0.3 + rnd() * 0.4), H * (0.3 + rnd() * 0.4), s * (0.22 + rnd() * 0.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((rnd() - 0.5) * 1.2);
    ctx.fillStyle = sorted[2];
    ctx.fillRect(-W * 0.45, -s * 0.05, W * 0.9, s * 0.1);
    ctx.restore();
    ctx.fillStyle = sorted[1];
    ctx.beginPath();
    ctx.arc(W * (0.15 + rnd() * 0.7), H, s * 0.2, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = sorted[4];
    ctx.lineWidth = s * 0.012;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(rnd() * W, rnd() * H);
      ctx.lineTo(rnd() * W, rnd() * H);
      ctx.stroke();
    }
    ctx.fillStyle = sorted[4];
    ctx.beginPath();
    ctx.arc(W * rnd(), H * rnd(), s * 0.04, 0, Math.PI * 2);
    ctx.fill();
  },

  // Diagonal bands
  stripes(ctx, W, H, pal, rnd) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rnd() > 0.5 ? 0.35 : -0.35);
    const D = Math.hypot(W, H);
    let x = -D / 2;
    let i = 0;
    while (x < D / 2) {
      const w = D * (0.02 + rnd() * 0.07);
      ctx.fillStyle = pal[i++ % pal.length];
      ctx.fillRect(x, -D / 2, w + 1, D);
      x += w;
    }
    ctx.restore();
  },
};

// abstract painting canvas, the same seed gives the same picture
export function artworkCanvas(seed, aspect) {
  const rnd = rng(hash(seed));
  aspect ??= ASPECTS[Math.floor(rnd() * ASPECTS.length)];
  const W = 1024;
  const H = Math.round(W / aspect);
  const [canvas, ctx] = makeCanvas(W, H);
  const pal = [...PALETTES[Math.floor(rnd() * PALETTES.length)]].sort(() => rnd() - 0.5);
  const names = Object.keys(STYLES);
  STYLES[names[Math.floor(rnd() * names.length)]](ctx, W, H, pal, rnd);

  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

// flat placeholder while a picture loads
export function blankCanvas(aspect, color = '#26231f') {
  const W = 512;
  const [canvas, ctx] = makeCanvas(W, W / aspect);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Title card for projects without screenshots: title, tagline and a row of stack chips
export function cardCanvas({ title, medium = '', tagline = '', ground = '#1d1b22', accent = '#c9a24a', chips = [] }) {
  const W = 1024;
  const H = 576;
  const pad = 64;
  const [canvas, ctx] = makeCanvas(W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(ground, '#ffffff', 0.07));
  bg.addColorStop(1, mix(ground, '#000000', 0.4));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 3;
  [[310, 0.26], [225, 0.12]].forEach(([r, a]) => {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(W * 0.88, H * 0.16, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.arc(W * 0.88, H * 0.16, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
  ctx.font = `400 21px ${FONT.mono}`;
  ctx.fillStyle = accent;
  ctx.fillText(medium.toUpperCase(), pad, 96);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillRect(pad, 140, 90, 4);

  let size = 136;
  do {
    ctx.font = `500 ${size}px ${FONT.serif}`;
    size -= 4;
  } while (ctx.measureText(title).width > W - pad * 2 - 40 && size > 56);
  ctx.fillStyle = '#f6f1e6';
  ctx.fillText(title, pad, 290);

  ctx.font = `italic 400 36px ${FONT.serif}`;
  ctx.fillStyle = 'rgba(246,241,230,0.78)';
  wrap(ctx, tagline, W - pad * 2 - 140).slice(0, 2).forEach((line, i) => ctx.fillText(line, pad, 352 + i * 46));

  ctx.font = `400 19px ${FONT.mono}`;
  let x = pad;
  for (const chip of chips) {
    const w = ctx.measureText(chip).width + 34;
    if (x + w > W - pad) break;
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    roundedRect(ctx, x, H - 96, w, 40, 20);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.fillText(chip, x + 17, H - 70);
    x += w + 12;
  }

  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

// floor inlay with a numeral at each hall's doorway
export function medallionTexture(label, color) {
  const S = 256;
  const [canvas, ctx] = makeCanvas(S, S);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 122, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,238,223,0.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 106, 0, Math.PI * 2);
  ctx.stroke();
  const size = label.length > 2 ? 78 : 104;
  ctx.font = `500 ${size}px ${FONT.serif}`;
  ctx.fillStyle = '#f5eedf';
  ctx.textAlign = 'center';
  ctx.fillText(label, S / 2, S / 2 + size * 0.32);
  return canvasTexture(canvas);
}

// 母题目标点生成（CPU 端仅在初始化时执行一次）
// 每个图层是 TEX_W*TEX_H 个 RGBA32F 纹素，第 i 个纹素对应第 i 个粒子在该母题下的参数。
// 点按序随机生成，因此只绘制前 N 个粒子时依然是均匀子集（供自适应降粒子数使用）。

export const LAYER = {
  TEXT: 0,
  RING: 1,
  FLAG: 2,
  SAKURA: 3,
  MOMIJI: 4,
  COMIC: 5,
  STARDUST: 6,
};
export const LAYER_COUNT = 7;

const SLUG_MAP = {
  'sakura-momiji-flag': LAYER.FLAG,
  'sakura-outfit-guide': LAYER.SAKURA,
  'momiji-style-guide': LAYER.MOMIJI,
  'jm-view-server': LAYER.COMIC,
};

export function slugToLayer(slug) {
  if (!slug) return LAYER.RING;
  if (SLUG_MAP[slug] !== undefined) return SLUG_MAP[slug];
  return LAYER.RING;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng) {
  return (rng() + rng() + rng() - 1.5) * 1.15;
}

const TAU = Math.PI * 2;

// ---------- 默认星环（双环缝精密天体环） ----------
function genRing(out, n, rng) {
  for (let i = 0; i < n; i++) {
    const k = rng();
    let r, y, c;
    if (k < 0.48) {
      r = 1.28 + gauss(rng) * 0.045;
      y = gauss(rng) * 0.018;
      c = 0.04 + rng() * 0.28;
    } else if (k < 0.74) {
      r = 1.72 + gauss(rng) * 0.03;
      y = gauss(rng) * 0.012;
      c = 0.78 + rng() * 0.26;
    } else if (k < 0.86) {
      r = 2.08 + gauss(rng) * 0.02;
      y = gauss(rng) * 0.01;
      c = 0.92 + rng() * 0.22;
    } else {
      r = 0.95 + Math.pow(rng(), 0.65) * 1.55;
      y = gauss(rng) * 0.09;
      c = 0.18 + rng() * 0.78;
    }
    const a = rng() * TAU;
    out[i * 4] = Math.cos(a) * r;
    out[i * 4 + 1] = y;
    out[i * 4 + 2] = Math.sin(a) * r;
    out[i * 4 + 3] = c;
  }
}

// ---------- 旗：素白樱瓣旗面 + 拔白留边中央赤日 + 随风化散飞花 ----------
function genFlag(out, n, rng) {
  const W = 3.45, H = 1.76, R = 0.48, gap = 0.135, sunY = 0.10;
  const petals = [];
  const want = 2200;
  let guard = 0;
  while (petals.length < want && guard++ < 36000) {
    // 右侧边缘渐次消散成飞花
    const u = rng();
    const x = (u - 0.5) * W;
    if (u > 0.82 && rng() < (u - 0.82) * 4.2) continue;
    const y = (rng() - 0.5) * H;
    if (Math.hypot(x, y - sunY) < R + gap) continue;
    petals.push({ x, y, a: -0.15 + (rng() - 0.5) * 0.85, l: 0.042 + rng() * 0.032 });
  }
  for (let i = 0; i < n; i++) {
    const k = rng();
    let x, y, z = 0, c;
    if (k < 0.32) {
      // 中央叶燃成日：高密度赤日外环 + 内部红叶脉络聚焰
      const rim = rng();
      let rr;
      if (rim < 0.50) rr = R * (0.955 + rng() * 0.045);
      else if (rim < 0.68) rr = R * (0.72 + rng() * 0.06);
      else rr = R * Math.pow(rng(), 0.54);
      const a = rng() * TAU;
      x = Math.cos(a) * rr;
      y = sunY + Math.sin(a) * rr;
      z = gauss(rng) * 0.006;
      c = rim < 0.50 ? (0.96 + rng() * 0.24) : (0.82 + rng() * 0.22);
    } else if (k < 0.52) {
      // 旗帜上下波浪轮廓边与左侧旗杆边，勾勒清晰旗形
      const edge = rng();
      if (edge < 0.18) {
        x = -W * 0.5 + gauss(rng) * 0.008;
        y = (rng() - 0.5) * H;
      } else {
        const top = edge < 0.59 ? 1 : -1;
        const u = Math.pow(rng(), 0.88) * 0.94;
        x = (-0.5 + u) * W;
        y = top * H * 0.5 + gauss(rng) * 0.010;
      }
      z = gauss(rng) * 0.008;
      c = 0.02 + rng() * 0.12;
    } else if (k < 0.85) {
      // 旗面内部樱白花瓣簇（与中央赤日保持纯净气隙）
      const p = petals[(rng() * petals.length) | 0];
      const a = rng() * TAU, r = Math.sqrt(rng());
      const lx = Math.cos(a) * r * p.l, ly = Math.sin(a) * r * p.l * 0.46;
      const ca = Math.cos(p.a), sa = Math.sin(p.a);
      x = p.x + lx * ca - ly * sa;
      y = p.y + lx * sa + ly * ca;
      z = gauss(rng) * 0.010;
      c = 0.03 + rng() * 0.18;
    } else {
      // 右端随风化散的两道流风花吹雪（细小花瓣沿风向流线渐次飘散，无生硬团块）
      const s = rng();
      const stream = rng() < 0.58 ? 1 : -1;
      const x0 = W * (0.28 + Math.pow(s, 0.85) * 0.62);
      const wave = Math.sin(s * 5.2 + (stream > 0 ? 0.3 : 2.4)) * 0.24;
      const spread = (0.06 + s * 0.36) * gauss(rng);
      const cx = x0;
      const cy = stream * (0.18 + s * 0.28) * H + wave + spread;
      const isRed = rng() < 0.36;
      const ang = -0.25 + s * 1.4 + rng() * TAU;
      const lx = (rng() * 2 - 1) * 0.036, ly = (rng() * 2 - 1) * 0.017;
      x = cx + lx * Math.cos(ang) - ly * Math.sin(ang);
      y = cy + lx * Math.sin(ang) + ly * Math.cos(ang);
      z = gauss(rng) * (0.04 + s * 0.28);
      c = isRed ? (0.86 + rng() * 0.24) : (0.04 + rng() * 0.18);
    }
    out[i * 4] = x; out[i * 4 + 1] = y; out[i * 4 + 2] = z; out[i * 4 + 3] = c;
  }
}

// ---------- 五瓣樱花群：x,y 为单朵花局部坐标，z 为花朵编号 ----------
function petalRadius(theta) {
  const seg = TAU / 5;
  const k = Math.round(theta / seg);
  const phi = theta - k * seg;
  const u = Math.min(1, Math.abs(phi) / (seg / 2));
  // 独立饱满的五片花瓣，瓣间深收至 0.11，瓣尖中央带鲜明的樱花裂口（桜割れ）
  let R = 0.11 + 0.89 * Math.pow(Math.max(0, 1 - Math.pow(u, 1.85)), 0.58);
  R -= 0.27 * Math.exp(-Math.pow(u / 0.145, 2));
  return Math.max(0.09, R);
}

function genSakura(out, n, rng) {
  const MAIN = 5;
  const FALL = 7;
  for (let i = 0; i < n; i++) {
    // 68% 粒子赋予 5 朵主视觉盛放樱花，使五瓣裂口与花丝毫发毕现
    const r0 = rng();
    const gid = r0 < 0.68 ? Math.floor((r0 / 0.68) * MAIN) : MAIN + Math.floor(rng() * FALL);
    const k = rng();
    let x, y, c;
    if (k < 0.15) {
      // 花蕊：绯红花心环 + 20 根放射花丝与明亮花药圆珠
      const sub = rng();
      if (sub < 0.28) {
        const r = 0.095 + gauss(rng) * 0.008, a = rng() * TAU;
        x = Math.cos(a) * r; y = Math.sin(a) * r; c = 0.92 + rng() * 0.18;
      } else {
        const idx = Math.floor(rng() * 20);
        const len = (idx % 2 === 0) ? 0.31 : 0.23;
        const a = (idx / 20) * TAU + (rng() - 0.5) * 0.018;
        const tip = rng() < 0.58;
        const r = tip ? len + gauss(rng) * 0.010 : 0.10 + rng() * (len - 0.10);
        x = Math.cos(a) * r; y = Math.sin(a) * r;
        c = tip ? (1.02 + rng() * 0.22) : (0.82 + rng() * 0.16);
      }
    } else if (k < 0.72) {
      // 高密度五瓣轮廓线（含尖端裂口）
      const theta = rng() * TAU;
      const R = petalRadius(theta);
      const r = R * (0.968 + rng() * 0.032);
      x = Math.cos(theta + Math.PI / 2) * r;
      y = Math.sin(theta + Math.PI / 2) * r;
      c = 0.03 + rng() * 0.15;
    } else if (k < 0.86) {
      // 每片花瓣内部的 3 条纤细花脉纹
      const pIdx = Math.floor(rng() * 5);
      const vIdx = Math.floor(rng() * 3) - 1;
      const t = 0.16 + rng() * 0.66;
      const theta = (pIdx / 5) * TAU + vIdx * 0.13 * (0.5 + 0.5 * t);
      const r = petalRadius(theta) * t;
      x = Math.cos(theta + Math.PI / 2) * r + gauss(rng) * 0.004;
      y = Math.sin(theta + Math.PI / 2) * r + gauss(rng) * 0.004;
      c = 0.28 + (1 - t) * 0.36;
    } else {
      // 花瓣内侧通透薄纱晕染
      const theta = rng() * TAU;
      const R = petalRadius(theta);
      const r = R * (0.15 + 0.82 * Math.pow(rng(), 0.62));
      x = Math.cos(theta + Math.PI / 2) * r;
      y = Math.sin(theta + Math.PI / 2) * r;
      const nr = r / Math.max(R, 0.1);
      c = Math.max(0.04, 0.48 - 0.40 * nr + (rng() - 0.5) * 0.06);
    }
    out[i * 4] = x; out[i * 4 + 1] = y; out[i * 4 + 2] = gid; out[i * 4 + 3] = c;
  }
}

// ---------- 七裂枫叶（イロハモミジ）：z=0..2 为三片主视觉大红叶，3..8 为伴飞小红叶 ----------
const LOBES = [
  { a: 0, l: 1.08, w: 0.33 },
  { a: 0.68, l: 0.95, w: 0.32 }, { a: -0.68, l: 0.95, w: 0.32 },
  { a: 1.38, l: 0.74, w: 0.30 }, { a: -1.38, l: 0.74, w: 0.30 },
  { a: 2.08, l: 0.44, w: 0.27 }, { a: -2.08, l: 0.44, w: 0.27 },
];

function leafRadius(theta) {
  let R = 0.13;
  for (const L of LOBES) {
    let d = theta - L.a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const u = Math.abs(d) / L.w;
    if (u < 1) {
      // 中段略鼓、尖端锋利收束的修长鸡爪槭裂片
      const profile = Math.sin((1 - u) * Math.PI * 0.5) * (1 + 0.16 * Math.sin(u * Math.PI));
      R = Math.max(R, 0.13 + (L.l - 0.13) * Math.pow(profile, 0.86));
    }
  }
  if (R > 0.22) R += 0.020 * Math.sin(theta * 56);
  return R;
}

function genMomiji(out, n, rng) {
  for (let i = 0; i < n; i++) {
    const r0 = rng();
    let gid;
    if (r0 < 0.34) gid = 0;
    else if (r0 < 0.52) gid = 1;
    else if (r0 < 0.68) gid = 2;
    else gid = 3 + Math.floor(rng() * 6);

    const k = rng();
    let x, y, c;
    if (k < 0.17) {
      // 7 条主叶脉与分叉侧脉
      const L = LOBES[(rng() * LOBES.length) | 0];
      const t = 0.06 + Math.pow(rng(), 0.68) * 0.89;
      let vx = Math.sin(L.a) * L.l * t;
      let vy = Math.cos(L.a) * L.l * t;
      if (rng() < 0.32 && t > 0.25 && t < 0.82) {
        const side = rng() < 0.5 ? 1 : -1;
        const br = rng() * 0.13 * L.l;
        const ba = L.a + side * 0.58;
        vx += Math.sin(ba) * br;
        vy += Math.cos(ba) * br;
      }
      x = vx + gauss(rng) * 0.003;
      y = vy + gauss(rng) * 0.003;
      c = 1.06 + t * 0.24;
    } else if (k < 0.21) {
      // 细长微弯叶柄
      const t = rng();
      x = 0.065 * Math.sin(t * 2.2) + gauss(rng) * 0.0035;
      y = -t * 0.62;
      c = 0.96;
    } else if (k < 0.78) {
      // 高密度七裂锯齿外叶缘轮廓
      const theta = rng() * TAU;
      const R = leafRadius(theta);
      const r = R * (0.966 + rng() * 0.034);
      x = Math.sin(theta) * r;
      y = Math.cos(theta) * r;
      c = 0.86 + 0.36 * (r / Math.max(0.4, R)) + (rng() - 0.5) * 0.08;
    } else {
      // 叶片内部深茜红通透铺底
      const theta = rng() * TAU;
      const R = leafRadius(theta);
      const r = R * Math.pow(0.10 + 0.86 * rng(), 0.62);
      x = Math.sin(theta) * r;
      y = Math.cos(theta) * r;
      const e = r / R;
      c = 0.66 + 0.34 * e * e + (rng() - 0.5) * 0.10;
    }
    out[i * 4] = x; out[i * 4 + 1] = y + 0.08; out[i * 4 + 2] = gid; out[i * 4 + 3] = c;
  }
}

// ---------- 漫画分格与层叠书页阵列：x,y 页内坐标，z 为页号 ----------
const LAYOUTS = [
  [[0, 0, 1, 0.33], [0, 0.33, 0.56, 0.37], [0.56, 0.33, 0.44, 0.37], [0, 0.7, 1, 0.3]],
  [[0, 0, 0.62, 0.48], [0.62, 0, 0.38, 0.24], [0.62, 0.24, 0.38, 0.24], [0, 0.48, 0.4, 0.52], [0.4, 0.48, 0.6, 0.52]],
  [[0, 0, 0.48, 0.3], [0.48, 0, 0.52, 0.3], [0, 0.3, 1, 0.38], [0, 0.68, 0.35, 0.32], [0.35, 0.68, 0.65, 0.32]],
];
const PAGE_W = 1.04, PAGE_H = 1.46, MARGIN = 0.068, GUTTER = 0.036;

function panelRect(layout, idx) {
  const p = layout[idx];
  const iw = PAGE_W - MARGIN * 2, ih = PAGE_H - MARGIN * 2;
  const x0 = -PAGE_W / 2 + MARGIN + p[0] * iw + GUTTER / 2;
  const y0 = PAGE_H / 2 - MARGIN - p[1] * ih - GUTTER / 2;
  return { x: x0, y: y0, w: p[2] * iw - GUTTER, h: p[3] * ih - GUTTER };
}

function pointOnRect(rng, r) {
  const per = 2 * (r.w + r.h);
  let t = rng() * per;
  if (t < r.w) return [r.x + t, r.y];
  t -= r.w;
  if (t < r.h) return [r.x + r.w, r.y - t];
  t -= r.h;
  if (t < r.w) return [r.x + r.w - t, r.y - r.h];
  t -= r.w;
  return [r.x, r.y - r.h + t];
}

function genComic(out, n, rng) {
  const PAGES = 5;
  for (let i = 0; i < n; i++) {
    const pid = Math.floor(rng() * PAGES);
    const layout = LAYOUTS[pid % LAYOUTS.length];
    const k = rng();
    let x, y, c = 0.03 + rng() * 0.08;
    const pi = Math.floor(rng() * layout.length);
    const pr = panelRect(layout, pi);
    const accent = (pid === 1 && pi === 0) || (pid === 2 && pi === 2) || (pid === 3 && pi === 4) || (pid === 0 && pi === 2);
    if (k < 0.24) {
      [x, y] = pointOnRect(rng, { x: -PAGE_W / 2, y: PAGE_H / 2, w: PAGE_W, h: PAGE_H });
      c = 0.02;
    } else if (k < 0.68) {
      [x, y] = pointOnRect(rng, pr);
      x += gauss(rng) * 0.0018; y += gauss(rng) * 0.0018;
      if (accent) c = 0.92;
    } else if (k < 0.84) {
      // 日式漫画网点（Screentone）
      const sp = 0.032;
      const gx = Math.floor(rng() * Math.max(1, pr.w / sp));
      const gy = Math.floor(rng() * Math.max(1, pr.h / sp));
      const cx = pr.x + (gx + 0.5) * sp, cy = pr.y - (gy + 0.5) * sp;
      const tone = (gx * sp / pr.w + gy * sp / pr.h) * 0.5;
      const rad = sp * 0.42 * tone;
      const a = rng() * TAU, rr = Math.sqrt(rng()) * rad;
      x = cx + Math.cos(a) * rr; y = cy + Math.sin(a) * rr;
      c = accent ? 0.95 : 0.12 + rng() * 0.14;
    } else if (k < 0.91) {
      // 竖排台词对话框
      const bx = pr.x + pr.w * 0.64, by = pr.y - pr.h * 0.32;
      const rx = pr.w * 0.22, ry = Math.min(pr.h * 0.22, rx * 0.85);
      if (rng() < 0.84) {
        const a = rng() * TAU;
        x = bx + Math.cos(a) * rx; y = by + Math.sin(a) * ry;
      } else {
        const t = rng();
        x = bx - rx * 0.25 - t * rx * 0.45; y = by - ry * 0.88 - t * ry * 0.7;
      }
      c = 0.02;
    } else {
      // 放射速度集中线
      const cx = pr.x + pr.w * 0.5, cy = pr.y - pr.h * 0.5;
      const a = Math.floor(rng() * 32) / 32 * TAU;
      const t = 0.48 + rng() * 0.52;
      x = cx + Math.cos(a) * pr.w * 0.5 * t;
      y = cy + Math.sin(a) * pr.h * 0.5 * t;
      x = Math.min(Math.max(x, pr.x), pr.x + pr.w);
      y = Math.max(Math.min(y, pr.y), pr.y - pr.h);
      c = accent ? 0.92 : 0.08;
    }
    out[i * 4] = x; out[i * 4 + 1] = y; out[i * 4 + 2] = pid; out[i * 4 + 3] = c;
  }
}

// ---------- 星尘：About 区地平线以上的安静银河星尘 ----------
function genStardust(out, n, rng) {
  const camY = 0.3, camZ = 7.2;
  for (let i = 0; i < n; i++) {
    const d = 9 + Math.pow(rng(), 0.78) * 34;
    let az, el;
    if (rng() < 0.38) {
      // 斜跨苍穹的星河微尘带
      const s = rng() * 2 - 1;
      az = s * 1.08;
      el = 0.14 + 0.32 * (1 - s * s) + gauss(rng) * 0.042 + s * 0.09;
    } else {
      az = (rng() * 2 - 1) * 1.15;
      el = 0.022 + Math.pow(rng(), 1.5) * 0.72;
    }
    el = Math.max(el, 0.018);
    const x = Math.sin(az) * d;
    const z = camZ - Math.cos(az) * d;
    const y = camY + Math.tan(el) * d * Math.cos(az) * 0.9 + 0.12;
    out[i * 4] = x; out[i * 4 + 1] = y; out[i * 4 + 2] = z; out[i * 4 + 3] = rng();
  }
}

export function buildStaticLayers(n) {
  const layers = {};
  const make = (seed, fn) => { const a = new Float32Array(n * 4); fn(a, n, mulberry32(seed)); return a; };
  layers[LAYER.RING] = make(11, genRing);
  layers[LAYER.FLAG] = make(23, genFlag);
  layers[LAYER.SAKURA] = make(37, genSakura);
  layers[LAYER.MOMIJI] = make(41, genMomiji);
  layers[LAYER.COMIC] = make(53, genComic);
  layers[LAYER.STARDUST] = make(67, genStardust);
  return layers;
}

// ---------- "hect0x7" 字样：轮廓边缘加密 + 内部星钻填充 ----------
export function buildTextLayer(n, text = 'hect0x7') {
  const cw = 1500, ch = 360;
  let cv;
  if (typeof OffscreenCanvas !== 'undefined') cv = new OffscreenCanvas(cw, ch);
  else { cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; }
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 248px "Space Grotesk", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(text, cw / 2, ch / 2 + 4);
  const img = ctx.getImageData(0, 0, cw, ch).data;
  const fillPts = [];
  const edgePts = [];
  let minX = cw, maxX = 0;
  const alphaAt = (x, y) => (x >= 0 && x < cw && y >= 0 && y < ch) ? img[(y * cw + x) * 4 + 3] : 0;
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const a = alphaAt(x, y);
      if (a > 135) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        const isEdge = alphaAt(x - 1, y) <= 135 || alphaAt(x + 1, y) <= 135 || alphaAt(x, y - 1) <= 135 || alphaAt(x, y + 1) <= 135;
        if (isEdge) edgePts.push(x, y);
        else fillPts.push(x, y);
      }
    }
  }
  const out = new Float32Array(n * 4);
  const rng = mulberry32(97);
  const fCount = fillPts.length / 2, eCount = edgePts.length / 2;
  if (fCount + eCount === 0) {
    genRing(out, n, rng);
    return out;
  }
  const w = Math.max(1, maxX - minX), cx = (minX + maxX) / 2, cy = ch / 2;
  for (let i = 0; i < n; i++) {
    const useEdge = eCount > 0 && (fCount === 0 || rng() < 0.38);
    const arr = useEdge ? edgePts : fillPts;
    const cnt = useEdge ? eCount : fCount;
    const j = ((rng() * cnt) | 0) * 2;
    const px = arr[j] + (rng() - 0.5) * (useEdge ? 0.45 : 0.95);
    const py = arr[j + 1] + (rng() - 0.5) * (useEdge ? 0.45 : 0.95);
    const nx = (px - cx) / w;
    const ny = -(py - cy) / w;
    out[i * 4] = nx;
    out[i * 4 + 1] = ny;
    out[i * 4 + 2] = gauss(rng) * 0.0035;
    // 轮廓偏晶莹樱白，末尾 "0x7" 带一抹微妙绯红点缀
    const tail = nx > 0.09 ? 0.55 + rng() * 0.35 : 0.02 + rng() * 0.16;
    out[i * 4 + 3] = useEdge ? tail * 0.65 : tail;
  }
  return out;
}

// ---------- 预烘焙 256x256 四通道无缝平铺噪声纹理（替代实时 3D Simplex Noise） ----------
// R: 大尺度丝滑 FBM（云气/热流基底）
// G: 独立种子正交 FBM（域扭曲/动态双层滚动/旋度分量）
// B: 脊状分形 Ridged FBM（赤日磁重联亮脊/日珥冕流）
// A: 高频多尺度颗粒（日面米粒组织/朱砂印泥砂眼/和纸纤维）
const GX = new Float32Array(16);
const GY = new Float32Array(16);
for (let k = 0; k < 16; k++) {
  GX[k] = Math.cos((k / 16) * TAU);
  GY[k] = Math.sin((k / 16) * TAU);
}

function pgrad(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) & 15;
}

function pnoise2(u, v, period, seed) {
  const x = u * period, y = v * period;
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const x0 = ((xi % period) + period) % period;
  const y0 = ((yi % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;
  const g00 = pgrad(x0, y0, seed), g10 = pgrad(x1, y0, seed);
  const g01 = pgrad(x0, y1, seed), g11 = pgrad(x1, y1, seed);
  const n00 = GX[g00] * fx + GY[g00] * fy;
  const n10 = GX[g10] * (fx - 1) + GY[g10] * fy;
  const n01 = GX[g01] * fx + GY[g01] * (fy - 1);
  const n11 = GX[g11] * (fx - 1) + GY[g11] * (fy - 1);
  const wx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const wy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const nx0 = n00 + (n10 - n00) * wx;
  const nx1 = n01 + (n11 - n01) * wx;
  return (nx0 + (nx1 - nx0) * wy) * 1.4142;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function buildNoiseData(size = 256) {
  const out = new Uint8Array(size * size * 4);
  const inv = 1 / size;
  let ptr = 0;
  for (let y = 0; y < size; y++) {
    const v = y * inv;
    for (let x = 0; x < size; x++) {
      const u = x * inv;
      const fR = 0.50 * pnoise2(u, v, 4, 11)
               + 0.25 * pnoise2(u, v, 8, 12)
               + 0.15 * pnoise2(u, v, 16, 13)
               + 0.10 * pnoise2(u, v, 32, 14);
      const fG = 0.50 * pnoise2(u, v, 5, 21)
               + 0.25 * pnoise2(u, v, 10, 22)
               + 0.15 * pnoise2(u, v, 20, 23)
               + 0.10 * pnoise2(u, v, 40, 24);
      const r0 = 1 - Math.abs(pnoise2(u, v, 5, 31));
      const r1 = 1 - Math.abs(pnoise2(u, v, 10, 32));
      const r2 = 1 - Math.abs(pnoise2(u, v, 20, 33));
      const r3 = 1 - Math.abs(pnoise2(u, v, 40, 34));
      const fB = Math.pow(clamp01(0.46 * r0 * r0 + 0.28 * r1 * r1 + 0.16 * r2 + 0.10 * r3), 1.12);
      const fA = 0.44 * pnoise2(u, v, 24, 41)
               + 0.34 * pnoise2(u, v, 48, 42)
               + 0.22 * pnoise2(u, v, 96, 43);

      out[ptr++] = Math.round(clamp01(0.5 + fR * 0.62) * 255);
      out[ptr++] = Math.round(clamp01(0.5 + fG * 0.62) * 255);
      out[ptr++] = Math.round(fB * 255);
      out[ptr++] = Math.round(clamp01(0.5 + fA * 0.68) * 255);
    }
  }
  return out;
}

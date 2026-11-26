// Pure Astrophysics Procedural CanvasTexture Library for 《时空织物 · 一束光子的 138 亿年》
// Deterministic seeded PRNG, zero external URLs, cached for reuse across all 4 cosmic worlds & probe.
import * as THREE from 'three';

const CACHE = new Map();

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function cached(key, builder) {
  if (CACHE.has(key)) return CACHE.get(key);
  const val = builder();
  CACHE.set(key, val);
  return val;
}

// Fast smooth 3D trigonometric hash-value noise for seamless spherical equirectangular maps (zero polar seams!)
function make3DField(seed, octaves) {
  const rand = mulberry32(seed);
  const waves = [];
  for (let o = 0; o < octaves; o++) {
    const freq = 2.4 * Math.pow(1.85, o);
    const amp = Math.pow(0.56, o);
    // 5 random unit directions per octave for rich isotropic CMB / photosphere harmonics
    for (let k = 0; k < 5; k++) {
      const z = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - z * z));
      waves.push({
        kx: r * Math.cos(a) * freq,
        ky: z * freq,
        kz: r * Math.sin(a) * freq,
        phase: rand() * Math.PI * 2,
        amp: amp / 5,
      });
    }
  }
  return function sample(x, y, z) {
    let sum = 0;
    for (let i = 0; i < waves.length; i++) {
      const w = waves[i];
      sum += Math.sin(x * w.kx + y * w.ky + z * w.kz + w.phase) * w.amp;
    }
    return sum;
  };
}

/**
 * Act 1 Planck-Satellite CMB Temperature Anisotropy Texture:
 * Seamless spherical equirectangular map with authentic deep navy (#0b1c3d), cerulean (#1d5a8a),
 * mineral teal, warm gold (#d8a84e), and ivory acoustic hotspots (#f8eed4).
 * Returns: THREE.CanvasTexture (SRGBColorSpace)
 */
export function createPlanckCMBTexture(opts = {}) {
  const width = opts.width || 1024;
  const height = opts.height || 512;
  const key = `planckCMB:${width}x${height}`;
  return cached(key, () => {
    const { canvas, ctx } = makeCanvas(width, height);
    const img = ctx.createImageData(width, height);
    const data = img.data;

    // Multi-scale acoustic peak harmonics (l ~ 3..65) evaluated on unit sphere (zero seam!)
    const lowField = make3DField(138001, 3);
    const midField = make3DField(380000, 4);
    const fineField = make3DField(27255, 2);

    // Planck scientific color stops (cold -> mean -> hot ΔT)
    const stops = [
      { t: 0.00, rgb: [8, 22, 54] },     // #081636 abyssal cold spot
      { t: 0.24, rgb: [11, 28, 61] },    // #0b1c3d deep navy
      { t: 0.44, rgb: [29, 90, 138] },   // #1d5a8a cerulean
      { t: 0.58, rgb: [64, 142, 162] },  // #408ea2 mineral teal
      { t: 0.72, rgb: [186, 162, 102] }, // #baa266 warm parchment
      { t: 0.86, rgb: [216, 168, 78] },  // #d8a84e warm gold
      { t: 1.00, rgb: [248, 238, 212] }, // #f8eed4 ivory hotspot
    ];

    function sampleRamp(t) {
      const c = Math.max(0, Math.min(1, t));
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        if (c <= b.t) {
          const u = (c - a.t) / Math.max(1e-5, b.t - a.t);
          return [
            a.rgb[0] + (b.rgb[0] - a.rgb[0]) * u,
            a.rgb[1] + (b.rgb[1] - a.rgb[1]) * u,
            a.rgb[2] + (b.rgb[2] - a.rgb[2]) * u,
          ];
        }
      }
      return stops[stops.length - 1].rgb;
    }

    for (let y = 0; y < height; y++) {
      const theta = ((y + 0.5) / height) * Math.PI;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let x = 0; x < width; x++) {
        const phi = ((x + 0.5) / width) * Math.PI * 2;
        const sx = sinT * Math.cos(phi);
        const sy = cosT;
        const sz = sinT * Math.sin(phi);

        // Acoustic oscillation power spectrum emphasis around characteristic angular scale
        const n1 = lowField(sx * 1.15, sy * 1.15, sz * 1.15);
        const n2 = midField(sx * 3.1, sy * 3.1, sz * 3.1);
        const n3 = fineField(sx * 8.5, sy * 8.5, sz * 8.5);
        const raw = n1 * 0.42 + n2 * 0.46 + n3 * 0.16;

        // S-curve contrast boost for crisp Planck mottled texture
        const norm = Math.max(0, Math.min(1, 0.5 + raw * 0.68));
        const contrasted = norm * norm * (3 - 2 * norm);
        const [r, g, b] = sampleRamp(contrasted);

        const idx = (y * width + x) * 4;
        data[idx + 0] = Math.round(r);
        data[idx + 1] = Math.round(g);
        data[idx + 2] = Math.round(b);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Stellar Photosphere Granulation Texture:
 * Seamless spherical equirectangular convective plasma cells + magnetic sunspot regions
 * for Act 2 massive star & compact companion surfaces.
 * Returns: THREE.CanvasTexture (SRGBColorSpace)
 */
export function createStarPhotosphereTexture(opts = {}) {
  const width = opts.width || 512;
  const height = opts.height || 256;
  const key = `starPhotosphere:${width}x${height}`;
  return cached(key, () => {
    const { canvas, ctx } = makeCanvas(width, height);
    const img = ctx.createImageData(width, height);
    const data = img.data;

    const granField = make3DField(577801, 4);
    const spotField = make3DField(90123, 2);

    for (let y = 0; y < height; y++) {
      const theta = ((y + 0.5) / height) * Math.PI;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let x = 0; x < width; x++) {
        const phi = ((x + 0.5) / width) * Math.PI * 2;
        const sx = sinT * Math.cos(phi);
        const sy = cosT;
        const sz = sinT * Math.sin(phi);

        // Ridge-like convective cell structure
        const g1 = Math.abs(granField(sx * 4.2, sy * 4.2, sz * 4.2));
        const cell = 1.0 - Math.min(1.0, g1 * 1.45);
        const spotNoise = spotField(sx * 2.1, sy * 2.1, sz * 2.1);
        const sunspot = spotNoise > 0.68 ? Math.min(1, (spotNoise - 0.68) * 3.8) : 0;

        const heat = Math.max(0, Math.min(1, 0.55 + cell * 0.45 - sunspot * 0.68));
        // Warm photosphere: deep amber umbra -> golden plasma -> incandescent ivory core
        const r = Math.round(160 + heat * 95);
        const g = Math.round(78 + Math.pow(heat, 1.15) * 168);
        const b = Math.round(24 + Math.pow(heat, 1.95) * 204);

        const idx = (y * width + x) * 4;
        data[idx + 0] = Math.min(255, r);
        data[idx + 1] = Math.min(255, g);
        data[idx + 2] = Math.min(255, b);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Multi-Arm Spiral Galaxy Sprite Texture:
 * Crisp optical logarithmic spiral arms, warm golden-ivory galactic bulge, sapphire-violet
 * star-forming knots, and clean alpha fade at perimeter (for Act 3 lensing & Act 4 epochs).
 * variant: 0 (grand 2-arm blue-gold), 1 (3-arm cerulean-violet), 2 (tight warm-gold barred spiral)
 * Returns: THREE.CanvasTexture (SRGBColorSpace)
 */
export function createSpiralGalaxyTexture(variant = 0) {
  const v = ((variant | 0) % 3 + 3) % 3;
  const size = 512;
  const key = `spiralGalaxy:${v}:${size}`;
  return cached(key, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    const rand = mulberry32(700101 + v * 9973);
    const cx = size * 0.5;
    const cy = size * 0.5;
    const maxR = size * 0.45;

    ctx.clearRect(0, 0, size, size);

    const armCount = v === 1 ? 3 : 2;
    const tightness = v === 2 ? 4.4 : v === 1 ? 3.1 : 3.5;
    const armTint = v === 2 ? [232, 200, 148] : v === 1 ? [138, 186, 255] : [162, 202, 255];
    const knotTint = v === 2 ? [255, 226, 178] : [186, 214, 255];

    // Soft faint outer galactic halo
    const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, maxR);
    halo.addColorStop(0.0, 'rgba(255, 244, 214, 0.85)');
    halo.addColorStop(0.16, 'rgba(242, 206, 144, 0.42)');
    halo.addColorStop(0.45, `rgba(${armTint[0]}, ${armTint[1]}, ${armTint[2]}, 0.14)`);
    halo.addColorStop(0.82, `rgba(${armTint[0]}, ${armTint[1]}, ${armTint[2]}, 0.03)`);
    halo.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Sculpted spiral arms via layered luminous star clouds & HII knots
    const pointsPerArm = 950;
    for (let arm = 0; arm < armCount; arm++) {
      const baseAngle = (arm / armCount) * Math.PI * 2;
      for (let i = 0; i < pointsPerArm; i++) {
        const u = Math.pow(rand(), 0.72); // denser near inner/mid disk
        const r = u * maxR * 0.94;
        const spread = (rand() + rand() - 1) * (0.28 + u * 0.42);
        const theta = baseAngle + u * tightness + spread;

        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r * (v === 2 ? 0.78 : 0.92);

        const edgeFade = Math.max(0, 1 - u * 1.05);
        const isKnot = rand() > 0.91;
        const radius = isKnot ? (1.4 + rand() * 3.2) : (0.9 + rand() * 4.8 * (0.5 + u));
        const alpha = (isKnot ? 0.65 : 0.16 + rand() * 0.22) * edgeFade;

        const warmMix = Math.max(0, 1 - u * 2.4);
        const rr = Math.round(armTint[0] * (1 - warmMix) + 255 * warmMix);
        const gg = Math.round(armTint[1] * (1 - warmMix) + 236 * warmMix);
        const bb = Math.round(armTint[2] * (1 - warmMix) + 190 * warmMix);

        if (isKnot) {
          ctx.fillStyle = `rgba(${knotTint[0]}, ${knotTint[1]}, ${knotTint[2]}, ${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${alpha.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crisp incandescent central bulge
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.14);
    core.addColorStop(0.0, 'rgba(255, 253, 245, 1.0)');
    core.addColorStop(0.28, 'rgba(255, 236, 194, 0.88)');
    core.addColorStop(0.65, 'rgba(232, 186, 118, 0.32)');
    core.addColorStop(1.0, 'rgba(232, 186, 118, 0.0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Deep-Space Starfield Environment Texture:
 * Razor-sharp multi-magnitude spectral stars + subtle deep-space Milky Way dust band
 * against pure obsidian space (#030409). Zero murky fog.
 * Returns: THREE.CanvasTexture (SRGBColorSpace, EquirectangularReflectionMapping)
 */
export function createStarfieldEnvTexture(opts = {}) {
  const width = opts.width || 2048;
  const height = opts.height || 1024;
  const key = `starfieldEnv:${width}x${height}`;
  return cached(key, () => {
    const { canvas, ctx } = makeCanvas(width, height);
    const rand = mulberry32(888042);

    ctx.fillStyle = '#030409';
    ctx.fillRect(0, 0, width, height);

    // Subtle angled Milky Way band (restrained optical dust)
    for (let i = 0; i < 110; i++) {
      const u = rand();
      const x = u * width;
      const bandY = height * (0.5 + 0.22 * Math.sin(u * Math.PI * 2 + 0.6));
      const y = bandY + (rand() - 0.5) * height * 0.13;
      const rad = 26 + rand() * 82;
      const g = ctx.createRadialGradient(x, y, 2, x, y, rad);
      const isWarm = rand() > 0.58;
      g.addColorStop(0.0, isWarm ? 'rgba(116, 102, 86, 0.048)' : 'rgba(64, 92, 144, 0.052)');
      g.addColorStop(1.0, 'rgba(3, 4, 9, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const spectral = [
      [176, 210, 255],
      [226, 238, 255],
      [255, 252, 244],
      [255, 234, 192],
      [246, 196, 132],
    ];

    const totalStars = 4400;
    for (let i = 0; i < totalStars; i++) {
      const inBand = i < 1750;
      const u = rand();
      const x = u * width;
      let y;
      if (inBand) {
        const bandY = height * (0.5 + 0.22 * Math.sin(u * Math.PI * 2 + 0.6));
        const spread = (rand() + rand() - 1) * height * 0.105;
        y = Math.max(2, Math.min(height - 2, bandY + spread));
      } else {
        y = Math.acos(2 * rand() - 1) / Math.PI * height;
      }

      const [r, g, b] = spectral[Math.floor(rand() * spectral.length)];
      const p = rand();
      const radius = p > 0.992 ? 2.0 : p > 0.96 ? 1.3 : p > 0.82 ? 0.88 : 0.52;
      const alpha = p > 0.96 ? 0.96 : 0.34 + rand() * 0.56;

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (p > 0.992) {
        const hg = ctx.createRadialGradient(x, y, 0.4, x, y, radius * 3.8);
        hg.addColorStop(0.0, `rgba(${r},${g},${b},0.46)`);
        hg.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Precision Observatory Polar Coordinate Grid Texture:
 * Hairline concentric metric rings, radial right-ascension lines, 1°/5°/15° graduation ticks
 * on transparent background (for Act 2 metric planes & Act 4 "Now" spacelike hypersurface).
 * Returns: THREE.CanvasTexture (SRGBColorSpace)
 */
export function createObservatoryGridTexture(opts = {}) {
  const size = opts.size || 1024;
  const key = `observatoryGrid:${size}`;
  return cached(key, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    const cx = size * 0.5;
    const cy = size * 0.5;
    const maxR = size * 0.48;

    ctx.clearRect(0, 0, size, size);

    // Subtle radial coordinate fill
    const bg = ctx.createRadialGradient(cx, cy, maxR * 0.04, cx, cy, maxR);
    bg.addColorStop(0.0, 'rgba(130, 178, 224, 0.10)');
    bg.addColorStop(0.55, 'rgba(64, 102, 152, 0.06)');
    bg.addColorStop(0.95, 'rgba(218, 184, 114, 0.08)');
    bg.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.fill();

    // Concentric hairline coordinate rings
    const ringCount = 8;
    for (let i = 1; i <= ringCount; i++) {
      const r = (i / ringCount) * maxR;
      const major = i === ringCount || i === 4;
      ctx.strokeStyle = major
        ? 'rgba(232, 198, 128, 0.72)'
        : 'rgba(164, 196, 232, 0.28)';
      ctx.lineWidth = major ? 1.8 : 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 24 radial coordinate meridians
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const axis = i % 6 === 0;
      ctx.strokeStyle = axis
        ? 'rgba(232, 198, 128, 0.52)'
        : 'rgba(164, 196, 232, 0.18)';
      ctx.lineWidth = axis ? 1.3 : 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (maxR * 0.08), cy + Math.sin(a) * (maxR * 0.08));
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }

    // Fine 1°/5°/15° outer astronomical degree ticks
    for (let deg = 0; deg < 360; deg += 2) {
      const a = (deg * Math.PI) / 180;
      const major = deg % 30 === 0;
      const mid = deg % 10 === 0;
      const len = major ? 18 : mid ? 11 : 6;
      ctx.strokeStyle = major
        ? 'rgba(244, 214, 148, 0.88)'
        : mid
          ? 'rgba(218, 186, 122, 0.52)'
          : 'rgba(170, 198, 228, 0.28)';
      ctx.lineWidth = major ? 1.6 : 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (maxR - len), cy + Math.sin(a) * (maxR - len));
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Clean Optical Point-Spread Function Spark Texture:
 * Sharp airy-disc center and clean radial falloff (zero muddy bloom smear).
 * Returns: THREE.CanvasTexture (SRGBColorSpace)
 */
export function createOpticalSparkTexture(size = 128) {
  return cached(`opticalSpark:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    const c = size * 0.5;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0.0, 'rgba(255, 253, 245, 1.0)');
    g.addColorStop(0.12, 'rgba(255, 242, 206, 0.88)');
    g.addColorStop(0.32, 'rgba(232, 190, 114, 0.22)');
    g.addColorStop(0.62, 'rgba(148, 196, 246, 0.05)');
    g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 2;
    tex.needsUpdate = true;
    return tex;
  });
}

export function createTextureRegistry() {
  return {
    createPlanckCMBTexture,
    createStarPhotosphereTexture,
    createSpiralGalaxyTexture,
    createStarfieldEnvTexture,
    createObservatoryGridTexture,
    createOpticalSparkTexture,
  };
}

export function disposeAllCachedTextures() {
  for (const val of CACHE.values()) {
    if (val && typeof val.dispose === 'function') {
      val.dispose();
    } else if (val && typeof val === 'object') {
      Object.values(val).forEach((t) => t && typeof t.dispose === 'function' && t.dispose());
    }
  }
  CACHE.clear();
}

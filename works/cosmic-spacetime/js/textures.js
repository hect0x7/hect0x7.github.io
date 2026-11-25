// 程序化高精度天文贴图生成（零外部图片依赖，启动 < 30ms）
// 生成写实哈勃/韦伯风螺旋星系、体积星云雾团、艾里斑星点与变形光学眩光
import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSpiralGalaxyTexture(seed = 101, palette = 'blueGold') {
  const size = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const cx = size * 0.5;
  const cy = size * 0.5;
  const rng = mulberry32(seed);

  ctx.clearRect(0, 0, size, size);

  const palettes = {
    blueGold: {
      core: 'rgba(255, 246, 224, 1)',
      mid: 'rgba(255, 206, 134, 0.72)',
      armA: [120, 178, 255],
      armB: [176, 136, 255],
      knot: [255, 168, 206],
    },
    amberTeal: {
      core: 'rgba(255, 250, 234, 1)',
      mid: 'rgba(255, 192, 118, 0.75)',
      armA: [96, 214, 226],
      armB: [248, 178, 108],
      knot: [255, 228, 172],
    },
    roseViolet: {
      core: 'rgba(255, 242, 236, 1)',
      mid: 'rgba(255, 174, 152, 0.68)',
      armA: [152, 162, 255],
      armB: [232, 122, 168],
      knot: [255, 204, 184],
    },
    grandGold: {
      core: 'rgba(255, 252, 240, 1)',
      mid: 'rgba(255, 214, 146, 0.80)',
      armA: [255, 202, 128],
      armB: [132, 186, 255],
      knot: [255, 154, 142],
    },
  };
  const pal = palettes[palette] || palettes.blueGold;

  // 柔和星系晕
  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.48);
  halo.addColorStop(0, pal.core);
  halo.addColorStop(0.12, pal.mid);
  halo.addColorStop(0.40, `rgba(${pal.armA[0]}, ${pal.armA[1]}, ${pal.armA[2]}, 0.14)`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'lighter';

  // 多旋臂体积星云 + 星团结
  const arms = rng() > 0.35 ? 2 : 3;
  const twist = 3.4 + rng() * 1.9;
  const puffs = 560;
  for (let i = 0; i < puffs; i++) {
    const arm = i % arms;
    const t = Math.pow(rng(), 0.78);
    const r = (0.04 + t * 0.42) * size;
    const spread = (rng() - 0.5) * (0.28 + t * 0.62);
    const angle = (arm / arms) * Math.PI * 2 + t * twist + spread;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const rad = (5 + rng() * 19) * (0.65 + (1 - t) * 0.75);
    const mix = rng();
    const col = mix < 0.55 ? pal.armA : mix < 0.88 ? pal.armB : pal.knot;
    const alpha = (0.028 + rng() * 0.045) * (1 - t * 0.72);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha.toFixed(4)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 锐利旋臂恒星点与 H-II 亮结
  const stars = 1100;
  for (let i = 0; i < stars; i++) {
    const arm = i % arms;
    const t = Math.pow(rng(), 0.92);
    const r = (0.02 + t * 0.45) * size;
    const spread = (rng() - 0.5) * (0.16 + t * 0.56);
    const angle = (arm / arms) * Math.PI * 2 + t * twist + spread;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const sr = 0.6 + Math.pow(rng(), 3.2) * 2.4;
    const bright = (0.24 + rng() * 0.72) * (1 - t * 0.55);
    const isWarm = t < 0.25 || rng() > 0.78;
    ctx.fillStyle = isWarm
      ? `rgba(255, 238, 206, ${bright.toFixed(3)})`
      : `rgba(202, 226, 255, ${bright.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 炽白星系核球
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.14);
  core.addColorStop(0, 'rgba(255, 254, 248, 0.98)');
  core.addColorStop(0.32, 'rgba(255, 232, 186, 0.68)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createNebulaCloudTexture(seed = 77) {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const rng = mulberry32(seed);
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 42; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.pow(rng(), 0.75) * size * 0.24;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    const r = size * (0.14 + rng() * 0.22);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${(0.032 + rng() * 0.035).toFixed(4)})`);
    g.addColorStop(0.55, 'rgba(220,235,255,0.012)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStarSpriteTexture() {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const c = size * 0.5;

  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.14, 'rgba(255,250,240,0.88)');
  g.addColorStop(0.38, 'rgba(200,224,255,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // 轻微光学十字衍射芒
  ctx.globalCompositeOperation = 'lighter';
  const drawSpike = (rx, ry) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.scale(rx, ry);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, c);
    sg.addColorStop(0, 'rgba(255,255,255,0.55)');
    sg.addColorStop(0.5, 'rgba(210,230,255,0.12)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, c, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawSpike(1.0, 0.05);
  drawSpike(0.05, 1.0);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAnamorphicFlareTexture() {
  const w = 512, h = 128;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const cx = w * 0.5, cy = h * 0.5;

  // 水平变形镜头光晕条
  const streak = ctx.createLinearGradient(0, cy, w, cy);
  streak.addColorStop(0, 'rgba(0,0,0,0)');
  streak.addColorStop(0.25, 'rgba(130,185,255,0.16)');
  streak.addColorStop(0.45, 'rgba(255,244,228,0.65)');
  streak.addColorStop(0.5, 'rgba(255,255,255,0.98)');
  streak.addColorStop(0.55, 'rgba(255,244,228,0.65)');
  streak.addColorStop(0.75, 'rgba(130,185,255,0.16)');
  streak.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.14);
  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 中央炽白核
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.48);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.25, 'rgba(255,240,210,0.72)');
  core.addColorStop(0.6, 'rgba(130,185,255,0.18)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

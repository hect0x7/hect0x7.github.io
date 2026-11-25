// 赤日奇点 / Crimson Singularity —— 首页 WebGL2 引擎
// 纯 WebGL2 + GLSL + 原生 ES module，无任何第三方依赖。
import * as S from './shaders.js?v=15';
import { LAYER, LAYER_COUNT, slugToLayer, buildStaticLayers, buildTextLayer, buildNoiseData } from './motifs.js?v=12';

const TEX_W = 256;
const TEX_H = 256;
const MAX_N = TEX_W * TEX_H;
const NOISE_SIZE = 256;
const IGNITION_START = 0.22;
const IGNITION_END = 1.22;

// 自适应画质档位：粒子数 + 渲染像素预算（兼顾集成显卡能效与星钻锐度）
const QUALITY = [
  { n: 65536, px: 1.55e6 },
  { n: 49152, px: 1.15e6 },
  { n: 32768, px: 0.85e6 },
  { n: 20480, px: 0.60e6 },
];

// ---------------- 向量 / 矩阵 ----------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function viewMatrix(eye, r, u, f) {
  return new Float32Array([
    r[0], u[0], -f[0], 0,
    r[1], u[1], -f[1], 0,
    r[2], u[2], -f[2], 0,
    -dot(r, eye), -dot(u, eye), dot(f, eye), 1,
  ]);
}
function mul4(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function xform(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15],
  ];
}
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; }
function mul3(a, b) {
  const o = new Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
  return o;
}

// ---------------- 镜头叙事关键帧（u: 0 hero → 1 works → 2.38 about 入口 → 3.0 页脚） ----------------
const CAM_KEYS = [
  { u: 0.0, pos: [0, 1.38, 8.75], look: [0, -0.48, 0] },
  { u: 0.3, pos: [0.16, 0.92, 7.55], look: [0, -0.20, 0] },
  { u: 0.62, pos: [0.42, 0.08, 5.15], look: [0, 0.02, 0] },
  { u: 0.82, pos: [0.22, -0.24, 5.95], look: [0, 0.14, 0] },
  { u: 1.0, pos: [0, -0.04, 7.15], look: [0, 0.18, 0] },
  { u: 2.0, pos: [0, 0.02, 7.35], look: [0, 0.18, 0] },
  { u: 2.38, pos: [0, 0.32, 7.1], look: [0, 1.08, -10] },
  { u: 3.0, pos: [0, 0.26, 7.6], look: [0, 1.18, -10] },
];
const SUN_KEYS = [
  { u: 0.0, pos: [0, 0, 0], r: 1.51 },
  { u: 0.55, pos: [0, 0, 0], r: 1.38 },
  { u: 1.0, pos: [9.8, 5.8, -18.5], r: 1.02 },
  { u: 2.0, pos: [9.0, 5.4, -18.5], r: 1.02 },
  { u: 2.38, pos: [0.28, 1.38, -22], r: 2.65 },
  { u: 3.0, pos: [0, 0.06, -22], r: 2.65 },
];

function hermiteKeys(keys, u, get) {
  if (u <= keys[0].u) return get(keys[0]);
  const last = keys.length - 1;
  if (u >= keys[last].u) return get(keys[last]);
  let i = 0;
  while (i < last - 1 && u > keys[i + 1].u) i++;
  const k1 = keys[i], k2 = keys[i + 1];
  const p1 = get(k1), p2 = get(k2);
  const dt = k2.u - k1.u;
  const t = (u - k1.u) / dt;
  const tan = (j) => {
    if (j <= 0 || j >= last) return p1.map(() => 0);
    const a = get(keys[j - 1]), b = get(keys[j + 1]);
    const du = keys[j + 1].u - keys[j - 1].u;
    return a.map((v, n) => (b[n] - v) / du);
  };
  const m1 = tan(i), m2 = tan(i + 1);
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  return p1.map((v, n) => h00 * v + h10 * dt * m1[n] + h01 * p2[n] + h11 * dt * m2[n]);
}

// ---------------- GL 工具 ----------------
function compile(gl, type, src, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`[home3d] ${label} 编译失败: ${log}`);
  }
  return sh;
}
function program(gl, vs, fs, label) {
  const p = gl.createProgram();
  const a = compile(gl, gl.VERTEX_SHADER, vs, label + '.vs');
  const b = compile(gl, gl.FRAGMENT_SHADER, fs, label + '.fs');
  gl.attachShader(p, a); gl.attachShader(p, b);
  gl.linkProgram(p);
  gl.deleteShader(a); gl.deleteShader(b);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`[home3d] ${label} 链接失败: ${gl.getProgramInfoLog(p)}`);
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}
function tex2D(gl, w, h, internal, format, type, filter, data = null) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
  return t;
}
function fbo(gl, colors, depthRb = null) {
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  colors.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
  if (depthRb) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
  if (colors.length > 1) gl.drawBuffers(colors.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { f, ok };
}

function noop() {}

// =====================================================================
export function createHome3D(canvas, opts = {}) {
  const works = Array.isArray(opts.works) ? opts.works : [];
  const onReady = typeof opts.onReady === 'function' ? opts.onReady : noop;
  const onFail = typeof opts.onFail === 'function' ? opts.onFail : noop;
  const reduced = !!opts.reducedMotion;

  const st = {
    destroyed: false,
    failed: false,
    paused: false,
    hidden: typeof document !== 'undefined' && document.visibilityState === 'hidden',
    raf: 0,
    ready: false,
    last: 0,
    time: reduced ? 24.0 : 0,
    introStart: null,
    introT: reduced ? 99 : 0,
    scrollTarget: 0,
    scroll: 0,
    sections: { hero: [0, 0.25], works: [0.25, 0.75], about: [0.75, 1] },
    heroAim: null,
    pointerT: [0, 0],
    pointer: [0, 0],
    pointerAct: 0,
    pointerLast: -1e9,
    pulses: [],
    theme: opts.theme === 'light' ? 1 : 0,
    heroMode: opts.heroMode === '1a' ? 0 : 1,
    motifA: LAYER.RING,
    motifB: LAYER.RING,
    morph: 1,
    morphPrev: 1,
    flare: 0,
    caKick: 0,
    level: 0,
    frameTimes: [],
    lastLevelChange: 0,
    goodSince: 0,
    width: 0,
    height: 0,
    ping: 0,
    igniteBurstDone: reduced,
    ignite: reduced ? 1 : 0.82,
    restoreTimer: 0,
    nextDue: 0,
    wakeUntil: 0,
    wasActive: true,
  };

  let gl = null;
  let ro = null;
  let staticLayers = null;
  let textLayer = null;
  let noiseData = null;
  let R = null;

  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  st.level = coarse ? 1 : 0;
  const startLevel = st.level;

  const diskRot = mul3(rotZ(-0.235), rotX(0.13));
  const diskAxis = [diskRot[3], diskRot[4], diskRot[5]];

  const api = {
    setScroll, setSections, setHeroAim, setHeroMode, setPointer, pulse, setActiveWork, setTheme, setPaused, resize, destroy,
  };

  function fail(err) {
    if (st.failed || st.destroyed) return;
    st.failed = true;
    stopLoop();
    setTimeout(() => onFail(err), 0);
  }

  try {
    gl = canvas && canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, preserveDrawingBuffer: false,
    });
  } catch (e) { gl = null; }
  if (!gl) {
    fail(new Error('WebGL2 不可用'));
    return api;
  }

  function initGL() {
    const floatExt = gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    const res = { floatRT: !!floatExt, direct: !floatExt || reduced };
    res.vao = gl.createVertexArray();

    res.sim = program(gl, S.FULLSCREEN_VS, S.SIM_FS, 'sim');
    res.part = program(gl, S.PARTICLE_VS, S.PARTICLE_FS, 'particles');
    res.bg = program(gl, S.FULLSCREEN_VS, S.BG_FS, 'background');
    res.sun = program(gl, S.SUN_VS, S.SUN_FS, 'sun');
    res.down = program(gl, S.FULLSCREEN_VS, S.BLOOM_DOWN_FS, 'bloomDown');
    res.up = program(gl, S.FULLSCREEN_VS, S.BLOOM_UP_FS, 'bloomUp');
    res.comp = program(gl, S.FULLSCREEN_VS, S.COMPOSITE_FS, 'composite');

    // 256x256 无缝平铺多通道预烘焙噪声纹理
    res.noise = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, res.noise);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, NOISE_SIZE, NOISE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseData);

    res.motifs = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, res.motifs);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA32F, TEX_W, TEX_H, LAYER_COUNT);
    for (const k of Object.keys(staticLayers)) {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, +k, TEX_W, TEX_H, 1, gl.RGBA, gl.FLOAT, staticLayers[k]);
    }
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, LAYER.TEXT, TEX_W, TEX_H, 1, gl.RGBA, gl.FLOAT, textLayer || staticLayers[LAYER.RING]);

    // 初始粒子置于镜头前方的深空星云壳层，首帧即可见向中心汇聚的星尘轨迹
    if (!res.direct) {
      const init = new Float32Array(MAX_N * 4);
      let seed = 12345;
      const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < MAX_N; i++) {
        const u = rng() * 2 - 1, ph = rng() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 4.2 + rng() * 4.4;
        init[i * 4] = s * Math.cos(ph) * r;
        init[i * 4 + 1] = 0.15 + u * 0.62 * r;
        init[i * 4 + 2] = -0.4 + s * Math.sin(ph) * r;
        init[i * 4 + 3] = 0.18;
      }
      const vel = new Float32Array(MAX_N * 4);
      res.state = [0, 1].map(() => {
        const pos = tex2D(gl, TEX_W, TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, init);
        const v = tex2D(gl, TEX_W, TEX_H, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, vel);
        const fb = fbo(gl, [pos, v]);
        return { pos, vel: v, fb };
      });
      if (!res.state[0].fb.ok || !res.state[1].fb.ok) {
        res.direct = true;
      }
    }
    // 优先采用 R11F_G11F_B10F 砍半 HDR 带宽，若 FBO 不完整再回退 RGBA16F → RGBA8
    res.fmtCandidates = res.floatRT
      ? [
          { internal: gl.R11F_G11F_B10F, format: gl.RGB, type: gl.HALF_FLOAT },
          { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT },
          { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE },
        ]
      : [{ internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE }];
    res.fmtIdx = 0;
    res.size = [0, 0];
    return res;
  }

  function freeTargets() {
    if (!R || !R.scene) return;
    gl.deleteTexture(R.scene.tex); gl.deleteRenderbuffer(R.scene.depth); gl.deleteFramebuffer(R.scene.fb.f);
    for (const m of R.mips) { gl.deleteTexture(m.tex); gl.deleteFramebuffer(m.fb.f); }
    R.scene = null; R.mips = [];
  }

  function allocTargets(w, h) {
    freeTargets();
    const F = R.fmtCandidates[R.fmtIdx];
    const tex = tex2D(gl, w, h, F.internal, F.format, F.type, gl.LINEAR);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    const fb = fbo(gl, [tex], depth);
    if (!fb.ok && R.fmtIdx < R.fmtCandidates.length - 1) {
      gl.deleteTexture(tex); gl.deleteRenderbuffer(depth); gl.deleteFramebuffer(fb.f);
      R.fmtIdx++;
      return allocTargets(w, h);
    }
    R.scene = { tex, depth, fb, w, h };
    R.mips = [];
    let mw = Math.max(1, w >> 1), mh = Math.max(1, h >> 1);
    for (let i = 0; i < 4 && mw >= 4 && mh >= 4; i++) {
      const t = tex2D(gl, mw, mh, F.internal, F.format, F.type, gl.LINEAR);
      const mfb = fbo(gl, [t]);
      if (!mfb.ok && R.fmtIdx < R.fmtCandidates.length - 1) {
        gl.deleteTexture(t); gl.deleteFramebuffer(mfb.f);
        freeTargets();
        R.fmtIdx++;
        return allocTargets(w, h);
      }
      R.mips.push({ tex: t, fb: mfb, w: mw, h: mh });
      mw >>= 1; mh >>= 1;
    }
    R.size = [w, h];
  }

  function freeAll() {
    if (!R) return;
    freeTargets();
    for (const k of ['sim', 'part', 'bg', 'sun', 'down', 'up', 'comp']) if (R[k]) gl.deleteProgram(R[k].p);
    if (R.state) for (const s of R.state) { gl.deleteTexture(s.pos); gl.deleteTexture(s.vel); gl.deleteFramebuffer(s.fb.f); }
    if (R.motifs) gl.deleteTexture(R.motifs);
    if (R.noise) gl.deleteTexture(R.noise);
    if (R.vao) gl.deleteVertexArray(R.vao);
    R = null;
  }

  // ---------------- 尺寸与自适应画质 ----------------
  function computeSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, canvas.clientWidth || window.innerWidth);
    const ch = Math.max(1, canvas.clientHeight || window.innerHeight);
    const full = cw * ch * dpr * dpr;
    const budget = QUALITY[st.level].px;
    const s = Math.min(1, Math.sqrt(budget / full));
    return [Math.max(2, Math.round(cw * dpr * s)), Math.max(2, Math.round(ch * dpr * s))];
  }
  function resize() {
    if (st.destroyed || st.failed || !R) return;
    const [w, h] = computeSize();
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w; canvas.height = h;
    }
    if (R.size[0] !== w || R.size[1] !== h) allocTargets(w, h);
    st.width = w; st.height = h;
    requestRender();
  }

  function setLevel(l) {
    l = clamp(l, 0, QUALITY.length - 1);
    if (l === st.level) return;
    st.level = l;
    st.lastLevelChange = performance.now();
    st.frameTimes.length = 0;
    resize();
  }

  function adaptQuality(dtMs, now, active) {
    // 仅在 60fps 活跃渲染期采样真实帧耗时，避免 30fps 稳态主动节流被误判为掉帧降画质
    if (reduced || !active) return;
    const ft = st.frameTimes;
    ft.push(dtMs);
    if (ft.length > 90) ft.shift();
    if (ft.length < 50 || now - st.lastLevelChange < 2500) return;
    const sorted = ft.slice().sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length * 0.5)];
    if (med > 24.5 && st.level < QUALITY.length - 1) {
      setLevel(st.level + 1);
      st.goodSince = 0;
    } else if (med < 18.0 && st.level > startLevel) {
      if (!st.goodSince) st.goodSince = now;
      if (now - st.goodSince > 6000) { setLevel(st.level - 1); st.goodSince = 0; }
    } else {
      st.goodSince = 0;
    }
  }

  // ---------------- 叙事状态 ----------------
  function scrollToU(p) {
    const s = st.sections;
    const knots = [
      [s.hero[0], 0], [s.hero[1], 0.3],
      [s.works[0], 1.0], [s.works[1], 2.0],
      [s.about[0], 2.38], [s.about[1], 3.0],
    ];
    if (p <= knots[0][0]) return 0;
    for (let i = 0; i < knots.length - 1; i++) {
      const [p0, u0] = knots[i], [p1, u1] = knots[i + 1];
      if (p <= p1) return p1 > p0 ? u0 + (u1 - u0) * (p - p0) / (p1 - p0) : u1;
    }
    return 3;
  }

  function frameState() {
    const u = scrollToU(st.scroll);
    const t = st.time;
    const cw = st.width || 1, ch = st.height || 1;
    const aspect = cw / ch;
    const hf = 20 * Math.PI / 180;
    let fovy = Math.max(45 * Math.PI / 180, 2 * Math.atan(Math.tan(hf) / aspect));
    fovy = Math.min(fovy, 72 * Math.PI / 180);
    fovy += smooth(0.45, 0.65, u) * (1 - smooth(0.7, 0.95, u)) * 0.08;

    const horizon = smooth(1.98, 2.38, u);
    const worksW = smooth(0.62, 1.0, u) * (1 - smooth(1.92, 2.22, u));
    const starW = smooth(1.98, 2.38, u);

    let pos = hermiteKeys(CAM_KEYS, u, (k) => k.pos);
    const look = hermiteKeys(CAM_KEYS, u, (k) => k.look);
    const sun = hermiteKeys(SUN_KEYS, u, (k) => [...k.pos, k.r]);
    // 窄屏竖屏下按视口宽高比收敛远景赤日横向偏移并抬高高度，避开竖屏卡片直达右上净空
    const sunXMax = Math.max(3.2, 25.6 * Math.tan(fovy / 2) * aspect * 0.66);
    const sunYLift = worksW * clamp((0.88 - aspect) / 0.42, 0, 1) * 5.2;
    let sunPos = [Math.min(sun[0], sunXMax), sun[1] + sunYLift, sun[2]];
    const sunR = sun[3];

    // 开场落稳后再渐入镜头漂浮，让日冕从首帧起保持清晰。
    const camBreath = reduced ? 0 : smooth(0.55, 1.75, st.introT);
    if (camBreath > 0) {
      pos = add(pos, [
        Math.sin(t * 0.11) * 0.065 * camBreath,
        Math.sin(t * 0.137 + 1.3) * 0.04 * camBreath,
        Math.sin(t * 0.09 + 2.0) * 0.045 * camBreath,
      ]);
    }
    let f = norm(sub(look, pos));
    let r = norm(cross(f, [0, 1, 0]));
    let up = cross(r, f);

    const pp = st.pointer;
    const parScale = 0.35 + 0.65 * camBreath;
    pos = add(pos, add(scl(r, pp[0] * 0.2 * st.pointerAct * parScale), scl(up, pp[1] * 0.12 * st.pointerAct * parScale)));
    f = norm(sub(look, pos)); r = norm(cross(f, [0, 1, 0])); up = cross(r, f);

    const proj = perspective(fovy, aspect, 0.05, 200);
    const view = viewMatrix(pos, r, up, f);
    const vp = mul4(proj, view);

    const tanY = Math.tan(fovy / 2);
    const lookDist = len(sub(look, pos));

    // 在相机平面上为左侧标题让出空间，穿越期再逐渐回到世界坐标中的赤日轨迹。
    const desktop = smooth(0.8, 1.36, aspect);
    const heroFraming = 1 - smooth(0.18, 0.75, u);
    const [aimX, aimY] = st.heroAim ?? [0.5 + 0.19 * desktop, 0.43];
    const aimScale = tanY * lookDist;
    const heroSun = add(add(look, scl(r, (2 * aimX - 1) * aspect * aimScale)), scl(up, (1 - 2 * aimY) * aimScale));
    sunPos = add(sunPos, scl(sub(heroSun, sunPos), heroFraming));

    // 粒子字形短暂浮在暗面，随后融入日食的轨道。
    const tDist = 6.35;
    const toSun = sub(sunPos, pos);
    const sunDepth = dot(toSun, f);
    const textCenter = add(add(pos, scl(toSun, tDist / sunDepth)), scl(up, -0.16));
    const textScale = Math.min(1.5, tDist * tanY * aspect * 0.63);

    const textFocusW = (!reduced && u < 0.45) ? (1 - smooth(0.50, 1.36, st.introT)) : 0;
    const focusDist = lerp(lerp(lookDist, sunDepth, 0.35 * heroFraming), tDist, textFocusW * 0.55);

    // 作品母题尺度与冠冕高度：高密度凝聚于卡片上方与左右净空舞台
    const wDist = 7.15;
    const hh = wDist * tanY, hw = hh * aspect;
    const motifScale = Math.min(hw / 1.55, hh / 1.62) * 0.96;
    const motifY = aspect < 0.85 ? 1.06 : 0.84;

    const sc = xform(vp, sunPos);
    let sunScr = [0.5, 0.5, 0];
    if (sc[3] > 0.1) {
      sunScr = [sc[0] / sc[3] * 0.5 + 0.5, sc[1] / sc[3] * 0.5 + 0.5, sunR * st.ignite * proj[5] / sc[3] * 0.5];
    }

    const ndcRay = norm(add(f, add(scl(r, pp[0] * tanY * aspect), scl(up, pp[1] * tanY))));
    const gp = add(pos, scl(ndcRay, focusDist / Math.max(0.2, dot(ndcRay, f))));

    return {
      u, pos, look, f, r, up, fovy, aspect, proj, view, vp, tanY, focusDist,
      sunPos, sunR, horizon, worksW, starW, textCenter, textRight: r, textUp: up, textScale,
      motifScale, motifY, sunScr, gp,
      ambientScale: Math.max(0.55, Math.min(1.25, aspect / 1.6)),
      aperture: lerp(0.013, 0.0085, smooth(0.6, 1.0, u)) * (1 - 0.6 * horizon) * (1 - 0.45 * textFocusW),
    };
  }

  function rayToWorld(nx, ny) {
    const F = frameState();
    const ray = norm(add(F.f, add(scl(F.r, nx * F.tanY * F.aspect), scl(F.up, ny * F.tanY))));
    return add(F.pos, scl(ray, F.focusDist / Math.max(0.2, dot(ray, F.f))));
  }

  // ---------------- 每帧更新 ----------------
  function update(dt, now) {
    if (!reduced) {
      st.time += dt;
      st.scroll += (st.scrollTarget - st.scroll) * (1 - Math.exp(-dt * 5.8));
      if (Math.abs(st.scrollTarget - st.scroll) < 1e-5) st.scroll = st.scrollTarget;
      const k = 1 - Math.exp(-dt * 6.5);
      st.pointer[0] += (st.pointerT[0] - st.pointer[0]) * k;
      st.pointer[1] += (st.pointerT[1] - st.pointer[1]) * k;
      const idle = (now - st.pointerLast) / 1000;
      const targetAct = idle < 1.8 ? 1 : 0;
      st.pointerAct += (targetAct - st.pointerAct) * (1 - Math.exp(-dt * (targetAct ? 8.0 : 2.6)));
      st.morphPrev = st.morph;
      if (st.morph < 1) st.morph = Math.min(1, st.morph + dt / 0.72);
      if (st.morph >= 1) st.motifA = st.motifB;
      st.flare *= Math.exp(-dt * 2.2);
      st.caKick *= Math.exp(-dt * 3.0);
      st.introT = (now - st.introStart) / 1000;
      if (!st.igniteBurstDone && st.introT > 0.68) {
        st.igniteBurstDone = true;
        st.flare = 0.48;
      }
    } else {
      st.scroll = st.scrollTarget;
      st.morph = 1; st.motifA = st.motifB;
      st.pointer = [0, 0]; st.pointerAct = 0;
    }
    // 用户一旦开始滚出 Hero，赤日立即完全显现，不阻塞后续叙事
    const scrollIgnite = smooth(0.05, 0.25, scrollToU(st.scroll));
    st.ignite = reduced ? 1 : lerp(0.82, 1, Math.max(smooth(IGNITION_START, IGNITION_END, st.introT), scrollIgnite));
    // 清理已消散的过期冲击波脉冲（生命周期 2.2s）
    for (let i = st.pulses.length - 1; i >= 0; i--) {
      if (st.time - st.pulses[i].t >= 2.2) st.pulses.splice(i, 1);
    }
    if (st.pulses.length > 4) st.pulses.splice(0, st.pulses.length - 4);
  }

  function setTargetUniforms(P, F) {
    const u = P.u;
    gl.uniform1f(u.uIntroT, st.introT);
    gl.uniform3fv(u.uSunPos, F.sunPos);
    gl.uniform1f(u.uSunR, F.sunR);
    if (u.uHeroMode != null) gl.uniform1f(u.uHeroMode, st.heroMode);
    gl.uniformMatrix3fv(u.uDiskRot, false, diskRot);
    gl.uniform1f(u.uWorksW, F.worksW);
    gl.uniform1f(u.uStarW, F.starW);
    gl.uniform1f(u.uMorph, st.morph);
    if (u.uMorph0 != null) gl.uniform1f(u.uMorph0, st.morphPrev);
    gl.uniform1i(u.uMotifA, st.motifA);
    gl.uniform1i(u.uMotifB, st.motifB);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.motifs);
    gl.uniform1i(u.uMotifs, 2);
    gl.uniform3fv(u.uMotifCenter, [0, F.motifY, 0]);
    gl.uniform1f(u.uMotifScale, F.motifScale);
    gl.uniform3fv(u.uTextCenter, F.textCenter);
    gl.uniform3fv(u.uTextRight, F.textRight);
    gl.uniform3fv(u.uTextUp, F.textUp);
    gl.uniform1f(u.uTextScale, F.textScale);
    gl.uniform1f(u.uAmbientScale, F.ambientScale);
  }

  function drawFullscreen() { gl.drawArrays(gl.TRIANGLES, 0, 3); }

  function render(dt) {
    if (!R || !R.scene) return;
    const F = frameState();
    const n = QUALITY[st.level].n;
    const rows = Math.ceil(n / TEX_W);
    gl.bindVertexArray(R.vao);
    gl.disable(gl.CULL_FACE);
    // 预烘焙噪声纹理常驻绑定于 TEXTURE3，供 SIM / BG / SUN 共享采样
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, R.noise);

    const grav = st.pointerAct > 0.01 && !reduced
      ? [...F.gp, 1.85 * st.pointerAct] : [0, 0, 0, 0];

    // 1) GPU 粒子流体/引力模拟
    if (!R.direct) {
      const src = R.state[st.ping], dst = R.state[1 - st.ping];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb.f);
      gl.viewport(0, 0, TEX_W, rows);
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
      const P = R.sim; gl.useProgram(P.p);
      setTargetUniforms(P, F);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.pos); gl.uniform1i(P.u.uPosTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src.vel); gl.uniform1i(P.u.uVelTex, 1);
      gl.uniform1i(P.u.uNoise, 3);
      gl.uniform1f(P.u.uTime, st.time);
      gl.uniform1f(P.u.uDt, Math.max(dt, 1 / 240));
      gl.uniform1i(P.u.uTexW, TEX_W);
      const needVelDiff = (st.morph < 1 || st.introT < 2.25 || Math.abs(st.scrollTarget - st.scroll) > 1.5e-3) ? 1 : 0;
      gl.uniform1i(P.u.uNeedVelDiff, needVelDiff);
      gl.uniform4fv(P.u.uGrav, grav);
      gl.uniform3fv(P.u.uCamFwd, F.f);
      const pu = new Float32Array(16);
      for (let i = 0; i < 4; i++) {
        const q = st.pulses[i];
        if (q) { pu[i * 4] = q.p[0]; pu[i * 4 + 1] = q.p[1]; pu[i * 4 + 2] = q.p[2]; pu[i * 4 + 3] = q.t; }
        else pu[i * 4 + 3] = -100;
      }
      gl.uniform4fv(P.u.uPulse, pu);
      const tearing = smooth(0.55, 1.0, st.introT) * (1 - smooth(1.35, 2.25, st.introT));
      gl.uniform1f(P.u.uSwirl, 0.36 + tearing * 3.3);
      gl.uniform3fv(P.u.uDiskAxis, diskAxis);
      gl.uniform1f(P.u.uK, 4.4);
      gl.uniform1f(P.u.uDamp, 3.6);
      gl.uniform1f(P.u.uTurb, 0.50);
      drawFullscreen();
      st.ping = 1 - st.ping;
    }

    const S0 = R.scene;
    const light = st.theme;

    // 2) 场景绘制：深空/和纸背景 → 赤日/朱砂印 → 粒子
    gl.bindFramebuffer(gl.FRAMEBUFFER, S0.fb.f);
    gl.viewport(0, 0, S0.w, S0.h);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);

    const sunVis = st.ignite;
    {
      const P = R.bg; gl.useProgram(P.p);
      gl.uniform1i(P.u.uNoise, 3);
      gl.uniform3fv(P.u.uCamPos, F.pos); gl.uniform3fv(P.u.uCamR, F.r); gl.uniform3fv(P.u.uCamU, F.up); gl.uniform3fv(P.u.uCamF, F.f);
      gl.uniform2f(P.u.uTanHalf, F.tanY * F.aspect, F.tanY);
      gl.uniform1f(P.u.uTheme, light); gl.uniform1f(P.u.uTime, st.time); gl.uniform1f(P.u.uHorizon, F.horizon);
      gl.uniform3fv(P.u.uSunPos, F.sunPos); gl.uniform1f(P.u.uSunR, F.sunR); gl.uniform1f(P.u.uSunVis, sunVis);
      gl.uniform1f(P.u.uHeroMode, st.heroMode);
      gl.uniform2f(P.u.uRes, S0.w, S0.h);
      drawFullscreen();
    }

    // 赤日（写入球体深度供后盘遮挡）
    // 日冕位于远平面，允许等于已清空的深度；只有日食暗面会写入更近的深度。
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (st.heroMode === 0) {
      const P = R.sun; gl.useProgram(P.p);
      const rw = F.sunR * st.ignite;
      const extent = 2.05;
      gl.uniform1i(P.u.uNoise, 3);
      gl.uniform3fv(P.u.uSunPos, F.sunPos); gl.uniform3fv(P.u.uCamR, F.r); gl.uniform3fv(P.u.uCamU, F.up); gl.uniform3fv(P.u.uCamF, F.f);
      gl.uniform3fv(P.u.uCamPos, F.pos);
      gl.uniform1f(P.u.uSunRw, rw); gl.uniform1f(P.u.uExtent, extent);
      gl.uniformMatrix4fv(P.u.uVP, false, F.vp);
      gl.uniform1f(P.u.uTime, st.time); gl.uniform1f(P.u.uTheme, light);
      gl.uniform1f(P.u.uFlare, st.flare);
      gl.uniform1f(P.u.uHorizon, F.horizon);
      gl.uniform2f(P.u.uCorona, st.pointer[0] * 0.11 * st.pointerAct, st.pointer[1] * 0.11 * st.pointerAct);
      if (rw > 0.001) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // 粒子（统一 ONE, ONE_MINUS_SRC_ALPHA：暗色 alpha=0 纯加法发光，亮色预乘水墨叠印）
    gl.depthFunc(gl.LESS); gl.depthMask(false);
    {
      const P = R.part; gl.useProgram(P.p);
      setTargetUniforms(P, F);
      if (!R.direct) {
        const cur = R.state[st.ping];
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cur.pos); gl.uniform1i(P.u.uPosTex, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cur.vel); gl.uniform1i(P.u.uVelTex, 1);
      } else {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null); gl.uniform1i(P.u.uPosTex, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null); gl.uniform1i(P.u.uVelTex, 1);
      }
      gl.uniform1i(P.u.uDirect, R.direct ? 1 : 0);
      gl.uniform1i(P.u.uTexW, TEX_W);
      gl.uniformMatrix4fv(P.u.uVP, false, F.vp);
      gl.uniform1f(P.u.uViewH, S0.h);
      gl.uniform1f(P.u.uProjY, F.proj[5]);
      gl.uniform1f(P.u.uAspect, F.aspect);
      gl.uniform3fv(P.u.uSunScr, F.sunScr);
      gl.uniform1f(P.u.uSize, 0.0138);
      gl.uniform1f(P.u.uFocus, F.focusDist);
      gl.uniform1f(P.u.uAperture, F.aperture);
      const countGain = Math.pow(MAX_N / n, 0.78);
      const particleGain = 0.29 + 0.27 * F.worksW + 0.23 * F.starW;
      gl.uniform1f(P.u.uIntensity, particleGain * countGain * (R.direct ? 1.15 : 1.0));
      gl.uniform1f(P.u.uTheme, light);
      gl.uniform1f(P.u.uHorizon, F.horizon);
      gl.uniform1f(P.u.uTime, st.time);
      gl.uniform3fv(P.u.uCamPos, F.pos);
      gl.uniform4fv(P.u.uGrav, grav);
      gl.drawArrays(gl.POINTS, 0, n);
    }
    gl.disable(gl.DEPTH_TEST);

    // 3) 4 级 Dual-Kawase / 13-tap 电影感 Bloom（纯亮色稳态跳过全部 Bloom pass）
    const useBloom = light < 0.98 && light <= 0.999 && R.mips.length > 0;
    gl.disable(gl.BLEND);
    if (useBloom) {
      let src = S0.tex, sw = S0.w, sh = S0.h;
      const P = R.down; gl.useProgram(P.p);
      gl.uniform1f(P.u.uThreshold, 0.82); gl.uniform1f(P.u.uKnee, 0.44);
      for (let i = 0; i < R.mips.length; i++) {
        const m = R.mips[i];
        gl.bindFramebuffer(gl.FRAMEBUFFER, m.fb.f);
        gl.viewport(0, 0, m.w, m.h);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(P.u.uSrc, 0);
        gl.uniform2f(P.u.uTexel, 1 / sw, 1 / sh);
        gl.uniform1f(P.u.uPrefilter, i === 0 ? 1 : 0);
        drawFullscreen();
        src = m.tex; sw = m.w; sh = m.h;
      }
      const U = R.up; gl.useProgram(U.p);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = R.mips.length - 1; i > 0; i--) {
        const from = R.mips[i], to = R.mips[i - 1];
        gl.bindFramebuffer(gl.FRAMEBUFFER, to.fb.f);
        gl.viewport(0, 0, to.w, to.h);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, from.tex); gl.uniform1i(U.u.uSrc, 0);
        gl.uniform2f(U.u.uTexel, 1 / from.w, 1 / from.h);
        gl.uniform1f(U.u.uRadius, 1.22);
        drawFullscreen();
      }
      gl.disable(gl.BLEND);
    }

    // 4) 后处理合成：引力透镜折射、镜头色差、Filmic 色调映射、胶片颗粒与暗角
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    {
      const P = R.comp; gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S0.tex); gl.uniform1i(P.u.uScene, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, useBloom ? R.mips[0].tex : S0.tex); gl.uniform1i(P.u.uBloom, 1);
      gl.uniform2f(P.u.uRes, canvas.width, canvas.height);
      gl.uniform3fv(P.u.uSunScr, F.sunScr);
      gl.uniform1f(P.u.uLens, 0.15 * (1 - 0.75 * light) * (1 - F.horizon));
      gl.uniform1f(P.u.uCA, (0.003 + st.caKick * 0.012) * (1 - 0.65 * light));
      gl.uniform1f(P.u.uBloomI, 0.58);
      gl.uniform1f(P.u.uGrain, reduced ? 0.025 : 0.034);
      gl.uniform1f(P.u.uVig, 0.82);
      gl.uniform1f(P.u.uTheme, light);
      gl.uniform1f(P.u.uTime, reduced ? 0.37 : st.time);
      gl.uniform1f(P.u.uExposure, 1.0);
      gl.uniform1f(P.u.uUseBloom, useBloom ? 1 : 0);
      drawFullscreen();
    }
    gl.bindVertexArray(null);

    if (!st.ready) {
      st.ready = true;
      setTimeout(() => { if (!st.destroyed && !st.failed) onReady(); }, 0);
    }
  }

  // ---------------- 循环控制与动态帧率节流（活跃 60fps / 静止 30fps） ----------------
  function running() { return !st.destroyed && !st.failed && !st.paused && !st.hidden && !!gl && !gl.isContextLost(); }

  function isActiveMode(now) {
    return (
      st.introT < 2.25 ||
      Math.abs(st.scrollTarget - st.scroll) > 4e-4 ||
      st.morph < 1 ||
      (now - st.pointerLast) < 2000 ||
      st.pulses.length > 0 ||
      now < st.wakeUntil
    );
  }

  function wake60(ms = 1200) {
    if (reduced) return;
    const now = performance.now();
    st.wakeUntil = Math.max(st.wakeUntil, now + ms);
    if (st.nextDue > now + 1000 / 60) st.nextDue = now;
  }

  function frame(now) {
    st.raf = 0;
    if (!running()) return;
    const active = isActiveMode(now);
    const interval = active ? (1000 / 60) : (1000 / 30);
    if (!reduced && st.last && now < st.nextDue - 1.2) {
      st.raf = requestAnimationFrame(frame);
      return;
    }
    const dtMs = st.last ? (now - st.last) : interval;
    const sampleOk = active && st.wasActive && st.last > 0;
    st.last = now;
    if (st.introStart === null) st.introStart = now;
    st.wasActive = active;
    if (!st.nextDue || now - st.nextDue > interval) st.nextDue = now + interval;
    else st.nextDue += interval;

    const dt = Math.min(dtMs / 1000, 1 / 20);
    try {
      update(dt, now);
      render(dt);
    } catch (e) {
      fail(e);
      return;
    }
    if (sampleOk) adaptQuality(dtMs, now, active);
    if (!reduced) st.raf = requestAnimationFrame(frame);
  }
  function startLoop() {
    if (st.raf || !running()) return;
    st.last = 0;
    st.nextDue = 0;
    st.raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
  }
  function requestRender() {
    if (reduced) startLoop();
  }

  // ---------------- 事件与上下文恢复 ----------------
  function onVis() {
    st.hidden = document.visibilityState === 'hidden';
    if (st.hidden) stopLoop();
    else { st.frameTimes.length = 0; startLoop(); if (reduced) requestRender(); }
  }
  function onLost(e) {
    e.preventDefault();
    stopLoop();
    st.restoreTimer = setTimeout(() => {
      if (gl.isContextLost()) fail(new Error('WebGL 上下文丢失且未恢复'));
    }, 4000);
  }
  function onRestored() {
    clearTimeout(st.restoreTimer);
    try {
      R = initGL();
      allocTargets(...computeSize());
      st.ping = 0;
      st.introT = 99; st.introStart = -1e9; st.igniteBurstDone = true; st.ignite = 1;
      resize();
      startLoop();
    } catch (e) {
      fail(e);
    }
  }
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  document.addEventListener('visibilitychange', onVis);
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }

  // ---------------- 对外接口 ----------------
  function setScroll(p) {
    st.scrollTarget = clamp(+p || 0, 0, 1);
    wake60(1200);
    requestRender();
  }
  function setSections(map) {
    if (!map) return;
    const s = st.sections;
    for (const k of ['hero', 'works', 'about']) {
      const v = map[k];
      if (Array.isArray(v) && v.length === 2 && isFinite(v[0]) && isFinite(v[1])) s[k] = [+v[0], +v[1]];
    }
    requestRender();
  }
  function setHeroAim(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    st.heroAim = [clamp(x, 0, 1), clamp(y, 0, 1)];
    requestRender();
  }
  function setPointer(nx, ny) {
    st.pointerT = [clamp(+nx || 0, -1, 1), clamp(+ny || 0, -1, 1)];
    st.pointerLast = performance.now();
    wake60(2000);
  }
  function pulse(nx, ny) {
    if (reduced || !R) return;
    st.pulses.push({ p: rayToWorld(clamp(+nx || 0, -1, 1), clamp(+ny || 0, -1, 1)), t: st.time });
    st.flare = Math.max(st.flare, 0.55);
    st.caKick = Math.max(st.caKick, 0.72);
    wake60(2000);
  }
  function setActiveWork(index) {
    const i = Number.isInteger(index) ? index : -1;
    const layer = i >= 0 && i < works.length ? slugToLayer(works[i] && works[i].slug) : LAYER.RING;
    wake60(1200);
    if (reduced) { st.motifA = st.motifB = layer; st.morph = 1; st.morphPrev = 1; requestRender(); return; }
    if (layer === st.motifB) return;
    if (st.morph < 1) {
      if (st.morph > 0.5) st.motifA = st.motifB;
    } else {
      st.motifA = st.motifB;
    }
    st.motifB = layer;
    st.morph = 0;
    st.morphPrev = 0;
  }
  function setHeroMode(mode) {
    st.heroMode = mode === '1b' ? 1 : 0;
    wake60(1400);
    requestRender();
  }
  function setTheme(theme) {
    st.theme = theme === 'light' ? 1 : 0;
    wake60(1000);
    requestRender();
  }
  function setPaused(b) {
    st.paused = !!b;
    if (st.paused) stopLoop(); else startLoop();
  }
  function destroy() {
    if (st.destroyed) return;
    st.destroyed = true;
    stopLoop();
    clearTimeout(st.restoreTimer);
    if (canvas) {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    if (ro) ro.disconnect();
    else if (typeof window !== 'undefined') window.removeEventListener('resize', resize);
    try { if (gl && !gl.isContextLost()) freeAll(); } catch (e) { /* 销毁阶段 GL 已不可用时无需处理 */ }
  }

  // ---------------- 启动 ----------------
  try {
    noiseData = buildNoiseData(NOISE_SIZE);
    staticLayers = buildStaticLayers(MAX_N);
    // 先立即生成一份初始文字点云，保证首帧零等待开始汇聚
    textLayer = buildTextLayer(MAX_N);
    R = initGL();
    resize();
  } catch (e) {
    fail(e);
    return api;
  }

  // 若 Space Grotesk 字体随后加载就绪且仍处于文字展示前期，无缝刷新为精确字形
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('700 248px "Space Grotesk"'),
      new Promise((r) => setTimeout(r, 700)),
    ]).then(() => {
      if (st.destroyed || st.failed || st.introT > 0.45) return;
      textLayer = buildTextLayer(MAX_N);
      if (R && !gl.isContextLost()) {
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.motifs);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, LAYER.TEXT, TEX_W, TEX_H, 1, gl.RGBA, gl.FLOAT, textLayer);
      }
      requestRender();
    }).catch(() => {});
  }

  startLoop();
  return api;
}

export default createHome3D;

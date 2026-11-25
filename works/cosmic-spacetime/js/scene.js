// 《时空织物 · 从大爆炸到光锥》v6 —— 连续纵向滚动 3D 纵深飞行叙事引擎
// 原生页面滚动驱动连续进度 scrollF ∈ [0, 3]：星场沿 Z 轴迎面掠过、4 座宇宙雕塑从深空浮现并平滑过渡
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  createSpiralGalaxyTexture,
  createNebulaCloudTexture,
  createStarSpriteTexture,
  createAnamorphicFlareTexture,
} from './textures.js?v=4';
import { createBigBangChapter } from './chapters/bigBang.js?v=7';
import { createRelativityChapter } from './chapters/relativity.js?v=6';
import { createLensingChapter } from './chapters/lensing.js?v=8';
import { createLightConeChapter } from './chapters/lightCone.js?v=6';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); };

const CINEMATIC_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uTheme: { value: 0 },
    uCA: { value: 0.0014 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uTheme;
    uniform float uCA;
    varying vec2 vUv;

    float hash12(vec2 p){
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 cc = vUv - 0.5;
      float r2 = dot(cc, cc);
      vec2 off = cc * r2 * uCA * (1.0 - uTheme * 0.85);
      vec3 col;
      col.r = texture2D(tDiffuse, clamp(vUv + off, vec2(0.001), vec2(0.999))).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, clamp(vUv - off, vec2(0.001), vec2(0.999))).b;

      float vig = 1.0 - smoothstep(0.36, 1.14, length(cc * vec2(1.18, 1.04)));
      col *= mix(mix(1.0, vig, 0.36), mix(1.0, vig, 0.08), uTheme);

      float g = (hash12(vUv * 1200.0 + fract(uTime * 3.7) * 91.0) - 0.5) * 0.014;
      col += g;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// 四座宇宙雕塑的停驻机位（滚动时在相邻机位之间连续平滑插值，无硬切）
const CAM_STATIONS = [
  // 0: 大爆炸 WMAP 膨胀钟（宽银幕居中）
  {
    desktop: { pos: [0.0, 0.28, 8.6], look: [0.0, 0.0, 0.0], offX: 0.0, offY: -0.02 },
    portrait: { pos: [0.0, 0.12, 9.8], look: [0.0, 0.0, 0.0], offX: 0.0, offY: 0.13 },
    pitchRange: [-0.82, 0.82],
    bloom: 0.46,
  },
  // 1: 广义相对论 Flamm 抛物面（上方悬置，底部留给叙事字幕）
  {
    desktop: { pos: [0.0, 4.3, 8.9], look: [0.0, -0.15, 0.0], offX: 0.0, offY: 0.12 },
    portrait: { pos: [0.0, 3.8, 10.6], look: [0.0, -0.1, 0.0], offX: 0.0, offY: 0.18 },
    pitchRange: [-0.55, 0.78],
    bloom: 0.45,
  },
  // 2: 引力透镜（中央深空圆景，左右开放留白）
  {
    desktop: { pos: [0.0, 0.0, 8.6], look: [0.0, 0.0, 0.0], offX: 0.0, offY: 0.0 },
    portrait: { pos: [0.0, 0.0, 9.6], look: [0.0, 0.0, 0.0], offX: 0.0, offY: 0.16 },
    pitchRange: [-0.2, 0.2],
    bloom: 0.34,
  },
  // 3: 闵可夫斯基时空光锥（光锥居左，右侧终章留白）
  {
    desktop: { pos: [0.0, 0.78, 8.9], look: [0.0, 0.0, 0.0], offX: 0.17, offY: 0.0 },
    portrait: { pos: [0.0, 0.68, 10.4], look: [0.0, 0.0, 0.0], offX: 0.0, offY: 0.18 },
    pitchRange: [-0.82, 0.82],
    bloom: 0.42,
  },
];

export function createCosmicStage(canvas, opts = {}) {
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  const onReady = typeof opts.onReady === 'function' ? opts.onReady : () => {};
  const onFail = typeof opts.onFail === 'function' ? opts.onFail : () => {};
  const reduced = !!opts.reducedMotion;

  let renderer = null;
  let pmrem = null;
  let envRT = null;
  let composer = null;
  let renderPass = null;
  let bloomPass = null;
  let cinematicPass = null;
  let outputPass = null;
  let scene = null;
  let camera = null;
  let textures = null;
  let starTunnel = null;
  let starTunnelMat = null;
  let chBigBang = null;
  let chRelativity = null;
  let chLensing = null;
  let chLightCone = null;
  let chapters = [];
  let canHalfFloat = false;
  let cleanedUp = false;
  let rafId = 0;
  let destroyed = false;
  let paused = false;
  let contextLost = false;

  const darkBg = new THREE.Color('#05060b');
  const lightBg = new THREE.Color('#f5f1e7');
  const lookTarget = new THREE.Vector3();

  let viewW = Math.max(1, window.innerWidth);
  let viewH = Math.max(1, window.innerHeight);

  function disposeGroupResources(rootGroup) {
    if (!rootGroup) return;
    const geos = new Set();
    const mats = new Set();
    rootGroup.traverse((obj) => {
      if (obj.geometry) geos.add(obj.geometry);
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => mats.add(m));
        else mats.add(obj.material);
      }
    });
    geos.forEach((g) => { try { g.dispose(); } catch (e) {} });
    mats.forEach((m) => { try { m.dispose(); } catch (e) {} });
  }

  const onCtxLost = (e) => { e.preventDefault(); contextLost = true; };
  const onCtxRestored = () => { contextLost = false; resizeToWindow(); };
  const onVisChange = () => {
    paused = document.hidden;
    if (!paused) lastNow = performance.now();
  };

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    try { cancelAnimationFrame(rafId); } catch (e) {}
    window.removeEventListener('resize', resizeToWindow);
    document.removeEventListener('visibilitychange', onVisChange);
    canvas.removeEventListener('webglcontextlost', onCtxLost);
    canvas.removeEventListener('webglcontextrestored', onCtxRestored);
    if (chLensing && chLensing.dispose) { try { chLensing.dispose(); } catch (e) {} }
    [chBigBang, chRelativity, chLightCone].forEach((ch) => {
      if (ch && ch.group) disposeGroupResources(ch.group);
    });
    [renderPass, bloomPass, cinematicPass, outputPass].forEach((p) => {
      if (p && p.dispose) { try { p.dispose(); } catch (e) {} }
    });
    if (composer) { try { composer.dispose(); } catch (e) {} }
    if (envRT) { try { envRT.dispose(); } catch (e) {} }
    if (pmrem) { try { pmrem.dispose(); } catch (e) {} }
    if (starTunnel) { try { starTunnel.geometry.dispose(); starTunnelMat.dispose(); } catch (e) {} }
    if (textures) {
      textures.galaxies.forEach((tx) => { try { tx.dispose(); } catch (e) {} });
      try { textures.nebula.dispose(); textures.star.dispose(); textures.flare.dispose(); } catch (e) {}
    }
    if (renderer) { try { renderer.dispose(); } catch (e) {} }
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    onProgress(0.2);

    const dpr = Math.min(window.devicePixelRatio || 1, viewW < 720 ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(viewW, viewH, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    scene.background = darkBg.clone();

    const gl = renderer.getContext();
    canHalfFloat = renderer.capabilities.isWebGL2
      ? !!gl.getExtension('EXT_color_buffer_float')
      : !!gl.getExtension('EXT_color_buffer_half_float');

    if (canHalfFloat) {
      pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      envRT = pmrem.fromScene(roomEnv, 0.04);
      roomEnv.dispose();
      scene.environment = envRT.texture;
    }

    camera = new THREE.PerspectiveCamera(42, viewW / Math.max(viewH, 1), 0.1, 180);

    const keyLight = new THREE.DirectionalLight('#fff2dc', 2.2);
    keyLight.position.set(5, 7, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#6898e8', 1.05);
    fillLight.position.set(-6, -3, 4);
    scene.add(fillLight);

    onProgress(0.45);

    textures = {
      galaxies: [
        createSpiralGalaxyTexture(101, 'blueGold'),
        createSpiralGalaxyTexture(203, 'amberTeal'),
        createSpiralGalaxyTexture(307, 'roseViolet'),
        createSpiralGalaxyTexture(419, 'grandGold'),
      ],
      nebula: createNebulaCloudTexture(77),
      star: createStarSpriteTexture(),
      flare: createAnamorphicFlareTexture(),
    };

    onProgress(0.68);

    // 纵深穿行星场隧道（GPU Shader 循环沿 Z 轴迎面飞掠 + 轻微向下视差，滚动纵深感立现！）
    const starN = 2800;
    const sPos = new Float32Array(starN * 3);
    const sCol = new Float32Array(starN * 3);
    const sSize = new Float32Array(starN);
    let sd = 9187;
    const rng = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    const tmpC = new THREE.Color();
    for (let i = 0; i < starN; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = 4.2 + Math.pow(rng(), 0.72) * 32.0;
      sPos[i * 3] = Math.cos(ang) * rad;
      sPos[i * 3 + 1] = Math.sin(ang) * rad * 0.75;
      sPos[i * 3 + 2] = -68 + rng() * 80; // 深度范围 80 单位无缝循环
      tmpC.setHSL(rng() > 0.25 ? 0.58 + rng() * 0.10 : 0.08 + rng() * 0.06, 0.56, 0.74 + rng() * 0.22);
      sCol[i * 3] = tmpC.r; sCol[i * 3 + 1] = tmpC.g; sCol[i * 3 + 2] = tmpC.b;
      sSize[i] = 0.8 + Math.pow(rng(), 2.4) * 2.4;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));

    starTunnelMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: textures.star },
        uScroll: { value: 0 },
        uVel: { value: 0 },
        uTime: { value: 0 },
        uOpacity: { value: 0.72 },
        uPixelRatio: { value: dpr },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        uniform float uScroll;
        uniform float uVel;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          // 向下滚动时星尘迎面飞过（Z 轴推进 + 温和 Y 视差），形成真实的深空下潜纵深！
          float zRange = 80.0;
          float zShift = p.z + uScroll * 28.0 + uTime * 0.35;
          p.z = mod(zShift + 68.0, zRange) - 68.0;
          float yShift = p.y + uScroll * 5.2;
          p.y = mod(yShift + 26.0, 52.0) - 26.0;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float depthFade = smoothstep(-66.0, -34.0, p.z) * (1.0 - smoothstep(4.0, 11.0, p.z));
          vColor = aColor;
          vAlpha = depthFade * (0.72 + min(abs(uVel) * 0.55, 0.45));
          gl_PointSize = clamp(aSize * (135.0 / max(-mv.z, 1.5)) * uPixelRatio * (1.0 + min(abs(uVel) * 0.25, 0.4)), 1.0, 18.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float a = tex.a * vAlpha * uOpacity;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor * tex.rgb, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    starTunnel = new THREE.Points(sGeo, starTunnelMat);
    starTunnel.frustumCulled = false;
    scene.add(starTunnel);

    chBigBang = createBigBangChapter(textures);
    chRelativity = createRelativityChapter(textures);
    chLensing = createLensingChapter(textures);
    chLightCone = createLightConeChapter(textures);
    chapters = [chBigBang, chRelativity, chLensing, chLightCone];
    chapters.forEach((ch) => scene.add(ch.group));

    const rtType = canHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const composerRT = new THREE.WebGLRenderTarget(viewW, viewH, {
      type: rtType,
      samples: renderer.capabilities.isWebGL2 ? 4 : 0,
    });
    composer = new EffectComposer(renderer, composerRT);
    composer.setPixelRatio(dpr);
    composer.setSize(viewW, viewH);

    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    if (canHalfFloat) {
      bloomPass = new UnrealBloomPass(new THREE.Vector2(viewW, viewH), 0.46, 0.42, 0.74);
      composer.addPass(bloomPass);
    }
    cinematicPass = new ShaderPass(CINEMATIC_SHADER);
    outputPass = new OutputPass();
    composer.addPass(cinematicPass);
    composer.addPass(outputPass);

    onProgress(1.0);
  } catch (err) {
    console.warn('[cosmic-spacetime] Three.js init failed:', err);
    cleanup();
    onFail(err);
    return null;
  }

  let targetScrollF = 0; // 连续滚动坐标 0.0 .. 3.0
  let scrollF = 0;
  let scrollVel = 0;
  let activeChapter = 0;
  let ch1AutoFired = false;
  let theme = opts.theme === 'light' ? 'light' : 'dark';
  let themeBlend = theme === 'light' ? 1 : 0;
  let pointer = [0, 0];
  let pointerAct = 0;
  let isDragging = false;
  let clockT = 0;
  let lastNow = performance.now();

  const orbits = [
    { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0 },
    { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0 },
    { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0 },
    { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0 },
  ];

  const telemetry = {
    chapter: 0,
    scrollF: 0,
    bigBang: { epoch: 1, age: '13.8 Gyr', scaleFactor: 1.0, deltaT: 0, replaying: false },
    relativity: { shiftDeg: 0, ecc: 0.42, relStrength: 0.55, perihelia: 0 },
    lensing: { einsteinArcsec: 2.37, alignment: 100, massMul: 1.0, showParity: false },
    lightCone: { beta: 0, gamma: 1, tA: 0, tB: 0, deltaT: 0, relation: 'spacelike', order: 'simultaneous', preset: 'spacelike' },
  };

  function resizeToWindow() {
    if (!renderer || !camera || !composer || destroyed) return;
    viewW = Math.max(1, window.innerWidth);
    viewH = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, viewW < 720 ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(viewW, viewH, false);
    composer.setPixelRatio(dpr);
    composer.setSize(viewW, viewH);
    if (bloomPass) bloomPass.setSize(viewW, viewH);
    if (starTunnelMat) starTunnelMat.uniforms.uPixelRatio.value = dpr;
  }

  window.addEventListener('resize', resizeToWindow);
  canvas.addEventListener('webglcontextlost', onCtxLost);
  canvas.addEventListener('webglcontextrestored', onCtxRestored);
  document.addEventListener('visibilitychange', onVisChange);

  function updateCameraContinuous() {
    const isPortrait = viewW <= 920 || viewW / Math.max(viewH, 1) < 0.95;
    const i0 = clamp(Math.floor(scrollF), 0, 3);
    const i1 = clamp(i0 + 1, 0, 3);
    const t = smoothstep(scrollF - i0);

    const c0 = isPortrait ? CAM_STATIONS[i0].portrait : CAM_STATIONS[i0].desktop;
    const c1 = isPortrait ? CAM_STATIONS[i1].portrait : CAM_STATIONS[i1].desktop;

    camera.fov = isPortrait ? 44 : 42;
    camera.aspect = viewW / Math.max(viewH, 1);

    // 滚动过渡中相机略微下潜推进（增加穿行纵深呼吸感）
    const divePulse = Math.sin(t * Math.PI) * 0.65;
    camera.position.set(
      lerp(c0.pos[0], c1.pos[0], t),
      lerp(c0.pos[1], c1.pos[1], t),
      lerp(c0.pos[2], c1.pos[2], t) - divePulse
    );
    lookTarget.set(
      lerp(c0.look[0], c1.look[0], t),
      lerp(c0.look[1], c1.look[1], t),
      lerp(c0.look[2], c1.look[2], t)
    );
    camera.lookAt(lookTarget);

    const offX = lerp(c0.offX, c1.offX, t);
    const offY = lerp(c0.offY, c1.offY, t);
    camera.setViewOffset(viewW, viewH, offX * viewW, offY * viewH, viewW, viewH);
    camera.updateProjectionMatrix();

    if (bloomPass) {
      bloomPass.strength = lerp(CAM_STATIONS[i0].bloom, CAM_STATIONS[i1].bloom, t);
    }
  }

  function applyDepthTransform(group, delta) {
    // delta = scrollF - chapterIdx
    // delta < 0：目标雕塑正在下方深空迎面升起靠近
    // delta > 0：用户向下滚过此幕，雕塑向上方掠去并退远
    const d = clamp(delta, -1.0, 1.0);
    if (d < 0) {
      const a = -d;
      const ease = a * a;
      group.position.set(0, -a * 6.4, -ease * 16.0);
      group.scale.setScalar(Math.max(0.28, 1.0 - a * 0.56));
    } else {
      const ease = d * d;
      group.position.set(0, d * 6.2, -ease * 12.0);
      group.scale.setScalar(Math.max(0.32, 1.0 - d * 0.45));
    }
  }

  function renderOneFrame(now) {
    if (paused || contextLost) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) * 0.001));
    lastNow = now;
    clockT += reduced ? dt * 0.22 : dt;

    // 丝滑阻尼跟踪原生滚动进度
    const prevS = scrollF;
    const damp = reduced ? 0.35 : 0.11;
    scrollF += (targetScrollF - scrollF) * damp;
    if (Math.abs(targetScrollF - scrollF) < 0.0004) scrollF = targetScrollF;
    scrollVel = (scrollF - prevS) / Math.max(dt, 0.008);
    activeChapter = clamp(Math.round(scrollF), 0, 3);

    // 首次滚入第 1 幕时自动重新刻画双轨玫瑰花进动，让入场自带生命力
    if (!ch1AutoFired && scrollF > 0.62 && scrollF < 1.35) {
      ch1AutoFired = true;
      chRelativity.fireOrbit(0.44, 0.55);
    }

    const targetTheme = theme === 'light' ? 1 : 0;
    themeBlend += (targetTheme - themeBlend) * 0.14;
    scene.background.copy(darkBg).lerp(lightBg, themeBlend);
    renderer.toneMappingExposure = 1.12 - themeBlend * 0.14;

    if (bloomPass) bloomPass.enabled = themeBlend < 0.55;
    cinematicPass.uniforms.uTime.value = clockT;
    cinematicPass.uniforms.uTheme.value = themeBlend;

    // 纵深穿行星场
    starTunnel.visible = themeBlend < 0.88;
    if (starTunnel.visible) {
      starTunnelMat.uniforms.uScroll.value = scrollF;
      starTunnelMat.uniforms.uVel.value = scrollVel;
      starTunnelMat.uniforms.uTime.value = clockT;
      const lensDim = 1.0 - 0.38 * Math.max(0, 1.0 - Math.abs(scrollF - 2.0) * 1.4);
      starTunnelMat.uniforms.uOpacity.value = 0.72 * lensDim * (1 - themeBlend);
    }

    updateCameraContinuous();

    // 更新全部 4 幕阻尼视角
    for (let i = 0; i < 4; i++) {
      orbits[i].yaw += (orbits[i].targetYaw - orbits[i].yaw) * 0.16;
      orbits[i].pitch += (orbits[i].targetPitch - orbits[i].pitch) * 0.16;
    }

    const aspect = viewW / Math.max(viewH, 1);
    const isPortrait = viewW <= 920 || aspect < 0.95;

    // 按连续纵深窗口激活可见雕塑（相邻过渡期双雕塑同时穿行，静止时单雕塑零浪费）
    const d0 = scrollF - 0;
    chBigBang.group.visible = Math.abs(d0) < 0.92;
    if (chBigBang.group.visible) {
      applyDepthTransform(chBigBang.group, d0);
      telemetry.bigBang = chBigBang.update({
        time: clockT, dt, orbitYaw: orbits[0].yaw, orbitPitch: orbits[0].pitch, aspect, theme,
      });
    }

    const d1 = scrollF - 1;
    chRelativity.group.visible = Math.abs(d1) < 0.92;
    if (chRelativity.group.visible) {
      applyDepthTransform(chRelativity.group, d1);
      telemetry.relativity = chRelativity.update({
        time: clockT, dt, orbitYaw: orbits[1].yaw, orbitPitch: orbits[1].pitch, aspect, theme,
      });
    }

    const d2 = scrollF - 2;
    chLensing.group.visible = Math.abs(d2) < 0.88;
    if (chLensing.group.visible) {
      applyDepthTransform(chLensing.group, d2);
      const lensAspect = isPortrait ? Math.min(aspect, 0.82) : Math.min(aspect * 0.56, 0.92);
      telemetry.lensing = chLensing.update({
        renderer, time: clockT, pointer, pointerAct, isDragging, camera, aspect: lensAspect, theme,
      });
    }

    const d3 = scrollF - 3;
    chLightCone.group.visible = Math.abs(d3) < 0.92;
    if (chLightCone.group.visible) {
      applyDepthTransform(chLightCone.group, d3);
      telemetry.lightCone = chLightCone.update({
        time: clockT, dt, orbitYaw: orbits[3].yaw, orbitPitch: orbits[3].pitch, aspect, theme,
      });
    }

    telemetry.chapter = activeChapter;
    telemetry.scrollF = scrollF;
    composer.render();
  }

  function frame(now) {
    if (destroyed) return;
    try {
      renderOneFrame(now);
    } catch (err) {
      console.warn('[cosmic-spacetime] render frame failed:', err);
      destroyed = true;
      cleanup();
      onFail(err);
      return;
    }
    if (!destroyed) rafId = requestAnimationFrame(frame);
  }

  try {
    renderOneFrame(performance.now());
  } catch (err) {
    console.warn('[cosmic-spacetime] initial frame failed:', err);
    destroyed = true;
    cleanup();
    onFail(err);
    return null;
  }
  rafId = requestAnimationFrame(frame);
  setTimeout(() => { if (!destroyed) onReady(); }, 40);

  return {
    setScrollCoord(val, immediate = false) {
      targetScrollF = clamp(Number(val) || 0, 0, 3);
      if (immediate) scrollF = targetScrollF;
    },
    rotateOrbit(dYaw, dPitch) {
      const idx = clamp(Math.round(targetScrollF), 0, 3);
      const orb = orbits[idx];
      const [minP, maxP] = CAM_STATIONS[idx].pitchRange;
      orb.targetYaw += dYaw;
      orb.targetPitch = clamp(orb.targetPitch + dPitch, minP, maxP);
    },
    resetOrbit() {
      const idx = clamp(Math.round(targetScrollF), 0, 3);
      orbits[idx].targetYaw = 0;
      orbits[idx].targetPitch = 0;
    },
    setPointer(nx, ny, active) {
      pointer = [nx, ny];
      pointerAct = active ? 1 : 0;
    },
    setDragging(flag) { isDragging = !!flag; },
    setEpoch(u) { chBigBang.setEpoch(u); },
    triggerReplay() { chBigBang.triggerReplay(); },
    fireOrbit(ecc, str) { chRelativity.fireOrbit(ecc, str); },
    setRelStrength(v) { chRelativity.setRelStrength(v); },
    setEccentricity(v) { chRelativity.setEccentricity(v); },
    triggerGravitationalWave() { chRelativity.triggerGravitationalWave(); },
    setLensMass(m) { chLensing.setMassMultiplier(m); },
    setShowParity(b) { chLensing.setShowParity(b); },
    setManualLens(nx, ny) { return chLensing.setManualLensFromNdc(nx, ny, camera); },
    snapLensCenter() { chLensing.snapToCenter(); },
    clearManualLens() { chLensing.clearManualLens(); },
    setBeta(v) { chLightCone.setBeta(v); },
    setConePreset(name) { chLightCone.setPreset(name); },
    setTheme(t) { theme = t === 'light' ? 'light' : 'dark'; },
    getStatus() { return telemetry; },
    destroy() {
      destroyed = true;
      cleanup();
    },
  };
}

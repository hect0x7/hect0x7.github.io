// 第 2 幕：引力透镜与 360° 爱因斯坦环 + 「同源不对称印记（像的宇称对照）」
import * as THREE from 'three';

const LENS_VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const LENS_FS = /* glsl */ `
  uniform sampler2D uFieldTex;
  uniform vec2 uLensPos;
  uniform float uEinsteinR;
  uniform float uShowParity; // 1.0 = 在源平面中央星系上印一枚不对称朱砂箭头，偏轴时肉眼可见一正一反双像！
  uniform float uTheme;
  varying vec2 vUv;

  // 源平面不对称箭头 SDF（用于验证强引力透镜两幅像的宇称翻转：一正一反）
  float parityArrow(vec2 p) {
    // 放置在主星系略偏移处 (0.53, 0.52)
    vec2 q = (p - vec2(0.525, 0.515)) * 18.0;
    // 箭杆 + 单侧倒钩（刻意不对称，翻转后一眼可辨！）
    float shaft = max(abs(q.x), abs(q.y) - 0.55);
    vec2 hq = q - vec2(0.0, 0.45);
    float head = max(abs(hq.x + hq.y * 0.72) - 0.10, max(-hq.y - 0.42, hq.y - 0.22));
    float barb = max(abs(q.x - 0.24) - 0.14, abs(q.y + 0.12) - 0.08);
    float d = min(min(shaft, head), barb);
    return 1.0 - smoothstep(0.0, 0.07, d);
  }

  void main() {
    vec2 centerD = vUv - 0.5;
    float rWin = length(centerD) * 2.0;
    float mask = 1.0 - smoothstep(0.82, 0.995, rWin);
    if (mask < 0.005) discard;

    vec2 theta = vUv - uLensPos;
    float r = length(theta);
    float r2 = dot(theta, theta);
    float re = uEinsteinR;
    float re2 = re * re;

    // 严格无色散点质量引力透镜方程：β = θ - θE² / θ（与页面公式、爱因斯坦环半径完全同源！）
    // 中心前景星系核极小奇点由核心星光遮蔽，杜绝软化导致的虚假中心分支
    float coreMask = smoothstep(0.015, 0.030, r);
    vec2 beta = uLensPos + theta * (1.0 - re2 / max(r2, 1e-6));

    vec3 bg = texture2D(uFieldTex, clamp(beta, vec2(0.004), vec2(0.996))).rgb * coreMask;

    // 完美对齐时渐隐离散印记，把画面还给完整 360° 爱因斯坦环
    float alignFade = smoothstep(0.015, 0.055, length(uLensPos - vec2(0.5)));
    float marker = uShowParity > 0.5 ? parityArrow(beta) * alignFade * coreMask : 0.0;

    float dm = (r - re) / max(re * 0.24, 0.01);
    float mag = 1.0 + exp(-(dm * dm)) * 0.95;
    bg *= mag;
    bg = mix(bg, vec3(1.0, 0.28, 0.20) * 1.65, clamp(marker, 0.0, 1.0));

    float lensCore = exp(-r * r / max(re2 * 0.14, 0.0004));
    float lensHalo = exp(-r / max(re * 0.85, 0.01)) * 0.34;
    float critRing = exp(-abs(r - re) * 125.0) * 0.32;

    vec3 lensGlow = vec3(1.0, 0.90, 0.68) * lensCore * 0.86
                  + vec3(1.0, 0.72, 0.42) * lensHalo
                  + vec3(0.72, 0.90, 1.0) * critRing;

    float bezel = exp(-abs(rWin - 0.975) * 95.0) * 0.44;
    vec3 colD = bg + lensGlow + vec3(0.62, 0.80, 1.0) * bezel;

    float luma = dot(bg, vec3(0.299, 0.587, 0.114));
    vec3 colL = mix(vec3(0.96, 0.94, 0.90), vec3(0.14, 0.24, 0.44), clamp(luma * 1.45, 0.0, 1.0));
    colL = mix(colL, vec3(0.86, 0.18, 0.14), clamp(marker * 0.95 + lensCore * 0.72 + critRing * 0.85, 0.0, 0.92));
    colL = mix(colL, vec3(0.26, 0.30, 0.38), bezel * 0.8);

    gl_FragColor = vec4(mix(colD, colL, uTheme), clamp(mask * 0.98 + bezel * 0.4, 0.0, 0.99));
  }
`;

export function createLensingChapter(textures) {
  const group = new THREE.Group();

  const fieldTarget = new THREE.WebGLRenderTarget(1024, 1024, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });
  const fieldScene = new THREE.Scene();
  fieldScene.background = new THREE.Color('#04060d');
  const fieldCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  fieldCam.position.z = 2;

  const deepGalaxies = [
    { x: 0.00, y: 0.00, s: 0.50, rot: 0.3, spin: 0.08, idx: 0 },
    { x: -0.44, y: 0.30, s: 0.36, rot: 1.1, spin: -0.09, idx: 1 },
    { x: 0.46, y: -0.26, s: 0.38, rot: 2.2, spin: 0.07, idx: 2 },
    { x: 0.38, y: 0.38, s: 0.30, rot: 0.7, spin: -0.11, idx: 3 },
    { x: -0.42, y: -0.36, s: 0.32, rot: 1.8, spin: 0.10, idx: 0 },
    { x: 0.04, y: 0.52, s: 0.24, rot: 2.6, spin: -0.08, idx: 1 },
    { x: -0.08, y: -0.48, s: 0.26, rot: 0.9, spin: 0.09, idx: 2 },
  ];
  const galaxyMeshes = [];
  for (const g of deepGalaxies) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(g.s, g.s),
      new THREE.MeshBasicMaterial({
        map: textures.galaxies[g.idx],
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    m.position.set(g.x, g.y, 0);
    m.rotation.z = g.rot;
    fieldScene.add(m);
    galaxyMeshes.push({ mesh: m, spin: g.spin });
  }

  const starCount = 420;
  const sPos = new Float32Array(starCount * 3);
  const sCol = new Float32Array(starCount * 3);
  let seed = 8803;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const tc = new THREE.Color();
  for (let i = 0; i < starCount; i++) {
    sPos[i * 3] = (rng() * 2 - 1) * 0.96;
    sPos[i * 3 + 1] = (rng() * 2 - 1) * 0.96;
    sPos[i * 3 + 2] = -0.2;
    tc.setHSL(rng() > 0.3 ? 0.58 + rng() * 0.1 : 0.08 + rng() * 0.06, 0.65, 0.72 + rng() * 0.24);
    sCol[i * 3] = tc.r; sCol[i * 3 + 1] = tc.g; sCol[i * 3 + 2] = tc.b;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const fieldStars = new THREE.Points(sGeo, new THREE.PointsMaterial({
    size: 0.032, map: textures.star, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  fieldScene.add(fieldStars);

  // 居中大望远镜圆形视窗（完美填满独立中间展窗，绝不碰左右读数栏）
  const viewportGeo = new THREE.PlaneGeometry(5.6, 5.6);
  const lensMat = new THREE.ShaderMaterial({
    uniforms: {
      uFieldTex: { value: fieldTarget.texture },
      uLensPos: { value: new THREE.Vector2(0.5, 0.5) },
      uEinsteinR: { value: 0.145 },
      uShowParity: { value: 0.0 },
      uTheme: { value: 0 },
    },
    vertexShader: LENS_VS,
    fragmentShader: LENS_FS,
    transparent: true,
    depthWrite: false,
  });
  const viewportMesh = new THREE.Mesh(viewportGeo, lensMat);
  viewportMesh.renderOrder = 5;
  group.add(viewportMesh);

  let massMul = 1.0;
  let showParity = false;
  let manualTarget = null;
  const lensUV = new THREE.Vector2(0.5, 0.5);
  const raycaster = new THREE.Raycaster();
  const ptrVec = new THREE.Vector2();

  function setMassMultiplier(m) { massMul = Math.max(0.6, Math.min(2.4, Number(m) || 1.0)); }
  function setShowParity(b) { showParity = !!b; }
  function setManualLensFromNdc(nx, ny, camera) {
    ptrVec.set(nx, ny);
    raycaster.setFromCamera(ptrVec, camera);
    const hits = raycaster.intersectObject(viewportMesh, false);
    if (hits.length > 0 && hits[0].uv) {
      const u = hits[0].uv.x, v = hits[0].uv.y;
      if (Math.hypot(u - 0.5, v - 0.5) <= 0.48) {
        manualTarget = { u, v };
        return true;
      }
    }
    return false;
  }
  function snapToCenter() { manualTarget = { u: 0.5, v: 0.5 }; }
  function clearManualLens() { manualTarget = null; }

  function update({ renderer, time, pointer, pointerAct, isDragging, camera, aspect, theme }) {
    for (let i = 0; i < galaxyMeshes.length; i++) {
      galaxyMeshes[i].mesh.rotation.z += galaxyMeshes[i].spin * 0.016;
    }
    const prevTarget = renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(fieldTarget);
      renderer.render(fieldScene, fieldCam);
    } finally {
      renderer.setRenderTarget(prevTarget);
    }

    // 严格按当前视锥宽、高较小值适配直径 5.3 的圆形目镜，任意窄长/宽屏永不裁切边缘
    const dist = Math.max(1.0, camera.position.length());
    const visH = 2.0 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const visW = visH * Math.max(0.05, aspect);
    const sc = Math.min(1.04, (Math.min(visW, visH) * 0.92) / 5.3);
    viewportMesh.position.set(0, 0, 0);
    viewportMesh.scale.setScalar(sc);
    viewportMesh.lookAt(camera.position);

    let targetU = 0.5 + Math.sin(time * 0.42) * 0.14;
    let targetV = 0.5 + Math.sin(time * 0.84) * 0.07;
    if (manualTarget) {
      targetU = manualTarget.u;
      targetV = manualTarget.v;
    } else if (pointerAct > 0.05 || isDragging) {
      ptrVec.set(pointer[0], pointer[1]);
      raycaster.setFromCamera(ptrVec, camera);
      const hits = raycaster.intersectObject(viewportMesh, false);
      if (hits.length > 0 && hits[0].uv && Math.hypot(hits[0].uv.x - 0.5, hits[0].uv.y - 0.5) <= 0.48) {
        targetU = hits[0].uv.x;
        targetV = hits[0].uv.y;
      }
    }
    lensUV.x += (targetU - lensUV.x) * 0.14;
    lensUV.y += (targetV - lensUV.y) * 0.14;

    const einsteinR = 0.128 * Math.sqrt(massMul);
    lensMat.uniforms.uLensPos.value.copy(lensUV);
    lensMat.uniforms.uEinsteinR.value = einsteinR;
    lensMat.uniforms.uShowParity.value = showParity ? 1.0 : 0.0;
    lensMat.uniforms.uTheme.value = theme === 'light' ? 1 : 0;

    const dCenter = Math.hypot(lensUV.x - 0.5, lensUV.y - 0.5);
    const alignment = Math.round(Math.max(0, 1 - dCenter / 0.28) * 100);
    return { einsteinArcsec: +(einsteinR * 18.5).toFixed(2), alignment, massMul, showParity };
  }

  function dispose() {
    fieldTarget.dispose();
    sGeo.dispose();
    fieldStars.material.dispose();
    galaxyMeshes.forEach((g) => { g.mesh.geometry.dispose(); g.mesh.material.dispose(); });
    viewportGeo.dispose();
    lensMat.dispose();
  }

  return { group, update, setMassMultiplier, setShowParity, setManualLensFromNdc, snapToCenter, clearManualLens, dispose };
}

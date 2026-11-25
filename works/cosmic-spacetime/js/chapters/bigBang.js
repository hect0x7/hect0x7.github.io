// 第 0 幕：3D 光学玻璃 WMAP 宇宙膨胀钟 + 纪元切片游标 + 共动星系铆钉 + 双眼 141° 扫描天空 WMAP 金色探测器
import * as THREE from 'three';

export function bellRadius(u) {
  const s = Math.min(1, Math.max(0, u / 0.11));
  const inf = Math.pow(s * s * (3 - 2 * s), 0.36) * 0.84;
  const drift = 0.54 * Math.pow(Math.max(u - 0.05, 0), 1.08);
  const darkE = 0.76 * Math.pow(Math.max(u - 0.56, 0) / 0.44, 2.25);
  return 0.03 + inf + drift + darkE;
}

export function bellX(u) {
  return -3.65 + u * 7.60; // [-3.65, +3.95]
}

// 统一纪元坐标锚点（按钮、CMB 截面、年龄读数、尺度因子四者同源！）
// 0.03 = 10⁻³²s 暴胀, 0.16 = 380 kyr (38万年 CMB), 0.36 = 400 Myr (4亿年首批恒星), 1.00 = 13.8 Gyr (今日)
export const CMB_EPOCH = 0.16;

export function formatEpoch(u) {
  const c = Math.max(0, Math.min(1, u));
  if (c <= 0.035) return { age: '10⁻³² s', key: 'ep0' };
  if (c <= CMB_EPOCH) {
    const t = (c - 0.035) / (CMB_EPOCH - 0.035);
    const kyr = Math.round(1 + t * 379);
    return { age: `${kyr} kyr`, key: 'ep1' };
  }
  if (c <= 0.36) {
    const t = (c - CMB_EPOCH) / (0.36 - CMB_EPOCH);
    if (t < 0.025) return { age: '380 kyr', key: 'ep1' };
    const myr = Math.round(0.38 + t * 399.62);
    return { age: `${myr} Myr`, key: 'ep2' };
  }
  const t = (c - 0.36) / (1.0 - 0.36);
  const gyr = (0.4 + t * 13.4).toFixed(1);
  return { age: `${gyr} Gyr`, key: 'ep3' };
}

const SHELL_VS = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vU;
  void main() {
    vUv = uv;
    vU = uv.y;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SHELL_FS = /* glsl */ `
  uniform float uTime;
  uniform float uTheme;
  uniform float uEpoch; // 0..1 当前时间游标位置
  uniform float uCmbEpoch;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vU;

  void main() {
    float reveal = 1.0 - smoothstep(uEpoch - 0.04, uEpoch + 0.025, vU);
    if (reveal < 0.004) discard;

    vec3 n = normalize(vNormalW);
    if (!gl_FrontFacing) n = -n;
    float ndv = abs(dot(n, normalize(vViewDir)));
    float fresnel = pow(1.0 - ndv, 2.5);

    float latCoord = vU * 14.0;
    float lonCoord = vUv.x * 16.0;
    float latGrid = 1.0 - smoothstep(0.0, max(fwidth(latCoord) * 1.3, 0.004), abs(fract(latCoord - 0.5) - 0.5));
    float lonGrid = 1.0 - smoothstep(0.0, max(fwidth(lonCoord) * 1.3, 0.004), abs(fract(lonCoord - 0.5) - 0.5));
    float grid = max(latGrid * 0.92, lonGrid * 0.72);

    float mouthRim = smoothstep(0.96, 1.0, vU);
    float cmbRing = exp(-abs(vU - uCmbEpoch) * 52.0);
    float sliceRing = exp(-abs(vU - clamp(uEpoch, 0.02, 1.0)) * 34.0);
    float neckFade = smoothstep(0.012, 0.065, vU);

    float glassAlpha = (0.014 + fresnel * 0.17 + grid * (0.12 + fresnel * 0.24) + mouthRim * 0.34 + cmbRing * 0.28 + sliceRing * 0.52) * neckFade * reveal;
    glassAlpha *= gl_FrontFacing ? 1.0 : 0.34;

    vec3 darkGlass = mix(vec3(0.24, 0.44, 0.84), vec3(0.72, 0.86, 1.0), fresnel);
    darkGlass = mix(darkGlass, vec3(1.0, 0.86, 0.58), sliceRing * 0.85 + mouthRim * 0.5);
    darkGlass += vec3(0.28, 0.86, 0.84) * cmbRing * 0.5;

    vec3 lightGlass = mix(vec3(0.20, 0.28, 0.40), vec3(0.78, 0.22, 0.18), sliceRing * 0.75 + mouthRim * 0.45);
    vec3 col = mix(darkGlass, lightGlass, uTheme);
    gl_FragColor = vec4(col, clamp(glassAlpha * mix(1.0, 0.82, uTheme), 0.0, 0.72));
  }
`;

const CMB_FS = /* glsl */ `
  uniform float uTime;
  uniform float uTheme;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.08 + vec2(13.7, 7.3); a *= 0.5; }
    return v;
  }

  // 与 JS WMAP 差分采样同源的球谐合成 CMB 微波天空（单位：归一化温差）
  float cmbHarmonic(vec3 dir) {
    float v = 0.0;
    v += sin(dir.x * 3.1 + dir.y * 4.2 + 0.4) * 0.34;
    v += cos(dir.y * 5.3 - dir.z * 3.8 - 1.1) * 0.28;
    v += sin(dir.z * 7.1 + dir.x * 5.7 + 2.3) * 0.22;
    v += cos((dir.x - dir.y) * 9.4 + dir.z * 6.2) * 0.16;
    return v;
  }

  void main() {
    if (uOpacity < 0.005) discard;
    vec2 q = vUv * 2.0 - 1.0;
    float r = length(q);
    if (r > 1.0) discard;
    float z = sqrt(max(0.0, 1.0 - r * r));
    vec3 skyDir = normalize(vec3(-z, q.y, q.x));
    float hVal = cmbHarmonic(skyDir);
    vec2 p = q * 3.0 + vec2(uTime * 0.012, -uTime * 0.008);
    float detail = (fbm(p) - 0.5) * 0.28;
    float t = clamp(0.5 + hVal * 0.62 + detail, 0.0, 1.0);
    vec3 c0 = vec3(0.04, 0.14, 0.54);
    vec3 c1 = vec3(0.10, 0.68, 0.76);
    vec3 c2 = vec3(0.92, 0.82, 0.24);
    vec3 c3 = vec3(0.96, 0.30, 0.12);
    vec3 cmb = t < 0.36 ? mix(c0, c1, t / 0.36)
             : t < 0.72 ? mix(c1, c2, (t - 0.36) / 0.36)
                        : mix(c2, c3, (t - 0.72) / 0.28);
    float rim = exp(-abs(r - 0.96) * 34.0);
    float edge = 1.0 - smoothstep(0.90, 1.0, r);
    vec3 col = cmb * 0.96 + vec3(0.68, 0.94, 1.0) * rim * 0.75;
    gl_FragColor = vec4(col, clamp((edge * 0.82 + rim * 0.45) * uOpacity * mix(1.0, 0.82, uTheme), 0.0, 0.94));
  }
`;

// 与 CMB_FS 完全同源的合成 CMB 天空温度采样（输出 μK）
function sampleCmbSky(dir) {
  const v =
    Math.sin(dir.x * 3.1 + dir.y * 4.2 + 0.4) * 0.34 +
    Math.cos(dir.y * 5.3 - dir.z * 3.8 - 1.1) * 0.28 +
    Math.sin(dir.z * 7.1 + dir.x * 5.7 + 2.3) * 0.22 +
    Math.cos((dir.x - dir.y) * 9.4 + dir.z * 6.2) * 0.16;
  return v * 165.0; // 典型 WMAP 涨落幅度 ±150 μK
}

export function createBigBangChapter(textures) {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  // 1) 光滑光学玻璃 WMAP 膨胀钟外壳
  const profile = [];
  const steps = 84;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    profile.push(new THREE.Vector2(bellRadius(u), bellX(u)));
  }
  const shellGeo = new THREE.LatheGeometry(profile, 112);
  shellGeo.rotateZ(-Math.PI * 0.5);
  const shellMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTheme: { value: 0 }, uEpoch: { value: 1.0 }, uCmbEpoch: { value: CMB_EPOCH } },
    vertexShader: SHELL_VS,
    fragmentShader: SHELL_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shellMesh = new THREE.Mesh(shellGeo, shellMat);
  shellMesh.renderOrder = 10;
  root.add(shellMesh);

  // 2) 38 万年 CMB 截面盘（与 CMB_EPOCH = 0.16 精确对齐）
  const cmbU = CMB_EPOCH;
  const cmbR = bellRadius(cmbU) * 0.97;
  const cmbGeo = new THREE.CircleGeometry(cmbR, 84);
  cmbGeo.rotateY(Math.PI * 0.5);
  const cmbMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTheme: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: CMB_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cmbMesh = new THREE.Mesh(cmbGeo, cmbMat);
  cmbMesh.position.set(bellX(cmbU), 0, 0);
  cmbMesh.renderOrder = 6;
  root.add(cmbMesh);

  // 3) 可滑动纪元切片环 + 两颗共动星系铆钉（随尺度因子 a(t) 真实拉大间距！）
  const sliceRingMat = new THREE.MeshStandardMaterial({
    color: '#d9ae68',
    metalness: 0.82,
    roughness: 0.28,
    emissive: '#4d2e0e',
    emissiveIntensity: 0.34,
  });
  const sliceRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.015, 16, 96), sliceRingMat);
  sliceRing.rotation.y = Math.PI * 0.5;
  sliceRing.renderOrder = 11;
  root.add(sliceRing);

  const rivetGeo = new THREE.SphereGeometry(0.085, 24, 18);
  const rivetA = new THREE.Mesh(rivetGeo, new THREE.MeshBasicMaterial({ color: '#ffcb72' }));
  const rivetB = new THREE.Mesh(rivetGeo, new THREE.MeshBasicMaterial({ color: '#6fd8ff' }));
  rivetA.renderOrder = 12;
  rivetB.renderOrder = 12;
  root.add(rivetA, rivetB);

  const chordPositions = new Float32Array(6);
  const chordGeo = new THREE.BufferGeometry();
  chordGeo.setAttribute('position', new THREE.BufferAttribute(chordPositions, 3));
  const chordLine = new THREE.Line(chordGeo, new THREE.LineBasicMaterial({ color: '#ffe3a8', transparent: true, opacity: 0.72 }));
  chordLine.renderOrder = 11;
  root.add(chordLine);

  // 4) 3D 金色 WMAP 空间探测器（位于今日暗能量钟口，双 141° 扫描波束测绘微波背景差分温度！）
  const wmapGroup = new THREE.Group();
  wmapGroup.position.set(bellX(1.0) + 0.62, 0.0, 0.0);
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#e6b868',
    metalness: 0.88,
    roughness: 0.24,
    emissive: '#4a310e',
    emissiveIntensity: 0.35,
  });
  const dishMat = new THREE.MeshStandardMaterial({
    color: '#dce8f8',
    metalness: 0.75,
    roughness: 0.18,
  });
  // 六棱遮阳板底座
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.04, 6), goldMat);
  shield.rotation.z = Math.PI * 0.5;
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.26, 12), goldMat);
  bus.rotation.z = Math.PI * 0.5;
  bus.position.x = -0.14;
  // 双背靠背反射镜（夹角 141°）
  const dishGeo = new THREE.SphereGeometry(0.16, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.38);
  const dishA = new THREE.Mesh(dishGeo, dishMat);
  dishA.position.set(-0.24, 0.12, 0);
  dishA.rotation.z = 0.65;
  const dishB = new THREE.Mesh(dishGeo, dishMat);
  dishB.position.set(-0.24, -0.12, 0);
  dishB.rotation.z = Math.PI - 0.65;

  // 双 141° 精确夹角单位向量（半角 70.5°，均朝向钟口 -X 方向，dot(A,B) = cos(141°)）
  const HALF_141 = (141 * Math.PI / 180) * 0.5;
  const BEAM_DIR_A = new THREE.Vector3(-Math.cos(HALF_141), Math.sin(HALF_141), 0).normalize();
  const BEAM_DIR_B = new THREE.Vector3(-Math.cos(HALF_141), -Math.sin(HALF_141), 0).normalize();
  const UNIT_UP = new THREE.Vector3(0, 1, 0);
  const rotAxisX = new THREE.Vector3(1, 0, 0);
  const tmpDirA = new THREE.Vector3();
  const tmpDirB = new THREE.Vector3();

  // 双 141° 微波扫描锥束（与差分采样共用同一组单位向量！）
  const beamGeo = new THREE.ConeGeometry(0.24, 1.38, 24, 1, true);
  beamGeo.translate(0, 0.69, 0);
  const beamMatA = new THREE.MeshBasicMaterial({ color: '#6ee6ff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamMatB = new THREE.MeshBasicMaterial({ color: '#ffbe64', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamA = new THREE.Mesh(beamGeo, beamMatA);
  beamA.position.set(-0.24, 0.10, 0);
  beamA.quaternion.setFromUnitVectors(UNIT_UP, BEAM_DIR_A);
  const beamB = new THREE.Mesh(beamGeo, beamMatB);
  beamB.position.set(-0.24, -0.10, 0);
  beamB.quaternion.setFromUnitVectors(UNIT_UP, BEAM_DIR_B);

  wmapGroup.add(shield, bus, dishA, dishB, beamA, beamB);
  wmapGroup.renderOrder = 13;
  root.add(wmapGroup);

  // 5) 奇点炽白光核
  const apexPos = new THREE.Vector3(bellX(0.0), 0, 0);
  const apexFlare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.flare,
    color: new THREE.Color('#fff5e4'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.9,
  }));
  apexFlare.position.copy(apexPos);
  apexFlare.scale.set(2.3, 0.68, 1);
  apexFlare.renderOrder = 12;
  root.add(apexFlare);

  const apexCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.star,
    color: new THREE.Color('#ffffff'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.98,
  }));
  apexCore.position.copy(apexPos);
  apexCore.scale.setScalar(1.05);
  apexCore.renderOrder = 13;
  root.add(apexCore);

  // 6) 28 座写实 3D 螺旋星系
  const galaxiesGroup = new THREE.Group();
  root.add(galaxiesGroup);
  const galaxyMeta = [];
  let seed = 4207;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  for (let i = 0; i < 28; i++) {
    const u = 0.24 + Math.pow(rng(), 0.92) * 0.72;
    const maxR = bellRadius(u) * 0.66;
    const rad = Math.sqrt(rng()) * maxR;
    const ang = rng() * Math.PI * 2;
    const pos = new THREE.Vector3(bellX(u), Math.cos(ang) * rad, Math.sin(ang) * rad);
    const sz = (0.36 + rng() * 0.64) * (0.68 + u * 0.55);
    const mat = new THREE.MeshBasicMaterial({
      map: textures.galaxies[i % textures.galaxies.length],
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.94,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat);
    mesh.position.copy(pos);
    mesh.rotation.set((rng() - 0.5) * 2.1, (rng() - 0.5) * 2.1, rng() * Math.PI * 2);
    mesh.renderOrder = 7;
    galaxiesGroup.add(mesh);
    galaxyMeta.push({ mesh, basePos: pos.clone(), u, spin: (rng() > 0.5 ? 1 : -1) * (0.08 + rng() * 0.16) });
  }

  // 7) 30 团钟内体积星云尘埃（4 亿年首批恒星纪元 u >= 0.34 起浮现，尊重 38 万年–4 亿年黑暗时期）
  const nebulaMeta = [];
  const nebColors = ['#2e58b8', '#4088c8', '#6848a8', '#b87644', '#2a788e'];
  for (let i = 0; i < 30; i++) {
    const u = 0.34 + rng() * 0.64;
    const maxR = bellRadius(u) * 0.72;
    const rad = Math.sqrt(rng()) * maxR;
    const ang = rng() * Math.PI * 2;
    const pos = new THREE.Vector3(bellX(u), Math.cos(ang) * rad, Math.sin(ang) * rad);
    const mat = new THREE.SpriteMaterial({
      map: textures.nebula,
      color: new THREE.Color(nebColors[i % nebColors.length]),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.15 + rng() * 0.11,
    });
    const sp = new THREE.Sprite(mat);
    const sc = (0.85 + rng() * 1.4) * (0.65 + u * 0.55);
    sp.position.copy(pos);
    sp.scale.set(sc, sc * 0.82, 1);
    sp.renderOrder = 4;
    root.add(sp);
    nebulaMeta.push({ sprite: sp, basePos: pos.clone(), u, baseOp: mat.opacity });
  }

  // 8) 12,000 颗锐利艾里斑星点
  const starN = 12000;
  const basePosArr = new Float32Array(starN * 3);
  const starUArr = new Float32Array(starN);
  const starColArr = new Float32Array(starN * 3);
  const starSizeArr = new Float32Array(starN);
  const tmpCol = new THREE.Color();
  for (let i = 0; i < starN; i++) {
    const kind = rng();
    let u, r, ang;
    if (kind < 0.24) {
      // 首批恒星与再电离纪元（围绕 u = 0.36 = 4 亿年分布，CMB 后为黑暗时期）
      u = 0.34 + Math.pow(rng(), 0.9) * 0.14;
      r = bellRadius(u) * (0.14 + Math.sqrt(rng()) * 0.82);
      ang = rng() * Math.PI * 2;
      tmpCol.setHSL(0.58 + rng() * 0.06, 0.75, 0.78 + rng() * 0.18);
    } else {
      u = 0.36 + Math.pow(rng(), 0.86) * 0.64;
      r = bellRadius(u) * Math.pow(rng(), 0.62) * 0.96;
      ang = rng() * Math.PI * 2 + Math.sin(u * 12) * 0.3;
      tmpCol.setHSL(rng() < 0.22 ? 0.09 + rng() * 0.05 : 0.58 + rng() * 0.12, 0.7, 0.74);
    }
    basePosArr[i * 3] = bellX(u);
    basePosArr[i * 3 + 1] = Math.cos(ang) * r;
    basePosArr[i * 3 + 2] = Math.sin(ang) * r;
    starUArr[i] = u;
    starColArr[i * 3] = tmpCol.r; starColArr[i * 3 + 1] = tmpCol.g; starColArr[i * 3 + 2] = tmpCol.b;
    starSizeArr[i] = 0.65 + Math.pow(rng(), 2.6) * 2.1;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(basePosArr, 3));
  starGeo.setAttribute('aU', new THREE.BufferAttribute(starUArr, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColArr, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizeArr, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: textures.star },
      uTime: { value: 0 },
      uEpoch: { value: 1.0 },
      uTheme: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
    },
    vertexShader: /* glsl */ `
      attribute float aU;
      attribute vec3 aColor;
      attribute float aSize;
      uniform float uTime;
      uniform float uEpoch;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float vis = 1.0 - smoothstep(uEpoch - 0.04, uEpoch + 0.02, aU);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float twinkle = 0.72 + 0.28 * sin(uTime * (1.2 + aSize * 1.4) + aU * 90.0);
        gl_PointSize = clamp(aSize * 24.0 * uPixelRatio / max(-mv.z, 0.5), 1.4, 30.0) * vis;
        vColor = aColor;
        vAlpha = vis * twinkle;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTheme;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        if (vAlpha < 0.01) discard;
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float a = tex.a * vAlpha;
        if (a < 0.01) discard;
        vec3 colL = mix(vec3(0.18, 0.26, 0.42), vec3(0.76, 0.24, 0.18), vColor.r * 0.65);
        gl_FragColor = vec4(mix(vColor * tex.rgb * 1.2, colL, uTheme), a * mix(0.95, 0.68, uTheme));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const starsPoints = new THREE.Points(starGeo, starMat);
  starsPoints.renderOrder = 5;
  root.add(starsPoints);

  let epoch = 1.0;
  let replayT = -1;
  let scanPhase = 0;

  function setEpoch(u) {
    replayT = -1;
    epoch = Math.max(0.02, Math.min(1.0, Number(u) || 1.0));
  }
  function triggerReplay() {
    replayT = 0;
  }

  function update({ time, dt, orbitYaw, orbitPitch, aspect, theme }) {
    if (replayT >= 0) {
      replayT += dt;
      const p = Math.min(1, replayT / 1.65);
      epoch = 0.02 + (1 - Math.pow(1 - p, 4)) * 0.98;
      if (p >= 1) replayT = -1;
    }

    const isLight = theme === 'light' ? 1 : 0;
    const isPortrait = aspect < 0.95;

    // 宽银幕居中展窗适配（桌面横置居中铺满展窗，竖屏竖立窄端朝下今日朝上！）
    if (isPortrait) {
      const sc = Math.min(0.62, Math.max(0.46, aspect * 0.92));
      root.scale.setScalar(sc);
      root.position.set(0, -0.15, 0);
      root.rotation.set(orbitPitch * 0.85, orbitYaw * 0.95, Math.PI * 0.5);
    } else {
      const sc = Math.min(0.96, Math.max(0.76, aspect * 0.42));
      root.scale.setScalar(sc);
      root.position.set(-0.22, 0.04, 0);
      root.rotation.set(0.10 + orbitPitch, -0.22 + orbitYaw, -0.02);
    }

    shellMat.uniforms.uTime.value = time;
    shellMat.uniforms.uTheme.value = isLight;
    shellMat.uniforms.uEpoch.value = epoch;

    const cmbVis = Math.max(0, Math.min(1, (epoch - (CMB_EPOCH - 0.04)) / 0.07));
    cmbMat.uniforms.uTime.value = time;
    cmbMat.uniforms.uTheme.value = isLight;
    cmbMat.uniforms.uOpacity.value = cmbVis;

    // 更新纪元切片环 + 两颗共动星系铆钉（随尺度因子 a(t) 真实拉开间距！）
    const curX = bellX(epoch);
    const curR = bellRadius(epoch);
    sliceRing.position.set(curX, 0, 0);
    sliceRing.scale.setScalar(Math.max(0.06, curR * 1.01));
    const rivR = curR * 0.58;
    rivetA.position.set(curX, rivR * 0.82, rivR * 0.56);
    rivetB.position.set(curX, -rivR * 0.76, -rivR * 0.64);
    chordPositions[0] = rivetA.position.x; chordPositions[1] = rivetA.position.y; chordPositions[2] = rivetA.position.z;
    chordPositions[3] = rivetB.position.x; chordPositions[4] = rivetB.position.y; chordPositions[5] = rivetB.position.z;
    chordGeo.attributes.position.needsUpdate = true;
    chordLine.material.color.set(isLight ? '#a83424' : '#ffe3a8');

    // 金色 WMAP 探测器自旋扫描（精确以同一组 141° 波束向量采样共享合成 CMB 天空！）
    scanPhase = time * 0.85 + orbitYaw * 2.2;
    wmapGroup.visible = epoch > 0.72;
    wmapGroup.rotation.x = scanPhase;
    const blend = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    beamMatA.blending = blend;
    beamMatB.blending = blend;

    tmpDirA.copy(BEAM_DIR_A).applyAxisAngle(rotAxisX, scanPhase);
    tmpDirB.copy(BEAM_DIR_B).applyAxisAngle(rotAxisX, scanPhase);
    const deltaT = Math.round(sampleCmbSky(tmpDirA) - sampleCmbSky(tmpDirB));

    if (starMat.blending !== blend) { starMat.blending = blend; starMat.needsUpdate = true; }
    starMat.uniforms.uTime.value = time;
    starMat.uniforms.uEpoch.value = epoch;
    starMat.uniforms.uTheme.value = isLight;

    apexFlare.material.blending = blend;
    apexFlare.material.color.set(isLight ? '#c83428' : '#fff5e4');
    apexFlare.material.opacity = isLight ? 0.42 : 0.88;
    apexCore.material.blending = blend;
    apexCore.material.color.set(isLight ? '#d9482e' : '#ffffff');

    for (let i = 0; i < galaxyMeta.length; i++) {
      const g = galaxyMeta[i];
      const vis = Math.max(0, Math.min(1, (epoch - (g.u - 0.06)) / 0.12));
      g.mesh.visible = vis > 0.01;
      g.mesh.scale.setScalar(Math.max(0.001, vis));
      g.mesh.rotation.z += g.spin * 0.016;
      g.mesh.material.blending = blend;
      g.mesh.material.opacity = vis * (isLight ? 0.68 : 0.94);
    }
    for (let i = 0; i < nebulaMeta.length; i++) {
      const nb = nebulaMeta[i];
      const vis = Math.max(0, Math.min(1, (epoch - (nb.u - 0.06)) / 0.14));
      nb.sprite.visible = vis > 0.01;
      nb.sprite.material.blending = blend;
      nb.sprite.material.opacity = nb.baseOp * vis * (isLight ? 0.30 : 1.0);
    }

    const scaleFactor = +(bellRadius(epoch) / bellRadius(1.0)).toFixed(2);
    const epInfo = formatEpoch(epoch);
    return { epoch, age: epInfo.age, scaleFactor, deltaT, replaying: replayT >= 0 };
  }

  return { group, update, setEpoch, triggerReplay };
}

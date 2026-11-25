// 第 3 幕：闵可夫斯基时空光锥 —— 「亲手交换两件事的先后」
// 钛金双光锥 + 实时倾斜黄铜同时面 (ct = βx) + 事件 A/B 洛伦兹时钟 t' = γ(t - βx) + 因果间隔实时判定
import * as THREE from 'three';

const CONE_VS = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vY;
  void main() {
    vUv = uv;
    vY = position.y;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CONE_FS = /* glsl */ `
  uniform vec3 uTintD;
  uniform vec3 uTintL;
  uniform float uSign;
  uniform float uTime;
  uniform float uTheme;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vY;

  void main() {
    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;
    float ndv = abs(dot(N, normalize(vViewDir)));
    float fresnel = pow(1.0 - ndv, 2.3);

    float hNorm = clamp(abs(vY) / 2.25, 0.0, 1.0);
    float ringCoord = hNorm * 6.0;
    float genCoord = vUv.x * 12.0;
    float rings = 1.0 - smoothstep(0.0, max(fwidth(ringCoord) * 1.35, 0.008), abs(fract(ringCoord - 0.5) - 0.5));
    float gens = 1.0 - smoothstep(0.0, max(fwidth(genCoord) * 1.35, 0.008), abs(fract(genCoord - 0.5) - 0.5));
    float grid = max(rings * 0.9, gens * 0.65);

    float fSin = 0.5 + 0.5 * sin(hNorm * 14.0 - uTime * 2.2 * uSign);
    float f2 = fSin * fSin;
    float flow = f2 * f2 * 0.24;
    float rimFade = 1.0 - smoothstep(0.84, 1.0, hNorm);
    float apexGlow = exp(-hNorm * 7.5) * 0.52;

    float a = (0.055 + fresnel * 0.26 + grid * (0.18 + fresnel * 0.26) + flow + apexGlow) * (0.4 + 0.6 * rimFade);
    a *= gl_FrontFacing ? 1.0 : 0.42;

    vec3 colD = uTintD * (0.75 + fresnel * 0.85 + grid * 0.55) + vec3(1.0, 0.95, 0.86) * apexGlow;
    vec3 colL = mix(uTintL, vec3(0.78, 0.22, 0.18), apexGlow * 0.7);
    gl_FragColor = vec4(mix(colD, colL, uTheme), clamp(a, 0.0, 0.84));
  }
`;

const SIMULT_FS = /* glsl */ `
  uniform float uTheme;
  varying vec2 vUv;
  void main() {
    vec2 q = vUv * 2.0 - 1.0;
    float r = length(q);
    if (r > 1.0) discard;
    float edge = exp(-abs(r - 0.97) * 48.0);
    vec2 g = q * 6.0;
    vec2 gd = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(0.01));
    float grid = (1.0 - smoothstep(0.0, 1.25, min(gd.x, gd.y))) * (1.0 - smoothstep(0.85, 1.0, r));
    vec3 colD = mix(vec3(0.92, 0.74, 0.42), vec3(1.0, 0.92, 0.74), edge);
    vec3 colL = mix(vec3(0.70, 0.42, 0.18), vec3(0.82, 0.22, 0.18), edge);
    float a = clamp(0.11 + grid * 0.26 + edge * 0.65, 0.0, 0.82);
    gl_FragColor = vec4(mix(colD, colL, uTheme), a);
  }
`;

export function createLightConeChapter(textures) {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const CONE_H = 2.25;
  const CONE_R = 2.25; // 严格 45° 光锥 (r = |ct|)

  // 1) 上/下光学玻璃双光锥（严格 45° 类光边界）
  const futureGeo = new THREE.ConeGeometry(CONE_R, CONE_H, 96, 18, true);
  futureGeo.rotateX(Math.PI);
  futureGeo.translate(0, CONE_H * 0.5, 0);
  const futureMat = new THREE.ShaderMaterial({
    uniforms: { uTintD: { value: new THREE.Color('#f4b468') }, uTintL: { value: new THREE.Color('#9a4424') }, uSign: { value: 1.0 }, uTime: { value: 0 }, uTheme: { value: 0 } },
    vertexShader: CONE_VS, fragmentShader: CONE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  root.add(new THREE.Mesh(futureGeo, futureMat));

  const pastGeo = new THREE.ConeGeometry(CONE_R, CONE_H, 96, 18, true);
  pastGeo.translate(0, -CONE_H * 0.5, 0);
  const pastMat = new THREE.ShaderMaterial({
    uniforms: { uTintD: { value: new THREE.Color('#5a92f5') }, uTintL: { value: new THREE.Color('#274268') }, uSign: { value: -1.0 }, uTime: { value: 0 }, uTheme: { value: 0 } },
    vertexShader: CONE_VS, fragmentShader: CONE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  root.add(new THREE.Mesh(pastGeo, pastMat));

  // 2) 中央「此刻 · NOW」棱镜核 + 静止系赤道环 + 钛金倾斜浑仪环
  const nowGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    new THREE.MeshStandardMaterial({ color: '#fff4dc', metalness: 0.3, roughness: 0.1, emissive: '#ffcf88', emissiveIntensity: 0.9 })
  );
  nowGem.renderOrder = 10;
  root.add(nowGem);

  const nowFlare = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.flare, color: '#ffe8c4', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85,
  }));
  nowFlare.scale.set(1.9, 0.45, 1);
  nowFlare.renderOrder = 11;
  root.add(nowFlare);

  const eqRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.38, 0.018, 20, 128),
    new THREE.MeshStandardMaterial({ color: '#8ba8d8', metalness: 0.82, roughness: 0.28, transparent: true, opacity: 0.48 })
  );
  eqRing.rotation.x = Math.PI * 0.5;
  root.add(eqRing);

  // 3) 洛伦兹助推倾斜黄铜同时面 (ct = βx) 与倾斜时间轴 (x = βct)！
  const simultGeo = new THREE.CircleGeometry(2.34, 72);
  simultGeo.rotateX(-Math.PI * 0.5);
  const simultMat = new THREE.ShaderMaterial({
    uniforms: { uTheme: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: SIMULT_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const simultPlane = new THREE.Mesh(simultGeo, simultMat);
  simultPlane.renderOrder = 6;
  root.add(simultPlane);

  // 运动观察者世界线（ct' 轴：随 β 向 45° 光锥边界收拢倾斜）
  const tAxisPos = new Float32Array(6);
  const tAxisGeo = new THREE.BufferGeometry();
  tAxisGeo.setAttribute('position', new THREE.BufferAttribute(tAxisPos, 3));
  const tAxisLine = new THREE.Line(tAxisGeo, new THREE.LineBasicMaterial({ color: '#ffe29c', transparent: true, opacity: 0.85 }));
  tAxisLine.renderOrder = 9;
  root.add(tAxisLine);

  // 4) 事件 A（暖金）与事件 B（青蓝）3D 发光球 + 两者间的因果连线
  function makeEventOrb(hex) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 20), new THREE.MeshBasicMaterial({ color: hex }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.star, color: hex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.92,
    }));
    halo.scale.setScalar(0.92);
    g.add(core, halo);
    g.renderOrder = 12;
    return { group: g, core, halo };
  }
  const orbA = makeEventOrb('#ffb85c');
  const orbB = makeEventOrb('#5ce0ff');
  root.add(orbA.group, orbB.group);

  const linkPos = new Float32Array(6);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  const linkMat = new THREE.LineBasicMaterial({ color: '#ff6448', transparent: true, opacity: 0.9 });
  const linkLine = new THREE.Line(linkGeo, linkMat);
  linkLine.renderOrder = 11;
  root.add(linkLine);

  // 预设事件坐标（单位：光秒，场景缩放系数 1.35）
  const SCALE = 1.35;
  let beta = 0.0; // v/c ∈ [-0.75, +0.75]
  let preset = 'spacelike'; // 'spacelike' | 'lightlike' | 'timelike'
  let evA = { x: -1.0, t: 0.0 };
  let evB = { x: 1.0, t: 0.0 };

  function setPreset(name) {
    preset = name;
    if (name === 'timelike') {
      evA = { x: -0.25, t: -0.45 };
      evB = { x: 0.35, t: 0.95 }; // Δt = 1.40 > |Δx| = 0.60 → 严格类时因果锁定！
    } else if (name === 'lightlike') {
      evA = { x: -0.60, t: -0.60 };
      evB = { x: 0.60, t: 0.60 }; // Δt = |Δx| = 1.20 → 严格光速边界！
    } else {
      evA = { x: -1.0, t: 0.0 };
      evB = { x: 1.0, t: 0.0 };   // Δt = 0 < |Δx| = 2.0 → 类空分离，助推可翻转先后！
    }
  }
  function setBeta(v) {
    beta = Math.max(-0.75, Math.min(0.75, Number(v) || 0));
  }

  function update({ time, orbitYaw, orbitPitch, aspect, theme }) {
    const isLight = theme === 'light' ? 1 : 0;
    const isPortrait = aspect < 0.95;
    const sc = isPortrait ? 0.72 : Math.min(0.98, Math.max(0.82, aspect * 0.92));
    root.scale.setScalar(sc);
    root.position.set(0, 0, 0);
    root.rotation.set(0.18 + orbitPitch, orbitYaw, 0);

    futureMat.uniforms.uTime.value = time;
    futureMat.uniforms.uTheme.value = isLight;
    pastMat.uniforms.uTime.value = time;
    pastMat.uniforms.uTheme.value = isLight;
    simultMat.uniforms.uTheme.value = isLight;

    const blend = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    nowFlare.material.blending = blend;
    nowFlare.material.color.set(isLight ? '#c83428' : '#ffe8c4');
    orbA.halo.material.blending = blend;
    orbB.halo.material.blending = blend;
    nowGem.rotation.y = time * 0.6;

    // 洛伦兹助推：同时面倾角 θ = atan(β)，运动观察者时间轴倾角对称向 45° 光锥收拢！
    const tiltAngle = Math.atan(beta);
    simultPlane.rotation.z = tiltAngle;
    tAxisPos[0] = -beta * CONE_H; tAxisPos[1] = -CONE_H; tAxisPos[2] = 0;
    tAxisPos[3] =  beta * CONE_H; tAxisPos[4] =  CONE_H; tAxisPos[5] = 0;
    tAxisGeo.attributes.position.needsUpdate = true;
    tAxisLine.material.color.set(isLight ? '#8a4814' : '#ffe29c');

    // 更新事件 A、B 3D 位置与因果连线
    orbA.group.position.set(evA.x * SCALE, evA.t * SCALE, 0);
    orbB.group.position.set(evB.x * SCALE, evB.t * SCALE, 0);
    linkPos[0] = orbA.group.position.x; linkPos[1] = orbA.group.position.y; linkPos[2] = 0;
    linkPos[3] = orbB.group.position.x; linkPos[4] = orbB.group.position.y; linkPos[5] = 0;
    linkGeo.attributes.position.needsUpdate = true;

    // 精确洛伦兹变换：t' = γ (t - β x)，s² = Δt² - Δx²
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    const tA = gamma * (evA.t - beta * evA.x);
    const tB = gamma * (evB.t - beta * evB.x);
    const dx = evB.x - evA.x;
    const dtEv = evB.t - evA.t;
    const s2 = dtEv * dtEv - dx * dx;
    let relation = 'spacelike';
    if (s2 > 0.02) relation = 'timelike';
    else if (Math.abs(s2) <= 0.02) relation = 'lightlike';

    linkMat.color.set(
      relation === 'timelike' ? (isLight ? '#236648' : '#58f2b2') :
      relation === 'lightlike' ? (isLight ? '#a86812' : '#ffe074') :
      (isLight ? '#c82820' : '#ff6448')
    );

    const diff = tB - tA;
    let order = 'simultaneous';
    if (diff > 1e-4) order = 'a_first';
    else if (diff < -1e-4) order = 'b_first';

    return {
      beta: +beta.toFixed(2),
      gamma: +gamma.toFixed(2),
      tA: +tA.toFixed(2),
      tB: +tB.toFixed(2),
      deltaT: +(tB - tA).toFixed(2),
      relation,
      order,
      preset,
    };
  }

  return { group, update, setBeta, setPreset };
}

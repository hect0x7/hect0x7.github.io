// Act 5: 05 · 因果光锥 · 回归奇点 (Pure Symmetric 45° Minkowski Causal Diamond & Primordial Singularity)
// 100% Pure Deep-Space Astrophysics: zero fog, zero bloom smear, ZERO off-center mini-cones or distractions!
// Features the monumental symmetric optical-glass & champagne-gold Future & Past 45° Light Cones,
// dark-sapphire cosmic-web "Now" spacelike hypersurface, 22 interior receding galaxies, isotropic Planck CMB
// Epoch Ring at y = -7.8, interactive Causal-Reach (Timelike/Null) vs Spacelike geodesic inspection arcs,
// and bottom-apex t = 0 Primordial Singularity Seed returning cleanly to Act 1 via singularity-morph.

const H_FUTURE = 10.5;   // Exact 45° Future Light Cone (y: 0 -> +10.5, r = y)
const H_CMB = 7.8;       // Exact 45° Past Light Cone to CMB Last-Scattering Ring (y: 0 -> -7.8, r = |y|)
const Y_SEED = -14.2;    // Bottom-apex Primordial Singularity Seed (t = 0)
const SEED_SCALE = 0.085;
const R_CORE_ACT1 = 1.65;
const R_CMB_ACT1 = 11.0;
const R_NOW = 19.0;      // Dark-sapphire "Now" spacelike hypersurface radius
const MAX_PULSES = 6;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function causalRadiusAtY(y) {
  if (y >= 0) return y;
  if (y >= -H_CMB) return -y;
  const u = Math.max(0, Math.min(1, (y - Y_SEED) / (-H_CMB - Y_SEED)));
  return H_CMB * Math.pow(u, 0.88);
}

// Pure Procedural Circular Pinprick Starfield Dome Shader (#03050a base, ZERO blocky square pixels)
const SPACE_SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SPACE_SKY_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vDir;

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec3 d = normalize(vDir);
    float galLat = dot(d, normalize(vec3(-0.32, 0.90, 0.28)));
    float mw = exp(-galLat * galLat * 24.0) * 0.008;

    vec3 starSum = vec3(0.0);
    for (int tier = 0; tier < 3; tier++) {
      float sc = tier == 0 ? 150.0 : (tier == 1 ? 260.0 : 410.0);
      vec3 cell = floor(d * sc);
      vec3 local = fract(d * sc) - 0.5;
      float rnd = hash13(cell + float(tier) * 29.17);
      float thresh = tier == 0 ? 0.986 : (tier == 1 ? 0.989 : 0.992);
      if (rnd > thresh) {
        vec3 j = vec3(hash13(cell + 1.3), hash13(cell + 2.7), hash13(cell + 5.1)) - 0.5;
        float dist = length(local - j * 0.55);
        float mag = (rnd - thresh) / (1.0 - thresh);
        float sz = mix(0.085, 0.17, mag * mag);
        float pin = smoothstep(sz, 0.0, dist);
        pin *= pin;
        float t = hash13(cell + 9.2);
        vec3 tint = t < 0.34 ? vec3(0.66, 0.84, 1.0) : (t < 0.72 ? vec3(0.98, 0.98, 1.0) : vec3(1.0, 0.86, 0.64));
        starSum += tint * pin * mix(0.38, 1.48, mag);
      }
    }

    vec3 col = vec3(0.0005, 0.0010, 0.0028) + vec3(0.28, 0.44, 0.85) * mw + starSum;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Optical Architectural Glass Light Cone Shader (clean Fresnel glass, razor-narrow golden causal wavefronts,
// transparent lower cone fade during singularity-morph!)
const CONE_GLASS_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CONE_GLASS_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uHover;
  uniform float uPulseUp[6];
  uniform float uPulseDown[6];
  uniform float uPulseAmp[6];

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 N = normalize(vWorldNormal);
    float ndotv = abs(dot(N, V));

    float fresnel = pow(1.0 - ndotv, 2.75);
    float rimTight = pow(1.0 - ndotv, 6.2);

    float y = vWorldPos.y;
    float phi = atan(vWorldPos.z, vWorldPos.x);

    float latLine = smoothstep(0.978, 0.997, abs(cos(y * 1.25)));
    float lonLine = smoothstep(0.990, 0.999, abs(cos(phi * 12.0)));
    float grid = (latLine * 0.20 + lonLine * 0.14) * smoothstep(0.25, 1.2, abs(y));

    vec3 keyDir = normalize(vec3(16.0, 26.0, 28.0));
    vec3 H = normalize(keyDir + V);
    float spec = pow(max(0.0, abs(dot(N, H))), 88.0) * 0.42;

    float pulseGlow = 0.0;
    for (int i = 0; i < 6; i++) {
      float amp = uPulseAmp[i];
      if (amp > 0.002) {
        if (y >= 0.0) {
          float d = abs(y - uPulseUp[i]);
          pulseGlow += exp(-d * d * 24.0) * amp * 1.25;
          pulseGlow += exp(-max(0.0, uPulseUp[i] - y) * 3.8) * step(y, uPulseUp[i]) * amp * 0.08;
        } else {
          float d = abs(y - uPulseDown[i]);
          pulseGlow += exp(-d * d * 24.0) * amp * 1.25;
          pulseGlow += exp(-max(0.0, y - uPulseDown[i]) * 3.8) * step(uPulseDown[i], y) * amp * 0.08;
        }
      }
    }

    float lowerApexClear = smoothstep(-14.0, -9.2, y);
    float camSeedDist = length(cameraPosition - vec3(0.0, -14.2, 0.0));
    float morphClear = smoothstep(3.2, 11.5, camSeedDist);
    float glassWeight = mix(0.14 * morphClear, 1.0, lowerApexClear) * mix(0.22, 1.0, morphClear);

    vec3 glassBase = vec3(0.012, 0.024, 0.064);
    vec3 goldFresnel = vec3(0.76, 0.54, 0.30);
    vec3 pulseCol = vec3(0.98, 0.78, 0.38);

    vec3 col = mix(glassBase, goldFresnel, 0.22 + 0.78 * fresnel) * (0.40 + 1.05 * fresnel)
             + vec3(0.96, 0.84, 0.62) * (rimTight * 0.82 + spec)
             + goldFresnel * grid * 0.72
             + pulseCol * pulseGlow * 1.25
             + vec3(0.95, 0.78, 0.44) * uHover * 0.14;

    float baseAlpha = (0.055 + fresnel * 0.28 + rimTight * 0.24 + grid * 0.14 + spec * 0.20 + uHover * 0.04) * glassWeight;
    float alpha = clamp(baseAlpha + pulseGlow * 0.44 * morphClear, 0.0, 0.82);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Isotropic Planck CMB Epoch Ring Shader (crisp blue-teal-gold patches, zero horizontal stretching)
const CMB_RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CMB_RING_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uCmbTex;
  varying vec2 vUv;

  void main() {
    vec2 sampUv = vec2(fract(vUv.x * 3.0), 0.44 + vUv.y * 0.12);
    vec3 raw = texture2D(uCmbTex, sampUv).rgb;
    vec3 lin = pow(max(raw, vec3(0.0)), vec3(2.2));
    float edge = smoothstep(0.14, 0.0, vUv.y) + smoothstep(0.86, 1.0, vUv.y);
    vec3 col = lin * 1.15 + vec3(0.82, 0.58, 0.26) * edge * 0.45;
    gl_FragColor = vec4(col, 0.94);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Clean Symmetric Dark-Sapphire "Now" Spacelike Hypersurface Plane Shader (y = 0, R = 19.0)
// Pure symmetric polar observatory grid + delicate sapphire-blue cosmic-web filaments + spacelike probe ping
const NOW_PLANE_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const NOW_PLANE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uPulseEnergy;
  uniform vec3 uProbePing; // xy: clicked spacelike XZ point, z: intensity (0..1)

  varying vec3 vWorldPos;

  const float PI = 3.14159265359;
  const float R_NOW = 19.0;

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  vec2 cosmicWeb(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash22(n + g);
        vec2 r = g + (0.16 + 0.68 * o) - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec2(sqrt(d2) - sqrt(d1), sqrt(d1));
  }

  void main() {
    vec2 p = vWorldPos.xz;
    float r = length(p);
    if (r > R_NOW) discard;

    float ang = atan(p.y, p.x);

    // 1) Deep translucent sapphire hypersurface glass (#081537 linearized)
    vec3 deepSapphire = vec3(0.004, 0.014, 0.064);
    vec3 midSapphire  = vec3(0.009, 0.030, 0.118);
    vec3 col = mix(midSapphire, deepSapphire, smoothstep(1.5, R_NOW, r));

    // 2) Delicate sapphire-blue cosmic-web filaments + tiny warm golden cluster nodes
    vec2 webA = cosmicWeb(p * 0.28 + vec2(1.3, -0.7));
    vec2 webB = cosmicWeb(p * 0.58 - vec2(2.1, 3.4));
    float filA = exp(-webA.x * 34.0);
    float filB = exp(-webB.x * 38.0) * 0.45;
    float tinyNodes = exp(-pow(webA.x, 2.0) * 420.0) * exp(-webB.x * 16.0);
    float webMask = smoothstep(2.0, 5.4, r) * smoothstep(R_NOW, R_NOW - 1.2, r);

    vec3 webSapphire = vec3(0.11, 0.28, 0.86);
    vec3 webGoldNode = vec3(0.95, 0.72, 0.34);
    col += (webSapphire * (filA * 0.58 + filB * 0.38) + webGoldNode * (filA * filB * 1.05 + tinyNodes * 1.15)) * webMask;

    // 3) Pure Symmetric Observatory Polar Coordinate Grid (8 concentric rings + 24 hairline spokes)
    float ringFreq = abs(sin(r * PI / 2.375));
    float ringLine = smoothstep(0.036, 0.0, ringFreq);
    float spokeDist = abs(sin(ang * 12.0)) * r;
    float spokeLine = smoothstep(0.044, 0.0, spokeDist) * smoothstep(0.6, 1.6, r);
    float gridAlpha = max(ringLine * 0.65, spokeLine * 0.42);

    vec3 gridCol = mix(vec3(0.18, 0.36, 0.74), vec3(0.76, 0.58, 0.34), smoothstep(11.5, R_NOW, r) * 0.52);
    col += gridCol * gridAlpha * 0.68;

    // 4) Interactive Spacelike Ping Ring on the "Now" plane when user probes the spacelike region
    if (uProbePing.z > 0.01) {
      float dp = length(p - uProbePing.xy);
      float ringR = (1.0 - uProbePing.z) * 4.2 + 0.35;
      float pRing = exp(-pow((dp - ringR) / 0.14, 2.0)) * uProbePing.z;
      float pDot = exp(-dp * dp * 3.8) * uProbePing.z;
      col += vec3(0.38, 0.72, 1.0) * (pRing * 1.25 + pDot * 1.45);
    }

    // 5) Crisp hairline outer rim glow & central Present-Event radiance
    float outerRim = exp(-pow(r - (R_NOW - 0.10), 2.0) * 24.0);
    float centerGlow = exp(-r * r * 0.52) * (0.85 + uPulseEnergy * 0.55);
    col += vec3(0.94, 0.78, 0.48) * (outerRim * 0.75 + centerGlow * 0.75);

    float alpha = clamp(0.42 + gridAlpha * 0.22 + (filA * 0.18 + tinyNodes * 0.28) * webMask + outerRim * 0.40, 0.12, 0.84);
    alpha *= smoothstep(R_NOW + 0.05, R_NOW - 0.10, r);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Incandescent Planck Singularity Seed Core Shader (matches Act 1 Big Bang core at scale k = 0.085)
const SEED_CORE_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SEED_CORE_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;
  uniform float uTime;
  uniform float uHover;
  void main() {
    float ndotv = max(0.0, dot(normalize(vNormal), normalize(vViewDir)));
    float conv = 0.5 + 0.5 * sin(vLocalPos.x * 28.0 + uTime * 2.2) * cos(vLocalPos.y * 28.0 - uTime * 1.8);
    vec3 hotCore = vec3(1.12, 1.04, 0.92);
    vec3 warmGold = vec3(0.95, 0.60, 0.20);
    vec3 col = mix(warmGold, hotCore, smoothstep(0.12, 0.82, ndotv) * (0.85 + 0.15 * conv));
    col *= (1.0 + uHover * 0.35);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createWorld(THREE, shared) {
  const disposables = [];
  const trackGeo = (g) => { disposables.push(g); return g; };
  const trackMat = (m) => { disposables.push(m); return m; };

  const scene = new THREE.Scene();
  scene.fog = null;
  scene.background = new THREE.Color(0x03050a);
  if (shared && shared.envMap) {
    scene.environment = shared.envMap;
  }

  const entryPos = new THREE.Vector3(0, 5.4, 42.0);
  const entryLookAt = new THREE.Vector3(0, -1.9, 0);
  const entryFov = 42;

  const camera = new THREE.PerspectiveCamera(
    entryFov,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.05,
    800
  );
  camera.position.copy(entryPos);
  camera.lookAt(entryLookAt);

  // --- 1. Deep-Space Observatory Lighting Rig ---
  const presentLight = new THREE.PointLight(0xfff7e0, 2.2, 28, 1.35);
  presentLight.position.set(0, 0, 0);
  scene.add(presentLight);

  const seedLight = new THREE.PointLight(0xffd48a, 1.5, 11, 1.4);
  seedLight.position.set(0, Y_SEED, 0);
  scene.add(seedLight);

  const keyDirLight = new THREE.DirectionalLight(0xd6e6ff, 1.15);
  keyDirLight.position.set(16, 26, 28);
  scene.add(keyDirLight);

  const ambientFill = new THREE.AmbientLight(0x16223a, 0.45);
  scene.add(ambientFill);

  // --- 2. Pure Deep-Space Circular Starfield Dome & Distant Outer Deep-Field Galaxies ---
  const cmbTex = shared && shared.textures && shared.textures.createPlanckCMBTexture
    ? shared.textures.createPlanckCMBTexture()
    : null;
  const sparkTex = shared && shared.textures && shared.textures.createOpticalSparkTexture
    ? shared.textures.createOpticalSparkTexture(128)
    : null;
  const galaxyTextures = [0, 1, 2].map((v) =>
    shared && shared.textures && shared.textures.createSpiralGalaxyTexture
      ? shared.textures.createSpiralGalaxyTexture(v)
      : null
  );

  const skyGeo = trackGeo(new THREE.SphereGeometry(280, 48, 32));
  const skyMat = trackMat(new THREE.ShaderMaterial({
    vertexShader: SPACE_SKY_VERT,
    fragmentShader: SPACE_SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
  }));
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  const bgGalaxySpecs = [
    [29, 14, -46, 5.2, 0.45, 0],
    [-34, 9, -52, 4.4, -0.62, 1],
    [25, -18, -42, 4.6, 0.72, 2],
    [-26, -15, -48, 3.8, -0.35, 0],
  ];
  bgGalaxySpecs.forEach(([gx, gy, gz, sc, rot, v]) => {
    const mat = trackMat(new THREE.SpriteMaterial({
      map: galaxyTextures[v],
      color: 0xdce6ff,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      rotation: rot,
    }));
    const sp = new THREE.Sprite(mat);
    sp.position.set(gx, gy, gz);
    sp.scale.set(sc, sc * 0.64, 1);
    scene.add(sp);
  });

  // --- 3. Symmetric Optical-Glass & Champagne-Gold Double 45° Minkowski Light Cone ---
  const coneGroup = new THREE.Group();
  coneGroup.name = 'minkowski-causal-diamond';
  scene.add(coneGroup);

  const goldWireMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0xe5c6a3,
    emissive: 0x6b4c22,
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.22,
    envMapIntensity: 1.4,
  }));

  const goldHairlineMat = trackMat(new THREE.LineBasicMaterial({
    color: 0xe5c6a3,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  }));

  const pulseUp = new Float32Array(MAX_PULSES).fill(-20);
  const pulseDown = new Float32Array(MAX_PULSES).fill(20);
  const pulseAmp = new Float32Array(MAX_PULSES).fill(0);
  const pulseActive = new Array(MAX_PULSES).fill(false);
  let nextPulseSlot = 0;

  const coneGlassMat = trackMat(new THREE.ShaderMaterial({
    vertexShader: CONE_GLASS_VERT,
    fragmentShader: CONE_GLASS_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uPulseUp: { value: pulseUp },
      uPulseDown: { value: pulseDown },
      uPulseAmp: { value: pulseAmp },
    },
  }));

  // 3a) Future Light Cone (y: 0 -> +10.5, exact 45° half-angle)
  const futureGeo = trackGeo(new THREE.CylinderGeometry(H_FUTURE, 0.02, H_FUTURE, 84, 20, true));
  futureGeo.translate(0, H_FUTURE * 0.5, 0);
  const futureConeMesh = new THREE.Mesh(futureGeo, coneGlassMat);
  futureConeMesh.renderOrder = 4;
  futureConeMesh.name = 'future-light-cone';
  coneGroup.add(futureConeMesh);

  // 3b) Past Light Cone Upper 45° Expansion (y: 0 -> -7.8, r: 0 -> 7.8)
  const pastUpperGeo = trackGeo(new THREE.CylinderGeometry(0.02, H_CMB, H_CMB, 84, 18, true));
  pastUpperGeo.translate(0, -H_CMB * 0.5, 0);
  const pastUpperMesh = new THREE.Mesh(pastUpperGeo, coneGlassMat);
  pastUpperMesh.renderOrder = 4;
  pastUpperMesh.name = 'past-light-cone';
  coneGroup.add(pastUpperMesh);

  // 3c) Lower Re-Converging Cosmological Causal Cone (y: -7.8 -> -14.2, r: 7.8 -> 0)
  const lowerProfile = [];
  const lowerSteps = 22;
  for (let i = 0; i <= lowerSteps; i++) {
    const t = i / lowerSteps;
    const y = Y_SEED + t * (-H_CMB - Y_SEED);
    const r = Math.max(0.015, causalRadiusAtY(y));
    lowerProfile.push(new THREE.Vector2(r, y));
  }
  const pastLowerGeo = trackGeo(new THREE.LatheGeometry(lowerProfile, 84));
  const pastLowerMesh = new THREE.Mesh(pastLowerGeo, coneGlassMat);
  pastLowerMesh.renderOrder = 4;
  pastLowerMesh.name = 'past-reconverging-cone';
  coneGroup.add(pastLowerMesh);

  // 3d) Champagne-Gold Rim & Proper-Time Latitude Rings
  const addGoldRing = (y, tubeR = 0.030) => {
    const r = causalRadiusAtY(y);
    if (r < 0.08) return;
    const g = trackGeo(new THREE.TorusGeometry(r, tubeR, 10, 96));
    g.rotateX(Math.PI * 0.5);
    const m = new THREE.Mesh(g, goldWireMat);
    m.position.y = y;
    coneGroup.add(m);
  };

  addGoldRing(H_FUTURE, 0.064);
  [2.6, 5.2, 7.8].forEach((y) => addGoldRing(y, 0.022));
  [-2.0, -4.0, -6.0].forEach((y) => addGoldRing(y, 0.022));
  [-9.2, -10.5, -11.7, -12.7, -13.45].forEach((y) => addGoldRing(y, 0.018));

  // 12 Crisp Champagne-Gold Meridian Generatrix Lines along Future + Past + Re-converging Cones
  const meridianPts = [];
  const meridianCount = 12;
  for (let i = 0; i < meridianCount; i++) {
    const a = (i / meridianCount) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    meridianPts.push(0, 0, 0, ca * H_FUTURE, H_FUTURE, sa * H_FUTURE);
    meridianPts.push(0, 0, 0, ca * H_CMB, -H_CMB, sa * H_CMB);
    for (let s = 0; s < 10; s++) {
      const y0 = -H_CMB + (s / 10) * (Y_SEED + H_CMB);
      const y1 = -H_CMB + ((s + 1) / 10) * (Y_SEED + H_CMB);
      const r0 = causalRadiusAtY(y0);
      const r1 = causalRadiusAtY(y1);
      meridianPts.push(ca * r0, y0, sa * r0, ca * r1, y1, sa * r1);
    }
  }
  meridianPts.push(0, Y_SEED, 0, 0, H_FUTURE, 0);

  const meridianGeo = trackGeo(new THREE.BufferGeometry());
  meridianGeo.setAttribute('position', new THREE.Float32BufferAttribute(meridianPts, 3));
  const meridianLines = new THREE.LineSegments(meridianGeo, goldHairlineMat);
  meridianLines.renderOrder = 5;
  coneGroup.add(meridianLines);

  // 3e) Isotropic Planck CMB Last-Scattering Epoch Ring at y = -7.8, r = 7.8
  const cmbRingGeo = trackGeo(new THREE.CylinderGeometry(H_CMB + 0.08, H_CMB + 0.08, 0.68, 96, 1, true));
  const cmbRingMat = trackMat(new THREE.ShaderMaterial({
    vertexShader: CMB_RING_VERT,
    fragmentShader: CMB_RING_FRAG,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: { uCmbTex: { value: cmbTex } },
  }));
  const cmbRingMesh = new THREE.Mesh(cmbRingGeo, cmbRingMat);
  cmbRingMesh.position.y = -H_CMB;
  cmbRingMesh.renderOrder = 6;
  cmbRingMesh.name = 'planck-cmb-epoch-ring';
  coneGroup.add(cmbRingMesh);
  addGoldRing(-H_CMB + 0.34, 0.042);
  addGoldRing(-H_CMB - 0.34, 0.042);

  // 3f) Present-Moment Event Waist Jewel (t = now at (0, 0, 0))
  const apexCore = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.24, 18, 14)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xfffffe }))
  );
  coneGroup.add(apexCore);

  const apexFlare = new THREE.Sprite(trackMat(new THREE.SpriteMaterial({
    map: sparkTex,
    color: 0xfae3a7,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })));
  apexFlare.scale.set(3.0, 3.0, 1);
  apexFlare.renderOrder = 7;
  coneGroup.add(apexFlare);

  // 3g) Luminous Miniature Receding Spiral Galaxies & Star Clusters INSIDE the Past & Future Cones
  const randGal = mulberry32(404138);
  const interiorGalaxies = [];
  for (let i = 0; i < 22; i++) {
    const inLower = i >= 15;
    const y = inLower
      ? -H_CMB - 0.7 - randGal() * 4.2
      : -1.4 - randGal() * (H_CMB - 2.1);
    const maxR = Math.max(0.4, causalRadiusAtY(y) * 0.74);
    const r = (0.18 + 0.82 * Math.sqrt(randGal())) * maxR;
    const ang = randGal() * Math.PI * 2;
    const variant = i % 3;
    const sc = inLower ? (0.75 + randGal() * 0.75) : (1.15 + randGal() * 1.45);
    const mat = trackMat(new THREE.SpriteMaterial({
      map: galaxyTextures[variant],
      color: inLower ? 0xf6d8a6 : 0xfff4e2,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      rotation: randGal() * Math.PI * 2,
    }));
    const sp = new THREE.Sprite(mat);
    sp.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    sp.scale.set(sc, sc * (0.58 + randGal() * 0.25), 1);
    sp.renderOrder = 3;
    coneGroup.add(sp);
    interiorGalaxies.push({ sprite: sp, mat, y, baseOpacity: 0.80, baseScaleX: sc, baseScaleY: sp.scale.y });
  }
  for (let i = 0; i < 8; i++) {
    const y = 2.4 + randGal() * 6.8;
    const maxR = causalRadiusAtY(y) * 0.72;
    const r = (0.2 + 0.8 * Math.sqrt(randGal())) * maxR;
    const ang = randGal() * Math.PI * 2;
    const sc = 0.95 + randGal() * 1.1;
    const mat = trackMat(new THREE.SpriteMaterial({
      map: galaxyTextures[i % 3],
      color: 0xcfe2ff,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      rotation: randGal() * Math.PI * 2,
    }));
    const sp = new THREE.Sprite(mat);
    sp.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
    sp.scale.set(sc, sc * 0.62, 1);
    sp.renderOrder = 3;
    coneGroup.add(sp);
    interiorGalaxies.push({ sprite: sp, mat, y, baseOpacity: 0.50, baseScaleX: sc, baseScaleY: sp.scale.y });
  }

  // --- 4. Pure Symmetric Dark-Sapphire "Now" Spacelike Hypersurface Plane (y = 0, R = 19.0) ---
  const nowGeo = trackGeo(new THREE.CircleGeometry(R_NOW, 108));
  nowGeo.rotateX(-Math.PI * 0.5);
  const nowMat = trackMat(new THREE.ShaderMaterial({
    vertexShader: NOW_PLANE_VERT,
    fragmentShader: NOW_PLANE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPulseEnergy: { value: 0 },
      uProbePing: { value: new THREE.Vector3(0, 0, 0) },
    },
  }));
  const nowPlaneMesh = new THREE.Mesh(nowGeo, nowMat);
  nowPlaneMesh.renderOrder = 2;
  nowPlaneMesh.name = 'now-spacelike-hypersurface';
  scene.add(nowPlaneMesh);

  const nowRimGeo = trackGeo(new THREE.TorusGeometry(R_NOW, 0.062, 10, 128));
  nowRimGeo.rotateX(Math.PI * 0.5);
  const nowRimMesh = new THREE.Mesh(nowRimGeo, goldWireMat);
  scene.add(nowRimMesh);

  // --- 5. Ephemeral Geodesic Probe Arc (shows Causal-Reach golden arc vs Spacelike cyan arc from (0,0,0)!) ---
  const ARC_SEGS = 44;
  const probeArcPositions = new Float32Array((ARC_SEGS + 1) * 3);
  const probeArcGeo = trackGeo(new THREE.BufferGeometry());
  probeArcGeo.setAttribute('position', new THREE.BufferAttribute(probeArcPositions, 3));
  const probeArcMat = trackMat(new THREE.LineBasicMaterial({
    color: 0xffe49e,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const probeArcLine = new THREE.Line(probeArcGeo, probeArcMat);
  probeArcLine.renderOrder = 8;
  probeArcLine.visible = false;
  scene.add(probeArcLine);

  const probeEndSpark = new THREE.Sprite(trackMat(new THREE.SpriteMaterial({
    map: sparkTex,
    color: 0xffe49e,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })));
  probeEndSpark.scale.set(1.65, 1.65, 1);
  probeEndSpark.renderOrder = 8;
  probeEndSpark.visible = false;
  scene.add(probeEndSpark);

  let probeArcLife = 0; // 1.0 -> 0.0 decay over ~3.4s

  function spawnGeodesicArc(targetPoint, isCausal) {
    const start = new THREE.Vector3(0, 0, 0);
    const end = targetPoint.clone();
    const mid = start.clone().lerp(end, 0.5);
    if (isCausal) {
      // Gentle inward timelike/null curve hugging inside the causal cone
      mid.multiplyScalar(0.84);
      probeArcMat.color.setHex(0xffe296);
      probeEndSpark.material.color.setHex(0xffe296);
    } else {
      // Subtle arching spacelike separation curve above the "Now" plane
      mid.y += 1.65;
      probeArcMat.color.setHex(0x6ec4ff);
      probeEndSpark.material.color.setHex(0x6ec4ff);
      nowMat.uniforms.uProbePing.value.set(end.x, end.z, 1.0);
    }

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = curve.getPoints(ARC_SEGS);
    const attr = probeArcGeo.attributes.position;
    for (let i = 0; i <= ARC_SEGS; i++) {
      attr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
    }
    attr.needsUpdate = true;
    probeArcLine.visible = true;
    probeEndSpark.position.copy(end);
    probeEndSpark.visible = true;
    probeArcLife = 1.0;
  }

  // --- 6. Active 3D Expanding Crisp Golden 45° Causal Light-Pulse Ring Pool ---
  const pulseRings = [];
  const unitRingGeo = trackGeo(new THREE.TorusGeometry(1.0, 0.011, 10, 84));
  unitRingGeo.rotateX(Math.PI * 0.5);
  for (let i = 0; i < MAX_PULSES; i++) {
    const pMat = trackMat(new THREE.MeshBasicMaterial({
      color: 0xffdf8e,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    const upRing = new THREE.Mesh(unitRingGeo, pMat);
    const downRing = new THREE.Mesh(unitRingGeo, pMat);
    upRing.visible = false;
    downRing.visible = false;
    upRing.renderOrder = 7;
    downRing.renderOrder = 7;
    coneGroup.add(upRing, downRing);
    pulseRings.push({ upRing, downRing, mat: pMat });
  }

  // --- 7. Bottom-Apex Primordial Singularity Seed (t = 0, exact k = 0.085 match-cut back to Act 1!) ---
  const seedOrigin = new THREE.Vector3(0, Y_SEED, 0);
  const seedGroup = new THREE.Group();
  seedGroup.position.copy(seedOrigin);
  seedGroup.name = 'primordial-singularity-seed';
  scene.add(seedGroup);

  const seedCoreMat = trackMat(new THREE.ShaderMaterial({
    vertexShader: SEED_CORE_VERT,
    fragmentShader: SEED_CORE_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
    },
  }));
  const seedCoreMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(R_CORE_ACT1 * SEED_SCALE, 28, 20)),
    seedCoreMat
  );
  seedGroup.add(seedCoreMesh);

  const baoMicroMat = trackMat(new THREE.MeshBasicMaterial({
    color: 0xf8bb72,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  [2.6, 4.0, 5.8].forEach((rAct1, idx) => {
    const ring = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(rAct1 * SEED_SCALE, 0.008, 8, 48)),
      baoMicroMat
    );
    ring.rotation.x = idx === 1 ? Math.PI * 0.5 : 0.35 * idx;
    ring.rotation.y = 0.6 * idx;
    seedGroup.add(ring);
  });

  const microCmbAura = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(R_CMB_ACT1 * SEED_SCALE, 28, 20, Math.PI * 0.72, Math.PI * 1.56)),
    trackMat(new THREE.MeshBasicMaterial({
      map: cmbTex,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }))
  );
  seedGroup.add(microCmbAura);

  const seedFlare = new THREE.Sprite(trackMat(new THREE.SpriteMaterial({
    map: sparkTex,
    color: 0xffe3a6,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })));
  seedFlare.scale.set(2.1, 2.1, 1);
  seedFlare.renderOrder = 8;
  seedGroup.add(seedFlare);

  const seedHitMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.75, 20, 16)),
    trackMat(new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      colorWrite: false,
    }))
  );
  seedHitMesh.position.copy(seedOrigin);
  seedHitMesh.name = 'primordial-singularity-portal';
  seedHitMesh.userData.portalTarget = 'bigbang';
  scene.add(seedHitMesh);

  const singularityAnchor = {
    origin: seedOrigin.clone(),
    scale: SEED_SCALE,
    rotationY: 0,
    matchCamPos: new THREE.Vector3(0, -14.081, 2.6775),
    matchLookAt: new THREE.Vector3(0, -14.2, 0),
  };

  let hoverConeTarget = 0;
  let hoverConeSmooth = 0;
  let hoverSeedTarget = 0;
  let hoverSeedSmooth = 0;
  let apexFlash = 0;
  let storyBeat = 0;

  function triggerCausalAudio(ctx) {
    if (!ctx) return;
    if (typeof ctx.triggerAudio === 'function') {
      ctx.triggerAudio('causalPulse');
    } else if (ctx.audio && typeof ctx.audio.playCausalBell === 'function') {
      ctx.audio.playCausalBell();
    }
  }

  function emitCausalPulse(ctx) {
    const slot = nextPulseSlot;
    nextPulseSlot = (nextPulseSlot + 1) % MAX_PULSES;

    pulseActive[slot] = true;
    pulseUp[slot] = 0.08;
    pulseDown[slot] = -0.08;
    pulseAmp[slot] = 1.0;
    apexFlash = 1.0;

    const pair = pulseRings[slot];
    pair.upRing.visible = true;
    pair.downRing.visible = true;
    pair.upRing.position.y = 0.08;
    pair.downRing.position.y = -0.08;
    pair.upRing.scale.setScalar(0.08);
    pair.downRing.scale.setScalar(0.08);
    pair.mat.opacity = 0.88;

    triggerCausalAudio(ctx);
  }

  function setParam(v) {
    if (Number(v) > 0.5) {
      emitCausalPulse(null);
    }
  }

  function triggerAction(ctx) {
    emitCausalPulse(ctx);
    spawnGeodesicArc(new THREE.Vector3(3.6, -5.2, 2.2), true);
    ctx?.setNarrative?.(
      '「类时 / 类光 · 因果相连」凡光脉冲所及之处，皆与此刻存在真实因果关联',
      '轻触蓝色「此刻」平面探查类空边界，或轻触底端原点重返宇宙暴胀'
    );
  }

  function advanceStory(ctx) {
    if (storyBeat === 0) {
      storyBeat = 1;
      emitCausalPulse(ctx);
      spawnGeodesicArc(new THREE.Vector3(3.2, -5.4, 2.4), true);
      ctx?.setNarrative?.(
        '「类时 / 类光 · 因果相连」凡光脉冲所及之处，皆与此刻存在真实因果关联',
        '轻触蓝色「此刻」平面探查类空边界，或轻触底端原点重返宇宙暴胀'
      );
      return true;
    }
    if (storyBeat === 1) {
      storyBeat = 2;
      emitCausalPulse(ctx);
      spawnGeodesicArc(new THREE.Vector3(11.4, 0.0, 2.2), false);
      ctx?.setNarrative?.(
        '「类空 · 因果不可达」超出光速极限的此刻星海，彼此尚未互通消息',
        '顺着过去光锥回望时间尽头 · 轻触底端原点，重返宇宙暴胀'
      );
      return true;
    }
    return false;
  }

  function update(dt, elapsed) {
    const safeDt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);

    coneGlassMat.uniforms.uTime.value = elapsed;
    nowMat.uniforms.uTime.value = elapsed;
    seedCoreMat.uniforms.uTime.value = elapsed;

    hoverConeSmooth += (hoverConeTarget - hoverConeSmooth) * (1 - Math.exp(-safeDt * 8.0));
    coneGlassMat.uniforms.uHover.value = hoverConeSmooth;

    hoverSeedSmooth += (hoverSeedTarget - hoverSeedSmooth) * (1 - Math.exp(-safeDt * 8.0));
    seedCoreMat.uniforms.uHover.value = hoverSeedSmooth;

    apexFlash = Math.max(0, apexFlash - safeDt * 2.2);
    const waistSc = 2.9 + 0.22 * Math.sin(elapsed * 2.2) + apexFlash * 1.7;
    apexFlare.scale.set(waistSc, waistSc, 1);
    presentLight.intensity = 2.2 + apexFlash * 2.4;

    const seedSc = 2.0 + 0.18 * Math.sin(elapsed * 2.6 + 1.0) + hoverSeedSmooth * 0.75;
    seedFlare.scale.set(seedSc, seedSc, 1);
    cmbRingMesh.rotation.y = elapsed * 0.025;

    // Fade ephemeral Causal/Spacelike geodesic probe arc & plane ping cleanly
    if (probeArcLife > 0) {
      probeArcLife = Math.max(0, probeArcLife - safeDt * 0.28);
      const easeA = Math.min(1, probeArcLife * 2.2);
      probeArcMat.opacity = 0.88 * easeA;
      probeEndSpark.material.opacity = 0.92 * easeA;
      const sc = 1.45 + (1 - probeArcLife) * 0.65;
      probeEndSpark.scale.set(sc, sc, 1);
      if (probeArcLife <= 0.001) {
        probeArcLine.visible = false;
        probeEndSpark.visible = false;
      }
    }
    if (nowMat.uniforms.uProbePing.value.z > 0) {
      nowMat.uniforms.uProbePing.value.z = Math.max(0, nowMat.uniforms.uProbePing.value.z - safeDt * 0.55);
    }

    let totalPulseEnergy = 0;
    const speedUp = 6.8;
    const speedDown = 9.2;
    for (let i = 0; i < MAX_PULSES; i++) {
      if (!pulseActive[i]) continue;
      pulseUp[i] += safeDt * speedUp;
      pulseDown[i] -= safeDt * speedDown;
      const frac = Math.min(1.05, pulseUp[i] / H_FUTURE);
      if (frac >= 1.04) {
        pulseActive[i] = false;
        pulseUp[i] = -20;
        pulseDown[i] = 20;
        pulseAmp[i] = 0;
        pulseRings[i].upRing.visible = false;
        pulseRings[i].downRing.visible = false;
      } else {
        const amp = Math.sin(Math.min(1, frac) * Math.PI * 0.88) * (1 - Math.max(0, (frac - 0.72) / 0.32));
        pulseAmp[i] = Math.max(0, amp);
        totalPulseEnergy += pulseAmp[i];

        const yUp = Math.min(H_FUTURE, pulseUp[i]);
        const rUp = Math.max(0.05, causalRadiusAtY(yUp));
        const yDn = Math.max(Y_SEED, pulseDown[i]);
        const rDn = Math.max(0.05, causalRadiusAtY(yDn));

        const pair = pulseRings[i];
        pair.upRing.position.y = yUp;
        pair.upRing.scale.set(rUp, 1.0 + rUp * 0.025, rUp);
        pair.downRing.position.y = yDn;
        pair.downRing.scale.set(rDn, 1.0 + rDn * 0.025, rDn);
        pair.mat.opacity = Math.min(1, pulseAmp[i] * 0.88);
      }
    }
    nowMat.uniforms.uPulseEnergy.value = Math.min(1.5, totalPulseEnergy);

    for (let g = 0; g < interiorGalaxies.length; g++) {
      const gal = interiorGalaxies[g];
      let boost = 0;
      for (let i = 0; i < MAX_PULSES; i++) {
        if (!pulseActive[i]) continue;
        const py = gal.y >= 0 ? pulseUp[i] : pulseDown[i];
        const d = Math.abs(gal.y - py);
        boost += Math.exp(-d * d * 0.85) * pulseAmp[i];
      }
      const b = Math.min(1.0, boost);
      gal.mat.opacity = Math.min(1.0, gal.baseOpacity + b * 0.35);
      const sMult = 1.0 + b * 0.22;
      gal.sprite.scale.set(gal.baseScaleX * sMult, gal.baseScaleY * sMult, 1);
    }
  }

  function onEnter(ctx) {
    hoverConeTarget = 0;
    hoverConeSmooth = 0;
    hoverSeedTarget = 0;
    hoverSeedSmooth = 0;
    storyBeat = 0;
    probeArcLife = 0;
    probeArcLine.visible = false;
    probeEndSpark.visible = false;
    nowMat.uniforms.uProbePing.value.set(0, 0, 0);

    emitCausalPulse(ctx);
    if (ctx && typeof ctx.setHoverLabel === 'function') {
      ctx.setHoverLabel('');
    }
    ctx?.setNarrative?.(
      '越过黑洞视界，宇宙的过去与未来被 45° 光锥清晰划界',
      '轻触光锥或蓝色此刻平面检验因果边界，轻触底端奇点重返宇宙暴胀'
    );
  }

  function onLeave(ctx) {
    hoverConeTarget = 0;
    hoverSeedTarget = 0;
    if (ctx && typeof ctx.setHoverLabel === 'function') {
      ctx.setHoverLabel('');
    }
  }

  function onPointerMove(raycaster) {
    const seedHits = raycaster.intersectObject(seedHitMesh, false);
    if (seedHits.length > 0) {
      hoverSeedTarget = 1;
      hoverConeTarget = 0;
      return { cursor: 'pointer', hoverLabel: '时间原点奇点 (t = 0) · 重返宇宙暴胀' };
    }
    hoverSeedTarget = 0;

    const coneHits = raycaster.intersectObjects([futureConeMesh, pastUpperMesh, pastLowerMesh], false);
    if (coneHits.length > 0) {
      hoverConeTarget = 1;
      return { cursor: 'pointer', hoverLabel: '45° 因果光锥 · 轻触发射光脉冲（类时 / 类光）' };
    }
    hoverConeTarget = 0;

    const nowHits = raycaster.intersectObject(nowPlaneMesh, false);
    if (nowHits.length > 0 && nowHits[0].point.length() > 1.4) {
      return { cursor: 'pointer', hoverLabel: '此刻类空平面 · 轻触探查因果不可达边界' };
    }

    return null;
  }

  function onClick(raycaster, ctx) {
    // 1. Click bottom Primordial Singularity Seed -> recursive singularity-morph back to Act 1 Inflation Apex!
    const seedHits = raycaster.intersectObject(seedHitMesh, false);
    if (seedHits.length > 0) {
      if (ctx && typeof ctx.setHoverLabel === 'function') {
        ctx.setHoverLabel('');
      }
      return { action: 'transition', to: 'bigbang', mode: 'singularity-morph' };
    }

    // 2. Click Past/Future Light Cones -> emit 45° golden Causal Light-Pulse + golden Causal-Reach geodesic arc!
    const coneHits = raycaster.intersectObjects([futureConeMesh, pastUpperMesh, pastLowerMesh], false);
    if (coneHits.length > 0) {
      const pt = coneHits[0].point.clone();
      emitCausalPulse(ctx);
      spawnGeodesicArc(pt, true);
      storyBeat = Math.max(storyBeat, 1);
      ctx?.setNarrative?.(
        '「类时 / 类光 · 因果相连」此处的星光与此刻存在真实因果关联',
        '轻触蓝色「此刻」平面探查类空边界，或轻触底端原点重返宇宙暴胀'
      );
      if (ctx && ctx.avatar && typeof ctx.avatar.flyTo === 'function') {
        ctx.avatar.flyTo(pt);
      }
      return true;
    }

    // 3. Click dark-sapphire "Now" Spacelike Hypersurface -> emit 45° pulse + cyan Spacelike separation arc!
    const nowHits = raycaster.intersectObject(nowPlaneMesh, false);
    if (nowHits.length > 0 && nowHits[0].point.length() > 1.2) {
      const pt = nowHits[0].point.clone();
      emitCausalPulse(ctx);
      spawnGeodesicArc(pt, false);
      storyBeat = Math.max(storyBeat, 2);
      ctx?.setNarrative?.(
        '「类空 · 因果不可达」超出光速极限的此刻星海，彼此尚未互通消息',
        '顺着过去光锥回望时间尽头 · 轻触底端原点，重返宇宙暴胀'
      );
      if (ctx && ctx.avatar && typeof ctx.avatar.flyTo === 'function') {
        ctx.avatar.flyTo(pt);
      }
      return true;
    }

    return false;
  }

  function onKeyAction(key, ctx) {
    if (key === 'Space') {
      triggerAction(ctx);
    }
  }

  function dispose() {
    for (const item of disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
  }

  return {
    id: 'lightcone',
    title: '05 · 因果光锥 · 回归奇点',
    subtitle: 'V · MINKOWSKI LIGHT CONE & SINGULARITY',
    shortLabel: '05 光锥',
    defaultHint: '轻触光锥或蓝色此刻平面检验因果边界，轻触底端奇点重返宇宙暴胀',
    scene,
    camera,
    entryPose: {
      pos: entryPos,
      lookAt: entryLookAt,
      fov: entryFov,
    },
    avatarAnchor: new THREE.Vector3(-8.2, 4.6, 22.0),
    guideTarget: new THREE.Vector3(0, Y_SEED, 0),
    singularityAnchor,
    paramConfig: {
      label: '因果脉冲',
      min: 0,
      max: 1,
      initial: 0.0,
      format: () => '45° 因果光锥',
      actionLabel: '因果光脉冲',
    },
    setParam,
    triggerAction,
    advanceStory,
    update,
    onEnter,
    onLeave,
    onPointerMove,
    onClick,
    onKeyAction,
    dispose,
  };
}

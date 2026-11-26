// Act 1: 01 · 奇点与宇宙暴胀 (Pure Deep-Space Astrophysics — Horizontal 3D Cosmic Inflation Trumpet)
// Left-to-right 13.8 Gyr spacetime expansion trumpet (x = -16.0 apex singularity -> x = +16.0 bell mouth):
// Planck quantum point -> golden inflation plasma -> vertical Planck CMB slice -> Dark Ages & Pop-III stars
// -> dark-energy accelerated bell mouth filled with 3D spiral galaxies & golden-cobalt cosmic-web filaments.
// Zero fog, zero UnrealBloomPass, zero workbench sliders.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const X_MIN = -16.0;
const X_MAX = 16.0;
const X_SPAN = X_MAX - X_MIN; // 32.0
const U_CMB = 5.5 / 32.0;     // 0.171875 -> x = -10.5

/**
 * Exact Cosmic Inflation Trumpet radius profile R(u) for u in [0, 1] (x = -16 + 32*u):
 * - u = 0.000 (x = -16.0): apex singularity R = 0.08
 * - u = 0.172 (x = -10.5): abrupt inflation flare -> R_cmb = 3.00
 * - u = 0.531 (x = +1.0):  gentle matter-dominated expansion -> R = 3.85
 * - u = 1.000 (x = +16.0): dark-energy concave acceleration -> R_mouth = 8.80
 */
function trumpetRadius(u) {
  const uc = Math.max(0, Math.min(1, u));
  if (uc <= U_CMB) {
    const t = uc / U_CMB;
    // Sleek tapered exponential-like inflation cone matching v4_01_trumpet.png
    return 0.08 + 2.92 * Math.pow(t, 0.88);
  }
  const t = (uc - U_CMB) / (1.0 - U_CMB); // 0 at CMB -> 1 at right bell mouth
  // Gentle linear expansion through Dark Ages + concave dark-energy acceleration into wide right mouth
  return 3.0 + 1.35 * t + 4.45 * Math.pow(t, 2.55);
}

/**
 * Crisp circular deep-space pinprick starfield (ShaderMaterial Points — zero square pixels!).
 */
function createCircularStarfield(THREE, count, minR, maxR, seed, disposables) {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xcfe4ff),
    new THREE.Color(0xffe5b8),
    new THREE.Color(0xa6c8ff),
    new THREE.Color(0xffd296),
  ];

  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const r = minR + rand() * (maxR - minR);
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    positions[i * 3] = Math.cos(phi) * s * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(phi) * s * r;

    const c = palette[Math.floor(rand() * palette.length)];
    const bright = 0.38 + Math.pow(rand(), 2.0) * 0.62;
    colors[i * 3] = c.r * bright;
    colors[i * 3 + 1] = c.g * bright;
    colors[i * 3 + 2] = c.b * bright;
    sizes[i] = 1.4 + Math.pow(rand(), 3.2) * 3.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  disposables.push(geo);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * (220.0 / max(-mv.z, 1.0)), 1.1, 5.8);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        vec2 p = (gl_PointCoord - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float core = exp(-r * r * 6.0);
        float rim = smoothstep(1.0, 0.25, r) * 0.28;
        float a = clamp(core + rim, 0.0, 1.0);
        gl_FragColor = vec4(vColor * (core * 1.45 + rim), a);
      }
    `,
  });
  disposables.push(mat);

  return new THREE.Points(geo, mat);
}

/**
 * Build the horizontal 3D Cosmic Inflation Trumpet surface mesh along X in [-16, +16].
 * Stores (u in [0..1], theta in [0..2PI]) directly in UV for exact fwidth() gold meridian/ring grids!
 */
function createTrumpetShellGeometry(THREE, uSegs = 128, thetaSegs = 72) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let iu = 0; iu <= uSegs; iu++) {
    const u = iu / uSegs;
    const x = X_MIN + X_SPAN * u;
    const r = trumpetRadius(u);

    // Numerical derivative dR/dx for accurate outward radial surface normal
    const eps = 0.002;
    const drdu = (trumpetRadius(Math.min(1, u + eps)) - trumpetRadius(Math.max(0, u - eps))) / (2 * eps);
    const drdx = drdu / X_SPAN;

    for (let it = 0; it <= thetaSegs; it++) {
      const theta = (it / thetaSegs) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      positions.push(x, cosT * r, sinT * r);

      const nx = -drdx;
      const ny = cosT;
      const nz = sinT;
      const nLen = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / nLen, ny / nLen, nz / nLen);

      uvs.push(u, theta);
    }
  }

  const stride = thetaSegs + 1;
  for (let iu = 0; iu < uSegs; iu++) {
    for (let it = 0; it < thetaSegs; it++) {
      const a = iu * stride + it;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function createWorld(THREE, shared) {
  const scene = new THREE.Scene();
  scene.fog = null; // Strictly zero fog
  scene.background = new THREE.Color(0x000105); // Deep pitch-black star-dotted space (v4_01_trumpet.png)

  const disposables = [];
  const trackGeo = (g) => { disposables.push(g); return g; };
  const trackMat = (m) => { disposables.push(m); return m; };

  // Establishing hero camera: subtle 3/4 perspective keeping the entire right bell mouth 100% uncropped inside 1440x900!
  const entryPos = new THREE.Vector3(1.4, 2.0, 38.2);
  const entryLook = new THREE.Vector3(0.0, 0.0, 0.0);
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 800);
  camera.position.copy(entryPos);
  camera.lookAt(entryLook);

  // --- Shared Procedural Textures ---
  const cmbTex = shared?.textures?.createPlanckCMBTexture
    ? shared.textures.createPlanckCMBTexture({ width: 1024, height: 512 })
    : null;
  const galaxyTex0 = shared?.textures?.createSpiralGalaxyTexture
    ? shared.textures.createSpiralGalaxyTexture(0)
    : null;
  const galaxyTex1 = shared?.textures?.createSpiralGalaxyTexture
    ? shared.textures.createSpiralGalaxyTexture(1)
    : null;
  const galaxyTex2 = shared?.textures?.createSpiralGalaxyTexture
    ? shared.textures.createSpiralGalaxyTexture(2)
    : null;

  // --- Lighting Rig ---
  const apexLight = new THREE.PointLight(0xffdf9e, 3.0, 32, 1.4);
  apexLight.position.set(X_MIN, 0, 0);
  scene.add(apexLight);

  const rimLight = new THREE.DirectionalLight(0x88b4ff, 0.85);
  rimLight.position.set(12, 16, 24);
  scene.add(rimLight);

  // --- 1. Pitch-Black Star-Dotted Deep Space Background ---
  const starField = createCircularStarfield(THREE, 2200, 44, 240, 400138, disposables);
  scene.add(starField);

  const trumpetRoot = new THREE.Group();
  scene.add(trumpetRoot);

  // --- 2. Epoch 0: Pure Incandescent Pinpoint Planck Quantum Singularity at x = -16.0 (ZERO gray disc!) ---
  const singularityPos = new THREE.Vector3(X_MIN, 0, 0);
  const apexGroup = new THREE.Group();
  apexGroup.position.copy(singularityPos);
  trumpetRoot.add(apexGroup);

  // Pure additive optical diffraction starburst (no opaque depth-clipping sphere!)
  const apexFlareUniforms = { uTime: { value: 0 }, uBoost: { value: 1.0 } };
  const apexFlareMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: apexFlareUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBoost;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float a = atan(p.y, p.x);

        float core = exp(-r * r * 62.0) * 2.4;
        float innerGlow = exp(-r * 7.5) * 0.92;
        // Crisp 4-point primary + delicate 4-point diagonal diffraction spikes
        float spH = exp(-abs(p.y) * 44.0) * exp(-abs(p.x) * 2.6) * 1.15;
        float spV = exp(-abs(p.x) * 44.0) * exp(-abs(p.y) * 2.6) * 1.15;
        vec2 pr = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p;
        float spD1 = exp(-abs(pr.y) * 52.0) * exp(-abs(pr.x) * 4.2) * 0.55;
        float spD2 = exp(-abs(pr.x) * 52.0) * exp(-abs(pr.y) * 4.2) * 0.55;

        float shimmer = 0.95 + 0.05 * sin(uTime * 3.0 + a * 4.0);
        vec3 ivory = vec3(1.0, 0.99, 0.95);
        vec3 amber = vec3(1.0, 0.62, 0.14);
        float total = (core + innerGlow + spH + spV + spD1 + spD2) * shimmer * uBoost * smoothstep(1.0, 0.74, r);
        vec3 col = mix(amber, ivory, smoothstep(0.32, 0.03, r)) * total;
        float alpha = clamp(total, 0.0, 1.0);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  }));
  const apexFlareQuad = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(5.4, 5.4)), apexFlareMat);
  apexFlareQuad.renderOrder = 8;
  apexGroup.add(apexFlareQuad);

  // Generous clickable hit sphere around the left singularity apex
  const apexHitSphere = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(2.6, 16, 12)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  apexGroup.add(apexHitSphere);

  // --- 3. Sculpted Translucent Sapphire-Glass Trumpet Shell + Anti-Aliased Gold Meridians & Rings ---
  const trumpetUniforms = {
    uTime: { value: 0 },
    uReveal: { value: 0.02 },
  };
  const trumpetGeo = trackGeo(createTrumpetShellGeometry(THREE, 128, 72));
  const trumpetMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: trumpetUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uReveal;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
          mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2(p);
          p = p * 2.1 + vec2(1.7, -2.3);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        float u = vUv.x;
        float theta = vUv.y;

        // Progressive left-to-right cosmic inflation sweep clip!
        float revealMask = smoothstep(uReveal + 0.012, uReveal - 0.018, u);
        if (revealMask < 0.004) discard;

        vec3 n = normalize(vNormal);
        vec3 v = normalize(vViewDir);
        float ndv = abs(dot(n, v));
        float fresnel = pow(1.0 - ndv, 2.3);

        // Anti-aliased hairline gold longitude meridians (12) + epoch latitude rings (11)
        float lonCoord = (theta / 6.2831853) * 12.0;
        float lonFrac = fract(lonCoord);
        float lonFw = min(fwidth(lonCoord), fwidth(fract(lonCoord + 0.5)));
        float lonLine = 1.0 - clamp(min(lonFrac, 1.0 - lonFrac) / max(lonFw * 1.15, 0.0015), 0.0, 1.0);

        float latCoord = u * 11.0;
        float latFw = max(fwidth(latCoord), 1e-4);
        float latLine = 1.0 - clamp(abs(fract(latCoord - 0.5) - 0.5) / (latFw * 1.15), 0.0, 1.0);
        // Emphasize CMB boundary ring (u = 0.171875) & open right bell mouth (u = 1.0)
        float mouthRim = smoothstep(0.990, 0.999, u);
        float cmbRing = exp(-pow((u - 0.171875) * 95.0, 2.0));

        // Epoch 1: Fiery translucent golden-amber inflation plasma filaments with dark troughs (v4_01_trumpet.png!)
        float inInflation = smoothstep(0.178, 0.162, u);
        float plasmaF = fbm(vec2(u * 30.0 - uTime * 0.45, theta * 4.5 + u * 6.0));
        float plasmaF2 = fbm(vec2(u * 62.0 - uTime * 0.72, theta * 9.0 - plasmaF * 2.8));
        float ridge1 = pow(1.0 - abs(plasmaF * 2.0 - 1.0), 2.6);
        float ridge2 = pow(1.0 - abs(plasmaF2 * 2.0 - 1.0), 3.6);
        float plasmaFilament = clamp(ridge1 * 0.62 + ridge2 * 0.72, 0.0, 1.0);
        float apexHot = exp(-u * 18.0);

        vec3 cTrough = vec3(0.055, 0.012, 0.002); // deep dark burnt-amber troughs between filaments
        vec3 cOrange = vec3(1.120, 0.300, 0.014); // #ff7b14 fiery orange plasma
        vec3 cGold   = vec3(1.550, 0.780, 0.095); // #ffbe48 bright golden veins
        vec3 cIvory  = vec3(2.150, 1.720, 0.850); // #fff0b8 hot apex & filament knots

        vec3 inflationCol = mix(cTrough, cOrange, smoothstep(0.10, 0.55, plasmaFilament));
        inflationCol = mix(inflationCol, cGold, smoothstep(0.48, 0.82, plasmaFilament));
        inflationCol = mix(inflationCol, cIvory, smoothstep(0.78, 0.96, plasmaFilament + apexHot * 0.65));

        // Epoch 2..4: Ultra-clean translucent sapphire glass shell (#02041b -> #3858a8 Fresnel rim)
        vec3 glassDeep = vec3(0.002, 0.006, 0.024);
        vec3 glassRim  = vec3(0.042, 0.120, 0.350);
        vec3 sapphireCol = mix(glassDeep, glassRim, fresnel * 0.82);

        // Hairline champagne-gold coordinate meridians & rings (#fbe3a8 linearized)
        vec3 colGoldLine = vec3(0.92, 0.66, 0.24);
        vec3 colBlueLine = vec3(0.18, 0.44, 0.95);
        float grid = max(lonLine * 0.68, latLine * 0.82);

        vec3 col = mix(sapphireCol, inflationCol, inInflation);
        col += mix(colGoldLine, colBlueLine, 0.22 * (1.0 - inInflation)) * grid * (0.64 + 0.32 * fresnel);
        col += colGoldLine * (mouthRim * 0.68 + cmbRing * 0.88);

        // Crisp luminous expanding light-front band right at u ≈ uReveal during live playback!
        float frontWave = exp(-pow((u - uReveal) * 42.0, 2.0)) * step(0.04, uReveal) * smoothstep(0.99, 0.92, uReveal);
        col += vec3(1.15, 0.86, 0.42) * frontWave * 1.15;

        // Keep both inflation cone & post-CMB glass sleekly translucent (zero opaque eggshell wall!)
        float baseAlpha = mix(
          0.07 + fresnel * 0.34 + grid * 0.54 + mouthRim * 0.55 + cmbRing * 0.58,
          0.14 + plasmaFilament * 0.68 + fresnel * 0.26 + apexHot * 0.42,
          inInflation
        );
        float alpha = clamp(baseAlpha + frontWave * 0.50, 0.0, 0.90) * revealMask;
        if (alpha < 0.005) discard;

        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));

  const trumpetShell = new THREE.Mesh(trumpetGeo, trumpetMat);
  trumpetShell.name = 'CosmicInflationTrumpet';
  trumpetShell.renderOrder = 4;
  trumpetRoot.add(trumpetShell);

  // Delicate champagne-gold optical rim ring framing the wide open right bell mouth (x = +16.0, R = 8.8)
  const mouthRimMesh = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(8.80, 0.026, 10, 112)),
    trackMat(new THREE.MeshBasicMaterial({
      color: 0xebc275,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }))
  );
  mouthRimMesh.rotation.y = Math.PI * 0.5;
  mouthRimMesh.position.x = X_MAX;
  mouthRimMesh.renderOrder = 6;
  trumpetRoot.add(mouthRimMesh);

  // Axial golden inflation beam racing inside the nose cone from x = -16.0 to x = -10.5
  const axialBeamMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uReveal: { value: 0.02 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uReveal;
      varying vec2 vUv;
      void main() {
        float uWorld = vUv.x * 0.171875;
        float clip = smoothstep(uReveal + 0.01, uReveal - 0.01, uWorld);
        float across = abs(vUv.y - 0.5) * 2.0;
        float beam = exp(-across * across * 16.0) * smoothstep(1.0, 0.05, vUv.x);
        float pulse = 0.85 + 0.15 * sin(vUv.x * 24.0 - uTime * 5.0);
        vec3 col = mix(vec3(0.98, 0.56, 0.12), vec3(1.0, 0.97, 0.85), beam);
        float a = beam * pulse * clip * 0.92;
        if (a < 0.005) discard;
        gl_FragColor = vec4(col * a * 1.4, a);
      }
    `,
  }));
  const axialBeam = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(5.5, 1.35)), axialBeamMat);
  axialBeam.position.set(X_MIN + 2.75, 0, 0);
  trumpetRoot.add(axialBeam);

  // --- 4. Epoch 2: Crisp Vertical Circular Planck CMB Disk at x = -10.5 (R = 3.0) ---
  const cmbDiskGroup = new THREE.Group();
  cmbDiskGroup.position.set(-10.5, 0, 0);
  cmbDiskGroup.rotation.y = Math.PI * 0.5;
  trumpetRoot.add(cmbDiskGroup);

  const cmbDiskUniforms = {
    uCmbMap: { value: cmbTex },
    uOpacity: { value: 1.0 },
  };
  const cmbDiskMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: cmbDiskUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uCmbMap;
      uniform float uOpacity;
      varying vec2 vUv;

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
          mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        // Sample procedural Planck CMB texture + crisp isotropic high-frequency cold/hot spots
        vec2 sampleUv = vUv * 0.85 + 0.075;
        vec3 tex = texture2D(uCmbMap, sampleUv).rgb;
        float fine = noise2(p * 11.0) * 0.55 + noise2(p * 24.0) * 0.45;
        float temp = clamp(dot(tex, vec3(0.45, 0.35, 0.20)) * 1.2 + (fine - 0.5) * 0.52, 0.0, 1.0);

        // Exact linearized Planck CMB palette (#071f47 navy -> #2f8ea0 teal -> #e2ad4c gold -> #f8eed4 ivory)
        vec3 cNavy  = vec3(0.002, 0.024, 0.145);
        vec3 cTeal  = vec3(0.022, 0.250, 0.345);
        vec3 cGold  = vec3(0.760, 0.360, 0.040);
        vec3 cIvory = vec3(0.960, 0.840, 0.500);

        vec3 planck = mix(cNavy, cTeal, smoothstep(0.14, 0.46, temp));
        planck = mix(planck, cGold, smoothstep(0.45, 0.75, temp));
        planck = mix(planck, cIvory, smoothstep(0.74, 0.95, temp));
        vec3 col = mix(tex * 1.25, planck, 0.62);

        // Crisp subtle champagne-gold circular rim bezel
        float rim = smoothstep(0.93, 0.995, r);
        col = mix(col, vec3(0.98, 0.78, 0.36), rim * 0.85);

        gl_FragColor = vec4(col, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  const cmbDisk = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(2.98, 64)), cmbDiskMat);
  cmbDisk.name = 'PlanckCMBDisk';
  cmbDisk.renderOrder = 3;
  cmbDiskGroup.add(cmbDisk);

  const cmbRimTorus = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(3.01, 0.042, 8, 72)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xfbe3a8, transparent: true, opacity: 0.90 }))
  );
  cmbDiskGroup.add(cmbRimTorus);

  // --- 5. Epoch 3: Dark Ages & Population III First Stars Inside Trumpet (x: -10.2 -> +15.4) ---
  const rand = mulberry32(401380);
  const pop3Count = 620;
  const pop3Pos = new Float32Array(pop3Count * 3);
  const pop3Col = new Float32Array(pop3Count * 3);
  const pop3U = new Float32Array(pop3Count);
  const pop3Size = new Float32Array(pop3Count);

  const cBluePop3 = new THREE.Color(0x98c8ff);
  const cWhitePop3 = new THREE.Color(0xf2f6ff);
  const cGoldWeb = new THREE.Color(0xffe0a0);
  const tcTmp = new THREE.Color();

  for (let i = 0; i < pop3Count; i++) {
    const u = U_CMB + 0.015 + rand() * (0.98 - U_CMB);
    const x = X_MIN + X_SPAN * u;
    const maxR = trumpetRadius(u) * 0.88;
    const rad = Math.sqrt(rand()) * maxR;
    const ang = rand() * Math.PI * 2;
    pop3Pos[i * 3] = x;
    pop3Pos[i * 3 + 1] = Math.cos(ang) * rad;
    pop3Pos[i * 3 + 2] = Math.sin(ang) * rad;
    pop3U[i] = u;

    // Early stars (u < 0.55) are blue-white Pop III; late epoch stars mix warm gold
    const rCol = rand();
    if (u < 0.52) {
      tcTmp.copy(rCol > 0.35 ? cBluePop3 : cWhitePop3);
    } else {
      tcTmp.copy(rCol > 0.55 ? cGoldWeb : cBluePop3);
    }
    const b = 0.45 + Math.pow(rand(), 1.8) * 0.55;
    pop3Col[i * 3] = tcTmp.r * b;
    pop3Col[i * 3 + 1] = tcTmp.g * b;
    pop3Col[i * 3 + 2] = tcTmp.b * b;
    pop3Size[i] = 1.6 + Math.pow(rand(), 2.8) * 3.8;
  }

  const pop3Geo = trackGeo(new THREE.BufferGeometry());
  pop3Geo.setAttribute('position', new THREE.BufferAttribute(pop3Pos, 3));
  pop3Geo.setAttribute('color', new THREE.BufferAttribute(pop3Col, 3));
  pop3Geo.setAttribute('aU', new THREE.BufferAttribute(pop3U, 1));
  pop3Geo.setAttribute('aSize', new THREE.BufferAttribute(pop3Size, 1));

  const pop3Uniforms = { uReveal: { value: 0.02 } };
  const pop3Mat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: pop3Uniforms,
    vertexShader: /* glsl */ `
      attribute float aU;
      attribute float aSize;
      attribute vec3 color;
      uniform float uReveal;
      varying vec3 vColor;
      varying float vVis;
      void main() {
        vColor = color;
        vVis = smoothstep(uReveal + 0.015, uReveal - 0.035, aU);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * (180.0 / max(-mv.z, 1.0)) * vVis, 0.0, 9.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vVis;
      void main() {
        if (vVis < 0.01) discard;
        vec2 p = (gl_PointCoord - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float core = exp(-r * r * 6.5);
        float halo = exp(-r * 2.6) * 0.45;
        float a = clamp((core + halo) * smoothstep(1.0, 0.5, r) * vVis, 0.0, 1.0);
        gl_FragColor = vec4(vColor * (core * 1.5 + halo), a);
      }
    `,
  }));
  const pop3Stars = new THREE.Points(pop3Geo, pop3Mat);
  pop3Stars.renderOrder = 2;
  trumpetRoot.add(pop3Stars);

  // --- 6. Epoch 4: Interior Golden-Cobalt Cosmic-Web Filaments + 3D Spiral Galaxies (x: +0.5 -> +15.6) ---
  const webNodes = [];
  const portalNodePos = new THREE.Vector3(14.8, 1.2, 0.5);
  webNodes.push({ pos: portalNodePos.clone(), u: (14.8 - X_MIN) / X_SPAN, warm: 1.0 });

  for (let i = 0; i < 120; i++) {
    const u = 0.42 + Math.pow(rand(), 0.72) * 0.565; // denser toward the flaring right mouth!
    const x = X_MIN + X_SPAN * u;
    const maxR = trumpetRadius(u) * 0.86;
    const rad = Math.pow(rand(), 0.55) * maxR;
    const ang = rand() * Math.PI * 2;
    webNodes.push({
      pos: new THREE.Vector3(x, Math.cos(ang) * rad, Math.sin(ang) * rad),
      u,
      warm: u > 0.62 ? 0.35 + rand() * 0.65 : rand() * 0.45,
    });
  }

  const webVerts = [];
  const webCols = [];
  const webUAttr = [];
  const cGoldHot = new THREE.Color(0xfbe3a8);
  const cGoldWarm = new THREE.Color(0xde8f32);
  const cWebBlue = new THREE.Color(0x3a64c8);
  const cWebDeep = new THREE.Color(0x1b2e72);
  const wc0 = new THREE.Color();
  const wc1 = new THREE.Color();

  for (let i = 0; i < webNodes.length; i++) {
    let links = 0;
    for (let j = i + 1; j < webNodes.length && links < 4; j++) {
      const d = webNodes[i].pos.distanceTo(webNodes[j].pos);
      if (d < 4.4 && d > 0.9) {
        links++;
        const isWarm = 0.5 * (webNodes[i].warm + webNodes[j].warm) > 0.48;
        const mid = new THREE.Vector3().lerpVectors(webNodes[i].pos, webNodes[j].pos, 0.5).add(
          new THREE.Vector3((rand() - 0.5) * 0.55, (rand() - 0.5) * 0.65, (rand() - 0.5) * 0.65)
        );
        const curve = new THREE.CatmullRomCurve3([webNodes[i].pos, mid, webNodes[j].pos]);
        const pts = curve.getPoints(10);
        for (let s = 0; s < pts.length - 1; s++) {
          const pA = pts[s];
          const pB = pts[s + 1];
          const uA = (pA.x - X_MIN) / X_SPAN;
          const uB = (pB.x - X_MIN) / X_SPAN;
          const e0 = Math.pow(Math.abs((s / (pts.length - 1)) * 2 - 1), 1.4);
          const e1 = Math.pow(Math.abs(((s + 1) / (pts.length - 1)) * 2 - 1), 1.4);
          if (isWarm) {
            wc0.copy(cGoldWarm).lerp(cGoldHot, e0);
            wc1.copy(cGoldWarm).lerp(cGoldHot, e1);
          } else {
            wc0.copy(cWebDeep).lerp(cWebBlue, e0);
            wc1.copy(cWebDeep).lerp(cWebBlue, e1);
          }
          webVerts.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
          webCols.push(wc0.r, wc0.g, wc0.b, wc1.r, wc1.g, wc1.b);
          webUAttr.push(uA, uB);
        }
      }
    }
  }

  const webGeo = trackGeo(new THREE.BufferGeometry());
  webGeo.setAttribute('position', new THREE.Float32BufferAttribute(webVerts, 3));
  webGeo.setAttribute('color', new THREE.Float32BufferAttribute(webCols, 3));
  webGeo.setAttribute('aU', new THREE.Float32BufferAttribute(webUAttr, 1));

  const webUniforms = { uReveal: { value: 0.02 } };
  const webMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: webUniforms,
    vertexShader: /* glsl */ `
      attribute float aU;
      attribute vec3 color;
      uniform float uReveal;
      varying vec3 vColor;
      varying float vVis;
      void main() {
        vColor = color;
        vVis = smoothstep(uReveal + 0.015, uReveal - 0.04, aU);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vVis;
      void main() {
        if (vVis < 0.01) discard;
        gl_FragColor = vec4(vColor * vVis * 0.58, 0.48 * vVis);
      }
    `,
  }));
  const webLines = new THREE.LineSegments(webGeo, webMat);
  webLines.renderOrder = 2;
  trumpetRoot.add(webLines);

  // 24 Luminous 3D Spiral Galaxies floating inside the right half of the inflation trumpet (v4_01_trumpet.png!)
  const galaxyTextures = [galaxyTex0, galaxyTex1, galaxyTex2].filter(Boolean);
  const galaxies = [];
  const heroGalaxies = [
    // Hero large spiral galaxies near the wide right bell mouth (matching v4_01_trumpet.png!)
    { x: 11.4, y: 4.1, z: 1.8, size: 4.0, rx: 0.45, ry: -0.35, rz: 0.3, texIdx: 0 },
    { x: 11.0, y: -3.6, z: 2.2, size: 3.6, rx: -0.35, ry: 0.25, rz: -0.4, texIdx: 1 },
    { x: 14.5, y: -2.6, z: -1.8, size: 3.2, rx: 0.52, ry: -0.42, rz: 0.2, texIdx: 2 },
    { x: 6.8, y: 0.8, z: 1.6, size: 2.3, rx: 0.55, ry: 0.2, rz: 0.5, texIdx: 0 },
    { x: 3.6, y: 2.1, z: 1.0, size: 2.0, rx: -0.42, ry: -0.3, rz: 0.25, texIdx: 1 },
    { x: 9.2, y: 0.2, z: -2.4, size: 2.5, rx: 0.3, ry: 0.45, rz: -0.2, texIdx: 2 },
    { x: 13.6, y: 4.5, z: -2.6, size: 2.6, rx: -0.5, ry: -0.2, rz: 0.6, texIdx: 0 },
    { x: 4.8, y: -2.0, z: -1.4, size: 1.9, rx: 0.4, ry: -0.35, rz: -0.3, texIdx: 1 },
  ];

  // Add 16 smaller nascent galaxies distributed cleanly through x = 1.5..15.2
  for (let i = 0; i < 16; i++) {
    const u = 0.55 + rand() * 0.42;
    const gx = X_MIN + X_SPAN * u;
    const maxR = trumpetRadius(u) * 0.72;
    const gr = (0.25 + rand() * 0.75) * maxR;
    const ga = rand() * Math.PI * 2;
    heroGalaxies.push({
      x: gx,
      y: Math.cos(ga) * gr,
      z: Math.sin(ga) * gr,
      size: 1.05 + (u - 0.5) * 2.6 * (0.65 + rand() * 0.5),
      rx: (rand() - 0.5) * 1.1,
      ry: (rand() - 0.5) * 0.9,
      rz: rand() * Math.PI,
      texIdx: i % Math.max(1, galaxyTextures.length),
    });
  }

  for (const gd of heroGalaxies) {
    const tex = galaxyTextures[gd.texIdx % galaxyTextures.length];
    if (!tex) continue;
    const gMat = trackMat(new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    const mesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(gd.size, gd.size)), gMat);
    mesh.position.set(gd.x, gd.y, gd.z);
    mesh.rotation.set(gd.rx, gd.ry, gd.rz);
    mesh.renderOrder = 3;
    trumpetRoot.add(mesh);
    galaxies.push({ mesh, mat: gMat, u: (gd.x - X_MIN) / X_SPAN, spinSpeed: (rand() - 0.5) * 0.14 });
  }

  // --- 7. Glowing Proto-Galaxy Cluster Portal Node Inside Right Bell Mouth (Portal to Act 2 `curvature`) ---
  const portalNodeGroup = new THREE.Group();
  portalNodeGroup.position.copy(portalNodePos);
  trumpetRoot.add(portalNodeGroup);

  const portalBeaconMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float core = exp(-r * r * 14.0) * 1.45;
        float halo = exp(-r * 3.4) * 0.72;
        float spH = exp(-abs(p.y) * 24.0) * exp(-abs(p.x) * 2.4) * 0.90;
        float spV = exp(-abs(p.x) * 24.0) * exp(-abs(p.y) * 2.4) * 0.90;
        float ring = exp(-pow((r - 0.56) * 18.0, 2.0)) * (0.45 + 0.18 * sin(uTime * 3.2));
        vec3 col = vec3(1.0, 0.95, 0.80) * (core + spH + spV) + vec3(0.96, 0.62, 0.16) * halo + vec3(0.45, 0.78, 1.0) * ring;
        float a = clamp((core + halo + spH + spV + ring) * smoothstep(1.0, 0.72, r) * uAlpha, 0.0, 1.0);
        if (a < 0.004) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  }));
  const portalBeaconQuad = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(4.2, 4.2)), portalBeaconMat);
  const portalRing1 = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.18, 0.028, 8, 56)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xfbe3a8, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }))
  );
  const portalRing2 = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.56, 0.020, 8, 56)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0x6cb8ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }))
  );
  portalRing2.rotation.x = Math.PI * 0.36;
  const portalHitSphere = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(2.5, 16, 12)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  portalNodeGroup.add(portalBeaconQuad, portalRing1, portalRing2, portalHitSphere);
  portalNodeGroup.renderOrder = 6;

  // --- 8. Organic Point-to-Expanse Narrative Playback (`由点到面`, ZERO exposed slider!) ---
  const INITIAL_POINT = 0.02;
  let evoTarget = INITIAL_POINT;
  let evoCurrent = INITIAL_POINT;
  let isPlaying = false;
  let playStartVal = INITIAL_POINT;
  let playElapsed = 0;
  let playDuration = 6.2;
  let lastNarrativeStage = -1;

  function getNarrativeForEvolution(e) {
    if (e < 0.06) {
      return {
        stage: 0,
        line: '最初只有一点炽热的微光，尚未有时间与空间',
        cue: '轻触奇点或向下轻滚，唤醒宇宙大爆炸',
      };
    }
    if (e < 0.22) {
      return {
        stage: 1,
        line: '「宇宙暴胀」亿万分之一秒内，一点奇点向右剧烈暴胀成炽热火球',
        cue: '时空正在剧烈膨胀…',
      };
    }
    if (e < 0.54) {
      return {
        stage: 2,
        line: '「38 万年 · 宇宙微波背景」第一束自由光子脱耦，印下原初冷暖光斑',
        cue: '黑暗时代正在苏醒，第一代恒星即将点亮…',
      };
    }
    if (e < 0.88) {
      return {
        stage: 3,
        line: '「第一代恒星与星系」星系沿金色引力丝在加速膨胀中诞生',
        cue: '暗能量正在拉宽时空喇叭口…',
      };
    }
    return {
      stage: 4,
      line: '「138 亿年 · 加速膨胀」暗能量拉宽时空喇叭口，星系团在深空璀璨汇聚',
      cue: '轻触右口亮起的星系团节点，坠入弯曲时空',
    };
  }

  function syncNarrative(e, ctx, force = false) {
    const info = getNarrativeForEvolution(e);
    if (force || info.stage !== lastNarrativeStage) {
      lastNarrativeStage = info.stage;
      ctx?.setNarrative?.(info.line, info.cue);
    }
  }

  function applyEvolutionVisuals(e) {
    trumpetUniforms.uReveal.value = e;
    axialBeamMat.uniforms.uReveal.value = e;
    pop3Uniforms.uReveal.value = e;
    webUniforms.uReveal.value = e;

    // Hide trumpet shell & axial beam completely at opening point (e <= 0.035) so landing is a pure solitary spark!
    const hasStarted = e > 0.035;
    trumpetShell.visible = hasStarted;
    axialBeam.visible = hasStarted;

    // Apex singularity core stays heroically visible as the glowing left spark!
    const initBoost = 1.0 + Math.max(0, 1.0 - e * 6.0) * 0.35;
    apexFlareUniforms.uBoost.value = initBoost;

    // Vertical Planck CMB slice pops crisply into existence right as expansion sweeps past x = -10.5 (u = 0.172)
    const cmbT = Math.max(0, Math.min(1, (e - (U_CMB - 0.02)) / 0.08));
    const cmbSmooth = cmbT * cmbT * (3 - 2 * cmbT);
    cmbDiskGroup.visible = cmbT > 0.01;
    cmbDiskGroup.scale.setScalar(0.15 + cmbSmooth * 0.85);
    cmbDiskUniforms.uOpacity.value = cmbSmooth;
    cmbRimTorus.material.opacity = 0.85 * cmbSmooth;

    // Wide open mouth rim appears as expansion reaches x = +16.0 (u = 0.90 -> 1.0)
    const mouthT = Math.max(0, Math.min(1, (e - 0.90) / 0.10));
    mouthRimMesh.visible = mouthT > 0.01;
    mouthRimMesh.material.opacity = 0.78 * mouthT;

    // Each interior spiral galaxy blooms gently as the light-front crosses its x-coordinate!
    for (const g of galaxies) {
      const gt = Math.max(0, Math.min(1, (e - g.u + 0.02) / 0.10));
      const gs = gt * gt * (3 - 2 * gt);
      g.mesh.visible = gt > 0.01;
      g.mesh.scale.setScalar(0.2 + gs * 0.88);
      g.mat.opacity = 0.96 * gs;
    }

    // Glowing right-mouth proto-galaxy cluster portal beacon ignites as trumpet reaches full bloom
    const pT = Math.max(0, Math.min(1, (e - 0.82) / 0.16));
    const pSmooth = pT * pT * (3 - 2 * pT);
    portalNodeGroup.visible = pT > 0.01;
    portalNodeGroup.scale.setScalar(0.35 + pSmooth * 0.65);
    portalBeaconMat.uniforms.uAlpha.value = pSmooth;
    portalRing1.material.opacity = 0.82 * pSmooth;
    portalRing2.material.opacity = 0.60 * pSmooth;
  }

  function startInflationPlayback(ctx) {
    if (evoCurrent >= 0.94) {
      ctx?.triggerAudio?.('bigbangPulse');
      return;
    }
    isPlaying = true;
    playStartVal = evoCurrent;
    playElapsed = 0;
    playDuration = Math.max(1.6, 6.2 * (1.0 - (evoCurrent - INITIAL_POINT) / (1.0 - INITIAL_POINT)));
    ctx?.triggerAudio?.('bigbangPulse');
  }

  function setParam(v) {
    isPlaying = false;
    evoTarget = Math.max(0, Math.min(1, Number(v) || 0));
    evoCurrent = evoTarget;
    applyEvolutionVisuals(evoCurrent);
  }

  function triggerAction(ctx) {
    startInflationPlayback(ctx);
  }

  function advanceStory(ctx) {
    if (evoCurrent < 0.88) {
      startInflationPlayback(ctx);
      return true;
    }
    ctx?.transitionTo?.('curvature', 'trumpet-dive');
    return true;
  }

  function onEnter(ctx) {
    isPlaying = false;
    evoTarget = INITIAL_POINT;
    evoCurrent = INITIAL_POINT;
    lastNarrativeStage = -1;
    applyEvolutionVisuals(INITIAL_POINT);
    syncNarrative(INITIAL_POINT, ctx, true);
  }

  applyEvolutionVisuals(evoCurrent);

  // --- 9. Update & Direct-World Interaction ---
  function update(dt, elapsed, ctx) {
    if (isPlaying) {
      playElapsed += dt;
      const u = Math.min(1, playElapsed / playDuration);
      const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      evoTarget = playStartVal + (1.0 - playStartVal) * ease;
      if (u >= 1.0) {
        evoTarget = 1.0;
        isPlaying = false;
      }
    }

    if (Math.abs(evoTarget - evoCurrent) > 0.0004) {
      evoCurrent += (evoTarget - evoCurrent) * Math.min(1, dt * 6.0);
      applyEvolutionVisuals(evoCurrent);
    }

    // Gentle living pulse on the solitary left singularity point
    const breathe = 1.0 + Math.sin(elapsed * 2.8) * 0.06;
    apexFlareQuad.scale.setScalar((evoCurrent < 0.08 ? 1.25 : 0.95) * breathe);

    syncNarrative(evoCurrent, ctx, false);

    apexFlareUniforms.uTime.value = elapsed;
    trumpetUniforms.uTime.value = elapsed;
    axialBeamMat.uniforms.uTime.value = elapsed;
    portalBeaconMat.uniforms.uTime.value = elapsed;

    if (ctx?.camera) {
      apexFlareQuad.lookAt(ctx.camera.position);
      portalBeaconQuad.lookAt(ctx.camera.position);
    }

    for (const g of galaxies) {
      if (g.mesh.visible) {
        g.mesh.rotation.z += dt * g.spinSpeed;
      }
    }

    portalRing1.rotation.z = elapsed * 0.62;
    portalRing2.rotation.y = -elapsed * 0.85;
    starField.rotation.y = elapsed * 0.0035;
  }

  function onPointerMove(raycaster) {
    if (evoCurrent >= 0.80 && raycaster.intersectObject(portalHitSphere, false).length > 0) {
      return { cursor: 'pointer', hoverLabel: '初代星系团引力节点 · 坠入弯曲时空' };
    }
    if (raycaster.intersectObject(apexHitSphere, false).length > 0) {
      return evoCurrent < 0.20
        ? { cursor: 'pointer', hoverLabel: '普朗克奇点 (t = 0) · 轻触唤醒宇宙暴胀' }
        : { cursor: 'pointer', hoverLabel: '时间原点奇点 · 138 亿年前的起点' };
    }
    if (evoCurrent >= 0.20 && raycaster.intersectObject(cmbDisk, false).length > 0) {
      return { cursor: 'pointer', hoverLabel: '普朗克 CMB 微波背景切片 (38 万年)' };
    }
    return null;
  }

  function onClick(raycaster, ctx) {
    // 1. Once right bell mouth is open, clicking the glowing proto-galaxy cluster node dives into Act 2 (`curvature`)!
    if (evoCurrent >= 0.80 && raycaster.intersectObject(portalHitSphere, false).length > 0) {
      ctx?.audio?.playClickTone?.();
      return { action: 'transition', to: 'curvature', mode: 'trumpet-dive' };
    }

    // 2. Clicking the left singularity apex (or anywhere while still at the starting point!) triggers left-to-right Big Bang!
    if (raycaster.intersectObject(apexHitSphere, false).length > 0 || evoCurrent < 0.16) {
      startInflationPlayback(ctx);
      return true;
    }

    // 3. Clicking along the trumpet or CMB slice launches a subtle optical ripple (handled by engine)
    return false;
  }

  function onWheel(deltaY, ctx) {
    if (deltaY > 0 && evoTarget < 0.99) {
      if (!isPlaying && evoCurrent < 0.12) {
        startInflationPlayback(ctx);
      } else {
        isPlaying = false;
        evoTarget = Math.min(1.0, evoTarget + Math.min(0.10, deltaY * 0.00055));
      }
      return true;
    }
    if (deltaY < 0 && evoTarget > INITIAL_POINT + 0.005) {
      isPlaying = false;
      evoTarget = Math.max(INITIAL_POINT, evoTarget + Math.max(-0.10, deltaY * 0.00055));
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
    id: 'bigbang',
    title: '01 · 奇点与宇宙暴胀',
    subtitle: 'I · SINGULARITY & COSMIC INFLATION TRUMPET',
    shortLabel: '01 暴胀',
    defaultHint: '最初只有一点炽热的微光 · 轻触奇点或向下轻滚，唤醒宇宙大爆炸',
    scene,
    camera,
    entryPose: {
      pos: entryPos,
      lookAt: entryLook,
      fov: 42,
    },
    singularityPos: singularityPos.clone(),
    singularityPose: {
      pos: new THREE.Vector3(X_MIN, 0.3, 6.0),
      lookAt: singularityPos.clone(),
      fov: 42,
    },
    nodePosition: portalNodePos.clone(),
    portalNodePos: portalNodePos.clone(),
    paramConfig: {
      label: '宇宙演化',
      min: 0,
      max: 1,
      initial: INITIAL_POINT,
      format: (v) => {
        if (v < 0.10) return '10⁻⁴³ s · 普朗克奇点';
        if (v < 0.24) return '10⁻³² s · 宇宙暴胀';
        if (v < 0.56) return '38 万年 · CMB 光斑';
        return '138 亿年 · 加速膨胀';
      },
      actionLabel: '演化播放',
    },
    setParam,
    triggerAction,
    advanceStory,
    onEnter,
    update,
    onPointerMove,
    onClick,
    onWheel,
    onKeyAction,
    dispose,
  };
}

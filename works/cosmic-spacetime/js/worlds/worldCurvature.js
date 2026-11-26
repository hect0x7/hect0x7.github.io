// Act 2: 02 · 广义相对论 · 时空曲率 (Pure Deep-Space Astrophysics)
// High-density GPU 3D Flamm's paraboloid spacetime metric manifold with razor-sharp gold & cyan geodesics,
// fiery convective orange-gold star + prominent orbiting blue-white pulsar with twin relativistic polar jets,
// crisp quadrupole GW spiral ripples, glowing golden deflected null-geodesic light-ray ribbons, and interactive mass anchors.
// Zero fog, zero UnrealBloomPass, zero architectural motifs.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create crisp circular deep-space pinprick stars (ShaderMaterial Points — zero square pixels!).
 */
function createCircularStarfield(THREE, count, minR, maxR, seed, disposables) {
  const rand = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const pal = [0xffffff, 0xcfe4ff, 0xffe5b8, 0xa6c8ff];
  const tc = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const r = minR + rand() * (maxR - minR);
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    pos[i * 3] = Math.cos(phi) * s * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = Math.sin(phi) * s * r;
    tc.setHex(pal[Math.floor(rand() * pal.length)]);
    const b = 0.42 + Math.pow(rand(), 1.9) * 0.58;
    col[i * 3] = tc.r * b;
    col[i * 3 + 1] = tc.g * b;
    col[i * 3 + 2] = tc.b * b;
    sizes[i] = 1.5 + Math.pow(rand(), 3.2) * 3.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
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
        gl_PointSize = clamp(aSize * (220.0 / max(-mv.z, 1.0)), 1.2, 6.2);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        vec2 p = (gl_PointCoord - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float core = exp(-r * r * 5.8);
        float rim = smoothstep(1.0, 0.25, r) * 0.32;
        float a = clamp(core + rim, 0.0, 1.0);
        gl_FragColor = vec4(vColor * (core * 1.4 + rim), a);
      }
    `,
  });
  disposables.push(mat);

  return new THREE.Points(geo, mat);
}

/**
 * Create a high-density polar Flamm's paraboloid ring mesh storing (r, theta) cleanly in UV.
 */
function createPolarManifoldGeometry(THREE, rMin, rMax, radialSegs = 96, angularSegs = 128) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let ir = 0; ir <= radialSegs; ir++) {
    const t = ir / radialSegs;
    const r = rMin + (rMax - rMin) * Math.pow(t, 1.55);
    for (let ia = 0; ia <= angularSegs; ia++) {
      const aNorm = ia / angularSegs;
      const theta = aNorm * Math.PI * 2;
      positions.push(Math.cos(theta) * r, 0, Math.sin(theta) * r);
      uvs.push(r, theta);
    }
  }

  const stride = angularSegs + 1;
  for (let ir = 0; ir < radialSegs; ir++) {
    for (let ia = 0; ia < angularSegs; ia++) {
      const a = ir * stride + ia;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Shared metric height evaluator matching GPU vertex shader so deflected light-ray ribbons & pulsar hug the manifold.
 */
function evaluateManifoldY(x, z, state) {
  const r = Math.hypot(x, z);
  const rClamped = Math.max(1.38, r);
  let y = -state.depth * Math.pow(2.95 / rClamped, 0.94) + state.depth * 0.145;

  const dpx = x - state.pulsarX;
  const dpz = z - state.pulsarZ;
  const dp2 = dpx * dpx + dpz * dpz;
  y -= (0.95 + state.curvature * 0.75) / (dp2 + 1.45);

  for (let i = 0; i < state.anchors.length; i++) {
    const an = state.anchors[i];
    if (an.strength <= 0.001) continue;
    const dx = x - an.x;
    const dz = z - an.z;
    y -= (an.strength * 2.35) / (dx * dx + dz * dz + 1.85);
  }

  const theta = Math.atan2(z, x);
  const gwEnv = Math.min(1, Math.max(0, (r - 2.8) / 3.6)) * Math.exp(-Math.max(0, r - 6.0) * 0.045);
  const baseAmp = (0.14 + state.curvature * 0.16) * gwEnv;
  const phase = 2.0 * theta - r * 1.38 + state.gwPhase;
  y += Math.sin(phase) * baseAmp;

  if (state.burstAge < 3.6) {
    const front = 2.6 + state.burstAge * 7.6;
    const ringEnv = Math.exp(-Math.pow((r - front) * 0.75, 2.0)) * Math.max(0, 1.0 - state.burstAge / 3.6);
    y += Math.sin(2.0 * theta - (r - front) * 3.0) * ringEnv * 0.52;
  }

  return y;
}

export function createWorld(THREE, shared) {
  const scene = new THREE.Scene();
  scene.fog = null; // Strictly zero fog
  scene.background = new THREE.Color(0x03050a);

  const disposables = [];
  const trackGeo = (g) => { disposables.push(g); return g; };
  const trackMat = (m) => { disposables.push(m); return m; };

  // Establishing camera matching art_bible_v2.md Section 3 (Act 2)
  const entryPos = new THREE.Vector3(0, 13.8, 29.5);
  const entryLook = new THREE.Vector3(0, -2.4, 0);
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 800);
  camera.position.copy(entryPos);
  camera.lookAt(entryLook);

  // --- Shared Procedural Textures ---
  const photosphereTex = shared?.textures?.createStarPhotosphereTexture
    ? shared.textures.createStarPhotosphereTexture({ size: 512 })
    : null;
  const sparkTex = shared?.textures?.createOpticalSparkTexture
    ? shared.textures.createOpticalSparkTexture(128)
    : null;

  // --- Lighting Rig ---
  const primaryStarLight = new THREE.PointLight(0xffcf82, 3.4, 44, 1.4);
  primaryStarLight.position.set(-0.85, -2.2, 0);
  scene.add(primaryStarLight);

  const pulsarLight = new THREE.PointLight(0x7cc8ff, 2.2, 22, 1.4);
  scene.add(pulsarLight);

  const topCoolRim = new THREE.DirectionalLight(0x5a86d6, 0.72);
  topCoolRim.position.set(0, 26, 12);
  scene.add(topCoolRim);

  // --- 1. Crisp Circular Deep-Space Starfield (zero square specks!) ---
  scene.add(createCircularStarfield(THREE, 1850, 46, 230, 202602, disposables));

  // --- 2. 3D Flamm's Paraboloid Spacetime Metric Manifold (Razor-sharp Sapphire Grid, ZERO milky throat wash!) ---
  const R_MIN = 1.4;
  const R_MAX = 20.0;

  const manifoldUniforms = {
    uTime: { value: 0 },
    uGwPhase: { value: 0 },
    uCurvature: { value: 0.52 },
    uDepth: { value: 8.6 },
    uPulsarPos: { value: new THREE.Vector2(3.4, 1.2) },
    uBurstAge: { value: 99.0 },
    uAnchor0: { value: new THREE.Vector3(0, 0, 0) },
    uAnchor1: { value: new THREE.Vector3(0, 0, 0) },
    uAnchor2: { value: new THREE.Vector3(0, 0, 0) },
  };

  const manifoldGeo = trackGeo(createPolarManifoldGeometry(THREE, R_MIN, R_MAX, 96, 128));
  const manifoldMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: manifoldUniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uGwPhase;
      uniform float uCurvature;
      uniform float uDepth;
      uniform vec2 uPulsarPos;
      uniform float uBurstAge;
      uniform vec3 uAnchor0;
      uniform vec3 uAnchor1;
      uniform vec3 uAnchor2;

      varying float vR;
      varying float vTheta;
      varying float vGwCrest;
      varying float vBurstCrest;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      float evalHeight(float x, float z, out float gwVal, out float burstVal) {
        float r = max(1.38, length(vec2(x, z)));
        float theta = atan(z, x);
        float y = -uDepth * pow(2.95 / r, 0.94) + uDepth * 0.145;

        vec2 dp = vec2(x, z) - uPulsarPos;
        y -= (0.95 + uCurvature * 0.75) / (dot(dp, dp) + 1.45);

        if (uAnchor0.z > 0.001) {
          vec2 da = vec2(x, z) - uAnchor0.xy;
          y -= (uAnchor0.z * 2.35) / (dot(da, da) + 1.85);
        }
        if (uAnchor1.z > 0.001) {
          vec2 da = vec2(x, z) - uAnchor1.xy;
          y -= (uAnchor1.z * 2.35) / (dot(da, da) + 1.85);
        }
        if (uAnchor2.z > 0.001) {
          vec2 da = vec2(x, z) - uAnchor2.xy;
          y -= (uAnchor2.z * 2.35) / (dot(da, da) + 1.85);
        }

        float gwEnv = smoothstep(2.6, 6.2, r) * exp(-max(0.0, r - 6.0) * 0.045);
        float phase = 2.0 * theta - r * 1.38 + uGwPhase;
        gwVal = sin(phase) * gwEnv;
        y += gwVal * (0.14 + uCurvature * 0.16);

        burstVal = 0.0;
        if (uBurstAge < 3.6) {
          float front = 2.6 + uBurstAge * 7.6;
          float ringEnv = exp(-pow((r - front) * 0.75, 2.0)) * max(0.0, 1.0 - uBurstAge / 3.6);
          burstVal = pow(0.5 + 0.5 * sin(2.0 * theta - (r - front) * 3.0), 2.2) * ringEnv;
          y += sin(2.0 * theta - (r - front) * 3.0) * ringEnv * 0.52;
        }
        return y;
      }

      void main() {
        float r = uv.x;
        float theta = uv.y;
        float gwVal = 0.0;
        float burstVal = 0.0;
        float y = evalHeight(position.x, position.z, gwVal, burstVal);

        vec3 displaced = vec3(position.x, y, position.z);
        vec4 wp = modelMatrix * vec4(displaced, 1.0);
        vR = r;
        vTheta = theta;
        vGwCrest = gwVal;
        vBurstCrest = burstVal;
        vWorldPos = wp.xyz;
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uGwPhase;
      uniform float uCurvature;
      uniform vec2 uPulsarPos;
      uniform vec3 uAnchor0;
      uniform vec3 uAnchor1;
      uniform vec3 uAnchor2;

      varying float vR;
      varying float vTheta;
      varying float vGwCrest;
      varying float vBurstCrest;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      float gridLine(float coord, float widthPx) {
        float w = max(fwidth(coord), 1e-4);
        float d = abs(fract(coord - 0.5) - 0.5) / (w * widthPx);
        return 1.0 - clamp(d, 0.0, 1.0);
      }

      void main() {
        vec3 dpdx = dFdx(vWorldPos);
        vec3 dpdy = dFdy(vWorldPos);
        vec3 n = normalize(cross(dpdx, dpdy));
        vec3 v = normalize(vViewDir);
        // Restrained Fresnel so steep throat lips stay deep translucent sapphire (ZERO milky white veil!)
        float fresnel = pow(1.0 - abs(dot(n, v)), 3.0);

        vec3 glassBase = vec3(0.0025, 0.008, 0.034);
        vec3 glassRim  = vec3(0.018, 0.072, 0.245);
        vec3 col = mix(glassBase, glassRim, fresnel * 0.58);

        // Logarithmic iso-potential coordinate rings
        float logR = log(max(vR, 1.0)) * 5.8;
        float ringMask = gridLine(logR, 1.30);

        // 32 crisp cyan-blue radial geodesics plunging straight down the funnel
        float radialCoord = (vTheta / 6.2831853) * 32.0;
        float aAngle = fract(radialCoord);
        float fwA = min(fwidth(radialCoord), fwidth(fract(radialCoord + 0.5)));
        float dRad = min(aAngle, 1.0 - aAngle);
        float radialMask = 1.0 - clamp(dRad / max(fwA * 1.25, 0.0015), 0.0, 1.0);

        vec3 colGoldRing = vec3(0.95, 0.62, 0.20); // champagne-gold iso-rings
        vec3 colCyanRad  = vec3(0.10, 0.42, 0.98); // electric sapphire-cyan radials
        vec3 colGwCrest  = vec3(0.18, 0.60, 1.25); // narrow luminous cyan quadrupole spiral arms

        float isGoldRing = step(0.5, fract(floor(logR + 0.5) * 0.5));
        vec3 ringCol = mix(colCyanRad * 0.95, colGoldRing * 1.22, isGoldRing);
        // Gentle throat-zone radial grid dimming so curved golden starlight hairlines remain effortlessly traceable!
        float throatCalm = mix(0.58, 1.0, smoothstep(2.2, 5.8, vR));

        col += ringCol * ringMask * (0.95 + 0.20 * fresnel);
        col += colCyanRad * radialMask * 0.76 * throatCalm;

        // Distinct luminous cyan-blue quadrupole spiral GW ripple bands gliding across the sapphire metric surface!
        float spiralBand = pow(max(vGwCrest, 0.0), 1.95) * (0.62 + 0.35 * uCurvature);
        float spiralEdge = pow(max(vGwCrest, 0.0), 4.5) * 0.55;
        col += vec3(0.14, 0.52, 1.15) * spiralBand * 0.72;
        col += vec3(0.45, 0.82, 1.45) * spiralEdge * (0.45 + 0.65 * max(ringMask, radialMask));

        // Crisp sapphire-cyan triggered GW Burst wavefront (luminous translucent ripple ring without bleaching!)
        if (vBurstCrest > 0.002) {
          float bWave = pow(vBurstCrest, 1.35);
          col += vec3(0.16, 0.66, 1.42) * bWave * (0.68 + 0.75 * max(ringMask, radialMask));
        }

        // Subtle warm golden reflection on throat rings from primary convective star
        float throatGlow = exp(-max(0.0, vR - 1.4) * 0.42);
        col += vec3(0.65, 0.28, 0.04) * throatGlow * (0.14 + 0.55 * ringMask);

        // Local cyan glow around orbiting pulsar footprint
        float dPulsar = length(vWorldPos.xz - uPulsarPos);
        col += vec3(0.22, 0.65, 1.25) * exp(-dPulsar * 0.95) * 0.55;

        // Crisp concentric rings around any user-dropped Gravity-Well Anchors
        for (int i = 0; i < 3; i++) {
          vec3 anc = (i == 0) ? uAnchor0 : (i == 1 ? uAnchor1 : uAnchor2);
          if (anc.z > 0.01) {
            float da = length(vWorldPos.xz - anc.xy);
            float aRing = exp(-pow((da - 1.35) * 4.5, 2.0)) + exp(-da * 1.8) * 0.45;
            col += vec3(0.95, 0.65, 0.22) * aRing * anc.z;
          }
        }

        float outerRim = smoothstep(19.68, 19.96, vR);
        col += colCyanRad * outerRim * 0.95;
        float throatFade = smoothstep(1.39, 1.68, vR);
        float outerFade = smoothstep(20.02, 19.86, vR);

        // Clean transparent metric glass alpha — grid & spiral crests shine crisply without milky alpha buildup!
        float baseAlpha = 0.18 + fresnel * 0.20 + max(ringMask, radialMask) * 0.74 + spiralBand * 0.34 + vBurstCrest * 0.30;
        float alpha = clamp(baseAlpha, 0.0, 0.92) * throatFade * outerFade;
        if (alpha < 0.005) discard;

        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));

  const manifoldMesh = new THREE.Mesh(manifoldGeo, manifoldMat);
  manifoldMesh.name = 'FlammSpacetimeManifold';
  scene.add(manifoldMesh);

  const clickCatchPlane = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(R_MAX, 64)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  clickCatchPlane.rotation.x = -Math.PI * 0.5;
  clickCatchPlane.position.y = -0.6;
  scene.add(clickCatchPlane);

  // --- 3. Binary Massive System: Fiery Convective Orange-Gold Star + Prominent Blue-White Pulsar ---
  const binaryGroup = new THREE.Group();
  scene.add(binaryGroup);

  // 3a. Primary Convective Orange-Gold Star (rich boiling plasma contrast — NOT bleached pale cream!)
  const starUniforms = {
    uTime: { value: 0 },
    uPhotoMap: { value: photosphereTex },
    uCurvature: { value: 0.52 },
  };
  const starMat = trackMat(new THREE.ShaderMaterial({
    uniforms: starUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocal;
      void main() {
        vUv = uv;
        vLocal = normalize(position);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uPhotoMap;
      uniform float uCurvature;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocal;

      float hash3(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise3(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
              mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
              mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vViewDir);
        float ndv = clamp(dot(n, v), 0.0, 1.0);

        // Dual-layer procedural 3D convective solar granulation + photosphere map (high contrast fiery orange-gold!)
        vec2 uv1 = vec2(fract(vUv.x + uTime * 0.018), vUv.y);
        vec3 tex = texture2D(uPhotoMap, uv1).rgb;
        vec3 sp = vLocal * 6.5 + vec3(uTime * 0.22, -uTime * 0.14, uTime * 0.12);
        float cell1 = noise3(sp);
        float cell2 = noise3(sp * 2.4 + cell1 * 1.4);
        float cell3 = noise3(sp * 5.2 - cell2 * 1.1);
        // Dark intergranular sunspot lanes + hot bright convective cells
        float gran = clamp(cell1 * 0.35 + cell2 * 0.40 + cell3 * 0.25 + (tex.r - 0.5) * 0.28, 0.0, 1.0);
        float sharpGran = smoothstep(0.24, 0.84, gran);

        // Deep fiery solar palette (#c95408 dark lanes -> #f69212 molten orange -> #fff3b5 hot granule peaks)
        vec3 cDarkLane = vec3(0.22, 0.028, 0.002);
        vec3 cAmber    = vec3(0.95, 0.260, 0.014);
        vec3 cGold     = vec3(1.55, 0.720, 0.085);
        vec3 cHotPeak  = vec3(2.20, 1.650, 0.620);

        float limb = pow(ndv, 0.72);
        vec3 col = mix(cDarkLane, cAmber, smoothstep(0.08, 0.52, sharpGran * 0.78 + limb * 0.32));
        col = mix(col, cGold, smoothstep(0.42, 0.80, sharpGran * 0.82 + limb * 0.28));
        col = mix(col, cHotPeak, smoothstep(0.76, 0.96, sharpGran * 0.85 + limb * 0.22));

        // Chromospheric fiery orange rim highlight
        float rim = pow(1.0 - ndv, 3.2);
        col += vec3(1.25, 0.42, 0.04) * rim * 0.75;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  const primaryStar = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(2.05, 48, 36)), starMat);
  primaryStar.position.set(-0.9, -2.15, 0);
  primaryStar.name = 'PrimaryConvectiveStar';
  binaryGroup.add(primaryStar);

  const starCoronaMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        float r = length((vUv - 0.5) * 2.0);
        float halo = exp(-pow(max(r - 0.44, 0.0) * 4.8, 1.4)) * smoothstep(1.0, 0.70, r);
        vec3 col = mix(vec3(0.95, 0.32, 0.03), vec3(1.0, 0.78, 0.32), smoothstep(0.75, 0.44, r));
        float a = halo * 0.52;
        if (a < 0.004) discard;
        gl_FragColor = vec4(col * a, a);
      }
    `,
  }));
  const starCorona = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(6.4, 6.4)), starCoronaMat);
  primaryStar.add(starCorona);

  // 3b. Prominent Orbiting Blue-White Neutron Star / Pulsar with Crisp Twin Relativistic Polar Jets!
  const pulsarGroup = new THREE.Group();
  binaryGroup.add(pulsarGroup);

  const pulsarCoreMat = trackMat(new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float ndv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
        vec3 cRim  = vec3(0.18, 0.62, 1.65); // vivid cyan-sapphire limb
        vec3 cCore = vec3(1.65, 2.15, 2.50); // incandescent blue-white core
        vec3 col = mix(cRim, cCore, pow(ndv, 1.25));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  const pulsarCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.56, 28, 20)), pulsarCoreMat);
  pulsarGroup.add(pulsarCore);

  // Crisp sapphire-white optical flare halo around pulsar core (astro_02_curvature.png!)
  const pulsarFlare = new THREE.Sprite(trackMat(new THREE.SpriteMaterial({
    map: sparkTex || null,
    color: 0x7cd2ff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })));
  pulsarFlare.scale.set(2.8, 2.8, 1);
  pulsarGroup.add(pulsarFlare);

  // Bold, razor-crisp collimated twin relativistic polar jet cones!
  const jetMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float dist = vUv.y;
        float pulse = 0.82 + 0.18 * sin(dist * 22.0 - uTime * 11.0);
        vec3 col = mix(vec3(0.28, 0.68, 1.25), vec3(0.95, 0.99, 1.0), smoothstep(0.52, 0.0, dist));
        float a = pow(1.0 - dist, 1.25) * 0.95 * pulse;
        if (a < 0.004) discard;
        gl_FragColor = vec4(col * a * 1.55, a);
      }
    `,
  }));

  const jetAxis = new THREE.Group();
  jetAxis.rotation.set(0.18, 0.12, -0.52); // dramatic diagonal lighthouse tilt matching astro_02_curvature.png
  const jetConeGeo = trackGeo(new THREE.CylinderGeometry(0.42, 0.045, 5.4, 16, 1, true));
  jetConeGeo.translate(0, 2.7, 0);
  const jetTop = new THREE.Mesh(jetConeGeo, jetMat);
  const jetBot = new THREE.Mesh(jetConeGeo, jetMat);
  jetBot.rotation.x = Math.PI;
  jetAxis.add(jetTop, jetBot);
  pulsarGroup.add(jetAxis);

  const orbitRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(3.75, 0.022, 6, 80)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0x74c2ff, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }))
  );
  orbitRing.rotation.x = Math.PI * 0.5;
  orbitRing.position.y = -2.3;
  scene.add(orbitRing);

  const throatPos = new THREE.Vector3(0, -10.5, 0);
  const throatHitTarget = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.6, 1.5, 8.2, 20)),
    trackMat(new THREE.MeshBasicMaterial({ visible: false }))
  );
  throatHitTarget.position.set(0, -7.2, 0);
  throatHitTarget.name = 'CollapsingHorizonThroat';
  scene.add(throatHitTarget);

  // --- 4. Ultra-Delicate Optical Starlight Hairlines (6 Razor-Sharp RK4 Deflected Geodesics, ZERO thick tubes!) ---
  const raySpecs = [
    { z0: -7.8, speed: 0.21, phase: 0.05 },
    { z0: -4.6, speed: 0.25, phase: 0.24 },
    { z0: -2.4, speed: 0.29, phase: 0.48 },
    { z0: 2.5, speed: 0.28, phase: 0.67 },
    { z0: 4.9, speed: 0.24, phase: 0.82 },
    { z0: 8.1, speed: 0.20, phase: 0.14 },
  ];
  const raySteps = 120;
  const lightRays = [];

  const hairlineMat = trackMat(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aU;
      varying float vU;
      void main() {
        vU = aU;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying float vU;
      void main() {
        // Ultra-smooth endpoint feathering so each hairline melts effortlessly into deep space
        float endFade = smoothstep(0.0, 0.08, vU) * smoothstep(1.0, 0.92, vU);
        // Brighten cleanly as light grazes past the gravity well center (vU ~ 0.5)
        float wellFocus = 0.82 + 0.52 * exp(-pow((vU - 0.5) * 3.2, 2.0));
        // Crisp warm champagne-gold optical starlight (#f8e6ba)
        vec3 col = vec3(1.0, 0.90, 0.68) * wellFocus;
        float alpha = clamp(0.78 * endFade * wellFocus, 0.0, 0.96);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  }));

  const photonSparkMat = trackMat(new THREE.SpriteMaterial({
    map: sparkTex || null,
    color: 0xfff3d4,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));

  const endSparkMat = trackMat(new THREE.SpriteMaterial({
    map: sparkTex || null,
    color: 0xf6e2b4,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));

  const uCurveAttr = new Float32Array(raySteps + 1);
  for (let s = 0; s <= raySteps; s++) uCurveAttr[s] = s / raySteps;

  for (let i = 0; i < raySpecs.length; i++) {
    const spec = raySpecs[i];
    const positions = new Float32Array((raySteps + 1) * 3);
    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aU', new THREE.BufferAttribute(uCurveAttr, 1));

    const line = new THREE.Line(geo, hairlineMat);
    line.frustumCulled = false;
    line.renderOrder = 6;
    scene.add(line);

    // Tiny gliding pinprick photon spark sliding smoothly along the curved geodesic hairline!
    const glider = new THREE.Sprite(photonSparkMat);
    glider.scale.set(0.62, 0.62, 1);
    glider.renderOrder = 7;
    scene.add(glider);

    const spStart = new THREE.Sprite(endSparkMat);
    const spEnd = new THREE.Sprite(endSparkMat);
    spStart.scale.set(0.68, 0.68, 1);
    spEnd.scale.set(0.68, 0.68, 1);
    spStart.renderOrder = 6;
    spEnd.renderOrder = 6;
    scene.add(spStart, spEnd);

    lightRays.push({ spec, geo, positions, glider, spStart, spEnd });
  }

  // --- 5. Organic Direct-World Curvature & Luminous Dropped Star Anchors (ZERO exposed slider!) ---
  const INITIAL_MASS = 0.26;
  let curvTarget = INITIAL_MASS;
  let curvCurrent = INITIAL_MASS;
  let gwPhase = 0;
  let burstAge = 99.0;
  let lastNarrativeStage = -1;
  let hasInteracted = false;
  const userAnchors = [];

  // 3 physical luminous star-orb visuals seated inside dropped Gravity-Well Anchors!
  const anchorStarMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffe8a8 }));
  const anchorFlareMat = trackMat(new THREE.SpriteMaterial({
    map: sparkTex || null,
    color: 0xffcc68,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const anchorStarGeo = trackGeo(new THREE.SphereGeometry(0.36, 18, 14));
  const anchorVisuals = [];
  for (let i = 0; i < 3; i++) {
    const grp = new THREE.Group();
    const orb = new THREE.Mesh(anchorStarGeo, anchorStarMat);
    const flare = new THREE.Sprite(anchorFlareMat);
    flare.scale.set(2.2, 2.2, 1);
    grp.add(orb, flare);
    grp.visible = false;
    scene.add(grp);
    anchorVisuals.push(grp);
  }

  const simState = {
    curvature: INITIAL_MASS,
    depth: 6.9,
    pulsarX: 3.8,
    pulsarZ: -0.8,
    gwPhase: 0,
    burstAge: 99.0,
    anchors: [],
  };

  function getNarrativeForCurvature(m, interacted) {
    if (!interacted && m < 0.36) {
      return {
        stage: 0,
        line: '星系物质汇聚成阱，质量在此告诉时空如何弯曲',
        cue: '轻触时空织物投放星体，或点击双星激起引力波涟漪',
      };
    }
    if (m < 0.56) {
      return {
        stage: 1,
        line: '双星旋进搅动时空度规，四极引力波向深空荡漾',
        cue: '继续轻触时空投放星体，或点击中央坍缩深喉跃入弯曲星海',
      };
    }
    return {
      stage: 2,
      line: '质量越聚越深，星光沿测地线弯折，势阱趋近视界坍缩',
      cue: '轻触中央坍缩深喉，跃入弯曲星海',
    };
  }

  function syncNarrative(ctx, force = false) {
    const info = getNarrativeForCurvature(curvCurrent, hasInteracted);
    if (force || info.stage !== lastNarrativeStage) {
      lastNarrativeStage = info.stage;
      ctx?.setNarrative?.(info.line, info.cue);
    }
  }

  function dropMassAnchor(x, z, ctx) {
    userAnchors.push({ x, z, age: 0, maxAge: 18.0 });
    if (userAnchors.length > 3) userAnchors.shift();
    hasInteracted = true;
    curvTarget = Math.min(0.92, curvTarget + 0.22);
    burstAge = 0.0;
    ctx?.triggerAudio?.('gwChirp');
  }

  function setParam(v) {
    curvTarget = Math.max(0, Math.min(1, Number(v) || 0));
    curvCurrent = curvTarget;
    if (curvTarget > 0.36) hasInteracted = true;
  }

  function triggerAction(ctx) {
    hasInteracted = true;
    curvTarget = Math.min(0.92, Math.max(curvTarget + 0.22, 0.54));
    burstAge = 0.0;
    ctx?.triggerAudio?.('gwChirp');
  }

  function advanceStory(ctx) {
    if (curvCurrent < 0.62) {
      dropMassAnchor(-7.2, 3.4, ctx);
      curvTarget = Math.max(curvTarget, 0.78);
      return true;
    }
    ctx?.transitionTo?.('lensing', 'well-dive');
    return true;
  }

  function onEnter(ctx) {
    curvTarget = INITIAL_MASS;
    curvCurrent = INITIAL_MASS;
    hasInteracted = false;
    lastNarrativeStage = -1;
    burstAge = 99.0;
    userAnchors.length = 0;
    syncNarrative(ctx, true);
  }

  /**
   * Smooth lateral gravitational deflection acceleration (RK4) — zero sharp clamping kinks!
   */
  function evalRayAccelZ(x, z, gm) {
    // Softened Schwarzschild potential so grazing rays bend gracefully without snapping into kinks
    const r2 = x * x + z * z + 7.2;
    let az = (-gm * z) / (r2 * Math.sqrt(r2));
    for (let a = 0; a < simState.anchors.length; a++) {
      const anc = simState.anchors[a];
      if (anc.strength <= 0.01) continue;
      const dxa = x - anc.x;
      const dza = z - anc.z;
      const da2 = dxa * dxa + dza * dza + 4.0;
      az += (-anc.strength * 2.2 * dza) / (da2 * Math.sqrt(da2));
    }
    return az;
  }

  function updateLightRays(elapsed) {
    hairlineMat.uniforms.uTime.value = elapsed;
    const gm = 18.0 + curvCurrent * 36.0;

    for (let rIdx = 0; rIdx < lightRays.length; rIdx++) {
      const ray = lightRays[rIdx];
      const z0 = ray.spec.z0;
      const xHalf = Math.sqrt(Math.max(10.0, (R_MAX - 0.35) * (R_MAX - 0.35) - z0 * z0));

      let z = z0;
      let vz = 0;
      const h = (xHalf * 2) / raySteps;
      const pos = ray.positions;

      for (let s = 0; s <= raySteps; s++) {
        const u = s / raySteps;
        const x = -xHalf + u * xHalf * 2;

        if (s > 0) {
          // 4th-order Runge-Kutta integration for silky-smooth, kink-free curved optical geodesics!
          const xm = x - h * 0.5;
          const xPrev = x - h;

          const k1z = vz;
          const k1v = evalRayAccelZ(xPrev, z, gm);

          const k2z = vz + 0.5 * h * k1v;
          const k2v = evalRayAccelZ(xm, z + 0.5 * h * k1z, gm);

          const k3z = vz + 0.5 * h * k2v;
          const k3v = evalRayAccelZ(xm, z + 0.5 * h * k2z, gm);

          const k4z = vz + h * k3v;
          const k4v = evalRayAccelZ(x, z + h * k3z, gm);

          z += (h / 6.0) * (k1z + 2 * k2z + 2 * k3z + k4z);
          vz += (h / 6.0) * (k1v + 2 * k2v + 2 * k3v + k4v);
        }

        let rx = x;
        let rz = z;
        const rClamp = Math.hypot(rx, rz);
        if (rClamp > R_MAX - 0.18) {
          const k = (R_MAX - 0.18) / rClamp;
          rx *= k;
          rz *= k;
        }

        const ry = evaluateManifoldY(rx, rz, simState) + 0.22;
        pos[s * 3] = rx;
        pos[s * 3 + 1] = ry;
        pos[s * 3 + 2] = rz;
      }

      ray.geo.attributes.position.needsUpdate = true;

      ray.spStart.position.set(pos[0], pos[1], pos[2]);
      const last = raySteps * 3;
      ray.spEnd.position.set(pos[last], pos[last + 1], pos[last + 2]);

      // Advance tiny pinprick photon spark smoothly along the geodesic hairline!
      const tP = (elapsed * ray.spec.speed + ray.spec.phase) % 1.0;
      const idxF = tP * raySteps;
      const i0 = Math.min(raySteps - 1, Math.floor(idxF));
      const frac = idxF - i0;
      const k0 = i0 * 3;
      const k1 = (i0 + 1) * 3;
      ray.glider.position.set(
        pos[k0] + (pos[k1] - pos[k0]) * frac,
        pos[k0 + 1] + (pos[k1 + 1] - pos[k0 + 1]) * frac,
        pos[k0 + 2] + (pos[k1 + 2] - pos[k0 + 2]) * frac
      );
      const edgeFade = Math.min(1, Math.min(tP / 0.12, (1 - tP) / 0.12));
      ray.glider.scale.setScalar(0.62 * edgeFade);
    }
  }

  // --- 6. Update Loop & Interaction ---
  function update(dt, elapsed, ctx) {
    if (Math.abs(curvTarget - curvCurrent) > 0.0004) {
      curvCurrent += (curvTarget - curvCurrent) * Math.min(1, dt * 5.0);
    }

    const depth = 4.2 + curvCurrent * 10.4;
    const omega = 0.65 + curvCurrent * 1.45;
    gwPhase += dt * omega * 1.85;

    if (burstAge < 4.0) {
      burstAge += dt;
    }

    // Place blue neutron pulsar cleanly separated on the right flank (x ~ +3.8..+4.1, z ~ -0.6..+0.6) matching astro_02_curvature.png!
    const orbitAngle = -0.35 + gwPhase * 0.15;
    const orbitR = 4.35 - curvCurrent * 0.45;
    const px = Math.cos(orbitAngle) * orbitR;
    const pz = Math.sin(orbitAngle) * orbitR;

    const starWobble = 0.72;
    const sx = -Math.cos(orbitAngle) * starWobble;
    const sz = -Math.sin(orbitAngle) * starWobble;

    const activeAnchors = [];
    for (let i = userAnchors.length - 1; i >= 0; i--) {
      const an = userAnchors[i];
      an.age += dt;
      if (an.age > an.maxAge) {
        userAnchors.splice(i, 1);
      } else {
        const rise = Math.min(1, an.age / 0.35);
        const fade = Math.min(1, (an.maxAge - an.age) / 2.2);
        activeAnchors.push({ x: an.x, z: an.z, strength: rise * fade });
      }
    }

    simState.curvature = curvCurrent;
    simState.depth = depth;
    simState.pulsarX = px;
    simState.pulsarZ = pz;
    simState.gwPhase = gwPhase;
    simState.burstAge = burstAge;
    simState.anchors = activeAnchors;

    manifoldUniforms.uTime.value = elapsed;
    manifoldUniforms.uGwPhase.value = gwPhase;
    manifoldUniforms.uCurvature.value = curvCurrent;
    manifoldUniforms.uDepth.value = depth;
    manifoldUniforms.uPulsarPos.value.set(px, pz);
    manifoldUniforms.uBurstAge.value = burstAge;

    const setAnchorUniform = (u, idx) => {
      if (idx < activeAnchors.length) {
        u.value.set(activeAnchors[idx].x, activeAnchors[idx].z, activeAnchors[idx].strength);
      } else {
        u.value.set(0, 0, 0);
      }
    };
    setAnchorUniform(manifoldUniforms.uAnchor0, 0);
    setAnchorUniform(manifoldUniforms.uAnchor1, 1);
    setAnchorUniform(manifoldUniforms.uAnchor2, 2);

    // Sync luminous 3D mini-star visuals sitting inside each dropped Gravity-Well Anchor!
    for (let i = 0; i < anchorVisuals.length; i++) {
      const grp = anchorVisuals[i];
      if (i < activeAnchors.length) {
        const an = activeAnchors[i];
        const ay = evaluateManifoldY(an.x, an.z, simState) + 0.58;
        grp.position.set(an.x, ay, an.z);
        grp.scale.setScalar(0.35 + an.strength * 0.65);
        grp.visible = true;
      } else {
        grp.visible = false;
      }
    }

    syncNarrative(ctx, false);

    // Seat fiery convective primary star cleanly inside the funnel throat
    const starY = -1.95 - curvCurrent * 0.95;
    primaryStar.position.set(sx, starY, sz);
    primaryStar.scale.setScalar(1.06 - curvCurrent * 0.14);
    primaryStarLight.position.copy(primaryStar.position);
    starUniforms.uTime.value = elapsed;
    starUniforms.uCurvature.value = curvCurrent;
    if (ctx?.camera) {
      starCorona.lookAt(ctx.camera.position);
    }

    // Keep orbiting blue-white pulsar & twin polar jets clearly visible right beside the primary star!
    const pulsarY = Math.max(starY + 0.35, evaluateManifoldY(px, pz, simState) + 1.55);
    pulsarGroup.position.set(px, pulsarY, pz);
    pulsarLight.position.set(px, pulsarY + 0.4, pz);
    jetAxis.rotation.y = elapsed * (4.2 + curvCurrent * 5.2);
    jetMat.uniforms.uTime.value = elapsed;

    orbitRing.scale.setScalar(orbitR / 3.75);
    orbitRing.position.y = pulsarY - 0.55;

    updateLightRays(elapsed);
  }

  function onPointerMove(raycaster) {
    if (raycaster.intersectObject(pulsarCore, false).length > 0) {
      return { cursor: 'pointer', hoverLabel: '致密中子脉冲星 · 轻触加速双星旋进与引力波' };
    }
    if (raycaster.intersectObject(primaryStar, false).length > 0) {
      return curvCurrent >= 0.56
        ? { cursor: 'pointer', hoverLabel: '视界坍缩核心 · 跃入弯曲星海' }
        : { cursor: 'pointer', hoverLabel: '恒星质量核 · 轻触加深势阱并激起引力波' };
    }
    if (raycaster.intersectObject(throatHitTarget, false).length > 0) {
      return { cursor: 'pointer', hoverLabel: '视界坍缩核心 · 跃入弯曲星海' };
    }
    const manHits = raycaster.intersectObject(clickCatchPlane, false);
    if (manHits.length > 0) {
      return { cursor: 'pointer', hoverLabel: '弗拉姆时空织物 · 轻触投放星体加深弯曲' };
    }
    return null;
  }

  function onClick(raycaster, ctx) {
    // 1. Clicking orbiting pulsar accelerates inspiral + fires quadrupole GW burst!
    if (raycaster.intersectObject(pulsarCore, false).length > 0) {
      triggerAction(ctx);
      return true;
    }

    // 2. Clicking primary star deepens curvature & triggers GW burst first; once deep (>= 0.56), dives into Act 3!
    if (raycaster.intersectObject(primaryStar, false).length > 0) {
      if (curvCurrent >= 0.56) {
        ctx?.audio?.playClickTone?.();
        return { action: 'transition', to: 'lensing', mode: 'well-dive' };
      }
      triggerAction(ctx);
      return true;
    }

    // 3. Clicking the deep collapsing throat funnel always dives straight into Act 3 (`lensing`)!
    if (raycaster.intersectObject(throatHitTarget, false).length > 0) {
      ctx?.audio?.playClickTone?.();
      return { action: 'transition', to: 'lensing', mode: 'well-dive' };
    }

    // 4. Clicking anywhere on the sapphire manifold drops a luminous star anchor + deepens curvature + fires GW ripple!
    const hits = raycaster.intersectObject(clickCatchPlane, false);
    if (hits.length > 0) {
      const p = hits[0].point;
      const r = Math.hypot(p.x, p.z);
      if (r > 3.5 && r < R_MAX - 1.2) {
        dropMassAnchor(p.x, p.z, ctx);
        const ySurface = evaluateManifoldY(p.x, p.z, simState);
        return { action: 'fly', target: new THREE.Vector3(p.x, ySurface + 1.6, p.z) };
      }
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
    id: 'curvature',
    title: '02 · 广义相对论 · 时空曲率',
    subtitle: 'II · GENERAL RELATIVITY & FLAMM MANIFOLD',
    shortLabel: '02 曲率',
    defaultHint: '星系物质汇聚成阱 · 轻触时空织物投放星体，或点击双星激起引力波涟漪',
    scene,
    camera,
    entryPose: {
      pos: entryPos,
      lookAt: entryLook,
      fov: 42,
    },
    avatarAnchor: new THREE.Vector3(-8.5, 4.8, 12.0),
    guideTarget: new THREE.Vector3(0, -3.2, 0),
    throatPosition: throatPos.clone(),
    throatPos,
    paramConfig: {
      label: '质量曲率',
      min: 0,
      max: 1,
      initial: INITIAL_MASS,
      format: (v) => {
        const mass = (0.5 + v * 19.5).toFixed(1);
        return v > 0.88 ? `${mass} M☉ · 坍缩临界` : `${mass} M☉`;
      },
      actionLabel: '引力波脉冲',
    },
    setParam,
    triggerAction,
    advanceStory,
    onEnter,
    update,
    onPointerMove,
    onClick,
    onKeyAction,
    dispose,
  };
}

// Act 3: 03 · 引力透镜 · 弯曲星海 (Standalone Interactive Movable-Lens JWST Galaxy Cluster Lab)
// Pure deep-space optical gravitational lensing (NO black hole, NO accretion disk, zero fog, zero bloom smear).
// Moving or dragging the pointer smoothly glides a crystal-clear transparent dark-matter lensing halo
// across a lush JWST deep-space field of 18+ spiral/elliptical galaxies & quasars using the exact multi-lens
// thin-lens deflection equation: beta = theta - sum_i theta_Ei^2 * (theta - L_i) / (|theta - L_i|^2 + eps_i^2).
// Clicking drops up to 2 additional fixed lensing halos to combine cluster caustics; clicking the dense
// dark-matter collapse core triggers { action: 'transition', to: 'blackhole', mode: 'collapse-horizon' }.

const MAX_FIXED_LENSES = 2;
const HERO_GALAXY_POS = { x: -0.85, y: 0.25 };
const COLLAPSE_CORE_POS = { x: 7.45, y: -0.35 };
const INITIAL_LENS_POS = { x: 0.42, y: 0.12 }; // Slightly off-axis from hero galaxy -> vivid sapphire-gold arcs on landing!

const LENSING_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const LENSING_FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform sampler2D uGalaxyTex0;
  uniform sampler2D uGalaxyTex1;
  uniform sampler2D uGalaxyTex2;
  uniform vec2 uLensPos;         // Primary movable transparent dark-matter lens position (world XY at z = 0)
  uniform float uLensRadius;     // Primary Einstein radius theta_E (~4.55)
  uniform vec3 uFixedLenses[2];  // xy: position, z: strength (0..1)
  uniform vec2 uCollapsePos;     // Dense compact collapse core position -> Act 4 Black Hole
  uniform float uHoverCore;

  varying vec3 vWorldPos;

  const float PI = 3.14159265359;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  // Crisp multi-arm JWST spiral galaxy sampler (combines procedural texture + high-frequency spiral ridges)
  vec3 sampleSpiral(vec2 beta, vec2 center, float radius, float tilt, float angle, int variant, float boost) {
    vec2 q = (beta - center) / radius;
    float c = cos(angle);
    float s = sin(angle);
    vec2 qr = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    qr.y /= max(0.30, tilt);

    float r2 = dot(qr, qr);
    if (r2 > 1.25) return vec3(0.0);

    vec2 uv = qr * 0.48 + 0.5;
    vec4 samp = variant == 0
      ? texture2D(uGalaxyTex0, uv)
      : (variant == 1 ? texture2D(uGalaxyTex1, uv) : texture2D(uGalaxyTex2, uv));
    vec3 texLin = pow(max(samp.rgb, vec3(0.0)), vec3(2.25)) * samp.a;

    float r = sqrt(r2);
    float phi = atan(qr.y, qr.x);
    float bulge = exp(-r * r * 24.0);
    float arms = pow(max(0.0, 0.5 + 0.5 * sin(2.0 * phi - 5.8 * log(r + 0.06))), 3.5);
    float fineArms = pow(max(0.0, 0.5 + 0.5 * sin(3.0 * phi - 7.4 * log(r + 0.07) + 1.2)), 4.5) * 0.55;
    float armEnv = exp(-r * 2.4) * smoothstep(0.04, 0.15, r);
    float knots = pow(max(0.0, 0.5 + 0.5 * sin(phi * 11.0 - r * 28.0)), 6.0) * arms * armEnv;

    vec3 bulgeCol = variant == 2 ? vec3(0.98, 0.72, 0.34) : vec3(0.96, 0.76, 0.42);
    vec3 armCol = variant == 2
      ? vec3(0.86, 0.62, 0.36)
      : (variant == 1 ? vec3(0.24, 0.44, 0.98) : vec3(0.18, 0.38, 0.96));

    vec3 analytic = bulgeCol * bulge * 0.85 + armCol * (arms + fineArms) * armEnv * 0.92 + vec3(0.82, 0.90, 1.0) * knots * 0.85;
    float edgeMask = smoothstep(1.10, 0.65, r);
    return (texLin * 1.18 + analytic * 0.72) * edgeMask * boost;
  }

  // Warm golden elliptical galaxy (matching the warm amber ellipticals in v4_03_lensing_field.png)
  vec3 sampleElliptical(vec2 beta, vec2 center, float radius, float aspect, float angle, vec3 tint, float boost) {
    vec2 q = (beta - center) / radius;
    float c = cos(angle);
    float s = sin(angle);
    vec2 qr = vec2(c * q.x - s * q.y, (s * q.x + c * q.y) / max(0.35, aspect));
    float r2 = dot(qr, qr);
    if (r2 > 2.2) return vec3(0.0);
    float core = exp(-r2 * 10.0);
    float halo = exp(-sqrt(r2) * 2.8) * 0.52;
    return tint * (core * 1.35 + halo) * smoothstep(1.48, 0.7, sqrt(r2)) * boost;
  }

  // Crisp JWST 4-point diffraction quasar (splits into golden 4-point Einstein Cross when lens passes near!)
  vec3 sampleQuasar(vec2 beta, vec2 center, float size, vec3 tint, float boost) {
    vec2 q = (beta - center) / size;
    float r2 = dot(q, q);
    if (r2 > 26.0) return vec3(0.0);
    float core = exp(-r2 * 5.2);
    float halo = exp(-r2 * 1.2) * 0.25;
    float spikeH = exp(-abs(q.y) * 11.0 - abs(q.x) * 1.15) * 0.80;
    float spikeV = exp(-abs(q.x) * 11.0 - abs(q.y) * 1.15) * 0.80;
    return tint * (core * 2.2 + halo + spikeH + spikeV) * boost;
  }

  // Rich JWST deep-space starfield & faint background galaxy clusters evaluated in lensed source plane beta!
  vec3 sampleJWSTBackground(vec2 beta) {
    vec3 col = vec3(0.0005, 0.0009, 0.0024); // #03050a obsidian space

    // 1) Multi-tier crisp circular pinprick stars + subtle diffraction spikes on brightest stars
    for (int tier = 0; tier < 3; tier++) {
      float scale = tier == 0 ? 1.55 : (tier == 1 ? 3.4 : 6.8);
      vec2 cell = floor(beta * scale);
      vec2 f = fract(beta * scale) - 0.5;
      float rnd = hash12(cell + float(tier) * 41.7);
      float thresh = tier == 0 ? 0.90 : (tier == 1 ? 0.86 : 0.84);
      if (rnd > thresh) {
        vec2 j = (hash22(cell + float(tier) * 13.1) - 0.5) * 0.62;
        vec2 d = f - j;
        float dist = length(d);
        float mag = (rnd - thresh) / (1.0 - thresh);
        float sz = mix(0.045, 0.11, mag * mag);
        float pin = smoothstep(sz, 0.0, dist);
        pin *= pin;

        float temp = hash12(cell + 7.9);
        vec3 tint = temp < 0.30
          ? vec3(0.66, 0.84, 1.0)
          : (temp < 0.68 ? vec3(0.98, 0.98, 1.0) : vec3(1.0, 0.82, 0.52));

        float spikes = 0.0;
        if (tier == 0 && mag > 0.72) {
          spikes = (exp(-abs(d.y) * 58.0 - abs(d.x) * 6.5) + exp(-abs(d.x) * 58.0 - abs(d.y) * 6.5)) * 0.55;
        }
        col += tint * (pin * mix(0.35, 1.55, mag) + spikes);
      }
    }

    // 2) Subtle faint distant micro-ellipticals & blue dwarf galaxies scattered across the entire JWST field
    vec2 mCell = floor(beta * 0.48);
    vec2 mF = fract(beta * 0.48) - 0.5;
    float mRnd = hash12(mCell + 91.3);
    if (mRnd > 0.68) {
      vec2 mj = (hash22(mCell + 19.7) - 0.5) * 0.45;
      float ma = hash12(mCell + 3.1) * PI;
      vec2 md = mF - mj;
      vec2 mr = vec2(cos(ma) * md.x - sin(ma) * md.y, (sin(ma) * md.x + cos(ma) * md.y) * 2.1);
      float mr2 = dot(mr, mr);
      vec3 mTint = hash12(mCell + 5.7) > 0.45 ? vec3(0.38, 0.56, 0.96) : vec3(0.94, 0.72, 0.44);
      col += mTint * exp(-mr2 * 64.0) * 0.55;
    }

    // 3) 12+ HERO JWST SPIRAL & ELLIPTICAL GALAXIES (rich sapphire arms & warm gold bulges)
    // Primary central hero spiral galaxy (lens starts slightly off-axis from this for instant dramatic Einstein arcs!)
    col += sampleSpiral(beta, vec2(-0.85, 0.25), 1.48, 0.72, 0.42 + uTime * 0.012, 0, 1.38);

    // Mid-field galaxies framing the interactive play zone (drag lens over ANY of them to form rings & giant arcs!)
    col += sampleSpiral(beta, vec2(-4.85, 2.35), 1.55, 0.66, -0.58, 1, 1.25);
    col += sampleSpiral(beta, vec2(4.45, 2.85), 1.45, 0.62, 0.85, 0, 1.22);
    col += sampleSpiral(beta, vec2(-4.40, -3.15), 1.50, 0.58, 1.15, 2, 1.18);
    col += sampleSpiral(beta, vec2(3.85, -3.45), 1.62, 0.68, -0.92, 1, 1.24);
    col += sampleSpiral(beta, vec2(0.85, 4.95), 1.35, 0.55, 0.24, 0, 1.15);
    col += sampleSpiral(beta, vec2(-1.45, -5.10), 1.40, 0.60, -0.35, 2, 1.12);

    // Grand outer corner JWST spirals (matching v4_03_lensing_field.png's rich frame)
    col += sampleSpiral(beta, vec2(-10.6, 5.4), 2.55, 0.70, 0.62, 0, 1.15);
    col += sampleSpiral(beta, vec2(10.8, 4.7), 2.40, 0.74, -0.48, 1, 1.12);
    col += sampleSpiral(beta, vec2(10.7, -5.0), 2.65, 0.60, -0.78, 0, 1.18);
    col += sampleSpiral(beta, vec2(-10.4, -5.3), 2.10, 0.66, 0.95, 1, 1.05);

    // Warm golden elliptical galaxies (adding amber color richness)
    col += sampleElliptical(beta, vec2(-7.8, 0.6), 1.15, 0.68, 0.4, vec3(0.95, 0.68, 0.36), 0.95);
    col += sampleElliptical(beta, vec2(8.6, 1.5), 1.05, 0.72, -0.5, vec3(0.96, 0.72, 0.42), 0.90);
    col += sampleElliptical(beta, vec2(-2.2, 1.9), 0.88, 0.64, 0.8, vec3(0.95, 0.66, 0.34), 0.82);
    col += sampleElliptical(beta, vec2(2.4, -1.6), 0.92, 0.70, -0.3, vec3(0.92, 0.70, 0.40), 0.82);

    // 4) Luminous Golden Quasars (form crisp 4-point Einstein Crosses when lensed!)
    col += sampleQuasar(beta, vec2(-5.4, -0.65), 0.24, vec3(1.0, 0.84, 0.48), 1.10);
    col += sampleQuasar(beta, vec2(4.6, 3.8), 0.22, vec3(1.0, 0.86, 0.52), 1.05);
    col += sampleQuasar(beta, vec2(5.2, -3.8), 0.24, vec3(1.0, 0.82, 0.44), 1.08);
    col += sampleQuasar(beta, vec2(-3.2, 4.4), 0.20, vec3(0.76, 0.88, 1.0), 0.95);

    return col;
  }

  // Render crystal-clear whisper-thin pale-sapphire Fresnel dark-matter halo rim (ZERO soapy blue bubble haze!)
  vec3 renderLensHalo(vec2 theta, vec2 lensCenter, float rE, float strength, bool isPrimary) {
    vec2 d = theta - lensCenter;
    float r = length(d);
    if (r > rE * 1.18 || strength < 0.005) return vec3(0.0);

    float rn = r / rE;
    // Ultra-clean razor-thin optical hairline edge (NO milky interior fog, NO thick glowing soap-bubble band!)
    float inside = smoothstep(1.01, 0.992, rn);
    float microFresnel = pow(clamp(rn, 0.0, 1.0), 9.0) * inside;
    float razorHairline = exp(-pow((rn - 1.0) / 0.0085, 2.0));

    float ang = atan(d.y, d.x);
    float sheen = 0.52 + 0.48 * cos(ang - 2.35);

    vec3 iceRim = vec3(0.46, 0.68, 1.0);
    vec3 slateWhisper = vec3(0.10, 0.22, 0.48);

    float rimGain = isPrimary ? 0.28 : 0.14;
    vec3 haloCol = slateWhisper * microFresnel * (isPrimary ? 0.055 : 0.025)
                 + iceRim * razorHairline * sheen * rimGain;

    // Subtle warm golden central elliptical cluster galaxy (#e6b479) matching v4_03_lensing_field.png
    if (isPrimary) {
      vec2 ec = vec2(d.x * 0.82 + d.y * 0.57, (-d.x * 0.57 + d.y * 0.82) * 1.55);
      float ell = exp(-dot(ec, ec) * 2.4);
      haloCol += vec3(0.86, 0.54, 0.20) * ell * 0.48;
    }

    return haloCol * strength;
  }

  // Subtle astrophysical Compact Dark-Mass Collapse Core (portal to Act 4 Black Hole — sleek, never a thick bullseye!)
  vec3 renderCollapseCore(vec2 theta, vec2 corePos) {
    vec2 d = theta - corePos;
    float r = length(d);
    if (r > 2.4) return vec3(0.0);

    float pulse = 0.88 + 0.12 * sin(uTime * 2.6);
    float hoverBoost = 1.0 + uHoverCore * 0.65;

    float ring1 = exp(-pow((r - 0.48) / 0.022, 2.0));
    float ring2 = exp(-pow((r - 0.82 - 0.04 * sin(uTime * 2.2)) / 0.016, 2.0)) * 0.35;
    float spikes = (exp(-abs(d.y) * 22.0 - abs(d.x) * 1.4) + exp(-abs(d.x) * 22.0 - abs(d.y) * 1.4)) * 0.42 * smoothstep(2.0, 0.25, r);

    vec3 colRing = mix(vec3(0.95, 0.68, 0.28), vec3(0.60, 0.78, 1.0), 0.25);
    return colRing * (ring1 * 1.15 + ring2 + spikes) * pulse * hoverBoost;
  }

  void main() {
    vec2 theta = vWorldPos.xy;

    // Exact Multi-Lens Thin-Lens Optical Deflection Equation:
    // beta = theta - sum_i theta_Ei^2 * (theta - L_i) / (|theta - L_i|^2 + eps_i^2)
    vec2 deflection = vec2(0.0);

    // 1) Primary movable dark-matter halo lens
    {
      vec2 d0 = theta - uLensPos;
      float r02 = dot(d0, d0);
      float eps0 = 0.26;
      deflection += (uLensRadius * uLensRadius / (r02 + eps0 * eps0)) * d0;
    }

    // 2) Up to 2 user-dropped fixed secondary lensing halos (creating multi-arc cluster caustics!)
    for (int i = 0; i < 2; i++) {
      float str = uFixedLenses[i].z;
      if (str > 0.01) {
        vec2 d = theta - uFixedLenses[i].xy;
        float r2 = dot(d, d);
        float rEf = 2.65 * str;
        float eps = 0.22;
        deflection += (rEf * rEf / (r2 + eps * eps)) * d;
      }
    }

    // 3) Subtle local micro-lensing pinch around the Compact Collapse Core (portal to Act 4 Black Hole)
    {
      vec2 dc = theta - uCollapsePos;
      float rc2 = dot(dc, dc);
      deflection += (0.85 / (rc2 + 0.16)) * dc;
    }

    vec2 beta = theta - deflection;

    // Sample the entire JWST deep-space galaxy field through the curved light rays!
    vec3 col = sampleJWSTBackground(beta);

    // Overlay crystal-clear transparent pale-sapphire Fresnel dark-matter lens rims (NO opaque disc!)
    col += renderLensHalo(theta, uLensPos, uLensRadius, 1.0, true);
    for (int i = 0; i < 2; i++) {
      if (uFixedLenses[i].z > 0.01) {
        col += renderLensHalo(theta, uFixedLenses[i].xy, 2.65, uFixedLenses[i].z, false);
      }
    }

    // Overlay compact dark-mass collapse core landmark (hover/click -> Act 4 Black Hole!)
    vec2 dc = theta - uCollapsePos;
    float rc = length(dc);
    col *= smoothstep(0.28, 0.56, rc); // tiny dark pinch right at the center of the collapse core
    col += max(vec3(0.0), renderCollapseCore(theta, uCollapsePos));

    gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createWorld(THREE, shared) {
  const scene = new THREE.Scene();
  scene.fog = null;
  scene.background = new THREE.Color(0x03050a);

  const entryPos = new THREE.Vector3(0, 0, 22.0);
  const entryLookAt = new THREE.Vector3(0, 0, 0);
  const entryFov = 42;

  const camera = new THREE.PerspectiveCamera(
    entryFov,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.05,
    200
  );
  camera.position.copy(entryPos);
  camera.lookAt(entryLookAt);

  const galaxyTex0 = shared && shared.textures && shared.textures.createSpiralGalaxyTexture
    ? shared.textures.createSpiralGalaxyTexture(0)
    : null;
  const galaxyTex1 = shared && shared.textures && shared.textures.createSpiralGalaxyTexture
    ? shared.textures.createSpiralGalaxyTexture(1)
    : null;
  const galaxyTex2 = shared && shared.textures && shared.textures.createSpiralGalaxyTexture
    ? shared.textures.createSpiralGalaxyTexture(2)
    : null;

  const fixedLenses = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ];
  const fixedTargetStrength = [0, 0];
  let nextFixedSlot = 0;

  const lensTarget = new THREE.Vector2(INITIAL_LENS_POS.x, INITIAL_LENS_POS.y);
  const lensSmooth = new THREE.Vector2(INITIAL_LENS_POS.x, INITIAL_LENS_POS.y);
  let lensAnim = null; // { fromX, fromY, toX, toY, elapsed, duration }
  let ringFormed = false;
  let hoverCoreTarget = 0;
  let hoverCoreSmooth = 0;

  // Full-frustum optical deep-field canvas at z = 0 (generous 48x30 covers any desktop/ultrawide/mobile ratio)
  const fieldGeo = new THREE.PlaneGeometry(52, 34, 1, 1);
  const fieldMat = new THREE.ShaderMaterial({
    vertexShader: LENSING_VERT,
    fragmentShader: LENSING_FRAG,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uGalaxyTex0: { value: galaxyTex0 },
      uGalaxyTex1: { value: galaxyTex1 },
      uGalaxyTex2: { value: galaxyTex2 },
      uLensPos: { value: lensSmooth },
      uLensRadius: { value: 4.55 },
      uFixedLenses: { value: fixedLenses },
      uCollapsePos: { value: new THREE.Vector2(COLLAPSE_CORE_POS.x, COLLAPSE_CORE_POS.y) },
      uHoverCore: { value: 0 },
    },
  });
  const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
  fieldMesh.frustumCulled = false;
  fieldMesh.renderOrder = 0;
  scene.add(fieldMesh);

  // Invisible raycast hit sphere for the Compact Dark-Mass Collapse Core -> Act 4 Black Hole!
  const collapseHitGeo = new THREE.SphereGeometry(1.65, 20, 16);
  const collapseHitMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    colorWrite: false,
  });
  const collapseHitMesh = new THREE.Mesh(collapseHitGeo, collapseHitMat);
  collapseHitMesh.position.set(COLLAPSE_CORE_POS.x, COLLAPSE_CORE_POS.y, 0);
  collapseHitMesh.name = 'collapse-horizon-core';
  collapseHitMesh.userData.portalTarget = 'blackhole';
  scene.add(collapseHitMesh);

  const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const tmpHit = new THREE.Vector3();

  function triggerLensingAudio(ctx) {
    if (!ctx) return;
    if (typeof ctx.triggerAudio === 'function') {
      ctx.triggerAudio('lensingPing');
    } else if (ctx.audio && typeof ctx.audio.playLensingPing === 'function') {
      ctx.audio.playLensingPing(0.90);
    }
  }

  function updateLensFromRay(raycaster, activeCam, ndc) {
    if (raycaster && raycaster.ray && raycaster.ray.intersectPlane(zPlane, tmpHit)) {
      lensAnim = null;
      lensTarget.set(
        Math.max(-13.2, Math.min(13.2, tmpHit.x)),
        Math.max(-7.6, Math.min(7.6, tmpHit.y))
      );
      return;
    }
    if (ndc && typeof ndc.x === 'number' && typeof ndc.y === 'number') {
      const cam = activeCam || camera;
      const halfH = Math.tan((cam.fov * Math.PI) / 360) * Math.abs(cam.position.z || 22.0);
      const halfW = halfH * (cam.aspect || 1.6);
      lensAnim = null;
      lensTarget.set(
        Math.max(-13.2, Math.min(13.2, ndc.x * halfW)),
        Math.max(-7.6, Math.min(7.6, ndc.y * halfH))
      );
    }
  }

  function glideLensTo(x, y, duration = 1.8) {
    lensTarget.set(x, y);
    lensAnim = {
      fromX: lensSmooth.x,
      fromY: lensSmooth.y,
      toX: x,
      toY: y,
      elapsed: 0,
      duration,
    };
  }

  function setParam(v) {
    const clamped = Math.min(1, Math.max(0, Number(v) || 0));
    lensAnim = null;
    // Map [0..1] smoothly from off-axis (2.2, 0.4) directly onto hero galaxy (-0.85, 0.25) for exact 360° Einstein Ring!
    const lx = 2.2 + (HERO_GALAXY_POS.x - 2.2) * clamped;
    const ly = 0.4 + (HERO_GALAXY_POS.y - 0.4) * clamped;
    lensTarget.set(lx, ly);
    lensSmooth.set(lx, ly);
  }

  function triggerAction(ctx) {
    const distToHero = Math.hypot(lensTarget.x - HERO_GALAXY_POS.x, lensTarget.y - HERO_GALAXY_POS.y);
    if (distToHero > 0.65) {
      glideLensTo(HERO_GALAXY_POS.x, HERO_GALAXY_POS.y, 1.8);
      triggerLensingAudio(ctx);
    } else {
      // Clear secondary dropped lenses
      fixedTargetStrength[0] = 0;
      fixedTargetStrength[1] = 0;
      triggerLensingAudio(ctx);
    }
  }

  function advanceStory(ctx) {
    const distToHero = Math.hypot(lensTarget.x - HERO_GALAXY_POS.x, lensTarget.y - HERO_GALAXY_POS.y);
    if (!ringFormed || distToHero > 0.65) {
      glideLensTo(HERO_GALAXY_POS.x, HERO_GALAXY_POS.y, 1.8);
      triggerLensingAudio(ctx);
      return true;
    }
    return false;
  }

  function update(dt, elapsed, ctx) {
    const safeDt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);
    fieldMat.uniforms.uTime.value = elapsed;

    // Also allow synthetic __COSMIC_DEBUG__.setPointer(nx, ny) via ctx.pointerNdc when active
    if (ctx && ctx.pointerNdc && ctx.pointerNdc.synthetic) {
      updateLensFromRay(null, ctx.camera || camera, ctx.pointerNdc);
    }

    if (lensAnim) {
      lensAnim.elapsed += safeDt;
      const t = Math.min(1, lensAnim.elapsed / lensAnim.duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      lensSmooth.set(
        lensAnim.fromX + (lensAnim.toX - lensAnim.fromX) * ease,
        lensAnim.fromY + (lensAnim.toY - lensAnim.fromY) * ease
      );
      if (t >= 1) {
        lensSmooth.set(lensAnim.toX, lensAnim.toY);
        lensAnim = null;
      }
    } else {
      const k = 1 - Math.exp(-safeDt * 9.5);
      lensSmooth.x += (lensTarget.x - lensSmooth.x) * k;
      lensSmooth.y += (lensTarget.y - lensSmooth.y) * k;
    }

    hoverCoreSmooth += (hoverCoreTarget - hoverCoreSmooth) * (1 - Math.exp(-safeDt * 9.0));
    fieldMat.uniforms.uHoverCore.value = hoverCoreSmooth;

    for (let i = 0; i < MAX_FIXED_LENSES; i++) {
      fixedLenses[i].z += (fixedTargetStrength[i] - fixedLenses[i].z) * (1 - Math.exp(-safeDt * 6.5));
    }

    // Trigger poetic Einstein Ring subtitle once movable lens centers cleanly over the hero spiral galaxy!
    const dHero = Math.hypot(lensSmooth.x - HERO_GALAXY_POS.x, lensSmooth.y - HERO_GALAXY_POS.y);
    if (!ringFormed && dHero < 0.72) {
      ringFormed = true;
      ctx?.setNarrative?.(
        '「爱因斯坦环」完美对齐，星系光线在暗物质晕周遭闭合成环',
        '继续游弋探索或点击叠加透镜，轻触右侧致密核坍缩入黑洞'
      );
    }
  }

  function onEnter(ctx) {
    hoverCoreTarget = 0;
    hoverCoreSmooth = 0;
    lensAnim = null;
    ringFormed = false;
    lensTarget.set(INITIAL_LENS_POS.x, INITIAL_LENS_POS.y);
    lensSmooth.set(INITIAL_LENS_POS.x, INITIAL_LENS_POS.y);
    fixedTargetStrength[0] = 0;
    fixedTargetStrength[1] = 0;
    fixedLenses[0].set(0, 0, 0);
    fixedLenses[1].set(0, 0, 0);
    if (ctx && typeof ctx.setHoverLabel === 'function') {
      ctx.setHoverLabel('');
    }
    ctx?.setNarrative?.(
      '大质量暗物质晕如宇宙透镜，将身后遥远星系的光线弯成巨弧',
      '移动鼠标拖曳透明引力透镜划过任意星系，轻触右侧致密核坍缩入黑洞'
    );
  }

  function onLeave(ctx) {
    hoverCoreTarget = 0;
    lensAnim = null;
    if (ctx && typeof ctx.setHoverLabel === 'function') {
      ctx.setHoverLabel('');
    }
  }

  function onPointerMove(raycaster, ctx) {
    updateLensFromRay(raycaster, ctx && ctx.camera, ctx && ctx.pointerNdc);
    const hits = raycaster.intersectObject(collapseHitMesh, false);
    if (hits.length > 0) {
      hoverCoreTarget = 1.0;
      return { cursor: 'pointer', hoverLabel: '致密暗质量核 · 坍缩跃入黑洞视界' };
    }
    hoverCoreTarget = 0.0;
    return null;
  }

  function onPointerDrag(raycaster, ndc, ctx) {
    updateLensFromRay(raycaster, ctx && ctx.camera, ndc || (ctx && ctx.pointerNdc));
    return true; // Consume drag so pointer glides the gravitational lens smoothly without spinning the field
  }

  function onClick(raycaster, ctx) {
    // 1. Direct click on Compact Dark-Mass Collapse Core -> collapse into Act 4 Schwarzschild Black Hole!
    const coreHits = raycaster.intersectObject(collapseHitMesh, false);
    if (coreHits.length > 0) {
      if (ctx && typeof ctx.setHoverLabel === 'function') {
        ctx.setHoverLabel('');
      }
      return { action: 'transition', to: 'blackhole', mode: 'collapse-horizon' };
    }

    // 2. Click anywhere in the JWST galaxy field -> drop up to 2 fixed transparent lensing halos to combine caustics!
    if (raycaster && raycaster.ray && raycaster.ray.intersectPlane(zPlane, tmpHit)) {
      const slot = nextFixedSlot;
      nextFixedSlot = (nextFixedSlot + 1) % MAX_FIXED_LENSES;
      const fx = Math.max(-12.5, Math.min(12.5, tmpHit.x));
      const fy = Math.max(-7.2, Math.min(7.2, tmpHit.y));
      fixedLenses[slot].set(fx, fy, 0.05);
      fixedTargetStrength[slot] = 1.0;
      triggerLensingAudio(ctx);
      ctx?.setNarrative?.(
        '多重暗物质晕叠加出复杂星系团焦散线，远方星海裂变为多重弧影',
        '移动鼠标与已置透镜交汇，或轻触右侧致密暗质量核坍缩入黑洞'
      );
      if (ctx && ctx.avatar && typeof ctx.avatar.flyTo === 'function') {
        ctx.avatar.flyTo(new THREE.Vector3(fx, fy, 0.2));
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
    fieldGeo.dispose();
    fieldMat.dispose();
    collapseHitGeo.dispose();
    collapseHitMat.dispose();
  }

  return {
    id: 'lensing',
    title: '03 · 引力透镜 · 弯曲星海',
    subtitle: 'III · GRAVITATIONAL LENSING CLUSTER',
    shortLabel: '03 透镜',
    controlsDrag: true,
    defaultHint: '移动鼠标拖曳透明引力透镜划过任意星系，轻触右侧致密核坍缩入黑洞',
    scene,
    camera,
    entryPose: {
      pos: entryPos,
      lookAt: entryLookAt,
      fov: entryFov,
    },
    avatarAnchor: new THREE.Vector3(-4.5, -2.5, 4.0),
    guideTarget: new THREE.Vector3(COLLAPSE_CORE_POS.x, COLLAPSE_CORE_POS.y, 0),
    corePosition: new THREE.Vector3(COLLAPSE_CORE_POS.x, COLLAPSE_CORE_POS.y, 0),
    paramConfig: {
      label: '透镜对齐',
      min: 0,
      max: 1,
      initial: 0.58,
      format: (v) => (v >= 0.92 ? '爱因斯坦环' : '星系团切向弧'),
      actionLabel: '对齐爱因斯坦环',
    },
    setParam,
    triggerAction,
    advanceStory,
    update,
    onEnter,
    onLeave,
    onPointerMove,
    onPointerDrag,
    onClick,
    onKeyAction,
    dispose,
  };
}

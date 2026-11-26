// Act 4: 04 · 黑洞视界 · 史瓦西深渊 (Standalone Interstellar-Grade Schwarzschild Black Hole)
// Pure deep-space astrophysics: zero fog, zero bloom smear, zero outer galaxy stickers.
// Exact unnormalized 3D Schwarzschild null-geodesic Velocity-Verlet ray integration:
//   R_shadow = 4.0, razor-thin pearl-ivory photon ring (1.024x), turbulent Doppler-beamed Keplerian
//   accretion disk (1.15x..3.25x) with seamless upper/lower lensed arches, interactive infalling
//   relativistic plasma streaks spiraling down into the ISCO, and Event Horizon portal -> Act 5 Light Cone.

const R_SHADOW = 4.0;
const DISK_ROLL_RAD = (7.5 * Math.PI) / 180; // majestic Interstellar-style +7.5 deg roll
const MAX_INFALL = 4;

const BLACKHOLE_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const BLACKHOLE_FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uCamPosLocal;
  uniform mat3 uWorldToLocal;
  uniform mat3 uLocalToWorld;
  uniform float uHoverCore;
  uniform vec4 uInfall[4]; // x: radius, y: startAngle, z: progress (0..1), w: active (0 or 1)

  varying vec3 vWorldPos;

  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;
  const float R_SHADOW = 4.0;
  // Exact Schwarzschild radius for critical impact parameter b_crit = (3*sqrt(3)/2) * r_s = 4.0000
  const float R_S = 1.5396007;
  // Physical disk radii GR-magnified (b = r / sqrt(1 - r_s/r)) to apparent 1.14x..3.40x R_shadow
  const float R_DISK_IN = 3.30;
  const float R_DISK_OUT = 12.85;
  const float R_SIM = 21.5;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float polarNoise(float rCoord, float angle, float freqTheta) {
    vec2 uv = vec2(cos(angle), sin(angle)) * freqTheta;
    return vnoise(vec2(rCoord, uv.x * 1.37 + uv.y * 0.89)) * 0.56
         + vnoise(vec2(rCoord * 2.19 + 7.4, uv.y * 2.31 - uv.x * 1.77)) * 0.44;
  }

  // Pure obsidian star-dotted space & restrained diagonal Milky Way dust band (zero muddy fog)
  vec3 sampleStarrySky(vec3 worldDir) {
    vec3 d = normalize(worldDir);

    vec3 galNormal = normalize(vec3(-0.34, 0.91, 0.22));
    float galLat = dot(d, galNormal);
    float bandCore = exp(-galLat * galLat * 62.0);
    float bandWide = exp(-galLat * galLat * 16.0);

    vec3 galU = normalize(cross(galNormal, vec3(0.0, 0.0, 1.0)));
    vec3 galV = cross(galNormal, galU);
    vec2 galCoord = vec2(dot(d, galU), dot(d, galV));
    float lon = atan(galCoord.y, galCoord.x);
    float clump1 = vnoise(vec2(lon * 5.0, galLat * 20.0));
    float clump2 = vnoise(vec2(lon * 12.5 + 3.2, galLat * 38.0));
    float dustRift = smoothstep(0.30, 0.72, vnoise(vec2(lon * 7.5 + 1.1, galLat * 28.0)));

    vec3 mwSilver = vec3(0.011, 0.020, 0.048);
    vec3 mwCore = vec3(0.036, 0.056, 0.125);
    vec3 mw = (mwSilver * bandWide * (0.4 + 0.6 * clump1)
             + mwCore * bandCore * clump2 * (1.0 - 0.58 * dustRift)) * 0.46;

    // Razor-sharp circular pinprick stars in 2 tiers
    vec3 starSum = vec3(0.0);
    for (int tier = 0; tier < 2; tier++) {
      float scale = tier == 0 ? 175.0 : 320.0;
      vec3 cell = floor(d * scale);
      vec3 local = fract(d * scale) - 0.5;
      float rnd = hash13(cell + float(tier) * 19.37);
      float thresh = tier == 0 ? 0.983 : 0.989;
      thresh -= bandCore * 0.008;
      if (rnd > thresh) {
        vec3 jitter = vec3(
          hash13(cell + 1.17),
          hash13(cell + 2.53),
          hash13(cell + 4.91)
        ) - 0.5;
        float dist = length(local - jitter * 0.55);
        float mag = (rnd - thresh) / (1.0 - thresh);
        float starSize = mix(0.088, 0.175, mag * mag);
        float pin = smoothstep(starSize, 0.0, dist);
        pin = pin * pin;

        float temp = hash13(cell + 8.73);
        vec3 tint = temp < 0.32
          ? vec3(0.68, 0.84, 1.0)
          : (temp < 0.74 ? vec3(0.98, 0.98, 1.0) : vec3(1.0, 0.85, 0.62));
        starSum += tint * pin * mix(0.45, 1.58, mag);
      }
    }

    return vec3(0.0002, 0.0004, 0.0012) + mw + starSum;
  }

  // Sculpted relativistic Keplerian accretion disk with organic turbulent filaments & interactive infalling plasma streaks
  vec4 sampleAccretionDisk(vec3 hitP, vec3 camPos, float hitCount) {
    float r = length(hitP.xz);
    if (r < R_DISK_IN || r > R_DISK_OUT) return vec4(0.0);

    float rn = (r - R_DISK_IN) / (R_DISK_OUT - R_DISK_IN);
    float phi = atan(hitP.z, hitP.x);

    float innerFade = smoothstep(0.0, 0.14, rn);
    float outerFade = pow(max(0.0, 1.0 - smoothstep(0.14, 1.0, rn)), 1.65);
    float radialProfile = innerFade * outerFade;
    if (radialProfile < 0.002) return vec4(0.0);

    float omega = 1.85 / pow(max(r * 0.28, 0.52), 1.38);
    float swirlAngle = phi - uTime * omega * 0.45 + log(max(r, 1.0)) * 4.5;

    // Organic turbulent radial warping (natural swirling plasma streams, zero uniform ruled stripes!)
    float n1 = polarNoise(r * 1.45, swirlAngle, 1.6);
    float n2 = polarNoise(r * 3.40 + n1 * 1.75, swirlAngle + 0.85, 2.9);
    float n3 = polarNoise(r * 7.50 - n2 * 1.15, swirlAngle * 2.0 - 0.55, 4.4);
    float rWarp = r + (n1 - 0.5) * 1.25 + (n2 - 0.5) * 0.58;

    float strandA = 0.5 + 0.5 * sin(rWarp * 5.2 + swirlAngle * 2.0 + n2 * 2.6);
    float strandB = 0.5 + 0.5 * sin(rWarp * 11.4 - swirlAngle * 3.0 - n3 * 3.2);
    float strandC = 0.5 + 0.5 * sin(rWarp * 22.0 + swirlAngle * 5.0 + n1 * 3.6);

    float filaments = pow(strandA, 1.6) * 0.52 + pow(strandB, 2.4) * 0.44 + pow(strandC, 3.0) * 0.24;
    filaments *= (0.44 + 0.90 * n2) * (0.66 + 0.56 * n3);

    float innerStream = exp(-pow((rn - 0.12) / 0.082, 2.0)) * (0.36 + 0.82 * pow(strandB, 1.5)) * innerFade;
    float midRibbon = exp(-pow((rn - 0.30) / 0.15, 2.0)) * pow(strandA, 2.0) * 0.42;

    // Interactive infalling relativistic plasma streaks spiraling inward toward the ISCO!
    float infallGlow = 0.0;
    for (int i = 0; i < 4; i++) {
      if (uInfall[i].w > 0.5) {
        float rStart = uInfall[i].x;
        float prog = uInfall[i].z;
        float rHead = mix(rStart, R_DISK_IN + 0.25, prog * prog);
        float headAngle = uInfall[i].y + prog * 7.8;
        // Spiral arm wake trailing behind rHead
        float dr = r - rHead;
        if (dr > -0.6 && dr < 3.6) {
          float expectedAngle = headAngle - dr * 0.95;
          float dAng = atan(sin(phi - expectedAngle), cos(phi - expectedAngle));
          float width = 0.16 + max(0.0, dr) * 0.06;
          float trail = exp(-dAng * dAng / (width * width)) * exp(-max(0.0, dr) * 0.95) * smoothstep(-0.55, 0.05, dr);
          float env = sin(prog * PI);
          infallGlow += trail * env * 1.85;
        }
      }
    }

    float density = (filaments * radialProfile * 1.40 + innerStream * 0.70 + midRibbon * outerFade);

    // Relativistic Doppler beaming: approaching left (+55% pearl-ivory), receding right (-35% burnt copper)
    vec3 velDir = normalize(vec3(hitP.z, 0.0, -hitP.x));
    vec3 toCam = normalize(camPos - hitP);
    float dopplerProj = dot(velDir, toCam);
    float beta = 0.36 * pow(R_DISK_IN / max(r, R_DISK_IN), 0.42);
    float beaming = 1.0 / max(0.38, 1.0 - beta * dopplerProj);
    float dopplerGain = clamp(pow(beaming, 1.15), 0.58, 1.56);
    float dopplerMix = smoothstep(-0.80, 0.80, dopplerProj);

    vec3 colDeepCopper = vec3(0.036, 0.004, 0.001);  // #380d02
    vec3 colBurntAmber = vec3(0.245, 0.020, 0.002);  // #892403
    vec3 colMidAmber   = vec3(0.610, 0.132, 0.012);  // #d0681b
    vec3 colChampagne  = vec3(0.935, 0.745, 0.445);  // #f8d79b
    vec3 colPearlIvory = vec3(0.985, 0.960, 0.900);  // #fefdf7

    float hot = clamp(density * (0.50 + 0.52 * dopplerMix) + innerStream * 0.42, 0.0, 1.55);
    vec3 recedingCol = mix(colDeepCopper, colBurntAmber, smoothstep(0.04, 0.50, hot));
    recedingCol = mix(recedingCol, colMidAmber, smoothstep(0.42, 1.12, hot));

    vec3 approachingCol = mix(colMidAmber, colChampagne, smoothstep(0.14, 0.72, hot));
    approachingCol = mix(approachingCol, colPearlIvory, smoothstep(0.68, 1.38, hot));

    vec3 diskColor = mix(recedingCol, approachingCol, dopplerMix);

    float passWeight = hitCount < 0.5 ? 1.0 : (hitCount < 1.5 ? 0.74 : 0.44);
    vec3 emission = (diskColor * density * dopplerGain + vec3(1.0, 0.90, 0.64) * infallGlow) * passWeight * 1.18;
    float alpha = clamp((density * 0.68 + radialProfile * 0.28 + infallGlow * 0.35) * passWeight, 0.0, 0.94);

    return vec4(emission, alpha);
  }

  void main() {
    vec3 worldRayDir = normalize(vWorldPos - cameraPosition);
    vec3 ro = uCamPosLocal;
    vec3 rd = normalize(uWorldToLocal * worldRayDir);

    vec3 angMom = cross(ro, rd);
    float h2 = dot(angMom, angMom);
    float bImpact = sqrt(h2);
    vec3 localImpactDir = ro - rd * dot(ro, rd);

    float bProj = dot(ro, rd);
    float cSim = dot(ro, ro) - R_SIM * R_SIM;
    vec3 p = ro;
    vec3 v = rd; // Strictly unnormalized Velocity-Verlet photon velocity!

    if (cSim > 0.0) {
      float disc = bProj * bProj - cSim;
      if (disc < 0.0) {
        vec3 col = sampleStarrySky(worldRayDir);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        return;
      }
      float tEnter = max(0.0, -bProj - sqrt(disc));
      p = ro + rd * tEnter;
    }

    vec3 accumLight = vec3(0.0);
    float transmittance = 1.0;
    float hitCount = 0.0;
    bool captured = false;

    const int MAX_STEPS = 148;
    for (int i = 0; i < MAX_STEPS; i++) {
      float r2 = dot(p, p);
      float r = sqrt(r2);

      if (r <= R_S * 1.04) {
        captured = true;
        break;
      }

      if (r > R_SIM + 0.8 && dot(p, v) > 0.0) {
        break;
      }

      float speed = max(length(v), 1.0);
      float ds = clamp(r * 0.072, 0.048, 0.46);
      if (abs(p.y) < 0.95 && r > R_DISK_IN * 0.8 && r < R_DISK_OUT * 1.08) {
        ds = min(ds, max(0.055, abs(p.y) * 0.48 + 0.05));
      }
      float dt = ds / speed;

      vec3 prevP = p;
      float invR5 = 1.0 / max(r2 * r2 * r, 0.16);
      vec3 acc = (-1.5 * R_S * h2 * invR5) * p;

      vec3 nextP = p + v * dt + 0.5 * acc * (dt * dt);
      float nr2 = dot(nextP, nextP);
      float nr = sqrt(nr2);
      vec3 nextAcc = (-1.5 * R_S * h2 / max(nr2 * nr2 * nr, 0.16)) * nextP;
      v = v + 0.5 * (acc + nextAcc) * dt;
      p = nextP;

      if ((prevP.y > 0.0 && p.y <= 0.0) || (prevP.y < 0.0 && p.y >= 0.0)) {
        float frac = abs(prevP.y) / (abs(prevP.y) + abs(p.y) + 1e-6);
        vec3 hitP = mix(prevP, p, frac);
        vec4 disk = sampleAccretionDisk(hitP, ro, hitCount);
        if (disk.a > 0.001) {
          accumLight += disk.rgb * transmittance;
          transmittance *= (1.0 - disk.a * 0.70);
          hitCount += 1.0;
          if (transmittance < 0.03) {
            break;
          }
        }
      }
    }

    // Razor-thin primary Photon Ring right outside the true shadow boundary (1.022 * R_SHADOW)
    float photonRingPrimary = exp(-pow((bImpact - R_SHADOW * 1.022) / 0.025, 2.0));
    float outerHairline = exp(-pow((bImpact - R_SHADOW * 1.355) / 0.024, 2.0)) * 0.24;
    float hoverBoost = 1.0 + uHoverCore * 0.32;

    vec3 leftAxis = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(ro)));
    float ringSide = dot(normalize(localImpactDir + vec3(1e-5)), leftAxis);
    float ringDoppler = mix(0.80, 1.24, smoothstep(-0.85, 0.85, -ringSide));

    vec3 photonCol = vec3(0.96, 0.86, 0.68);
    vec3 hairlineCol = vec3(0.82, 0.48, 0.16);

    if (!captured) {
      vec3 escapedWorldDir = normalize(uLocalToWorld * normalize(v));
      vec3 bgSky = sampleStarrySky(escapedWorldDir);
      accumLight += bgSky * transmittance;

      accumLight += photonCol * photonRingPrimary * ringDoppler * hoverBoost * (0.45 + 0.55 * transmittance) * 2.15;
      accumLight += hairlineCol * outerHairline * ringDoppler * (0.35 + 0.65 * transmittance) * 1.05;
    }

    gl_FragColor = vec4(accumLight, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createWorld(THREE, shared) {
  const scene = new THREE.Scene();
  scene.fog = null;
  scene.background = new THREE.Color(0x000003);
  if (shared && shared.envMap) {
    scene.environment = shared.envMap;
  }

  // Majestic uninterrupted Interstellar-grade framing: R_shadow = 4.0 + lensed arches 100% uncropped above subtitle!
  const entryPos = new THREE.Vector3(0, 2.2, 20.6);
  const entryLookAt = new THREE.Vector3(0, -0.35, 0);
  const entryFov = 42;

  const camera = new THREE.PerspectiveCamera(
    entryFov,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.05,
    800
  );
  camera.position.copy(entryPos);
  camera.lookAt(entryLookAt);

  const bhQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), DISK_ROLL_RAD);
  const localToWorldMat4 = new THREE.Matrix4().makeRotationFromQuaternion(bhQuat);
  const worldToLocalMat4 = localToWorldMat4.clone().invert();
  const localToWorldMat3 = new THREE.Matrix3().setFromMatrix4(localToWorldMat4);
  const worldToLocalMat3 = new THREE.Matrix3().setFromMatrix4(worldToLocalMat4);

  // Interactive infalling relativistic plasma streaks (up to 4 active spiraling streams)
  const infallStreaks = [
    new THREE.Vector4(9.0, 0.0, 0.0, 0.0),
    new THREE.Vector4(9.0, 0.0, 0.0, 0.0),
    new THREE.Vector4(9.0, 0.0, 0.0, 0.0),
    new THREE.Vector4(9.0, 0.0, 0.0, 0.0),
  ];
  let nextInfallSlot = 0;
  let infallTriggered = false;

  const bhGeo = new THREE.SphereGeometry(85, 48, 32);
  const bhMat = new THREE.ShaderMaterial({
    vertexShader: BLACKHOLE_VERT,
    fragmentShader: BLACKHOLE_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uCamPosLocal: { value: entryPos.clone().applyMatrix3(worldToLocalMat3) },
      uWorldToLocal: { value: worldToLocalMat3 },
      uLocalToWorld: { value: localToWorldMat3 },
      uHoverCore: { value: 0 },
      uInfall: { value: infallStreaks },
    },
  });
  const bhDomainMesh = new THREE.Mesh(bhGeo, bhMat);
  bhDomainMesh.frustumCulled = false;
  bhDomainMesh.renderOrder = 0;
  scene.add(bhDomainMesh);

  // Invisible hit-target for Event Horizon shadow -> Act 5 Light Cone
  const singularityGeo = new THREE.SphereGeometry(R_SHADOW * 1.06, 32, 24);
  const singularityMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    colorWrite: false,
  });
  const singularityHitMesh = new THREE.Mesh(singularityGeo, singularityMat);
  singularityHitMesh.name = 'event-horizon-portal';
  singularityHitMesh.userData.portalTarget = 'lightcone';
  scene.add(singularityHitMesh);

  // Invisible tilted equatorial disk plane for clicking infalling plasma streaks
  const diskPlaneNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(bhQuat).normalize();
  const diskPlane = new THREE.Plane(diskPlaneNormal, 0);

  let hoverTarget = 0;
  let hoverSmooth = 0;
  const tmpCamLocal = new THREE.Vector3();
  const tmpDiskHit = new THREE.Vector3();
  const tmpDiskLocal = new THREE.Vector3();

  function triggerHorizonAudio(ctx) {
    if (!ctx) return;
    if (typeof ctx.triggerAudio === 'function') {
      ctx.triggerAudio('lensingPing');
    } else if (ctx.audio && typeof ctx.audio.playLensingPing === 'function') {
      ctx.audio.playLensingPing(0.85);
    }
  }

  function launchInfallStreak(rStart, startAngle, ctx) {
    const slot = nextInfallSlot;
    nextInfallSlot = (nextInfallSlot + 1) % MAX_INFALL;
    const rClamped = Math.max(4.6, Math.min(11.8, rStart));
    infallStreaks[slot].set(rClamped, startAngle, 0.001, 1.0);
    triggerHorizonAudio(ctx);

    if (!infallTriggered) {
      infallTriggered = true;
      ctx?.setNarrative?.(
        '被潮汐撕裂的炽热等离子沿螺旋轨道坠向视界，最后一瞬被红移定格',
        '继续拖动环绕吸积盘，或轻触中央黑洞视界穿越因果边界'
      );
    }
  }

  function setParam(v) {
    // Allow QA/debug to trigger a clean infalling streak when parameter increases
    if (Number(v) > 0.6) {
      launchInfallStreak(9.2, 2.4, null);
    }
  }

  function triggerAction(ctx) {
    launchInfallStreak(8.8 + Math.random() * 2.4, Math.random() * Math.PI * 2, ctx);
  }

  function advanceStory(ctx) {
    if (!infallTriggered) {
      launchInfallStreak(9.4, 2.2, ctx);
      launchInfallStreak(8.2, 5.1, ctx);
      return true;
    }
    return false;
  }

  function update(dt, elapsed, ctx) {
    const safeDt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);
    const activeCam = (ctx && ctx.camera) || camera;

    tmpCamLocal.copy(activeCam.position).applyMatrix3(worldToLocalMat3);
    bhMat.uniforms.uCamPosLocal.value.copy(tmpCamLocal);
    bhMat.uniforms.uTime.value = elapsed;

    hoverSmooth += (hoverTarget - hoverSmooth) * (1 - Math.exp(-safeDt * 9.0));
    bhMat.uniforms.uHoverCore.value = hoverSmooth;

    for (let i = 0; i < MAX_INFALL; i++) {
      if (infallStreaks[i].w > 0.5) {
        infallStreaks[i].z += safeDt * 0.42;
        if (infallStreaks[i].z >= 1.0) {
          infallStreaks[i].set(9.0, 0.0, 0.0, 0.0);
        }
      }
    }
  }

  function onEnter(ctx) {
    hoverTarget = 0;
    hoverSmooth = 0;
    infallTriggered = false;
    for (let i = 0; i < MAX_INFALL; i++) {
      infallStreaks[i].set(9.0, 0.0, 0.0, 0.0);
    }
    if (ctx && typeof ctx.setHoverLabel === 'function') {
      ctx.setHoverLabel('');
    }
    ctx?.setNarrative?.(
      '当质量坍缩至史瓦西半径之内，连光也被锁入永夜视界',
      '拖动环绕吸积盘，轻触吸积流激发坠落等离子，或轻触黑洞视界穿越边界'
    );
  }

  function onLeave(ctx) {
    hoverTarget = 0;
    if (ctx && typeof ctx.setHoverLabel === 'function') {
      ctx.setHoverLabel('');
    }
  }

  function onPointerMove(raycaster) {
    const coreHits = raycaster.intersectObject(singularityHitMesh, false);
    if (coreHits.length > 0) {
      hoverTarget = 1.0;
      return { cursor: 'pointer', hoverLabel: '事件视界 · 穿越因果边界' };
    }
    hoverTarget = 0.0;

    if (raycaster.ray.intersectPlane(diskPlane, tmpDiskHit)) {
      tmpDiskLocal.copy(tmpDiskHit).applyMatrix3(worldToLocalMat3);
      const r = Math.hypot(tmpDiskLocal.x, tmpDiskLocal.z);
      if (r >= 4.2 && r <= 12.6) {
        return { cursor: 'pointer', hoverLabel: '吸积盘 · 轻触激发坠入视界的等离子流' };
      }
    }
    return null;
  }

  function onClick(raycaster, ctx) {
    // 1. Direct click on Event Horizon shadow -> dive across causal boundary into Act 5 Light Cone
    const coreHits = raycaster.intersectObject(singularityHitMesh, false);
    if (coreHits.length > 0) {
      if (ctx && typeof ctx.setHoverLabel === 'function') {
        ctx.setHoverLabel('');
      }
      return { action: 'transition', to: 'lightcone', mode: 'horizon-dive' };
    }

    // 2. Click on accretion disk (or surrounding space) -> launch spiraling infalling plasma streak into ISCO!
    if (raycaster.ray.intersectPlane(diskPlane, tmpDiskHit)) {
      tmpDiskLocal.copy(tmpDiskHit).applyMatrix3(worldToLocalMat3);
      const r = Math.hypot(tmpDiskLocal.x, tmpDiskLocal.z);
      const ang = Math.atan2(tmpDiskLocal.z, tmpDiskLocal.x);
      launchInfallStreak(Math.max(5.2, Math.min(11.6, r)), ang, ctx);
      if (ctx && ctx.avatar && typeof ctx.avatar.flyTo === 'function') {
        ctx.avatar.flyTo(tmpDiskHit.clone());
      }
      return true;
    }

    launchInfallStreak(9.2, Math.random() * Math.PI * 2, ctx);
    return true;
  }

  function onKeyAction(key, ctx) {
    if (key === 'Space') {
      triggerAction(ctx);
    }
  }

  function dispose() {
    bhGeo.dispose();
    bhMat.dispose();
    singularityGeo.dispose();
    singularityMat.dispose();
  }

  return {
    id: 'blackhole',
    title: '04 · 黑洞视界 · 史瓦西深渊',
    subtitle: 'IV · SCHWARZSCHILD EVENT HORIZON',
    shortLabel: '04 黑洞',
    defaultHint: '拖动环绕吸积盘，轻触中央黑洞视界穿越因果边界',
    scene,
    camera,
    entryPose: {
      pos: entryPos,
      lookAt: entryLookAt,
      fov: entryFov,
    },
    avatarAnchor: new THREE.Vector3(-4.5, -1.6, 11.2),
    guideTarget: new THREE.Vector3(0, 0, 0),
    corePosition: new THREE.Vector3(0, 0, 0),
    paramConfig: {
      label: '坠落吸积',
      min: 0,
      max: 1,
      initial: 0.2,
      format: () => '史瓦西视界',
      actionLabel: '激发等离子流',
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

// Pure Astrophysics 5-Act Continuous Cinema Narrative Engine (v4)
// 《时空织物 · 一束光子的 138 亿年》
// 5 Acts: bigbang -> curvature -> lensing -> blackhole -> lightcone -> bigbang
// Zero fog, zero UnrealBloomPass, ACESFilmic, PCFShadowMap, 42° FOV, ephemeral optical light ripples (zero floating ball).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createTextureRegistry, disposeAllCachedTextures } from './shared/textures.js';
import { createOpticalPulseFX } from './avatar.js';

export const WORLD_ORDER = ['bigbang', 'curvature', 'lensing', 'blackhole', 'lightcone'];

const WORLD_SPECS = [
  { id: 'bigbang', modulePath: './worlds/worldBigBang.js', factoryNames: ['createWorld', 'createBigBangWorld', 'default'] },
  { id: 'curvature', modulePath: './worlds/worldCurvature.js', factoryNames: ['createWorld', 'createCurvatureWorld', 'default'] },
  { id: 'lensing', modulePath: './worlds/worldLensing.js', factoryNames: ['createWorld', 'createLensingWorld', 'default'] },
  { id: 'blackhole', modulePath: './worlds/worldBlackHole.js', factoryNames: ['createWorld', 'createBlackHoleWorld', 'default'] },
  { id: 'lightcone', modulePath: './worlds/worldLightCone.js', factoryNames: ['createWorld', 'createLightConeWorld', 'default'] },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function toVec3(v, fallback = [0, 0, 0]) {
  if (!v) return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
  if (typeof v === 'object') return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}

function getTransitionStyle(fromId, toId) {
  if (fromId === 'bigbang' && toId === 'curvature') return 'trumpet-dive';
  if (fromId === 'curvature' && toId === 'lensing') return 'well-dive';
  if (fromId === 'lensing' && toId === 'blackhole') return 'collapse-horizon';
  if (fromId === 'blackhole' && toId === 'lightcone') return 'horizon-dive';
  if (fromId === 'lightcone' && toId === 'bigbang') return 'singularity-morph';
  return 'crossfade';
}

function getTransitionDuration(style) {
  switch (style) {
    case 'trumpet-dive': return 2.2;
    case 'well-dive': return 2.1;
    case 'collapse-horizon': return 2.2;
    case 'horizon-dive': return 2.3;
    case 'singularity-morph': return 2.8;
    default: return 0.9;
  }
}

/**
 * Full-screen linear-parity transition composite pass (zero bloom, zero fog):
 * Handles dual-RT cross-dissolve, relativistic gravitational lensing warp, and white-gold flash iris.
 */
function createCompositePass() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
    uniforms: {
      tOverlay: { value: null },
      uOverlayAlpha: { value: 0.0 },
      uWashColor: { value: new THREE.Color(0xfff4d8) },
      uWashAlpha: { value: 0.0 },
      uWarpAmount: { value: 0.0 },
      uIrisAmount: { value: 0.0 },
      uAspect: { value: 16 / 9 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tOverlay;
      uniform float uOverlayAlpha;
      uniform vec3 uWashColor;
      uniform float uWashAlpha;
      uniform float uWarpAmount;
      uniform float uIrisAmount;
      uniform float uAspect;
      varying vec2 vUv;

      void main() {
        vec2 centered = vUv - 0.5;
        vec2 aspectC = vec2(centered.x * uAspect, centered.y);
        float r = length(aspectC);

        vec4 outCol = vec4(0.0);

        if (uOverlayAlpha > 0.001) {
          vec2 sampleUv = vUv;
          if (uWarpAmount > 0.001) {
            float bend = uWarpAmount * 0.14 / (r + 0.18);
            vec2 dir = r > 0.0001 ? aspectC / r : vec2(0.0);
            sampleUv -= vec2(dir.x / uAspect, dir.y) * bend * smoothstep(0.92, 0.05, r);
            sampleUv = clamp(sampleUv, vec2(0.001), vec2(0.999));
          }
          vec4 tex = texture2D(tOverlay, sampleUv);
          outCol = vec4(tex.rgb, uOverlayAlpha);
        }

        float wash = uWashAlpha;
        if (uIrisAmount > 0.001) {
          float irisRing = smoothstep(0.95, 0.0, r - (uIrisAmount * 1.35 - 0.35));
          wash = max(wash, irisRing * uIrisAmount);
        }

        if (wash > 0.001) {
          float denom = max(outCol.a + wash * (1.0 - outCol.a), 0.001);
          vec3 mixedRgb = mix(outCol.rgb, uWashColor, clamp(wash / denom, 0.0, 1.0));
          float mixedA = clamp(outCol.a + wash * (1.0 - outCol.a), 0.0, 1.0);
          outCol = vec4(mixedRgb, mixedA);
        }

        if (outCol.a < 0.002) discard;
        gl_FragColor = outCol;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  return {
    scene,
    camera,
    material,
    uniforms: material.uniforms,
    dispose() {
      quad.geometry.dispose();
      material.dispose();
    },
  };
}

/**
 * Pure deep-space astrophysical fallback worlds for all 5 acts so the engine ALWAYS boots cleanly.
 */
function createPlaceholderWorld(id, shared) {
  const scene = new THREE.Scene();
  scene.background = shared.textures.createStarfieldEnvTexture();
  if (shared.envMap) scene.environment = shared.envMap;

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.08, 600);
  scene.add(new THREE.HemisphereLight(0xdce8ff, 0x0b1020, 0.65));
  const key = new THREE.DirectionalLight(0xfff2dc, 1.6);
  key.position.set(14, 18, 12);
  scene.add(key);

  if (id === 'bigbang') {
    const point = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 24), new THREE.MeshBasicMaterial({ color: 0xfff8e6 }));
    point.position.set(-16, 0, 0);
    scene.add(point);
    return {
      id: 'bigbang',
      title: '01 · 奇点与宇宙暴胀',
      isPlaceholder: true,
      scene,
      camera,
      entryPose: { pos: new THREE.Vector3(0, 2.0, 36.0), lookAt: new THREE.Vector3(0, 0, 0), fov: 42 },
      singularityPos: new THREE.Vector3(-16, 0, 0),
      nodePosition: new THREE.Vector3(16, 0, 0),
      update() {},
    };
  }

  if (id === 'curvature') {
    const star = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ map: shared.textures.createStarPhotosphereTexture() }));
    scene.add(star);
    return {
      id: 'curvature',
      title: '02 · 广义相对论 · 时空曲率',
      isPlaceholder: true,
      scene,
      camera,
      entryPose: { pos: new THREE.Vector3(0, 13.8, 29.5), lookAt: new THREE.Vector3(0, -2.4, 0), fov: 42 },
      throatPosition: new THREE.Vector3(0, -10.5, 0),
      update(dt, elapsed) { star.rotation.y = elapsed * 0.2; },
    };
  }

  if (id === 'lensing') {
    const lensSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 36, 36),
      new THREE.MeshPhysicalMaterial({ color: 0x88bfff, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.1 })
    );
    scene.add(lensSphere);
    return {
      id: 'lensing',
      title: '03 · 引力透镜 · 弯曲星海',
      isPlaceholder: true,
      controlsDrag: true,
      scene,
      camera,
      entryPose: { pos: new THREE.Vector3(0, 0, 24.0), lookAt: new THREE.Vector3(0, 0, 0), fov: 42 },
      lensPosition: lensSphere.position,
      onPointerMove(rc, ctx) {
        lensSphere.position.set(ctx.pointerNdc.x * 9.0, ctx.pointerNdc.y * 5.2, 0);
      },
      onClick(rc) {
        if (rc.intersectObject(lensSphere, false).length > 0) {
          return { action: 'transition', to: 'blackhole', mode: 'collapse-horizon' };
        }
        return false;
      },
      update() {},
    };
  }

  if (id === 'blackhole') {
    const shadow = new THREE.Mesh(new THREE.SphereGeometry(3.6, 48, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    scene.add(shadow);
    return {
      id: 'blackhole',
      title: '04 · 黑洞视界 · 史瓦西深渊',
      isPlaceholder: true,
      scene,
      camera,
      entryPose: { pos: new THREE.Vector3(0, 2.2, 24.8), lookAt: new THREE.Vector3(0, -0.35, 0), fov: 42 },
      corePosition: new THREE.Vector3(0, 0, 0),
      update() {},
      onClick(rc) {
        if (rc.intersectObject(shadow, false).length > 0) {
          return { action: 'transition', to: 'lightcone', mode: 'horizon-dive' };
        }
        return false;
      },
    };
  }

  const seedOrigin = new THREE.Vector3(0, -14.2, 0);
  const seed = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), new THREE.MeshBasicMaterial({ color: 0xfff6dc }));
  seed.position.copy(seedOrigin);
  scene.add(seed);
  return {
    id: 'lightcone',
    title: '05 · 因果光锥 · 回归奇点',
    isPlaceholder: true,
    scene,
    camera,
    entryPose: { pos: new THREE.Vector3(0, 5.4, 42.0), lookAt: new THREE.Vector3(0, -2.0, 0), fov: 42 },
    singularityAnchor: { origin: seedOrigin, scale: 0.085, rotationY: 0 },
    update() {},
    onClick(rc) {
      if (rc.intersectObject(seed, false).length > 0) {
        return { action: 'transition', to: 'bigbang', mode: 'singularity-morph' };
      }
      return false;
    },
  };
}

function normalizeWorld(world, fallbackId) {
  const id = world.id || fallbackId;
  if (world.scene) {
    world.scene.fog = null;
  }
  const ep = world.entryPose || {};
  world.entryPose = {
    pos: toVec3(ep.pos, [0, 3.2, 26.0]),
    lookAt: toVec3(ep.lookAt, [0, 0, 0]),
    fov: typeof ep.fov === 'number' ? ep.fov : 42,
  };
  if (world.nodePosition) world.nodePosition = toVec3(world.nodePosition);
  if (world.throatPosition) world.throatPosition = toVec3(world.throatPosition);
  if (world.lensPosition && !world.lensPosition.isVector3) world.lensPosition = toVec3(world.lensPosition);
  if (world.corePosition) world.corePosition = toVec3(world.corePosition);
  if (world.singularityPos) world.singularityPos = toVec3(world.singularityPos);
  if (world.singularityPose) {
    world.singularityPose = {
      pos: toVec3(world.singularityPose.pos, [-16, 0.4, 8]),
      lookAt: toVec3(world.singularityPose.lookAt, [-16, 0, 0]),
      fov: typeof world.singularityPose.fov === 'number' ? world.singularityPose.fov : 42,
    };
  }

  const rawAnchor = world.singularityAnchor || world.miniAnchor;
  if (rawAnchor) {
    world.singularityAnchor = {
      origin: toVec3(rawAnchor.origin, [0, -14.2, 0]),
      scale: typeof rawAnchor.scale === 'number' ? rawAnchor.scale : 0.085,
      rotationY: typeof rawAnchor.rotationY === 'number' ? rawAnchor.rotationY : 0,
      matchCamPos: rawAnchor.matchCamPos ? toVec3(rawAnchor.matchCamPos) : null,
      matchLookAt: rawAnchor.matchLookAt ? toVec3(rawAnchor.matchLookAt) : null,
    };
  }

  if (!world.camera) {
    world.camera = new THREE.PerspectiveCamera(
      world.entryPose.fov,
      window.innerWidth / window.innerHeight,
      0.05,
      900
    );
  }
  world.id = id;
  return world;
}

export async function createCosmicEngine({ canvas, audio, callbacks = {} }) {
  // 1. Crisp No-Bloom WebGLRenderer (ACESFilmic, PCFShadowMap, zero warnings)
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.autoClear = false;

  // 2. Shared PMREM Studio Environment Map
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  const envMap = envRT.texture;
  roomEnv.dispose();
  pmrem.dispose();

  const textures = createTextureRegistry();
  const shared = {
    envMap,
    textures,
    audio,
    renderer,
    maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
  };

  // 3. Linear-space Overlay RenderTarget for transitions
  let viewportW = Math.max(1, window.innerWidth);
  let viewportH = Math.max(1, window.innerHeight);
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  const overlayRT = new THREE.WebGLRenderTarget(
    Math.floor(viewportW * dpr()),
    Math.floor(viewportH * dpr()),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }
  );
  overlayRT.texture.colorSpace = THREE.LinearSRGBColorSpace;

  const composite = createCompositePass();
  composite.uniforms.uAspect.value = viewportW / viewportH;

  // 4. Load all 5 pure-astrophysics worlds
  const worlds = {};
  const paramValues = {};

  await Promise.all(
    WORLD_SPECS.map(async (spec) => {
      try {
        const mod = await import(spec.modulePath);
        const factory = spec.factoryNames.map((n) => mod[n]).find((fn) => typeof fn === 'function');
        if (!factory) throw new Error(`No createWorld export in ${spec.modulePath}`);
        worlds[spec.id] = normalizeWorld(factory(THREE, shared), spec.id);
      } catch (err) {
        console.warn(`[cosmic-engine] Using fallback for "${spec.id}":`, err?.message || err);
        worlds[spec.id] = normalizeWorld(createPlaceholderWorld(spec.id, shared), spec.id);
      }
      const w = worlds[spec.id];
      const initVal = w.paramConfig && typeof w.paramConfig.initial === 'number' ? w.paramConfig.initial : 0.03;
      paramValues[spec.id] = initVal;
    })
  );

  // 5. Ephemeral Optical Starlight Ripple FX (ZERO persistent floating ball!)
  const pulseFX = createOpticalPulseFX(THREE);

  // 6. Camera, Pointer, Narrative & Auto-Story State
  let activeId = 'bigbang';
  let autoStory = false;
  let storyTimer = 0;
  let storyStep = 0;
  let fpsEstimate = 60;
  let disposed = false;

  const narrativeState = { line: '', cue: '' };
  let worldSetNarrativeOnEnter = false;

  const camState = {
    yaw: 0,
    pitch: 0,
    zoom: 1.0,
    targetYaw: 0,
    targetPitch: 0,
    targetZoom: 1.0,
    flyOffset: new THREE.Vector3(),
    flyVelocity: new THREE.Vector3(),
    currentPos: new THREE.Vector3(),
    currentLook: new THREE.Vector3(),
    currentFov: 42,
  };

  let transition = null;

  const raycaster = new THREE.Raycaster();
  const pointerVec = new THREE.Vector2(0, 0);
  const pointerNdc = { x: 0, y: 0, active: false };
  const keysDown = new Set();

  let isDragging = false;
  let dragConsumedByWorld = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pointerTravel = 0;

  const tmpV1 = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const tmpV3 = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpRayPlane = new THREE.Plane();

  function getActiveWorld() {
    return worlds[activeId];
  }

  function applyWorldAspect(world) {
    if (!world || !world.camera) return;
    const aspect = viewportW / viewportH;
    if (Math.abs(world.camera.aspect - aspect) > 1e-4) {
      world.camera.aspect = aspect;
      world.camera.updateProjectionMatrix();
    }
  }

  function triggerAudioCue(name, arg) {
    if (!audio) return;
    switch (name) {
      case 'gwChirp':
      case 'gravWave':
      case 'chirp': audio.playGravWaveChirp(arg); break;
      case 'lensingPing': audio.playLensingPing(arg); break;
      case 'causalPulse':
      case 'causalBell': audio.playCausalBell(); break;
      case 'bigbangPulse':
      case 'epochPulse': audio.playBigBangPulse(arg); break;
      case 'click': audio.playClickTone(); break;
      case 'whoosh':
      case 'transition': audio.playTransitionWhoosh(arg); break;
      default: break;
    }
  }

  function setNarrative(line, cue = '', opts = {}) {
    const nextLine = typeof line === 'string' ? line : '';
    const nextCue = typeof cue === 'string' ? cue : '';
    if (nextLine === narrativeState.line && nextCue === narrativeState.cue) return;
    narrativeState.line = nextLine;
    narrativeState.cue = nextCue;
    worldSetNarrativeOnEnter = true;
    callbacks.onNarrativeChange && callbacks.onNarrativeChange(nextLine, nextCue, opts);
  }

  function setParam(value) {
    const w = getActiveWorld();
    if (!w) return;
    const min = w.paramConfig && typeof w.paramConfig.min === 'number' ? w.paramConfig.min : 0;
    const max = w.paramConfig && typeof w.paramConfig.max === 'number' ? w.paramConfig.max : 1;
    const clamped = clamp(Number(value), min, max);
    paramValues[activeId] = clamped;
    if (typeof w.setParam === 'function') {
      w.setParam(clamped);
    }
  }

  function triggerAction() {
    const w = getActiveWorld();
    if (!w) return;
    const ctx = buildWorldCtx(0, (performance.now() - startTime) * 0.001, w);
    if (typeof w.triggerAction === 'function') {
      w.triggerAction(ctx);
    } else if (typeof w.advanceStory === 'function') {
      w.advanceStory(ctx);
    } else if (typeof w.onKeyAction === 'function') {
      w.onKeyAction('Space', ctx);
    }
  }

  function advanceStory() {
    const w = getActiveWorld();
    if (!w) return;
    const ctx = buildWorldCtx(0, (performance.now() - startTime) * 0.001, w);
    if (typeof w.advanceStory === 'function') {
      w.advanceStory(ctx);
    } else if (typeof w.triggerAction === 'function') {
      w.triggerAction(ctx);
    }
  }

  function buildWorldCtx(dt = 0, elapsed = 0, worldOverride = null) {
    const world = worldOverride || getActiveWorld();
    const wid = world ? world.id : activeId;
    const isAct = wid === activeId;
    return {
      camera: world ? world.camera : null,
      avatar: pulseFX,
      pulseFX,
      audio,
      raycaster,
      param: paramValues[wid],
      pointerNdc,
      dt,
      elapsed,
      orbit: {
        yaw: camState.yaw,
        pitch: camState.pitch,
        zoom: camState.zoom,
        isDragging,
      },
      transitionTo: (targetId, style) => startTransition(targetId, style),
      triggerAudio: triggerAudioCue,
      setNarrative: (line, cue) => {
        if (isAct) setNarrative(line, cue);
      },
      setHoverLabel: (label) => {
        if (isAct && callbacks.onHoverLabel) callbacks.onHoverLabel(label || '');
      },
      setHint: (text) => {
        if (isAct && text) setNarrative(narrativeState.line, text);
      },
      setParam: (v) => setParam(v),
      setActionLabel: () => {},
      syncParamUI: (newVal) => {
        if (typeof newVal === 'number') paramValues[wid] = newVal;
      },
    };
  }

  function computeOrbitPose(world, yaw, pitch, zoom, flyOffset, outPos, outLook) {
    const basePos = world.entryPose.pos;
    const baseLook = world.entryPose.lookAt;
    tmpV1.subVectors(basePos, baseLook);
    const radius = tmpV1.length() * zoom;
    const baseSph = new THREE.Spherical().setFromVector3(tmpV1);

    baseSph.theta += yaw;
    baseSph.phi = clamp(baseSph.phi + pitch, 0.14, Math.PI * 0.62);
    baseSph.radius = Math.max(1.2, radius);

    outLook.copy(baseLook);
    if (flyOffset && world.id === 'lightcone') {
      outLook.add(flyOffset);
    }
    outPos.setFromSpherical(baseSph).add(outLook);
  }

  function syncCameraToPose(cam, pos, look, fov) {
    cam.position.copy(pos);
    cam.lookAt(look);
    if (typeof fov === 'number' && Math.abs(cam.fov - fov) > 0.001) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }

  function resetCameraOffsets() {
    camState.yaw = 0;
    camState.pitch = 0;
    camState.zoom = 1.0;
    camState.targetYaw = 0;
    camState.targetPitch = 0;
    camState.targetZoom = 1.0;
    camState.flyOffset.set(0, 0, 0);
    camState.flyVelocity.set(0, 0, 0);
  }

  function enterWorldImmediate(targetId, { instantNarrative = false } = {}) {
    if (!worlds[targetId]) return;
    const prevWorld = worlds[activeId];
    const nextWorld = worlds[targetId];

    if (prevWorld && prevWorld !== nextWorld && typeof prevWorld.onLeave === 'function') {
      prevWorld.onLeave(buildWorldCtx(0, 0, prevWorld));
    }

    activeId = targetId;
    transition = null;
    storyTimer = 0;
    storyStep = 0;
    pulseFX.clearAll();
    resetCameraOffsets();
    applyWorldAspect(nextWorld);

    camState.currentPos.copy(nextWorld.entryPose.pos);
    camState.currentLook.copy(nextWorld.entryPose.lookAt);
    camState.currentFov = nextWorld.entryPose.fov;
    syncCameraToPose(nextWorld.camera, camState.currentPos, camState.currentLook, camState.currentFov);

    audio.setAct(targetId);

    worldSetNarrativeOnEnter = false;
    if (typeof nextWorld.onEnter === 'function') {
      const enterCtx = buildWorldCtx(0, 0, nextWorld);
      if (instantNarrative) {
        enterCtx.setNarrative = (line, cue) => setNarrative(line, cue, { instant: true });
      }
      nextWorld.onEnter(enterCtx);
    }

    callbacks.onWorldChange && callbacks.onWorldChange({
      id: nextWorld.id,
      title: nextWorld.title || nextWorld.id,
      hasCustomNarrative: worldSetNarrativeOnEnter,
      instant: instantNarrative,
    });
    callbacks.onHoverLabel && callbacks.onHoverLabel('');
  }

  function startTransition(targetId, forcedStyle = null, { holdAtProgress = null } = {}) {
    if (!worlds[targetId]) return;
    if (targetId === activeId && !transition && holdAtProgress === null) return;

    const fromId = activeId;
    const style = forcedStyle || getTransitionStyle(fromId, targetId);
    const duration = getTransitionDuration(style);
    const fromWorld = worlds[fromId];
    const toWorld = worlds[targetId];

    applyWorldAspect(fromWorld);
    applyWorldAspect(toWorld);

    if (style === 'singularity-morph' && targetId === 'bigbang') {
      // Always reset Act 1 to its solitary primordial Planck Point (even during held QA frames)
      // so the expanded trumpet never washes out the morph!
      if (typeof toWorld.setParam === 'function') {
        toWorld.setParam(0.02);
        paramValues.bigbang = 0.02;
      }
    }

    transition = {
      fromId,
      toId: targetId,
      style,
      duration,
      progress: holdAtProgress !== null ? clamp(holdAtProgress, 0, 1) : 0,
      held: holdAtProgress !== null,
      startPos: fromWorld.camera.position.clone(),
      startLook: camState.currentLook.clone(),
      startFov: fromWorld.camera.fov,
      switchedHalfway: false,
    };

    pulseFX.setTransitionMode(style, transition.progress);
    audio.playTransitionWhoosh(style);
    audio.setAct(targetId);
    callbacks.onHoverLabel && callbacks.onHoverLabel('');
    callbacks.onTransitionState && callbacks.onTransitionState(true, { from: fromId, to: targetId, style });
  }

  function goTo(targetId, instant = false) {
    if (!worlds[targetId]) return;
    storyTimer = 0;
    storyStep = 0;
    if (instant) {
      enterWorldImmediate(targetId, { instantNarrative: true });
      callbacks.onTransitionState && callbacks.onTransitionState(false, null);
    } else {
      startTransition(targetId);
    }
  }

  function renderTransitionFrame(dt, elapsed) {
    const tr = transition;
    const fromWorld = worlds[tr.fromId];
    const toWorld = worlds[tr.toId];

    if (!tr.held) {
      tr.progress = clamp(tr.progress + dt / tr.duration, 0, 1);
    }
    const p = tr.progress;

    if (typeof fromWorld.update === 'function') fromWorld.update(dt, elapsed, buildWorldCtx(dt, elapsed, fromWorld));
    if (typeof toWorld.update === 'function') toWorld.update(dt, elapsed, buildWorldCtx(dt, elapsed, toWorld));

    composite.uniforms.tOverlay.value = null;
    composite.uniforms.uOverlayAlpha.value = 0.0;
    composite.uniforms.uWashAlpha.value = 0.0;
    composite.uniforms.uWarpAmount.value = 0.0;
    composite.uniforms.uIrisAmount.value = 0.0;

    if (tr.style === 'trumpet-dive') {
      // Act 1 -> Act 2: fly into the luminous galaxy-cluster node at the wide right mouth of the inflation trumpet
      const nodePos = fromWorld.nodePosition || new THREE.Vector3(16.0, 0.0, 0.0);
      const u1 = easeInOutCubic(clamp(p / 0.72, 0, 1));
      const diveEnd = nodePos.clone().lerp(tr.startPos, 0.16);
      tmpV1.lerpVectors(tr.startPos, diveEnd, u1);
      tmpV2.lerpVectors(tr.startLook, nodePos, smoothstep(0.0, 0.55, u1));
      syncCameraToPose(fromWorld.camera, tmpV1, tmpV2, lerp(tr.startFov, 24, u1));

      const u2 = easeInOutCubic(smoothstep(0.35, 1.0, p));
      const curvStart = toWorld.entryPose.pos.clone().multiplyScalar(1.36);
      tmpV1.lerpVectors(curvStart, toWorld.entryPose.pos, u2);
      syncCameraToPose(toWorld.camera, tmpV1, toWorld.entryPose.lookAt, lerp(48, toWorld.entryPose.fov, u2));

      const dissolve = smoothstep(0.42, 0.88, p);
      composite.uniforms.uWashColor.value.setHex(0xe8d4a2);
      composite.uniforms.uWashAlpha.value = Math.sin(smoothstep(0.32, 0.78, p) * Math.PI) * 0.24;

      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(toWorld.scene, toWorld.camera);

      if (dissolve < 0.999) {
        renderer.setRenderTarget(overlayRT);
        renderer.clear(true, true, true);
        renderer.render(fromWorld.scene, fromWorld.camera);
        renderer.setRenderTarget(null);

        composite.uniforms.tOverlay.value = overlayRT.texture;
        composite.uniforms.uOverlayAlpha.value = 1.0 - dissolve;
      }
    } else if (tr.style === 'well-dive') {
      // Act 2 -> Act 3: dive into Act 2's deep collapsing throat into Act 3's deep-field galaxy lensing cluster
      const throatPos = fromWorld.throatPosition || new THREE.Vector3(0, -10.5, 0);
      const u1 = easeInOutCubic(clamp(p / 0.65, 0, 1));
      const throatApproach = throatPos.clone().add(new THREE.Vector3(0, 1.2, 2.2));
      tmpV1.lerpVectors(tr.startPos, throatApproach, u1);
      tmpV2.lerpVectors(tr.startLook, throatPos, smoothstep(0.0, 0.55, u1));
      syncCameraToPose(fromWorld.camera, tmpV1, tmpV2, lerp(tr.startFov, 54, u1));

      const u2 = easeInOutCubic(smoothstep(0.38, 1.0, p));
      const lensStart = toWorld.entryPose.pos.clone().multiplyScalar(1.34);
      tmpV1.lerpVectors(lensStart, toWorld.entryPose.pos, u2);
      syncCameraToPose(toWorld.camera, tmpV1, toWorld.entryPose.lookAt, lerp(48, toWorld.entryPose.fov, u2));

      const dissolve = smoothstep(0.42, 0.86, p);
      composite.uniforms.uWarpAmount.value = Math.sin(smoothstep(0.10, 0.72, p) * Math.PI) * 0.72;

      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(toWorld.scene, toWorld.camera);

      if (dissolve < 0.999) {
        renderer.setRenderTarget(overlayRT);
        renderer.clear(true, true, true);
        renderer.render(fromWorld.scene, fromWorld.camera);
        renderer.setRenderTarget(null);

        composite.uniforms.tOverlay.value = overlayRT.texture;
        composite.uniforms.uOverlayAlpha.value = 1.0 - dissolve;
      }
    } else if (tr.style === 'collapse-horizon') {
      // Act 3 -> Act 4: collapse Act 3's transparent gravitational lens mass smoothly into Act 4's Schwarzschild Black Hole
      const lensPos = fromWorld.lensPosition ? toVec3(fromWorld.lensPosition) : new THREE.Vector3(0, 0, 0);
      const u1 = easeInOutCubic(clamp(p / 0.66, 0, 1));
      const collapseEnd = lensPos.clone().add(new THREE.Vector3(0, 0, 5.5));
      tmpV1.lerpVectors(tr.startPos, collapseEnd, u1);
      tmpV2.lerpVectors(tr.startLook, lensPos, smoothstep(0.0, 0.55, u1));
      syncCameraToPose(fromWorld.camera, tmpV1, tmpV2, lerp(tr.startFov, 36, u1));

      const u2 = easeInOutCubic(smoothstep(0.36, 1.0, p));
      const bhStart = toWorld.entryPose.pos.clone().multiplyScalar(1.38);
      tmpV1.lerpVectors(bhStart, toWorld.entryPose.pos, u2);
      syncCameraToPose(toWorld.camera, tmpV1, toWorld.entryPose.lookAt, lerp(48, toWorld.entryPose.fov, u2));

      const dissolve = smoothstep(0.40, 0.86, p);
      composite.uniforms.uWarpAmount.value = Math.sin(smoothstep(0.10, 0.74, p) * Math.PI) * 1.05;

      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(toWorld.scene, toWorld.camera);

      if (dissolve < 0.999) {
        renderer.setRenderTarget(overlayRT);
        renderer.clear(true, true, true);
        renderer.render(fromWorld.scene, fromWorld.camera);
        renderer.setRenderTarget(null);

        composite.uniforms.tOverlay.value = overlayRT.texture;
        composite.uniforms.uOverlayAlpha.value = 1.0 - dissolve;
      }
    } else if (tr.style === 'horizon-dive') {
      // Act 4 -> Act 5: dive smoothly into the pitch-black Schwarzschild Event Horizon without artificial radial folding,
      // then emerge cleanly into Act 5's symmetric Minkowski Light Cone!
      const corePos = fromWorld.corePosition || new THREE.Vector3(0, 0, 0);
      composite.uniforms.uWarpAmount.value = 0.0;
      composite.uniforms.uWashColor.value.setHex(0x03050a);

      const darkCrossing = Math.sin(smoothstep(0.32, 0.72, p) * Math.PI);
      composite.uniforms.uWashAlpha.value = Math.pow(darkCrossing, 1.35) * 0.88;

      if (p < 0.52) {
        const u = easeInOutCubic(p / 0.52);
        const coreApproach = corePos.clone().add(tmpV3.subVectors(tr.startPos, corePos).normalize().multiplyScalar(2.6));
        tmpV1.lerpVectors(tr.startPos, coreApproach, u);
        tmpV2.lerpVectors(tr.startLook, corePos, smoothstep(0.0, 0.55, u));
        syncCameraToPose(fromWorld.camera, tmpV1, tmpV2, lerp(tr.startFov, 54, u));

        renderer.setRenderTarget(null);
        renderer.clear(true, true, true);
        renderer.render(fromWorld.scene, fromWorld.camera);
      } else {
        const u = easeInOutCubic((p - 0.52) / 0.48);
        const startPos5 = toWorld.entryPose.pos.clone().multiplyScalar(0.36);
        tmpV1.lerpVectors(startPos5, toWorld.entryPose.pos, u);
        syncCameraToPose(toWorld.camera, tmpV1, toWorld.entryPose.lookAt, lerp(52, toWorld.entryPose.fov, u));

        renderer.setRenderTarget(null);
        renderer.clear(true, true, true);
        renderer.render(toWorld.scene, toWorld.camera);
      }
    } else if (tr.style === 'singularity-morph') {
      // Act 5 -> Act 1: keep Act 5's bottom-apex seed (0, -14.2, 0) and Act 1's left primordial point (-16, 0, 0)
      // locked dead-center (50%, 50%) throughout the 0.30..0.78 dissolve against crisp obsidian space!
      const anchor = fromWorld.singularityAnchor || { origin: new THREE.Vector3(0, -14.2, 0), scale: 0.085, rotationY: 0 };
      const sharedFov = toWorld.entryPose.fov;

      const seedEndPos = anchor.matchCamPos
        ? anchor.matchCamPos.clone()
        : anchor.origin.clone().add(new THREE.Vector3(0, 0.12, 2.8));
      const seedEndLook = anchor.matchLookAt ? anchor.matchLookAt.clone() : anchor.origin.clone();

      const singPos1 = toWorld.singularityPos || new THREE.Vector3(-16.0, 0.0, 0.0);
      const act1StartPos = toWorld.singularityPose
        ? toWorld.singularityPose.pos.clone()
        : singPos1.clone().add(new THREE.Vector3(0, 0.3, 6.0));
      const act1StartLook = toWorld.singularityPose
        ? toWorld.singularityPose.lookAt.clone()
        : singPos1.clone();

      // Phase 1 (0..0.38): swoop Act 5 camera dead-center onto bottom-apex singularity seed
      const uFrom = easeInOutCubic(clamp(p / 0.38, 0, 1));
      tmpV1.lerpVectors(tr.startPos, seedEndPos, uFrom);
      tmpV2.lerpVectors(tr.startLook, seedEndLook, uFrom);
      syncCameraToPose(fromWorld.camera, tmpV1, tmpV2, lerp(tr.startFov, sharedFov, uFrom));

      // Phase 2 (0.30..0.74): keep Act 1 locked dead-center on (-16, 0, 0), then pull smoothly out to entryPose (0.72..1.0)
      const uTo = easeInOutCubic(smoothstep(0.70, 1.0, p));
      tmpV1.lerpVectors(act1StartPos, toWorld.entryPose.pos, uTo);
      tmpV2.lerpVectors(act1StartLook, toWorld.entryPose.lookAt, uTo);
      syncCameraToPose(toWorld.camera, tmpV1, tmpV2, sharedFov);

      const fadeOut = smoothstep(0.30, 0.78, p);
      composite.uniforms.uWashColor.value.setHex(0xfff4d6);
      composite.uniforms.uIrisAmount.value = Math.sin(smoothstep(0.34, 0.72, p) * Math.PI) * 0.12;

      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(toWorld.scene, toWorld.camera);

      if (fadeOut < 0.999) {
        renderer.setRenderTarget(overlayRT);
        renderer.clear(true, true, true);
        renderer.render(fromWorld.scene, fromWorld.camera);
        renderer.setRenderTarget(null);

        composite.uniforms.tOverlay.value = overlayRT.texture;
        composite.uniforms.uOverlayAlpha.value = 1.0 - fadeOut;
      }
    } else {
      const dissolve = easeInOutCubic(p);
      syncCameraToPose(toWorld.camera, toWorld.entryPose.pos, toWorld.entryPose.lookAt, toWorld.entryPose.fov);

      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(toWorld.scene, toWorld.camera);

      if (dissolve < 0.999) {
        renderer.setRenderTarget(overlayRT);
        renderer.clear(true, true, true);
        renderer.render(fromWorld.scene, fromWorld.camera);
        renderer.setRenderTarget(null);

        composite.uniforms.tOverlay.value = overlayRT.texture;
        composite.uniforms.uOverlayAlpha.value = 1.0 - dissolve;
      }
    }

    renderer.render(composite.scene, composite.camera);

    if (!tr.switchedHalfway && p >= 0.55) {
      tr.switchedHalfway = true;
      callbacks.onWorldChange && callbacks.onWorldChange({
        id: toWorld.id,
        title: toWorld.title || toWorld.id,
        hasCustomNarrative: true,
      });
    }

    if (!tr.held && p >= 1.0) {
      const destId = tr.toId;
      enterWorldImmediate(destId);
      callbacks.onTransitionState && callbacks.onTransitionState(false, null);
    }
  }

  // 5-Act Cinema Auto-Story choreographer
  function updateAutoStory(dt, elapsed) {
    if (!autoStory || transition) return;
    storyTimer += dt;

    if (activeId !== 'lensing') {
      camState.targetYaw += dt * 0.08;
    }

    if (activeId === 'bigbang') {
      if (storyStep === 0 && storyTimer >= 1.5) {
        storyStep = 1;
        advanceStory(); // Bloom left-to-right Cosmic Inflation Trumpet!
      } else if (storyStep === 1 && storyTimer >= 10.2) {
        storyStep = 2;
        startTransition('curvature', 'trumpet-dive');
      }
    } else if (activeId === 'curvature') {
      if (storyStep === 0 && storyTimer >= 1.8) {
        storyStep = 1;
        advanceStory();
      } else if (storyStep === 1 && storyTimer >= 5.0) {
        storyStep = 2;
        advanceStory();
      } else if (storyStep === 2 && storyTimer >= 8.6) {
        storyStep = 3;
        startTransition('lensing', 'well-dive');
      }
    } else if (activeId === 'lensing') {
      // Smoothly sweep synthetic pointer over Act 3's galaxy field to form a full Einstein Ring!
      const sweepT = clamp(storyTimer / 5.5, 0, 1);
      const sx = lerp(-0.55, 0.0, easeInOutCubic(sweepT));
      const sy = Math.sin(sweepT * Math.PI) * 0.18;
      applySyntheticPointer((sx + 1) * 0.5, (1 - sy) * 0.5);
      if (storyStep === 0 && storyTimer >= 4.2) {
        storyStep = 1;
        advanceStory();
      } else if (storyStep === 1 && storyTimer >= 8.2) {
        storyStep = 2;
        startTransition('blackhole', 'collapse-horizon');
      }
    } else if (activeId === 'blackhole') {
      if (storyStep === 0 && storyTimer >= 2.2) {
        storyStep = 1;
        advanceStory();
      } else if (storyStep === 1 && storyTimer >= 7.5) {
        storyStep = 2;
        startTransition('lightcone', 'horizon-dive');
      }
    } else if (activeId === 'lightcone') {
      if (storyStep === 0 && storyTimer >= 1.8) {
        storyStep = 1;
        advanceStory();
      } else if (storyStep === 1 && storyTimer >= 4.8) {
        storyStep = 2;
        advanceStory();
      } else if (storyStep === 2 && storyTimer >= 9.0) {
        storyStep = 3;
        startTransition('bigbang', 'singularity-morph');
      }
    }
  }

  function updateFreeFlight(dt, world) {
    if (world.id !== 'lightcone') return;
    const accel = 11.5;
    world.camera.getWorldDirection(tmpForward);
    tmpForward.y = 0;
    if (tmpForward.lengthSq() < 1e-4) tmpForward.set(0, 0, -1);
    else tmpForward.normalize();

    tmpRight.crossVectors(tmpForward, tmpUp).normalize();

    const move = tmpV1.set(0, 0, 0);
    if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) move.add(tmpForward);
    if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) move.sub(tmpForward);
    if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) move.add(tmpRight);
    if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) move.sub(tmpRight);
    if (keysDown.has('KeyE')) move.y += 1;
    if (keysDown.has('KeyQ')) move.y -= 1;

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(accel);
      camState.flyVelocity.lerp(move, 1 - Math.exp(-dt * 6.0));
      if (autoStory) setAutoStory(false);
    } else {
      camState.flyVelocity.multiplyScalar(Math.exp(-dt * 6.5));
    }

    camState.flyOffset.addScaledVector(camState.flyVelocity, dt);
    camState.flyOffset.x = clamp(camState.flyOffset.x, -26, 26);
    camState.flyOffset.y = clamp(camState.flyOffset.y, -12, 16);
    camState.flyOffset.z = clamp(camState.flyOffset.z, -26, 26);
  }

  let rafId = null;
  let lastTime = performance.now();
  let startTime = lastTime;

  function tick(now) {
    if (disposed) return;
    rafId = window.requestAnimationFrame(tick);

    const rawDt = Math.max(0.001, (now - lastTime) * 0.001);
    const dt = Math.min(rawDt, 0.05);
    lastTime = now;
    const elapsed = (now - startTime) * 0.001;
    fpsEstimate = fpsEstimate * 0.92 + (1 / rawDt) * 0.08;

    if (transition) {
      renderTransitionFrame(dt, elapsed);
      return;
    }

    const world = getActiveWorld();
    if (!world) return;
    applyWorldAspect(world);

    updateAutoStory(dt, elapsed);
    if (transition) return;

    updateFreeFlight(dt, world);
    const damp = 1 - Math.exp(-dt * 6.5);
    camState.yaw += (camState.targetYaw - camState.yaw) * damp;
    camState.pitch += (camState.targetPitch - camState.pitch) * damp;
    camState.zoom += (camState.targetZoom - camState.zoom) * damp;

    computeOrbitPose(
      world,
      camState.yaw,
      camState.pitch,
      camState.zoom,
      camState.flyOffset,
      camState.currentPos,
      camState.currentLook
    );
    camState.currentFov = world.entryPose.fov;
    syncCameraToPose(world.camera, camState.currentPos, camState.currentLook, camState.currentFov);

    const ctx = buildWorldCtx(dt, elapsed, world);
    if (typeof world.update === 'function') {
      world.update(dt, elapsed, ctx);
    }

    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(world.scene, world.camera);

    // Ephemeral in-world starlight ripple FX overlay (completely invisible when idle!)
    pulseFX.update(dt, elapsed, world.camera);
    renderer.clearDepth();
    renderer.render(pulseFX.scene, world.camera);
  }

  function updatePointerNdc(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    pointerVec.set(nx, ny);
    pointerNdc.x = nx;
    pointerNdc.y = ny;
    pointerNdc.active = true;
  }

  function applySyntheticPointer(nx, ny) {
    const ndcX = clamp(Number(nx), 0, 1) * 2 - 1;
    const ndcY = -(clamp(Number(ny), 0, 1) * 2 - 1);
    pointerVec.set(ndcX, ndcY);
    pointerNdc.x = ndcX;
    pointerNdc.y = ndcY;
    pointerNdc.active = true;
    if (!transition) {
      const world = getActiveWorld();
      if (world && typeof world.onPointerMove === 'function') {
        raycaster.setFromCamera(pointerVec, world.camera);
        const res = world.onPointerMove(raycaster, buildWorldCtx(0, (performance.now() - startTime) * 0.001, world));
        if (res && typeof res === 'object' && 'hoverLabel' in res) {
          callbacks.onHoverLabel && callbacks.onHoverLabel(res.hoverLabel || '');
        }
      }
    }
  }

  function performRaycastClick(ndcX, ndcY) {
    if (transition) return false;
    const world = getActiveWorld();
    if (!world) return false;
    pointerVec.set(ndcX, ndcY);
    pointerNdc.x = ndcX;
    pointerNdc.y = ndcY;
    pointerNdc.active = true;

    raycaster.setFromCamera(pointerVec, world.camera);
    const ctx = buildWorldCtx(0, (performance.now() - startTime) * 0.001, world);

    let handled = false;
    if (typeof world.onClick === 'function') {
      const res = world.onClick(raycaster, ctx);
      if (res && typeof res === 'object' && res.action) {
        handled = true;
        if (res.action === 'transition' && res.to) {
          startTransition(res.to, res.mode || null);
        } else if (res.action === 'fly' && res.target) {
          pulseFX.spawn(toVec3(res.target));
        } else if (res.action === 'param' && typeof res.value === 'number') {
          setParam(res.value);
        } else if (res.action === 'triggerAction') {
          triggerAction();
        }
      } else {
        handled = !!res;
      }
    }

    // Spawn ephemeral optical light ripple at clicked 3D position (zero floating ball!)
    if (!handled) {
      const hits = raycaster.intersectObjects(world.scene.children, true);
      const validHit = hits.find((h) => h.distance > 1.5 && h.distance < 90 && h.object.visible);
      if (validHit) {
        pulseFX.spawn(validHit.point);
      } else {
        world.camera.getWorldDirection(tmpForward);
        tmpV2.copy(world.camera.position).addScaledVector(tmpForward, 18);
        tmpRayPlane.setFromNormalAndCoplanarPoint(tmpForward.clone().negate(), tmpV2);
        if (raycaster.ray.intersectPlane(tmpRayPlane, tmpV1)) {
          pulseFX.spawn(tmpV1);
        }
      }
    }
    return handled;
  }

  function handlePointerDown(ev) {
    if (ev.button !== 0) return;
    audio.unlock();
    updatePointerNdc(ev.clientX, ev.clientY);
    isDragging = true;
    dragConsumedByWorld = false;
    lastPointerX = ev.clientX;
    lastPointerY = ev.clientY;
    pointerTravel = 0;
    canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
  }

  function handlePointerMove(ev) {
    updatePointerNdc(ev.clientX, ev.clientY);

    const world = getActiveWorld();
    const elapsed = (performance.now() - startTime) * 0.001;

    if (isDragging) {
      const dx = ev.clientX - lastPointerX;
      const dy = ev.clientY - lastPointerY;
      lastPointerX = ev.clientX;
      lastPointerY = ev.clientY;
      pointerTravel += Math.hypot(dx, dy);

      if (!transition && world) {
        raycaster.setFromCamera(pointerVec, world.camera);
        const ctx = buildWorldCtx(0, elapsed, world);

        // Let worlds with direct drag control (e.g. Act 3 movable gravitational lens) claim drag cleanly
        if (typeof world.onPointerDrag === 'function') {
          const consumed = world.onPointerDrag(raycaster, pointerNdc, ctx);
          if (consumed === true) {
            dragConsumedByWorld = true;
            if (autoStory) setAutoStory(false);
            return;
          }
        }
        if (world.controlsDrag === true) {
          dragConsumedByWorld = true;
          if (autoStory) setAutoStory(false);
          if (typeof world.onPointerMove === 'function') {
            world.onPointerMove(raycaster, ctx);
          }
          return;
        }
      }

      if (pointerTravel >= 6 && !transition && !dragConsumedByWorld) {
        if (autoStory) setAutoStory(false);
        camState.targetYaw -= dx * 0.0052;
        camState.targetPitch = clamp(camState.targetPitch - dy * 0.0042, -0.62, 0.62);
        document.body.classList.add('is-dragging');
      }
      return;
    }

    // Always pass live pointerNdc + raycaster on EVERY pointer move (essential for Act 3 gliding lens!)
    if (!transition && world && typeof world.onPointerMove === 'function') {
      raycaster.setFromCamera(pointerVec, world.camera);
      const res = world.onPointerMove(raycaster, buildWorldCtx(0, elapsed, world));
      if (res && typeof res === 'object') {
        if ('hoverLabel' in res) {
          callbacks.onHoverLabel && callbacks.onHoverLabel(res.hoverLabel || '');
        }
        canvas.style.cursor = res.cursor || '';
      } else if (res === null) {
        callbacks.onHoverLabel && callbacks.onHoverLabel('');
        canvas.style.cursor = '';
      }
    }
  }

  function handlePointerUp(ev) {
    if (!isDragging) return;
    isDragging = false;
    dragConsumedByWorld = false;
    document.body.classList.remove('is-dragging');
    try {
      canvas.releasePointerCapture && canvas.releasePointerCapture(ev.pointerId);
    } catch {
      // ignore
    }

    if (pointerTravel < 6 && !transition) {
      if (autoStory) setAutoStory(false);
      updatePointerNdc(ev.clientX, ev.clientY);
      performRaycastClick(pointerNdc.x, pointerNdc.y);
    }
  }

  function handleWheel(ev) {
    ev.preventDefault();
    audio.unlock();
    if (transition) return;
    if (autoStory) setAutoStory(false);

    const world = getActiveWorld();
    if (world && typeof world.onWheel === 'function') {
      const consumed = world.onWheel(ev.deltaY, buildWorldCtx(0, (performance.now() - startTime) * 0.001, world));
      if (consumed === true) return;
    }

    camState.targetZoom = clamp(camState.targetZoom + ev.deltaY * 0.00055, 0.24, 1.65);
  }

  function handleKeyDown(ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) {
      return;
    }
    audio.unlock();
    keysDown.add(ev.code);

    // Silent power-user / QA shortcuts across all 5 acts
    if (ev.key === '1') { goTo('bigbang', false); return; }
    if (ev.key === '2') { goTo('curvature', false); return; }
    if (ev.key === '3') { goTo('lensing', false); return; }
    if (ev.key === '4') { goTo('blackhole', false); return; }
    if (ev.key === '5') { goTo('lightcone', false); return; }

    if (ev.key === 'm' || ev.key === 'M') {
      const m = audio.toggleMute();
      callbacks.onMuteChange && callbacks.onMuteChange(m);
      return;
    }

    if (ev.code === 'Space') {
      ev.preventDefault();
      if (transition) return;
      if (autoStory) setAutoStory(false);
      advanceStory();
    }
  }

  function handleKeyUp(ev) {
    keysDown.delete(ev.code);
  }

  function handleResize() {
    viewportW = Math.max(1, window.innerWidth);
    viewportH = Math.max(1, window.innerHeight);
    const pr = dpr();
    renderer.setPixelRatio(pr);
    renderer.setSize(viewportW, viewportH, false);
    overlayRT.setSize(Math.floor(viewportW * pr), Math.floor(viewportH * pr));
    composite.uniforms.uAspect.value = viewportW / viewportH;
    Object.values(worlds).forEach(applyWorldAspect);
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);

  // Boot cleanly into Act 1 (Single Primordial Planck Point on left of inflation timeline)
  enterWorldImmediate('bigbang', { instantNarrative: true });
  rafId = window.requestAnimationFrame(tick);

  function setAutoStory(enabled) {
    autoStory = !!enabled;
    storyTimer = 0;
    storyStep = 0;
    callbacks.onAutoStoryChange && callbacks.onAutoStoryChange(autoStory);
    return autoStory;
  }

  function getState() {
    const w = getActiveWorld();
    return {
      activeId,
      worldsLoaded: Object.fromEntries(
        WORLD_ORDER.map((id) => [id, !!(worlds[id] && !worlds[id].isPlaceholder)])
      ),
      isTransitioning: !!transition,
      transition: transition
        ? { from: transition.fromId, to: transition.toId, style: transition.style, progress: Number(transition.progress.toFixed(4)), held: transition.held }
        : null,
      param: Number((paramValues[activeId] ?? 0).toFixed(4)),
      pointerNdc: { x: Number(pointerNdc.x.toFixed(3)), y: Number(pointerNdc.y.toFixed(3)), active: pointerNdc.active },
      narrative: { line: narrativeState.line, cue: narrativeState.cue },
      muted: audio.isMuted(),
      autoStory,
      camera: w
        ? {
            pos: w.camera.position.toArray().map((n) => Number(n.toFixed(3))),
            lookAt: camState.currentLook.toArray().map((n) => Number(n.toFixed(3))),
            fov: Number(w.camera.fov.toFixed(2)),
          }
        : null,
      fps: Math.round(fpsEstimate),
    };
  }

  // Deterministic QA & verification debug hook (5 acts + synthetic pointer for Act 3 lensing)
  const debugApi = {
    goTo(id, instant = true) {
      goTo(id, instant);
      return getState();
    },
    setParam(v) {
      setParam(v);
      return getState();
    },
    setPointer(nx = 0.5, ny = 0.5) {
      applySyntheticPointer(nx, ny);
      return getState();
    },
    clickCanvas(nx = 0.5, ny = 0.5) {
      const ndcX = clamp(Number(nx), 0, 1) * 2 - 1;
      const ndcY = -(clamp(Number(ny), 0, 1) * 2 - 1);
      performRaycastClick(ndcX, ndcY);
      return getState();
    },
    triggerAction() {
      triggerAction();
      return getState();
    },
    advanceStory() {
      advanceStory();
      return getState();
    },
    setAutoStory(on) {
      setAutoStory(on);
      return getState();
    },
    setOrbit(yaw = 0, pitch = 0, zoom = 1.0, instant = true) {
      const clampedZoom = clamp(Number(zoom) || 1.0, 0.22, 1.65);
      camState.targetYaw = Number(yaw) || 0;
      camState.targetPitch = clamp(Number(pitch) || 0, -0.62, 0.62);
      camState.targetZoom = clampedZoom;
      if (instant) {
        camState.yaw = camState.targetYaw;
        camState.pitch = camState.targetPitch;
        camState.zoom = camState.targetZoom;
        const w = getActiveWorld();
        if (w) {
          computeOrbitPose(w, camState.yaw, camState.pitch, camState.zoom, camState.flyOffset, camState.currentPos, camState.currentLook);
          syncCameraToPose(w.camera, camState.currentPos, camState.currentLook, w.entryPose.fov);
        }
      }
      return getState();
    },
    triggerTransition(from, to, holdAtProgress = null) {
      if (from && worlds[from] && activeId !== from) {
        enterWorldImmediate(from, { instantNarrative: true });
      }
      if (to && worlds[to]) {
        startTransition(to, null, { holdAtProgress });
      }
      return getState();
    },
    stepTransition(progress) {
      if (transition) {
        transition.held = true;
        transition.progress = clamp(Number(progress) || 0, 0, 1);
      }
      return getState();
    },
    releaseTransition() {
      if (transition) {
        transition.held = false;
      }
      return getState();
    },
    getState() {
      return getState();
    },
  };
  window.__COSMIC_DEBUG__ = debugApi;

  function dispose() {
    disposed = true;
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('wheel', handleWheel);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('resize', handleResize);

    Object.values(worlds).forEach((w) => w && typeof w.dispose === 'function' && w.dispose());
    pulseFX.dispose();
    composite.dispose();
    overlayRT.dispose();
    envRT.dispose();
    disposeAllCachedTextures();
    renderer.dispose();
    if (window.__COSMIC_DEBUG__ === debugApi) {
      delete window.__COSMIC_DEBUG__;
    }
  }

  return {
    goTo,
    setParam,
    triggerAction,
    advanceStory,
    setAutoStory,
    getState,
    dispose,
  };
}

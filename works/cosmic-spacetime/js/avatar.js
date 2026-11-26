// Ephemeral In-World Optical Starlight Ripple FX (replaces persistent floating ball avatar)
// Zero lingering sphere/UFO clutter: spawns a crisp, razor-thin expanding light ring + 8 vanishing star-dust motes
// directly at any clicked 3D position, dissolving completely away in 0.85s.

export function createOpticalPulseFX(THREE) {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.name = 'OpticalStarlightRipples';
  scene.add(root);

  const MAX_PULSES = 6;
  const MOTES_PER_PULSE = 8;
  const DURATION = 0.85;
  const position = new THREE.Vector3(0, 0, 0);

  const ringGeo = new THREE.PlaneGeometry(2.0, 2.0);
  const moteGeo = new THREE.PlaneGeometry(0.14, 0.14);

  function createRippleMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uProgress: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uProgress;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;

          float t = clamp(uProgress, 0.0, 1.0);
          float ease = 1.0 - pow(1.0 - t, 3.0);
          float fade = pow(1.0 - t, 1.65);

          // Razor-thin primary starlight ripple ring
          float r1 = mix(0.06, 0.88, ease);
          float ring1 = exp(-pow((r - r1) * 34.0, 2.0));

          // Delicate inner cyan-gold harmonic echo ring
          float r2 = mix(0.03, 0.56, ease);
          float ring2 = exp(-pow((r - r2) * 40.0, 2.0)) * 0.52;

          // Brief pinpoint flash right on impact (first 25%)
          float spark = exp(-r * r * 90.0) * smoothstep(0.32, 0.0, t) * 0.9;

          vec3 col = mix(vec3(0.56, 0.84, 1.0), vec3(1.0, 0.92, 0.72), smoothstep(0.85, 0.15, r));
          float alpha = clamp((ring1 + ring2 + spark) * fade, 0.0, 0.92);
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
  }

  function createMoteMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uAlpha: { value: 0.0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r2 = dot(p, p);
          if (r2 > 1.0) discard;
          float core = exp(-r2 * 10.0);
          vec3 col = mix(vec3(0.58, 0.85, 1.0), vec3(1.0, 0.95, 0.80), core);
          float a = core * uAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
    });
  }

  const pool = [];
  for (let i = 0; i < MAX_PULSES; i++) {
    const group = new THREE.Group();
    group.visible = false;
    root.add(group);

    const ringMat = createRippleMaterial();
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    group.add(ringMesh);

    const motes = [];
    for (let m = 0; m < MOTES_PER_PULSE; m++) {
      const mMat = createMoteMaterial();
      const mMesh = new THREE.Mesh(moteGeo, mMat);
      group.add(mMesh);
      const angle = (m / MOTES_PER_PULSE) * Math.PI * 2 + (i * 0.41);
      motes.push({
        mesh: mMesh,
        mat: mMat,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle),
        speed: 0.72 + ((m * 37 + i * 19) % 10) * 0.06,
      });
    }

    pool.push({
      active: false,
      age: DURATION,
      origin: new THREE.Vector3(),
      group,
      ringMesh,
      ringMat,
      motes,
    });
  }

  let nextSlot = 0;
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  function spawn(worldPos) {
    if (!worldPos) return;
    position.copy(worldPos);
    const slot = pool[nextSlot];
    nextSlot = (nextSlot + 1) % MAX_PULSES;
    slot.active = true;
    slot.age = 0;
    slot.origin.copy(worldPos);
    slot.group.position.copy(worldPos);
    slot.group.visible = true;
    slot.ringMat.uniforms.uProgress.value = 0.0;
  }

  function clearAll() {
    for (const slot of pool) {
      slot.active = false;
      slot.age = DURATION;
      slot.group.visible = false;
    }
  }

  function update(dt, elapsed, camera) {
    const safeDt = Math.min(dt, 0.05);
    for (const slot of pool) {
      if (!slot.active) continue;
      slot.age += safeDt;
      const t = slot.age / DURATION;
      if (t >= 1.0) {
        slot.active = false;
        slot.group.visible = false;
        continue;
      }

      slot.ringMat.uniforms.uProgress.value = t;
      const ease = 1.0 - Math.pow(1.0 - t, 3.0);
      const moteAlpha = Math.pow(1.0 - t, 1.55) * 0.85;

      // Scale gracefully with camera distance so ripples stay razor-fine at every zoom level
      let baseScale = 1.35;
      if (camera) {
        const dCam = slot.origin.distanceTo(camera.position);
        baseScale = Math.max(0.55, Math.min(3.8, dCam * 0.085));
        slot.ringMesh.lookAt(camera.position);

        camera.getWorldDirection(tmpDir);
        tmpRight.crossVectors(tmpDir, camera.up).normalize();
        tmpUp.crossVectors(tmpRight, tmpDir).normalize();
      } else {
        tmpRight.set(1, 0, 0);
        tmpUp.set(0, 1, 0);
      }

      slot.ringMesh.scale.setScalar(baseScale);

      for (const m of slot.motes) {
        const dist = ease * baseScale * 0.95 * m.speed;
        m.mesh.position.set(0, 0, 0)
          .addScaledVector(tmpRight, m.dirX * dist)
          .addScaledVector(tmpUp, m.dirY * dist);
        m.mesh.scale.setScalar(baseScale * (1.0 - t * 0.55));
        if (camera) m.mesh.lookAt(camera.position);
        m.mat.uniforms.uAlpha.value = moteAlpha;
      }
    }
  }

  function dispose() {
    ringGeo.dispose();
    moteGeo.dispose();
    for (const slot of pool) {
      slot.ringMat.dispose();
      for (const m of slot.motes) m.mat.dispose();
    }
  }

  // Keep clean compatibility surface with `flyTo` -> ephemeral ripple (ZERO persistent ball!)
  return {
    scene,
    root,
    position,
    spawn,
    flyTo: spawn,
    snapTo(pos) {
      if (pos) position.copy(pos);
      clearAll();
    },
    setAnchor() {},
    setGuideTarget() {},
    notifyInteraction() {},
    setTransitionMode(mode) {
      if (mode) clearAll();
    },
    clearAll,
    update,
    dispose,
  };
}

// Export alias so any module importing `createAvatar` works seamlessly without a floating ball
export const createAvatar = createOpticalPulseFX;

// 第 1 幕：广义相对论 —— 真实 Flamm 抛物面铜版/黑曜石时空流形 + 「一发刻出两条轨道」
// 同一初速同时积分：钴蓝牛顿闭合椭圆 vs 朱红广义相对论花瓣进动轨道（精确 Binet 方程 u'' + u = GM/l² + 3GMu²/c²）
// 同时保留实时四极引力波脉冲与 360° 自由环视俯仰
import * as THREE from 'three';

const RS = 0.56; // 史瓦西半径（视觉尺度）
const R_MAX = 4.55;

function flammY(r, strength = 0.55) {
  // 与 FLAMM_VS 的 flammH(r) 逐位一致：随相对论曲率滑块同步改变史瓦西喉径
  const rs = RS * (0.82 + (1.24 - 0.82) * strength);
  const rc = Math.max(r, rs * 1.04);
  const zMax = 2 * Math.sqrt(rs * (R_MAX - rs));
  const z = 2 * Math.sqrt(rs * (rc - rs));
  return (z - zMax) * 0.72;
}

const FLAMM_VS = /* glsl */ `
  uniform float uWaveAge;
  uniform float uRelStrength;
  varying vec2 vXZ;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vR;
  varying float vDepth;
  varying float vWave;

  float flammH(float r) {
    float rs = 0.56 * mix(0.82, 1.24, uRelStrength);
    float rc = max(r, rs * 1.04);
    float zMax = 2.0 * sqrt(rs * (4.55 - rs));
    float z = 2.0 * sqrt(rs * (rc - rs));
    return (z - zMax) * 0.72;
  }

  float waveH(vec2 xz) {
    if (uWaveAge <= 0.0 || uWaveAge > 4.2) return 0.0;
    float r = length(xz);
    float front = uWaveAge * 2.9;
    float dr = (r - front) / 0.75;
    float env = exp(-(dr * dr)) * exp(-uWaveAge * 0.55);
    float ang = r > 1e-4 ? atan(xz.y, xz.x) : 0.0;
    return env * sin((r - front) * 5.8) * cos(ang * 2.0) * 0.28;
  }

  float totalY(vec2 xz) {
    float r = length(xz);
    return flammH(r) + waveH(xz) * smoothstep(0.65, 1.35, r);
  }

  void main() {
    vec2 xz = position.xz;
    float r = length(xz);
    float y0 = totalY(xz);

    float eps = 0.05;
    float yX = totalY(xz + vec2(eps, 0.0));
    float yZ = totalY(xz + vec2(0.0, eps));
    vec3 nL = normalize(vec3(y0 - yX, eps, y0 - yZ));

    vec3 p = vec3(xz.x, y0, xz.y);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vXZ = xz;
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * nL);
    vR = r;
    vDepth = max(-y0 * 0.52, 0.0);
    vWave = abs(waveH(xz)) * 3.5;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FLAMM_FS = /* glsl */ `
  uniform float uTheme;
  varying vec2 vXZ;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying float vR;
  varying float vDepth;
  varying float vWave;

  void main() {
    float outerMask = 1.0 - smoothstep(4.25, 4.55, vR);
    float innerMask = smoothstep(0.54, 0.64, vR);
    float mask = outerMask * innerMask;
    if (mask < 0.01) discard;

    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L1 = normalize(vec3(0.0, 3.6, 0.0) - vWorldPos);
    vec3 L2 = normalize(vec3(-4.0, 5.0, 4.5));

    float diff = max(dot(N, L1), 0.0) * 0.65 + max(dot(N, L2), 0.0) * 0.35;
    float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), 46.0);
    float fresnel = pow(1.0 - abs(dot(N, V)), 2.4);

    // 精密极坐标铜版经纬刻线 + 笛卡尔暗纹（fwidth 抗锯齿，无深井实心块）
    float ang = atan(vXZ.y, vXZ.x) / 6.28318530 + 0.5;
    float rCoord = vR * 2.8;
    float aCoord = ang * 24.0;
    float rLine = 1.0 - smoothstep(0.0, max(fwidth(rCoord) * 1.35, 0.008), abs(fract(rCoord - 0.5) - 0.5));
    float aLine = 1.0 - smoothstep(0.0, max(fwidth(aCoord) * 1.35, 0.008), abs(fract(aCoord - 0.5) - 0.5));
    float polarGrid = max(rLine * 0.92, aLine * 0.62);

    float heat = clamp(vDepth, 0.0, 1.0);
    float throatRim = exp(-abs(vR - 0.66) * 24.0);

    vec3 baseD = vec3(0.024, 0.032, 0.056) + vec3(0.05, 0.09, 0.17) * (diff * 0.55 + fresnel * 0.8);
    vec3 lineFlatD = vec3(0.38, 0.60, 0.92);
    vec3 lineMidD  = vec3(0.96, 0.72, 0.38);
    vec3 lineDeepD = vec3(0.96, 0.30, 0.22);
    vec3 lineD = heat < 0.5 ? mix(lineFlatD, lineMidD, heat * 2.0) : mix(lineMidD, lineDeepD, (heat - 0.5) * 2.0);
    lineD = mix(lineD, vec3(0.58, 0.94, 1.0), clamp(vWave, 0.0, 1.0) * 0.75);

    vec3 colD = baseD + lineD * (polarGrid * (0.28 + heat * 0.58) + throatRim * 0.65) + vec3(1.0, 0.88, 0.72) * spec * (0.32 + heat * 0.65);
    float alphaD = clamp((0.46 + fresnel * 0.30 + polarGrid * 0.42 + throatRim * 0.4) * mask, 0.0, 0.94);

    // 浅色铜版画风
    vec3 lineL = mix(vec3(0.22, 0.30, 0.44), vec3(0.78, 0.20, 0.16), heat);
    vec3 colL = mix(vec3(0.95, 0.92, 0.88), lineL, clamp(polarGrid * 0.66 + throatRim * 0.65 + heat * 0.14, 0.0, 1.0));
    float alphaL = clamp((0.16 + polarGrid * 0.54 + throatRim * 0.45) * mask, 0.0, 0.88);

    gl_FragColor = vec4(mix(colD, colL, uTheme), mix(alphaD, alphaL, uTheme));
  }
`;

// 精确 Binet 方程 RK4 积分：u'' + u = k + eps * u²（eps=0 为牛顿闭合椭圆；eps>0 为爱因斯坦进动花瓣！）
function integrateBinet(ecc, grEps, totalSteps = 560, dPhi = 0.075) {
  const r0 = 3.55; // 远心点出发
  const u0 = 1 / r0;
  // 设初始无径向速度 u'(0) = 0，由偏心率 ecc 确定 k = u0 / (1 - ecc)
  const k = u0 / (1 - ecc);
  const pts = [];
  const perihelia = [];
  let u = u0;
  let up = 0;
  let prevUp = 0;
  let phi = 0;

  const deriv = (uu) => k + grEps * uu * uu - uu;
  for (let i = 0; i <= totalSteps; i++) {
    const r = Math.min(4.32, Math.max(0.72, 1 / Math.max(u, 0.18)));
    pts.push({ r, phi });
    // 检测近心点（u 局部极大：u' 由正变负）
    if (i > 4 && prevUp > 0 && up <= 0 && perihelia.length < 8) {
      perihelia.push({ r, phi });
    }
    prevUp = up;

    // RK4 步进
    const k1u = up, k1p = deriv(u);
    const k2u = up + 0.5 * dPhi * k1p, k2p = deriv(u + 0.5 * dPhi * k1u);
    const k3u = up + 0.5 * dPhi * k2p, k3p = deriv(u + 0.5 * dPhi * k2u);
    const k4u = up + dPhi * k3p, k4p = deriv(u + dPhi * k3u);
    u += (dPhi / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    up += (dPhi / 6) * (k1p + 2 * k2p + 2 * k3p + k4p);
    phi += dPhi;
    if (u > 1.45) break; // 坠入临界半径停止
  }

  let shiftDeg = null;
  if (perihelia.length >= 2) {
    const rawDelta = perihelia[1].phi - perihelia[0].phi - Math.PI * 2;
    shiftDeg = Math.max(0, rawDelta * (180 / Math.PI));
  }
  return { pts, perihelia, shiftDeg };
}

export function createRelativityChapter(textures) {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  // 1) 极坐标高密环形网格（精确贴合 Flamm 抛物面无中心奇异三角）
  const ringGeo = new THREE.RingGeometry(0.55, R_MAX, 128, 48);
  ringGeo.rotateX(-Math.PI * 0.5);
  const manifoldMat = new THREE.ShaderMaterial({
    uniforms: {
      uWaveAge: { value: -1 },
      uRelStrength: { value: 0.55 },
      uTheme: { value: 0 },
    },
    vertexShader: FLAMM_VS,
    fragmentShader: FLAMM_FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const manifoldMesh = new THREE.Mesh(ringGeo, manifoldMat);
  manifoldMesh.renderOrder = 2;
  root.add(manifoldMesh);

  // 2) 中央致密恒星核 + 倾斜发光吸积薄盘（精致琥珀日冕，绝非过曝白球或死黑球）
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=normalize(position); vec4 wp=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x), mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x), f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x), mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x), f.y), f.z);
      }
      void main(){
        vec3 q = vP * 4.8 + vec3(uTime * 0.25, -uTime * 0.18, uTime * 0.14);
        float g = n3(q) * 0.6 + n3(q * 2.4) * 0.4;
        float ndv = max(dot(normalize(vN), normalize(vV)), 0.0);
        vec3 c = mix(vec3(0.95, 0.34, 0.14), vec3(1.0, 0.88, 0.56), clamp(pow(ndv, 0.6) * 0.72 + g * 0.42, 0.0, 1.0));
        c += vec3(1.0, 0.62, 0.26) * pow(1.0 - ndv, 2.2) * 0.65;
        gl_FragColor = vec4(c * 1.08, 1.0);
      }
    `,
  });
  const centralStar = new THREE.Mesh(new THREE.SphereGeometry(0.40, 48, 32), starMat);
  centralStar.position.set(0, -0.35, 0);
  centralStar.renderOrder = 8;
  root.add(centralStar);

  // 外缘精致金属刻度环
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#c8a46c',
    metalness: 0.86,
    roughness: 0.26,
    transparent: true,
    opacity: 0.72,
  });
  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(R_MAX * 0.96, 0.018, 16, 128), rimMat);
  outerRim.rotation.x = Math.PI * 0.5;
  outerRim.renderOrder = 5;
  root.add(outerRim);

  // 3) 预分配双轨道缓冲区（最多 580 点：墨蓝牛顿闭合椭圆 vs 朱砂相对论花瓣进动轨道！）
  const MAX_PTS = 580;
  const newtPos = new Float32Array(MAX_PTS * 3);
  const grPos = new Float32Array(MAX_PTS * 3);
  const newtGeo = new THREE.BufferGeometry();
  newtGeo.setAttribute('position', new THREE.BufferAttribute(newtPos, 3));
  newtGeo.setDrawRange(0, 0);
  const newtMat = new THREE.LineBasicMaterial({ color: '#5fa4ff', transparent: true, opacity: 0.72 });
  const newtLine = new THREE.Line(newtGeo, newtMat);
  newtLine.frustumCulled = false;
  newtLine.renderOrder = 9;
  root.add(newtLine);

  const grGeo = new THREE.BufferGeometry();
  grGeo.setAttribute('position', new THREE.BufferAttribute(grPos, 3));
  grGeo.setDrawRange(0, 0);
  const grMat = new THREE.LineBasicMaterial({ color: '#ff6038', transparent: true, opacity: 0.96 });
  const grLine = new THREE.Line(grGeo, grMat);
  grLine.frustumCulled = false;
  grLine.renderOrder = 10;
  root.add(grLine);

  // 相对论测试珠 + 牛顿对照珠 + 8 枚近心点朱砂印记
  const grBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.10, 24, 18),
    new THREE.MeshBasicMaterial({ color: '#ff9068' })
  );
  const newtBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 20, 16),
    new THREE.MeshBasicMaterial({ color: '#7cc0ff' })
  );
  const grGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.star, color: '#ff7044', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
  }));
  grGlow.scale.setScalar(0.85);
  grBead.add(grGlow);
  grBead.renderOrder = 12;
  newtBead.renderOrder = 11;
  root.add(grBead, newtBead);

  const periMarks = [];
  const markGeo = new THREE.RingGeometry(0.06, 0.11, 24);
  markGeo.rotateX(-Math.PI * 0.5);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: '#ff5232', transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
    m.visible = false;
    m.renderOrder = 11;
    root.add(m);
    periMarks.push(m);
  }

  let ecc = 0.42;
  let relStrength = 0.55; // 控制 3GM/c² 相对论项强度
  let newtData = null;
  let grData = null;
  let drawProgress = 0;
  let waveAge = -1;

  function fireOrbit(newEcc = ecc, newStrength = relStrength) {
    ecc = Math.max(0.22, Math.min(0.62, newEcc));
    relStrength = Math.max(0.10, Math.min(1.0, newStrength));
    // 将广义相对论耦合系数约束在所有 (ecc, relStrength) 组合的严格有界进动域内，杜绝越过势垒坠毁
    const grEps = (0.045 + relStrength * 0.145) / (1.0 + ecc * 1.15);
    newtData = integrateBinet(ecc, 0.0, MAX_PTS - 1, 0.075);
    grData = integrateBinet(ecc, grEps, MAX_PTS - 1, 0.075);

    const writeBuf = (data, arr) => {
      const len = Math.min(data.pts.length, MAX_PTS);
      for (let i = 0; i < len; i++) {
        const { r, phi } = data.pts[i];
        arr[i * 3] = Math.cos(phi) * r;
        arr[i * 3 + 1] = flammY(r, relStrength) + 0.10;
        arr[i * 3 + 2] = Math.sin(phi) * r;
      }
      return len;
    };
    writeBuf(newtData, newtPos);
    writeBuf(grData, grPos);
    newtGeo.attributes.position.needsUpdate = true;
    grGeo.attributes.position.needsUpdate = true;

    periMarks.forEach((m) => { m.visible = false; });
    drawProgress = 0;
  }

  function setRelStrength(v) {
    fireOrbit(ecc, v);
  }
  function setEccentricity(v) {
    fireOrbit(v, relStrength);
  }
  function triggerGravitationalWave() {
    waveAge = 0.001;
  }

  // 默认先刻出第一组漂亮的花瓣进动对比轨道
  fireOrbit(0.42, 0.55);

  function update({ time, dt, orbitYaw, orbitPitch, aspect, theme }) {
    if (waveAge > 0) {
      waveAge += dt;
      if (waveAge > 4.2) waveAge = -1;
    }

    const isLight = theme === 'light' ? 1 : 0;
    const isPortrait = aspect < 0.95;
    const sc = isPortrait ? Math.min(0.68, Math.max(0.52, aspect * 1.05)) : Math.min(1.06, Math.max(0.86, aspect * 0.48));
    root.scale.setScalar(sc);
    root.position.set(0, 0.28, 0);
    root.rotation.set(orbitPitch, orbitYaw + time * 0.04, 0);

    manifoldMat.uniforms.uWaveAge.value = waveAge;
    manifoldMat.uniforms.uRelStrength.value = relStrength;
    manifoldMat.uniforms.uTheme.value = isLight;
    starMat.uniforms.uTime.value = time;

    newtMat.color.set(isLight ? '#23569e' : '#5fa4ff');
    grMat.color.set(isLight ? '#c82820' : '#ff6038');
    grGlow.material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    grGlow.material.opacity = isLight ? 0.35 : 0.92;

    // 独立推进牛顿与广义相对论双轨道绘制（互不截断），并实时贴合当前 relStrength 的 Flamm 抛物面高度
    if (grData && newtData) {
      drawProgress = Math.min(1, drawProgress + dt * 0.18);
      const nCount = Math.max(2, Math.floor(drawProgress * (newtData.pts.length - 1)) + 1);
      const gCount = Math.max(2, Math.floor(drawProgress * (grData.pts.length - 1)) + 1);
      newtGeo.setDrawRange(0, Math.min(nCount, newtData.pts.length));
      grGeo.setDrawRange(0, Math.min(gCount, grData.pts.length));

      const np = newtData.pts[Math.min(nCount - 1, newtData.pts.length - 1)];
      newtBead.position.set(Math.cos(np.phi) * np.r, flammY(np.r, relStrength) + 0.11, Math.sin(np.phi) * np.r);

      const gp = grData.pts[Math.min(gCount - 1, grData.pts.length - 1)];
      grBead.position.set(Math.cos(gp.phi) * gp.r, flammY(gp.r, relStrength) + 0.12, Math.sin(gp.phi) * gp.r);

      // 每经过一个近心点盖下一枚朱砂印记
      const curPhi = gp.phi;
      let stamped = 0;
      for (let i = 0; i < periMarks.length; i++) {
        const pm = grData.perihelia[i];
        if (pm && curPhi >= pm.phi) {
          periMarks[i].visible = true;
          periMarks[i].position.set(Math.cos(pm.phi) * pm.r, flammY(pm.r, relStrength) + 0.11, Math.sin(pm.phi) * pm.r);
          stamped++;
        } else {
          periMarks[i].visible = false;
        }
      }
      return {
        shiftDeg: grData.shiftDeg == null ? null : +grData.shiftDeg.toFixed(1),
        ecc: +ecc.toFixed(2),
        relStrength: +relStrength.toFixed(2),
        perihelia: stamped,
      };
    }
    return { shiftDeg: null, ecc, relStrength, perihelia: 0 };
  }

  return { group, update, fireOrbit, setRelStrength, setEccentricity, triggerGravitationalWave };
}

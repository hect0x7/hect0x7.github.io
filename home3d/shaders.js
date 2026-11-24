// 全部 GLSL 源码（WebGL2 / GLSL ES 3.00）

const HEADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DArray;
`;

const COMMON = `
const float TAU = 6.28318530718;
uint pcg(uint v){ uint s=v*747796405u+2891336453u; uint w=((s>>((s>>28u)+4u))^s)*277803737u; return (w>>22u)^w; }
float rnd(int id, int k){ return float(pcg(uint(id)*16u+uint(k)))*(1.0/4294967296.0); }
float hg(float g, float k){ return float(pcg(uint(g)*97u+uint(k)+7777u))*(1.0/4294967296.0); }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,s,-s,c); }
`;

// 粒子目标场（模拟着色器与直接模式渲染共用）
const TARGET = `
uniform float uIntroT;
uniform vec3 uSunPos;
uniform float uSunR;
uniform mat3 uDiskRot;
uniform float uWorksW;
uniform float uStarW;
uniform float uMorph;
uniform float uMorph0;
uniform int uMotifA;
uniform int uMotifB;
uniform sampler2DArray uMotifs;
uniform vec3 uMotifCenter;
uniform float uMotifScale;
uniform vec3 uTextCenter;
uniform vec3 uTextRight;
uniform vec3 uTextUp;
uniform float uTextScale;
uniform float uAmbientScale;

struct Tgt { vec3 p; float c; float b; float k; };
Tgt mixT(Tgt a, Tgt b, float w){ return Tgt(mix(a.p,b.p,w), mix(a.c,b.c,w), mix(a.b,b.b,w), mix(a.k,b.k,w)); }
float stag(float x, float s, float spread){ return smoothstep(0.0,1.0,clamp(x*(1.0+spread)-s*spread,0.0,1.0)); }

Tgt diskT(int id, float t){
  float s0=rnd(id,0), s1=rnd(id,1), s2=rnd(id,2), s3=rnd(id,3), kind=rnd(id,4);
  vec3 p; float c; float b;
  if (kind < 0.051) {
    // 紧贴赤日边缘的炽白光子内环（Photon Ring）
    float r = 1.18 + (s0-0.5)*0.032;
    float ang = s1*TAU + t*1.25;
    p = vec3(cos(ang)*r, (s2-0.5)*0.01, sin(ang)*r);
    c = 0.02 + s3*0.12; b = 0.82;
  } else if (kind < 0.14) {
    // 深空微尘外晕
    vec3 dir = normalize(vec3(s0-0.5, (s1-0.5)*0.48, s2-0.5) + 1e-4);
    float r = 2.1 + pow(s3, 0.82)*9.2;
    dir.xz = rot(t*0.02*(1.0+3.0/r)) * dir.xz;
    p = dir*r; c = 0.25 + rnd(id,5)*0.82; b = 0.22;
  } else {
    // 带两道清晰开普勒共振环缝与螺旋密度波的吸积盘
    float r;
    if (kind < 0.50) {
      r = mix(1.36, 2.04, pow(s0, 1.18));
    } else if (kind < 0.80) {
      r = mix(2.18, 3.02, pow(s0, 1.1));
    } else {
      r = mix(3.18, 5.55, pow(s0, 1.35));
    }
    float om = 1.28*pow(r, -1.5);
    float ang = s1*TAU + t*om;
    r += 0.11*sin(ang*2.0 - r*2.0)*smoothstep(1.45, 2.6, r);
    float g = (s2 + s3 + rnd(id,6) - 1.5);
    float h = g*(0.005 + 0.011*r*r/5.5);
    // 外盘柔和相对论翘曲
    h += 0.075*sin(ang + 0.7)*smoothstep(2.3, 5.2, r);
    p = vec3(cos(ang)*r, h, sin(ang)*r);
    float rn = clamp((r-1.36)/4.1, 0.0, 1.0);
    c = smoothstep(0.0, 0.82, rn)*1.08 + (rnd(id,7)-0.5)*0.16;
    b = mix(0.89, 0.30, rn);
  }
  return Tgt(uDiskRot*p*uSunR + uSunPos, c, b, 1.0);
}

vec3 fallSakura(vec2 l, float gid, float t, out float fade){
  if (gid < 4.5) {
    // 五朵主视觉盛放大樱花：冠冕双花与左右两翼侧花，完整避开卡片遮挡
    vec3 center;
    float sc;
    vec2 tilt;
    if (gid < 0.5)      { center = vec3(-0.66, 0.38, 0.14); sc = 0.64; tilt = vec2( 0.16, -0.14); }
    else if (gid < 1.5) { center = vec3( 0.72, 0.36,-0.06); sc = 0.54; tilt = vec2(-0.18,  0.16); }
    else if (gid < 2.5) { center = vec3(-1.88,-0.22, 0.12); sc = 0.60; tilt = vec2( 0.14,  0.24); }
    else if (gid < 3.5) { center = vec3( 1.90,-0.28,-0.10); sc = 0.56; tilt = vec2(-0.16, -0.26); }
    else                { center = vec3( 0.02, 0.54,-0.20); sc = 0.40; tilt = vec2( 0.22,  0.08); }
    center.y += sin(t*0.36 + gid*1.9)*0.05;
    center.x += cos(t*0.28 + gid*1.4)*0.045;
    vec3 q = vec3(l*sc, 0.0);
    float dir = mod(gid, 2.0) < 0.5 ? 1.0 : -1.0;
    q.xy = rot(t*0.11*dir + gid*1.25)*q.xy;
    q.yz = rot(tilt.x + sin(t*0.30 + gid)*0.12)*q.yz;
    q.xz = rot(tilt.y + cos(t*0.26 + gid)*0.12)*q.xz;
    fade = 1.24;
    return center + q;
  }
  float h1=hg(gid,1.0), h2=hg(gid,2.0), h3=hg(gid,3.0), h4=hg(gid,4.0), h5=hg(gid,5.0);
  float sc = 0.36*mix(0.62, 0.98, h1);
  float ph = fract(h3 + t*mix(0.014, 0.026, h2));
  float y = mix(1.92, -1.78, ph);
  float lane = (mod(gid, 2.0) < 0.5 ? -1.0 : 1.0)*mix(0.95, 2.45, h4);
  float x = lane + sin(t*0.34 + gid*2.1)*0.18;
  float z = (h5 - 0.5)*1.25;
  fade = smoothstep(0.0, 0.12, ph)*(1.0 - smoothstep(0.86, 1.0, ph))*1.05;
  vec3 q = vec3(l*sc, 0.0);
  q.xy = rot(t*mix(-0.28, 0.28, h1) + gid)*q.xy;
  q.yz = rot(sin(t*0.40 + gid*1.7)*0.34)*q.yz;
  q.xz = rot(cos(t*0.32 + gid*1.1)*0.32)*q.xz;
  return vec3(x, y, z) + q;
}

vec3 fallLeaf(vec2 l, float gid, float t, out float fade){
  if (gid < 2.5) {
    // 三片主视觉七裂大红叶：冠冕正上方主叶 + 左右两翼舒展侧叶，七裂尖与叶柄完整展现
    vec3 center;
    float sc;
    float baseRot;
    vec2 tilt;
    if (gid < 0.5)      { center = vec3(-0.34, 0.34, 0.12); sc = 0.72; baseRot = -0.22; tilt = vec2(-0.12,  0.14); }
    else if (gid < 1.5) { center = vec3( 1.80,-0.06,-0.08); sc = 0.64; baseRot =  0.36; tilt = vec2( 0.14, -0.22); }
    else                { center = vec3(-1.84,-0.20, 0.08); sc = 0.58; baseRot = -0.44; tilt = vec2( 0.12,  0.24); }
    center.y += sin(t*0.34 + gid*2.1)*0.05;
    center.x += cos(t*0.27 + gid*1.6)*0.04;
    vec3 q = vec3(l*sc, -0.05*dot(l,l)*sc);
    q.xy = rot(baseRot + sin(t*0.24 + gid*1.5)*0.08)*q.xy;
    q.yz = rot(tilt.x + sin(t*0.30 + gid)*0.10)*q.yz;
    q.xz = rot(tilt.y + cos(t*0.26 + gid)*0.12)*q.xz;
    fade = 1.18;
    return center + q;
  }
  float h1=hg(gid,1.0), h2=hg(gid,2.0), h3=hg(gid,3.0), h4=hg(gid,4.0), h5=hg(gid,5.0);
  float sc = 0.32*mix(0.68, 1.06, h1);
  float ph = fract(h3 + t*mix(0.015, 0.028, h2));
  float y = mix(1.88, -1.75, ph);
  float lane = (mod(gid, 2.0) < 0.5 ? -1.0 : 1.0)*mix(0.92, 2.38, h4);
  float x = lane + sin(t*0.36 + gid*1.9)*0.20;
  float z = (h5 - 0.5)*1.2;
  fade = smoothstep(0.0, 0.12, ph)*(1.0 - smoothstep(0.86, 1.0, ph))*0.92;
  vec3 q = vec3(l*sc, 0.0);
  q.xy = rot(t*mix(-0.30, 0.30, h1) + gid)*q.xy;
  q.yz = rot(sin(t*0.42 + gid*1.4)*0.36)*q.yz;
  q.xz = rot(cos(t*0.32 + gid)*0.34)*q.xz;
  return vec3(x, y, z) + q;
}

Tgt motifT(int m, int id, ivec2 tc, float t){
  vec4 d = texelFetch(uMotifs, ivec3(tc, m), 0);
  vec3 p = d.xyz; float c = d.w; float b = 1.0;
  if (m == 0) {
    vec3 n = cross(uTextRight, uTextUp);
    float sweep = fract(t*0.36)*1.7 - 0.85;
    float glint = 1.0 + 0.42*exp(-pow((d.x - sweep)/0.14, 2.0));
    return Tgt(uTextCenter + (uTextRight*d.x + uTextUp*d.y)*uTextScale + n*d.z*uTextScale, c, 0.10*glint, 11.2);
  } else if (m == 6) {
    vec3 q = d.xyz + vec3(sin(t*0.05+d.w*30.0), cos(t*0.04+d.w*20.0), 0.0)*0.08;
    float tw = 0.35 + 0.65*pow(0.5+0.5*sin(t*(0.5+d.w*1.6)+d.w*60.0), 2.6);
    float cc = fract(d.w*7.31) > 0.84 ? 0.92 : 0.06 + fract(d.w*3.7)*0.26;
    return Tgt(q, cc, 0.68*tw, 0.9);
  } else if (m == 1) {
    p.xz = rot(t*0.16)*p.xz;
    p.yz = rot(0.46)*p.yz;
    p.xy = rot(-0.18)*p.xy;
    b = 1.08;
  } else if (m == 2) {
    float wv = sin(p.x*1.65 - t*1.15 + p.y*0.55)*0.10 + sin(p.x*3.4 - t*1.85 + p.y*1.0)*0.025;
    p.z += wv*(0.25 + 0.75*clamp((p.x+1.7)/3.4, 0.0, 1.0));
    p.y += wv*0.11 + 0.18;
    p.xz = rot(0.14)*p.xz;
    p.yz = rot(-0.07)*p.yz;
    b = c > 0.7 ? 1.28 : 1.02;
  } else if (m == 3) {
    float fade;
    p = fallSakura(d.xy, d.z, t, fade);
    b = fade;
  } else if (m == 4) {
    float fade;
    p = fallLeaf(d.xy, d.z, t, fade);
    b = fade;
  } else if (m == 5) {
    // 5 页全息漫画分格冠冕长廊：中间拱起露于卡片上方，两侧斜展于卡片两翼
    float pid = d.z;
    float idx = pid - 2.0;
    vec3 q = vec3(d.xy*1.16, 0.0);
    q.z += 0.06*cos(d.x*2.6);
    q.xz = rot(-idx*0.24 + sin(t*0.32 + pid*1.15)*0.07)*q.xz;
    q.yz = rot(-0.08 + cos(t*0.26 + pid*0.9)*0.045)*q.yz;
    q.x += idx*0.98;
    q.y += 0.30 - idx*idx*0.09 + sin(t*0.38 + pid*1.3)*0.035;
    q.z -= abs(idx)*0.30;
    p = q;
    b = c > 0.7 ? 1.44 : 1.14;
  }
  return Tgt(uMotifCenter + p*uMotifScale, c, b, 6.6);
}

Tgt ambientT(int id, float t){
  float a=rnd(id,21), bq=rnd(id,22), cq=rnd(id,23);
  float y = fract(bq + t*0.008*(0.5+a))*8.0 - 4.0;
  vec3 p = vec3((a*2.0-1.0)*7.2*uAmbientScale, y, mix(-7.0, 2.2, cq));
  float f = smoothstep(-4.0,-3.0,y)*(1.0-smoothstep(3.0,4.0,y));
  return Tgt(uMotifCenter + p, 0.12 + rnd(id,24)*0.88, 0.26*f, 0.75);
}

Tgt voidT(int id, float t){
  float u = rnd(id,25)*2.0-1.0; float ph = rnd(id,26)*TAU; float s = sqrt(1.0-u*u);
  vec3 dir = vec3(s*cos(ph+t*0.08), u*0.62, s*sin(ph+t*0.08));
  return Tgt(vec3(0.0, 0.15, -0.4) + dir*mix(4.2, 8.6, rnd(id,27)), 0.18, 0.14, 1.2);
}

Tgt computeTargetM(int id, ivec2 tc, float t, float morphVal){
  Tgt r = diskT(id, t);
  float loyal = step(rnd(id,12), 0.07);
  r.b *= mix(1.0, 0.55, uWorksW*loyal);
  float wi = stag(uWorksW, rnd(id,13), 0.55)*(1.0-loyal);
  if (wi > 0.0) {
    Tgt m;
    if (rnd(id,14) > 0.95) {
      m = ambientT(id, t);
    } else if (morphVal >= 1.0) {
      m = motifT(uMotifB, id, tc, t);
    } else {
      float mi = stag(morphVal, rnd(id,15), 0.42);
      m = mixT(motifT(uMotifA, id, tc, t), motifT(uMotifB, id, tc, t), mi);
      m.k = mix(4.2, 6.6, smoothstep(0.25, 1.0, morphVal));
    }
    r = mixT(r, m, wi);
  }
  float si = stag(uStarW, rnd(id,16), 0.55);
  if (si > 0.0) r = mixT(r, motifT(6, id, tc, t), si);
  if (uIntroT < 2.25 && uWorksW < 0.35 && uStarW < 0.1) {
    float s9 = rnd(id,9);
    float arrive;
    if (rnd(id,8) < 0.15) {
      vec4 dT = texelFetch(uMotifs, ivec3(tc,0), 0);
      // 字形随日冕亮起，从中心向两侧散入轨道。
      float tear = 0.60 + abs(dT.x)*0.50 + rnd(id,10)*0.20;
      float tw = (1.0 - smoothstep(tear, tear+0.62, uIntroT))*(1.0 - uWorksW*2.8);
      tw = clamp(tw, 0.0, 1.0);
      r = mixT(r, motifT(0, id, tc, t), tw);
      arrive = smoothstep(0.0, 0.26 + s9*0.17, uIntroT);
    } else {
      arrive = smoothstep(0.10 + s9*0.65, 0.90 + s9*0.86, uIntroT);
    }
    if (arrive < 1.0) r = mixT(r, voidT(id, t), 1.0 - arrive);
  }
  return r;
}

Tgt computeTarget(int id, ivec2 tc, float t){
  return computeTargetM(id, tc, t, uMorph);
}
`;

export const FULLSCREEN_VS = HEADER + `
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2));
  vUv = p;
  gl_Position = vec4(p*2.0-1.0, 0.0, 1.0);
}`;

export const SIM_FS = HEADER + COMMON + TARGET + `
uniform sampler2D uPosTex;
uniform sampler2D uVelTex;
uniform sampler2D uNoise;
uniform float uTime;
uniform float uDt;
uniform int uTexW;
uniform int uNeedVelDiff;
uniform vec4 uGrav;
uniform vec3 uCamFwd;
uniform vec4 uPulse[4];
uniform float uSwirl;
uniform vec3 uDiskAxis;
uniform float uK;
uniform float uDamp;
uniform float uTurb;
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
void main(){
  ivec2 tc = ivec2(gl_FragCoord.xy);
  int id = tc.y*uTexW + tc.x;
  vec4 P = texelFetch(uPosTex, tc, 0);
  vec4 V = texelFetch(uVelTex, tc, 0);
  vec3 p = P.xyz, v = V.xyz;
  Tgt T = computeTargetM(id, tc, uTime, uMorph);
  vec3 vT;
  if (uNeedVelDiff == 1) {
    Tgt T0 = computeTargetM(id, tc, uTime - uDt, uMorph0);
    vT = (T.p - T0.p)/max(uDt, 1e-4);
    float vTl = length(vT);
    if (vTl > 14.5) vT *= 14.5/vTl;
  } else {
    // 稳态省去第二次目标场求值，吸积盘轨道采用解析切向速度近似
    vec3 relT = T.p - uSunPos;
    float rT = max(length(relT)/max(uSunR, 0.25), 1.15);
    float diskW = (1.0 - uWorksW)*(1.0 - uStarW);
    vT = cross(-uDiskAxis, relT)*(1.28*pow(rT, -1.5)*diskW);
  }
  vec3 toT = T.p - p;
  float k = uK*T.k;
  // 文字与作品母题锁定阶段（T.k > 2.0）采用微过阻尼并抑制背景乱流，确保造型如星钻般清晰锐利
  float lockF = smoothstep(2.0, 5.0, T.k);
  float damp = mix(uDamp*sqrt(T.k), 2.12*sqrt(k), lockF);
  vec3 acc = toT*k + (vT - v)*damp;
  // 指针小引力源（偏折 + 涡旋）
  vec3 dg = uGrav.xyz - p;
  float d2 = dot(dg,dg) + 0.24;
  float inv = uGrav.w/(d2*sqrt(d2))*mix(1.0, 0.42, lockF);
  acc += dg*inv + cross(uCamFwd, dg)*inv*0.92;
  // 点击冲击波脉冲
  for (int i=0;i<4;i++){
    vec4 pu = uPulse[i];
    float age = uTime - pu.w;
    if (age > 0.0 && age < 2.2) {
      vec3 dp = p - pu.xyz;
      float dd = length(dp);
      float R = age*5.2;
      float f = exp(-pow((dd-R)/0.75, 2.0))*exp(-age*1.45)*36.0;
      acc += dp/max(dd,1e-3)*f;
    }
  }
  float freeF = 1.0 - lockF*0.92;
  // 绕吸积盘法线的引力旋流（撕裂瞬间形成双旋臂潮汐流）
  vec3 rel = p - uSunPos;
  acc += cross(uDiskAxis, rel)*(uSwirl*freeF)/(dot(rel,rel)+0.85);
  // 预烘焙噪声纹理空间湍流（替代每粒子 3 次实时 3D Simplex Noise）
  float far = min(length(toT), 3.5);
  vec3 nz = texture(uNoise, p.xz*0.075 + vec2(p.y*0.043, uTime*0.012)).rgb*2.0 - 1.0;
  acc += nz*uTurb*freeF*(0.22 + far);
  v += acc*uDt;
  float sp = length(v);
  if (sp > 38.0) v *= 38.0/sp;
  p += v*uDt;
  oPos = vec4(p, T.c);
  oVel = vec4(v, T.b);
}`;

export const PARTICLE_VS = HEADER + COMMON + TARGET + `
uniform sampler2D uPosTex;
uniform sampler2D uVelTex;
uniform int uDirect;
uniform int uTexW;
uniform mat4 uVP;
uniform float uViewH;
uniform float uProjY;
uniform float uAspect;
uniform vec3 uSunScr;
uniform float uSize;
uniform float uFocus;
uniform float uAperture;
uniform float uIntensity;
uniform float uTheme;
uniform float uHorizon;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec4 uGrav;
out vec3 vColD;
out vec3 vColL;
out float vAL;

vec3 rampDark(float c){
  vec3 a=vec3(1.0,0.94,0.95);
  vec3 b=vec3(1.0,0.58,0.68);
  vec3 cc=vec3(0.88,0.12,0.15);
  vec3 d=vec3(0.96,0.28,0.12);
  vec3 e=vec3(1.0,0.62,0.32);
  c = clamp(c, 0.0, 2.0);
  if (c < 0.5) return mix(a,b,c*2.0);
  if (c < 1.0) return mix(b,cc,(c-0.5)*2.0);
  if (c < 1.5) return mix(cc,d,(c-1.0)*2.0);
  return mix(d,e,(c-1.5)*2.0);
}
vec3 rampInk(float c){
  // 和纸水墨色板：浓墨 #14110d → 松烟淡墨 → 朱砂印红 #c3272b → 赭石金红
  vec3 inkDeep = vec3(0.078, 0.066, 0.051);
  vec3 inkMid  = vec3(0.20, 0.17, 0.145);
  vec3 vermil  = vec3(0.765, 0.153, 0.169);
  vec3 autumn  = vec3(0.68, 0.22, 0.11);
  c = clamp(c, 0.0, 2.0);
  if (c < 0.45) return mix(inkDeep, inkMid, c/0.45);
  if (c < 0.85) return mix(inkMid, vermil, smoothstep(0.45, 0.85, c));
  return mix(vermil, autumn, clamp((c - 0.85)/0.8, 0.0, 1.0));
}

void main(){
  int id = gl_VertexID;
  ivec2 tc = ivec2(id % uTexW, id / uTexW);
  vec3 p; vec3 v; float c; float b;
  if (uDirect == 1) {
    Tgt T = computeTarget(id, tc, uTime);
    p = T.p; c = T.c; b = T.b; v = vec3(0.0);
    vec3 dg = uGrav.xyz - p; float d2 = dot(dg,dg)+0.3;
    p += dg*uGrav.w*0.04/d2;
  } else {
    vec4 A = texelFetch(uPosTex, tc, 0);
    vec4 B = texelFetch(uVelTex, tc, 0);
    p = A.xyz; c = A.w; v = B.xyz; b = B.w;
  }
  vec4 clip = uVP*vec4(p, 1.0);
  bool bad = any(isnan(p)) || any(isinf(p)) || isnan(b) || isnan(c) || any(isnan(v));
  if (bad || clip.w < 0.08 || b <= 0.001) {
    gl_Position = vec4(2.0,2.0,2.0,1.0); gl_PointSize = 0.0;
    vColD = vec3(0.0); vColL = vec3(0.0); vAL = 0.0; return;
  }
  float sizeW = uSize*(0.62 + rnd(id,20)*0.76)*mix(1.0, 1.18, uTheme)*mix(1.0, mix(0.88, 1.12, uTheme), uWorksW);
  float px = sizeW*uProjY*0.5*uViewH/clip.w;
  float coc = uAperture*abs(1.0/uFocus - 1.0/clip.w)*uViewH;
  float sz = max(px + coc, 1.35);
  float energy = min(1.0, (px*px + 0.68)/(sz*sz));
  float speed = length(v);
  float heat = clamp(speed*0.055, 0.0, 1.0);
  vec3 rd = normalize(p - uCamPos);
  float dop = dot(v, -rd)/max(speed, 0.25);
  float dopBoost = 1.0 + 0.5*clamp(dop, -1.0, 1.0)*smoothstep(0.15, 0.9, speed);
  float horMask = mix(1.0, smoothstep(-0.003, 0.018, rd.y), uHorizon);
  vec2 ndcP = clip.xy/clip.w;
  float leftSpace = smoothstep(-0.48, 0.18, ndcP.x);
  vec2 toSun = ((ndcP + 1.0)*0.5 - uSunScr.xy)*vec2(uAspect, 1.0);
  float discDistance = length(toSun)/max(uSunScr.z, 0.001);
  float discMask = mix(0.09, 1.0, smoothstep(0.86, 1.16, discDistance));
  // 作品区左上角标题避让区：亮色水墨模式下更明显，避免高密度粒子直穿文字
  float worksCorner = smoothstep(-0.20, -0.60, ndcP.x)*smoothstep(0.16, 0.56, ndcP.y);
  float worksReadability = 1.0 - worksCorner*mix(0.58, 0.88, uTheme);
  float readability = mix(mix(0.25, 1.0, leftSpace)*discMask, worksReadability, uWorksW);
  readability = mix(readability, 1.0, uStarW);
  float wBoostD = mix(1.0, 1.08, uWorksW);
  float wBoostL = mix(0.85, 2.15, uWorksW);

  float aD = b*energy*uIntensity*wBoostD*(1.0 + heat*1.05)*dopBoost*horMask*readability;
  vec3 colD = mix(rampDark(c), vec3(1.0, 0.92, 0.90), heat*0.35);
  colD *= 1.0 + 0.45*smoothstep(0.65, 1.0, c);
  vColD = colD*aD;

  vColL = mix(rampInk(c), vec3(0.66, 0.31, 0.29), 0.24*(1.0 - max(uWorksW, uStarW)));
  vAL = clamp(b*energy*uIntensity*wBoostL*horMask*(1.0 + heat*0.35)*readability, 0.0, 0.92);

  gl_PointSize = min(sz, 56.0);
  gl_Position = clip;
}`;

export const PARTICLE_FS = HEADER + `
in vec3 vColD;
in vec3 vColL;
in float vAL;
uniform float uTheme;
out vec4 o;
void main(){
  vec2 q = gl_PointCoord*2.0 - 1.0;
  float d2 = dot(q,q);
  if (d2 > 1.0) discard;
  float gD = exp(-d2*3.2);
  float gL = exp(-d2*3.0);
  vec3 cD = vColD*gD;
  float aL = clamp(vAL*gL, 0.0, 0.90);
  vec3 cL = vColL*aL;
  o = vec4(mix(cD, cL, uTheme), aL*uTheme);
}`;

export const BG_FS = HEADER + COMMON + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uNoise;
uniform vec3 uCamPos;
uniform vec3 uCamR;
uniform vec3 uCamU;
uniform vec3 uCamF;
uniform vec2 uTanHalf;
uniform float uTheme;
uniform float uTime;
uniform float uHorizon;
uniform vec3 uSunPos;
uniform float uSunR;
uniform float uSunVis;
uniform vec2 uRes;

float h31(vec3 p){ p = fract(p*vec3(443.897,441.423,437.195)); p += dot(p, p.yzx+19.19); return fract((p.x+p.y)*p.z); }

vec3 stars(vec3 rd){
  vec3 acc = vec3(0.0);
  for (int l=0; l<2; l++){
    float sc = l==0 ? 120.0 : 260.0;
    vec3 p = rd*sc;
    vec3 cell = floor(p);
    float h = h31(cell + float(l)*17.0);
    float th = l==0 ? 0.994 : 0.998;
    if (h > th) {
      vec3 off = vec3(h31(cell+1.3), h31(cell+2.7), h31(cell+5.1)) - 0.5;
      vec3 f = fract(p) - 0.5 - off*0.6;
      float d = length(f);
      float br = (h - th)/(1.0 - th);
      float tw = 0.7 + 0.3*sin(uTime*(1.0+h*3.0) + h*90.0);
      float s = 1.0 - smoothstep(0.0, 0.22, d);
      vec3 sc2 = mix(vec3(1.0,0.86,0.84), vec3(0.86,0.9,1.0), h31(cell+9.0));
      acc += sc2*s*s*(0.18+br*0.80)*tw*(l==0?1.0:0.55);
    }
  }
  return acc;
}

void main(){
  vec2 ndc = vUv*2.0 - 1.0;
  vec3 rd = normalize(uCamF + ndc.x*uTanHalf.x*uCamR + ndc.y*uTanHalf.y*uCamU);
  vec3 toSun = uSunPos - uCamPos;
  float sunDist = length(toSun);
  vec3 sd = toSun/sunDist;
  float cs = dot(rd, sd);
  float ang = acos(clamp(cs, -1.0, 1.0));
  float angR = asin(clamp(uSunR/sunDist, 0.0, 0.99));
  vec3 colD = vec3(0.0); vec3 colL = vec3(0.0);
  float y = rd.y;
  vec2 skyUv = vec2(atan(rd.x, -rd.z)*(1.0/TAU), y*0.44 + 0.5);
  if (uTheme < 0.999) {
    // 冷墨星野托住赤色日冕，星云和散射都保持在远处。
    vec3 c = vec3(0.024, 0.021, 0.030);
    float n1a = texture(uNoise, skyUv*vec2(2.0, 1.8) + vec2(uTime*0.0009, 0.0)).r;
    float n1b = texture(uNoise, skyUv*vec2(3.0, 2.5) - vec2(uTime*0.0006, 0.19)).g;
    float n1 = (n1a*0.62 + n1b*0.38)*2.0 - 1.0;
    c += vec3(0.044, 0.018, 0.037)*pow(smoothstep(-0.08, 0.68, n1), 2.0);
    float n2 = texture(uNoise, skyUv*vec2(4.0, 3.4) + vec2(0.37, 0.61)).g*2.0 - 1.0;
    c += vec3(0.012, 0.017, 0.032)*smoothstep(0.05, 0.72, n2)*0.52;
    c += vec3(0.17, 0.036, 0.054)*exp(-max(ang - angR, 0.0)/(angR*1.12 + 0.015))*0.57*uSunVis;
    c += stars(rd)*(1.0 - 0.88*uHorizon*step(y, 0.0))*mix(0.42, 1.0, smoothstep(0.35, 0.73, vUv.x));
    if (uHorizon > 0.001) {
      float yp = max(y, 0.0);
      vec3 dusk = vec3(0.58, 0.075, 0.065)*exp(-yp*9.5)*0.48 + vec3(0.26, 0.035, 0.045)*exp(-yp*2.8)*0.24;
      float az = atan(rd.x, -rd.z) - atan(sd.x, -sd.z);
      dusk *= 0.5 + 0.5*exp(-az*az*2.8);
      vec3 sky = c + dusk*uHorizon;
      float iy = 1.0/max(-y, 0.0015);
      vec2 seaUv = vec2(rd.x*iy*0.038, iy*0.095 + uTime*0.015);
      float wv = (texture(uNoise, seaUv).r*0.6 + texture(uNoise, seaUv*2.1 - vec2(uTime*0.007, 0.31)).g*0.4)*2.0 - 1.0;
      float sunEl = sd.y;
      float el = -y - max(sunEl, -0.02);
      float streak = exp(-az*az/(0.0012 + 0.055*max(-y,0.0)))*exp(-abs(el)*5.0)*(0.55 + 0.45*wv);
      vec3 sea = vec3(0.011, 0.008, 0.008) + vec3(0.045,0.008,0.01)*exp(y*24.0);
      sea += vec3(1.25, 0.18, 0.14)*streak*0.58*uSunVis;
      float hz = smoothstep(-0.0015, 0.0015, y);
      vec3 withH = mix(sea, sky, hz);
      withH += vec3(0.88, 0.14, 0.11)*exp(-abs(y)*165.0)*0.18;
      c = mix(c, withH, uHorizon);
    }
    colD = c;
  }
  if (uTheme > 0.001) {
    // 和纸 #faf8f3 纤维与淡墨晕染（预烘焙噪声纹理采样）
    vec3 paper = vec3(0.980, 0.973, 0.953);
    vec2 sp = vUv*uRes;
    float fib1 = texture(uNoise, sp*vec2(0.0016, 0.014)).a*2.0 - 1.0;
    float fib2 = texture(uNoise, sp*vec2(0.0085, 0.0012) + 0.37).a*2.0 - 1.0;
    float fib = fib1*0.5 + fib2*0.5;
    float pulp = texture(uNoise, sp*0.0012 + 0.19).r*2.0 - 1.0;
    paper *= 1.0 - 0.015*fib - 0.018*pulp;
    float wash = smoothstep(0.36, 0.78, texture(uNoise, skyUv*vec2(2.0, 1.4) + 0.23).g);
    paper = mix(paper, paper*vec3(0.92, 0.905, 0.885), wash*0.24);
    paper = mix(paper, vec3(0.965, 0.89, 0.865), exp(-max(ang - angR, 0.0)/(angR*2.4 + 0.02))*0.18*uSunVis);
    if (uHorizon > 0.001) {
      float iy = 1.0/max(-y, 0.0015);
      float brush = texture(uNoise, vec2(rd.x*iy*0.018, iy*0.15 + uTime*0.008)).r*2.0 - 1.0;
      vec3 sea = paper*(0.94 - 0.10*exp(y*14.0)) - vec3(0.042)*smoothstep(0.18, 0.78, brush);
      float az = atan(rd.x, -rd.z) - atan(sd.x, -sd.z);
      float streak = exp(-az*az/(0.002 + 0.055*max(-y,0.0)))*exp(-abs(-y - max(sd.y,-0.02))*5.0)*(0.6+0.4*brush);
      sea = mix(sea, vec3(0.765, 0.18, 0.175), clamp(streak*0.62*uSunVis, 0.0, 0.78));
      float hz = smoothstep(-0.0015, 0.0015, y);
      vec3 withH = mix(sea, paper, hz);
      withH = mix(withH, vec3(0.18, 0.15, 0.13), exp(-abs(y)*210.0)*0.32);
      paper = mix(paper, withH, uHorizon);
    }
    colL = paper;
  }
  o = vec4(mix(colD, colL, uTheme), 1.0);
}`;

export const SUN_VS = HEADER + `
uniform vec3 uSunPos;
uniform vec3 uCamR;
uniform vec3 uCamU;
uniform float uSunRw;
uniform float uExtent;
uniform mat4 uVP;
out vec2 vQ;
out vec3 vWp;
void main(){
  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1))*2.0 - 1.0;
  vQ = c*uExtent;
  vec3 wp = uSunPos + (uCamR*c.x + uCamU*c.y)*uExtent*uSunRw;
  vWp = wp;
  gl_Position = uVP*vec4(wp, 1.0);
}`;

export const SUN_FS = HEADER + COMMON + `
in vec2 vQ;
in vec3 vWp;
out vec4 o;
uniform sampler2D uNoise;
uniform vec3 uSunPos;
uniform vec3 uCamR;
uniform vec3 uCamU;
uniform vec3 uCamF;
uniform vec3 uCamPos;
uniform float uSunRw;
uniform float uExtent;
uniform mat4 uVP;
uniform float uTime;
uniform float uTheme;
uniform float uFlare;
uniform float uHorizon;
uniform vec2 uCorona;

// 日珥沿局部磁场抛出，环的两端顺着球面曲率回落。
float prominence(vec2 q, float angle, float span, float rise){
  vec2 local = rot(1.57079633 - angle)*q;
  float along = local.x/span;
  float base = sqrt(max(1.0 - local.x*local.x, 0.0));
  float height = rise*sqrt(max(1.0 - along*along, 0.0));
  float dist = abs(local.y - base - height);
  float profile = exp(-dist*130.0) + exp(-dist*38.0)*0.23;
  return profile*(1.0 - smoothstep(0.85, 1.02, abs(along)))*step(0.0, local.y);
}

void main(){
  vec2 q = vQ;
  float r = length(q);
  if (r > uExtent) discard;
  if (uTheme > 0.999 && r > 1.46) discard;
  vec3 rdv = normalize(vWp - uCamPos);
  float vis = mix(1.0, smoothstep(-0.0015, 0.0015, rdv.y), uHorizon);
  if (vis <= 0.001) discard;

  float aa = max(fwidth(r), 0.002);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float rr = max(r - 1.0, 0.0);
  float z = sqrt(max(1.0 - r*r, 0.0));
  float dsc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
  vec2 angleVec = q/max(r, 0.001);
  vec2 keyLight = vec2(0.78, 0.626);
  float lightFacing = max(dot(angleVec, keyLight), 0.0);
  float crescent = smoothstep(0.03, 0.94, lightFacing);
  if (uTheme < 0.999) {
    vec3 umbra = vec3(0.012, 0.009, 0.016);
    if (r < 1.0 + aa) {
      // 球面尘土仍有微弱地照，薄薄的弧面由右上角进入光区。
      vec2 surface = vec2(asin(clamp(q.x, -1.0, 1.0)), q.y)*0.37;
      vec4 rock = texture(uNoise, surface + vec2(uTime*0.005, 0.33));
      float detail = rock.r*0.72 + texture(uNoise, surface*2.9).g*0.28;
      umbra += vec3(0.042, 0.024, 0.042)*detail*(0.38 + 0.62*lightFacing)*pow(z + 0.12, 0.3);
      float limb = exp(-z*(10.0 - 5.0*crescent));
      umbra += mix(vec3(0.32, 0.039, 0.067), vec3(1.20, 0.29, 0.16), crescent)*limb;
    }
    vec3 corona = vec3(0.0);
    if (r > 1.0 - aa) {
      vec2 qc = q - uCorona*smoothstep(1.0, 1.85, r);
      float a = atan(qc.y, qc.x)/TAU;
      float drift = uTime*0.013;
      float flow = texture(uNoise, vec2(a*3.0 - rr*0.15, rr*0.28 - drift)).r;
      float fibres = texture(uNoise, vec2(a*10.0 + (flow - 0.5)*rr*0.28, rr*0.22 - drift)).g;
      float stream = pow(smoothstep(0.27, 0.82, fibres*0.88 + flow*0.22), 1.7);
      float leftFan = smoothstep(0.35, 1.0, dot(angleVec, vec2(-0.82, 0.572)));
      float rightFan = smoothstep(0.45, 1.0, dot(angleVec, vec2(0.95, -0.312)));
      float fan = max(leftFan, rightFan);
      float plume = exp(-rr/(0.12 + 0.27*fan))*(0.05 + stream*(0.28 + 0.83*fan));
      float hotRim = exp(-rr*46.0)*(0.19 + crescent*0.76);
      float flare = pow(lightFacing, 42.0)*exp(-rr*9.5);
      float loops = prominence(q, 2.02 + sin(uTime*0.17)*0.027, 0.20, 0.23);
      loops += 0.57*prominence(q, -0.24, 0.12, 0.15);
      corona = vec3(0.89, 0.118, 0.193)*plume;
      corona += vec3(1.52, 0.52, 0.31)*hotRim;
      corona += vec3(1.16, 0.28, 0.20)*(0.67*flare + 0.64*loops);
      corona *= (1.0 + uFlare*1.45)*(1.0 - smoothstep(1.45, uExtent, r));
    }
    col += (umbra*dsc + corona*(1.0 - dsc))*(1.0 - uTheme);
    alpha += dsc*(1.0 - uTheme);
  }
  if (uTheme > 0.001 && r < 1.46) {
    // 白昼保留同一轮日食，以朱砂套印表现细弧与不规则的晕边。
    vec4 ink = texture(uNoise, q*0.56 + 0.50);
    vec4 fibres = texture(uNoise, q*2.9 + 0.27);
    float edge = 1.0 + 0.009*(ink.r*2.0 - 1.0) + 0.005*(fibres.a*2.0 - 1.0);
    float printMask = 1.0 - smoothstep(edge - aa, edge + aa, r);
    float limb = exp(-z*(6.0 - 3.9*crescent));
    float scatter = ink.g*0.65 + fibres.r*0.35;
    vec3 inkShadow = mix(vec3(0.19, 0.075, 0.09), vec3(0.33, 0.12, 0.16), scatter);
    vec3 inkRim = mix(vec3(0.61, 0.14, 0.18), vec3(0.88, 0.28, 0.18), crescent);
    vec3 seal = mix(inkShadow, inkRim, limb*(0.47 + 0.53*crescent));
    float crescentEdge = length(q + keyLight*0.115) + 0.017*(fibres.r - 0.5);
    float printCrescent = smoothstep(0.985 - aa, 1.028 + aa, crescentEdge);
    seal = mix(seal, mix(vec3(0.68, 0.11, 0.14), vec3(0.93, 0.36, 0.22), scatter), printCrescent*0.93);
    float pores = smoothstep(0.63, 0.92, fibres.a - ink.g*0.12);
    seal = mix(seal, vec3(0.94, 0.86, 0.80), pores*0.27);
    float bleed = exp(-max(r - edge, 0.0)*24.0)*(0.06 + crescent*0.21);
    float thread = prominence(q, 2.02, 0.20, 0.23)*0.16 + prominence(q, -0.24, 0.12, 0.15)*0.11;
    float edgeWash = (bleed + thread + exp(-rr*11.0)*scatter*0.095)*(1.0 - printMask)*(1.0 - smoothstep(1.27, 1.46, r));
    edgeWash *= 1.0 + 0.35*min(uFlare, 0.65);
    col += (seal*printMask + inkRim*edgeWash)*uTheme;
    alpha += (printMask + edgeWash)*uTheme;
    dsc = mix(dsc, printMask, uTheme);
  }
  col *= vis; alpha *= vis;
  if (dsc < 0.001 && (col.r + col.g + col.b + alpha) < 0.003) discard;
  if (dsc*vis > 0.5) {
    vec3 wp = uSunPos + (uCamR*q.x + uCamU*q.y - uCamF*z)*uSunRw;
    vec4 cp = uVP*vec4(wp, 1.0);
    gl_FragDepth = clamp((cp.z/cp.w)*0.5 + 0.5, 0.0, 1.0);
  } else {
    gl_FragDepth = 1.0;
  }
  o = vec4(col, alpha);
}`;

export const BLOOM_DOWN_FS = HEADER + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uPrefilter;
uniform float uThreshold;
uniform float uKnee;
vec3 pf(vec3 c){
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0*uKnee);
  soft = soft*soft/(4.0*uKnee + 1e-4);
  float w = max(soft, br - uThreshold)/max(br, 1e-4);
  return c*w;
}
void main(){
  vec2 t = uTexel;
  vec3 a = texture(uSrc, vUv + t*vec2(-2.0, 2.0)).rgb;
  vec3 b = texture(uSrc, vUv + t*vec2( 0.0, 2.0)).rgb;
  vec3 c = texture(uSrc, vUv + t*vec2( 2.0, 2.0)).rgb;
  vec3 d = texture(uSrc, vUv + t*vec2(-2.0, 0.0)).rgb;
  vec3 e = texture(uSrc, vUv).rgb;
  vec3 f = texture(uSrc, vUv + t*vec2( 2.0, 0.0)).rgb;
  vec3 g = texture(uSrc, vUv + t*vec2(-2.0,-2.0)).rgb;
  vec3 h = texture(uSrc, vUv + t*vec2( 0.0,-2.0)).rgb;
  vec3 i = texture(uSrc, vUv + t*vec2( 2.0,-2.0)).rgb;
  vec3 j = texture(uSrc, vUv + t*vec2(-1.0, 1.0)).rgb;
  vec3 k = texture(uSrc, vUv + t*vec2( 1.0, 1.0)).rgb;
  vec3 l = texture(uSrc, vUv + t*vec2(-1.0,-1.0)).rgb;
  vec3 m = texture(uSrc, vUv + t*vec2( 1.0,-1.0)).rgb;
  vec3 s = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  if (uPrefilter > 0.5) s = pf(s);
  o = vec4(min(s, vec3(40.0)), 1.0);
}`;

export const BLOOM_UP_FS = HEADER + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uRadius;
void main(){
  vec2 t = uTexel*uRadius;
  vec3 s = texture(uSrc, vUv).rgb*4.0;
  s += (texture(uSrc, vUv + vec2(-t.x, 0.0)).rgb + texture(uSrc, vUv + vec2(t.x, 0.0)).rgb + texture(uSrc, vUv + vec2(0.0, -t.y)).rgb + texture(uSrc, vUv + vec2(0.0, t.y)).rgb)*2.0;
  s += texture(uSrc, vUv + vec2(-t.x, -t.y)).rgb + texture(uSrc, vUv + vec2(t.x, -t.y)).rgb + texture(uSrc, vUv + vec2(-t.x, t.y)).rgb + texture(uSrc, vUv + vec2(t.x, t.y)).rgb;
  o = vec4(s/16.0, 1.0);
}`;

export const COMPOSITE_FS = HEADER + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform vec3 uSunScr;
uniform float uLens;
uniform float uCA;
uniform float uBloomI;
uniform float uGrain;
uniform float uVig;
uniform float uTheme;
uniform float uTime;
uniform float uExposure;
uniform float uUseBloom;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec3 filmic(vec3 x){
  x = max(x, 0.0);
  vec3 a = x*(2.51*x + 0.03);
  vec3 b = x*(2.43*x + 0.59) + 0.14;
  vec3 aces = clamp(a/b, 0.0, 1.0);
  float L = dot(x, vec3(0.2126, 0.7152, 0.0722));
  float Lt = L*(2.51*L + 0.03)/(L*(2.43*L + 0.59) + 0.14);
  vec3 hue = x*(Lt/max(L, 1e-4));
  // 提高色相保持权重，避免高光赤红被 ACES 漂成橘黄
  return mix(aces, min(hue, vec3(1.0)), 0.62);
}
void main(){
  vec2 uv = vUv;
  float asp = uRes.x/uRes.y;
  vec2 cc = uv - 0.5;
  // 纯亮色和纸稳态极简分支：跳过引力透镜、Bloom 采样与 Filmic 色调映射
  if (uTheme > 0.999) {
    vec3 c = clamp(texture(uScene, uv).rgb, 0.0, 1.0);
    if (uCA > 0.005) {
      float cr = dot(cc*vec2(asp,1.0), cc*vec2(asp,1.0));
      vec2 ca = cc*cr*uCA;
      c.r = clamp(texture(uScene, uv + ca).r, 0.0, 1.0);
      c.b = clamp(texture(uScene, uv - ca).b, 0.0, 1.0);
    }
    float vg = 1.0 - smoothstep(0.24, 1.38, length(cc*vec2(asp*0.8, 1.0))*1.22);
    c = mix(c, c*vec3(0.95, 0.925, 0.89), (1.0 - vg)*0.55);
    float g = hash12(uv*uRes + fract(uTime*7.13)*vec2(97.0, 57.0)) - 0.5;
    c *= 1.0 + g*uGrain*0.48;
    c += (hash12(uv*uRes*1.7 + 3.1) - 0.5)/255.0;
    o = vec4(c, 1.0);
    return;
  }
  vec2 dv = (uv - uSunScr.xy)*vec2(asp, 1.0);
  float d = length(dv);
  float rs = uSunScr.z;
  float lens = 0.0;
  if (rs > 0.0) {
    // 爱因斯坦环式边缘引力透镜折射（将背景星尘与后盘光线在赤日边缘弯曲拱起）
    lens = uLens*rs*rs/max(d, 1e-4)*smoothstep(rs*0.98, rs*1.45, d)*(1.0 - smoothstep(rs*2.6, rs*9.5, d));
  }
  vec2 suv = uv - dv/max(d, 1e-4)*lens/vec2(asp, 1.0);
  float cr = dot(cc*vec2(asp,1.0), cc*vec2(asp,1.0));
  vec2 ca = cc*cr*uCA;
  vec3 col;
  col.r = texture(uScene, suv + ca).r;
  col.g = texture(uScene, suv).g;
  col.b = texture(uScene, suv - ca).b;
  vec3 bl = uUseBloom > 0.5 ? texture(uBloom, suv).rgb : vec3(0.0);
  vec3 dark = filmic(col*uExposure + bl*uBloomI);
  vec3 light = clamp(col, 0.0, 1.0);
  vec3 c = mix(dark, light, uTheme);
  float vg = 1.0 - smoothstep(0.24, 1.38, length(cc*vec2(asp*0.8, 1.0))*1.22);
  c *= mix(1.0, vg, uVig*(1.0 - uTheme));
  c = mix(c, c*vec3(0.95, 0.925, 0.89), (1.0 - vg)*0.55*uTheme);
  float g = hash12(uv*uRes + fract(uTime*7.13)*vec2(97.0, 57.0)) - 0.5;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c += g*uGrain*(0.35 + 0.65*(1.0 - lum))*(1.0 - uTheme);
  c *= 1.0 + g*uGrain*0.48*uTheme;
  c += (hash12(uv*uRes*1.7 + 3.1) - 0.5)/255.0;
  o = vec4(c, 1.0);
}`;

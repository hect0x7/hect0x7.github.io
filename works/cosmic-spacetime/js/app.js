// 《时空织物 · 从大爆炸到光锥》v6 —— 原生纵向滚动纵深叙事控制器
// 原生滚动驱动 3D 连续穿行纵深；空白处鼠标拖拽仅旋转/操控当前雕塑，绝不劫持滚动

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const I18N = {
  zh: {
    backHome: '← hect0x7',
    themeDark: '深空',
    themeLight: '版画',
    staticFallback: '当前为静态阅览模式（未启用 WebGL），仍可向下滚动阅读四幕叙事。',

    ch0Title: '时空织物：<em>从大爆炸到光锥</em>',
    ch0Lead: '一切始于一次微小的量子涨落。沿着这只光学玻璃膨胀钟向右滑动时间，看空间本身如何把星系彼此拉开，听右端 WMAP 探测器截获 138 亿年前的微波余温。',
    ep0: '10⁻³²s 暴胀',
    ep1: '38万年 微波背景',
    ep2: '4亿年 首批恒星',
    ep3: '138亿年 今日',
    mScale: '尺度',
    replayInflation: '↺ 重演暴胀',
    scrollDive: '向下滚动潜入深空 ↓',

    ch1Title: '质量压弯时空，<br>同一束初速刻出<em>两条命运</em>。',
    ch1Lead: '在弯曲的时空漏斗上同时松手：旧宇宙的牛顿引力只会画回闭合的蓝椭圆，而广义相对论让轨道永不闭合，一圈圈旋转成赤金玫瑰。',
    legNewton: '牛顿闭合',
    legGr: '相对论进动',
    perOrbit: '圈',
    lblRelStr: '曲率深度',
    fireOrbit: '✦ 再发一束',
    emitWave: '◎ 引力波',

    ch2Title: '当一座星系<br>挡住<em>更远的星光</em>。',
    ch2Lead: '在画幅中央移动引力透镜。光线被迫绕开大质量星系，远方星系分裂成一正一倒两幅镜像；一旦三点共线，星光便合拢为一圈完整的爱因斯坦环。',
    toggleParity: '◎ 显示同源镜像',
    toggleParityOn: '● 隐藏同源镜像',
    snapRing: '◎ 合拢光环',
    lensMassLabel: '前景质量',
    kickerAlign: '共线',
    parityIdle: '轻移透镜偏移光轴，凝视双像如何分裂与反转。',
    parityRing: '三点共线：遥远星光无缝合拢为 360° 爱因斯坦环。',
    paritySplit: '同源分裂：外像正立，内像已发生宇称镜像反转。',

    ch3Title: '亲手交换两件事的<em>先后</em>。',
    ch3Lead: '光速为宇宙划出了因果的边界。滑动你的相对速度，让左侧半透明同时面随之倾斜——当两起事件落在光锥之外，谁先谁后竟取决于观察者；唯有进入光锥之内，因果才不可逆转。',
    relSpacelike: '光锥之外 · 顺序可逆',
    relLightlike: '光锥边界 · 光速相连',
    relTimelike: '未来光锥内 · 因果锁定',
    ordAFirst: '此刻：A 先于 B 发生',
    ordBFirst: '此刻：B 先于 A 发生',
    ordSimul: '此刻：A 与 B 同时发生',
    restFrame: '静止 0c',
    preSpace: '光锥外 (颠倒先后)',
    preLight: '光锥面 (光速)',
    preTime: '未来光锥 (因果锁定)',
    restartBigBang: '↺ 回到奇点重演',
    backGallery: '← 返回作品集',
  },
  ja: {
    backHome: '← hect0x7',
    themeDark: '深宇宙',
    themeLight: '版画',
    staticFallback: '静的閲覧モード（WebGL 無効）。下へスクロールして四幕の物語をご覧いただけます。',

    ch0Title: '時空の織物：<em>ビッグバンから光円錐へ</em>',
    ch0Lead: 'すべては微かな量子ゆらぎから始まった。光学ガラスの膨張鐘に沿って時間を辿り、空間そのものが銀河を押し広げる姿と WMAP の微弱な余韻を見つめる。',
    ep0: '10⁻³²s インフレ',
    ep1: '38万年 CMB',
    ep2: '4億年 初代星',
    ep3: '138億年 現在',
    mScale: '尺度',
    replayInflation: '↺ 膨張を再演',
    scrollDive: '下へスクロールして深宇宙へ ↓',

    ch1Title: '質量が時空を曲げ、<br>同じ初速が<em>二つの軌跡</em>を刻む。',
    ch1Lead: '曲がった重力井戸へ同時に放つ。ニュートン重力は閉じた青楕円へ戻り、一般相対論は閉じない赤金のロゼット歳差を描き続ける。',
    legNewton: 'ニュートン閉楕円',
    legGr: '相対論歳差',
    perOrbit: '周',
    lblRelStr: '曲率の深さ',
    fireOrbit: '✦ もう一度放つ',
    emitWave: '◎ 重力波',

    ch2Title: '大質量銀河が<br><em>遠い星光</em>を遮るとき。',
    ch2Lead: '中央の視窓で重力レンズを動かす。光は質量を回り込み、正立像と反転鏡像へ分裂する。一直線に揃った瞬間、光は 360° のアインシュタインリングへ閉じる。',
    toggleParity: '◎ 同源鏡像を表示',
    toggleParityOn: '● 同源鏡像を隠す',
    snapRing: '◎ リングを閉じる',
    lensMassLabel: '前景質量',
    kickerAlign: '整列',
    parityIdle: '光軸から少しずらし、二重像の分裂と反転を観察する。',
    parityRing: '完全整列：星光が 360° のアインシュタインリングへ閉じた。',
    paritySplit: '同源分裂：外像は正立、内像はパリティ反転している。',

    ch3Title: '二つの出来事の<em>前後</em>を操る。',
    ch3Lead: '光速は宇宙の因果を隔てる。相対速度を動かして同時面を傾けると、光円錐の外では順序が入れ替わり、光円錐の内では因果が永遠に固定される。',
    relSpacelike: '光円錐の外 · 順序反転可',
    relLightlike: '光円錐面 · 光速境界',
    relTimelike: '未来光円錐内 · 因果固定',
    ordAFirst: '観測：A が B より先',
    ordBFirst: '観測：B が A より先',
    ordSimul: '観測：A と B は同時',
    restFrame: '静止 0c',
    preSpace: '光円錐外 (反転)',
    preLight: '光円錐面 (c)',
    preTime: '未来光円錐 (固定)',
    restartBigBang: '↺ 特異点へ戻る',
    backGallery: '← 作品一覧へ',
  },
  en: {
    backHome: '← hect0x7',
    themeDark: 'Deep',
    themeLight: 'Print',
    staticFallback: 'Static reading mode (WebGL unavailable). Scroll down to read all four chapters.',

    ch0Title: 'Spacetime Fabric: <em>Big Bang to Light Cone</em>',
    ch0Lead: 'Everything began with a quantum whisper. Slide time across the optical-glass expansion bell to watch space itself pull galaxies apart while WMAP reads the 13.8-billion-year-old afterglow.',
    ep0: '10⁻³²s Inflation',
    ep1: '380 kyr CMB',
    ep2: '400 Myr Stars',
    ep3: '13.8 Gyr Today',
    mScale: 'Scale',
    replayInflation: '↺ Replay Inflation',
    scrollDive: 'Scroll down into deep space ↓',

    ch1Title: 'Mass bends spacetime;<br>one launch carves <em>two fates</em>.',
    ch1Lead: 'Release identical particles into the gravity funnel: Newtonian gravity closes a quiet blue ellipse, while General Relativity weaves an open vermilion-gold rosette.',
    legNewton: 'Newtonian Ellipse',
    legGr: 'GR Precession',
    perOrbit: 'orbit',
    lblRelStr: 'Curvature',
    fireOrbit: '✦ Launch Again',
    emitWave: '◎ G-Wave',

    ch2Title: 'When a galaxy stands<br>before <em>distant light</em>.',
    ch2Lead: 'Drift the foreground lens across the center deep field. Light splits into upright and mirror-inverted twins—and snaps into a 360° Einstein Ring upon alignment.',
    toggleParity: '◎ Show Mirror Twin',
    toggleParityOn: '● Hide Mirror Twin',
    snapRing: '◎ Align Ring',
    lensMassLabel: 'Lens Mass',
    kickerAlign: 'Align',
    parityIdle: 'Offset the lens gently to watch double images split and invert.',
    parityRing: 'Exact alignment: starlight closes into a 360° Einstein Ring.',
    paritySplit: 'Split twins: upright outer image, parity-flipped inner mirror.',

    ch3Title: 'Swap which moment came <em>first</em>.',
    ch3Lead: 'Light draws the border of causality. Slide observer velocity to tilt the simultaneity plane: outside the cone, order reverses across frames; inside the future cone, cause stays locked forever.',
    relSpacelike: 'Outside Cone · Order Reversible',
    relLightlike: 'Null Surface · Light Boundary',
    relTimelike: 'Inside Future Cone · Causality Locked',
    ordAFirst: 'Observer sees: A before B',
    ordBFirst: 'Observer sees: B before A',
    ordSimul: 'Observer sees: A & B simultaneous',
    restFrame: 'Rest 0c',
    preSpace: 'Outside Cone (Flip)',
    preLight: 'Null Edge (c)',
    preTime: 'Future Cone (Locked)',
    restartBigBang: '↺ Return to Singularity',
    backGallery: '← Back to Gallery',
  },
};

let lang = (() => {
  try { const s = localStorage.getItem('lang'); if (I18N[s]) return s; } catch (e) {}
  return 'zh';
})();
let theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
let activeChapter = 0;
let parityOn = false;
let stage = null;

const shell = $('#exhibitShell');
const canvas = $('#stageCanvas');
const bootCurtain = $('#bootCurtain');
const bootArc = $('#bootArc');
const railFill = $('#railFill');
const bands = [$('#act0'), $('#act1'), $('#act2'), $('#act3')];
const stickies = bands.map((b) => b.querySelector('.act-sticky'));

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
}

function applyI18n() {
  $$('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n');
    if (k === 'toggleParity') el.textContent = t(parityOn ? 'toggleParityOn' : 'toggleParity');
    else el.textContent = t(k);
  });
  $$('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  const railLabels = {
    zh: ['00 大爆炸', '01 广义相对论', '02 引力透镜', '03 时空光锥'],
    ja: ['00 ビッグバン', '01 一般相対論', '02 重力レンズ', '03 時空光円錐'],
    en: ['00 Big Bang', '01 General Relativity', '02 Gravitational Lensing', '03 Minkowski Light Cone'],
  };
  $$('#chapterTabs .rail-step').forEach((btn, i) => {
    btn.setAttribute('aria-label', (railLabels[lang] || railLabels.zh)[i]);
  });
  $$('[data-lang]').forEach((btn) => {
    const on = btn.getAttribute('data-lang') === lang;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  document.documentElement.lang = lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : 'zh-CN';
}

function applyTheme(next) {
  theme = next === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f1e7' : '#05060b');
  try { localStorage.setItem('theme', theme); } catch (e) {}
  $$('[data-theme-btn]').forEach((btn) => {
    const on = btn.getAttribute('data-theme-btn') === theme;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  if (stage) stage.setTheme(theme);
}

// ===== 连续滚动位置映射为 3D 纵深坐标 scrollF ∈ [0, 3] =====
let anchors = [0, 1, 2, 3];
function measureAnchors() {
  const vh = Math.max(1, window.innerHeight);
  anchors = bands.map((band, i) => {
    const top = band.offsetTop;
    const h = band.offsetHeight;
    if (i === 0) return 0;
    if (i === bands.length - 1) return Math.max(0, document.documentElement.scrollHeight - vh);
    return Math.max(0, top + (h - vh) * 0.5);
  });
}

function computeScrollF() {
  const y = window.scrollY;
  if (y <= anchors[0]) return 0;
  if (y >= anchors[3]) return 3;
  for (let i = 0; i < 3; i++) {
    if (y >= anchors[i] && y <= anchors[i + 1]) {
      const span = Math.max(1, anchors[i + 1] - anchors[i]);
      return i + (y - anchors[i]) / span;
    }
  }
  return 0;
}

function updateScrollVisuals(immediate = false) {
  const sf = computeScrollF();
  if (stage) stage.setScrollCoord(sf, immediate);

  const nearest = Math.max(0, Math.min(3, Math.round(sf)));
  if (nearest !== activeChapter) {
    activeChapter = nearest;
    shell.setAttribute('data-chapter', String(nearest));
    document.body.setAttribute('data-chapter', String(nearest));
    $$('#chapterTabs .rail-step').forEach((btn) => {
      const on = Number(btn.getAttribute('data-stop')) === nearest;
      btn.classList.toggle('is-active', on);
      if (on) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
  }

  if (railFill) railFill.style.height = `${(sf / 3) * 100}%`;

  // 文字层随纵深自然淡入淡出与轻微软视差（绝不生硬硬切）
  for (let i = 0; i < stickies.length; i++) {
    const d = sf - i;
    const dist = Math.abs(d);
    const op = Math.max(0, Math.min(1, 1 - Math.max(0, dist - 0.18) / 0.42));
    const ty = -d * 26;
    stickies[i].style.opacity = op.toFixed(3);
    stickies[i].style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
    stickies[i].style.visibility = op < 0.02 ? 'hidden' : 'visible';
  }
}

function scrollToChapter(idx, smooth = true) {
  const i = Math.max(0, Math.min(3, Math.round(Number(idx) || 0)));
  measureAnchors();
  const rm = document.documentElement.classList.contains('reduced-motion');
  window.scrollTo({ top: anchors[i], behavior: smooth && !rm ? 'smooth' : 'auto' });
}

window.addEventListener('scroll', () => updateScrollVisuals(false), { passive: true });
window.addEventListener('resize', () => { measureAnchors(); updateScrollVisuals(true); });

// ===== 鼠标空白处拖拽仅旋转/操控当前 3D 模型（绝不劫持滚轮与页面滚动） =====
let dragging = false;
let activePointerId = null;
let lastX = 0;
let lastY = 0;

function isInteractiveTarget(el) {
  return !!(el && el.closest('a, button, input, label, header, nav'));
}

function windowNdcFromEvent(e) {
  const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
  const ny = -(e.clientY / Math.max(window.innerHeight, 1)) * 2 + 1;
  return [nx, ny];
}

document.addEventListener('pointerdown', (e) => {
  if (!stage || document.documentElement.classList.contains('layout-static')) return;
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  if (isInteractiveTarget(e.target)) return;
  if (activePointerId !== null) return;
  e.preventDefault();
  try { window.getSelection && window.getSelection().removeAllRanges(); } catch (err) {}
  dragging = true;
  activePointerId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  document.body.classList.add('is-stage-dragging');
  if (stage) {
    stage.setDragging(true);
    if (activeChapter === 2) {
      const [nx, ny] = windowNdcFromEvent(e);
      stage.setPointer(nx, ny, true);
      stage.setManualLens(nx, ny);
    }
  }
});

window.addEventListener('pointermove', (e) => {
  if (!stage) return;
  if (activePointerId !== null && e.pointerId !== activePointerId) return;
  const [nx, ny] = windowNdcFromEvent(e);
  if (activeChapter === 2 && e.pointerType === 'mouse') {
    stage.setPointer(nx, ny, true);
    if (dragging) stage.setManualLens(nx, ny);
    return;
  }
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  stage.rotateOrbit(dx * 0.0082, dy * 0.0068);
});

function endDrag(e) {
  if (!dragging) return;
  if (e && e.pointerId != null && activePointerId !== null && e.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
  document.body.classList.remove('is-stage-dragging');
  if (stage) stage.setDragging(false);
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
window.addEventListener('blur', () => endDrag(null));

document.addEventListener('dblclick', (e) => {
  if (isInteractiveTarget(e.target) || !stage) return;
  if (activeChapter === 2) stage.snapLensCenter();
  else stage.resetOrbit();
});

// ===== 右缘纵深标尺、语言与主题 =====
$$('#chapterTabs .rail-step').forEach((btn) => {
  btn.addEventListener('click', () => scrollToChapter(Number(btn.getAttribute('data-stop')), true));
});
$$('[data-lang]').forEach((btn) => {
  btn.addEventListener('click', () => {
    lang = btn.getAttribute('data-lang');
    try { localStorage.setItem('lang', lang); } catch (e) {}
    applyI18n();
    syncTelemetry(true);
  });
});
$$('[data-theme-btn]').forEach((btn) => {
  btn.addEventListener('click', () => applyTheme(btn.getAttribute('data-theme-btn')));
});

// ===== Ch0：纪元裸线时间轴 =====
const epochSlider = $('#epochSlider');
epochSlider.addEventListener('input', () => {
  if (stage) stage.setEpoch(Number(epochSlider.value));
});
$$('.bare-tick[data-epoch]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const v = Number(btn.getAttribute('data-epoch'));
    epochSlider.value = String(v);
    if (stage) stage.setEpoch(v);
  });
});
$('#btnReplay0').addEventListener('click', () => {
  if (stage) stage.triggerReplay();
});

// ===== Ch1：广义相对论双轨发射与曲率 =====
const relStrengthSlider = $('#relStrengthSlider');
relStrengthSlider.addEventListener('input', () => {
  if (stage) stage.setRelStrength(Number(relStrengthSlider.value));
});
$('#btnFireOrbit').addEventListener('click', () => {
  if (stage) stage.fireOrbit(0.44, Number(relStrengthSlider.value));
});
$('#btnWave').addEventListener('click', () => {
  if (stage) stage.triggerGravitationalWave();
});

// ===== Ch2：引力透镜同源镜像与质量 =====
const btnParity = $('#btnParity');
btnParity.addEventListener('click', () => {
  parityOn = !parityOn;
  btnParity.setAttribute('aria-pressed', String(parityOn));
  btnParity.classList.toggle('is-accent', parityOn);
  btnParity.textContent = t(parityOn ? 'toggleParityOn' : 'toggleParity');
  if (stage) {
    stage.setShowParity(parityOn);
    if (parityOn) stage.setManualLens(0.18, 0.10);
  }
});
$('#btnSnapRing').addEventListener('click', () => {
  if (stage) stage.snapLensCenter();
});
$$('[data-mass]').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('[data-mass]').forEach((b) => b.classList.toggle('is-active', b === btn));
    if (stage) stage.setLensMass(Number(btn.getAttribute('data-mass')));
  });
});

// ===== Ch3：时空光锥洛伦兹助推 =====
const betaSlider = $('#betaSlider');
betaSlider.addEventListener('input', () => {
  if (stage) stage.setBeta(Number(betaSlider.value));
});
$('#btnZeroBeta').addEventListener('click', () => {
  betaSlider.value = '0';
  if (stage) stage.setBeta(0);
});
$$('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('[data-preset]').forEach((b) => b.classList.toggle('is-active', b === btn));
    if (stage) stage.setConePreset(btn.getAttribute('data-preset'));
  });
});
$('#btnRestartAll').addEventListener('click', () => {
  scrollToChapter(0, true);
  setTimeout(() => { if (stage) stage.triggerReplay(); }, 650);
});

// ===== 轻量遥测同步 =====
const prev = {};
function setText(id, val) {
  if (prev[id] === val) return;
  prev[id] = val;
  const el = $(id);
  if (el) el.textContent = val;
}

let wasReplaying = false;
function syncTelemetry(force = false) {
  if (force) Object.keys(prev).forEach((k) => { delete prev[k]; });
  if (!stage) return;
  const st = stage.getStatus();
  if (activeChapter === 0 && st.bigBang) {
    const b = st.bigBang;
    setText('#valAge', b.age);
    setText('#valScale', `${b.scaleFactor.toFixed(2)}×`);
    setText('#valDeltaT', `${b.deltaT >= 0 ? '+' : ''}${b.deltaT} μK`);
    if ((b.replaying || wasReplaying) && document.activeElement !== epochSlider) {
      epochSlider.value = b.epoch.toFixed(3);
    }
    wasReplaying = !!b.replaying;
  } else if (activeChapter === 1 && st.relativity) {
    const r = st.relativity;
    setText('#valShift', r.shiftDeg == null ? '—' : `+${r.shiftDeg.toFixed(1)}°`);
  } else if (activeChapter === 2 && st.lensing) {
    const l = st.lensing;
    setText('#valThetaE', `${l.einsteinArcsec.toFixed(2)}″`);
    setText('#valAlign', `${l.alignment}%`);
    const stateKey = l.alignment >= 90 ? 'parityRing' : (l.showParity ? 'paritySplit' : 'parityIdle');
    setText('#valParityState', t(stateKey));
  } else if (activeChapter === 3 && st.lightCone) {
    const c = st.lightCone;
    const fmt = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
    setText('#valBeta', `${fmt(c.beta)}c`);
    setText('#valTA', fmt(c.tA));
    setText('#valTB', fmt(c.tB));

    const banner = $('#verdictBanner');
    banner.classList.remove('is-spacelike', 'is-lightlike', 'is-timelike');
    banner.classList.add(`is-${c.relation}`);

    const relKey = c.relation === 'timelike' ? 'relTimelike' : c.relation === 'lightlike' ? 'relLightlike' : 'relSpacelike';
    const ordKey = c.order === 'a_first' ? 'ordAFirst' : c.order === 'b_first' ? 'ordBFirst' : 'ordSimul';
    setText('#verdictRelation', t(relKey));
    setText('#verdictOrder', t(ordKey));
  }
}

// ===== 启动引擎 =====
applyI18n();
applyTheme(theme);
measureAnchors();

const initialCh = (() => {
  const m = /[?&]ch=([0-3])/.exec(location.search);
  return m ? Number(m[1]) : 0;
})();

let telemetryTimer = 0;

function enterStaticFallback() {
  if (telemetryTimer) { clearInterval(telemetryTimer); telemetryTimer = 0; }
  stage = null;
  document.documentElement.classList.add('layout-static');
  bootCurtain.classList.add('is-done');
  $$('.hairline-range, .bare-tick, #btnReplay0, #btnFireOrbit, #btnWave, #btnParity, #btnSnapRing, #btnRestartAll').forEach((el) => {
    el.disabled = true;
  });
  if (initialCh > 0) scrollToChapter(initialCh, false);
  updateScrollVisuals(true);
}

const isStatic = document.documentElement.classList.contains('layout-static');
if (isStatic) {
  enterStaticFallback();
} else {
  const reduced = document.documentElement.classList.contains('reduced-motion');
  import('./scene.js?v=11')
    .then(({ createCosmicStage }) => {
      stage = createCosmicStage(canvas, {
        theme,
        reducedMotion: reduced,
        onProgress(p) {
          if (bootArc) bootArc.style.strokeDashoffset = String(289 * (1 - p));
        },
        onReady() {
          bootCurtain.classList.add('is-done');
          measureAnchors();
          if (initialCh > 0) scrollToChapter(initialCh, false);
          updateScrollVisuals(true);
          syncTelemetry(true);
        },
        onFail() {
          enterStaticFallback();
        },
      });
      if (stage) {
        telemetryTimer = setInterval(() => syncTelemetry(false), 85);
      }
    })
    .catch((err) => {
      console.warn('[cosmic-spacetime] scene module load failed:', err);
      enterStaticFallback();
    });
}

window.addEventListener('beforeunload', () => {
  if (telemetryTimer) clearInterval(telemetryTimer);
  if (stage && stage.destroy) stage.destroy();
});

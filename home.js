// home.js —— 首页滚动编排、指针交互，以及与 home3d/ WebGL 引擎的对接。
// 数据来自 works.js 的全局 WORKS；works.js 在语言/主题变化时派发 home:render / home:theme 事件。

const root = document.documentElement;
const reduced = root.classList.contains("reduced-motion");

const $ = (sel) => document.querySelector(sel);
const hero = $(".hero");
const heroPin = $(".hero-pin");
const heroTitle = $("#heroTitle");
const chart = $(".eclipse-chart");
const pulseButton = $(".eclipse-pulse");
const works = $("#works");
const worksPin = $(".works-pin");
const track = $("#workGrid");
const rail = $("#orbitRail");
const snaps = $("#orbitSnaps");
const about = $("#about");
const nowEl = $("#orbitNow");

const N = WORKS.length;
works.style.setProperty("--n", N);

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const pad2 = (n) => String(n).padStart(2, "0");
const isStatic = () => root.classList.contains("layout-static");

// 100svh 的像素值：区段高度与吸附点都按 svh 计算，避免移动端地址栏伸缩造成抖动
const svhProbe = document.createElement("div");
svhProbe.style.cssText = "position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
document.body.appendChild(svhProbe);

const st = {
  vw: innerWidth,
  svh: innerHeight,
  max: 1,
  heroH: 0,
  worksTop: 0,
  worksH: 0,
  aboutTop: 0,
  cardW: 360,
  pos: 0,
  posTarget: 0,
  enter: 0,
  leave: 0,
  e: 0,
  center: -1,
  hovered: -1,
  focused: -1,
  staticNearest: -1,
  active: -2,
  lastY: -1,
  dirty: true,
  raf: 0,
  lastT: 0,
};

let items = [];
let cards = [];
let engine = null;
let failed = false;

/* ---------------- 结构与度量 ---------------- */

function collect() {
  items = Array.from(track.querySelectorAll(".orbit-item"));
  cards = items.map((li) => li.querySelector(".work-card"));
  snaps.innerHTML = Array.from({ length: N }, (_, i) => `<i style="--i:${i}"></i>`).join("");
  if (isStatic()) clearOrbitStyles();
  st.active = -2;
  st.center = -1;
  st.dirty = true;
}

function clearOrbitStyles() {
  items.forEach((li) => {
    li.style.transform = "";
    li.style.opacity = "";
    li.style.zIndex = "";
    li.style.pointerEvents = "";
    li.style.removeProperty("--dim");
    li.style.removeProperty("--card-op");
    li.classList.remove("is-center");
  });
}

function measureChars() {
  if (reduced || !heroTitle) return;
  heroPin.style.setProperty("--e", "0");
  const pin = heroPin.getBoundingClientRect();
  const lens = chart.getBoundingClientRect();
  const cx = lens.left + lens.width / 2;
  const cy = lens.top + lens.height / 2;
  heroTitle.querySelectorAll(".ch").forEach((ch) => {
    const r = ch.getBoundingClientRect();
    ch.style.setProperty("--dx", clamp((r.left + r.width / 2 - cx) / pin.width, -0.6, 0.6).toFixed(3));
    ch.style.setProperty("--dy", clamp((r.top + r.height / 2 - cy) / pin.height, -0.6, 0.6).toFixed(3));
  });
  heroPin.style.setProperty("--e", st.e.toFixed(4));
}

function measure() {
  const sy = scrollY;
  st.vw = innerWidth;
  st.svh = svhProbe.offsetHeight || innerHeight;
  st.heroH = hero.offsetHeight;
  st.worksTop = works.getBoundingClientRect().top + sy;
  st.worksH = works.offsetHeight;
  st.aboutTop = about.getBoundingClientRect().top + sy;
  st.max = Math.max(1, root.scrollHeight - innerHeight);
  st.cardW = items[0] ? items[0].offsetWidth : 360;
  measureChars();
  sendSections();
  st.lastY = -1; // 强制下一帧刷新滚动派生值
  st.dirty = true;
}

function sendSections() {
  if (!engine) return;
  const pin = heroPin.getBoundingClientRect();
  const lens = chart.getBoundingClientRect();
  engine.setHeroAim(
    (lens.left + lens.width / 2 - pin.left) / pin.width,
    (lens.top + lens.height / 2 - pin.top) / pin.height,
  );
  const P = (y) => clamp(y / st.max);
  const heroSpan = isStatic() ? st.svh * 0.35 : Math.max(0, st.heroH - st.svh);
  const heroEnd = P(heroSpan);
  const worksA = Math.max(heroEnd, P(st.worksTop - (isStatic() ? st.svh * 0.25 : 0)));
  const worksB = Math.max(worksA, P(st.worksTop + st.worksH - st.svh));
  const aboutA = Math.max(worksB, P(st.aboutTop - (isStatic() ? st.svh * 0.2 : 0)));
  engine.setSections({ hero: [0, heroEnd], works: [worksA, worksB], about: [aboutA, 1] });
}

/* ---------------- 滚动派生 ---------------- */

function onScrollChange(y) {
  const p = clamp(y / st.max);
  root.style.setProperty("--p", p.toFixed(4));
  // hero 段内保持页头透明，镜头穿出后再加底色
  const headerAt = isStatic() ? st.svh * 0.6 : Math.max(8, st.heroH - st.svh * 1.1);
  root.classList.toggle("is-scrolled", y > headerAt);
  if (engine) engine.setScroll(p);

  if (!reduced) {
    const range = isStatic() ? st.svh * 0.9 : Math.max(1, st.heroH - st.svh);
    const e = clamp(y / range);
    if (Math.abs(e - st.e) > 0.0001 || e === 0 || e === 1) {
      st.e = e;
      heroPin.style.setProperty("--e", e.toFixed(4));
      heroPin.classList.toggle("hero-departing", e > 0.35);
    }
  }
  if (isStatic()) {
    st.staticNearest = nearestStaticCard();
    return;
  }
  const rel = y - st.worksTop;
  st.enter = clamp((rel + st.svh) / st.svh);
  st.leave = clamp((rel - (st.worksH - st.svh)) / (0.6 * st.svh));
  st.posTarget = clamp((rel - 0.2 * st.svh) / (0.7 * st.svh), 0, N - 1);
  worksPin.style.setProperty("--enter", st.enter.toFixed(4));
  worksPin.style.setProperty("--leave", st.leave.toFixed(4));
  if (reduced) st.pos = st.posTarget;
  st.dirty = true;
}

function nearestStaticCard() {
  const vh = innerHeight;
  const wr = works.getBoundingClientRect();
  if (wr.bottom < vh * 0.3 || wr.top > vh * 0.7) return -1;
  let best = -1;
  let bestD = Infinity;
  cards.forEach((card, i) => {
    const r = card.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const d = Math.abs(r.top + r.height / 2 - vh / 2);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/* ---------------- 轨道排布 ---------------- */

function layoutOrbit() {
  const narrow = st.vw <= 720;
  const W = st.cardW;
  const R = W * (narrow ? 1.95 : 2.65);
  const step = narrow ? 33 : 30; // 相邻卡片的轨道夹角（度）
  const rise = narrow ? 18 : 26; // 螺旋抬升（px / 卡）
  const enterZ = (1 - st.enter) * -900;
  const enterPitch = 4 + (1 - st.enter) * 18;
  const leaveY = st.leave * -18 * (st.svh / 100);
  const stageOp = clamp(1 - st.leave * 1.2);
  items.forEach((li, i) => {
    const d = i - st.pos;
    const ad = Math.abs(d);
    const deg = d * step;
    const a = (deg * Math.PI) / 180;
    const x = Math.sin(a) * R;
    const z = (Math.cos(a) - 1) * R - ad * (narrow ? 95 : 155) + enterZ;
    const yv = d * rise + leaveY;
    const s = 0.87 + Math.max(0, 1 - ad * 0.9) * 0.19;
    const op = clamp((1.67 - ad) / 0.92) * stageOp;
    li.style.transform =
      `perspective(1500px) translate3d(${x.toFixed(1)}px, ${yv.toFixed(1)}px, ${z.toFixed(1)}px) ` +
      `rotateX(${enterPitch.toFixed(2)}deg) rotateY(${deg.toFixed(2)}deg) scale(${s.toFixed(4)}) translate(-50%, -50%)`;
    li.style.zIndex = String(100 - Math.round(ad * 10));
    li.style.pointerEvents = op < 0.3 ? "none" : "";
    li.style.setProperty("--dim", Math.min(1, ad).toFixed(3));
    li.style.setProperty("--card-op", op.toFixed(3));
    li.classList.toggle("is-center", ad < 0.18);
  });
  const center = Math.round(st.pos);
  if (center !== st.center) {
    st.center = center;
    if (nowEl) nowEl.textContent = pad2(center + 1);
    rail.querySelectorAll(".rail-dot").forEach((b, i) => {
      if (i === center) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
  }
}

/* ---------------- 激活作品 ---------------- */

function updateActive() {
  let idx = -1;
  if (st.hovered >= 0) idx = st.hovered;
  else if (st.focused >= 0) idx = st.focused;
  else if (isStatic()) idx = st.staticNearest;
  else if (st.enter > 0.55 && st.leave < 0.5) idx = Math.round(st.pos);
  if (idx === st.active) return;
  st.active = idx;
  cards.forEach((c, i) => c.classList.toggle("is-active", i === idx));
  if (engine) engine.setActiveWork(idx);
}

/* ---------------- 主循环（按需 rAF，静止零空转） ---------------- */

function frame(t) {
  st.raf = 0;
  if (document.hidden) return;
  const dt = st.lastT ? Math.min(0.05, (t - st.lastT) / 1000) : 1 / 60;
  st.lastT = t;

  const y = scrollY;
  if (y !== st.lastY) {
    st.lastY = y;
    onScrollChange(y);
  }

  if (!isStatic()) {
    const diff = st.posTarget - st.pos;
    if (diff !== 0) {
      st.pos = Math.abs(diff) < 0.002 ? st.posTarget : st.pos + diff * (1 - Math.exp(-dt * 11));
      st.dirty = true;
    }
    if (st.dirty) layoutOrbit();
  }
  updateActive();
  st.dirty = false;

  if (scrollY !== st.lastY || (!isStatic() && st.pos !== st.posTarget) || st.dirty) {
    st.raf = requestAnimationFrame(frame);
  } else {
    st.lastT = 0;
  }
}

function start() {
  if (!st.raf && !document.hidden) {
    st.lastT = 0;
    st.raf = requestAnimationFrame(frame);
  }
}

function stop() {
  if (st.raf) {
    cancelAnimationFrame(st.raf);
    st.raf = 0;
  }
  st.lastT = 0;
}

/* ---------------- 交互 ---------------- */

function scrollToWork(i, smooth = true) {
  const behavior = smooth && !reduced ? "smooth" : "auto";
  if (isStatic()) {
    if (cards[i]) cards[i].scrollIntoView({ block: "center", behavior });
    return;
  }
  window.scrollTo({ top: st.worksTop + st.svh * (0.2 + i * 0.7), behavior });
}

const indexOf = (el) => {
  const card = el && el.closest ? el.closest(".work-card") : null;
  return card ? Number(card.dataset.index) : -1;
};

function resetTilt(card) {
  const body = card.querySelector(".card-body");
  card.classList.remove("is-tilting");
  body.style.removeProperty("--rx");
  body.style.removeProperty("--ry");
}

track.addEventListener("pointerover", (e) => {
  if (e.pointerType !== "mouse") return;
  const i = indexOf(e.target);
  if (i >= 0 && st.hovered !== i) {
    st.hovered = i;
    start();
  }
});

track.addEventListener("pointerout", (e) => {
  if (e.pointerType !== "mouse") return;
  const from = e.target.closest(".work-card");
  if (!from || (e.relatedTarget && from.contains(e.relatedTarget))) return;
  resetTilt(from);
  if (st.hovered === Number(from.dataset.index)) {
    st.hovered = -1;
    start();
  }
});

track.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const card = e.target.closest(".work-card");
  if (!card) return;
  const r = card.getBoundingClientRect();
  const px = clamp((e.clientX - r.left) / r.width);
  const py = clamp((e.clientY - r.top) / r.height);
  const body = card.querySelector(".card-body");
  body.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
  body.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
  if (reduced || isStatic()) return;
  card.classList.add("is-tilting");
  body.style.setProperty("--rx", `${((0.5 - py) * 12).toFixed(2)}deg`);
  body.style.setProperty("--ry", `${((px - 0.5) * 16).toFixed(2)}deg`);
});

track.addEventListener("focusin", (e) => {
  const i = indexOf(e.target);
  if (i < 0) return;
  if (st.focused !== i) {
    st.focused = i;
    start();
  }
  // 键盘聚焦时把该卡片转到轨道中央
  if (!isStatic() && e.target.matches(":focus-visible")) scrollToWork(i);
});

track.addEventListener("focusout", (e) => {
  if (!e.relatedTarget || !track.contains(e.relatedTarget)) {
    if (st.focused !== -1) {
      st.focused = -1;
      start();
    }
  }
});

rail.addEventListener("click", (e) => {
  const btn = e.target.closest(".rail-dot");
  if (btn) scrollToWork(Number(btn.dataset.index));
});

document.addEventListener("keydown", (e) => {
  if (isStatic() || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (e.target.closest("input, select, textarea, [contenteditable]")) return;
  if (!works.contains(e.target) && (scrollY < st.worksTop || scrollY >= st.worksTop + st.worksH - st.svh * 0.8)) return;
  const current = Math.round(st.posTarget);
  const next = clamp(current + (e.key === "ArrowRight" ? 1 : -1), 0, N - 1);
  e.preventDefault();
  if (next === current) return;
  if (track.contains(e.target)) cards[next].focus({ preventScroll: true });
  else if (rail.contains(e.target)) rail.querySelectorAll(".rail-dot")[next].focus({ preventScroll: true });
  scrollToWork(next);
});

window.addEventListener("scroll", start, { passive: true });

// 指针 → 引擎（GL 约定：右、上为正）
const norm = (e) => [(e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2];

window.addEventListener("pointermove", (e) => {
  if (!engine) return;
  const [nx, ny] = norm(e);
  engine.setPointer(nx, ny);
}, { passive: true });

window.addEventListener("pointerdown", (e) => {
  if (!engine || e.button > 0) return;
  if (e.target.closest("a, button, input, select, textarea, label")) return;
  const [nx, ny] = norm(e);
  engine.pulse(nx, ny);
}, { passive: true });

let pulseTimer = 0;
pulseButton.addEventListener("click", () => {
  if (!engine) return;
  const lens = chart.getBoundingClientRect();
  const [nx, ny] = norm({ clientX: lens.left + lens.width / 2, clientY: lens.top + lens.height / 2 });
  engine.pulse(nx, ny);
  pulseButton.classList.add("is-firing");
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => pulseButton.classList.remove("is-firing"), 500);
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    measure();
    if (engine) engine.resize();
    start();
  }, 120);
});

document.addEventListener("visibilitychange", () => {
  if (engine) engine.setPaused(document.hidden);
  if (document.hidden) stop();
  else {
    st.dirty = true;
    start();
  }
});

document.addEventListener("home:theme", (e) => {
  if (engine) engine.setTheme(e.detail.theme);
});

document.addEventListener("home:render", () => {
  collect();
  measure();
  start();
  setTimeout(measureChars, 1600); // 入场动画结束后重测字符位置
});

/* ---------------- 引擎 ---------------- */

function readingAnchor() {
  const y = scrollY;
  if (y < 8) return null;
  if (y < st.worksTop - st.svh * 0.5) return { sec: "hero" };
  if (y < st.aboutTop - st.svh * 0.5) return { sec: "works", i: isStatic() ? Math.max(0, st.staticNearest) : Math.round(st.pos) };
  return { sec: "about" };
}

function degrade(err) {
  if (failed) return;
  failed = true;
  console.warn("[home] WebGL 引擎不可用，已切换为静态版式：", err);
  const old = engine;
  engine = null;
  const anchor = readingAnchor();
  root.classList.remove("gl-ready");
  root.classList.add("no-gl", "layout-static");
  clearOrbitStyles();
  measure();
  start();
  if (anchor) {
    if (anchor.sec === "hero") window.scrollTo({ top: 0, behavior: "auto" });
    else if (anchor.sec === "works") scrollToWork(anchor.i, false);
    else about.scrollIntoView({ block: "start", behavior: "auto" });
  }
  if (old) {
    try { old.destroy(); } catch (destroyErr) { console.warn("[home] destroy 异常：", destroyErr); }
  }
}

async function bootEngine() {
  if (root.classList.contains("no-gl")) return;
  let mod;
  try {
    mod = await import("./home3d/engine.js");
  } catch (err) {
    degrade(err);
    return;
  }
  let instance;
  try {
    instance = mod.createHome3D(document.getElementById("cosmos"), {
      works: WORKS.map((w) => ({ slug: w.slug, cover: w.cover })),
      theme: resolveTheme(root.dataset.theme),
      reducedMotion: reduced,
      onReady: () => {
        if (!failed) root.classList.add("gl-ready");
      },
      onFail: (err) => degrade(err),
    });
  } catch (err) {
    degrade(err);
    return;
  }
  if (failed) {
    // onFail 在构造期间被同步调用
    if (instance) {
      try { instance.destroy(); } catch (destroyErr) { console.warn("[home] destroy 异常：", destroyErr); }
    }
    return;
  }
  engine = instance;
  sendSections();
  engine.setScroll(clamp(scrollY / st.max));
  st.active = -2; // 唤醒一帧重新下发激活作品
  start();
  if (document.hidden) engine.setPaused(true);
}

/* ---------------- 启动 ---------------- */

collect();
measure();
start();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    measure();
    start();
  });
}
window.addEventListener("load", () => {
  measure();
  start();
});
setTimeout(measureChars, 1600);
bootEngine();

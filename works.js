// 作品清单 —— 加新作品只需在这里加一项。
// title / desc / tags 支持三语言：{ zh, ja, en }
// cover 是相对路径；每个作品的 index.html 放在 works/<slug>/ 下。
const WORKS = [
  {
    slug: "sakura-momiji-flag",
    year: "2026",
    cover: "works/sakura-momiji-flag/assets/hero-two-seasons.webp",
    title: {
      zh: "花与叶之间 · 日本之红",
      ja: "花と葉のあいだ · 日本の赤",
      en: "Between Flower and Leaf · Japan's Red",
    },
    desc: {
      zh: "樱花落成春风的白，红叶聚成中央的太阳 —— 一个关于两个季节、一面旗帜的视觉叙事页面。",
      ja: "桜は春風の白に、紅葉は中央の太陽に —— 二つの季節と一面の旗をめぐる視覚的な物語。",
      en: "Cherry blossoms fade into spring's white, autumn leaves gather into a central sun — a visual story of two seasons and one flag.",
    },
    tags: {
      zh: ["视觉", "交互", "多语言"],
      ja: ["ビジュアル", "インタラクション", "多言語"],
      en: ["Visual", "Interactive", "Multilingual"],
    },
  },
  // 下一个作品照这个格式往下加即可。
];

// 页面静态文案的三语言字典。
const I18N = {
  zh: {
    navWorks: "作品",
    navAbout: "关于",
    eyebrow: "PORTFOLIO / 作品集",
    heroTitle: "我用代码<br>做了一些<em>小东西</em>。",
    heroLead: "从视觉实验到实用工具，这里收集我在闲暇时写下的作品。",
    scroll: "向下浏览",
    worksTitle: "作品",
    aboutTitle: "关于",
    aboutBody:
      '你好，我是 hect0x7。这个站点用来存放我做的一些实验性作品，大多是纯前端的小页面。欢迎在 <a href="https://github.com/hect0x7" target="_blank" rel="noopener">GitHub</a> 上找到我。',
    toTop: "回到顶部 ↑",
  },
  ja: {
    navWorks: "作品",
    navAbout: "について",
    eyebrow: "PORTFOLIO / 作品集",
    heroTitle: "コードで<br><em>小さなもの</em>を作っています。",
    heroLead: "ビジュアル実験から実用ツールまで、暇なときに書いた作品を集めています。",
    scroll: "下へスクロール",
    worksTitle: "作品",
    aboutTitle: "について",
    aboutBody:
      'こんにちは、hect0x7 です。このサイトには実験的な作品を置いています。ほとんどがフロントエンドだけの小さなページです。<a href="https://github.com/hect0x7" target="_blank" rel="noopener">GitHub</a> でも見つけられます。',
    toTop: "トップへ ↑",
  },
  en: {
    navWorks: "Works",
    navAbout: "About",
    eyebrow: "PORTFOLIO",
    heroTitle: "I build <em>little things</em><br>with code.",
    heroLead: "From visual experiments to handy tools, a collection of things I make in my spare time.",
    scroll: "Scroll down",
    worksTitle: "Works",
    aboutTitle: "About",
    aboutBody:
      'Hi, I\'m hect0x7. This site holds some of my experimental works — mostly small front-end pages. You can also find me on <a href="https://github.com/hect0x7" target="_blank" rel="noopener">GitHub</a>.',
    toTop: "Back to top ↑",
  },
};

const HTML_LANG = { zh: "zh-CN", ja: "ja", en: "en" };

const grid = document.getElementById("workGrid");

function renderWorks(lang) {
  grid.innerHTML = WORKS.map((w, i) => `
    <a class="work-card" href="works/${w.slug}/" style="--i:${i}">
      <div class="work-cover">
        <img src="${w.cover}" alt="${w.title[lang]}" loading="lazy">
      </div>
      <div class="work-meta">
        <span class="work-year">${w.year}</span>
        <h3>${w.title[lang]}</h3>
        <p>${w.desc[lang]}</p>
        <div class="work-tags">${w.tags[lang].map((t) => `<span>${t}</span>`).join("")}</div>
      </div>
    </a>
  `).join("");
}

function applyLang(lang) {
  const dict = I18N[lang] || I18N.zh;
  document.documentElement.lang = HTML_LANG[lang] || "zh-CN";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] != null) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (dict[key] != null) el.innerHTML = dict[key];
  });

  document.querySelectorAll(".languages button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  renderWorks(lang);
  try { localStorage.setItem("lang", lang); } catch (e) {}
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.querySelector(".theme-toggle");
  if (toggle) toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#14110d" : "#faf8f3");
  try { localStorage.setItem("theme", theme); } catch (e) {}
}

// 初始化语言：localStorage → 浏览器语言 → 中文
function initLang() {
  let lang;
  try { lang = localStorage.getItem("lang"); } catch (e) {}
  if (!lang) {
    const nav = (navigator.language || "zh").toLowerCase();
    if (nav.startsWith("ja")) lang = "ja";
    else if (nav.startsWith("en")) lang = "en";
    else lang = "zh";
  }
  return I18N[lang] ? lang : "zh";
}

// 初始化主题：localStorage → 系统偏好 → 白天
function initTheme() {
  let theme;
  try { theme = localStorage.getItem("theme"); } catch (e) {}
  if (!theme) {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

document.querySelectorAll(".languages button").forEach((btn) => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang));
});

const themeToggle = document.querySelector(".theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

applyLang(initLang());
applyTheme(initTheme());
document.getElementById("year").textContent = new Date().getFullYear();

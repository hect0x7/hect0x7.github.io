// 作品清单 —— 加新作品只需在这里加一项。
// title / desc / tags 支持三语言：{ zh, ja, en }
// cover 是相对路径；每个作品的 index.html 放在 works/<slug>/ 下。
const WORKS = [
  {
    slug: "sakura-momiji-flag",
    year: "2026",
    featured: true,
    cover: "works/sakura-momiji-flag/assets/hero-two-seasons.webp",
    title: {
      zh: "花落为素，叶燃成日",
      ja: "花は白となり、葉は日を燃やす",
      en: "Blossoms Fall to White, Leaves Burn into Sun",
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
  {
    slug: "sakura-outfit-guide",
    year: "2026",
    cover: "works/sakura-outfit-guide/assets/hero_dual.webp",
    title: {
      zh: "春樱穿搭指南",
      ja: "春桜のスタイルガイド",
      en: "Spring Sakura Style Guide",
    },
    desc: {
      zh: "男士与女士双版本，从气候、叠穿到赏樱行程，用视觉化 Lookbook 整理日本春日穿搭。",
      ja: "メンズとレディースの二つの視点で、レイヤードから花見ルートまで春の装いをまとめたビジュアルガイド。",
      en: "A dual men's and women's visual guide to spring layering, accessories, and cherry-blossom itineraries across Japan.",
    },
    tags: {
      zh: ["双版本", "穿搭", "旅行"],
      ja: ["二つのスタイル", "ファッション", "旅行"],
      en: ["Dual Edition", "Style", "Travel"],
    },
  },
  {
    slug: "momiji-style-guide",
    year: "2026",
    cover: "works/momiji-style-guide/assets/hero-v4.webp",
    title: {
      zh: "紅葉季の穿搭手帖",
      ja: "紅葉のスタイル手帖",
      en: "Autumn Leaves Style Guide",
    },
    desc: {
      zh: "从京都古寺到北海道山野，以地区、色彩与温度整理一份日本红叶季旅行穿搭指南。",
      ja: "京都の古寺から北海道の山野まで、地域・色・気温でたどる紅葉旅のスタイルガイド。",
      en: "A travel wardrobe guide to Japan's autumn leaves, shaped by region, color, and temperature.",
    },
    tags: {
      zh: ["时尚", "旅行", "多语言"],
      ja: ["ファッション", "旅", "多言語"],
      en: ["Fashion", "Travel", "Multilingual"],
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
    featuredWork: "推荐作品",
    featuredBadge: "推荐",
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
    featuredWork: "おすすめ作品",
    featuredBadge: "おすすめ",
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
    featuredWork: "Featured work",
    featuredBadge: "Featured",
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
        ${w.featured ? `
          <span class="work-featured" role="img" aria-label="${I18N[lang].featuredWork}" title="${I18N[lang].featuredWork}">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2.75l2.77 5.61 6.19.9-4.48 4.36 1.06 6.16L12 16.87l-5.54 2.91 1.06-6.16-4.48-4.36 6.19-.9L12 2.75z"/>
            </svg>
            <span>${I18N[lang].featuredBadge}</span>
          </span>` : ""}
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

const toTopButton = document.querySelector(".to-top");
if (toTopButton) {
  toTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

applyLang(initLang());
applyTheme(initTheme());
document.getElementById("year").textContent = new Date().getFullYear();

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
      zh: "樱花落白，红叶燃日——关于两个季节与一面旗帜的视觉叙事。",
      ja: "桜は白に、紅葉は太陽に——二つの季節と一面の旗の物語。",
      en: "Blossoms fade to white, leaves burn into sun — two seasons, one flag.",
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
      zh: "男士与女士双版本，用视觉化 Lookbook 整理日本春日穿搭。",
      ja: "メンズ・レディース両視点で春の装いをまとめた花見ガイド。",
      en: "Men's and women's spring lookbook for cherry-blossom trips in Japan.",
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
    cover: "works/momiji-style-guide/assets/hero-v5.webp",
    title: {
      zh: "紅葉季の穿搭手帖",
      ja: "紅葉のスタイル手帖",
      en: "Autumn Leaves Style Guide",
    },
    desc: {
      zh: "从京都到北海道，按地区、色彩与温度整理的日本红叶穿搭手帖。",
      ja: "京都から北海道まで、地域・色・気温でたどる紅葉スタイル手帖。",
      en: "Autumn travel wardrobe across Japan by region, palette, and climate.",
    },
    tags: {
      zh: ["穿搭", "旅行", "多语言"],
      ja: ["ファッション", "旅行", "多言語"],
      en: ["Style", "Travel", "Multilingual"],
    },
  },
  {
    slug: "jm-view-server",
    year: "2026",
    cover: "works/jm-view-server/cover.webp",
    title: {
      zh: "JM View Server 在线预览",
      ja: "JM View Server オンラインプレビュー",
      en: "JM View Server Live Preview",
    },
    desc: {
      zh: "远程文件管理与漫画双页阅读器预览，支持多视图与底片重排。",
      ja: "ファイル管理とマンガ見開き閲覧のオンラインプレビュー。",
      en: "Live preview of a file manager and double-page manga reader.",
    },
    tags: {
      zh: ["文件管理", "阅读器", "交互原型"],
      ja: ["ファイル管理", "ビューアー", "プロトタイプ"],
      en: ["File Manager", "Reader", "Prototype"],
    },
  },
  {
    slug: "cosmic-spacetime",
    year: "2026",
    cover: "works/cosmic-spacetime/cover.webp",
    title: {
      zh: "时空织物 · 从大爆炸到光锥",
      ja: "時空の織物 · ビッグバンから光円錐へ",
      en: "Fabric of Spacetime",
    },
    desc: {
      zh: "Three.js 宇宙叙事：大爆炸、相对论、引力透镜与时空光锥。",
      ja: "Three.js 宇宙ツアー：ビッグバン、相対論、重力レンズ、光円錐。",
      en: "Three.js cosmic tour: Big Bang, relativity, lensing, and light cones.",
    },
    tags: {
      zh: ["Three.js", "宇宙学", "交互实验"],
      ja: ["Three.js", "宇宙論", "インタラクティブ"],
      en: ["Three.js", "Cosmology", "Interactive"],
    },
  },
  // 下一个作品照这个格式往下加即可。
];

// 页面静态文案的三语言字典。
const I18N = {
  zh: {
    pageTitle: "hect0x7 · 作品集",
    skip: "跳到作品",
    navWorks: "作品",
    navAbout: "关于",
    themeLabel: "外观",
    themeAuto: "自动",
    themeDark: "夜间",
    themeLight: "浅色",
    eyebrow: "PORTFOLIO / 作品集",
    sunLabel: "赤日奇点",
    heroTitle: "我 Vibe 了<br>一些<em>小作品</em>。",
    heroLead: "从视觉实验到实用工具，这里收集我在闲暇时写下的作品。",
    scroll: "探索作品",
    autoplayStart: "自动播放",
    autoplayPlaying: "自动巡览中",
    autoplayPaused: "已暂停",
    autoplayEnded: "巡览完成",
    heroIndexTitle: "精选目录 · INDEX",
    worksTitle: "作品",
    worksHint: "滚动浏览作品，或用方向键切换。",
    railLabel: "作品导航",
    enterWork: "进入作品",
    featuredWork: "推荐作品",
    featuredBadge: "推荐",
    aboutTitle: "关于",
    aboutBody:
      '你好，我是 hect0x7。这个站点用来存放我 Vibe 的一些小作品，大多是纯前端页面。欢迎在 <a href="https://github.com/hect0x7" target="_blank" rel="noopener">GitHub</a> 上找到我。',
    metaWorks: "收录作品",
    metaLangs: "语言",
    toTop: "回到顶部 ↑",
  },
  ja: {
    pageTitle: "hect0x7 · 作品集",
    skip: "作品へスキップ",
    navWorks: "作品",
    navAbout: "について",
    themeLabel: "外観",
    themeAuto: "自動",
    themeDark: "夜",
    themeLight: "昼",
    eyebrow: "PORTFOLIO / 作品集",
    sunLabel: "赤日特異点",
    heroTitle: "Vibeして、<br><em>小さな作品</em>を<br>いくつか作っています。",
    heroLead: "ビジュアル実験から実用ツールまで、暇なときに書いた作品を集めています。",
    scroll: "作品を見る",
    autoplayStart: "自動再生",
    autoplayPlaying: "自動再生中",
    autoplayPaused: "一時停止",
    autoplayEnded: "再生完了",
    heroIndexTitle: "収録一覧 · INDEX",
    worksTitle: "作品",
    worksHint: "スクロールか矢印キーで作品を切り替え。",
    railLabel: "作品ナビゲーション",
    enterWork: "作品を開く",
    featuredWork: "おすすめ作品",
    featuredBadge: "おすすめ",
    aboutTitle: "について",
    aboutBody:
      'こんにちは、hect0x7 です。このサイトには Vibeして作った小さな作品をいくつか置いています。ほとんどがフロントエンドのページです。<a href="https://github.com/hect0x7" target="_blank" rel="noopener">GitHub</a> でも見つけられます。',
    metaWorks: "収録作品",
    metaLangs: "言語",
    toTop: "トップへ ↑",
  },
  en: {
    pageTitle: "hect0x7 · Portfolio",
    skip: "Skip to works",
    navWorks: "Works",
    navAbout: "About",
    themeLabel: "Appearance",
    themeAuto: "Auto",
    themeDark: "Dark",
    themeLight: "Light",
    eyebrow: "PORTFOLIO",
    sunLabel: "Crimson Singularity",
    heroTitle: "I vibe-coded <br>a few <em>small works</em>.",
    heroLead: "From visual experiments to handy tools, a collection of things I make in my spare time.",
    scroll: "Explore works",
    autoplayStart: "Autoplay",
    autoplayPlaying: "Playing",
    autoplayPaused: "Paused",
    autoplayEnded: "Finished",
    heroIndexTitle: "SELECTED INDEX",
    worksTitle: "Works",
    worksHint: "Scroll or use the arrow keys to browse.",
    railLabel: "Works navigation",
    enterWork: "Open work",
    featuredWork: "Featured work",
    featuredBadge: "Featured",
    aboutTitle: "About",
    aboutBody:
      'Hi, I\'m hect0x7. This site holds a few small works I vibe-coded, mostly front-end pages. You can also find me on <a href="https://github.com/hect0x7" target="_blank" rel="noopener">GitHub</a>.',
    metaWorks: "Works",
    metaLangs: "Languages",
    toTop: "Back to top ↑",
  },
};

const HTML_LANG = { zh: "zh-CN", ja: "ja", en: "en" };

const grid = document.getElementById("workGrid");
const rail = document.getElementById("orbitRail");
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const themeOptions = document.querySelectorAll("[data-theme-choice]");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function renderWorks(lang) {
  const dict = I18N[lang];
  grid.innerHTML = WORKS.map((w, i) => `
    <li class="orbit-item" style="--i:${i}">
      <a class="work-card" href="works/${w.slug}/" data-index="${i}">
        <div class="card-body">
          <div class="work-cover">
            <img src="${w.cover}" alt="${w.title[lang]}" loading="lazy" decoding="async">
            ${w.featured ? `
              <span class="work-featured" role="img" aria-label="${dict.featuredWork}" title="${dict.featuredWork}">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 2.75l2.77 5.61 6.19.9-4.48 4.36 1.06 6.16L12 16.87l-5.54 2.91 1.06-6.16-4.48-4.36 6.19-.9L12 2.75z"/>
                </svg>
                <span>${dict.featuredBadge}</span>
              </span>` : ""}
          </div>
          <div class="work-meta">
            <div class="work-line"><span class="work-no">${pad2(i + 1)}</span><span class="work-year">${w.year}</span></div>
            <h3>${w.title[lang]}</h3>
            <p>${w.desc[lang]}</p>
            <div class="work-tags">${w.tags[lang].map((t) => `<span>${t}</span>`).join("")}</div>
            <span class="work-enter" aria-hidden="true">${dict.enterWork}<i></i></span>
          </div>
          <span class="card-gloss" aria-hidden="true"></span>
        </div>
      </a>
    </li>
  `).join("");

  if (rail) {
    rail.setAttribute("aria-label", dict.railLabel);
    rail.innerHTML = WORKS.map((w, i) => `
      <button type="button" class="rail-dot" data-index="${i}" aria-label="${pad2(i + 1)} ${w.title[lang]}">
        <span class="rail-no">${pad2(i + 1)}</span><span class="rail-title">${w.title[lang]}</span>
      </button>
    `).join("");
  }

  document.querySelectorAll("[data-works-count]").forEach((el) => {
    el.textContent = pad2(WORKS.length);
  });
}

// 把标题拆成逐字 span（拉丁单词整体不断行），用于遮罩入场与纵深退场动画。
const CJK_CHAR = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff01-\uff60\u3000-\u303f]/;
const CJK_CLOSING = /[、。，．！？：；）」』】〉》ー々]/;

function splitTitle(el) {
  const plain = el.textContent.replace(/\s+/g, " ").trim();
  if (plain) el.setAttribute("aria-label", plain);
  let index = 0;
  const makeChar = (text) => {
    const ch = document.createElement("span");
    ch.className = "ch";
    ch.style.setProperty("--d", index);
    // 伪随机纵深系数，保证每次渲染一致
    ch.style.setProperty("--z", (((index * 7919) % 97) / 97).toFixed(3));
    index += 1;
    ch.textContent = text;
    return ch;
  };
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        child.setAttribute("aria-hidden", "true");
        if (child.tagName !== "BR") walk(child);
        return;
      }
      if (child.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      const tokens = child.textContent.match(/\s+|[^\s]/gu) || [];
      let word = null;
      tokens.forEach((tok) => {
        if (/^\s+$/.test(tok)) {
          word = null;
          frag.appendChild(document.createTextNode(" "));
          return;
        }
        const isCjk = CJK_CHAR.test(tok);
        // CJK 每个字自成一组（句读并入前一组，避免行首标点）；拉丁字符连续成词
        const attach = word && (CJK_CLOSING.test(tok) || (!isCjk && word.dataset.cjk === "0"));
        if (!attach) {
          word = document.createElement("span");
          word.className = "w";
          word.setAttribute("aria-hidden", "true");
          word.dataset.cjk = isCjk ? "1" : "0";
          frag.appendChild(word);
        }
        word.appendChild(makeChar(tok));
      });
      child.replaceWith(frag);
    });
  };
  walk(el);
  el.style.setProperty("--chars", index);
  el.classList.remove("revealed");
  clearTimeout(splitTitle.timer);
  // 入场遮罩结束后放开 overflow，方便退场时字符飞出
  splitTitle.timer = setTimeout(() => el.classList.add("revealed"), 1300 + index * 38);
}

function applyLang(lang) {
  const dict = I18N[lang] || I18N.zh;
  document.documentElement.lang = HTML_LANG[lang] || "zh-CN";
  if (dict.pageTitle) document.title = dict.pageTitle;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] != null) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (dict[key] != null) el.innerHTML = dict[key];
  });
  document.querySelectorAll("[data-i18n-label]").forEach((el) => {
    el.setAttribute("aria-label", dict[el.dataset.i18nLabel]);
  });
  document.querySelectorAll("[data-split]").forEach(splitTitle);

  document.querySelectorAll(".languages button").forEach((btn) => {
    const on = btn.dataset.lang === lang;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });

  renderWorks(I18N[lang] ? lang : "zh");
  try { localStorage.setItem("lang", lang); } catch (e) {}
  document.dispatchEvent(new CustomEvent("home:render", { detail: { lang } }));
}

function resolveTheme(choice) {
  return choice === "auto" ? (systemTheme.matches ? "dark" : "light") : choice;
}

function applyTheme(choice) {
  const theme = resolveTheme(choice);
  document.documentElement.dataset.theme = choice;
  themeOptions.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice));
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#110c0a" : "#faf8f3");
  try { localStorage.setItem("theme", choice); } catch (e) {}
  document.dispatchEvent(new CustomEvent("home:theme", { detail: { theme } }));
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

document.querySelectorAll(".languages button").forEach((btn) => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang));
});

themeOptions.forEach((button) => {
  button.addEventListener("click", () => applyTheme(button.dataset.themeChoice));
});
systemTheme.addEventListener("change", () => {
  if (document.documentElement.dataset.theme === "auto") applyTheme("auto");
});

const toTopButton = document.querySelector(".to-top");
if (toTopButton) {
  toTopButton.addEventListener("click", () => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    const brand = document.querySelector(".brand");
    if (brand) brand.focus({ preventScroll: true });
  });
}

applyLang(initLang());
applyTheme(document.documentElement.dataset.theme);
document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealTargets = document.querySelectorAll('.manifesto h2,.manifesto-body,.season-card,.fusion-copy,.flag-stage,.closing h2');
revealTargets.forEach((element) => element.classList.add('reveal'));
const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) entry.target.classList.add('visible');
}), { threshold: .16 });
revealTargets.forEach((element) => observer.observe(element));

const heroArt = document.querySelector('.hero-art');
let parallaxFrame;
function updateHeroParallax() {
  parallaxFrame = undefined;
  if (reduceMotion || document.documentElement.classList.contains('motion-paused')) return;
  const progress = Math.min(scrollY / innerHeight, 1.4);
  heroArt.style.transform = `translateY(${progress * 38}px) rotate(${progress * 2}deg)`;
}
addEventListener('scroll', () => {
  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateHeroParallax);
}, { passive: true });
updateHeroParallax();

document.querySelector('.motion-toggle').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const paused = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(paused));
  document.documentElement.classList.toggle('motion-paused', paused);
  if (!paused) updateHeroParallax();
});

const zh = {
  navIdea: '构想', navCities: '城市', navFlag: '一面旗', motion: '缓动', eyebrow: '日本之红',
  heroTitle: '春日成花<br><em>秋日成叶</em>', heroLead: '樱花落在白色的风里，红叶聚成中央的太阳。<br>春与秋，共同完成一面季节的旗。', scroll: '向下观赏',
  conceptTitle: '一片白与一轮红，<br>藏着两次心动。', conceptP1: '白色并非空无：樱花在其中舒展，像春日的呼吸，也像所有尚未写下的可能。', conceptP2: '中央的红，则由秋日红叶汇聚而成。一个象征开始，一个象征圆满；一片留白，托起一轮燃烧的季节。',
  springCopy: '短暂，因此被珍惜。<br>柔软，因此让人靠近。', fromPetal: '从一片花瓣', toLeaf: '到一枚叶片', autumnCopy: '浓烈，却不喧哗。<br>告别，也可以灿烂。',
  citiesKicker: '季节落在城市，便有了各自的光', citiesTitle: '移步之间，<br>白与红各有去处。', citiesLead: '向前移动，让一座座城市依次显影。白是樱花本身，红是红叶本身。',
  actWhiteLabel: '第一幕 / 白', actWhiteTitle: '花不是背景，<br>而是城市的光。', actWhiteLead: '仙台、东京与弘前。樱花落下时，城市先学会安静。', actRedLabel: '第二幕 / 红', actRedTitle: '叶不是点缀，<br>而是时间的火。', actRedLead: '金泽、京都与奈良。红叶燃起时，城市开始收藏黄昏。',
  sendaiTitle: '仙台 · 白花的川', sendaiCopy: '河岸被近乎白色的花覆住，春天在水面上慢慢展开。', tokyoTitle: '东京 · 夜樱的白', tokyoCopy: '城市把灯光收低，让白色花冠悬在河道上方。', kanazawaTitle: '金泽 · 庭园的红', kanazawaCopy: '石灯笼守着沉默，红叶把整个庭园点亮。', kyotoTitle: '京都 · 时间的红', kyotoCopy: '木格窗与石径不语，红叶替时间燃烧。', hirosakiTitle: '弘前 · 城下的白', hirosakiCopy: '城墙之外，白色花瓣比雪更轻，也更接近春天。', naraTitle: '奈良 · 山径的红', naraCopy: '沿着石阶向上，红叶将安静的山寺染成暮色。',
  sendaiDot: '仙台', tokyoDot: '东京', kanazawaDot: '金泽', kyotoDot: '京都', hirosakiDot: '弘前', naraDot: '奈良',
  fusionKicker: '春与秋，最终相逢', fusionTitle: '一面旗<br>两种美。', fusionCopy: '白，是樱花漫游的春风。<br>红，是红叶汇聚的太阳。', flagCaption: '风吹过时，花瓣环抱着由红叶汇成的太阳。', closingTitle: '愿我们都能<br>在盛放时相遇，<br><em>在绚烂后从容。</em>', top: '回到顶部 ↑'
};
const ja = {
  ...zh, navIdea: '構想', navCities: '都市', navFlag: '一つの旗', motion: 'ゆらぎ', eyebrow: '日本の赤', heroTitle: '春は花となり<br><em>秋は葉となる</em>', heroLead: '桜は白い風に舞い、紅葉は中央の太陽となる。<br>春と秋が、季節の旗を完成させる。', scroll: '下へ', conceptTitle: '一面の白、一輪の赤。<br>二つのときめき。', conceptP1: '白は空白ではない。桜がそこに広がり、春の呼吸と、まだ書かれていない可能性になる。', conceptP2: '中央の赤は、秋の紅葉が集まって生まれる。始まりと円熟、余白と燃える季節が一つの旗に宿る。', springCopy: '儚いから、愛おしい。<br>やわらかいから、近づきたくなる。', fromPetal: '一枚の花びらから', toLeaf: '一枚の葉へ', autumnCopy: '鮮やかに、しかし静かに。<br>別れもまた、美しく燃える。', citiesKicker: '季節が街に降りると、それぞれの光になる。', citiesTitle: '歩くたび、<br>白と赤は居場所を変える。', citiesLead: '進むたびに、街が一つずつ現れる。白は桜そのもの、赤は紅葉そのもの。', sendaiTitle: '仙台 · 白い花の川', sendaiCopy: '川辺をほとんど白い花が覆い、春が水面にゆっくり広がる。', tokyoTitle: '東京 · 夜桜の白', tokyoCopy: '街が灯りを低くすると、白い花冠が川の上に浮かぶ。', kanazawaTitle: '金沢 · 庭の赤', kanazawaCopy: '石灯籠は黙り、紅葉が庭全体を灯す。', kyotoTitle: '京都 · 時間の赤', kyotoCopy: '格子窓と石畳は語らず、紅葉が時のために燃える。', hirosakiTitle: '弘前 · 城下の白', hirosakiCopy: '城壁の外で、白い花びらは雪より軽く、春に近い。', naraTitle: '奈良 · 山道の赤', naraCopy: '石段を上ると、紅葉が静かな山寺を夕暮れに染める。', sendaiDot: '仙台', tokyoDot: '東京', kanazawaDot: '金沢', kyotoDot: '京都', hirosakiDot: '弘前', naraDot: '奈良', fusionKicker: '春と秋、ついに出会う', fusionTitle: '一つの旗<br>二つの美。', fusionCopy: '白は、桜が遊ぶ春風。<br>赤は、紅葉が集う太陽。', flagCaption: '風が吹くと、花びらが紅葉の太陽を包み込む。', closingTitle: '咲くときに出会い、<br>燃えたあとも、<br><em>穏やかでありますように。</em>', top: 'トップへ ↑'
};
const en = {
  ...zh, navIdea: 'Concept', navCities: 'Cities', navFlag: 'The Flag', motion: 'Motion', eyebrow: 'The Red of Japan', heroTitle: 'Spring becomes blossom<br><em>Autumn becomes leaf</em>', heroLead: 'Sakura drifts through the white, while maple leaves gather into the central sun.<br>Spring and autumn complete a flag of seasons.', scroll: 'Explore', conceptTitle: 'A field of white, a circle of red—<br>two moments of wonder.', conceptP1: 'White is not emptiness. Sakura unfolds within it like the breath of spring, and like every possibility yet to be written.', conceptP2: 'The red at the center is formed by autumn maple leaves. One marks a beginning, one a fulfillment; open space holds a season aflame.', springCopy: 'Brief, and therefore treasured.<br>Gentle, and therefore inviting.', fromPetal: 'From one petal', toLeaf: 'to one leaf', autumnCopy: 'Vivid, yet never loud.<br>Even farewell can glow.', citiesKicker: 'When seasons touch a city, each finds its own light.', citiesTitle: 'With every step,<br>white and red find a new home.', citiesLead: 'Move forward and let each city appear in turn. White is the blossom itself; red is the maple leaf itself.', sendaiTitle: 'Sendai · A River of White', sendaiCopy: 'Nearly white blossoms cover the riverbank as spring slowly opens over the water.', tokyoTitle: 'Tokyo · White Night Sakura', tokyoCopy: 'The city lowers its lights, leaving white blossom crowns above the canal.', kanazawaTitle: 'Kanazawa · Garden Red', kanazawaCopy: 'Stone lanterns keep silent while maple leaves illuminate the whole garden.', kyotoTitle: 'Kyoto · Time in Red', kyotoCopy: 'Lattice windows and stone paths say nothing; maple leaves burn for time.', hirosakiTitle: 'Hirosaki · White Below the Castle', hirosakiCopy: 'Beyond the walls, white petals feel lighter than snow and closer to spring.', naraTitle: 'Nara · Red Mountain Path', naraCopy: 'Up the stone steps, maple leaves dye the quiet mountain temple with dusk.', sendaiDot: 'Sendai', tokyoDot: 'Tokyo', kanazawaDot: 'Kanazawa', kyotoDot: 'Kyoto', hirosakiDot: 'Hirosaki', naraDot: 'Nara', fusionKicker: 'Spring and autumn finally meet', fusionTitle: 'One flag<br>Two beauties.', fusionCopy: 'White is the spring wind where sakura wanders.<br>Red is the sun where maple leaves gather.', flagCaption: 'When the wind rises, petals embrace a sun made of maple leaves.', closingTitle: 'May we meet<br>in the moment of bloom,<br><em>and remain serene after the blaze.</em>', top: 'Back to top ↑'
};
const translations = { zh, ja, en };
function setLanguage(lang) {
  const dictionary = translations[lang] || zh;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  document.querySelectorAll('[data-lang]').forEach((button) => button.classList.toggle('active', button.dataset.lang === lang));
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = dictionary[element.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-html]').forEach((element) => { element.innerHTML = dictionary[element.dataset.i18nHtml]; });
  localStorage.setItem('season-language', lang);
}
document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
setLanguage(localStorage.getItem('season-language') || 'zh');

const cityActs = [...document.querySelectorAll('.city-act')];
const compactCities = matchMedia('(max-width: 850px)');
let cityFrame;
function updateCityActs() {
  cityFrame = undefined;
  if (compactCities.matches || reduceMotion) return;
  cityActs.forEach((act) => {
    const stage = act.querySelector('.city-act-stage');
    const strip = act.querySelector('.city-act-grid');
    const indicator = [...act.querySelectorAll('.act-indicator span')];
    const intro = act.querySelector('.city-act-intro');
    const travel = act.offsetHeight - innerHeight;
    const progress = Math.max(0, Math.min(1, -act.getBoundingClientRect().top / travel));
    // The opening beat holds the title before the horizontal story begins.
    const slideProgress = Math.max(0, Math.min(1, (progress - .18) / .82));
    const offset = slideProgress * (strip.scrollWidth - innerWidth);
    strip.style.transform = `translate3d(${-offset}px, 0, 0)`;
    intro.style.opacity = String(Math.max(0, 1 - progress / .28));
    const active = Math.min(indicator.length - 1, Math.round(slideProgress * (indicator.length - 1)));
    indicator.forEach((item, index) => item.classList.toggle('active', index === active));
    stage.dataset.active = String(active + 1);
  });
}
function requestCityUpdate() {
  if (!cityFrame) cityFrame = requestAnimationFrame(updateCityActs);
}
addEventListener('scroll', requestCityUpdate, { passive: true });
addEventListener('resize', requestCityUpdate, { passive: true });
compactCities.addEventListener('change', requestCityUpdate);
updateCityActs();
document.querySelector('.back-to-top').addEventListener('click', () => {
  document.querySelector('main').focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});

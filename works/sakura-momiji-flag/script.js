const revealTargets = document.querySelectorAll('.manifesto h2,.manifesto-body,.season-card,.fusion-copy,.flag-stage,.closing h2');
revealTargets.forEach(e => e.classList.add('reveal'));
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
	if (entry.isIntersecting) entry.target.classList.add('visible')
}), {
	threshold: .16
});
revealTargets.forEach(e => observer.observe(e));
const heroArt = document.querySelector('.hero-art');
addEventListener('scroll', () => {
	const p = Math.min(scrollY / innerHeight, 1.4);
	heroArt.style.transform = `translateY($ {
        p * 38
    }
    px) rotate($ {
        p * 2
    }
    deg)`
}, {
	passive: true
});
document.querySelector('.sound-toggle').addEventListener('click', e => {
	const button = e.currentTarget;
	button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') !== 'true')
});
const t = {
	zh: {
		navIdea: '构想',
		navSeasons: '四季',
		navFlag: '一面旗',
		observe: '静观',
		eyebrow: '日本之红',
		heroTitle: '春日成花<br><em>秋日成叶</em>',
		heroLead: '樱花落在白色的风里，红叶聚成中央的太阳。<br>春与秋，共同完成一面季节的旗。',
		scroll: '向下观赏',
		conceptTitle: '一片白与一轮红，<br>藏着两次心动。',
		conceptP1: '白色并非空无：樱花在其中舒展，像春日的呼吸，也像所有尚未写下的可能。',
		conceptP2: '中央的红，则由秋日红叶汇聚而成。一个象征开始，一个象征圆满；一片留白，托起一轮燃烧的季节。',
		springCopy: '短暂，因此被珍惜。<br>柔软，因此让人靠近。',
		fromPetal: '从一片花瓣',
		toLeaf: '到一枚叶片',
		autumnCopy: '浓烈，却不喧哗。<br>告别，也可以灿烂。',
		fusionKicker: '春与秋，最终相逢',
		fusionTitle: '一面旗<br>两种美。',
		fusionCopy: '白，是樱花漫游的春风。<br>红，是红叶汇聚的太阳。',
		flagCaption: '风吹过时，花瓣环抱着由红叶汇成的太阳。',
		closingTitle: '愿我们都能<br>在盛放时相遇，<br><em>在绚烂后从容。</em>',
		placesKicker: '季节落在土地上，便有了名字',
		placesTitle: '在日本，<br>看见春秋。',
		fujiTitle: '富士山 · 春',
		fujiCopy: '雪峰收住冬日最后的白，樱花把春天轻轻递向湖面。',
		kyotoTitle: '京都 · 秋',
		kyotoCopy: '古寺不语，只有红叶替时间燃烧。千年木色，因此更显沉静。',
		miyajimaTitle: '严岛 · 春秋',
		miyajimaCopy: '潮水托起朱红鸟居，樱花与红叶从光影两端，在这里相逢。',
		top: '回到顶部 ↑'
	},
	ja: {
		navIdea: '構想',
		navSeasons: '四季',
		navFlag: '一つの旗',
		observe: '静観',
		eyebrow: '日本の赤',
		heroTitle: '春は花となり<br><em>秋は葉となる</em>',
		heroLead: '桜は白い風に舞い、紅葉は中央の太陽となる。<br>春と秋が、季節の旗を完成させる。',
		scroll: '下へ',
		conceptTitle: '一面の白、一輪の赤。<br>二つのときめき。',
		conceptP1: '白は空白ではない。桜がそこに広がり、春の呼吸と、まだ書かれていない可能性になる。',
		conceptP2: '中央の赤は、秋の紅葉が集まって生まれる。始まりと円熟、余白と燃える季節が一つの旗に宿る。',
		springCopy: '儚いから、愛おしい。<br>やわらかいから、近づきたくなる。',
		fromPetal: '一枚の花びらから',
		toLeaf: '一枚の葉へ',
		autumnCopy: '鮮やかに、しかし静かに。<br>別れもまた、美しく燃える。',
		fusionKicker: '春と秋、ついに出会う',
		fusionTitle: '一つの旗<br>二つの美。',
		fusionCopy: '白は、桜が遊ぶ春風。<br>赤は、紅葉が集う太陽。',
		flagCaption: '風が吹くと、花びらが紅葉の太陽を包み込む。',
		closingTitle: '咲くときに出会い、<br>燃えたあとも、<br><em>穏やかでありますように。</em>',
		placesKicker: '季節が土地に降りると、名前を持つ。',
		placesTitle: '日本で、<br>春と秋を見る。',
		fujiTitle: '富士山 · 春',
		fujiCopy: '雪峰が冬の白を留め、桜が春を静かに湖面へ運ぶ。',
		kyotoTitle: '京都 · 秋',
		kyotoCopy: '古寺は語らず、紅葉だけが時を燃やす。千年の木肌は、さらに静かに見える。',
		miyajimaTitle: '宮島 · 春秋',
		miyajimaCopy: '潮が朱の鳥居を支え、桜と紅葉が光の両端からここで出会う。',
		top: 'トップへ ↑'
	},
	en: {
		navIdea: 'Concept',
		navSeasons: 'Seasons',
		navFlag: 'The Flag',
		observe: 'Observe',
		eyebrow: 'The Red of Japan',
		heroTitle: 'Spring becomes blossom<br><em>Autumn becomes leaf</em>',
		heroLead: 'Sakura drifts through the white, while maple leaves gather into the central sun.<br>Spring and autumn complete a flag of seasons.',
		scroll: 'Explore',
		conceptTitle: 'A field of white, a circle of red—<br>two moments of wonder.',
		conceptP1: 'White is not emptiness. Sakura unfolds within it like the breath of spring, and like every possibility yet to be written.',
		conceptP2: 'The red at the center is formed by autumn maple leaves. One marks a beginning, one a fulfillment; open space holds a season aflame.',
		springCopy: 'Brief, and therefore treasured.<br>Gentle, and therefore inviting.',
		fromPetal: 'From one petal',
		toLeaf: 'to one leaf',
		autumnCopy: 'Vivid, yet never loud.<br>Even farewell can glow.',
		fusionKicker: 'Spring and autumn finally meet',
		fusionTitle: 'One flag<br>Two beauties.',
		fusionCopy: 'White is the spring wind where sakura wanders.<br>Red is the sun where maple leaves gather.',
		flagCaption: 'When the wind rises, petals embrace a sun made of maple leaves.',
		closingTitle: 'May we meet<br>in the moment of bloom,<br><em>and remain serene after the blaze.</em>',
		placesKicker: 'When seasons touch the land, they acquire names.',
		placesTitle: 'See spring and autumn<br>across Japan.',
		fujiTitle: 'Mount Fuji · Spring',
		fujiCopy: 'The snowy peak holds winter’s final white as sakura gently carries spring toward the lake.',
		kyotoTitle: 'Kyoto · Autumn',
		kyotoCopy: 'The old temple remains silent while maple leaves burn on behalf of time.',
		miyajimaTitle: 'Miyajima · Two Seasons',
		miyajimaCopy: 'The tide carries the vermilion gate as blossoms and maple leaves meet from opposite ends of light.',
		top: 'Back to top ↑'
	}
};

function setLanguage(lang) {
	document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
	document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
	document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t[lang][e.dataset.i18n]);
	document.querySelectorAll('[data-i18n-html]').forEach(e => e.innerHTML = t[lang][e.dataset.i18nHtml]);
	localStorage.setItem('season-language', lang)
}
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLanguage(b.dataset.lang)));
setLanguage(localStorage.getItem('season-language') || 'zh');
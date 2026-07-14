const journey = document.querySelector('.journey');
const sticky = document.querySelector('.journey-sticky');
const track = document.querySelector('.track');
const panels = [...document.querySelectorAll('.panel')];
const introVisual = document.querySelector('.intro-visual');
const introOverlay = introVisual.querySelector('figcaption');
const introCopy = document.querySelector('.intro-copy');
const progressRoot = document.querySelector('.progress-items');
const heroMedia = document.querySelector('.hero-media');
const header = document.querySelector('.site-header');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 901px)');

let metrics = null;
let ticking = false;
let activeIndex = -1;
let headerScrollY = scrollY;

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const easeOut = value => 1 - Math.pow(1 - value, 3);

function buildProgress() {
    progressRoot.innerHTML = panels.map((_, index) => `
        <button type="button" class="progress-item" aria-label="第 ${index + 1} 幕" data-index="${index}">
            <span class="progress-number">${index + 1}</span>
            <span class="progress-line"><i class="progress-fill"></i></span>
        </button>`).join('');
    progressRoot.querySelectorAll('.progress-item').forEach(item => {
        item.addEventListener('click', () => scrollToPanel(Number(item.dataset.index)));
    });
}

// 把某一幕映射回它对应的 scrollY 位置，实现数字跳转。
// 反解 update() 中的 virtualProgress → raw → scrollY。
function scrollToPanel(index) {
    if (!metrics || !desktop.matches) {
        // 移动端没有横向轨道，直接滚到对应面板。
        panels[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    const introPhase = .17;
    let raw;
    if (index === 0) {
        raw = 0;
    } else {
        // 目标 virtualProgress 落在该幕中部，确保滚动后它被判定为 active。
        const target = Math.min(index + .5, panels.length - .01);
        const translateProgress = (target - .82) / (panels.length - .82);
        raw = introPhase + translateProgress * (1 - introPhase);
    }
    const top = metrics.start + clamp(raw) * metrics.distance;
    scrollTo({ top, behavior: 'smooth' });
}

function measure() {
    if (!desktop.matches) {
        metrics = null;
        journey.style.height = '';
        track.style.transform = '';
        return;
    }

    journey.style.height = `${panels.length * 100 + 80}vh`;
    const firstPanel = panels[0];
    const lastPanel = panels.at(-1);
    const lastInner = lastPanel.querySelector('.panel-inner');
    const finalLeft = Math.max(32, (innerWidth - lastInner.offsetWidth) / 2);
    const maxTranslate = lastPanel.offsetLeft - finalLeft;

    metrics = {
        start: journey.offsetTop,
        distance: journey.offsetHeight - innerHeight,
        maxTranslate: Math.max(0, maxTranslate - firstPanel.offsetLeft),
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        trackWidth: track.scrollWidth
    };
    update();
}

function setActive(index, localProgress) {
    if (activeIndex !== index) {
        activeIndex = index;
        panels.forEach((panel, panelIndex) => panel.classList.toggle('is-active', panelIndex === index));
        [...progressRoot.children].forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === index));
        sticky.dataset.season = index === 0 ? 'concept' : index <= 5 ? 'spring' : index === 6 ? 'turn' : 'autumn';
    }
    document.querySelectorAll('.progress-fill').forEach((item, itemIndex) => {
        item.style.transform = `scaleX(${itemIndex === index ? clamp(localProgress) : 0})`;
    });
}

function update() {
    ticking = false;
    const currentScrollY = scrollY;
    const heroProgress = clamp(currentScrollY / Math.max(innerHeight, 1), 0, 1.15);
    if (heroMedia && !reducedMotion.matches) {
        heroMedia.style.transform = `translate3d(0, ${heroProgress * 72}px, 0) scale(${1.04 + heroProgress * .04})`;
    }

    if (!metrics || !desktop.matches) {
        header.classList.remove('header-hidden');
        return;
    }

    const raw = clamp((currentScrollY - metrics.start) / metrics.distance);
    const introPhase = .17;
    let translateProgress = 0;

    if (raw < introPhase) {
        const morph = easeOut(raw / introPhase);
        introVisual.style.width = `${innerWidth * (1 - .42 * morph)}px`;
        introVisual.style.height = `${innerHeight * (1 - .34 * morph)}px`;
        introVisual.style.left = `${morph * innerWidth * .08}px`;
        introOverlay.style.opacity = String(1 - clamp(morph * 1.55));
        introCopy.style.opacity = String(clamp((morph - .88) / .12));
        introCopy.style.transform = `translateY(calc(-50% + ${(1 - morph) * 24}px))`;
    } else {
        introVisual.style.width = '58vw';
        introVisual.style.height = '66vh';
        introVisual.style.left = '8vw';
        introOverlay.style.opacity = '0';
        introCopy.style.opacity = '1';
        introCopy.style.transform = 'translateY(-50%)';
        translateProgress = clamp((raw - introPhase) / (1 - introPhase));
    }

    track.style.transform = `translate3d(${-metrics.maxTranslate * translateProgress}px, 0, 0)`;
    const virtualProgress = raw < introPhase
        ? raw / introPhase * .82
        : .82 + translateProgress * (panels.length - .82);
    const panelIndex = Math.min(panels.length - 1, Math.floor(virtualProgress));
    setActive(panelIndex, virtualProgress - panelIndex);
}

function requestUpdate() {
    if (desktop.matches && metrics && (
        metrics.viewportWidth !== innerWidth ||
        metrics.viewportHeight !== innerHeight ||
        metrics.trackWidth !== track.scrollWidth
    )) measure();

    const currentScrollY = scrollY;
    if (metrics && desktop.matches) {
        const insideJourney = currentScrollY > metrics.start + 24 && currentScrollY < metrics.start + metrics.distance - 24;
        const delta = currentScrollY - headerScrollY;
        if (!insideJourney) header.classList.remove('header-hidden');
        else if (delta > 2) header.classList.add('header-hidden');
        else if (delta < -2) header.classList.remove('header-hidden');
    } else header.classList.remove('header-hidden');
    headerScrollY = currentScrollY;

    if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
    }
}

buildProgress();
addEventListener('scroll', requestUpdate, { passive: true });
addEventListener('resize', measure);
desktop.addEventListener('change', measure);
addEventListener('load', measure);

const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: .18 });
document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

const zh = {
    siteTitle: '花落为素，叶燃成日',
    navJourney: '白与红', navLedger: '花与叶', navStory: '旗成', scroll: '向下观赏',
    heroTitle: '春日成花<br><em>秋日成叶</em>',
    heroLead: '樱花把春天铺成一片白，红叶把秋天聚成一轮红。<br>两个季节，共同完成一面日本的旗。',
    introOverlay: 'A FLAG OF TWO SEASONS', introKicker: '构想 · 一面季节的旗',
    introTitle: '白来自花，<br>红来自叶。', introBody: '樱花铺开旗面的白，红叶向中央聚成红。先看清两种颜色从何而来，再抵达完整的旗。',
    osakaMintTitle: '花密成廊，<br>白色第一次有了方向。', osakaMintBody: '造币局的晚樱从两侧合拢，行人走进由花构成的白。这里不是背景，而是旗面底色的第一层密度。',
    sahoTitle: '沿河延伸，<br>白色开始流动。', sahoBody: '佐保川把两岸花冠与水中倒影连成一条春日长卷。白不再静止，它顺着城市缓慢展开。',
    philosophyTitle: '人在花下行走，<br>白色拥有了尺度。', philosophyBody: '水渠、低墙与行人的步幅收住漫天花枝。旗面的白因此不是空无，而是可以进入、可以呼吸的空间。',
    sumauraTitle: '山海之间，<br>白色被风吹得辽阔。', sumauraBody: '须磨浦的樱花越过山坡，面向濑户内海。海蓝让花的白更清晰，也让春天拥有远景。',
    fushimiTitle: '舟划过水纹，<br>花把白色送向远方。', fushimiBody: '十石舟从酒藏与花岸之间缓缓驶过，水面带走花瓣。五种城市的白，至此铺满旗面。',
    turnTitle: '白走到尽头，<br>第一枚红叶落下。', turnBody: '春风留下完整的白。时间继续向前，叶片从画面边缘出现，开始寻找旗帜的中心。',
    fujiAutumnTitle: '雪峰仍冷，<br>山脚的红已经燃起。', fujiAutumnBody: '河口湖的蓝与富士山的白托住第一层红叶。红从远景开始，向旗面中央靠近。',
    kiyomizuTitle: '木构伸向山谷，<br>红色拥有了体量。', kiyomizuBody: '清水舞台悬在层层红叶之上，人与建筑给秋色以尺度。中央的红不再是一枚符号，而是一片可以俯瞰的季节。',
    eikandoTitle: '灯影落入池水，<br>红色有了第二层深度。', eikandoBody: '回廊、池面与枫叶互相映照，同一枚红出现两次。秋日太阳因此不再平面，而有了光与倒影。',
    jojakkojiTitle: '人沿石阶向上，<br>红黄在眼前轮流落笔。', jojakkojiBody: '常寂光寺最震撼的不是苔藓，而是行人在上行途中被红、黄、橙与余绿层层包围。整条山径像大自然展开的画板。',
    tojiTitle: '五重塔收住暮色，<br>红叶聚成最后一笔。', tojiBody: '塔影把散开的秋色收束成清晰轮廓。五种红叶风景向中央汇合，季节的太阳终于完整。',
    arrive: '查看季节采样', scrollHint: '继续滚动 · 看白如何铺开，红如何聚拢',
    ledgerTitle: '五种白，五种红，<br>共同完成一面旗。', ledgerLead: '地点不是清单，而是颜色的证据。', ledgerVerse: '<p class="verse-white"><span class="verse-mark">花</span>樱花在水、路、山、海与舟之间，<em>铺开白</em>。</p><p class="verse-red"><span class="verse-mark">葉</span>红叶借雪峰、舞台、池水、山径与塔影，<em>向中心聚拢</em>。</p>', ledgerWhite: '樱花之白', ledgerRed: '红叶之红',
    flagLabel: '樱花之白 · 红叶之红', equationSakura: '樱花之白', equationMomiji: '红叶之红', equationFlag: '日本之旗',
    afterTitle: '一面旗<br><em>两种季节的美。</em>', afterVerse: '<p class="verse-white"><span class="verse-mark">白</span>白，是五处樱花风景<em>共同铺开的底色</em>。</p><p class="verse-red"><span class="verse-mark">紅</span>红，是五处红叶风景<em>向中央汇成的太阳</em>。</p>', afterCoda: '熟悉的日本国旗，因此拥有了地点、时间与生命。', backTop: '回到顶部 ↑'
};

const ja = {
    siteTitle: '花は白となり、葉は日を燃やす',
    navJourney: '白と赤', navLedger: '花と葉', navStory: '旗となる', scroll: '下へ',
    heroTitle: '春は花となり<br><em>秋は葉となる</em>', heroLead: '桜が春を白く広げ、紅葉が秋を一輪の赤へ集める。<br>二つの季節が、一つの旗を完成させる。',
    introOverlay: 'A FLAG OF TWO SEASONS', introKicker: '構想 · 季節でできた旗',
    introTitle: '白は花から、<br>赤は葉から。', introBody: '桜が旗の白を広げ、紅葉が中央の赤へ集まる。二つの色の由来をたどる旅。',
    osakaMintTitle: '花が回廊をつくり、<br>白に方向が生まれる。', osakaMintBody: '造幣局の遅咲きの桜が両側から重なり、人々を花の白へ迎え入れる。ここから旗の地色が密度を持ちはじめる。',
    sahoTitle: '川に沿って、<br>白が流れはじめる。', sahoBody: '佐保川は両岸の花冠と水面の影を一つの春の絵巻に結ぶ。白は静止せず、街をゆっくりと進んでいく。',
    philosophyTitle: '花の下を人が歩き、<br>白に尺度が生まれる。', philosophyBody: '水路、低い塀、人の歩幅が空を覆う枝を受け止める。旗の白は空白ではなく、入って呼吸できる場所になる。',
    sumauraTitle: '山と海のあいだで、<br>白は風に広がる。', sumauraBody: '須磨浦の桜は斜面を越え、瀬戸内海へひらく。海の青が花の白を際立たせ、春に遠景を与える。',
    fushimiTitle: '舟が水紋をひらき、<br>花が白を遠くへ運ぶ。', fushimiBody: '十石舟は酒蔵と桜の岸のあいだを進み、水面が花びらを連れていく。五つの街の白が、ここで旗面を満たす。',
    turnTitle: '白の終わりに、<br>最初の紅葉が落ちる。', turnBody: '春風は一面の白を残す。時間が進むと葉が画面の縁に現れ、旗の中心を探しはじめる。',
    fujiAutumnTitle: '雪峰は冷たいまま、<br>麓の赤が燃えはじめる。', fujiAutumnBody: '河口湖の青と富士の白が、最初の紅葉を支える。赤は遠景から旗の中心へ近づいていく。',
    kiyomizuTitle: '木の舞台が谷へ伸び、<br>赤に量感が生まれる。', kiyomizuBody: '清水の舞台が幾層もの紅葉の上に浮かび、人と建築が秋色の大きさを示す。中央の赤は記号ではなく、見渡せる季節になる。',
    eikandoTitle: '灯りが池へ落ち、<br>赤にもう一つの奥行きが生まれる。', eikandoBody: '回廊、池、紅葉が映し合い、一つの赤が二度現れる。秋の太陽は平面を離れ、光と反射を持つ。',
    jojakkojiTitle: '人が石段を上り、<br>赤と黄が交互に描かれる。', jojakkojiBody: '常寂光寺の核心は苔ではない。上る人々を赤、黄、橙、残る緑が幾層にも包み、山道全体が自然の画板になる。',
    tojiTitle: '五重塔が夕景を留め、<br>紅葉が最後の一筆になる。', tojiBody: '塔の影が広がる秋色を明快な輪郭へ収束させる。五つの紅葉風景が中心に集まり、季節の太陽が完成する。',
    arrive: '季節の標本を見る', scrollHint: 'スクロール · 白が広がり、赤が集まるまで',
    ledgerTitle: '五つの白、五つの赤。<br>一つの旗へ。', ledgerLead: '地名は一覧ではなく、色の証しである。', ledgerVerse: '<p class="verse-white"><span class="verse-mark">花</span>桜は水・道・山・海・舟のあいだに、<em>白を広げ</em>。</p><p class="verse-red"><span class="verse-mark">葉</span>紅葉は雪峰・舞台・池・山道・塔影を借りて、<em>中心へ集う</em>。</p>', ledgerWhite: '桜の白', ledgerRed: '紅葉の赤',
    flagLabel: '桜の白 · 紅葉の赤', equationSakura: '桜の白', equationMomiji: '紅葉の赤', equationFlag: '日本の旗',
    afterTitle: '一つの旗<br><em>二つの季節。</em>', afterVerse: '<p class="verse-white"><span class="verse-mark">白</span>白は、五つの桜風景が<em>ともに広げた地色</em>。</p><p class="verse-red"><span class="verse-mark">紅</span>赤は、五つの紅葉風景が<em>中央へ集めた太陽</em>。</p>', afterCoda: '見慣れた日本の旗が、こうして地・時・生命を宿す。', backTop: 'トップへ ↑'
};

const en = {
    siteTitle: 'Blossoms Fall to White, Leaves Burn into Sun',
    navJourney: 'White & Red', navLedger: 'Flower & Leaf', navStory: 'The Flag', scroll: 'Begin',
    heroTitle: 'Spring becomes blossom<br><em>Autumn becomes leaf</em>', heroLead: 'Sakura spreads spring into white. Maple leaves gather autumn into red.<br>Two seasons complete one flag.',
    introOverlay: 'A FLAG OF TWO SEASONS', introKicker: 'CONCEPT · A SEASONAL FLAG',
    introTitle: 'White comes from blossom.<br>Red comes from leaf.', introBody: 'Sakura forms the field. Maple leaves gather toward the center. Follow both colors to the finished flag.',
    osakaMintTitle: 'Blossom closes into a passage.<br>White gains direction.', osakaMintBody: 'Late-blooming trees meet above the Mint walkway and people enter a field made from blossom. White gains its first layer of density here.',
    sahoTitle: 'Along the river,<br>white begins to move.', sahoBody: 'The Saho River joins both banks and their reflections into a long spring scroll. White is no longer still; it travels through the city.',
    philosophyTitle: 'People walk beneath blossom.<br>White gains human scale.', philosophyBody: 'Canal, wall and footsteps hold the canopy in place. The flag\'s white is not emptiness, but a space that can be entered and breathed.',
    sumauraTitle: 'Between mountain and sea,<br>wind makes white expansive.', sumauraBody: 'Sumaura\'s blossom crosses the hillside and opens toward the Seto Inland Sea. Marine blue makes the spring white unmistakable.',
    fushimiTitle: 'A boat opens the water.<br>Blossom carries white onward.', fushimiBody: 'The Jikkokubune passes between sake warehouses and flowering banks as the canal carries petals away. Five urban whites now fill the field.',
    turnTitle: 'At the end of white,<br>the first red leaf falls.', turnBody: 'Spring leaves a completed white field. Time moves on; leaves enter from the edges and begin searching for the flag\'s center.',
    fujiAutumnTitle: 'The snowy peak stays cool.<br>Red ignites below.', fujiAutumnBody: 'Lake blue and Fuji white hold the first layer of maple red. It begins in the distance and moves toward the center.',
    kiyomizuTitle: 'Timber reaches into the valley.<br>Red gains volume.', kiyomizuBody: 'Kiyomizu\'s stage floats above layered foliage. People and architecture reveal that the central red is a season with measurable scale.',
    eikandoTitle: 'Light enters the pond.<br>Red gains a second depth.', eikandoBody: 'Corridor, water and maple leaves reflect one another, making the same red appear twice. The autumn sun gains light and reflection.',
    jojakkojiTitle: 'People climb the steps.<br>Red and yellow take turns painting.', jojakkojiBody: 'Jojakkoji is not a study in moss. Climbers rise through red, yellow, orange and lingering green until the whole ascent becomes nature\'s painting board.',
    tojiTitle: 'The pagoda holds dusk.<br>Maple makes the final mark.', tojiBody: 'The tower gathers scattered autumn color into a clear silhouette. Five red landscapes converge and the seasonal sun becomes complete.',
    arrive: 'View the seasonal study', scrollHint: 'Keep scrolling · watch white spread and red gather',
    ledgerTitle: 'Five whites, five reds,<br>one completed flag.', ledgerLead: 'These places are not a list, but evidence of color.', ledgerVerse: '<p class="verse-white"><span class="verse-mark">F</span>Through water, path, mountain, sea and boat, blossom <em>spreads the white</em>.</p><p class="verse-red"><span class="verse-mark">L</span>Through peak, stage, pond, ascent and pagoda, maple <em>gathers toward the center</em>.</p>', ledgerWhite: 'Sakura White', ledgerRed: 'Momiji Red',
    flagLabel: 'SAKURA WHITE · MOMIJI RED', equationSakura: 'Sakura white', equationMomiji: 'Momiji red', equationFlag: 'Japan\'s flag',
    afterTitle: 'One flag.<br><em>Two living seasons.</em>', afterVerse: '<p class="verse-white"><span class="verse-mark">W</span>White is the field <em>five sakura landscapes spread together</em>.</p><p class="verse-red"><span class="verse-mark">R</span>Red is the sun <em>five maple landscapes gather at the center</em>.</p>', afterCoda: 'The familiar flag of Japan thus gains place, time and life.', backTop: 'Back to top ↑'
};

const translations = { zh, ja, en };

function setLanguage(language) {
    const dictionary = { ...zh, ...(translations[language] || {}) };
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    document.title = dictionary.siteTitle;
    document.querySelectorAll('[data-lang]').forEach(button => {
        const active = button.dataset.lang === language;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-copy]').forEach(element => {
        if (dictionary[element.dataset.copy]) element.textContent = dictionary[element.dataset.copy];
    });
    document.querySelectorAll('[data-copy-html]').forEach(element => {
        if (dictionary[element.dataset.copyHtml]) element.innerHTML = dictionary[element.dataset.copyHtml];
    });
    localStorage.setItem('hanami-language', language);
}

document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
setLanguage(localStorage.getItem('hanami-language') || 'zh');
measure();

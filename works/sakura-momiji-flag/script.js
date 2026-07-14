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
let lastScrollY = scrollY;
let headerScrollY = scrollY;

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const easeOut = value => 1 - Math.pow(1 - value, 3);

function buildProgress() {
    progressRoot.innerHTML = panels.map((_, index) => `
        <span class="progress-item" aria-label="第 ${index + 1} 幕">
            <span class="progress-number">${index + 1}</span>
            <span class="progress-line"><i class="progress-fill"></i></span>
        </span>`).join('');
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
    const startX = firstPanel.offsetLeft;
    const lastInner = lastPanel.querySelector('.panel-inner');
    const finalLeft = Math.max(32, (innerWidth - lastInner.offsetWidth) / 2);
    const maxTranslate = lastPanel.offsetLeft - finalLeft;

    metrics = {
        start: journey.offsetTop,
        distance: journey.offsetHeight - innerHeight,
        maxTranslate: Math.max(0, maxTranslate - startX),
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
    }
    const fill = progressRoot.children[index]?.querySelector('.progress-fill');
    document.querySelectorAll('.progress-fill').forEach((item, itemIndex) => {
        item.style.transform = `scaleX(${itemIndex === index ? clamp(localProgress) : 0})`;
    });
}

function update() {
    ticking = false;
    const currentScrollY = scrollY;
    const heroProgress = clamp(scrollY / Math.max(innerHeight, 1), 0, 1.15);
    if (heroMedia && !reducedMotion.matches) {
        heroMedia.style.transform = `translate3d(0, ${heroProgress * 72}px, 0) scale(${1.04 + heroProgress * .04})`;
    }

    if (!metrics || !desktop.matches) {
        header.classList.remove('header-hidden');
        lastScrollY = currentScrollY;
        return;
    }
    const raw = clamp((scrollY - metrics.start) / metrics.distance);
    const introPhase = .19;
    let translateProgress = 0;

    if (raw < introPhase) {
        const morph = easeOut(raw / introPhase);
        const width = innerWidth * (1 - .42 * morph);
        const height = innerHeight * (1 - .34 * morph);
        introVisual.style.width = `${width}px`;
        introVisual.style.height = `${height}px`;
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

    const easedTranslate = translateProgress;
    track.style.transform = `translate3d(${-metrics.maxTranslate * easedTranslate}px, 0, 0)`;

    const virtualProgress = raw < introPhase ? raw / introPhase * .82 : .82 + translateProgress * (panels.length - .82);
    const panelIndex = Math.min(panels.length - 1, Math.floor(virtualProgress));
    setActive(panelIndex, virtualProgress - panelIndex);
    lastScrollY = currentScrollY;
}

function requestUpdate() {
    if (desktop.matches && metrics && (
        metrics.viewportWidth !== innerWidth ||
        metrics.viewportHeight !== innerHeight ||
        metrics.trackWidth !== track.scrollWidth
    )) {
        measure();
    }
    const currentScrollY = scrollY;
    if (metrics && desktop.matches) {
        const insideJourney = currentScrollY > metrics.start + 24 && currentScrollY < metrics.start + metrics.distance - 24;
        const delta = currentScrollY - headerScrollY;
        if (!insideJourney) {
            header.classList.remove('header-hidden');
        } else if (delta > 2) {
            header.classList.add('header-hidden');
        } else if (delta < -2) {
            header.classList.remove('header-hidden');
        }
    } else {
        header.classList.remove('header-hidden');
    }
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

const translations = {
    zh: {
        navJourney: '白与红', navStory: '一面旗', scroll: '向下观赏',
        heroTitle: '春日成花<br><em>秋日成叶</em>',
        heroLead: '樱花把春天铺成一片白，红叶把秋天聚成一轮红。<br>两个季节，共同完成一面日本的旗。',
        introOverlay: 'A FLAG OF TWO SEASONS', introKicker: '构想 · 一面季节的旗',
        introTitle: '白不是空白，<br>红也不只是一轮圆。', introBody: '白色由千万朵樱花舒展而成，中央的红则由秋日枫叶汇聚。向下滚动，看两种季节如何找到各自的位置。', learnMore: '看见完整旗帜',
        fujiTitle: '白色并非空无，<br>它正在东京盛开。', fujiBody: '夜色让樱花更接近白。无数花冠沿水岸连成一片，像国旗上尚未被红日占据的春风。',
        sakuraTitle: '一朵花很轻，<br>千万朵便成为白。', sakuraBody: '弘前城外，花瓣比残雪更轻，却足以覆盖河岸与天空。旗面的白，因此有了呼吸与层次。',
        osakaTitle: '城与花相遇，<br>白色有了轮廓。', osakaBody: '樱枝越过城墙与水面，把历史建筑包进春日的留白。旗面的白，不再抽象，而是一座城市共同的花期。',
        yoshinoTitle: '当一整座山盛开，<br>白便抵达完整。', yoshinoBody: '从山脚到云雾，樱花一层层铺开。千万朵花共同完成国旗的底色，也完成春天最辽阔的留白。',
        kyotoTitle: '秋天的第一枚叶，<br>点亮中央的红。', kyotoBody: '红叶从树梢落入水中，颜色开始向中心靠拢。它不是印刷出的圆，而是一整个秋天的聚集。',
        mapleTitle: '一枚叶很小，<br>整座京都便成为红。', mapleBody: '木格窗、石径与枫叶彼此映照。越来越多的红向内汇聚，国旗中央的太阳开始拥有纹理。',
        nikkoTitle: '红叶越过石灯，<br>向太阳中心聚拢。', nikkoBody: '日光的山门与石阶给红色一条向内延伸的路径。叶片越密，中央那轮秋日太阳便越接近完整。',
        miyajimaTitle: '当最后一枚叶归位，<br>一轮红日终于完整。', miyajimaBody: '奈良的石阶把秋色送向旅程终点。樱花留下白色的风，红叶聚成中央的太阳，一面旗即将完成。', arrive: '完成这面旗',
        miyajimaFinalTitle: '当红叶环抱鸟居，<br>秋日太阳浮上海面。', miyajimaFinalBody: '潮水托起朱红色的坐标，枫叶从岸边向中央回应。白色春风与红色秋阳，至此完成同一面旗。',
        scrollHint: '继续滚动 · 从樱花之白走向红叶之红', afterTitle: '一面旗<br><em>两种季节的美。</em>',
        afterBody: '白，是樱花游荡的春风；红，是枫叶聚成的秋日太阳。熟悉的日本国旗，因为花与叶而第一次拥有了时间、触感与生命。', backTop: '回到顶部 ↑'
    },
    ja: {
        navJourney: '都市の旅', navStory: '季節の余韻', scroll: '旅を始める',
        heroTitle: '花と葉をたどり<br><em>いくつもの街を抜ける</em>', heroLead: '縦の旅を、横へ広がる風景に預ける。<br>春の雪から、燃える秋の街へ。',
        introOverlay: 'SPRING MEETS AUTUMN', introKicker: '季節列車 · 始発駅', introTitle: '春と秋が、<br>同じ線路で出会う。', introBody: '下へスクロールしてください。画面は留まり、都市と花と紅葉が目の前を通り過ぎます。', learnMore: '旅を続ける',
        fujiTitle: '富士の麓で、<br>春は水面に映る。', fujiBody: '雪峰が冬の白を留め、湖畔の桜が柔らかな桃色を風へ送る。',
        sakuraTitle: '街が目覚める前に、<br>花が道を照らす。', sakuraBody: '朝霧が音を鎮め、坂道に続く桜がいつもの通勤を短い花見に変える。',
        kyotoTitle: '古寺は語らず、<br>紅葉が時を燃やす。', kyotoBody: '木組みと石段と晩秋の赤が映し合い、千年の静けさをさらに深くする。',
        mapleTitle: '夕暮れが通ると、<br>道すべてが輝く。', mapleBody: '紅葉は別れを急がない。低い夕陽を借り、街の最後の道を金赤に染める。',
        miyajimaTitle: '潮が鳥居を支え、<br>春秋が海で出会う。', miyajimaBody: '花と葉が光の両端から届き、朱の鳥居が旅の最後の座標になる。', arrive: '終着へ',
        scrollHint: 'スクロール · 街が左へ流れます', afterTitle: '止まったのは季節ではなく、<br><em>風景を見る私たちの方法。</em>', afterBody: '一度の縦スクロールで、五つの都市の記憶が横へ広がる。春花は軽く、秋葉は鮮やかに、その間を旅は静かに進む。', backTop: 'トップへ ↑'
    },
    en: {
        navJourney: 'City Journey', navStory: 'Afterglow', scroll: 'Begin the journey',
        heroTitle: 'Follow blossom and leaf<br><em>through city after city</em>', heroLead: 'Let a downward journey unfold sideways.<br>Travel from the last snow of spring to a city burning in autumn color.',
        introOverlay: 'SPRING MEETS AUTUMN', introKicker: 'Season Express · First Stop', introTitle: 'Spring and autumn<br>meet on the same line.', introBody: 'Keep scrolling. The page holds still while cities, blossoms and maple leaves move past you.', learnMore: 'Continue',
        fujiTitle: 'Below Mount Fuji,<br>spring finds its reflection.', fujiBody: 'The snowy peak keeps winter’s final white while lakeside sakura sends soft pink into the wind.',
        sakuraTitle: 'Before the city wakes,<br>blossom lights the street.', sakuraBody: 'Morning mist quiets the city as rows of sakura turn an ordinary commute into a fleeting hanami.',
        kyotoTitle: 'The temple stays silent.<br>Maples burn for time.', kyotoBody: 'Timber, stone steps and late-autumn red reflect one another, deepening a thousand years of quiet.',
        mapleTitle: 'When dusk passes,<br>the whole road begins to glow.', mapleBody: 'The leaves are in no hurry to leave. They borrow the low sun and paint the last city road gold and red.',
        miyajimaTitle: 'The tide lifts the gate.<br>Spring and autumn meet at sea.', miyajimaBody: 'Blossom and leaf arrive from opposite ends of light, with the vermilion gate as the journey’s final coordinate.', arrive: 'Arrive',
        scrollHint: 'Keep scrolling · cities move left', afterTitle: 'The season did not stop.<br><em>Only the way we watched it did.</em>', afterBody: 'One downward scroll unfolds five sideways city memories. Spring is weightless, autumn is vivid, and the journey remains quiet between them.', backTop: 'Back to top ↑'
    }
};

function setLanguage(language) {
    const dictionary = { ...translations.zh, ...(translations[language] || {}) };
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    document.querySelectorAll('[data-lang]').forEach(button => button.classList.toggle('active', button.dataset.lang === language));
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

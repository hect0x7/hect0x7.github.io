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
const heroParticleCanvas = document.querySelector('.season-particles--hero');
const journeyParticleCanvas = document.querySelector('.season-particles--journey');
const particleToggle = document.querySelector('.season-dot');

let metrics = null;
let ticking = false;
let activeIndex = -1;
let headerScrollY = scrollY;

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const easeOut = value => 1 - Math.pow(1 - value, 3);

function createParticleScene(canvas, { count, mode }) {
    const context = canvas?.getContext('2d');
    if (!context) return null;

    let width = 0;
    let height = 0;
    let visible = false;
    let frame = 0;
    let lastTime = performance.now();
    let season = mode === 'hero' ? 'hero' : 'concept';
    let seasonProgress = 0;
    let enabled = true;
    let currentLeafRatio = .5;
    let currentAttraction = 0;
    const particles = [];

    function randomParticle(index) {
        const depth = .45 + Math.random() * .85;
        return {
            index,
            x: Math.random(),
            y: Math.random(),
            size: (8 + Math.random() * 14) * depth,
            speed: (.012 + Math.random() * .018) * depth,
            fall: (.028 + Math.random() * .035) * depth,
            sway: 20 + Math.random() * 46,
            phase: Math.random() * Math.PI * 2,
            spin: (Math.random() - .5) * 1.5,
            angle: Math.random() * Math.PI * 2,
            orbit: 48 + Math.random() * Math.min(innerWidth, innerHeight) * .24,
            tone: Math.random(),
            typeBias: Math.random()
        };
    }

    function rebuild() {
        const targetCount = typeof count === 'function' ? count() : count;
        particles.length = 0;
        for (let index = 0; index < targetCount; index += 1) particles.push(randomParticle(index));
    }

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 1.75);
        width = Math.max(1, bounds.width);
        height = Math.max(1, bounds.height);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        rebuild();
    }

    function drawPetal(particle, x, y, rotation, alpha) {
        const size = particle.size;
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.scale(1, .62 + Math.sin(rotation) * .14);
        context.beginPath();
        context.moveTo(0, -size);
        context.bezierCurveTo(size * .92, -size * .5, size * .72, size * .68, 0, size);
        context.bezierCurveTo(-size * .72, size * .68, -size * .92, -size * .5, 0, -size);
        const lightness = particle.tone > .55 ? '255, 236, 241' : '248, 205, 218';
        context.fillStyle = `rgba(${lightness}, ${alpha})`;
        context.fill();
        context.restore();
    }

    function drawLeaf(particle, x, y, rotation, alpha) {
        const size = particle.size * 1.08;
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.beginPath();
        context.moveTo(0, -size);
        context.lineTo(size * .22, -size * .4);
        context.lineTo(size * .68, -size * .62);
        context.lineTo(size * .52, -size * .12);
        context.lineTo(size, 0);
        context.lineTo(size * .42, size * .22);
        context.lineTo(size * .48, size * .72);
        context.lineTo(0, size * .42);
        context.lineTo(-size * .48, size * .72);
        context.lineTo(-size * .42, size * .22);
        context.lineTo(-size, 0);
        context.lineTo(-size * .52, -size * .12);
        context.lineTo(-size * .68, -size * .62);
        context.lineTo(-size * .22, -size * .4);
        context.closePath();
        const color = particle.tone > .62 ? '224, 82, 55' : particle.tone > .28 ? '181, 40, 44' : '238, 129, 51';
        context.fillStyle = `rgba(${color}, ${alpha})`;
        context.fill();
        context.beginPath();
        context.moveTo(0, size * .2);
        context.lineTo(0, size * .92);
        context.strokeStyle = `rgba(116, 38, 31, ${alpha * .7})`;
        context.lineWidth = 1;
        context.stroke();
        context.restore();
    }

    function render(time) {
        frame = 0;
        if (!visible || document.hidden || !enabled) return;
        const animated = !reducedMotion.matches;
        const delta = animated ? Math.min(32, time - lastTime) / 1000 : 0;
        lastTime = time;
        context.clearRect(0, 0, width, height);

        let targetLeafRatio = .5;
        let targetAttraction = 0;
        if (season === 'spring') targetLeafRatio = .04;
        else if (season === 'turn') {
            targetLeafRatio = .04 + easeOut(seasonProgress) * .9;
            targetAttraction = easeOut(seasonProgress) * .82;
        } else if (season === 'autumn') {
            targetLeafRatio = .94;
            targetAttraction = .12;
        }

        const response = animated ? Math.min(1, delta * 3.6) : 1;
        currentLeafRatio += (targetLeafRatio - currentLeafRatio) * response;
        currentAttraction += (targetAttraction - currentAttraction) * response;

        particles.forEach(particle => {
            particle.x += particle.speed * delta;
            particle.y += particle.fall * delta;
            particle.angle += particle.spin * delta;
            if (particle.x > 1.08) particle.x = -.08;
            if (particle.y > 1.1) particle.y = -.1;

            const leafAmount = clamp((currentLeafRatio - particle.typeBias) / .18 + .5);
            const sway = Math.sin(time * .00055 + particle.phase) * particle.sway;
            let x = particle.x * width + sway;
            let y = particle.y * height;

            if (leafAmount > 0 && currentAttraction > 0) {
                const orbitAngle = particle.phase + time * .00008;
                const attraction = currentAttraction * leafAmount;
                const radius = particle.orbit * (1 - attraction * .72);
                const targetX = width * .54 + Math.cos(orbitAngle) * radius;
                const targetY = height * .48 + Math.sin(orbitAngle) * radius * .72;
                x += (targetX - x) * attraction;
                y += (targetY - y) * attraction;
            }

            const edgeFade = clamp(Math.min(y / 70, (height - y) / 70));
            const alpha = clamp(.34 + particle.size / 42, .38, .82) * edgeFade;
            if (leafAmount < .99) drawPetal(particle, x, y, particle.angle, alpha * (1 - leafAmount) * .96);
            if (leafAmount > .01) drawLeaf(particle, x, y, particle.angle, alpha * leafAmount);
        });

        if (animated) frame = requestAnimationFrame(render);
    }

    function setVisible(nextVisible) {
        visible = nextVisible;
        if (visible && enabled && !frame) {
            lastTime = performance.now();
            frame = requestAnimationFrame(render);
        } else if (!visible && frame) {
            cancelAnimationFrame(frame);
            frame = 0;
            context.clearRect(0, 0, width, height);
        }
    }

    function syncAnimationPreference() {
        if ((document.hidden || !enabled) && frame) {
            cancelAnimationFrame(frame);
            frame = 0;
            context.clearRect(0, 0, width, height);
        } else if (!document.hidden && enabled && visible) {
            if (frame) cancelAnimationFrame(frame);
            lastTime = performance.now();
            frame = requestAnimationFrame(render);
        }
    }

    resize();
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting), { threshold: .02 });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', syncAnimationPreference);
    reducedMotion.addEventListener('change', syncAnimationPreference);
    return {
        resize,
        setEnabled(nextEnabled) {
            enabled = nextEnabled;
            if (!enabled) {
                if (frame) cancelAnimationFrame(frame);
                frame = 0;
                context.clearRect(0, 0, width, height);
            } else syncAnimationPreference();
        },
        setSeason(nextSeason, progress = 0) {
            season = nextSeason;
            seasonProgress = clamp(progress);
        }
    };
}

const heroParticles = createParticleScene(heroParticleCanvas, {
    count: () => desktop.matches ? 40 : 18,
    mode: 'hero'
});
const journeyParticles = createParticleScene(journeyParticleCanvas, {
    count: () => desktop.matches ? 72 : 24,
    mode: 'journey'
});

function setParticlesEnabled(enabled) {
    particleToggle?.setAttribute('aria-pressed', String(enabled));
    heroParticles?.setEnabled(enabled);
    journeyParticles?.setEnabled(enabled);
    localStorage.setItem('season-particles-enabled', String(enabled));
}

particleToggle?.addEventListener('click', () => {
    setParticlesEnabled(particleToggle.getAttribute('aria-pressed') !== 'true');
});
setParticlesEnabled(localStorage.getItem('season-particles-enabled') !== 'false');

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
    const season = index === 0 ? 'concept' : index <= 6 ? 'spring' : index === 7 ? 'turn' : 'autumn';
    if (activeIndex !== index) {
        activeIndex = index;
        panels.forEach((panel, panelIndex) => panel.classList.toggle('is-active', panelIndex === index));
        [...progressRoot.children].forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === index));
        sticky.dataset.season = season;
    }
    journeyParticles?.setSeason(season, localProgress);
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
addEventListener('resize', () => {
    heroParticles?.resize();
    journeyParticles?.resize();
    measure();
});
desktop.addEventListener('change', measure);
addEventListener('load', measure);

const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: .18 });
document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

const zh = {
    siteTitle: '一面旗，两个季节',
    siteTagline: '樱花的白，红叶的红',
    particleToggle: '切换季节粒子效果',
    navTop: '序章', navJourney: '白与红', navLedger: '花与叶', navStory: '旗成', scroll: '向下观赏',
    heroTitle: '春日成花<br><em>秋日成叶</em>',
    heroLead: '樱花把春天铺成一片白，红叶把秋天聚成一轮红。<br>两个季节，共同完成一面日本的旗。',
    introOverlay: '一面旗，两个季节', introKicker: '01 · 构想 · 一面季节的旗',
    introTitle: '白来自花，<br>红来自叶。', introBody: '樱花铺开旗面的白，红叶向中央聚成红。先看清两种颜色从何而来，再抵达完整的旗。',
    osakaMintTitle: '花密成廊，<br>白色第一次有了方向。', osakaMintBody: '造币局的晚樱从两侧合拢，行人走进由花构成的白。这里不是背景，而是旗面底色的第一层密度。',
    yoshinoTitle: '一整座山盛开，<br>白色抵达完整。', yoshinoBody: '吉野山从山脚延至云雾，樱花一层层铺开。一路累积的白，至此成为一整片可以远望的春天。',
    philosophyTitle: '人在花下行走，<br>白色拥有了尺度。', philosophyBody: '水渠、低墙与行人的步幅收住漫天花枝。旗面的白因此不是空无，而是可以进入、可以呼吸的空间。',
    funakawaTitle: '雪山立于花后，<br>白色穿过整片田野。', funakawaBody: '残雪的朝日岳、舟川樱列、郁金香与油菜花在同一刻铺开。白色离开古寺，进入北陆开阔的春日地平线。',
    sumauraTitle: '山海之间，<br>白色被风吹得辽阔。', sumauraBody: '须磨浦的樱花越过山坡，面向濑户内海。海蓝让花的白更清晰，也让春天拥有远景。',
    fushimiTitle: '舟划过水纹，<br>花把白色送向远方。', fushimiBody: '十石舟从酒藏与花岸之间缓缓驶过，水面带走花瓣。白色第一次离开步道，开始顺着水流前行。',
    turnTitle: '白走到尽头，<br>第一枚红叶落下。', turnBody: '春风留下完整的白。时间继续向前，叶片从画面边缘出现，开始寻找旗帜的中心。',
    fujiAutumnTitle: '雪峰仍冷，<br>山脚的红已经燃起。', fujiAutumnBody: '河口湖的蓝与富士山的白托住第一层红叶。红从远景开始，向旗面中央靠近。',
    kiyomizuTitle: '木构伸向山谷，<br>红色拥有了体量。', kiyomizuBody: '清水舞台悬在层层红叶之上，人与建筑给秋色以尺度。中央的红不再是一枚符号，而是一片可以俯瞰的季节。',
    rurikoinTitle: '窗框收住庭园，<br>红色在漆面重现。', rurikoinBody: '书院把绯红、洋红、橙金与余绿切成几幅景，黑漆桌面接住交叠倒影。多种秋色由实入虚，向旗心汇成更深的红。',
    arashiyamaTitle: '河流切开山谷，<br>红色沿两岸深入。', arashiyamaBody: '保津川在岚山群峰之间转弯，近处深红枫枝与远坡秋色夹住翡翠水面。小舟标出峡谷尺度，红由岸边一路进入远山。',
    tojiTitle: '五重塔收住暮色，<br>红叶聚成最后一笔。', tojiBody: '塔影把散开的秋色收束成清晰轮廓。五种红叶风景向中央汇合，季节的太阳终于完整。', miyajimaTitle: '鸟居临海，<br>红色越过潮水。', miyajimaBody: '宫岛的枫叶从岸边向海上延展，潮水托起朱红的鸟居。季节的太阳至此越过山寺与庭园，抵达开阔的海。',
    arrive: '查看季节采样', scrollHint: '继续滚动 · 看白如何铺开，红如何聚拢',
    ledgerTitle: '白与红，<br>共同完成一面旗。', ledgerLead: '地点不是清单，而是颜色的证据。', ledgerVerse: '<p class="verse-white"><span class="verse-mark">花</span>樱花经过花廊、人行、水路、雪山田野、山海与群山，<em>铺开白</em>。</p><p class="verse-red"><span class="verse-mark">葉</span>红叶借雪峰、木构、漆影、河谷、塔影与海潮，<em>向中心聚拢</em>。</p>', ledgerWhite: '樱花之白', ledgerRed: '红叶之红',
    flagLabel: '樱花之白 · 红叶之红', equationSakura: '樱花之白', equationMomiji: '红叶之红', equationFlag: '日本之旗',
    afterTitle: '一面旗<br><em>两种季节的美。</em>', afterVerse: '<p class="verse-white"><span class="verse-mark">白</span>白，是六处樱花风景<em>共同铺开的底色</em>。</p><p class="verse-red"><span class="verse-mark">紅</span>红，是六处红叶风景<em>向中央汇成的太阳</em>。</p>', afterCoda: '熟悉的日本国旗，因此拥有了地点、时间与生命。', backTop: '回到顶部 ↑'
};

const ja = {
    siteTitle: '二つの季節の旗',
    siteTagline: '桜の白、紅葉の赤',
    particleToggle: '季節の粒子効果を切り替える',
    navTop: '序', navJourney: '白と赤', navLedger: '花と葉', navStory: '旗となる', scroll: '下へ',
    heroTitle: '春は花となり<br><em>秋は葉となる</em>', heroLead: '桜が春を白く広げ、紅葉が秋を一輪の赤へ集める。<br>二つの季節が、一つの旗を完成させる。',
    introOverlay: '二つの季節の旗', introKicker: '01 · 構想 · 季節でできた旗',
    introTitle: '白は花から、<br>赤は葉から。', introBody: '桜が旗の白を広げ、紅葉が中央の赤へ集まる。二つの色の由来をたどる旅。',
    osakaMintTitle: '花が回廊をつくり、<br>白に方向が生まれる。', osakaMintBody: '造幣局の遅咲きの桜が両側から重なり、人々を花の白へ迎え入れる。ここから旗の地色が密度を持ちはじめる。',
    yoshinoTitle: '山ひとつが咲き、<br>白は満ちていく。', yoshinoBody: '吉野山は麓から霧の先まで、桜を幾重にも重ねる。積み重なった白は、遠くから望める春になる。',
    philosophyTitle: '花の下を人が歩き、<br>白に尺度が生まれる。', philosophyBody: '水路、低い塀、人の歩幅が空を覆う枝を受け止める。旗の白は空白ではなく、入って呼吸できる場所になる。',
    funakawaTitle: '雪山が花の向こうに立ち、<br>白は田野を横切る。', funakawaBody: '残雪の朝日岳、舟川の桜並木、チューリップ、菜の花が同時に広がる。白は古寺を離れ、北陸の大きな春の地平へ出る。',
    sumauraTitle: '山と海のあいだで、<br>白は風に広がる。', sumauraBody: '須磨浦の桜は斜面を越え、瀬戸内海へひらく。海の青が花の白を際立たせ、春に遠景を与える。',
    fushimiTitle: '舟が水紋をひらき、<br>花が白を遠くへ運ぶ。', fushimiBody: '十石舟は酒蔵と桜の岸のあいだを進み、水面が花びらを連れていく。白は初めて小径を離れ、水の流れに乗る。',
    turnTitle: '白の終わりに、<br>最初の紅葉が落ちる。', turnBody: '春風は一面の白を残す。時間が進むと葉が画面の縁に現れ、旗の中心を探しはじめる。',
    fujiAutumnTitle: '雪峰は冷たいまま、<br>麓の赤が燃えはじめる。', fujiAutumnBody: '河口湖の青と富士の白が、最初の紅葉を支える。赤は遠景から旗の中心へ近づいていく。',
    kiyomizuTitle: '木の舞台が谷へ伸び、<br>赤に量感が生まれる。', kiyomizuBody: '清水の舞台が幾層もの紅葉の上に浮かび、人と建築が秋色の大きさを示す。中央の赤は記号ではなく、見渡せる季節になる。',
    rurikoinTitle: '窓枠が庭を切り取り、<br>赤は漆面にもう一度現れる。', rurikoinBody: '書院は緋、紅紫、橙金、残る緑を幾つもの景へ分け、黒い漆の机が重なる反射を受け止める。多彩な秋色が実像から虚像へ移り、旗の赤を深める。',
    arashiyamaTitle: '川が谷をひらき、<br>赤は両岸を奥へ進む。', arashiyamaBody: '保津川は嵐山の峰の間で曲がり、近くの深紅と遠い斜面の秋色が翡翠の水面を挟む。小舟が峡谷の尺度を示し、赤は岸から遠山へ続く。',
    tojiTitle: '五重塔が夕景を留め、<br>紅葉が最後の一筆になる。', tojiBody: '塔の影が広がる秋色を明快な輪郭へ収束させる。五つの紅葉風景が中心に集まり、季節の太陽が完成する。', miyajimaTitle: '鳥居が海に立ち、<br>赤は潮を越えていく。', miyajimaBody: '宮島の紅葉は岸から海へと伸び、潮が朱の鳥居を支える。季節の太陽は山寺と庭を越え、ひらけた海へ至る。',
    arrive: '季節の標本を見る', scrollHint: 'スクロール · 白が広がり、赤が集まるまで',
    ledgerTitle: '白と赤。<br>一つの旗へ。', ledgerLead: '地名は一覧ではなく、色の証しである。', ledgerVerse: '<p class="verse-white"><span class="verse-mark">花</span>桜は花の回廊、人の道、水路、雪山の田野、山海、群山へ、<em>白を広げ</em>。</p><p class="verse-red"><span class="verse-mark">葉</span>紅葉は雪峰、木組み、漆の影、川谷、塔影、潮を借りて、<em>中心へ集う</em>。</p>', ledgerWhite: '桜の白', ledgerRed: '紅葉の赤',
    flagLabel: '桜の白 · 紅葉の赤', equationSakura: '桜の白', equationMomiji: '紅葉の赤', equationFlag: '日本の旗',
    afterTitle: '一つの旗<br><em>二つの季節。</em>', afterVerse: '<p class="verse-white"><span class="verse-mark">白</span>白は、六つの桜風景が<em>ともに広げた地色</em>。</p><p class="verse-red"><span class="verse-mark">紅</span>赤は、六つの紅葉風景が<em>中央へ集めた太陽</em>。</p>', afterCoda: '見慣れた日本の旗が、こうして地・時・生命を宿す。', backTop: 'トップへ ↑'
};

const en = {
    siteTitle: 'A Flag of Two Seasons',
    siteTagline: 'White of Blossom, Red of Leaf',
    particleToggle: 'Toggle seasonal particle effects',
    navTop: 'Overture', navJourney: 'White & Red', navLedger: 'Flower & Leaf', navStory: 'The Flag', scroll: 'Begin',
    heroTitle: 'Spring becomes blossom<br><em>Autumn becomes leaf</em>', heroLead: 'Sakura spreads spring into white. Maple leaves gather autumn into red.<br>Two seasons complete one flag.',
    introOverlay: 'A FLAG OF TWO SEASONS', introKicker: '01 · CONCEPT · A SEASONAL FLAG',
    introTitle: 'White comes from blossom.<br>Red comes from leaf.', introBody: 'Sakura forms the field. Maple leaves gather toward the center. Follow both colors to the finished flag.',
    osakaMintTitle: 'Blossom closes into a passage.<br>White gains direction.', osakaMintBody: 'Late-blooming trees meet above the Mint walkway and people enter a field made from blossom. White gains its first layer of density here.',
    yoshinoTitle: 'A whole mountain blooms.<br>White becomes complete.', yoshinoBody: 'From the foothills into the mist, Yoshino layers blossom upon blossom. The accumulated white becomes a spring that can be seen from afar.',
    philosophyTitle: 'People walk beneath blossom.<br>White gains human scale.', philosophyBody: 'Canal, wall and footsteps hold the canopy in place. The flag\'s white is not emptiness, but a space that can be entered and breathed.',
    funakawaTitle: 'Snow peaks rise beyond blossom.<br>White crosses the fields.', funakawaBody: 'Snowbound Asahidake, Funakawa\'s cherry row, tulips and nanohana unfold at once. White leaves the temple and enters Hokuriku\'s open spring horizon.',
    sumauraTitle: 'Between mountain and sea,<br>wind makes white expansive.', sumauraBody: 'Sumaura\'s blossom crosses the hillside and opens toward the Seto Inland Sea. Marine blue makes the spring white unmistakable.',
    fushimiTitle: 'A boat opens the water.<br>Blossom carries white onward.', fushimiBody: 'The Jikkokubune passes between sake warehouses and flowering banks as the canal carries petals away. White leaves the path for the first time and follows the current.',
    turnTitle: 'At the end of white,<br>the first red leaf falls.', turnBody: 'Spring leaves a completed white field. Time moves on; leaves enter from the edges and begin searching for the flag\'s center.',
    fujiAutumnTitle: 'The snowy peak stays cool.<br>Red ignites below.', fujiAutumnBody: 'Lake blue and Fuji white hold the first layer of maple red. It begins in the distance and moves toward the center.',
    kiyomizuTitle: 'Timber reaches into the valley.<br>Red gains volume.', kiyomizuBody: 'Kiyomizu\'s stage floats above layered foliage. People and architecture reveal that the central red is a season with measurable scale.',
    rurikoinTitle: 'The window holds the garden.<br>Red returns in lacquer.', rurikoinBody: 'The shoin frames crimson, magenta, orange-gold and lingering green while black lacquer receives their layered reflections. Many autumn colors converge into a deeper red.',
    arashiyamaTitle: 'The river opens the valley.<br>Red follows both banks.', arashiyamaBody: 'The Hozu River bends between Arashiyama\'s peaks as near crimson and distant autumn slopes hold its jade surface. A small boat gives the gorge scale.',
    tojiTitle: 'The pagoda holds dusk.<br>Maple makes the final mark.', tojiBody: 'The tower gathers scattered autumn color into a clear silhouette. Five red landscapes converge and the seasonal sun becomes complete.', miyajimaTitle: 'The torii meets the sea.<br>Red crosses the tide.', miyajimaBody: 'Miyajima maple reaches from the shore toward the water, while the tide holds the vermilion torii. The seasonal sun moves beyond mountain temples and gardens into the open sea.',
    arrive: 'View the seasonal study', scrollHint: 'Keep scrolling · watch white spread and red gather',
    ledgerTitle: 'White and red,<br>one completed flag.', ledgerLead: 'These places are not a list, but evidence of color.', ledgerVerse: '<p class="verse-white"><span class="verse-mark">F</span>Through flower corridor, footpath, waterway, snowfield, mountain sea and ranges, blossom <em>spreads the white</em>.</p><p class="verse-red"><span class="verse-mark">L</span>Through snow peak, timber, lacquer, river valley, pagoda and tide, maple <em>gathers toward the center</em>.</p>', ledgerWhite: 'Sakura White', ledgerRed: 'Momiji Red',
    flagLabel: 'SAKURA WHITE · MOMIJI RED', equationSakura: 'Sakura white', equationMomiji: 'Momiji red', equationFlag: 'Japan\'s flag',
    afterTitle: 'One flag.<br><em>Two living seasons.</em>', afterVerse: '<p class="verse-white"><span class="verse-mark">W</span>White is the field <em>six sakura landscapes spread together</em>.</p><p class="verse-red"><span class="verse-mark">R</span>Red is the sun <em>six maple landscapes gather at the center</em>.</p>', afterCoda: 'The familiar flag of Japan thus gains place, time and life.', backTop: 'Back to top ↑'
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
    document.querySelectorAll('[data-copy-aria]').forEach(element => {
        if (!dictionary[element.dataset.copyAria]) return;
        element.setAttribute('aria-label', dictionary[element.dataset.copyAria]);
        element.setAttribute('title', dictionary[element.dataset.copyAria]);
    });
    localStorage.setItem('hanami-language', language);
}

document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
setLanguage(localStorage.getItem('hanami-language') || 'zh');
measure();

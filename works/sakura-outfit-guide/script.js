document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const audienceButtons = [...document.querySelectorAll('[data-audience]')];
    const audienceStatus = document.getElementById('audience-status');
    const metaDescription = document.querySelector('meta[name="description"]');

    const getAssetStem = (path) => path.split('/').pop().replace(/\.[^.]+$/, '');
    const getWomenAssetPath = (path) => `assets/women/${getAssetStem(path)}.webp`;
    const getMenAssetPath = (path) => `assets/men-youth/${getAssetStem(path)}.webp`;

    const captureText = (selector) => document.querySelector(selector)?.innerHTML ?? '';
    const captureTexts = (selector) => [...document.querySelectorAll(selector)].map(element => element.innerHTML);
    const captureImages = (selector) => [...document.querySelectorAll(selector)].map(image => ({
        src: image.getAttribute('src'),
        alt: image.getAttribute('alt')
    }));

    const menContent = {
        title: '男士樱花季穿搭指南｜青年与轻熟风格',
        description: '面向大学生、青年与年轻成人的男士樱花季穿搭指南，融合学院风、City Boy、日系街头与轻熟简约造型。',
        audienceKicker: '学院灵感 · 日系街头 · 轻熟质感',
        heroTitle: '春の樱<br><span>男士多风格穿搭指南</span>',
        heroDescription: '从学院针织、棒球夹克到 City Boy 与利落风衣，用年轻松弛感和成熟质感赴一场樱花之约。',
        climateHeader: '日本樱花季（3月下旬-4月上旬）通常在 10°C - 20°C 之间。大学生、青年与年轻成人可用轻薄叠穿，在学院感、街头感和轻熟气质之间灵活切换。',
        climateTitle: '不装成熟，也不失分寸',
        climateIntro: '年轻化不等于堆满潮流元素，抓住版型、层次和一件风格单品就够了：',
        climateItems: [
            '<i data-lucide="check-circle" class="icon-sakura"></i> <strong>内层</strong>：白 T、条纹衫或牛津衬衫，清爽基础款适合反复组合。',
            '<i data-lucide="check-circle" class="icon-sakura"></i> <strong>中层</strong>：针织背心、学院开衫或轻薄卫衣，增加清爽的学院与街头气质。',
            '<i data-lucide="check-circle" class="icon-sakura"></i> <strong>外层</strong>：棒球夹克、短风衣、宽松西装或轻机能外套，根据行程切换氛围。'
        ],
        climateTip: '提示：全身保留一个年轻焦点即可，例如棒球帽、复古球鞋或学院针织，其余单品尽量干净。',
        lookbookHeader: '五套面向大学生、青年与年轻成人的混合造型，从学院感、日系街头到轻熟通勤，覆盖赏樱的一整天。',
        looks: [
            { title: '青年感短风衣 (Young Trench)', description: '短款卡其风衣内搭白 T 或条纹衫，下装换成宽松直筒裤与复古球鞋。既保留风衣的利落，也很适合大学生周末出游的轻快造型。' },
            { title: '松弛休闲西装 (Relaxed Suit)', description: '低饱和宽松西装搭配连帽卫衣或针织 Polo，用板鞋替代皮鞋。适合年轻成人从白天展览逛到夜间餐厅，不会显得过度正式。' },
            { title: '学院针织背心 (College Knit)', description: '针织背心叠穿宽松牛津衬衫，搭配深色直筒裤与乐福鞋。提取学院灵感但不复刻制服，清爽又有书卷气。' },
            { title: '棒球夹克日系街头 (Varsity Street)', description: '棒球夹克搭配素色卫衣、宽松卡其裤和复古运动鞋，用短外套拉高比例。年轻、好走，也很适合公园与海边的动态照片。' },
            { title: 'City Boy 宽松衬衫', description: '大尺码蓝白衬衫搭配海军蓝阔腿裤与帆布托特包，以空气感版型呈现日系 City Boy。加入轻机能斜挎包，也能自然切换到城市街头。' }
        ],
        galleryHeader: '同一段樱花行程，用学院风、City Boy、棒球夹克、轻机能和轻熟简约轮换节奏，适合大学生、青年与年轻成人按场景参考。',
        galleryDescriptions: [
            '短风衣配宽松直筒裤和复古球鞋，青年感轮廓适合海边晨步。',
            '针织背心叠穿牛津衬衫，以清爽学院灵感融入镰仓老街。',
            '雾蓝短夹克搭配白 T 和深色长裤，古寺前清爽不拘谨。',
            '棒球夹克叠穿连帽卫衣，用宽松牛仔裤回应湘南海岸的自由感。',
            '宽松灰西装搭配针织 Polo 与板鞋，让青年气质和成熟场景自然衔接。',
            '丹宁夹克、工装裤与复古跑鞋，呈现轻快的日系街头风。',
            '深蓝短大衣搭配宽松高领与球鞋，夜樱下沉静却不显老成。',
            '黑色内搭配灰西装和银色配饰，年轻成人的都市夜行造型。',
            '条纹衫、宽松衬衫与帆布包，轻松演绎上野公园 City Boy。',
            '米色猎装夹克搭配直筒牛仔裤，在水岸边保留轻机能感。',
            '短风衣配棒球帽和白鞋，河畔微风中是清爽的青年绅士轮廓。',
            '白衬衫外搭针织背心与托特包，适合慢逛老街的学院造型。',
            '柔软开衫搭配宽松长裤，湖畔午后呈现安静的文艺青年气质。',
            '深色大衣内搭连帽卫衣，以成熟外层平衡年轻街头感。',
            '奶油针织衫配宽松军裤与球鞋，像春日阳光一样放松温暖。',
            '军绿轻机能外套搭配卡其裤，在河岸景色里利落又耐走。',
            '棒球夹克配条纹衫与复古跑鞋，和奈良小鹿同框更显活力。',
            '连帽卫衣叠穿防风马甲，适合堤坝长距离步行和动态抓拍。',
            '现代羽织外套搭配宽裤，用年轻版型向京都传统气韵致意。',
            '驼色大衣内搭黑色针织，夜间用成熟配色稳住整体质感。',
            '轻机能夹克、工装裤与斜挎包，在旧铁轨间呈现城市探索感。',
            '针织背心叠穿宽松衬衫，哲学之道上是自然的青年书卷气。',
            '奶油针织搭配大地色宽裤，轻松融入岚山山水和春日微风。',
            '挺括短风衣搭配白 T 与深色长裤，在木构建筑前干净有精神。',
            '长大衣配切尔西靴和小型斜挎包，夜色里成熟但不刻板。',
            '立领夹克与复古球鞋组合，适合热闹夜樱中的年轻节日氛围。',
            '宽松亚麻西装搭配针织 Polo，用透气材质保持春日松弛感。',
            '极简西装配白色板鞋，在艳丽红樱前显得清醒而年轻。',
            '工装背心叠穿卫衣与宽裤，万博公园里呈现轻机能运动感。',
            '中长大衣内搭简洁卫衣，在城堡背景前兼顾气场和年龄感。',
            '防风外套配束脚裤与跑鞋，水岸行程轻便又有街头活力。',
            '衬衫叠穿薄针织背心，用清爽学院层次回应晚樱通道。',
            '帆布短外套搭配深色直筒裤，在朱红古寺前利落耐看。',
            '浅色亚麻西装配复古球鞋，与白城粉樱形成轻盈的成熟混搭。'
        ],
        detailsHeader: '青年与轻熟混搭的关键，是用配饰控制风格：球鞋和斜挎包负责活力，腕表与皮鞋增加稳重质感。',
        detailTitles: ['青年感配饰', '球鞋、乐福鞋 & 轻机能包'],
        detailDescriptions: [
            '棒球帽、细框眼镜与简洁腕表任选一到两件，既能增加学院和街头气质，也不会显得刻意装嫩。',
            '复古运动鞋适合全天步行，乐福鞋负责更成熟的场景；帆布托特或轻机能斜挎包则让造型更贴近年轻日常。'
        ],
        vibeTitle: '夜樱之后，风格仍然年轻',
        vibeDescription: '把白天的学院与街头层次藏进一件深色外套，青年感和轻熟质感可以同时存在。',
        images: captureImages('main img, section img'),
        heroImage: document.querySelector('.hero-bg').style.backgroundImage,
        vibeImage: document.querySelector('.vibe-bg').style.backgroundImage
    };

    const womenContent = {
        title: '女士樱花季穿搭指南｜青年与轻熟风格',
        description: '面向大学生、青年与年轻成人的女士樱花季穿搭指南，融合学院灵感、轻 Y2K、甜酷、森系与 City Girl。',
        audienceKicker: '学院灵感 · 甜酷森系 · City Girl',
        heroTitle: '春の樱<br><span>女士多风格穿搭指南</span>',
        heroDescription: '从学院灵感、针织背心与短开衫，到轻 Y2K、甜酷、森系与 City Girl，自由切换年轻和轻熟气质。',
        climateHeader: '日本樱花季（3月下旬-4月上旬）通常在 10°C - 20°C 之间。大学生、青年与年轻成人可用灵活叠穿应对温差，也让学院、甜酷和轻熟风格自然切换。',
        climateTitle: '年轻有层次，不被单一风格定义',
        climateIntro: '用基础层稳定舒适度，再让针织、短外套和配饰决定当天的风格方向：',
        climateItems: [
            '<i data-lucide="check-circle" class="icon-sakura"></i> <strong>内层</strong>：白衬衫、短版上衣或柔软打底，保持舒适并留出叠穿空间。',
            '<i data-lucide="check-circle" class="icon-sakura"></i> <strong>中层</strong>：针织背心、短开衫或薄卫衣，可切换学院、森系与轻 Y2K 氛围。',
            '<i data-lucide="check-circle" class="icon-sakura"></i> <strong>外层</strong>：棒球夹克、短风衣、轻机能夹克或柔软西装，决定甜酷与 City Girl 的轮廓。'
        ],
        climateTip: '提示：JK 灵感学院风（成年大学生造型）只提取百褶裙、针织和领带等元素，重点仍是自然、舒适与好搭配。',
        lookbookHeader: '五套面向大学生、青年与年轻成人的造型，把学院灵感、甜酷、森系、City Girl 与轻 Y2K 放进真实赏樱行程。',
        looks: [
            {
                title: '学院针织背心 (College Prep)',
                description: '白衬衫叠穿针织背心与百褶中长裙，搭配乐福鞋和短袜。用更松弛的比例完成清爽自然的赏樱学院风。'
            },
            {
                title: '棒球夹克甜酷风 (Varsity Mix)',
                description: '短款棒球夹克搭配素色上衣、百褶裙或工装长裤，再用厚底运动鞋增加力量感。甜与酷保持平衡，很适合公园、海边和年轻化街拍。'
            },
            {
                title: '短款针织开衫 (Cropped Cardigan)',
                description: '奶油色短开衫搭配高腰百褶裙或直筒牛仔裤，内搭小背心形成轻 Y2K 层次。迷你肩包与复古运动鞋让造型更年轻，但不过度追逐夸张潮流。'
            },
            {
                title: '森系轻盈叠穿 (Mori Layering)',
                description: '柔软衬衫裙叠穿短针织或亚麻马甲，配自然色袜套与轻便皮鞋。低饱和材质和松弛轮廓适合庭园、古寺与安静的河岸樱花。'
            },
            {
                title: 'City Girl 轻机能造型',
                description: '短风衣或轻机能夹克搭配短版上衣和高腰阔腿裤，再加入银色配饰与斜挎包。保留城市行动力，也适合从白天赏樱切换到夜间约会。'
            }
        ],
        galleryHeader: '同一段樱花行程，以学院灵感、短开衫、棒球夹克、轻 Y2K、甜酷、森系、City Girl 和轻机能轮换年轻节奏。',
        galleryDescriptions: [
            '短风衣配百褶裙和运动鞋，海风里是轻快的学院混搭。',
            '针织背心叠穿白衬衫，以大学生制服灵感融入镰仓老街。',
            '短开衫配柔软长裙，让古寺背景更显清新安静。',
            '棒球夹克搭配工装裤与厚底鞋，甜酷气质迎接湘南海风。',
            '柔灰西装搭短版上衣和长裤，呈现年轻 City Girl 的利落感。',
            '丹宁夹克配百褶裙与复古跑鞋，公园午后轻松又有活力。',
            '深蓝短风衣搭配银色配饰，在夜樱灯影下呈现轻 Y2K 氛围。',
            '黑色连衣裙外搭宽松西装，以甜酷比例融入都市夜色。',
            '宽松衬衫配直筒牛仔裤和帆布包，是自然的日系年轻街头。',
            '米白猎装夹克搭配工装半裙，在水岸樱花间轻机能又醒目。',
            '短风衣与高腰阔腿裤顺着河风展开，清爽呈现 City Girl 轮廓。',
            '白衬衫、针织披肩与百褶裙，适合大学生慢逛怀旧老街。',
            '奶油短开衫配碎花裙，以森系柔软感回应湖畔花瓣。',
            '墨色长大衣内搭轻 Y2K 上衣，垂樱灯光下成熟又有个性。',
            '象牙白粗针织与浅杏长裤，营造温暖松弛的年轻森系。',
            '鼠尾草绿短风衣配米色伞裙，让自然色彩融入河岸樱花。',
            '棒球夹克搭配格纹百褶裙，呈现自然的学院甜酷灵感。',
            '连帽卫衣叠穿防风马甲与直筒裤，长距离步行也保持轻机能感。',
            '现代羽织外套配简洁长裙，用年轻流动廓形回应古寺气韵。',
            '焦糖长大衣内搭短开衫，在东寺暖光中平衡成熟与年轻感。',
            '轻机能夹克与工装半裙组合，在旧铁轨间展现城市探索气质。',
            '针织背心叠穿宽松衬衫，哲学之道上呈现清新书卷气。',
            '奶油针织与大地色阔腿裤衔接，松弛融入岚山自然景色。',
            '挺括短风衣内搭白裙，在木结构前保持年轻而有力量的气场。',
            '深色长大衣配方头短靴与腋下包，在青石路上走出 City Girl 节奏。',
            '棒球夹克配轻盈半裙，融入夜樱人潮中的年轻节日氛围。',
            '浅亚麻西装搭配短版针织，透气材质呈现轻熟松弛感。',
            '象牙白套装加入银色配饰，让红垂樱前的造型更轻 Y2K。',
            '工装背心叠穿衬衫与伞裙，万博公园里轻机能又有层次。',
            '中长浅灰大衣搭高腰长裤，在城堡背景前撑起年轻气场。',
            '防风夹克配抽绳长裙与运动鞋，水岸行程轻便又甜酷。',
            '薄针织背心叠穿衬衫裙，以清爽学院层次映衬晚樱通道。',
            '米色帆布短外套配深色长裙，在朱红塔楼前利落耐看。',
            '浅色亚麻西装搭柔粉短上衣，与白城粉樱形成年轻成熟混搭。'
        ],
        detailsHeader: '青年与轻熟混搭不需要堆满配饰，用鞋包和少量金属光泽切换学院、甜酷、森系与 City Girl 即可。',
        detailTitles: ['发饰、领带 & 银色点缀', '乐福鞋、厚底鞋 & 轻机能包'],
        detailDescriptions: [
            '细领带、发箍和徽章可强化学院灵感；银色耳饰与窄框眼镜则能把造型切换到轻 Y2K 和甜酷方向。',
            '乐福鞋适合学院与森系，厚底运动鞋负责甜酷；腋下包、帆布托特和轻机能斜挎包覆盖不同日程。'
        ],
        vibeTitle: '夜樱下，年轻风格继续生长',
        vibeDescription: '把白天的学院、森系或轻 Y2K 藏进一件保暖外套，青年感与轻熟氛围不必二选一。'
    };

    const imageElements = [...document.querySelectorAll('main img, section img')];
    const heroBackground = document.querySelector('.hero-bg');
    const vibeBackground = document.querySelector('.vibe-bg');

    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = value;
        }
    };

    const setTexts = (selector, values) => {
        document.querySelectorAll(selector).forEach((element, index) => {
            if (values[index] !== undefined) {
                element.innerHTML = values[index];
            }
        });
    };

    const updateImages = (audience) => {
        imageElements.forEach((image, index) => {
            const original = menContent.images[index];
            if (!original) {
                return;
            }

            image.src = audience === 'women' ? getWomenAssetPath(original.src) : getMenAssetPath(original.src);
            if (audience === 'women') {
                image.alt = `${original.alt}女士樱花季穿搭展示`;
            } else {
                image.alt = `${original.alt}男士青年穿搭展示`;
            }
        });

        if (audience === 'women') {
            heroBackground.style.backgroundImage = `url('${getWomenAssetPath('assets/hero_sakura.png')}')`;
            heroBackground.style.backgroundPosition = 'center 32%';
            vibeBackground.style.backgroundImage = `url('${getWomenAssetPath('assets/evening_yozakura.png')}')`;
        } else {
            heroBackground.style.backgroundImage = `url('${getMenAssetPath('assets/hero_sakura.png')}')`;
            heroBackground.style.backgroundPosition = 'center 18%';
            vibeBackground.style.backgroundImage = `url('${getMenAssetPath('assets/evening_yozakura.png')}')`;
        }
    };

    const applyAudience = (audience, announce = true) => {
        const content = audience === 'women' ? womenContent : menContent;
        document.body.classList.add('audience-changing');
        document.documentElement.dataset.audience = audience;
        document.title = content.title;
        if (metaDescription) {
            metaDescription.content = content.description;
        }

        setText('.hero-content h1', content.heroTitle);
        setText('.hero-content > p:not(.audience-kicker)', content.heroDescription);
        setText('.audience-kicker', content.audienceKicker);
        setText('#climate .section-header p', content.climateHeader);
        setText('#climate .text-box h3', content.climateTitle);
        setText('#climate .text-box > p:not(.highlight-text)', content.climateIntro);
        setTexts('#climate .feature-list li', content.climateItems);
        setText('#climate .highlight-text', content.climateTip);
        setText('#lookbook .section-header p', content.lookbookHeader);
        document.querySelectorAll('.look-item').forEach((item, index) => {
            const look = content.looks[index];
            if (look) {
                item.querySelector('h3').innerHTML = look.title;
                item.querySelector('p').innerHTML = look.description;
            }
        });
        setText('#gallery .section-header p', content.galleryHeader);
        setTexts('.gallery-desc', content.galleryDescriptions);
        setText('#details .section-header p', content.detailsHeader);
        setTexts('.detail-card h3', content.detailTitles);
        setTexts('.detail-card p', content.detailDescriptions);
        setText('.vibe-content h2', content.vibeTitle);
        setText('.vibe-content p', content.vibeDescription);
        updateImages(audience);

        audienceButtons.forEach(button => {
            const isActive = button.dataset.audience === audience;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        if (announce && audienceStatus) {
            audienceStatus.textContent = `已切换至${audience === 'women' ? '女士' : '男士'}穿搭版本`;
        }

        try {
            localStorage.setItem('sakura-outfit-audience', audience);
        } catch (error) {
            console.warn('无法保存穿搭版本偏好。', error);
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }

        requestAnimationFrame(() => {
            document.body.classList.remove('audience-changing');
        });
    };

    audienceButtons.forEach(button => {
        button.addEventListener('click', () => applyAudience(button.dataset.audience));
    });

    let savedAudience = 'men';
    try {
        const storedAudience = localStorage.getItem('sakura-outfit-audience');
        if (storedAudience === 'women' || storedAudience === 'men') {
            savedAudience = storedAudience;
        }
    } catch (error) {
        console.warn('无法读取穿搭版本偏好。', error);
    }

    applyAudience(savedAudience, false);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    const revealElements = document.querySelectorAll('.reveal');

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    };

    const revealOptions = {
        threshold: 0.01,
        rootMargin: '0px 0px -100px 0px'
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
});

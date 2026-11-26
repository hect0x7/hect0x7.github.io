// Pure Cinema Narrative HUD Controller for 《时空织物 · 一束光子的 138 亿年》(v4 — 5 Pure Astrophysics Acts)
// Zero workbench chrome, zero chapter dock, zero exposed sliders, zero floating ball clutter.
import { createAudioEngine } from './audio.js';
import { createCosmicEngine } from './engine.js';

const ACT_META = {
  bigbang: {
    title: '01 · 奇点与宇宙暴胀',
    sub: 'PLANCK SINGULARITY & INFLATION',
    line: '最初只有一点炽热的微光，尚未有时间与空间',
    cue: '轻触奇点或向下轻滚，见证宇宙沿时间轴暴胀展开',
  },
  curvature: {
    title: '02 · 广义相对论 · 时空曲率',
    sub: 'FLAMM PARABOLOID & GRAVITATIONAL WAVES',
    line: '星系物质汇聚成阱，质量在此告诉时空如何弯曲',
    cue: '轻触时空织物投放星体，或点击双星激起引力波涟漪',
  },
  lensing: {
    title: '03 · 引力透镜 · 弯曲星海',
    sub: 'GRAVITATIONAL LENSING & EINSTEIN RINGS',
    line: '透明的引力质量悬浮于星海之间，悄然折弯远方星系的星光',
    cue: '移动指针滑过旋涡星系观测爱因斯坦环，轻触透镜核心坍缩入黑洞',
  },
  blackhole: {
    title: '04 · 黑洞视界 · 史瓦西深渊',
    sub: 'SCHWARZSCHILD EVENT HORIZON',
    line: '当质量突破史瓦西半径，时空彻底塌缩为吞噬光线的深渊',
    cue: '拖动视角环绕光子环与吸积盘，轻触事件视界穿越因果边界',
  },
  lightcone: {
    title: '05 · 因果光锥 · 回归奇点',
    sub: 'MINKOWSKI LIGHT CONE & CAUSALITY',
    line: '越过视界，过去与未来被对称的 45° 光锥清晰划界',
    cue: '轻触双光锥发射因果光脉冲，或轻触底端原点重返宇宙初生',
  },
};

async function boot() {
  const isStatic = document.documentElement.classList.contains('layout-static');
  if (isStatic) return;

  const els = {
    canvas: document.getElementById('stageCanvas'),
    bootCurtain: document.getElementById('bootCurtain'),
    chapterTitle: document.getElementById('chapterTitle'),
    chapterSub: document.getElementById('chapterSub'),
    hoverPartPill: document.getElementById('hoverPartPill'),
    narrativeLine: document.getElementById('narrativeLine'),
    narrativeCue: document.getElementById('narrativeCue'),
    btnAudio: document.getElementById('btnAudio'),
    btnAutoStory: document.getElementById('btnAutoStory'),
    autoStoryLabel: document.getElementById('autoStoryLabel'),
  };
  if (!els.canvas) return;

  let currentLine = '';
  let currentCue = '';
  let lineSwapTimer = null;
  let cueRevealTimer = null;
  let isAutoStory = false;

  function applyNarrative(line, cue, { instant = false } = {}) {
    const nextLine = typeof line === 'string' ? line.trim() : '';
    const nextCue = typeof cue === 'string' ? cue.trim() : '';

    const lineChanged = nextLine && nextLine !== currentLine;
    const cueChanged = nextCue !== currentCue;

    if (!lineChanged && !cueChanged) return;

    if (lineChanged && els.narrativeLine) {
      currentLine = nextLine;
      if (lineSwapTimer) window.clearTimeout(lineSwapTimer);
      if (instant) {
        els.narrativeLine.textContent = nextLine;
        els.narrativeLine.classList.remove('is-fading');
      } else {
        els.narrativeLine.classList.add('is-fading');
        lineSwapTimer = window.setTimeout(() => {
          els.narrativeLine.textContent = nextLine;
          els.narrativeLine.classList.remove('is-fading');
        }, 260);
      }
    }

    if (els.narrativeCue && (cueChanged || lineChanged)) {
      currentCue = nextCue;
      if (cueRevealTimer) window.clearTimeout(cueRevealTimer);
      if (!nextCue) {
        els.narrativeCue.classList.add('is-hidden');
        els.narrativeCue.textContent = '';
      } else if (instant) {
        els.narrativeCue.textContent = nextCue;
        els.narrativeCue.classList.remove('is-hidden');
      } else {
        els.narrativeCue.classList.add('is-hidden');
        cueRevealTimer = window.setTimeout(() => {
          els.narrativeCue.textContent = nextCue;
          els.narrativeCue.classList.remove('is-hidden');
        }, lineChanged ? 1200 : 320);
      }
    }
  }

  function syncChapterHeader(actId, worldInfo = null) {
    document.body.dataset.act = actId;
    const meta = ACT_META[actId] || ACT_META.bigbang;
    if (els.chapterTitle) {
      els.chapterTitle.textContent = (worldInfo && worldInfo.title) || meta.title;
    }
    if (els.chapterSub) {
      els.chapterSub.textContent = meta.sub;
    }
  }

  function syncHoverLabel(label) {
    if (!els.hoverPartPill) return;
    if (label) {
      els.hoverPartPill.textContent = label;
      els.hoverPartPill.classList.add('is-visible');
    } else {
      els.hoverPartPill.classList.remove('is-visible');
    }
  }

  function syncMuteUI(muted) {
    if (!els.btnAudio) return;
    els.btnAudio.classList.toggle('is-muted', !!muted);
    els.btnAudio.setAttribute('aria-pressed', muted ? 'false' : 'true');
  }

  function syncAutoStoryUI(enabled) {
    isAutoStory = !!enabled;
    if (els.btnAutoStory) {
      els.btnAutoStory.classList.toggle('is-active', isAutoStory);
      els.btnAutoStory.setAttribute('aria-pressed', String(isAutoStory));
    }
    if (els.autoStoryLabel) {
      els.autoStoryLabel.textContent = isAutoStory ? '暂停叙事' : '自动叙事';
    }
  }

  const audio = createAudioEngine();

  const engine = await createCosmicEngine({
    canvas: els.canvas,
    audio,
    callbacks: {
      onWorldChange(info) {
        syncChapterHeader(info.id, info);
        const meta = ACT_META[info.id];
        if (!info.hasCustomNarrative && meta) {
          applyNarrative(meta.line, meta.cue, { instant: !!info.instant });
        }
      },
      onNarrativeChange(line, cue, opts) {
        applyNarrative(line, cue, opts);
      },
      onHoverLabel(label) {
        syncHoverLabel(label);
      },
      onMuteChange(muted) {
        syncMuteUI(muted);
      },
      onAutoStoryChange(on) {
        syncAutoStoryUI(on);
      },
    },
  });

  if (els.btnAudio) {
    els.btnAudio.addEventListener('click', () => {
      const muted = audio.toggleMute();
      syncMuteUI(muted);
    });
  }

  if (els.btnAutoStory) {
    els.btnAutoStory.addEventListener('click', () => {
      audio.unlock();
      audio.playClickTone();
      const next = engine.setAutoStory(!isAutoStory);
      syncAutoStoryUI(next);
    });
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (els.bootCurtain) els.bootCurtain.classList.add('is-done');
    });
  });

  window.addEventListener('beforeunload', () => {
    if (lineSwapTimer) window.clearTimeout(lineSwapTimer);
    if (cueRevealTimer) window.clearTimeout(cueRevealTimer);
    engine.dispose();
    audio.dispose();
  });
}

boot().catch((err) => {
  console.error('[cosmic-spacetime] Boot failed:', err);
  const curtain = document.getElementById('bootCurtain');
  if (curtain) curtain.classList.add('is-done');
});

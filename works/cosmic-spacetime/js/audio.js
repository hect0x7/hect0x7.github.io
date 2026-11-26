// 5-Act Pure Cosmic WebAudio Spatial Soundscape for 《时空织物 · 一束光子的 138 亿年》
// Acts: bigbang, curvature, lensing, blackhole, lightcone — zero external audio files (zero 404s).

export function createAudioEngine() {
  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let muted = false;
  let unlocked = false;
  let activeAct = 'bigbang';

  const buses = {};

  function buildNoiseBuffer(audioCtx) {
    const length = audioCtx.sampleRate * 3;
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.052;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  function makeBus(audioCtx) {
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(masterGain);
    return { gain, nodes: [] };
  }

  // Act 1 (bigbang): Primordial low harmonic swell + crystalline acoustic plasma shimmer
  function setupBigBangBus(audioCtx) {
    const bus = makeBus(audioCtx);
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 540;
    lp.connect(bus.gain);

    [
      { freq: 55.0, type: 'sine', vol: 0.11 },
      { freq: 110.0, type: 'triangle', vol: 0.052 },
      { freq: 164.81, type: 'sine', vol: 0.040 },
      { freq: 329.63, type: 'sine', vol: 0.015 },
    ].forEach(({ freq, type, vol }, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = audioCtx.createGain();
      g.gain.value = vol;
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.09 + idx * 0.03;
      const lg = audioCtx.createGain();
      lg.gain.value = vol * 0.35;
      lfo.connect(lg).connect(g.gain);
      osc.connect(g).connect(lp);
      osc.start();
      lfo.start();
      bus.nodes.push(osc, lfo);
    });

    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1480;
    bp.Q.value = 3.2;
    const sg = audioCtx.createGain();
    sg.gain.value = 0.042;
    src.connect(bp).connect(sg).connect(bus.gain);
    src.start();
    bus.nodes.push(src);
    return bus;
  }

  // Act 2 (curvature): Deep spacetime metric drone
  function setupCurvatureBus(audioCtx) {
    const bus = makeBus(audioCtx);
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    lp.connect(bus.gain);

    [
      { freq: 65.41, type: 'sine', vol: 0.12 },
      { freq: 65.72, type: 'sine', vol: 0.072 },
      { freq: 98.0, type: 'triangle', vol: 0.044 },
      { freq: 196.0, type: 'sine', vol: 0.020 },
    ].forEach(({ freq, type, vol }) => {
      const osc = audioCtx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = audioCtx.createGain();
      g.gain.value = vol;
      osc.connect(g).connect(lp);
      osc.start();
      bus.nodes.push(osc);
    });
    return bus;
  }

  // Act 3 (lensing): Crystalline deep-field starlight glass shimmer (distinct from black hole!)
  function setupLensingBus(audioCtx) {
    const bus = makeBus(audioCtx);
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1650;
    lp.connect(bus.gain);

    [
      { freq: 146.83, vol: 0.055 }, // D3 warm foundation
      { freq: 220.0, vol: 0.036 },  // A3
      { freq: 329.63, vol: 0.024 }, // E4
      { freq: 587.33, vol: 0.014 }, // D5 crystalline shimmer
      { freq: 880.0, vol: 0.008 },  // A5 optical overtone
    ].forEach(({ freq, vol }, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = audioCtx.createGain();
      g.gain.value = vol;
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.11 + idx * 0.045;
      const lg = audioCtx.createGain();
      lg.gain.value = vol * 0.42;
      lfo.connect(lg).connect(g.gain);
      osc.connect(g).connect(lp);
      osc.start();
      lfo.start();
      bus.nodes.push(osc, lfo);
    });
    return bus;
  }

  // Act 4 (blackhole): Deep Schwarzschild event-horizon sub-hum + photon-sphere hairline tone
  function setupBlackHoleBus(audioCtx) {
    const bus = makeBus(audioCtx);
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 175;
    lp.connect(bus.gain);

    [
      { freq: 46.25, type: 'sine', vol: 0.145 },
      { freq: 46.62, type: 'sine', vol: 0.088 },
      { freq: 69.30, type: 'triangle', vol: 0.046 },
    ].forEach(({ freq, type, vol }) => {
      const osc = audioCtx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = audioCtx.createGain();
      g.gain.value = vol;
      osc.connect(g).connect(lp);
      osc.start();
      bus.nodes.push(osc);
    });

    const photonOsc = audioCtx.createOscillator();
    photonOsc.type = 'sine';
    photonOsc.frequency.value = 932.33;
    const pg = audioCtx.createGain();
    pg.gain.value = 0.007;
    photonOsc.connect(pg).connect(bus.gain);
    photonOsc.start();
    bus.nodes.push(photonOsc);
    return bus;
  }

  // Act 5 (lightcone): Airy glass-harmonic major-9th chords
  function setupLightConeBus(audioCtx) {
    const bus = makeBus(audioCtx);
    const freqs = [261.63, 392.0, 493.88, 587.33, 783.99];
    freqs.forEach((f, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = audioCtx.createGain();
      const base = idx < 2 ? 0.030 : 0.014;
      g.gain.value = base;

      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.12 + idx * 0.04;
      const lg = audioCtx.createGain();
      lg.gain.value = base * 0.42;
      lfo.connect(lg).connect(g.gain);

      osc.connect(g).connect(bus.gain);
      osc.start();
      lfo.start();
      bus.nodes.push(osc, lfo);
    });
    return bus;
  }

  function applyActMix(instant = false) {
    if (!ctx || !unlocked) return;
    const now = ctx.currentTime;
    const tc = instant ? 0.02 : 0.65;
    Object.entries(buses).forEach(([id, bus]) => {
      const target = id === activeAct ? 1.0 : 0.0001;
      bus.gain.gain.setTargetAtTime(target, now, tc);
    });
  }

  function unlock() {
    if (unlocked) {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0.0001 : 0.42;
      masterGain.connect(ctx.destination);

      noiseBuffer = buildNoiseBuffer(ctx);
      buses.bigbang = setupBigBangBus(ctx);
      buses.curvature = setupCurvatureBus(ctx);
      buses.lensing = setupLensingBus(ctx);
      buses.blackhole = setupBlackHoleBus(ctx);
      buses.lightcone = setupLightConeBus(ctx);

      unlocked = true;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      applyActMix(true);
    } catch {
      // Ignore blocked audio contexts gracefully
    }
  }

  function setAct(id) {
    if (!id) return;
    activeAct = id;
    applyActMix(false);
  }

  function setMuted(nextMuted) {
    muted = !!nextMuted;
    if (ctx && masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0.0001 : 0.42, ctx.currentTime, 0.08);
    }
    return muted;
  }

  function toggleMute() {
    unlock();
    return setMuted(!muted);
  }

  function isMuted() {
    return muted;
  }

  function playGravWaveChirp(intensity = 1.0) {
    if (!ctx || !unlocked || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(72, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.32);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.56);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.78);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.11 * intensity, now + 0.42);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(g).connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.88);
  }

  function playLensingPing(intensity = 0.85) {
    if (!ctx || !unlocked || muted) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
    const root = notes[Math.floor(Math.random() * notes.length)];
    [1, 2.004].forEach((mul, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(root * mul, now);
      osc.frequency.exponentialRampToValueAtTime(root * mul * 0.985, now + 1.35);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime((0.08 * intensity) / (idx + 1), now + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc.connect(g).connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.45);
    });
  }

  function playCausalBell() {
    if (!ctx || !unlocked || muted) return;
    const now = ctx.currentTime;
    [
      { f: 587.33, a: 0.09, d: 1.5 },
      { f: 1174.66, a: 0.045, d: 1.05 },
      { f: 1760.0, a: 0.022, d: 0.7 },
    ].forEach(({ f, a, d }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(a, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + d);
      osc.connect(g).connect(masterGain);
      osc.start(now);
      osc.stop(now + d + 0.05);
    });
  }

  function playBigBangPulse(epoch = 0.5) {
    if (!ctx || !unlocked || muted) return;
    const now = ctx.currentTime;
    const base = 180 + epoch * 260;
    [1, 1.5, 2.5].forEach((mul, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(base * mul, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.07 / (idx + 1), now + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0 - idx * 0.2);
      osc.connect(g).connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.1);
    });
  }

  function playTransitionWhoosh(style = 'crossfade') {
    if (!ctx || !unlocked || muted) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.9;

    const startF = style === 'well-dive' || style === 'collapse-horizon' ? 210 : 320;
    const peakF = style === 'horizon-dive' ? 1420 : style === 'singularity-morph' ? 980 : 1180;
    bp.frequency.setValueAtTime(startF, now);
    bp.frequency.exponentialRampToValueAtTime(peakF, now + 0.85);
    bp.frequency.exponentialRampToValueAtTime(260, now + 1.95);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.10, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.05);

    src.connect(bp).connect(g).connect(masterGain);
    src.start(now, 0, 2.15);
  }

  function playClickTone() {
    if (!ctx || !unlocked || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.055);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    osc.connect(g).connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  function dispose() {
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
    }
    unlocked = false;
  }

  return {
    unlock,
    setAct,
    setMuted,
    toggleMute,
    isMuted,
    playGravWaveChirp,
    playLensingPing,
    playCausalBell,
    playBigBangPulse,
    playTransitionWhoosh,
    playClickTone,
    dispose,
  };
}

// Synthesized audio: sound effects, the crowd, arena acoustics, and the music (music.js
// plays the soundtrack in songs.js). Everything is generated with WebAudio, so there
// are no audio files to download.

import { MusicEngine, midi, freq, makePulse } from './music.js';
import { SONGS, JINGLES } from './songs.js';

// Sounds that belong to the menus rather than the rink: no arena reverb, no panning.
const UI_SFX = new Set(['click', 'confirm', 'back', 'blip', 'coin', 'deny', 'purchase', 'equip']);

// Most sound effects are synthesized once into a short sample and played back from then
// on (one node instead of five or six). These stay live: they're rare or vary each time.
const LIVE_SFX = new Set(['combo', 'horn', 'blip']);
const SFX_LEN = { ooh: 1.25, whistle: 0.5, thunder: 1, stone: 0.7, ult: 0.7, bedrock: 0.6, post: 1, shimmer: 0.95, buzzer: 0.9,
  purchase: 0.65, whoosh: 0.5, freeze: 0.35, glide: 0.5, pickup: 0.3, power: 0.5, boards: 0.4, check: 0.3, stop: 0.35, equip: 0.4, coin: 0.32 };
const WARM_SFX = ['stick', 'slap', 'pass', 'receive', 'boards', 'boards!', 'stop', 'save', 'catch', 'check', 'whistle', 'drop', 'net', 'poke',
  'stride:0', 'stride:1', 'stride:2', 'pickup', 'dash', 'glide', 'bedrock', 'ult', 'whoosh', 'thunder', 'freeze', 'stone', 'post',
  'shimmer', 'buzzer', 'ooh:0', 'ooh:1', 'ooh:2', 'power:fire', 'power:ice', 'power:lightning', 'power:gravity', 'click', 'confirm', 'back', 'coin', 'purchase', 'equip', 'deny'];

// Arena acoustics: reverb length and level, and how big the crowd is.
const ROOMS = {
  home: { decay: 1.9, wet: 0.2, bright: 0.55, crowd: 1 },
  ember_dome: { decay: 2.5, wet: 0.24, bright: 0.4, crowd: 1.1 },
  aurora_palace: { decay: 3, wet: 0.26, bright: 0.75, crowd: 0.9 },
  pine_pond: { decay: 0.6, wet: 0.08, bright: 0.8, crowd: 0.55 },
  golden_hall: { decay: 2.8, wet: 0.25, bright: 0.6, crowd: 1.05 },
  dark_aerie: { decay: 3.6, wet: 0.3, bright: 0.3, crowd: 0.8 },
  menu: { decay: 1.2, wet: 0.1, bright: 0.6, crowd: 0 },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicOn = true; this.sfxOn = true;
    this.musicVol = 1; this.sfxVol = 1;
    this.songName = null;
    this.lastStride = 0;
    this.arena = 'home';
    this.intensity = 0;
    this.quality = 'auto';
  }

  // 'full' or 'light' ('auto' picks light on low-memory phones). The sample rate is set
  // when the audio starts, so a change there needs a reload; the rest applies at once.
  setQuality(q) {
    this.quality = q;
    this.light = q === 'light' || (q === 'auto' && navigator.deviceMemory && navigator.deviceMemory <= 3);
    if (this.music) this.music.lite = this.light;
  }

  // Must be called from a user gesture.
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // 32 kHz, the SNES's own rate: plenty for chiptune, and a third less work than 48 kHz
    let ctx;
    this.setQuality(this.quality);
    try { ctx = new AC({ sampleRate: this.light ? 24000 : 32000, latencyHint: 'interactive' }); } catch { ctx = new AC(); }
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    this.comp = comp;
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicGain();
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxGain();
    this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
    // sounds on the ice go through the arena (reverb); menu sounds don't
    this.worldBus = ctx.createGain(); this.worldBus.connect(this.sfxBus);
    this.reverb = ctx.createConvolver();
    this.reverbSend = ctx.createGain();
    this.worldBus.connect(this.reverbSend).connect(this.reverb).connect(this.sfxBus);
    this.crowdOut = ctx.createGain(); this.crowdOut.connect(this.worldBus);
    this.jingleBus = ctx.createGain(); this.jingleBus.gain.value = 0.9; this.jingleBus.connect(this.sfxBus);
    // white noise
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.music = new MusicEngine(ctx, this.musicBus, buf);
    this.music.lite = this.light;
    this.sfxCache = new Map();
    this.sfxPending = new Set();
    this.ready = Promise.all([this.music.prepareDrums(), this.warmSfx()]);
    this.setArena(this.arena, true);
    this.startCrowd();
    if (this.pendingSong) { this.play(this.pendingSong); this.pendingSong = null; }
    this.timer = setInterval(() => this.music.schedule(), 25);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  // A MediaStream of everything the game plays, for goal clips.
  recordStream() {
    if (!this.ctx || !this.ctx.createMediaStreamDestination) return null;
    if (!this.recDest) { this.recDest = this.ctx.createMediaStreamDestination(); this.comp.connect(this.recDest); }
    return this.recDest;
  }

  musicGain() { return this.musicOn ? 0.6 * this.musicVol : 0; }
  sfxGain() { return this.sfxOn ? this.sfxVol : 0; }
  setMusic(on, vol = this.musicVol) { this.musicOn = on; this.musicVol = vol; if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicGain(), this.ctx.currentTime, 0.1); }
  setSfx(on, vol = this.sfxVol) { this.sfxOn = on; this.sfxVol = vol; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.sfxGain(), this.ctx.currentTime, 0.05); }

  // ---------------------------------------------------------------- music
  tracks() { return Object.entries(SONGS).map(([id, s]) => ({ id, name: s.name })); }
  play(name) {
    if (!this.ctx) { this.pendingSong = name; return; }
    if (this.songName === name) return;
    this.songName = name;
    this.music.play(name, SONGS[name] || null);
    this.music.setIntensity(0); this.intensity = 0;
  }
  stopMusic() { this.songName = null; if (this.music) this.music.play(null, null); }
  // 1 = a close game: extra layers join the match music
  setIntensity(level) { if (this.music && level !== this.intensity) { this.intensity = level; this.music.setIntensity(level); } }

  jingle(kind) {
    if (!this.ctx || !this.sfxOn) return;
    const def = JINGLES[kind === 'goal' ? 'goal_for' : kind];
    if (!def) return;
    const len = this.music.playOnce(kind, def, this.jingleBus);
    this.music.duck(0.3, len + 0.2);
  }

  // ---------------------------------------------------------------- arenas
  setArena(id, force) {
    const room = ROOMS[id] || ROOMS.home;
    if (!force && id === this.arena) return;
    this.arena = id;
    if (!this.ctx) return;
    this.reverb.buffer = this.impulse(room.decay, room.bright);
    this.reverbSend.gain.setTargetAtTime(room.wet, this.ctx.currentTime, 0.05);
    this.room = room;
  }

  // a stereo impulse response: decaying noise, darker as it tails off
  impulse(decay, bright) {
    const ctx = this.ctx, rate = ctx.sampleRate, n = Math.floor(rate * decay);
    const buf = ctx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const x = i / n;
        const k = bright * (1 - x) + 0.08; // the tail loses its highs
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.pow(1 - x, 2.2) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    return buf;
  }

  // ------------------------------------------------------------- primitives
  // where a world sound goes: panned into the arena, or straight to the menu bus
  dest(name, opt) {
    if (UI_SFX.has(name)) return this.sfxBus;
    if (!opt.pan || !this.ctx.createStereoPanner) return this.worldBus;
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, opt.pan));
    p.connect(this.worldBus);
    setTimeout(() => p.disconnect(), 3000);
    return p;
  }

  tone(f, t, dur, wave, vol, bus, o = {}) {
    const ctx = this.ctx;
    vol = Math.max(vol, 0.0002);
    const osc = ctx.createOscillator();
    if (wave.startsWith('pulse') || wave.startsWith('square')) osc.setPeriodicWave(this.music.waves[wave === 'square12' ? 'pulse12' : wave === 'square25' ? 'pulse25' : 'pulse50']);
    else osc.type = wave;
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.vib && dur > 0.2) {
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = o.vibRate || 5.5; lg.gain.value = f * (o.vibDepth || 0.008);
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t + 0.08); lfo.stop(t + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.006));
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - (o.release || 0.04)));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; f2.Q.value = o.q || 0.8; osc.connect(f2); node = f2; }
    node.connect(g).connect(bus || this.worldBus);
    osc.start(t); osc.stop(t + dur + 0.02);
    return osc;
  }

  noiseBurst(t, dur, vol, filter, f, q = 1, bus, attack = 0.004, sweepTo) {
    const ctx = this.ctx;
    vol = Math.max(vol, 0.0002);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const flt = ctx.createBiquadFilter();
    flt.type = filter; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (sweepTo) flt.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(bus || this.worldBus);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
    return flt;
  }

  // a struck object: a few inharmonic partials (posts, glass, pucks on pipes)
  ring(t, f, dur, vol, bus, partials = [1, 2.76, 5.4]) {
    partials.forEach((p, i) => this.tone(f * p, t, dur / (1 + i * 0.6), 'sine', vol / (1 + i * 1.4), bus, { attack: 0.002, release: dur * 0.6 }));
  }

  // ------------------------------------------------------------------- sfx
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  sfx(name, opt = {}) {
    if (!this.ctx || !this.sfxOn) return;
    if (name === 'stride') { const t = this.now(); if (t - this.lastStride < 0.07) return; this.lastStride = t; }
    if (name === 'post') this.crowdOoh(0.8);
    const out = this.dest(name, opt);
    const key = this.sfxKey(name, opt);
    const hit = key && this.sfxCache.get(key);
    if (hit) { this.playSample(hit, opt.vol ?? 1, out); return; }
    if (key) this.cacheSfx(key);
    this.sfxLive(name, opt, out);
  }

  // which cached sample stands for this call (null: always synthesize)
  sfxKey(name, opt) {
    if (LIVE_SFX.has(name)) return null;
    if (name === 'boards') return (opt.vol ?? 1) > 0.55 ? 'boards!' : 'boards'; // hard hits rattle the glass
    if (name === 'power') return 'power:' + (opt.type || '');
    if (name === 'stride') return 'stride:' + Math.floor(Math.random() * 3);
    return name;
  }

  playSample(entry, v, out) {
    const src = this.ctx.createBufferSource(); src.buffer = entry.buf;
    const g = this.ctx.createGain(); g.gain.value = v / entry.ref;
    src.connect(g).connect(out);
    src.start(this.now() + 0.005);
  }

  // Render one sound effect into a sample, in the background.
  cacheSfx(key) {
    if (this.sfxPending.has(key) || this.sfxCache.has(key)) return Promise.resolve();
    this.sfxPending.add(key);
    const [name, param] = key.replace('!', '').split(':');
    const ref = key === 'boards' ? 0.5 : 1;
    const opt = { vol: ref, type: name === 'power' ? param : undefined };
    const sr = this.ctx.sampleRate;
    const off = new OfflineAudioContext(1, Math.ceil(sr * (SFX_LEN[name] || 0.3)), sr);
    const r = Object.create(Audio.prototype);
    r.ctx = off; r.noise = this.noise; r.sfxOn = true; r.lastStride = -1;
    r.music = { waves: { pulse12: makePulse(off, 0.125), pulse25: makePulse(off, 0.25), pulse50: makePulse(off, 0.5) } };
    r.worldBus = r.sfxBus = r.crowdOut = off.destination;
    r.now = () => 0;
    r.light = this.light;
    if (name === 'ooh') r.crowdVowel(0, 1.2, 0.09, 330, 820, 170, 250, 9);
    else r.sfxLive(name, opt, off.destination);
    return off.startRendering().then((buf) => { this.sfxCache.set(key, { buf, ref }); }).catch(() => {}).finally(() => this.sfxPending.delete(key));
  }

  warmSfx() {
    let chain = Promise.resolve();
    for (const key of WARM_SFX) chain = chain.then(() => this.cacheSfx(key));
    return chain;
  }

  // the synthesized sound effects
  sfxLive(name, opt, out) {
    const t = this.now() + 0.005;
    const v = opt.vol ?? 1;
    switch (name) {
      // ---- puck and sticks
      case 'stick': // wrist shot / stick on puck
        this.noiseBurst(t, 0.05, 0.4 * v, 'bandpass', 2600, 1.2, out);
        this.tone(240, t, 0.07, 'sine', 0.25 * v, out, { slide: 120 });
        this.noiseBurst(t + 0.01, 0.12, 0.08 * v, 'highpass', 5000, 0.7, out, 0.01); // blade on ice
        break;
      case 'slap':
        this.noiseBurst(t, 0.03, 0.5 * v, 'highpass', 3500, 0.7, out); // stick hits ice first
        this.noiseBurst(t + 0.02, 0.12, 0.75 * v, 'bandpass', 2000, 0.9, out);
        this.tone(170, t + 0.02, 0.13, 'sine', 0.5 * v, out, { slide: 60 });
        this.tone(900, t + 0.02, 0.05, 'triangle', 0.12 * v, out, { slide: 500 }); // composite stick crack
        break;
      case 'pass': this.noiseBurst(t, 0.04, 0.24 * v, 'bandpass', 3000, 1.4, out); this.tone(330, t, 0.04, 'sine', 0.12 * v, out); this.noiseBurst(t + 0.02, 0.18, 0.04 * v, 'highpass', 6000, 0.7, out, 0.02); break;
      case 'receive': this.noiseBurst(t, 0.035, 0.2 * v, 'bandpass', 1900, 1.5, out); this.tone(180, t, 0.03, 'sine', 0.1 * v, out); break;
      case 'poke': // goalie poke check: stick slap and the puck scuttling away
        this.noiseBurst(t, 0.04, 0.35 * v, 'bandpass', 2200, 1.3, out);
        this.noiseBurst(t + 0.03, 0.25, 0.12 * v, 'bandpass', 3500, 1, out, 0.01, 1500);
        break;
      case 'boards':
        this.tone(85, t, 0.2, 'sine', 0.55 * v, out, { slide: 45 });
        this.noiseBurst(t, 0.14, 0.28 * v, 'lowpass', 520, 0.8, out);
        this.noiseBurst(t, 0.05, 0.12 * v, 'bandpass', 1600, 1.2, out);
        if (v > 0.55) { // hard enough to rattle the glass
          const f = this.noiseBurst(t + 0.02, 0.35, 0.09 * v, 'bandpass', 2400, 3, out, 0.005);
          f.frequency.setValueAtTime(2400, t); f.frequency.linearRampToValueAtTime(1900, t + 0.35);
        }
        break;
      case 'post':
        this.ring(t, 940, 0.9, 0.35 * v, out, [1, 1.99, 2.97, 4.3]);
        this.noiseBurst(t, 0.02, 0.3 * v, 'highpass', 4000, 0.7, out);
        break;
      case 'net': this.noiseBurst(t, 0.35, 0.12 * v, 'highpass', 3000, 0.6, out, 0.01); this.noiseBurst(t, 0.12, 0.1 * v, 'lowpass', 400, 0.8, out); break;
      // ---- bodies
      case 'check':
        this.tone(68, t, 0.24, 'sine', 0.85 * v, out, { slide: 36 });
        this.noiseBurst(t, 0.22, 0.48 * v, 'lowpass', 900, 0.8, out);
        this.noiseBurst(t, 0.06, 0.32 * v, 'bandpass', 1800, 1, out);
        this.noiseBurst(t + 0.03, 0.12, 0.12 * v, 'bandpass', 3200, 2, out); // pads and helmets
        break;
      case 'save': // pad / blocker save
        this.tone(115, t, 0.12, 'sine', 0.55 * v, out, { slide: 55 });
        this.noiseBurst(t, 0.09, 0.32 * v, 'bandpass', 1100, 1, out);
        this.noiseBurst(t, 0.03, 0.15 * v, 'highpass', 3000, 0.7, out);
        break;
      case 'catch': // glove: a leather snap
        this.tone(140, t, 0.08, 'sine', 0.45 * v, out, { slide: 70 });
        this.noiseBurst(t, 0.05, 0.42 * v, 'bandpass', 850, 1.6, out);
        this.noiseBurst(t + 0.008, 0.03, 0.2 * v, 'bandpass', 2600, 2, out);
        break;
      // ---- officials and the building
      case 'whistle': {
        const ctx = this.ctx;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2950;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 32; const lg = ctx.createGain(); lg.gain.value = 140;
        lfo.connect(lg).connect(o.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.02);
        g.gain.setValueAtTime(0.16 * v, t + 0.32); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        o.connect(g).connect(out);
        o.start(t); lfo.start(t); o.stop(t + 0.45); lfo.stop(t + 0.45);
        this.noiseBurst(t, 0.4, 0.05 * v, 'bandpass', 3000, 2, out);
        break;
      }
      case 'horn': this.goalHorn(true); break;
      case 'buzzer': // goal light siren for the visitors' goals
        for (let i = 0; i < 2; i++) {
          const o = this.tone(620, t + i * 0.42, 0.4, 'square25', 0.05 * v, out, { lp: 2400 });
          o.frequency.setValueAtTime(620, t + i * 0.42); o.frequency.linearRampToValueAtTime(880, t + i * 0.42 + 0.2); o.frequency.linearRampToValueAtTime(620, t + i * 0.42 + 0.4);
        }
        break;
      // ---- skating
      case 'stride': this.noiseBurst(t, 0.1, 0.06 * v, 'bandpass', 4800 + Math.random() * 900, 1.2, out, 0.03); break;
      case 'stop': this.noiseBurst(t, 0.3, 0.34 * v, 'bandpass', 4200, 0.9, out, 0.01, 2600); this.noiseBurst(t, 0.2, 0.1 * v, 'highpass', 7000, 0.7, out, 0.02); break;
      // ---- powers and abilities
      case 'shimmer': ['E6', 'B6', 'D#7', 'G#7'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.07, 0.6, 'sine', 0.045 * v, out, { release: 0.4 })); break;
      case 'pickup': ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.045, 0.09, 'square25', 0.07 * v, out)); break;
      case 'power': {
        const set = { fire: ['D5', 'A5', 'D6'], ice: ['E6', 'B6', 'E7'], lightning: ['F5', 'C6', 'F6'], gravity: ['C4', 'G4', 'C5'] }[opt.type] || ['C5', 'G5', 'C6'];
        set.forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.06, 0.16, 'square25', 0.09 * v, out));
        if (opt.type === 'fire') this.noiseBurst(t, 0.4, 0.2 * v, 'lowpass', 1800, 0.7, out, 0.05);
        if (opt.type === 'gravity') this.tone(80, t, 0.4, 'sine', 0.3 * v, out, { slide: 40 });
        if (opt.type === 'lightning') this.noiseBurst(t, 0.15, 0.2 * v, 'highpass', 4000, 0.8, out);
        break;
      }
      case 'dash':
        this.tone(1400, t, 0.18, 'sawtooth', 0.1 * v, out, { slide: 180, lp: 3000 });
        this.noiseBurst(t, 0.18, 0.3 * v, 'highpass', 2500, 0.8, out);
        break;
      case 'glide': ['E6', 'G#6', 'B6', 'E7'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.05, 0.3, 'sine', 0.06 * v, out)); break;
      case 'bedrock': this.noiseBurst(t, 0.5, 0.6 * v, 'lowpass', 220, 1, out, 0.04); this.tone(55, t, 0.4, 'sine', 0.5 * v, out, { slide: 35 }); break;
      case 'ult':
        this.tone(220, t, 0.5, 'sawtooth', 0.09 * v, out, { slide: 880, lp: 2500 });
        this.tone(330, t + 0.02, 0.5, 'square25', 0.07 * v, out, { slide: 1320 });
        this.noiseBurst(t, 0.6, 0.2 * v, 'bandpass', 1500, 0.6, out, 0.3);
        break;
      case 'thunder':
        this.noiseBurst(t, 0.9, 0.7 * v, 'lowpass', 600, 0.7, out, 0.01, 200);
        this.noiseBurst(t, 0.15, 0.5 * v, 'highpass', 3000, 0.7, out);
        this.tone(60, t, 0.6, 'sine', 0.6 * v, out, { slide: 30 });
        break;
      case 'freeze': for (let i = 0; i < 4; i++) this.noiseBurst(t + i * 0.04, 0.05, 0.2 * v, 'highpass', 5000 + i * 800, 2, out); this.tone(2400, t, 0.3, 'sine', 0.06 * v, out, { slide: 3600 }); break;
      case 'stone': this.noiseBurst(t, 0.6, 0.7 * v, 'lowpass', 300, 0.8, out, 0.02); this.tone(48, t, 0.5, 'sine', 0.6 * v, out); break;
      case 'combo': {
        ['E5', 'B5', 'E6', 'G#6'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.05, 0.22, 'square25', 0.08 * v, out));
        if (opt.key === 'frost+thunder') { this.sfx('freeze', { vol: 0.6 }); this.sfx('dash', { vol: 0.6 }); }
        if (opt.key === 'frost+stone') { this.sfx('freeze', { vol: 0.5 }); this.sfx('bedrock', { vol: 0.6 }); }
        if (opt.key === 'stone+thunder') this.sfx('dash', { vol: 0.5 });
        this.sfx('whoosh', { vol: 0.6 });
        break;
      }
      case 'whoosh': this.noiseBurst(t, 0.45, 0.35 * v, 'bandpass', 400, 1.4, out, 0.12, 3200); break;
      // ---- menus
      case 'click': this.tone(880, t, 0.04, 'square25', 0.05 * v, out); this.tone(1760, t, 0.02, 'sine', 0.03 * v, out); break;
      case 'confirm': this.tone(660, t, 0.06, 'square25', 0.06 * v, out); this.tone(990, t + 0.06, 0.1, 'square25', 0.06 * v, out); break;
      case 'back': this.tone(660, t, 0.06, 'square25', 0.05 * v, out); this.tone(440, t + 0.06, 0.08, 'square25', 0.05 * v, out); break;
      case 'blip': { // dialogue: each speaker has a voice pitch
        const p = opt.pitch || 620 + Math.random() * 120;
        this.tone(p * (0.96 + Math.random() * 0.08), t, 0.03, opt.them ? 'square25' : 'square12', 0.03 * v, out);
        break;
      }
      case 'coin': this.tone(988, t, 0.07, 'square25', 0.07 * v, out); this.tone(1319, t + 0.07, 0.22, 'square25', 0.07 * v, out); break;
      case 'purchase': // ka-ching
        this.noiseBurst(t, 0.06, 0.15 * v, 'bandpass', 3000, 1, out);
        this.tone(1319, t + 0.05, 0.08, 'square25', 0.06 * v, out); this.tone(1760, t + 0.12, 0.35, 'square25', 0.06 * v, out);
        this.ring(t + 0.12, 2637, 0.5, 0.04 * v, out);
        break;
      case 'equip': this.ring(t, 520, 0.35, 0.1 * v, out, [1, 2.4, 3.9]); this.noiseBurst(t, 0.05, 0.12 * v, 'bandpass', 2400, 1.5, out); break;
      case 'deny': this.tone(160, t, 0.12, 'square25', 0.07 * v, out); this.tone(120, t + 0.1, 0.14, 'square25', 0.07 * v, out); break;
      case 'drop': this.tone(1200, t, 0.05, 'triangle', 0.08 * v, out); this.noiseBurst(t + 0.01, 0.04, 0.1 * v, 'bandpass', 2500, 1.5, out); break;
    }
  }

  // The arena's goal horn, for the home side's goals (style: another building's horn instead, as
  // the club picks for its own rink).
  goalHorn(home = true, style = null) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now() + 0.01, out = this.worldBus;
    if (!home) { this.sfx('buzzer'); return; }
    const horn = (notes, len, vol, lp) => notes.forEach((f) => {
      const o = this.tone(f * 0.97, t, len, 'sawtooth', vol, out, { lp, attack: 0.05, release: 0.3, vib: true, vibRate: 4.5, vibDepth: 0.004 });
      o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); // the scoop of a big air horn
    });
    switch (style || this.arena) {
      case 'ember_dome': // a low volcanic horn and a burst of flame
        horn([65.4, 98, 130.8], 2.6, 0.08, 900);
        this.noiseBurst(t, 1.4, 0.35, 'lowpass', 300, 0.8, out, 0.05, 2200);
        this.tone(40, t, 1.2, 'sine', 0.4, out, { slide: 30 });
        break;
      case 'aurora_palace': // royal fanfare and chimes
        ['C4', 'E4', 'G4', 'C5'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.12, 1.6 - i * 0.12, 'sawtooth', 0.05, out, { lp: 2200, attack: 0.03, release: 0.4 }));
        for (let i = 0; i < 6; i++) this.ring(t + 0.4 + i * 0.11, freq(midi(['C6', 'E6', 'G6', 'C7', 'G6', 'E7'][i])), 1.4, 0.06, out, [1, 3.01, 5.2]);
        break;
      case 'golden_hall': // a ram's horn call over a deep gong
        [[233.1, 0], [233.1, 0.28], [311.1, 0.56]].forEach(([f, d], i) => {
          const o = this.tone(f * 0.94, t + d, i === 2 ? 1.8 : 0.24, 'sawtooth', 0.075, out, { lp: 1700, attack: 0.03, release: 0.25, vib: i === 2, vibRate: 5, vibDepth: 0.006 });
          o.frequency.setValueAtTime(f * 0.94, t + d); o.frequency.exponentialRampToValueAtTime(f, t + d + 0.09);
        });
        this.ring(t, 55, 3.2, 0.22, out, [1, 2.76, 5.4]);
        break;
      case 'dark_aerie': { // a low bell and the ravens taking off
        this.ring(t, 82.4, 3.4, 0.2, out, [1, 2.4, 3.9, 6.1]);
        for (let i = 0; i < 5; i++) {
          const tt = t + 0.35 + i * 0.19 + (i % 2) * 0.05;
          const o = this.tone(1150 - i * 60, tt, 0.16, 'square50', 0.035, out, { lp: 2400, attack: 0.005, release: 0.06 });
          o.frequency.setValueAtTime(1150 - i * 60, tt); o.frequency.exponentialRampToValueAtTime(620, tt + 0.15); // caw
        }
        this.noiseBurst(t + 0.3, 1.1, 0.12, 'bandpass', 900, 0.5, out, 0.02, 600); // wings
        break;
      }
      case 'pine_pond': { // cowbells and a hand-cranked siren
        for (let i = 0; i < 8; i++) { const tt = t + i * 0.16; this.tone(540, tt, 0.25, 'square50', 0.05, out, { lp: 1500 }); this.tone(800, tt, 0.25, 'square50', 0.04, out, { lp: 1500 }); }
        const o = this.tone(400, t, 2.4, 'sine', 0.12, out, { vib: true, vibRate: 7, vibDepth: 0.01, attack: 0.2, release: 0.6 });
        o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(1100, t + 1); o.frequency.linearRampToValueAtTime(500, t + 2.4);
        break;
      }
      default: // Frostline: the classic two-blast horn
        horn([116.5, 146.8, 174.6, 233.1], 1.5, 0.065, 1400);
        setTimeout(() => { if (this.ctx) { const t2 = this.now(); [116.5, 146.8, 174.6, 233.1].forEach((f) => this.tone(f, t2, 1.4, 'sawtooth', 0.065, out, { lp: 1400, attack: 0.04, release: 0.4 })); } }, 1650);
    }
  }

  // "Let's go Foxes!" (or your club) — two bars of voices plus the clap-clap-clapclapclap reply.
  chant(vol = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const t0 = this.now() + 0.05;
    const beat = 0.25;
    const clap = (t) => { this.noiseBurst(t, 0.07, 0.3 * vol, 'bandpass', 1500, 0.9, this.crowdOut); this.noiseBurst(t + 0.01, 0.05, 0.2 * vol, 'highpass', 3000, 0.7, this.crowdOut); };
    for (let rep = 0; rep < 2; rep++) {
      const t = t0 + rep * beat * 16;
      // LET'S - GO - STRI - KERS
      this.crowdVowel(t, 0.24, 0.09 * vol, 650, 1700, 196, 196, 8);
      this.crowdVowel(t + beat * 2, 0.24, 0.09 * vol, 500, 900, 220, 220, 8);
      this.crowdVowel(t + beat * 4, 0.2, 0.09 * vol, 350, 2000, 247, 247, 8);
      this.crowdVowel(t + beat * 5, 0.34, 0.09 * vol, 500, 1400, 196, 185, 8);
      for (const b of [8, 10, 12, 13, 14]) clap(t + beat * b);
    }
  }

  // ------------------------------------------------------------------ crowd
  // A crowd vowel: a chorus of slightly different voices through two formants.
  crowdVowel(t, dur, vol, f1, f2, p0, p1, n = 7) {
    if (!(vol > 0.0005)) return; // no crowd in the menus
    if (this.light) n = Math.max(1, Math.ceil(n / 2));
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.25));
    out.gain.setValueAtTime(vol, t + dur * 0.6);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const fa = ctx.createBiquadFilter(); fa.type = 'bandpass'; fa.frequency.value = f1; fa.Q.value = 4;
    const fb = ctx.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = f2; fb.Q.value = 6;
    const fbg = ctx.createGain(); fbg.gain.value = 0.55;
    fa.connect(out); fb.connect(fbg).connect(out);
    out.connect(this.crowdOut);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const k = 0.8 + Math.random() * 0.5, st = t + Math.random() * Math.min(0.1, dur * 0.2);
      o.frequency.setValueAtTime(p0 * k, st);
      o.frequency.linearRampToValueAtTime(p1 * k, t + dur);
      o.connect(fa); o.connect(fb);
      o.start(st); o.stop(t + dur + 0.05);
    }
    this.noiseBurst(t, dur, vol * 0.5, 'bandpass', f2, 1.5, this.crowdOut, Math.min(0.08, dur * 0.25)); // breath
  }

  startCrowd() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0;
    // three bands of murmur, each drifting on its own slow wobble
    for (const [f, q, g, rate] of [[480, 1.2, 1, 0.17], [1150, 1.6, 0.6, 0.29], [2500, 2, 0.25, 0.41]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const bg = ctx.createGain(); bg.gain.value = g;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate;
      const lg = ctx.createGain(); lg.gain.value = g * 0.35;
      lfo.connect(lg).connect(bg.gain); lfo.start();
      src.connect(bp).connect(bg).connect(this.crowdGain);
    }
    this.crowdGain.connect(this.crowdOut);
    src.start();
    this.crowdLevel = 0;
  }
  setCrowd(level) {
    if (!this.ctx || !this.crowdGain) return;
    this.crowdLevel = level;
    const size = this.room ? this.room.crowd : 1;
    this.crowdGain.gain.setTargetAtTime(size * (level > 0 ? 0.025 + level * 0.07 : 0), this.ctx.currentTime, 0.4);
    // now and then somebody shouts
    if (level > 0.15 && this.sfxOn && !this.light && Math.random() < 0.05 * level * size) {
      const shouts = [[650, 1700], [350, 2000], [500, 900], [700, 1200]];
      const [f1, f2] = shouts[Math.floor(Math.random() * shouts.length)];
      const p = 150 + Math.random() * 180;
      this.crowdVowel(this.now(), 0.25 + Math.random() * 0.3, 0.035 * level, f1, f2, p, p * (0.9 + Math.random() * 0.25), 1 + Math.floor(Math.random() * 2));
    }
  }
  crowdCheer(amount) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now(), size = this.room ? this.room.crowd : 1, a = amount * size;
    if (!(a > 0)) return;
    const len = 1.4 + 1.8 * amount;
    this.noiseBurst(t, len, 0.2 * a, 'bandpass', 1000, 0.6, this.crowdOut, 0.2);
    this.noiseBurst(t + 0.05, len * 0.85, 0.12 * a, 'bandpass', 2300, 0.9, this.crowdOut, 0.25);
    this.crowdVowel(t, len, 0.1 * a, 700, 1300, 240, 330, 10); // "yeah!"
    this.crowdVowel(t + 0.1, len * 0.8, 0.06 * a, 750, 1700, 380, 460, 6);
    for (let i = 0; i < Math.round(amount * 4); i++) { // whistles
      const st = t + 0.2 + Math.random() * len * 0.5, f = 1800 + Math.random() * 1000;
      const o = this.tone(f, st, 0.5 + Math.random() * 0.4, 'sine', 0.03 * a, this.crowdOut, { vib: true, vibRate: 9, vibDepth: 0.02 });
      o.frequency.setValueAtTime(f * 0.8, st); o.frequency.exponentialRampToValueAtTime(f, st + 0.1);
    }
    for (let i = 0; i < Math.round(amount * 16); i++) { // clapping
      const st = t + 0.3 + Math.random() * len * 0.8;
      this.noiseBurst(st, 0.04, (0.04 + Math.random() * 0.04) * a, 'bandpass', 1200 + Math.random() * 1200, 1, this.crowdOut);
    }
  }
  crowdOoh(amount) {
    if (!this.ctx || !this.sfxOn) return;
    const size = this.room ? this.room.crowd : 1;
    if (!(amount * size > 0)) return;
    // three recorded takes, picked at random (it's the most frequent crowd sound)
    const key = 'ooh:' + Math.floor(Math.random() * 3);
    const hit = this.sfxCache && this.sfxCache.get(key);
    if (hit) { this.playSample(hit, amount * size, this.crowdOut); return; }
    if (this.sfxCache && !this.sfxPending.has(key)) this.cacheSfx(key);
    this.crowdVowel(this.now(), 1.2, 0.09 * amount * size, 330, 820, 170, 250, 9);
  }
  // groan when the visitors score in our building
  crowdAww(amount) {
    if (!this.ctx || !this.sfxOn) return;
    const size = this.room ? this.room.crowd : 1;
    this.crowdVowel(this.now(), 1.5, 0.09 * amount * size, 700, 1100, 250, 150, 10);
  }
  crowdBoo(amount) {
    if (!this.ctx || !this.sfxOn) return;
    const size = this.room ? this.room.crowd : 1;
    this.crowdVowel(this.now() + 0.3, 1.8, 0.08 * amount * size, 320, 700, 135, 120, 12);
  }
}

export const audio = new Audio();

// Synthesized retro audio: sound effects, crowd ambience and chiptune music.
// Everything is generated with WebAudio, so there are no audio files to download.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {
  if (n == null || n === '.' || n === '-') return null;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const seq = (s) => s.trim().split(/\s+/).map(midi);

// ---- songs (16th-note steps) -------------------------------------------------
function chordSteps(chords, octave, pattern) {
  // chords: list of [root, third, fifth] note names without octave
  const out = [];
  for (const ch of chords) {
    const tones = ch.map((n, i) => midi(n + (octave + (i > 0 && NOTE[n[0]] < NOTE[ch[0][0]] ? 1 : 0))));
    for (let i = 0; i < 16; i++) out.push(pattern ? tones[pattern[i % pattern.length]] : tones[i % 3]);
  }
  return out;
}
function bassSteps(roots, octave, pat) {
  const out = [];
  for (const r of roots) {
    const m = midi(r + octave);
    for (const p of pat) out.push(p === null ? null : m + p);
  }
  return out;
}

const SONGS = {
  match: {
    bpm: 148,
    lead: seq(`
      E5 . E5 . A5 . G5 . E5 . . . D5 . C5 .
      C5 . . . A4 . C5 . F5 . E5 . C5 . A4 .
      G4 . C5 . E5 . G5 . E5 . C5 . E5 . G5 .
      G5 . . . F5 . . . D5 . . . B4 . . .
      E5 . A5 . C6 . B5 . A5 . . . E5 . . .
      F5 . E5 . D5 . C5 . A4 . C5 . F5 . . .
      D5 . G5 . B5 . A5 . G5 . D5 . B4 . D5 .
      E5 . . . G#5 . . . B5 . . . E6 . . .`),
    bass: bassSteps(['A', 'F', 'C', 'G', 'A', 'F', 'G', 'E'], 2, [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, 12, 7, null]),
    arp: chordSteps([['A', 'C', 'E'], ['F', 'A', 'C'], ['C', 'E', 'G'], ['G', 'B', 'D'], ['A', 'C', 'E'], ['F', 'A', 'C'], ['G', 'B', 'D'], ['E', 'G#', 'B']], 4, [0, 1, 2, 1]),
    drums: 'k.h.s.h.k.h.s.hk',
    leadWave: 'square25', leadVol: 0.085, arpVol: 0.03, bassVol: 0.16, drumVol: 1,
  },
  hub: {
    bpm: 104,
    lead: seq(`
      A4 . . . C5 . . . F5 . . . E5 . D5 .
      C5 . . . A4 . . . D5 . . . . . . .
      F5 . . . D5 . . . Bb4 . . . D5 . . .
      E5 . . . G5 . . . C5 . . . . . . .
      A5 . . . G5 . F5 . C5 . . . A4 . . .
      C5 . . . E5 . . . A5 . . . G5 . . .
      F5 . . . D5 . . . Bb4 . . . D5 . F5 .
      E5 . . . . . . . G4 . . . C5 . . .`),
    bass: bassSteps(['F', 'D', 'Bb', 'C', 'F', 'A', 'Bb', 'C'], 2, [0, null, null, null, 7, null, null, null, 12, null, null, null, 7, null, null, null]),
    arp: chordSteps([['F', 'A', 'C'], ['D', 'F', 'A'], ['Bb', 'D', 'F'], ['C', 'E', 'G'], ['F', 'A', 'C'], ['A', 'C', 'E'], ['Bb', 'D', 'F'], ['C', 'E', 'G']], 4, [0, 1, 2, 1, 2, 1]),
    drums: 'k...h...s...h.h.',
    leadWave: 'triangle', leadVol: 0.14, arpVol: 0.028, bassVol: 0.14, drumVol: 0.55,
  },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.song = null;
    this.step = 0;
    this.excite = 0.2;
    this.lastStride = 0;
  }

  // Must be called from a user gesture.
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.comp = comp;
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.55 : 0;
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
    this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
    // white noise
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.waves = {
      square25: makePulse(ctx, 0.25),
      square12: makePulse(ctx, 0.125),
    };
    this.startCrowd();
    if (this.pendingSong) { this.play(this.pendingSong); this.pendingSong = null; }
    this.timer = setInterval(() => this.schedule(), 25);
  }

  // A MediaStream of everything the game plays, for goal clips.
  recordStream() {
    if (!this.ctx || !this.ctx.createMediaStreamDestination) return null;
    if (!this.recDest) { this.recDest = this.ctx.createMediaStreamDestination(); this.comp.connect(this.recDest); }
    return this.recDest;
  }

  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.1); }
  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05); }

  // ---------------------------------------------------------------- music
  play(name) {
    if (!this.ctx) { this.pendingSong = name; return; }
    if (this.songName === name) return;
    this.songName = name;
    this.song = SONGS[name] || null;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.1;
  }
  stopMusic() { this.song = null; this.songName = null; }

  schedule() {
    if (!this.ctx || !this.song) return;
    const s = this.song;
    const stepDur = 60 / s.bpm / 4;
    while (this.nextT < this.ctx.currentTime + 0.12) {
      const i = this.step % s.lead.length;
      const t = this.nextT;
      const ln = s.lead[i];
      if (ln != null) {
        let len = 1;
        while (len < 8 && s.lead[(i + len) % s.lead.length] == null) len++;
        this.tone(freq(ln), t, stepDur * len * 0.92, s.leadWave, s.leadVol, this.musicBus, { vib: true });
      }
      const bn = s.bass[i % s.bass.length];
      if (bn != null) this.tone(freq(bn), t, stepDur * 1.6, 'triangle', s.bassVol, this.musicBus);
      const an = s.arp[i % s.arp.length];
      if (an != null) this.tone(freq(an), t, stepDur * 0.8, 'square12', s.arpVol, this.musicBus);
      const dc = s.drums[i % s.drums.length];
      if (dc === 'k') this.kick(t, 0.5 * s.drumVol);
      if (dc === 's') this.snare(t, 0.22 * s.drumVol);
      if (dc === 'h') this.hat(t, 0.06 * s.drumVol);
      this.nextT += stepDur;
      this.step++;
    }
  }

  jingle(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    const notes = {
      win: ['C5', 'E5', 'G5', 'C6', null, 'G5', 'C6', null],
      lose: ['E4', 'D4', 'C4', null, 'B3', null, null, null],
      level: ['C5', 'E5', 'G5', 'C6', 'E6'],
      goal: ['G4', 'C5', 'E5', 'G5', 'C6'],
    }[kind];
    if (!notes) return;
    notes.forEach((n, i) => { if (n) this.tone(freq(midi(n)), t + i * 0.09, i === notes.length - 1 || kind === 'win' && i > 4 ? 0.5 : 0.12, 'square25', 0.12, this.sfxBus, { vib: true }); });
  }

  // ------------------------------------------------------------- primitives
  tone(f, t, dur, wave, vol, bus, o = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    if (this.waves[wave]) osc.setPeriodicWave(this.waves[wave]); else osc.type = wave;
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.vib && dur > 0.2) {
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = f * 0.008;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t + 0.12); lfo.stop(t + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.04));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus || this.sfxBus);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  noiseBurst(t, dur, vol, filter, f, q = 1, bus, attack = 0.004) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1;
    const flt = ctx.createBiquadFilter();
    flt.type = filter; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(bus || this.sfxBus);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
    return flt;
  }

  kick(t, v) { this.tone(140, t, 0.16, 'sine', v, this.musicBus, { slide: 40 }); }
  snare(t, v) { this.noiseBurst(t, 0.14, v, 'highpass', 1500, 0.7, this.musicBus); this.tone(190, t, 0.08, 'triangle', v * 0.6, this.musicBus); }
  hat(t, v) { this.noiseBurst(t, 0.04, v, 'highpass', 7000, 0.7, this.musicBus); }

  // ------------------------------------------------------------------- sfx
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  sfx(name, opt = {}) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now() + 0.005;
    const v = opt.vol ?? 1;
    switch (name) {
      case 'stick': this.noiseBurst(t, 0.05, 0.35 * v, 'bandpass', 2600, 1.2); this.tone(220, t, 0.06, 'sine', 0.25 * v, null, { slide: 120 }); break;
      case 'slap':
        this.noiseBurst(t, 0.12, 0.7 * v, 'bandpass', 2200, 0.9);
        this.noiseBurst(t, 0.05, 0.5 * v, 'highpass', 4000, 0.7);
        this.tone(160, t, 0.12, 'sine', 0.45 * v, null, { slide: 60 });
        break;
      case 'pass': this.noiseBurst(t, 0.04, 0.22 * v, 'bandpass', 3000, 1.4); this.tone(330, t, 0.04, 'sine', 0.12 * v); break;
      case 'receive': this.noiseBurst(t, 0.03, 0.18 * v, 'bandpass', 2000, 1.5); break;
      case 'boards': this.tone(90, t, 0.16, 'sine', 0.5 * v, null, { slide: 45 }); this.noiseBurst(t, 0.12, 0.25 * v, 'lowpass', 500, 0.8); break;
      case 'post':
        this.tone(1870, t, 0.6, 'sine', 0.25 * v); this.tone(2790, t, 0.45, 'sine', 0.12 * v); this.tone(940, t, 0.3, 'triangle', 0.1 * v);
        this.crowdOoh(0.8);
        break;
      case 'check':
        this.tone(70, t, 0.22, 'sine', 0.8 * v, null, { slide: 38 });
        this.noiseBurst(t, 0.2, 0.45 * v, 'lowpass', 900, 0.8);
        this.noiseBurst(t, 0.06, 0.3 * v, 'bandpass', 1800, 1);
        break;
      case 'save': this.tone(110, t, 0.1, 'sine', 0.5 * v, null, { slide: 60 }); this.noiseBurst(t, 0.08, 0.35 * v, 'bandpass', 1200, 1); break;
      case 'whistle': {
        const ctx = this.ctx;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2950;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 32; const lg = ctx.createGain(); lg.gain.value = 140;
        lfo.connect(lg).connect(o.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18 * v, t + 0.02);
        g.gain.setValueAtTime(0.18 * v, t + 0.32); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        o.connect(g).connect(this.sfxBus);
        o.start(t); lfo.start(t); o.stop(t + 0.45); lfo.stop(t + 0.45);
        this.noiseBurst(t, 0.4, 0.05 * v, 'bandpass', 3000, 2);
        break;
      }
      case 'horn': {
        for (const f of [130.8, 164.8, 196, 98]) this.tone(f, t, 2.2, 'sawtooth', 0.07 * v, null, { vib: true });
        this.crowdCheer(1);
        break;
      }
      case 'stride': {
        if (t - this.lastStride < 0.07) return;
        this.lastStride = t;
        this.noiseBurst(t, 0.09, 0.06 * v, 'bandpass', 5200, 1.2, null, 0.03);
        break;
      }
      case 'stop': this.noiseBurst(t, 0.28, 0.32 * v, 'bandpass', 4200, 0.9, null, 0.01); break;
      case 'splash':
        this.noiseBurst(t, 0.32, 0.3 * v, 'bandpass', 1300, 0.7, null, 0.01);
        this.noiseBurst(t + 0.05, 0.22, 0.15 * v, 'highpass', 3200, 0.8);
        break;
      case 'crack':
        this.noiseBurst(t, 0.05, 0.5 * v, 'highpass', 2600, 1.2);
        this.tone(420, t, 0.18, 'square25', 0.08 * v, null, { slide: 160 });
        this.noiseBurst(t + 0.04, 0.35, 0.18 * v, 'lowpass', 700, 0.8);
        break;
      case 'shimmer': ['E6', 'B6', 'D#7', 'G#7'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.07, 0.5, 'sine', 0.045 * v)); break;
      case 'pickup': ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.045, 0.08, 'square25', 0.08 * v)); break;
      case 'power': {
        const set = { fire: ['D5', 'A5', 'D6'], ice: ['E6', 'B6', 'E7'], lightning: ['F5', 'C6', 'F6'], gravity: ['C4', 'G4', 'C5'] }[opt.type] || ['C5', 'G5', 'C6'];
        set.forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.06, 0.16, 'square25', 0.1 * v));
        if (opt.type === 'fire') this.noiseBurst(t, 0.4, 0.2 * v, 'lowpass', 1800, 0.7, null, 0.05);
        if (opt.type === 'gravity') this.tone(80, t, 0.4, 'sine', 0.3 * v, null, { slide: 40 });
        break;
      }
      case 'dash':
        this.tone(1400, t, 0.18, 'sawtooth', 0.12 * v, null, { slide: 180 });
        this.noiseBurst(t, 0.18, 0.3 * v, 'highpass', 2500, 0.8);
        break;
      case 'glide': ['E6', 'G#6', 'B6', 'E7'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.05, 0.3, 'sine', 0.06 * v)); break;
      case 'bedrock': this.noiseBurst(t, 0.5, 0.6 * v, 'lowpass', 220, 1, null, 0.04); this.tone(55, t, 0.4, 'sine', 0.5 * v, null, { slide: 35 }); break;
      case 'ult':
        this.tone(220, t, 0.5, 'sawtooth', 0.1 * v, null, { slide: 880 });
        this.tone(330, t + 0.02, 0.5, 'square25', 0.08 * v, null, { slide: 1320 });
        this.noiseBurst(t, 0.6, 0.2 * v, 'bandpass', 1500, 0.6, null, 0.3);
        break;
      case 'thunder':
        this.noiseBurst(t, 0.9, 0.7 * v, 'lowpass', 600, 0.7, null, 0.01);
        this.noiseBurst(t, 0.15, 0.5 * v, 'highpass', 3000, 0.7);
        this.tone(60, t, 0.6, 'sine', 0.6 * v, null, { slide: 30 });
        break;
      case 'freeze': for (let i = 0; i < 4; i++) this.noiseBurst(t + i * 0.04, 0.05, 0.2 * v, 'highpass', 5000 + i * 800, 2); this.tone(2400, t, 0.3, 'sine', 0.06 * v, null, { slide: 3600 }); break;
      case 'stone': this.noiseBurst(t, 0.6, 0.7 * v, 'lowpass', 300, 0.8, null, 0.02); this.tone(48, t, 0.5, 'sine', 0.6 * v); break;
      case 'click': this.tone(880, t, 0.04, 'square25', 0.06 * v); break;
      case 'confirm': this.tone(660, t, 0.06, 'square25', 0.07 * v); this.tone(990, t + 0.06, 0.09, 'square25', 0.07 * v); break;
      case 'back': this.tone(660, t, 0.06, 'square25', 0.06 * v); this.tone(440, t + 0.06, 0.08, 'square25', 0.06 * v); break;
      case 'blip': this.tone(620 + Math.random() * 120, t, 0.025, 'square12', 0.035 * v); break;
      case 'coin': this.tone(988, t, 0.07, 'square25', 0.08 * v); this.tone(1319, t + 0.07, 0.2, 'square25', 0.08 * v); break;
      case 'deny': this.tone(160, t, 0.12, 'square25', 0.08 * v); this.tone(120, t + 0.1, 0.14, 'square25', 0.08 * v); break;
      case 'drop': this.tone(1200, t, 0.05, 'triangle', 0.08 * v); break;
      case 'combo': {
        ['E5', 'B5', 'E6', 'G#6'].forEach((n, i) => this.tone(freq(midi(n)), t + i * 0.05, 0.22, 'square25', 0.09 * v));
        if (opt.key === 'frost+thunder') { this.sfx('freeze', { vol: 0.6 }); this.sfx('dash', { vol: 0.6 }); }
        if (opt.key === 'frost+stone') { this.sfx('freeze', { vol: 0.5 }); this.sfx('bedrock', { vol: 0.6 }); }
        if (opt.key === 'stone+thunder') this.sfx('dash', { vol: 0.5 });
        this.sfx('whoosh', { vol: 0.6 });
        break;
      }
      case 'whoosh': {
        const f = this.noiseBurst(t, 0.45, 0.35 * v, 'bandpass', 400, 1.4, null, 0.12);
        f.frequency.exponentialRampToValueAtTime(3200, t + 0.4);
        break;
      }
    }
  }

  // "Let's go Strikers!" — two bars of voices plus the clap-clap-clapclapclap reply.
  chant(vol = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const t0 = this.now() + 0.05;
    const beat = 0.25;
    const voice = (t, f, len) => {
      const ctx = this.ctx;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.setValueAtTime(f * 1.01, t);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 720; bp.Q.value = 1.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(bp); o2.connect(bp); bp.connect(g).connect(this.sfxBus);
      o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02);
      this.noiseBurst(t, len, 0.08 * vol, 'bandpass', 1100, 1, null, 0.03);
    };
    const clap = (t) => { this.noiseBurst(t, 0.07, 0.3 * vol, 'bandpass', 1500, 0.9); this.noiseBurst(t + 0.01, 0.05, 0.2 * vol, 'highpass', 3000, 0.7); };
    for (let rep = 0; rep < 2; rep++) {
      const t = t0 + rep * beat * 16;
      // LET'S - GO - STRI - KERS
      voice(t, 196, 0.22); voice(t + beat * 2, 220, 0.22); voice(t + beat * 4, 247, 0.18); voice(t + beat * 5, 196, 0.32);
      // clap clap, clap clap clap
      for (const b of [8, 10, 12, 13, 14]) clap(t + beat * b);
    }
  }

  // ------------------------------------------------------------------ crowd
  startCrowd() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0;
    // slow murmur wobble
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.23;
    const lg = ctx.createGain(); lg.gain.value = 0.012;
    lfo.connect(lg).connect(this.crowdGain.gain);
    src.connect(bp).connect(lp).connect(this.crowdGain).connect(this.sfxBus);
    src.start(); lfo.start();
    this.crowdLevel = 0;
  }
  setCrowd(level) {
    if (!this.ctx || !this.crowdGain) return;
    this.crowdLevel = level;
    this.crowdGain.gain.setTargetAtTime(0.02 + level * 0.07, this.ctx.currentTime, 0.4);
  }
  crowdCheer(amount) {
    if (!this.ctx) return;
    const t = this.now();
    this.noiseBurst(t, 2.6 * amount, 0.32 * amount, 'bandpass', 1100, 0.5, null, 0.25);
    this.noiseBurst(t + 0.1, 2.2 * amount, 0.2 * amount, 'bandpass', 2400, 0.8, null, 0.3);
  }
  crowdOoh(amount) {
    if (!this.ctx) return;
    const t = this.now();
    const f = this.noiseBurst(t, 1.0, 0.16 * amount, 'bandpass', 500, 3, null, 0.15);
    f.frequency.linearRampToValueAtTime(380, t + 1);
  }
}

function makePulse(ctx, duty) {
  const n = 64;
  const real = new Float32Array(n), imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * 0.9;
  // real-valued pulse: use cosine terms
  for (let k = 1; k < n; k++) { real[k] = (2 / (k * Math.PI)) * Math.sin(2 * k * Math.PI * duty); imag[k] = (2 / (k * Math.PI)) * (1 - Math.cos(2 * k * Math.PI * duty)); }
  return ctx.createPeriodicWave(real, imag);
}

export const audio = new Audio();

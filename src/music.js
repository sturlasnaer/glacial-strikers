// Chiptune music engine: a small tracker with SNES-flavoured synthesized instruments,
// stereo channels and a shared echo. Songs (songs.js) are sections of patterns over a
// chord progression; bass, arpeggios and pads can be generated from the chords, the
// melodies are written out. Everything is WebAudio; there are no audio files.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pc = (name) => (NOTE[name[0]] + (name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0) + 12) % 12;

// ---------------------------------------------------------------- chords
const QUAL = {
  '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11], 9: [0, 4, 7, 10, 14], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14], sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], dim: [0, 3, 6], dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10], aug: [0, 4, 8], mmaj7: [0, 3, 7, 11],
};
// 'F#m7', 'C/E', 'Bbmaj7' -> { root, tones (semitones from root), bass (pitch class) }
export function chord(sym) {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym);
  if (!m || !(m[2] in QUAL)) throw new Error(`Unknown chord ${sym}`);
  const root = pc(m[1]);
  return { sym, root, tones: QUAL[m[2]], bass: m[3] ? pc(m[3]) : root };
}
// a pitch class placed in an octave: midi of `p` at or above C of `oct`
const inOct = (p, oct) => 12 * (oct + 1) + p;

// Degree tokens for generated bass and arpeggio lines: chord tones (1 3 5 7), the
// octave (8), the 9th (9), scale steps relative to the root (2 4 6 b7), and '-' for
// below (-5 = fifth below the root, -8 = octave below).
function degree(tok, ch, oct) {
  const below = tok.startsWith('-');
  const d = below ? tok.slice(1) : tok;
  const base = inOct(ch.root, oct);
  const t = ch.tones;
  let n;
  switch (d) {
    case 'B': n = inOct(ch.bass, oct); if (n > base + 4) n -= 12; break; // slash bass
    case '1': n = base; break;
    case '3': n = base + t[1]; break;
    case '5': n = base + (t[2] ?? 7); break;
    case '7': n = base + (t[3] ?? 10); break;
    case '8': n = base + 12; break;
    case '9': n = base + 14; break;
    case '10': n = base + 12 + t[1]; break;
    case '2': n = base + 2; break;
    case '4': n = base + 5; break;
    case '6': n = base + 9; break;
    case 'b7': n = base + 10; break;
    case 'b3': n = base + 3; break;
    default: throw new Error(`Unknown degree ${tok}`);
  }
  return below ? n - 12 : n;
}

// ---------------------------------------------------------------- patterns
// Token grammar for written lines (whitespace separated, '|' marks bars):
//   C5  F#4:4  Bb3:2   a note, length in steps (default 1)
//   C5+E5:4           notes together
//   .  .:4            rest
//   ~D5:2             slide in from the previous note
//   !C5  ?C5          accent / ghost
function parseLine(str, where) {
  const ev = [];
  let step = 0;
  for (const raw of str.trim().split(/\s+/)) {
    if (!raw || raw === '|') continue;
    let tok = raw, accent = 1, glide = false;
    while (/^[!?~]/.test(tok)) {
      if (tok[0] === '!') accent = 1.3; else if (tok[0] === '?') accent = 0.55; else glide = true;
      tok = tok.slice(1);
    }
    const [body, lenStr] = tok.split(':');
    const len = lenStr ? +lenStr : 1;
    if (!(len > 0)) throw new Error(`${where}: bad length in ${raw}`);
    if (body !== '.') {
      const notes = body.split('+').map(midi);
      if (notes.some((n) => n == null)) throw new Error(`${where}: bad note ${raw}`);
      ev.push({ step, notes, len, vel: accent, glide });
    }
    step += len;
  }
  return { ev, steps: step };
}

// chord progression: 'Am F C G' (one bar each) or 'Am:8 G:8'
function parseChords(str, bar, where) {
  const out = [];
  let step = 0;
  for (const raw of str.trim().split(/\s+/)) {
    if (!raw || raw === '|') continue;
    const [sym, lenStr] = raw.split(':');
    const len = lenStr ? +lenStr : bar;
    out.push({ step, len, ch: chord(sym) });
    step += len;
  }
  if (!out.length) throw new Error(`${where}: empty progression`);
  return { list: out, steps: step };
}
const chordAt = (prog, s) => {
  for (let i = prog.list.length - 1; i >= 0; i--) if (prog.list[i].step <= s) return prog.list[i].ch;
  return prog.list[0].ch;
};

// generated line: tokens of degrees with lengths, repeating every `cycle` tokens over the
// section; each note takes the chord sounding at its step.
function genLine(spec, prog, total, perBar) {
  const toks = spec.pat.trim().split(/\s+/).filter((t) => t && t !== '|');
  const ev = [];
  let step = 0, i = 0;
  const barSync = spec.sync !== false; // restart the pattern each bar
  let barStart = 0;
  while (step < total) {
    if (barSync && step - barStart >= perBar * (spec.bars || 1)) { barStart = step; i = 0; }
    const raw = toks[i % toks.length]; i++;
    let tok = raw, accent = 1, glide = false;
    while (/^[!?~]/.test(tok)) { if (tok[0] === '!') accent = 1.3; else if (tok[0] === '?') accent = 0.55; else glide = true; tok = tok.slice(1); }
    const [d, lenStr] = tok.split(':');
    const len = lenStr ? +lenStr : 1;
    if (d !== '.') {
      const ch = chordAt(prog, step);
      ev.push({ step, notes: [degree(d, ch, spec.oct)], len: Math.min(len, total - step), vel: accent, glide });
    }
    step += len;
  }
  return ev;
}

// pad: hold each chord (or play it on a rhythm of 'x' hits per bar)
function genPad(spec, prog, total, perBar) {
  const ev = [];
  const voicing = (ch) => {
    const top = spec.top ?? 5; // keep voices near this octave: root position from oct
    const tones = ch.tones.filter((t) => t < 12 || spec.ext);
    const notes = tones.map((t) => inOct(ch.root, spec.oct) + t);
    // close voicing: fold notes above the top limit down an octave
    const limit = inOct(spec.limit ?? 7, top);
    return notes.map((n) => (n > limit ? n - 12 : n)).sort((a, b) => a - b);
  };
  if (spec.rhythm) {
    const r = parseLine(spec.rhythm.replace(/x/g, 'C4'), 'pad rhythm');
    const cyc = r.steps;
    for (let base = 0; base < total; base += cyc) {
      for (const e of r.ev) {
        const s = base + e.step;
        if (s >= total) break;
        ev.push({ step: s, notes: voicing(chordAt(prog, s)), len: Math.min(e.len, total - s), vel: e.vel, chord: true });
      }
    }
  } else {
    for (const c of prog.list) ev.push({ step: c.step, notes: voicing(c.ch), len: c.len, vel: 1, chord: true });
  }
  return ev;
}

// Scales for diatonic harmony
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10] };
// 'D' major, 'Am' minor, 'Am harmonic', 'G mixolydian'
export function keyScale(key) {
  const m = /^([A-G][#b]?)(m?)(?:\s+(\w+))?$/.exec(key);
  const mode = m[3] || (m[2] ? 'minor' : 'major');
  return { tonic: pc(m[1]), steps: SCALES[mode] };
}
function diatonic(n, by, sc) {
  const rel = ((n - sc.tonic) % 12 + 12) % 12;
  let idx = 0;
  for (let i = 0; i < sc.steps.length; i++) if (sc.steps[i] <= rel) idx = i;
  const off = rel - sc.steps[idx]; // accidental
  const k = idx + by;
  const oct = Math.floor(k / sc.steps.length);
  const deg = ((k % sc.steps.length) + sc.steps.length) % sc.steps.length;
  return n - rel + sc.steps[deg] + oct * 12 + off;
}
// A harmony line under (or over) another channel: the nearest chord tone a third to a
// sixth below each note (short passing notes are left alone), or a fixed diatonic
// interval in the key (interval: 7 doubles an octave up). oct shifts it.
function genFollow(spec, src, prog, key) {
  const sc = key ? keyScale(key) : null;
  const out = [];
  for (const e of src) {
    const n = e.notes[e.notes.length - 1];
    let h;
    if (spec.interval != null) h = sc ? diatonic(n, spec.interval, sc) : n + spec.interval;
    else {
      if (!isChordTone(prog, e.step, n) && e.len <= 1) continue;
      const ch = chordAt(prog, e.step);
      const pcs = ch.tones.map((t) => (ch.root + t) % 12);
      for (let d = 3; d <= 9; d++) if (pcs.includes((((n - d) % 12) + 12) % 12)) { h = n - d; break; }
      if (h == null) h = n - 4;
    }
    out.push({ ...e, notes: [h + 12 * (spec.oct || 0)], vel: e.vel * (spec.vel ?? 1) });
  }
  return out;
}
function isChordTone(prog, step, n) {
  const ch = chordAt(prog, step);
  return ch.tones.some((t) => (ch.root + t) % 12 === ((n % 12) + 12) % 12);
}

// drums: lanes of one bar (repeating) or the whole section. x hit, X accent, g ghost.
const DRUMS = ['k', 's', 'h', 'o', 'c', 'r', 't', 'm', 'l', 'p', 'x', 'b', 'T', 'z'];
function genDrums(spec, total, perBar, where) {
  const ev = [];
  const lanes = (obj, from, to) => {
    for (const [d, str] of Object.entries(obj)) {
      if (!DRUMS.includes(d)) throw new Error(`${where}: unknown drum ${d}`);
      let s = str.replace(/[\s|]/g, '');
      if (!s.length) continue;
      if (s.length < perBar) s = s.padEnd(perBar, '.'); // 'x' = one hit at the start of the bar
      if (perBar % s.length && s.length % perBar && s.length !== total) throw new Error(`${where}: drum lane ${d} is ${s.length} steps`);
      for (let st = from; st < to; st++) {
        const c = s[(st - (s.length === total ? 0 : from)) % s.length];
        if (c === '.' || c === undefined) continue;
        ev.push({ step: st, drum: d, vel: c === 'X' ? 1.3 : c === 'g' ? 0.45 : 1 });
      }
    }
  };
  const { fill, start, ...main } = spec;
  const fillAt = fill ? total - perBar : total;
  lanes(main, 0, fillAt);
  if (start) lanes(start, 0, Math.min(perBar, total));
  if (fill) lanes(fill, fillAt, total);
  return ev;
}

// Compile a song once: per section, the events of each channel by step.
export function compileSong(song, name = 'song') {
  const bar = song.bar || 16;
  const sections = {};
  for (const [id, sec] of Object.entries(song.sections)) {
    const where = `${name}.${id}`;
    const total = sec.bars * bar;
    const prog = sec.chords ? parseChords(sec.chords, bar, where) : null;
    if (prog && prog.steps !== total) throw new Error(`${where}: chords cover ${prog.steps} of ${total} steps`);
    const ch = {};
    const later = [];
    const add = (key, spec, hype) => {
      const chan = hype ? 'hype.' + key : key;
      if (key === 'drums') { ch[chan] = genDrums(spec, total, bar, where); return; }
      if (spec.follow) { later.push([chan, spec]); return; }
      if (typeof spec === 'string') {
        const p = parseLine(spec, `${where}.${key}`);
        if (p.steps !== total) throw new Error(`${where}.${key}: ${p.steps} steps, expected ${total}`);
        ch[chan] = p.ev;
      } else if (spec.pat) {
        if (!prog) throw new Error(`${where}.${key}: generated line needs chords`);
        ch[chan] = genLine(spec, prog, total, bar);
      } else if (spec.pad) {
        if (!prog) throw new Error(`${where}.${key}: pad needs chords`);
        ch[chan] = genPad(spec, prog, total, bar);
      } else throw new Error(`${where}.${key}: unknown spec`);
    };
    for (const [key, spec] of Object.entries(sec)) {
      if (['bars', 'chords', 'hype', 'inst', 'key'].includes(key)) continue;
      add(key, spec, false);
    }
    if (sec.hype) for (const [key, spec] of Object.entries(sec.hype)) add(key, spec, true);
    for (const [chan, spec] of later) {
      const src = ch[spec.follow];
      if (!src) throw new Error(`${where}.${chan}: follows missing channel ${spec.follow}`);
      if (!prog) throw new Error(`${where}.${chan}: harmony needs chords`);
      ch[chan] = genFollow(spec, src, prog, sec.key || song.key);
    }
    // index by step
    const byStep = new Map();
    for (const [chan, list] of Object.entries(ch)) {
      for (const e of list) {
        if (!byStep.has(e.step)) byStep.set(e.step, []);
        byStep.get(e.step).push([chan, e]);
      }
    }
    sections[id] = { total, byStep, prog, chans: ch, inst: sec.inst || {}, key: sec.key };
  }
  for (const id of song.order) if (!sections[id]) throw new Error(`${name}: order names missing section ${id}`);
  return { ...song, bar, beat: song.beat || 4, sections };
}

// ---------------------------------------------------------------- instruments
// osc: 'pulse12' | 'pulse25' | 'pulse50' | 'triangle' | 'sine' | 'saw' | 'square'
// a d s r: envelope (s is a level). gain: peak. echo: send level. vib: vibrato.
// filter: lowpass { f, q, env (Hz added at the start), decay }. fm: { ratio, index, decay }.
// detune: cents for a second, detuned oscillator. arp: cycle chord notes this fast (s).
export const INST = {
  lead: { osc: 'pulse25', a: 0.006, d: 0.18, s: 0.72, r: 0.07, gain: 0.16, echo: 0.28, vib: { delay: 0.2, rate: 5.6, depth: 0.011 }, glide: 0.05 },
  lead50: { osc: 'pulse50', a: 0.006, d: 0.2, s: 0.65, r: 0.07, gain: 0.13, echo: 0.28, vib: { delay: 0.2, rate: 5.4, depth: 0.01 }, glide: 0.05 },
  lead12: { osc: 'pulse12', a: 0.004, d: 0.15, s: 0.7, r: 0.06, gain: 0.15, echo: 0.3, vib: { delay: 0.18, rate: 5.8, depth: 0.012 }, glide: 0.045 },
  harm: { osc: 'pulse12', a: 0.008, d: 0.2, s: 0.6, r: 0.08, gain: 0.12, echo: 0.3, vib: { delay: 0.25, rate: 5.2, depth: 0.008 } },
  flute: { osc: 'triangle', a: 0.03, d: 0.2, s: 0.85, r: 0.12, gain: 0.17, echo: 0.35, vib: { delay: 0.22, rate: 5, depth: 0.01 }, glide: 0.06 },
  fiddle: { osc: 'saw', detune: 6, a: 0.025, d: 0.2, s: 0.8, r: 0.08, gain: 0.11, echo: 0.22, filter: { f: 2600, q: 1.2, env: 900, decay: 0.12 }, vib: { delay: 0.12, rate: 6.2, depth: 0.014 }, glide: 0.04 },
  brass: { osc: 'saw', detune: 8, a: 0.03, d: 0.25, s: 0.75, r: 0.12, gain: 0.105, echo: 0.25, filter: { f: 1100, q: 1.5, env: 2600, decay: 0.22 }, vib: { delay: 0.3, rate: 5, depth: 0.008 } },
  strings: { osc: 'saw', detune: 11, a: 0.22, d: 0.3, s: 0.85, r: 0.35, gain: 0.04, echo: 0.3, filter: { f: 1700, q: 0.6 } },
  pad: { osc: 'pulse50', detune: 9, a: 0.12, d: 0.4, s: 0.6, r: 0.3, gain: 0.025, echo: 0.35, filter: { f: 1400, q: 0.7 } },
  organ: { osc: 'pulse50', detune: 4, a: 0.01, d: 0.05, s: 0.9, r: 0.08, gain: 0.03, echo: 0.2, filter: { f: 2200, q: 0.5 } },
  chip: { osc: 'pulse25', a: 0.003, d: 0.1, s: 0.55, r: 0.04, gain: 0.08, echo: 0.25, arp: 1 / 40 },
  arp: { osc: 'pulse12', a: 0.002, d: 0.09, s: 0.35, r: 0.04, gain: 0.1, echo: 0.35 },
  pluck: { osc: 'pulse25', a: 0.002, d: 0.28, s: 0, r: 0.08, gain: 0.08, echo: 0.3, filter: { f: 700, q: 2, env: 4200, decay: 0.14 } },
  harp: { osc: 'triangle', a: 0.002, d: 0.6, s: 0, r: 0.2, gain: 0.16, echo: 0.4 },
  bell: { osc: 'sine', fm: { ratio: 3.5, index: 2.2, decay: 0.5 }, a: 0.002, d: 1.4, s: 0, r: 0.5, gain: 0.09, echo: 0.4 },
  celesta: { osc: 'sine', fm: { ratio: 4, index: 1.1, decay: 0.25 }, a: 0.002, d: 0.7, s: 0, r: 0.3, gain: 0.1, echo: 0.45 },
  epiano: { osc: 'sine', fm: { ratio: 1, index: 1.6, decay: 0.6 }, a: 0.004, d: 1.1, s: 0.25, r: 0.25, gain: 0.07, echo: 0.3, vib: { delay: 0.3, rate: 4.5, depth: 0.004 } },
  bass: { osc: 'triangle', a: 0.003, d: 0.08, s: 0.9, r: 0.04, gain: 0.14, echo: 0 },
  pbass: { osc: 'pulse50', a: 0.003, d: 0.12, s: 0.7, r: 0.05, gain: 0.11, echo: 0, filter: { f: 500, q: 2.5, env: 1400, decay: 0.09 } },
  sbass: { osc: 'saw', a: 0.003, d: 0.15, s: 0.6, r: 0.05, gain: 0.15, echo: 0, filter: { f: 380, q: 4, env: 1800, decay: 0.1 } },
  sub: { osc: 'sine', a: 0.004, d: 0.1, s: 0.95, r: 0.06, gain: 0.2, echo: 0 },
  drums: { gain: 1, echo: 0.08 },
};

// backing parts left out in light mode
const LITE_SKIP = new Set(['pad', 'counter', 'bells', 'strings']);

// default stereo placement per channel name (SNES-ish width)
const PAN = { lead: 0, harm: -0.35, counter: 0.3, arp: 0.4, pad: -0.2, comp: -0.25, bass: 0, drums: 0, bells: 0.35, strings: -0.3 };

export function makePulse(ctx, duty) {
  const n = 48;
  const real = new Float32Array(n), imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(2 * k * Math.PI * duty);
    imag[k] = (2 / (k * Math.PI)) * (1 - Math.cos(2 * k * Math.PI * duty));
  }
  return ctx.createPeriodicWave(real, imag);
}

export class MusicEngine {
  constructor(ctx, dest, noise) {
    this.ctx = ctx;
    this.noise = noise;
    this.out = ctx.createGain(); // ducked by jingles
    this.out.connect(dest);
    this.waves = { pulse12: makePulse(ctx, 0.125), pulse25: makePulse(ctx, 0.25), pulse50: makePulse(ctx, 0.5) };
    // echo: delay with a darkening feedback loop
    this.echoIn = ctx.createGain();
    this.delay = ctx.createDelay(1.5);
    this.fb = ctx.createGain(); this.fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    this.echoOut = ctx.createGain(); this.echoOut.gain.value = 0.55;
    this.echoIn.connect(this.delay);
    this.delay.connect(lp).connect(hp).connect(this.fb).connect(this.delay);
    hp.connect(this.echoOut).connect(this.out);
    this.compiled = new Map();
    this.song = null;
    this.intensity = 0;
    this.chans = {};
    this.lite = false; // slow devices: no backing layers, single oscillators, no vibrato or FM
  }

  load(name, def) {
    if (!this.compiled.has(name)) this.compiled.set(name, compileSong(def, name));
    return this.compiled.get(name);
  }

  play(name, def, at) {
    const ctx = this.ctx;
    const t0 = at ?? ctx.currentTime + 0.06;
    // fade the old song's channels out
    for (const c of Object.values(this.chans)) {
      c.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      setTimeout(() => c.gain.disconnect(), 1500);
    }
    this.chans = {};
    if (!def) { this.song = null; return; }
    const song = this.load(name, def);
    this.song = song; this.name = name;
    this.pos = { i: 0, step: 0 };
    this.nextT = t0;
    this.lastNote = {};
    const stepDur = 60 / song.bpm / song.beat;
    const echoT = (song.echo && song.echo.steps ? song.echo.steps : 3) * stepDur;
    this.delay.delayTime.setTargetAtTime(Math.min(1.4, echoT), ctx.currentTime, 0.05);
    this.fb.gain.setTargetAtTime(song.echo && song.echo.fb != null ? song.echo.fb : 0.32, ctx.currentTime, 0.05);
    this.out.gain.cancelScheduledValues(ctx.currentTime);
    this.out.gain.setTargetAtTime(song.gain ?? 1, ctx.currentTime, 0.05);
    this.duckLevel = song.gain ?? 1;
  }

  // a channel's output: gain (for layers) -> panner -> out, plus an echo send
  chan(name, inst) {
    if (this.chans[name]) return this.chans[name];
    const ctx = this.ctx;
    const base = name.replace(/^hype\./, '');
    const gain = ctx.createGain();
    const hype = name.startsWith('hype.');
    gain.gain.value = hype && this.intensity < 1 ? 0 : 1;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const p = (this.song.pan && this.song.pan[base]) ?? PAN[base] ?? 0;
    if (pan) { pan.pan.value = p; gain.connect(pan).connect(this.out); } else gain.connect(this.out);
    const send = ctx.createGain(); send.gain.value = inst.echo ?? 0.2;
    gain.connect(send).connect(this.echoIn);
    return (this.chans[name] = { gain, send, hype });
  }

  setIntensity(level) {
    if (level === this.intensity) return;
    this.intensity = level;
    for (const c of Object.values(this.chans)) if (c.hype) c.gain.gain.setTargetAtTime(level >= 1 ? 1 : 0, this.ctx.currentTime, 0.4);
  }

  duck(amount, dur) {
    const g = this.out.gain, t = this.ctx.currentTime;
    const full = this.duckLevel ?? 1;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(full * amount, t, 0.04);
    g.setTargetAtTime(full, t + dur, 0.35);
  }

  instOf(song, sec, chanName) {
    const base = chanName.replace(/^hype\./, '');
    const id = sec.inst[base] || (song.inst && song.inst[base]) || base;
    return INST[id] || INST.lead;
  }

  // Play a short piece once (a jingle) into `dest`. Returns its length in seconds.
  playOnce(name, def, dest) {
    const ctx = this.ctx;
    const song = this.load('once:' + name, def);
    const stepDur = 60 / song.bpm / song.beat;
    const t0 = ctx.currentTime + 0.03;
    const outs = {};
    let t = t0;
    for (const id of song.order) {
      const sec = song.sections[id];
      for (const [step, evs] of sec.byStep) {
        for (const [chan, e] of evs) {
          const inst = this.instOf(song, sec, chan);
          if (!outs[chan]) {
            const g = ctx.createGain(); g.gain.value = def.gain ?? 1; g.connect(dest);
            const send = ctx.createGain(); send.gain.value = inst.echo ?? 0.2;
            g.connect(send).connect(this.echoIn);
            outs[chan] = g;
          }
          const at = t + step * stepDur;
          if (e.drum) this.drum(e.drum, at, e.vel, outs[chan], song.drumVol ?? 1);
          else this.voice(inst, e.notes, at, e.len * stepDur * 0.94, e.vel, outs[chan], null);
        }
      }
      t += sec.total * stepDur;
    }
    const len = t - t0;
    setTimeout(() => Object.values(outs).forEach((g) => g.disconnect()), (len + 4) * 1000);
    return len;
  }

  schedule(lookahead = 0.15) {
    const song = this.song;
    if (!song) return;
    const ctx = this.ctx;
    const stepDur = 60 / song.bpm / song.beat;
    while (this.nextT < ctx.currentTime + lookahead) {
      const sec = song.sections[song.order[this.pos.i]];
      let t = this.nextT;
      if (song.swing && this.pos.step % 2 === 1) t += stepDur * song.swing;
      const evs = sec.byStep.get(this.pos.step);
      if (evs) for (const [chan, e] of evs) this.fire(sec, chan, e, t, stepDur);
      this.nextT += stepDur;
      this.pos.step++;
      if (this.pos.step >= sec.total) {
        this.pos.step = 0;
        this.pos.i++;
        if (this.pos.i >= song.order.length) this.pos.i = song.loop ?? 0;
      }
    }
  }

  fire(sec, chan, e, t, stepDur) {
    const inst = this.instOf(this.song, sec, chan);
    const c = this.chan(chan, inst);
    if (c.hype && this.intensity < 1) return; // silent layer: don't spend voices
    if (this.lite && LITE_SKIP.has(chan.replace(/^hype\./, ''))) return;
    if (e.drum) { this.drum(e.drum, t, e.vel, c.gain, this.song.drumVol ?? 1); return; }
    const dur = e.len * stepDur * (inst.legato ?? 0.94);
    const from = e.glide ? this.lastNote[chan] : null;
    this.voice(inst, e.notes, t, dur, e.vel, c.gain, from);
    this.lastNote[chan] = e.notes[e.notes.length - 1];
  }

  // ---------------------------------------------------------------- synthesis
  osc(type, f, t) {
    const o = this.ctx.createOscillator();
    if (this.waves[type]) o.setPeriodicWave(this.waves[type]);
    else o.type = type === 'saw' ? 'sawtooth' : type;
    o.frequency.setValueAtTime(f, t);
    return o;
  }

  voice(inst, notes, t, dur, vel, dest, glideFrom) {
    const ctx = this.ctx;
    if (this.lite) inst = { ...inst, detune: 0, vib: null, fm: null };
    const peak = inst.gain * vel;
    const end = t + dur;
    const stop = end + inst.r + 0.05;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + inst.a);
    const sus = Math.max(0.0002, peak * inst.s);
    g.gain.setTargetAtTime(sus, t + inst.a, inst.d / 3);
    g.gain.setTargetAtTime(0.0001, end, inst.r / 4);
    let node = g;
    if (inst.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = inst.filter.q ?? 0.7;
      const top = inst.filter.f + (inst.filter.env || 0) * Math.min(1.3, vel);
      f.frequency.setValueAtTime(top, t);
      if (inst.filter.env) f.frequency.setTargetAtTime(inst.filter.f, t + 0.005, inst.filter.decay / 3);
      f.connect(g);
      node = f;
    }
    g.connect(dest);
    const freqs = notes.map(freq);
    const oscs = [];
    const fsets = []; // frequency params to drive
    const start = (o) => { o.start(t); o.stop(stop); oscs.push(o); };
    if (inst.arp && freqs.length > 1) {
      // classic chip chord: one voice cycling through the notes
      const o = this.osc(inst.osc, freqs[0], t);
      for (let k = 0, tt = t; tt < end; k++, tt += inst.arp) o.frequency.setValueAtTime(freqs[k % freqs.length], tt);
      o.connect(node); start(o);
    } else {
      for (const f0 of freqs) {
        const mk = (cents) => {
          const o = this.osc(inst.osc, f0, t);
          if (cents) o.detune.setValueAtTime(cents, t);
          if (glideFrom != null && freqs.length === 1) {
            o.frequency.setValueAtTime(freq(glideFrom), t);
            o.frequency.exponentialRampToValueAtTime(f0, t + (inst.glide || 0.06));
          }
          if (inst.fm) {
            const mod = ctx.createOscillator(); mod.type = 'sine';
            mod.frequency.setValueAtTime(f0 * inst.fm.ratio, t);
            const mg = ctx.createGain();
            mg.gain.setValueAtTime(f0 * inst.fm.index * vel, t);
            mg.gain.setTargetAtTime(f0 * inst.fm.index * 0.12, t, inst.fm.decay / 3);
            mod.connect(mg).connect(o.frequency);
            mod.start(t); mod.stop(stop);
          }
          o.connect(node); start(o); fsets.push(o);
        };
        mk(0);
        if (inst.detune) mk(inst.detune);
      }
    }
    if (inst.vib && dur > inst.vib.delay + 0.05) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = inst.vib.rate;
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(freqs[0] * inst.vib.depth, t + inst.vib.delay + 0.15);
      lfo.connect(lg);
      for (const o of fsets) lg.connect(o.frequency);
      lfo.start(t); lfo.stop(stop);
    }
  }

  noiseHit(t, dur, vol, type, f, q, dest, attack = 0.002, sweepTo) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (sweepTo) flt.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }

  sweep(t, f0, f1, dur, vol, dest, type = 'sine', fall = 0.5) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * fall);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Drums are synthesized once into short samples, then played back: one node per hit
  // instead of several oscillators and filters (the SNES way). Until the samples are
  // ready, hits are synthesized live.
  prepareDrums() {
    const sr = this.ctx.sampleRate;
    const LEN = { k: 0.4, s: 0.24, h: 0.07, o: 0.34, c: 1.6, r: 0.5, t: 0.34, m: 0.38, l: 0.44, T: 0.95, p: 0.2, x: 0.05, b: 0.34, z: 0.1 };
    this.drumBufs = this.drumBufs || {};
    let chain = Promise.resolve();
    for (const [d, len] of Object.entries(LEN)) {
      chain = chain.then(() => {
        const off = new OfflineAudioContext(1, Math.ceil(sr * len), sr);
        const synth = Object.create(MusicEngine.prototype);
        synth.ctx = off; synth.noise = this.noise;
        synth.waves = { pulse12: makePulse(off, 0.125), pulse25: makePulse(off, 0.25), pulse50: makePulse(off, 0.5) };
        synth.drumSynth(d, 0, 1, off.destination, 1);
        return off.startRendering().then((buf) => { this.drumBufs[d] = buf; });
      });
    }
    return chain.catch(() => {});
  }

  drum(d, t, vel, dest, drumVol = 1) {
    const buf = this.drumBufs && this.drumBufs[d];
    if (!buf) return this.drumSynth(d, t, vel, dest, drumVol);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vel * drumVol;
    src.connect(g).connect(dest);
    src.start(t);
  }

  // the synthesized drum kit
  drumSynth(d, t, vel, dest, drumVol = 1) {
    const v = vel * drumVol * 0.75;
    switch (d) {
      case 'k': this.sweep(t, 160, 42, 0.32, 0.55 * v, dest, 'sine', 0.35); this.noiseHit(t, 0.012, 0.12 * v, 'highpass', 3000, 0.7, dest); break;
      case 's':
        this.noiseHit(t, 0.17, 0.22 * v, 'highpass', 1400, 0.7, dest);
        this.noiseHit(t, 0.09, 0.14 * v, 'bandpass', 3800, 1.2, dest);
        this.sweep(t, 210, 160, 0.09, 0.16 * v, dest, 'triangle');
        break;
      case 'h': this.noiseHit(t, 0.045, 0.06 * v, 'highpass', 7500, 0.8, dest); break;
      case 'o': this.noiseHit(t, 0.28, 0.055 * v, 'highpass', 7000, 0.8, dest, 0.004); break;
      case 'c': this.noiseHit(t, 1.5, 0.11 * v, 'highpass', 4500, 0.6, dest, 0.003); this.noiseHit(t, 0.9, 0.05 * v, 'bandpass', 9000, 1, dest); break;
      case 'r': this.noiseHit(t, 0.45, 0.04 * v, 'highpass', 6500, 0.8, dest); this.sweep(t, 3100, 3000, 0.3, 0.01 * v, dest, 'sine'); break;
      case 't': this.sweep(t, 300, 170, 0.28, 0.32 * v, dest, 'sine', 0.6); this.noiseHit(t, 0.05, 0.05 * v, 'lowpass', 2000, 0.7, dest); break;
      case 'm': this.sweep(t, 210, 120, 0.32, 0.34 * v, dest, 'sine', 0.6); this.noiseHit(t, 0.05, 0.05 * v, 'lowpass', 1600, 0.7, dest); break;
      case 'l': this.sweep(t, 140, 78, 0.38, 0.38 * v, dest, 'sine', 0.6); this.noiseHit(t, 0.06, 0.05 * v, 'lowpass', 1200, 0.7, dest); break;
      case 'T': this.sweep(t, 98, 86, 0.9, 0.36 * v, dest, 'sine', 0.8); this.noiseHit(t, 0.4, 0.06 * v, 'lowpass', 500, 0.7, dest, 0.01); break; // timpani
      case 'p':
        for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, 0.03, 0.14 * v, 'bandpass', 1500, 1.1, dest);
        this.noiseHit(t + 0.033, 0.14, 0.1 * v, 'bandpass', 1300, 0.9, dest);
        break;
      case 'x': this.sweep(t, 1800, 1700, 0.03, 0.08 * v, dest, 'triangle'); this.noiseHit(t, 0.02, 0.06 * v, 'bandpass', 3500, 1.5, dest); break; // rim
      case 'b': { // cowbell
        const ctx = this.ctx;
        const g = ctx.createGain(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 2;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        for (const f of [540, 800]) { const o = this.osc('pulse50', f, t); o.connect(bp); o.start(t); o.stop(t + 0.32); }
        bp.connect(g).connect(dest);
        break;
      }
      case 'z': this.noiseHit(t, 0.07, 0.05 * v, 'highpass', 9000, 0.7, dest, 0.03); break; // shaker
    }
  }
}

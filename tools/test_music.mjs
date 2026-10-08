// Compile every song and jingle, then lint the harmony: on strong beats, a held melody
// note a semitone away from the chord (and not in it) is a clash; notes outside the key
// that aren't chord tones are flagged too. Also prints each track's length.
//   node tools/test_music.mjs [--verbose]
import { compileSong, keyScale } from '../src/music.js';
import { SONGS, JINGLES } from '../src/songs.js';

const verbose = process.argv.includes('--verbose');
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nn = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const RANGE = { bass: [28, 60], lead: [55, 100] };
let problems = 0, warnings = 0;

function lint(name, def, oneShot) {
  let song;
  try { song = compileSong(def, name); } catch (e) { console.log(`✗ ${name}: ${e.message}`); problems++; return; }
  const beatSteps = song.beat;
  let secs = 0;
  const visit = (id) => {
    const sec = song.sections[id];
    const key = sec.key || def.key;
    const sc = key ? keyScale(key) : null;
    secs += sec.total * 60 / song.bpm / song.beat;
    for (const [chan, list] of Object.entries(sec.chans)) {
      if (chan.endsWith('drums')) continue;
      const base = chan.replace(/^hype\./, '');
      for (const e of list) {
        for (const n of e.notes) {
          const r = RANGE[base];
          if (r && (n < r[0] || n > r[1])) { console.log(`  ! ${name}.${id}.${chan} step ${e.step}: ${nn(n)} out of range`); warnings++; }
        }
        if (e.chord || !sec.prog) continue;
        const n = e.notes[e.notes.length - 1];
        let ch = sec.prog.list[0].ch;
        for (const c of sec.prog.list) if (c.step <= e.step) ch = c.ch;
        const pcs = ch.tones.map((t) => (ch.root + t) % 12);
        const p = n % 12;
        if (pcs.includes(p) || p === (ch.root + 2) % 12) continue; // chord tone or the 9th
        const strong = e.step % beatSteps === 0;
        const dist = Math.min(...pcs.map((q) => Math.min((p - q + 12) % 12, (q - p + 12) % 12)));
        const inKey = !sc || sc.steps.includes((p - sc.tonic + 12) % 12);
        const bar = Math.floor(e.step / song.bar) + 1, pos = e.step % song.bar;
        if (strong && e.len >= 2 && dist === 1) { console.log(`  ✗ ${name}.${id}.${chan} bar ${bar}+${pos}: ${nn(n)} clashes with ${ch.sym}`); problems++; }
        else if (!inKey && e.len >= 2) { console.log(`  ! ${name}.${id}.${chan} bar ${bar}+${pos}: ${nn(n)} outside ${key} over ${ch.sym}`); warnings++; }
      }
    }
  };
  for (const id of song.order) visit(id);
  const loopSecs = song.order.slice(song.loop ?? 0).reduce((a, id) => a + song.sections[id].total * 60 / song.bpm / song.beat, 0);
  if (verbose || !oneShot) console.log(`✓ ${name.padEnd(13)} ${(def.name || '').padEnd(26)} ${secs.toFixed(1)}s${oneShot ? '' : `, loop ${loopSecs.toFixed(1)}s`}`);
}

for (const [k, d] of Object.entries(SONGS)) lint(k, d, false);
for (const [k, d] of Object.entries(JINGLES)) lint('jingle.' + k, d, true);
console.log(`${Object.keys(SONGS).length} songs, ${Object.keys(JINGLES).length} jingles: ${problems} problems, ${warnings} warnings`);
process.exit(problems ? 1 : 0);

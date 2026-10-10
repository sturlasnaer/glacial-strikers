// The Puckbound soundtrack. Every track is written for the music engine in
// music.js: sections of 16th-note steps (12 eighth-note steps per bar for the jig) over
// a chord progression. Most tracks borrow the Puckbound motif (root, fifth below, root,
// second, third, fifth: "D A D E F# A" in the title theme).
//
// Lines:  C5:4 = a quarter note, .:4 = a quarter rest, '|' separates bars.
// Generated parts: { pat, oct } walks chord degrees, { pad, oct } holds chords,
// { follow: 'lead' } harmonises another part. Drums are one-bar lanes (x hit, X accent,
// g ghost), plus 'start' (first bar) and 'fill' (last bar).
// hype: parts that only join in when the match is close (intensity 1).

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// transpose a written line or a chord progression by semitones (spelled with sharps)
function tr(line, by) {
  return line.replace(/([A-G])([#b]?)(-?\d)/g, (_, l, acc, o) => {
    const m = 12 * (+o + 1) + NOTE[l] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + by;
    return SHARP[m % 12] + (Math.floor(m / 12) - 1);
  });
}
function trc(chords, by) {
  return chords.replace(/([A-G][#b]?)/g, (r) => SHARP[(NOTE[r[0]] + (r[1] === '#' ? 1 : r[1] === 'b' ? -1 : 0) + by + 12) % 12]);
}

// ------------------------------------------------------------------ shared drums
const ROCK = { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' };
const ROCK_FILL = { k: 'x.....x.x.......', s: '....x...x.x.xXXX', h: 'x.x.x.x.........', m: '..........x.....', l: '............x...' };
const DRIVE = { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' };
const DRIVE_FILL = { k: 'x.......x.......', s: '....x...xgx.XxXx', h: 'x.x.x.x.........', t: '..........x.....', l: '..............x.' };
const HYPE_DRUMS = { o: '..x...x...x...x.', k: '..........x.....' };

// ------------------------------------------------------------------ title theme
const TITLE_A = {
  chords: 'D A Bm G D A G A',
  lead: `D5:3 A4 D5:2 E5:2 F#5:4 A5:4 | A5:3 G5 F#5:2 E5:2 C#5:4 E5:4 | D5:3 B4 D5:2 F#5:2 B5:4 A5:2 F#5:2 | G5:4 B5:4 A5:4 G5:2 F#5:2 |
         D5:3 A4 D5:2 E5:2 F#5:4 A5:4 | B5:3 A5 G5:2 F#5:2 E5:4 C#6:4 | D6:4 B5:4 G5:2 A5:2 B5:4 | A5:8 G5:2 F#5:2 E5:4`,
};
const TITLE_B = {
  chords: 'Bm G D A Bm G Em A7',
  lead: `F#5:6 E5:2 D5:4 B4:4 | D5:6 E5:2 G5:8 | F#5:6 G5:2 A5:4 F#5:4 | E5:12 C#5:2 E5:2 |
         F#5:6 E5:2 D5:4 F#5:4 | B5:6 A5:2 G5:4 D5:4 | E5:4 G5:4 B5:4 E6:4 | C#6:6 B5:2 A5:4 G5:4`,
};

export const SONGS = {
  title: {
    name: 'Puckbound (title)', bpm: 140, key: 'D', gain: 1.25,
    inst: { pad: 'strings', arp: 'arp', counter: 'celesta' },
    sections: {
      intro: {
        bars: 2, chords: 'D A',
        lead: 'A4:2 A4 A4 D5:4 F#5:4 A5:4 | G5:4 F#5:4 E5:8',
        bass: { oct: 2, pat: '1:2' },
        pad: { pad: true, oct: 4 },
        drums: { k: 'x.......x.......', start: { c: 'x' }, fill: { k: 'x.......x.......', s: 'x...x...x.x.xxXX', T: 'x.......x.......' } },
      },
      A: {
        bars: 8, ...TITLE_A,
        bass: { oct: 2, pat: '1:2 1:2 8:2 1:2 1:2 8:2 1:2 5:2' },
        arp: { oct: 4, pat: '1 3 5 8 10 8 5 3' },
        pad: { pad: true, oct: 4 },
        drums: { ...ROCK, start: { c: 'x' }, fill: ROCK_FILL },
      },
      B: {
        bars: 8, ...TITLE_B,
        bass: { oct: 2, pat: '1:4 5:4 8:4 5:4' },
        pad: { pad: true, oct: 4 },
        counter: { oct: 5, pat: '1:2 5:2 8:2 5:2 3:2 5:2 8:2 5:2' },
        drums: { k: 'x.......x.......', s: '....x.......x...', r: 'x.x.x.x.x.x.x.x.', start: { c: 'x' }, fill: DRIVE_FILL },
      },
      A2: {
        bars: 8, ...TITLE_A,
        harm: { follow: 'lead' },
        bass: { oct: 2, pat: '1:2 1:2 8:2 1:2 1:2 8:2 1:2 5:2' },
        arp: { oct: 4, pat: '1 3 5 8 10 8 5 3' },
        pad: { pad: true, oct: 4 },
        drums: { ...ROCK, o: '..............x.', start: { c: 'x' }, fill: ROCK_FILL },
      },
    },
    order: ['intro', 'A', 'B', 'A2'], loop: 1,
  },

  // ---------------------------------------------------------------- locker room
  hub: {
    name: 'Locker Room', bpm: 96, key: 'F', swing: 0.22, gain: 1.3,
    inst: { lead: 'flute', comp: 'epiano', bass: 'bass', counter: 'celesta' },
    pan: { comp: -0.3, counter: 0.35 },
    sections: {
      A: {
        bars: 8, chords: 'Fmaj7 Am7 Dm7 G7 Bbmaj7 Am7 Gm7 C7',
        lead: `A4:2 C5:2 E5:4 .:2 D5:2 C5:4 | E5:6 G5:2 A5:4 G5:4 | F5:4 E5:2 D5:2 A4:4 C5:4 | B4:6 D5:2 F5:4 D5:4 |
               D5:2 F5:2 A5:6 G5:2 F5:4 | E5:4 C5:4 .:4 A4:4 | Bb4:4 D5:4 F5:4 A5:4 | G5:6 E5:2 .:4 C5:4`,
        comp: { pad: true, oct: 4, rhythm: '.:2 x:2 .:4 .:2 x:2 .:2 x:2' },
        bass: { oct: 2, pat: '1:4 3:4 5:4 7:4' },
        drums: { k: 'x.......x.x.....', x: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', z: '..x...x...x...x.' },
      },
      B: {
        bars: 8, chords: 'Gm7 C7 Fmaj7 Dm7 Gm7 C7 Fmaj7 Fmaj7',
        lead: `D5:3 F5 .:2 G5:2 A5:2 Bb5:2 A5:4 | G5:4 E5:4 Bb4:4 C5:4 | A5:8 .:2 G5:2 F5:2 E5:2 | F5:6 E5:2 D5:4 A4:4 |
               Bb4:2 D5:2 F5:2 A5:2 G5:4 F5:4 | E5:4 G5:2 Bb5:6 G5:4 | A5:12 .:4 | .:4 C5:2 D5:2 E5:2 F5:2 G5:4`,
        counter: { oct: 5, pat: '.:12 5:2 3:2' },
        comp: { pad: true, oct: 4, rhythm: '.:2 x:2 .:4 .:2 x:2 .:2 x:2' },
        bass: { oct: 2, pat: '1:4 3:4 5:4 7:4' },
        drums: { k: 'x.......x.x.....', x: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', z: '..x...x...x...x.', fill: { k: 'x.......x.......', x: '....x...x.x.x.x.', h: 'x.x.x.x.x.x.....' } },
      },
    },
    order: ['A', 'B'], loop: 0,
  },

  // ---------------------------------------------------------------- the locker room by the calendar (seasonal.js)
  // December: Jingle Bells (James Lord Pierpont, 1857, public domain), in the locker room's
  // key with sleigh-bell shakers. Halloween: an original, more giggly than ghostly.
  holiday: {
    name: 'Jingle Bells', bpm: 132, key: 'F', gain: 1.25,
    inst: { lead: 'celesta', comp: 'epiano', bass: 'pbass', counter: 'flute' },
    pan: { comp: -0.3, counter: 0.35 },
    sections: {
      A: {
        bars: 16, chords: 'F F F F Bb Bb:4 F:12 G7 C7 F F F F Bb Bb:4 F:12 C7 F', // (the first beat of bars 6 and 14 under the melody's Bb)
        lead: `A5:4 A5:4 A5:8 | A5:4 A5:4 A5:8 | A5:4 C6:4 F5:6 G5:2 | A5:16 |
               Bb5:4 Bb5:4 Bb5:6 Bb5:2 | Bb5:4 A5:4 A5:4 A5:2 A5:2 | A5:4 G5:4 G5:4 A5:4 | G5:8 C6:8 |
               A5:4 A5:4 A5:8 | A5:4 A5:4 A5:8 | A5:4 C6:4 F5:6 G5:2 | A5:16 |
               Bb5:4 Bb5:4 Bb5:4 Bb5:4 | Bb5:4 A5:4 A5:4 A5:2 A5:2 | C6:4 C6:4 Bb5:4 G5:4 | F5:16`,
        comp: { pad: true, oct: 4, rhythm: '.:4 x:4 .:4 x:4' },
        bass: { oct: 2, pat: '1:4 5:4 1:4 5:4' },
        drums: { k: 'x.......x.......', s: '....x.......x...', z: 'x.x.x.x.x.x.x.x.', start: { c: 'x' } },
      },
      B: {
        bars: 16, chords: 'F F F F Bb Bb:4 F:12 G7 C7 F F F F Bb Bb:4 F:12 C7 F', // (the first beat of bars 6 and 14 under the melody's Bb)
        lead: `A5:4 A5:4 A5:8 | A5:4 A5:4 A5:8 | A5:4 C6:4 F5:6 G5:2 | A5:16 |
               Bb5:4 Bb5:4 Bb5:6 Bb5:2 | Bb5:4 A5:4 A5:4 A5:2 A5:2 | A5:4 G5:4 G5:4 A5:4 | G5:8 C6:8 |
               A5:4 A5:4 A5:8 | A5:4 A5:4 A5:8 | A5:4 C6:4 F5:6 G5:2 | A5:16 |
               Bb5:4 Bb5:4 Bb5:4 Bb5:4 | Bb5:4 A5:4 A5:4 A5:2 A5:2 | C6:4 C6:4 Bb5:4 G5:4 | F5:16`,
        counter: { follow: 'lead' },
        comp: { pad: true, oct: 4, rhythm: '.:4 x:4 .:4 x:4' },
        bass: { oct: 2, pat: '1:4 3:4 5:4 3:4' },
        drums: { k: 'x.......x.......', s: '....x.......x...', z: 'xxxxxxxxxxxxxxxx', fill: { k: 'x.......x.......', s: '....x...x.x.xXXX', z: 'x.x.x.x.........' } },
      },
    },
    order: ['A', 'B'], loop: 0,
  },
  halloween: {
    name: 'Spooky Skate', bpm: 120, key: 'Dm', gain: 1.3,
    inst: { lead: 'celesta', comp: 'organ', bass: 'pbass', counter: 'flute' },
    pan: { comp: -0.3, counter: 0.35 },
    sections: {
      A: {
        bars: 8, chords: 'Dm Dm Bb:8 Gm:8 A Dm Gm:4 Dm:12 Gm A',
        lead: `D5:2 F5:2 A5:2 F5:2 D5:2 F5:2 A5:4 | A5:2 G5:2 F5:2 E5:2 D5:8 | D5:2 F5:2 Bb5:4 A5:2 G5:2 F5:4 | E5:4 C#5:4 A4:8 |
               D5:2 F5:2 A5:2 F5:2 D6:4 C6:4 | Bb5:2 A5:2 G5:2 F5:2 A5:8 | G5:2 Bb5:2 D6:2 Bb5:2 G5:4 E5:4 | A5:4 E5:4 C#5:4 A4:4`,
        comp: { pad: true, oct: 4, rhythm: 'x:2 .:6 x:2 .:6' },
        bass: { oct: 2, pat: '1:4 5:4 1:4 5:4' },
        drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', start: { c: 'x' } },
      },
      B: {
        bars: 8, chords: 'Gm Dm A Dm Gm Dm E7 A',
        lead: `G5:4 Bb5:4 D6:6 C6:2 | A5:4 F5:4 D5:8 | E5:2 F5:2 G5:2 A5:2 C#6:8 | D6:8 .:8 |
               Bb5:4 G5:4 D5:4 G5:4 | F5:4 A5:4 D6:8 | G#5:4 B5:4 D6:4 E6:4 | C#6:8 A5:8`,
        counter: { follow: 'lead' },
        comp: { pad: true, oct: 4, rhythm: 'x:2 .:6 x:2 .:6' },
        bass: { oct: 2, pat: '1:4 5:4 1:4 5:4' },
        drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', fill: { k: 'x.......x.......', s: '....x...x.x.xXXX', h: 'x.x.x.x.........' } },
      },
    },
    order: ['A', 'B'], loop: 0,
  },

  // ---------------------------------------------------------------- Frostline (home)
  frostline: {
    name: 'Frostline Faceoff', bpm: 152, key: 'Am', gain: 1.4,
    inst: { bass: 'sbass', arp: 'chip', pad: 'pad' },
    sections: {
      intro: {
        bars: 2, chords: 'Am G',
        bass: { oct: 2, pat: '1:2 8:2' },
        pad: { pad: true, oct: 4 },
        drums: { k: 'x...x...x...x...', h: 'x.x.x.x.x.x.x.x.', fill: { k: 'x...x...x...x...', s: '....x...xxxxXXXX', h: 'x.x.x.x.........' } },
      },
      A: {
        bars: 8, chords: 'Am F C G Am F G E',
        lead: `A4:3 E4 A4:2 B4:2 C5:4 E5:4 | F5:3 E5 C5:2 A4:2 C5:4 F5:4 | E5:3 D5 C5:2 E5:2 G5:4 E5:4 | D5:6 B4:2 G4:4 B4:4 |
               A4:3 E4 A4:2 B4:2 C5:4 E5:4 | A5:3 G5 F5:2 E5:2 F5:4 C5:4 | B4:3 C5 D5:2 G5:2 F5:2 E5:2 D5:4 | E5:4 G#5:4 B5:4 E5:4`,
        bass: { oct: 2, pat: '1:2 8:2 1:2 8:2 1:2 8:2 5:2 8:2' },
        pad: { pad: true, oct: 4 },
        drums: { ...DRIVE, start: { c: 'x' }, fill: DRIVE_FILL },
        hype: { harm: { follow: 'lead' }, arp: { oct: 4, pat: '1 5 8 5' }, drums: HYPE_DRUMS },
      },
      B: {
        bars: 8, chords: 'F G Em Am F G Am E',
        lead: `C6:6 A5:2 F5:4 A5:4 | B5:6 G5:2 D5:4 G5:4 | G5:6 E5:2 B4:4 E5:4 | A5:8 C6:4 B5:2 A5:2 |
               A5:4 F5:2 A5:2 C6:4 A5:4 | B5:4 G5:2 B5:2 D6:4 B5:4 | C6:6 B5:2 A5:4 E5:4 | G#5:4 B5:4 E6:4 B5:2 G#5:2`,
        bass: { oct: 2, pat: '1:2 1:2 8:2 1:2 1:2 8:2 1:2 5:2' },
        arp: { oct: 4, pat: '1 3 5 8 5 3' },
        pad: { pad: true, oct: 4 },
        drums: { ...ROCK, start: { c: 'x' }, fill: ROCK_FILL },
        hype: { harm: { follow: 'lead' }, drums: HYPE_DRUMS },
      },
      C: {
        bars: 8, chords: 'C G Am F C G F E',
        lead: `E5:8 G5:8 | D5:8 B4:8 | C5:8 E5:8 | F5:8 A5:8 | G5:8 E5:4 C5:4 | D5:4 G5:4 B5:8 | A5:4 C6:4 A5:4 F5:4 | G#5:4 E5:4 B4:4 G#4:4`,
        bass: { oct: 2, pat: '1:4 1:2 8:2 1:4 5:4' },
        arp: { oct: 4, pat: '1 3 5 8 10 8 5 3' },
        pad: { pad: true, oct: 4 },
        drums: { k: 'x.......x.......', s: '........x.......', h: 'x...x...x...x...', start: { c: 'x' }, fill: { k: 'x.......x.......', s: '........x.x.xXXX', l: '..x.....x...' + '....' } },
        hype: { harm: { follow: 'lead' }, drums: { h: '..x...x...x...x.', k: '....x.......x...' } },
      },
    },
    order: ['intro', 'A', 'B', 'A', 'C'], loop: 1,
  },

  // ---------------------------------------------------------------- Ember Dome (Comets)
  ember: {
    name: 'Ember Dome', bpm: 164, key: 'Am', gain: 1.1,
    inst: { lead: 'lead', bass: 'sbass', comp: 'brass', pad: 'pad' },
    pan: { comp: -0.3 },
    sections: {
      intro: {
        bars: 2, chords: 'Am E',
        bass: { oct: 2, pat: '1:2 1 1 8:2 1:2 1 1 8:2 5:2 8:2' },
        comp: { pad: true, oct: 4, rhythm: '!x:3 x:3 x:2 .:8' },
        drums: { l: 'x..x..x...x..x..', fill: { l: 'x..x..x.x.x.x.x.', m: '........x.x.x.x.', s: '............xXXX' } },
      },
      A: {
        bars: 8, chords: 'Am G F E Am G F E',
        lead: `A5:2 E5:2 A5:2 B5 C6 B5:2 A5:2 E5:4 | D6:2 B5:2 G5:2 A5 B5 A5:2 G5:2 D5:4 | C6:2 A5:2 F5:2 G5 A5 G5:2 F5:2 C5:4 | B5:2 G#5:2 E5:2 F5 G#5 B5:4 E6:4 |
               A5:4 C6:2 B5:2 A5:2 G5:2 A5:4 | G5:4 B5:2 A5:2 G5:2 F5:2 G5:4 | F5:4 A5:2 G5:2 F5:2 E5:2 F5:4 | E5:2 F5:2 G#5:2 A5:2 B5:4 .:4`,
        bass: { oct: 2, pat: '1:2 1 1 8:2 1:2 1 1 8:2 5:2 8:2' },
        comp: { pad: true, oct: 4, rhythm: '!x:3 x:3 x:2 .:8' },
        drums: { k: 'x..x..x...x..x..', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', start: { c: 'x' }, fill: { k: 'x..x..x.........', s: '....x...x.x.xXXX', t: '........x...', l: '..............x.' } },
        hype: { harm: { follow: 'lead' }, drums: { o: '..x...x...x...x.', l: '..........x..x..' } },
      },
      B: {
        bars: 8, chords: 'Dm Am Dm Am F G E E',
        lead: `D5:4 F5:4 A5:4 F5:4 | E5:4 C5:4 A4:8 | D5:4 F5:4 A5:4 D6:4 | C6:8 B5:4 A5:4 |
               A5:4 C6:4 F6:4 C6:4 | B5:4 D6:4 G6:4 D6:4 | G#5:2 B5:2 E6:2 G#6:2 B6:8 | B6:2 A6:2 G#6:2 F6:2 E6:4 .:4`,
        bass: { oct: 2, pat: '1:4 1:2 8:2 1:4 5:4' },
        pad: { pad: true, oct: 3 },
        comp: { pad: true, oct: 4, rhythm: 'x:2 .:6 x:2 .:6' },
        drums: { l: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x...x...x...x...', start: { c: 'x' }, fill: { l: 'x..x..x.x.x.x.x.', m: '........x.x.x.x.', s: '............xXXX' } },
        hype: { harm: { follow: 'lead' }, drums: { o: '..x...x...x...x.' } },
      },
      C: {
        bars: 8, chords: 'Am:32 F:32 G:32 E:32',
        lead: `E6:12 D6 C6 B5 A5 | C6:8 B5:4 A5:4 | A5:12 G5 F5 E5 F5 | C6:8 A5:4 F5:4 |
               B5:12 A5 G5 F5 G5 | D6:8 B5:4 G5:4 | G#5:4 B5:4 E6:4 G#6:4 | B6:2 A6:2 G#6:2 F6:2 E6:4 B5:4`,
        bass: { oct: 2, pat: '1:4' },
        pad: { pad: true, oct: 3 },
        comp: { pad: true, oct: 4, rhythm: '!x:2 .:14' },
        drums: { l: 'x..x..x...x..x..', m: '......x.......x.', s: '....x.......x...', start: { c: 'x' }, fill: { l: 'x.x.x.x.x.x.x.x.', s: '........xxxxXXXX', m: '..x...x...x...x.' } },
        hype: { harm: { follow: 'lead' }, drums: { k: 'x.......x.......' } },
      },
    },
    order: ['intro', 'A', 'B', 'A', 'C'], loop: 1,
  },

  // ---------------------------------------------------------------- Aurora Palace (Royals)
  aurora: {
    name: 'Aurora Palace', bpm: 132, key: 'Bb', gain: 1.2,
    inst: { lead: 'brass', bells: 'celesta', pad: 'strings', bass: 'bass' },
    sections: {
      intro: {
        bars: 2, chords: 'Bb F',
        bells: { oct: 5, pat: '1 5 8 10 8 5 3 5' },
        pad: { pad: true, oct: 4 },
        drums: { T: 'x.......x.......', fill: { T: 'x.......x.x.x.x.', s: 'g.g.g.g.gggggxXX' } },
      },
      A: {
        bars: 8, chords: 'Bb F/A Gm Eb Cm F Bb F',
        lead: `Bb4:3 D5 F5:4 Bb5:6 A5:2 | G5:3 F5 F5:4 C5:8 | D5:3 Eb5 F5:4 G5:4 Bb5:4 | Bb5:6 G5:2 Eb5:8 |
               C5:3 Eb5 G5:4 C6:6 Bb5:2 | A5:6 G5:2 F5:4 Eb5:4 | D5:4 F5:4 Bb5:4 D6:4 | C6:8 A5:4 F5:4`,
        bells: { oct: 5, pat: '1:2 5:2 8:2 10:2 8:2 5:2 3:2 5:2' },
        bass: { oct: 2, pat: 'B:4 5:4 B:4 5:4' },
        pad: { pad: true, oct: 4 },
        drums: { k: 'x.......x.......', s: '....x.......x.g.', h: '..x...x...x...x.', start: { c: 'x', T: 'x' }, fill: { k: 'x.......x.......', s: '....x...g.g.xgXX', T: '........x...x...' } },
        hype: { harm: { follow: 'lead' }, drums: { s: '..........g.....', o: '..............x.' } },
      },
      B: {
        bars: 8, chords: 'Gm Dm Eb Bb Cm Gm Eb F',
        lead: `G5:6 A5:2 Bb5:4 D6:4 | D6:6 C6:2 A5:4 F5:4 | G5:6 F5:2 Eb5:4 Bb4:4 | D5:8 F5:8 |
               Eb5:6 F5:2 G5:4 C6:4 | Bb5:6 A5:2 G5:4 D5:4 | Eb5:4 G5:4 Bb5:4 Eb6:4 | D6:4 C6:4 A5:4 F5:4`,
        bells: { oct: 6, pat: '1 5 3 5' },
        bass: { oct: 2, pat: '1:6 1:2 5:4 8:4' },
        pad: { pad: true, oct: 4 },
        drums: { k: 'x.......x.......', s: '....x.......x...', r: 'x.x.x.x.x.x.x.x.', T: 'x...............', start: { c: 'x' }, fill: { k: 'x.......x.......', s: '....x...xgxgxXXX', T: 'x.......x.x.x...' } },
        hype: { harm: { follow: 'lead' }, drums: { o: '..x...x...x...x.' } },
      },
      C: {
        bars: 8, chords: 'Ebmaj7 F Dm7 Gm7 Ebmaj7 F Gm F',
        lead: `G5:8 Bb5:4 D6:4 | C6:8 A5:4 F5:4 | F5:8 A5:4 C6:4 | D6:12 Bb5:4 | Eb6:8 D6:4 Bb5:4 | C6:8 F6:4 C6:4 | Bb5:4 D6:4 G6:4 D6:4 | C6:4 A5:4 F5:4 C5:4`,
        bells: { oct: 5, pat: '1 5 8 10 8 5 3 5' },
        bass: { oct: 2, pat: '1:8 5:8' },
        pad: { pad: true, oct: 4 },
        drums: { T: 'x...............', r: '..x...x...x...x.', x: '....x.......x...', start: { c: 'x' }, fill: { T: 'x.......x.x.x.x.', s: 'g.g.g.g.ggggxgXX' } },
        hype: { harm: { follow: 'lead' }, drums: { k: 'x.......x.......' } },
      },
    },
    order: ['intro', 'A', 'B', 'A', 'C'], loop: 1,
  },

  // ---------------------------------------------------------------- Pine Pond (Lynx): a jig
  pine: {
    name: 'Pine Pond Jig', bpm: 116, beat: 3, bar: 12, key: 'G', gain: 1.25,
    inst: { lead: 'fiddle', counter: 'flute', comp: 'pluck', bass: 'bass' },
    pan: { counter: 0.35, comp: -0.3 },
    sections: {
      intro: {
        bars: 2, chords: 'G D',
        comp: { pad: true, oct: 4, rhythm: '. x x . x x . x x . x x' },
        bass: { oct: 2, pat: '1:3 5:3 1:3 5:3' },
        drums: { l: 'x..x..x..x..', z: '.xx.xx.xx.xx', fill: { l: 'x..x..x.xx.x', z: '.xx.xx......' } },
      },
      A: {
        bars: 8, chords: 'G C G D G C D G',
        lead: `G4 B4 D5 G5:2 D5 B4:2 G4 B4 A4 G4 | E5 G5 E5 C5:2 E5 G5:2 E5 D5 C5 B4 | D5 B4 G4 B4 D5 G5 A5 G5 F#5 G5:3 | F#5 E5 D5 A4:2 D5 F#5:2 A5 G5 F#5 E5 |
               G4 B4 D5 G5:2 D5 B4:2 G4 B4 A4 G4 | E5 G5 E5 C5:2 E5 G5:2 A5 G5 E5 C5 | D5 F#5 A5 D6:2 C6 B5 A5 G5 F#5 E5 D5 | G5:3 D5:3 B4:3 G4:3`,
        comp: { pad: true, oct: 4, rhythm: '. x x . x x . x x . x x' },
        bass: { oct: 2, pat: '1:3 5:3 1:3 5:3' },
        drums: { l: 'x..x.gx..x.g', z: '.xx.xx.xx.xx', start: { c: 'x' } },
        hype: { counter: { follow: 'lead' }, drums: { b: '......x.....', k: 'x.....x.....' } },
      },
      B: {
        bars: 8, chords: 'Em C G D Em C D G',
        lead: `B4 E5 G5 B5:2 G5 A5 G5 E5 F#5:2 D5 | C6 B5 A5 G5:2 E5 G5:2 E5 C5:3 | D5 G5 B5 D6:2 B5 G5:2 B5 A5 G5 F#5 | E5:2 F#5 A5:2 F#5 D5:3 .:3 |
               E5 G5 B5 E6:2 B5 G5 B5 G5 E5:3 | E5 G5 C6 E6:2 C6 G5 C6 G5 E5:3 | F#5 A5 D6 F#6:2 E6 D6 C6 A5 F#5 E5 D5 | G5:3 B5:3 G5:6`,
        counter: { follow: 'lead' },
        comp: { pad: true, oct: 4, rhythm: '. x x . x x . x x . x x' },
        bass: { oct: 2, pat: '1:3 5:3 1:3 5:3' },
        drums: { l: 'x..x.gx..x.g', z: '.xx.xx.xx.xx', b: 'x...........', fill: { l: 'x..x..x.xx.x', z: '.xx.xx......', b: 'x.....x.....' } },
        hype: { drums: { k: 'x.....x.....' } },
      },
    },
    order: ['intro', 'A', 'B', 'A'], loop: 1,
  },

  // ---------------------------------------------------------------- Golden Hall (Rams): a stomping march
  hall: {
    name: 'Golden Hall', bpm: 136, key: 'Dm', gain: 1.3,
    inst: { lead: 'brass', horn: 'lead50', comp: 'organ', bass: 'sbass', bells: 'bell' },
    pan: { horn: 0.3, comp: -0.25 },
    sections: {
      intro: {
        bars: 2, chords: 'Dm A',
        lead: 'D4:3 A3 D4:2 E4:2 F4:4 A4:4 | A4:12 .:4',
        bass: { oct: 2, pat: '1:16' },
        drums: { T: 'x...x...x...x...', fill: { T: 'x...x...x.x.xxxx', s: '............xXXX' } },
      },
      A: {
        bars: 8, chords: 'Dm Bb C Dm Dm Bb Gm A',
        lead: `D5:3 A4 D5:2 E5:2 F5:4 A5:4 | Bb5:6 A5 G5 F5:4 D5:4 | C6:3 G5 C6:2 D6:2 E6:4 G6:4 | F6:3 E6 D6:4 A5:8 |
               D5:3 A4 D5:2 E5:2 F5:4 D6:4 | D6:6 C6 Bb5 F5:4 Bb5:4 | G5:3 A5 Bb5:2 C6:2 D6:4 G6:4 | A6:4 E6:2 C#6:2 A5:4 .:4`,
        bass: { oct: 2, pat: '1:4 1:4 5:2 1:2 8:4' },
        comp: { pad: true, oct: 4, rhythm: '!x:2 .:2 x:2 .:2 x:4 .:4' },
        drums: { k: 'x...x...x...x...', p: '....x.......x...', h: '..x...x...x...x.', start: { c: 'x', T: 'x' }, fill: { k: 'x...x...x...x...', s: '........x.x.xXXX', T: '....x...x.......' } },
        hype: { horn: { follow: 'lead' }, drums: { o: '..x...x...x...x.', T: 'x.......x.......' } },
      },
      B: {
        bars: 8, chords: 'Gm Dm Bb A Gm Dm Bb A',
        lead: `G4:6 Bb4:2 D5:8 | F5:6 E5:2 D5:8 | Bb4:6 C5:2 D5:4 F5:4 | E5:12 C#5:2 E5:2 |
               G5:6 A5:2 Bb5:4 D6:4 | A5:6 G5:2 F5:4 A5:4 | F5:4 Bb5:4 D6:4 F6:4 | E6:8 C#6:4 A5:4`,
        horn: { oct: 4, pat: '1:2 5:2 8:2 5:2 1:2 5:2 8:2 5:2' },
        bass: { oct: 2, pat: '1:6 1:2 5:4 8:4' },
        comp: { pad: true, oct: 4 },
        bells: { oct: 5, pat: '1:8 5:8' },
        drums: { T: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', start: { c: 'x' }, fill: { T: 'x...x...x.x.x.x.', s: '........xxxxXXXX' } },
        hype: { drums: { k: 'x.......x.......' } },
      },
      C: {
        bars: 8, chords: 'Bb:32 C:32 Dm:32 A:32',
        lead: `D6:12 C6 Bb5 A5 Bb5 | F6:8 D6:4 Bb5:4 | E6:12 D6 C6 B5 C6 | G6:8 E6:4 C6:4 |
               F6:12 E6 D6 C6 D6 | A6:8 F6:4 D6:4 | E6:4 C#6:4 A5:4 C#6:4 | E6:8 .:8`,
        bass: { oct: 2, pat: '1:4 1:4 5:4 8:4' },
        comp: { pad: true, oct: 4, rhythm: '!x:2 .:2 x:2 .:2 x:4 .:4' },
        bells: { oct: 5, pat: '1:4 3:4 5:4 8:4' },
        drums: { k: 'x...x...x...x...', p: '....x.......x...', T: 'x.......x.......', start: { c: 'x' }, fill: { T: 'x.x.x.x.xxxxXXXX', c: '............x...' } },
        hype: { horn: { follow: 'lead' }, drums: { o: '..x...x...x...x.' } },
      },
    },
    order: ['intro', 'A', 'B', 'A', 'C'], loop: 1,
  },

  // ---------------------------------------------------------------- Dark Aerie (Ravens): gothic, with trap hats
  aerie: {
    name: 'Dark Aerie', bpm: 126, key: 'Em harmonic', gain: 1.45,
    inst: { lead: 'lead12', arp: 'arp', organ: 'organ', bass: 'pbass', bells: 'celesta', choir: 'strings' },
    pan: { arp: 0.35, organ: -0.3 },
    sections: {
      intro: {
        bars: 2, chords: 'Em B7',
        arp: { oct: 4, pat: '1 5 8 5 3 5 8 5 1 5 8 5 3 5 8 5' },
        drums: { l: 'x..x............', fill: { l: 'x..x....x..x....', x: '............xxxx' } },
      },
      A: {
        bars: 8, chords: 'Em C Am B7 Em C Am B7',
        lead: `E5:3 B4 E5:2 F#5:2 G5:4 B5:4 | C6:6 B5 A5 G5:4 E5:4 | A5:3 E5 A5:2 B5:2 C6:4 E6:4 | D#6:3 C6 B5:4 F#5:4 .:4 |
               E5:3 B4 E5:2 F#5:2 G5:4 E6:4 | E6:6 D6 C6 G5:4 C6:4 | A5:4 C6:4 E6:4 A6:4 | B6:6 A6 F#6 D#6:4 B5:4`,
        arp: { oct: 4, pat: '1 5 8 5 3 5 8 5 1 5 8 5 3 5 8 5' },
        bass: { oct: 2, pat: '1:3 1:3 1:2 1:3 5:3 8:2' },
        organ: { pad: true, oct: 4, rhythm: 'x:2 .:6 x:2 .:6' },
        drums: { k: 'x......x..x.....', s: '....x.......x...', h: 'x.xxx.x.x.xxx.x.', start: { c: 'x' }, fill: { k: 'x......x........', s: '....x...x.x.xXXX', h: 'x.x.x.x.xxxxxxxx' } },
        hype: { harm: { follow: 'lead' }, drums: { o: '..x...x...x...x.' } },
      },
      B: {
        bars: 8, chords: 'Am Em C B Am Em F B7',
        lead: `A5:8 C6:4 E6:4 | B5:8 G5:4 E5:4 | C6:8 E6:4 G6:4 | F#6:12 D#6:2 B5:2 |
               A5:6 B5:2 C6:4 E6:4 | G6:6 F#6:2 E6:4 B5:4 | F6:6 E6:2 C6:4 A5:4 | D#6:8 B5:4 A5:4`,
        choir: { pad: true, oct: 4 },
        arp: { oct: 5, pat: '1 3 5 8 5 3 1 3 5 8 5 3 1 3 5 3' },
        bass: { oct: 2, pat: '1:8 5:8' },
        bells: { oct: 5, pat: '8:4 5:4 3:4 5:4' },
        drums: { k: 'x.........x.....', s: '........x.......', h: 'x.x.x.x.x.x.x.x.', start: { c: 'x' }, fill: { k: 'x.........x.....', s: '........x.x.xXXX', l: 'x...x...x...x...' } },
        hype: { harm: { follow: 'lead' }, drums: { o: '..x...x...x...x.' } },
      },
      C: {
        bars: 8, chords: 'C:32 Am:32 F:32 B7:32',
        lead: `G5:4 E5:4 G5:4 C6:4 | E6:8 .:8 | A5:4 C6:4 E6:4 A6:4 | G6:8 .:8 |
               F6:4 C6:4 A5:4 F5:4 | A5:8 .:8 | F#5:4 A5:4 B5:4 D#6:4 | F#6:12 .:4`,
        arp: { oct: 4, pat: '1 5 8 5 3 5 8 5 1 5 8 5 3 5 8 5' },
        organ: { pad: true, oct: 4 },
        bass: { oct: 2, pat: '1:2 1:2 8:2 1:2 5:2 1:2 8:2 5:2' },
        drums: { k: 'x.......x.......', x: '....x.......x...', z: 'x.x.x.x.x.x.x.x.', l: 'x..x............', start: { c: 'x' }, fill: { l: 'x..x..x.x.x.x.x.', s: '............xXXX' } },
        hype: { harm: { follow: 'lead' }, drums: { s: '....x.......x...' } },
      },
    },
    order: ['intro', 'A', 'B', 'A', 'C'], loop: 1,
  },

  // ---------------------------------------------------------------- Winter Classic: an outdoor anthem
  classic: {
    name: 'Winter Classic', bpm: 112, key: 'G', gain: 1.15,
    inst: { lead: 'brass', flute: 'flute', bells: 'celesta', comp: 'organ', bass: 'bass' },
    pan: { flute: 0.3, comp: -0.25 },
    sections: {
      intro: {
        bars: 2, chords: 'G D',
        bells: { oct: 5, pat: '1:2 5:2 8:2 5:2 1:2 5:2 8:2 5:2' },
        drums: { z: 'x.x.x.x.x.x.x.x.', T: 'x...............', fill: { z: 'x.x.x.x.x.x.x.x.', T: 'x.......x.x.xxxx' } },
      },
      A: {
        bars: 8, chords: 'G D Em C G D C D',
        lead: `G4:3 D4 G4:2 A4:2 B4:4 D5:4 | D5:6 C5 B4 A4:4 F#4:4 | E5:3 B4 E5:2 F#5:2 G5:4 B5:4 | C6:6 B5 A5 G5:4 E5:4 |
               G5:3 D5 G5:2 A5:2 B5:4 D6:4 | F#5:4 A5:4 D6:4 F#6:4 | E6:6 D6 C6 G5:4 C6:4 | D6:8 A5:4 F#5:4`,
        bells: { oct: 5, pat: '1:2 5:2 8:2 5:2 1:2 5:2 8:2 5:2' },
        bass: { oct: 2, pat: '1:4 5:4 1:4 5:4' },
        comp: { pad: true, oct: 4, rhythm: 'x:4 x:4 x:4 x:4' },
        drums: { k: 'x.......x.......', s: '....x.......x...', z: 'x.x.x.x.x.x.x.x.', start: { c: 'x', T: 'x' }, fill: { k: 'x.......x.......', s: '....x...x.x.xXXX', z: 'x.x.x.x.........', T: '........x.x.x.x.' } },
        hype: { harm: { follow: 'lead' }, drums: { o: '..x...x...x...x.' } },
      },
      B: {
        bars: 8, chords: 'Em C G D Em C Am D',
        flute: `B4:8 E5:4 G5:4 | G5:6 E5:2 C5:8 | D5:6 G5:2 B5:8 | A5:12 F#5:2 A5:2 |
                G5:6 F#5:2 E5:4 B4:4 | E5:6 G5:2 C6:8 | C6:6 B5:2 A5:4 E5:4 | D5:4 F#5:4 A5:4 D6:4`,
        bells: { oct: 6, pat: '1:4 5:4 3:4 5:4' },
        bass: { oct: 2, pat: '1:8 5:8' },
        comp: { pad: true, oct: 4 },
        drums: { k: 'x...............', z: 'x.x.x.x.x.x.x.x.', T: 'x.......x.......', start: { c: 'x' }, fill: { T: 'x...x...x.x.x.x.', s: '............xXXX' } },
        hype: { harm: { follow: 'flute' } },
      },
      C: {
        bars: 8, chords: 'C:32 G:32 Am:16 D:16 G:32',
        lead: `E5:4 G5:4 C6:8 | C6:4 D6:4 E6:8 | D6:4 B5:4 G5:8 | A5:4 B5:4 D6:8 |
               C6:4 E6:4 A5:8 | D6:4 F#6:4 A6:8 | G6:8 D6:4 B5:4 | G5:16`,
        flute: { follow: 'lead' },
        bells: { oct: 5, pat: '1:2 5:2 8:2 5:2 1:2 5:2 8:2 5:2' },
        bass: { oct: 2, pat: '1:4 1:4 5:4 8:4' },
        comp: { pad: true, oct: 4, rhythm: 'x:4 x:4 x:4 x:4' },
        drums: { k: 'x...x...x...x...', s: '....x.......x...', z: 'x.x.x.x.x.x.x.x.', T: 'x.......x.......', start: { c: 'x' }, fill: { T: 'x.x.x.x.xxxxXXXX', c: '............x...' } },
        hype: { harm: { follow: 'lead' }, drums: { o: '..x...x...x...x.' } },
      },
    },
    order: ['intro', 'A', 'B', 'A', 'C'], loop: 1,
  },

  // ---------------------------------------------------------------- Cup Final
  final: {
    name: 'The Cup Final', bpm: 150, key: 'D', gain: 1.2,
    inst: { lead: 'brass', counter: 'lead12', pad: 'strings', bass: 'sbass', bells: 'celesta' },
    sections: {
      intro: {
        bars: 4, chords: 'D G A A',
        lead: 'A4:2 A4 A4 D5:4 F#5:4 A5:4 | B5:4 A5:4 G5:8 | A5:2 A5 A5 B5:4 C#6:4 E6:4 | E6:16',
        pad: { pad: true, oct: 4 },
        bass: { oct: 2, pat: '1:4' },
        drums: { T: 'x.......x.......', start: { c: 'x' }, fill: { T: 'x.x.x.x.x.x.x.x.', s: 'g.g.g.g.ggggxxXX', c: '..............x.' } },
      },
      A: {
        bars: 8, ...TITLE_A,
        counter: { follow: 'lead', interval: 7, vel: 0.7 },
        bass: { oct: 2, pat: '1:2 1:2 8:2 1:2 1:2 8:2 1:2 5:2' },
        pad: { pad: true, oct: 4 },
        drums: { ...ROCK, T: 'x...............', start: { c: 'x' }, fill: ROCK_FILL },
        hype: { harm: { follow: 'lead' }, drums: HYPE_DRUMS },
      },
      B: {
        bars: 8, ...TITLE_B,
        bells: { oct: 5, pat: '1 5 8 5 10 8 5 8' },
        harm: { follow: 'lead' },
        bass: { oct: 2, pat: '1:4 5:4 8:4 5:4' },
        pad: { pad: true, oct: 4 },
        drums: { k: 'x.......x.......', s: '....x.......x...', r: 'x.x.x.x.x.x.x.x.', start: { c: 'x' }, fill: DRIVE_FILL },
        hype: { drums: HYPE_DRUMS },
      },
      lift: {
        bars: 1, key: 'E', chords: 'B7',
        lead: 'B5:4 D#6:4 F#6:4 A6:4',
        bass: { oct: 2, pat: '1:2' },
        pad: { pad: true, oct: 4 },
        drums: { T: 'x.x.x.x.x.x.x.x.', s: 'xxxxxxxxxxxxXXXX' },
      },
      AE: {
        bars: 8, key: 'E', chords: trc(TITLE_A.chords, 2), lead: tr(TITLE_A.lead, 2),
        counter: { follow: 'lead', interval: 7, vel: 0.7 },
        harm: { follow: 'lead' },
        bass: { oct: 2, pat: '1:2 1:2 8:2 1:2 1:2 8:2 1:2 5:2' },
        bells: { oct: 5, pat: '1 3 5 8 10 8 5 3' },
        pad: { pad: true, oct: 4 },
        drums: { ...ROCK, o: '..x...x...x...x.', T: 'x...............', start: { c: 'x' }, fill: ROCK_FILL },
      },
      BE: {
        bars: 8, key: 'E', chords: trc(TITLE_B.chords, 2), lead: tr(TITLE_B.lead, 2),
        harm: { follow: 'lead' },
        bass: { oct: 2, pat: '1:4 5:4 8:4 5:4' },
        bells: { oct: 5, pat: '1 5 8 5 10 8 5 8' },
        pad: { pad: true, oct: 4 },
        drums: { k: 'x.......x.......', s: '....x.......x...', r: 'x.x.x.x.x.x.x.x.', o: '..............x.', start: { c: 'x' }, fill: { k: 'x.......x.......', s: '....x...xxxxXXXX', T: 'x...x...x.x.x.x.' } },
      },
    },
    order: ['intro', 'A', 'B', 'lift', 'AE', 'BE'], loop: 0,
  },

  // ---------------------------------------------------------------- shootout
  shootout: {
    name: 'Shootout', bpm: 120, key: 'Dm', gain: 0.8,
    inst: { lead: 'flute', arp: 'pluck', pad: 'strings', bass: 'sub' },
    sections: {
      A: {
        bars: 8, chords: 'Dm Dm Bb A Dm Dm Bb A',
        lead: `.:8 A5:4 F5:4 | E5:12 .:4 | D5:8 F5:4 Bb5:4 | A5:16 | .:8 D6:4 C6:4 | A5:8 F5:8 | G5:8 Bb5:4 D6:4 | C#6:16`,
        arp: { oct: 3, pat: '1 5 8 5' },
        pad: { pad: true, oct: 3 },
        bass: { oct: 2, pat: '1:16' },
        drums: { k: 'x..x............', h: '....x.......x...' },
        hype: { drums: { h: 'x.x.x.x.x.x.x.x.' } },
      },
    },
    order: ['A'], loop: 0,
  },

  // ---------------------------------------------------------------- training
  training: {
    name: 'Practice Rink', bpm: 128, key: 'C', gain: 1.8,
    inst: { lead: 'lead12', bass: 'pbass', arp: 'arp' },
    sections: {
      A: {
        bars: 8, chords: 'C Am F G C Am Dm G',
        lead: `C5 .:1 E5 .:1 G5 .:1 E5 .:1 C6:2 .:2 G5:2 E5:2 | A5 .:1 G5 .:1 E5 .:1 C5 .:1 A4:4 C5:4 | F5 .:1 A5 .:1 C6 .:1 A5 .:1 F5:2 G5:2 A5:4 | G5:2 F5:2 E5:2 D5:2 B4:4 G4:4 |
               C5 .:1 E5 .:1 G5 .:1 E5 .:1 C6:2 .:2 G5:2 E5:2 | A5 .:1 C6 .:1 E6 .:1 C6 .:1 A5:4 E5:4 | F5 .:1 D5 .:1 A4 .:1 D5 .:1 F5:2 E5:2 D5:4 | G5:4 B5:4 D6:4 .:4`,
        bass: { oct: 2, pat: '1:2 .:2 8:2 .:2 1:2 .:2 5:2 .:2' },
        drums: { k: 'x...x...x...x...', s: '....x.......x...', p: '....x.......x...', h: '..x...x...x...x.', start: { c: 'x' } },
      },
      B: {
        bars: 8, chords: 'Em Am F G F G C C',
        lead: `B5:6 G5:2 E5:4 G5:4 | A5:6 C6:2 E6:4 C6:4 | C6:6 A5:2 F5:4 A5:4 | B5:6 D6:2 G6:4 F6:4 |
               A5:4 C6:4 F6:4 C6:4 | B5:4 D6:4 G6:4 D6:4 | E6:4 D6:2 C6:2 G5:4 E5:4 | C6:8 .:8`,
        arp: { oct: 4, pat: '1 3 5 8' },
        bass: { oct: 2, pat: '1:2 .:2 8:2 .:2 1:2 .:2 5:2 .:2' },
        drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', start: { c: 'x' }, fill: { k: 'x...x...x...x...', s: '....x...x.xxXXXX', h: 'x.x.x.x.........' } },
      },
    },
    order: ['A', 'B'], loop: 0,
  },

  // ---------------------------------------------------------------- the Resurfacer drill: the arena organ's waltz
  waltz: {
    name: 'Resurfacer Waltz', bpm: 168, beat: 4, bar: 12, key: 'F', gain: 1.4,
    inst: { lead: 'organ', comp: 'organ', bass: 'pbass', bells: 'celesta' },
    pan: { comp: -0.3, bells: 0.35 },
    sections: {
      intro: {
        bars: 2, chords: 'F C7',
        comp: { pad: true, oct: 4, rhythm: '.:4 x:3 .:1 x:3 .:1' },
        bass: { oct: 2, pat: '1:4 .:8' },
        drums: { h: '....x...x...', start: { c: 'x' } },
      },
      A: {
        bars: 8, chords: 'F C7 C7 F F Bb C7 F',
        lead: `C5:4 F5:4 A5:4 | G5:8 E5:4 | Bb4:4 C5:4 E5:4 | A5:8 F5:4 |
               C5:4 F5:4 A5:4 | D6:8 Bb5:4 | C6:4 Bb5:4 G5:4 | F5:8 .:4`,
        comp: { pad: true, oct: 4, rhythm: '.:4 x:3 .:1 x:3 .:1' },
        bass: { oct: 2, pat: '1:4 .:8' },
        drums: { k: 'x...........', h: '....x...x...' },
        hype: { bells: { follow: 'lead' } },
      },
      B: {
        bars: 8, chords: 'Bb F C7 F Bb F G7 C7',
        lead: `D5:4 F5:4 Bb5:4 | A5:6 G5:2 F5:4 | G5:4 E5:4 C5:4 | F5:8 A4:4 |
               Bb4:4 D5:4 F5:4 | C6:6 Bb5:2 A5:4 | B5:4 D6:4 F6:4 | E6:8 C6:4`,
        bells: { follow: 'lead' },
        comp: { pad: true, oct: 4, rhythm: '.:4 x:3 .:1 x:3 .:1' },
        bass: { oct: 2, pat: '1:4 5:4 .:4' },
        drums: { k: 'x...........', h: '....x...x...', fill: { k: 'x.....x.....', h: '....x...xxxx' } },
      },
    },
    order: ['intro', 'A', 'B', 'A'], loop: 1,
  },

  // ---------------------------------------------------------------- awards night
  awards: {
    name: 'Frostline Awards', bpm: 92, key: 'Bb', gain: 1.5,
    inst: { lead: 'brass', pad: 'strings', bass: 'bass', bells: 'bell' },
    sections: {
      A: {
        bars: 8, chords: 'Bb Eb Bb F Gm Eb F Bb',
        lead: `F4:3 F4 Bb4:4 D5:4 F5:4 | G5:6 F5:2 Eb5:8 | D5:3 Eb5 F5:4 Bb5:8 | A5:6 G5:2 F5:4 C5:4 |
               Bb5:3 A5 G5:4 D5:4 G5:4 | Eb5:3 F5 G5:4 Bb5:8 | A5:4 C6:4 F5:4 A5:4 | Bb5:12 .:4`,
        pad: { pad: true, oct: 4 },
        bass: { oct: 2, pat: '1:8 5:8' },
        drums: { T: 'x.......x.......', s: '....x.....g.x...', start: { c: 'x' }, fill: { T: 'x.......x.x.x.x.', s: 'g.g.g.g.ggggxxXX' } },
      },
      B: {
        bars: 8, chords: 'Eb F Dm Gm Cm F Bb Bb',
        lead: `G5:4 Bb5:4 Eb6:8 | C6:4 A5:4 F5:8 | F5:4 A5:4 D6:8 | D6:6 C6:2 Bb5:8 |
               Eb5:4 G5:4 C6:6 Bb5:2 | A5:6 Bb5:2 C6:8 | D6:4 F6:4 D6:4 Bb5:4 | F5:4 D5:4 Bb4:8`,
        bells: { oct: 5, pat: '1:4 5:4 8:4 5:4' },
        pad: { pad: true, oct: 4 },
        bass: { oct: 2, pat: '1:8 5:8' },
        drums: { T: 'x.......x.......', s: '....x.......x...', r: 'x...x...x...x...', start: { c: 'x' } },
      },
    },
    order: ['A', 'B'], loop: 0,
  },

  // ---------------------------------------------------------------- story scenes
  story: {
    name: 'Before the Faceoff', bpm: 100, key: 'Em harmonic', gain: 0.9,
    inst: { lead: 'flute', arp: 'harp', pad: 'strings', bass: 'bass' },
    sections: {
      A: {
        bars: 8, chords: 'Em C G D Em C Am B',
        lead: `B4:8 E5:4 G5:4 | G5:6 E5:2 C5:8 | D5:8 G5:4 B5:4 | A5:12 F#5:4 | G5:8 F#5:4 E5:4 | E5:8 G5:4 C6:4 | C6:8 B5:4 A5:4 | D#5:8 F#5:4 B5:4`,
        arp: { oct: 4, pat: '1 5 8 5 10 5 8 5' },
        pad: { pad: true, oct: 3 },
        bass: { oct: 2, pat: '1:8 5:8' },
        drums: { k: 'x.......x.......', x: '....x.......x...' },
      },
    },
    order: ['A'], loop: 0,
  },

  // ---------------------------------------------------------------- results
  victory: {
    name: 'Victory Lap', bpm: 120, key: 'C', gain: 1.45,
    inst: { lead: 'lead', bass: 'pbass', arp: 'chip', pad: 'pad' },
    sections: {
      A: {
        bars: 8, chords: 'C G Am F C F G C',
        lead: `E5:2 G5:2 C6:4 D6:2 C6:2 G5:4 | D6:4 B5:4 G5:4 D5:4 | C6:4 A5:4 E5:4 A5:4 | A5:4 F5:4 C6:8 |
               E6:4 D6:2 C6:2 G5:4 E5:4 | F5:4 A5:4 C6:4 A5:4 | B5:4 D6:4 G6:4 F6:4 | E6:8 C6:8`,
        harm: { follow: 'lead' },
        bass: { oct: 2, pat: '1:2 8:2 5:2 8:2' },
        pad: { pad: true, oct: 4 },
        drums: { ...ROCK, start: { c: 'x' } },
      },
    },
    order: ['A'], loop: 0,
  },
  defeat: {
    name: 'Next Time', bpm: 84, key: 'Am', gain: 1,
    inst: { lead: 'flute', arp: 'harp', pad: 'strings', bass: 'bass' },
    sections: {
      A: {
        bars: 8, chords: 'Am F C E Am F G E',
        lead: `E5:8 C5:4 A4:4 | F5:8 A5:4 C5:4 | E5:8 G5:4 C5:4 | B4:12 G#4:4 | A4:4 C5:4 E5:4 A5:4 | A5:8 G5:4 F5:4 | D5:8 B4:4 G4:4 | G#4:8 B4:8`,
        arp: { oct: 3, pat: '1 5 8 10' },
        pad: { pad: true, oct: 4 },
        bass: { oct: 2, pat: '1:16' },
      },
    },
    order: ['A'], loop: 0,
  },
};

// ------------------------------------------------------------------ jingles
// One-shot stingers over the music (which ducks while they play).
export const JINGLES = {
  goal_for: {
    bpm: 160, key: 'D', inst: { lead: 'brass', counter: 'lead', comp: 'chip' },
    sections: { a: {
      bars: 2, chords: 'D:8 G:4 A:4 D',
      lead: 'A4:2 D5 D5 F#5:2 A5:2 B5:2 A5:2 C#6:2 E6:2 | D6:16',
      counter: { follow: 'lead', interval: 7, vel: 0.6 },
      comp: { pad: true, oct: 4, rhythm: 'x:2 .:2 x:2 .:2 x:2 .:2 x:2 .:2 | x:16' },
      bass: { oct: 2, pat: '1:2' },
      drums: { k: 'x.......x...x...', s: '....x.....x.xxxx', fill: { c: 'x', k: 'x', T: 'x' } },
    } },
    order: ['a'],
  },
  goal_against: {
    bpm: 100, key: 'Am', inst: { lead: 'flute' },
    sections: { a: { bars: 2, chords: 'Am:8 F:8 E', lead: 'E5:4 C5:4 C5:4 A4:4 | G#4:16', pad: { pad: true, oct: 3 }, inst: { pad: 'strings' } } },
    order: ['a'],
  },
  win: {
    bpm: 150, key: 'C', inst: { lead: 'brass', counter: 'lead12' },
    sections: { a: {
      bars: 3, chords: 'C F:8 G:8 C',
      lead: 'C5:2 E5:2 G5:2 C6:4 G5:2 C6:4 | A5:4 C6:4 B5:4 D6:4 | C6:16',
      counter: { follow: 'lead', interval: 7, vel: 0.6 },
      pad: { pad: true, oct: 4 }, inst: { pad: 'strings' },
      bass: { oct: 2, pat: '1:4' },
      drums: { k: 'x.......x.......', s: '....x.......x...', start: { c: 'x' }, fill: { c: 'x', T: 'x...x...x.x.x.x.' } },
    } },
    order: ['a'],
  },
  lose: {
    bpm: 90, key: 'Am', inst: { lead: 'flute' },
    sections: { a: { bars: 2, chords: 'Am:8 F:8 Am', lead: 'E5:4 D5:4 C5:4 A4:4 | A4:16', pad: { pad: true, oct: 3 }, inst: { pad: 'strings' } } },
    order: ['a'],
  },
  level: {
    gain: 2.5, bpm: 180, key: 'C', inst: { lead: 'lead12', bells: 'celesta' },
    sections: { a: { bars: 1, chords: 'C', lead: 'C5 E5 G5 C6 E5 G5 C6 E6 G5 C6 E6 G6 C7:4', bells: { oct: 6, pat: '.:12 1:4' } } },
    order: ['a'],
  },
  champion: {
    bpm: 132, key: 'D', inst: { lead: 'brass', counter: 'lead', pad: 'strings', bells: 'bell' },
    sections: { a: {
      bars: 4, chords: 'D G:8 A:8 Bm:8 G:8 D',
      lead: 'A4:2 D5 D5 F#5:2 A5:6 F#5:2 A5:2 | B5:4 G5:4 C#6:4 E6:4 | D6:4 B5:4 D6:4 B5:4 | D6:16',
      counter: { follow: 'lead', interval: 7, vel: 0.6 },
      harm: { follow: 'lead' },
      pad: { pad: true, oct: 4 },
      bells: { oct: 5, pat: '1 5 8 5' },
      bass: { oct: 2, pat: '1:2 8:2' },
      drums: { k: 'x.......x.......', s: '....x.......x...', T: 'x...............', start: { c: 'x' }, fill: { c: 'x', T: 'x.x.x.x.x.x.x.x.', s: '................' } },
    } },
    order: ['a'],
  },
  achievement: {
    gain: 2.5, bpm: 140, key: 'C', inst: { lead: 'celesta' },
    sections: { a: { bars: 1, chords: 'C', lead: 'E6 G6 C7:2 G6 C7 E7:10' } },
    order: ['a'],
  },
  sign: {
    gain: 1.6, bpm: 150, key: 'C', inst: { lead: 'brass', bells: 'celesta' },
    sections: { a: { bars: 1, chords: 'C', lead: 'G4:2 C5:2 E5:2 G5:4 E5:2 G5:4', bells: { oct: 6, pat: '.:10 1 3 5 8 10 8' }, drums: { k: 'x.......', s: '....x...' } } },
    order: ['a'],
  },
  daily: {
    gain: 1.3, bpm: 150, key: 'C', inst: { lead: 'lead12', bells: 'celesta' },
    sections: { a: { bars: 2, chords: 'F:8 G:8 C', lead: 'A5:2 C6:2 F6:4 B5:2 D6:2 G6:4 | E6:16', bells: { oct: 6, pat: '1 5 8 5' }, drums: { s: '....x.......x...', fill: { c: 'x' } } } },
    order: ['a'],
  },
  reveal: {
    gain: 1.4, bpm: 120, key: 'Bb', inst: { lead: 'brass' },
    sections: { a: { bars: 1, chords: 'Bb', lead: '.:16', drums: { s: 'ggggggggxxxxxxxX', T: 'x.......x...x.x.' } } }, // a drumroll for the envelope
    order: ['a'],
  },
};

// Which track plays where.
export const ARENA_MUSIC = { home: 'frostline', ember_dome: 'ember', aurora_palace: 'aurora', pine_pond: 'pine', golden_hall: 'hall', dark_aerie: 'aerie' };

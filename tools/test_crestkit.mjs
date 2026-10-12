// A crest of one's own design (crestkit.js): its frame, the mascot it brings, and the emblems on
// offer (the drawing itself needs a page: the browser smoke covers it).
//   node tools/test_crestkit.mjs
import { CLUB, CLUB_DEFAULT, clubCrestId, clubMascotKey, OWN_MASCOTS } from '../src/data.js';
import { crestEmblems, CREST_SYMBOLS, CREST_SHIELDS, CREST_PATTERNS, KIT_DEFAULT } from '../src/crestkit.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

check('a designed crest is its own frame', clubCrestId('kit') === 'club_crest/generated');
check('...the others as before', clubCrestId('wolf') === 'crests_club/wolf' && clubCrestId('fox') === 'hud_elements/misc/home_crest');
check('the club\'s default has no design', 'crestKit' in CLUB_DEFAULT && CLUB_DEFAULT.crestKit === null);
Object.assign(CLUB, { crest: 'wolf', crestKit: null });
check('a chosen crest brings its mascot', clubMascotKey() === 'wolf');
Object.assign(CLUB, { crest: 'kit', crestKit: { ...KIT_DEFAULT, emblem: 'owl' } });
check('a design with an animal emblem brings that mascot', clubMascotKey() === 'owl');
Object.assign(CLUB, { crest: 'kit', crestKit: { ...KIT_DEFAULT, emblem: 'star' } });
check('...without one, the red fox', clubMascotKey() === 'fox' && OWN_MASCOTS.includes('fox'));
Object.assign(CLUB, CLUB_DEFAULT);
check('the drawn emblems always on offer, the kit\'s once drawn', crestEmblems(() => false).join() === CREST_SYMBOLS.join() && crestEmblems((id) => id === 'crest_kit/emblem/moose').includes('moose'));
check('six shields, seven patterns, a default for each part', CREST_SHIELDS.length === 6 && CREST_PATTERNS.length === 7 && CREST_SHIELDS.includes(KIT_DEFAULT.shield) && CREST_PATTERNS.includes(KIT_DEFAULT.pattern));

console.log(`Crest kit: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// The fan cam: after one of our goals at home the arena's camera finds a fan holding up a sign
// (Batch CT's fans, the words written on by the game). The sign is the player's own from
// Settings, or now and then one of the crowd's. (Drawn in hud.js; this is the words.)

export const SIGN_MAX = 16;
// (spaces, tabs and new lines squeezed to one space; no markup or control characters; at most SIGN_MAX characters)
export const cleanSign = (s) => String(s || '').replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, SIGN_MAX);

// The crowd's own signs, when the player hasn't written one ({club}: the short name, {name}: the scorer).
export const CROWD_SIGNS = ['GO {club}!', '{name}!!!', 'GOAL!', 'WE LOVE {club}', 'ONE MORE!'];

// Languages. The English text is the key: t('Play match') returns the translation for the
// current language, or the English if there isn't one. Values go in braces:
//   t('Round {n} of 5', { n: 3 })
// Plurals: pick the English form first, then translate it:
//   t(n === 1 ? '{n} win' : '{n} wins', { n })
// Catalogues live in src/lang/<code>.js; tools/i18n_check.mjs lists what's missing.

import { IS } from './lang/is.js';

export const LANGS = { en: 'English', is: 'Íslenska' };
const CATALOGS = { is: IS };

let lang = 'en';
const missing = new Set();

export function setLang(code) {
  lang = CATALOGS[code] || code === 'en' ? code : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}
export const getLang = () => lang;

// The language to start in: the saved choice, else the first of the browser's preferred
// languages we have, else English.
export function defaultLang(saved) {
  if (saved && LANGS[saved]) return saved;
  const nav = typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language || '']) : [];
  for (const l of nav) { const code = String(l).toLowerCase().split('-')[0]; if (LANGS[code]) return code; }
  return 'en';
}

let translated = null; // the catalogue's own values: text that is already translated
export function t(text, params) {
  if (text == null) return '';
  let out = text;
  if (lang !== 'en') {
    const cat = CATALOGS[lang];
    const tr = cat[text];
    if (tr) out = tr;
    else {
      translated ||= new Set(Object.values(cat));
      if (!translated.has(text)) missing.add(text);
    }
  }
  if (params) out = out.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  return out;
}

// For tests and the checker: strings looked up but not translated.
export const missingStrings = () => [...missing];

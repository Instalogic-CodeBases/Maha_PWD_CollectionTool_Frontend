/* ---- English -> Marathi (Devanagari) phonetic transliteration ----
   Used to auto-generate a starting Marathi Name whenever the English Name is
   typed/edited in the Dynamic Template field editor. This is a phonetic
   (sound-based) transliteration, not a dictionary translation. Ported verbatim. */

const MARATHI_TRANSLIT_VOWELS = [
  ['aa', 'आ', 'ा'], ['ee', 'ई', 'ी'], ['ii', 'ई', 'ी'], ['oo', 'ऊ', 'ू'], ['uu', 'ऊ', 'ू'],
  ['ai', 'ऐ', 'ै'], ['au', 'औ', 'ौ'], ['ay', 'ए', 'े'],
  ['a', 'अ', ''], ['i', 'इ', 'ि'], ['u', 'उ', 'ु'], ['e', 'ए', 'े'], ['o', 'ओ', 'ो'],
];

const MARATHI_TRANSLIT_CONSONANTS = [
  ['ksh', 'क्ष'], ['gy', 'ज्ञ'], ['tr', 'त्र'], ['shh', 'ष'],
  ['kh', 'ख'], ['gh', 'घ'], ['chh', 'छ'], ['ch', 'च'], ['jh', 'झ'], ['ny', 'न्य'],
  ['th', 'थ'], ['dh', 'ध'], ['ph', 'फ'], ['bh', 'भ'], ['sh', 'श'],
  ['k', 'क'], ['g', 'ग'], ['c', 'क'], ['j', 'ज'], ['t', 'ट'], ['d', 'ड'], ['n', 'न'],
  ['p', 'प'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'], ['l', 'ल'],
  ['v', 'व'], ['w', 'व'], ['s', 'स'], ['h', 'ह'], ['f', 'फ'], ['z', 'झ'], ['x', 'क्स'], ['q', 'क'],
];

// Dynamic Marathi Name Generation: the Marathi Name is now generated via the
// translation API in translateEnglishToMarathi() below, so this hardcoded
// English -> Marathi word list is no longer used. Kept here, commented out,
// for reference only — do not delete.
// const MARATHI_MEANING_DICT = {
//   district: 'जिल्हा', taluka: 'तालुका', tehsil: 'तालुका', block: 'तालुका',
//   village: 'गाव', circle: 'मंडळ', division: 'विभाग', 'sub division': 'उपविभाग', subdivision: 'उपविभाग',
//   page: 'पान', 'page number': 'पान क्रमांक', 'page no': 'पान क्रमांक', 'sr no': 'अनुक्रमांक', 'serial number': 'अनुक्रमांक',
//   scheme: 'योजना', 'scheme name': 'योजनेचे नाव', 'scheme code': 'योजना संकेतांक',
//   work: 'काम', 'work name': 'कामाचे नाव', 'work id': 'कामाचा क्रमांक', 'work code': 'कामाचा संकेतांक',
//   name: 'नाव', date: 'दिनांक', day: 'दिवस', month: 'महिना', year: 'वर्ष',
//   amount: 'रक्कम', 'sanctioned amount': 'मंजूर रक्कम', quantity: 'संख्या', number: 'क्रमांक', no: 'क्रमांक',
//   length: 'लांबी', width: 'रुंदी', height: 'उंची', depth: 'खोली', area: 'क्षेत्रफळ',
//   remark: 'शेरा', remarks: 'शेरा', description: 'तपशील', details: 'तपशील',
//   address: 'पत्ता', road: 'रस्ता', 'road name': 'रस्त्याचे नाव', bridge: 'पूल', building: 'इमारत',
//   department: 'विभाग', officer: 'अधिकारी', engineer: 'अभियंता', contractor: 'कंत्राटदार',
//   status: 'स्थिती', type: 'प्रकार', category: 'प्रवर्ग', total: 'एकूण', balance: 'शिल्लक',
//   expenditure: 'खर्च', budget: 'अंदाजपत्रक', estimate: 'अंदाज', progress: 'प्रगती',
//   'start date': 'सुरुवातीची तारीख', 'completion date': 'पूर्णत्वाची तारीख',
//   phone: 'दूरध्वनी', mobile: 'भ्रमणध्वनी', email: 'ईमेल',
//   'computer id': 'संगणक क्रमांक', code: 'संकेतांक',
// };

export function transliterateEnglishToMarathi(text) {
  if (!text) return '';
  const words = String(text).split(/(\s+)/); // keep whitespace tokens so spacing is preserved
  return words
    .map((word) => {
      if (/^\s*$/.test(word)) return word;
      const lower = word.toLowerCase();
      let i = 0, out = '', pendingConsonant = null;
      const len = lower.length;
      while (i < len) {
        const ch = lower[i];
        if (!/[a-z]/.test(ch)) {
          if (pendingConsonant) { out += pendingConsonant; pendingConsonant = null; }
          out += word[i];
          i++;
          continue;
        }
        let matchedConsonant = null;
        for (const [rom, dev] of MARATHI_TRANSLIT_CONSONANTS) {
          if (lower.startsWith(rom, i)) { matchedConsonant = [rom, dev]; break; }
        }
        if (matchedConsonant) {
          if (pendingConsonant) out += pendingConsonant + '्';
          pendingConsonant = matchedConsonant[1];
          i += matchedConsonant[0].length;
          continue;
        }
        let matchedVowel = null;
        for (const [rom, indep, matra] of MARATHI_TRANSLIT_VOWELS) {
          if (lower.startsWith(rom, i)) { matchedVowel = [rom, indep, matra]; break; }
        }
        if (matchedVowel) {
          if (pendingConsonant) {
            out += pendingConsonant + matchedVowel[2];
            pendingConsonant = null;
          } else {
            out += matchedVowel[1];
          }
          i += matchedVowel[0].length;
          continue;
        }
        if (pendingConsonant) { out += pendingConsonant; pendingConsonant = null; }
        i++;
      }
      if (pendingConsonant) out += pendingConsonant;
      return out;
    })
    .join('');
}

// Dynamic Marathi Name Generation — old hardcoded-dictionary version, kept
// here commented out for reference only. Replaced by translateEnglishToMarathi()
// below, which calls a translation API instead of a fixed word list.
// export function englishToMarathiMeaning(text) {
//   if (!text) return '';
//   const raw = String(text).trim();
//   if (!raw) return '';
//   // 1) whole-phrase exact match (e.g. "scheme name" -> "योजनेचे नाव")
//   const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
//   if (MARATHI_MEANING_DICT[key]) return MARATHI_MEANING_DICT[key];
//   // 2) word-by-word: known word -> meaning, unknown word -> transliteration
//   const parts = raw.split(/(\s+)/); // keep spacing tokens
//   return parts
//     .map((tok) => {
//       if (/^\s*$/.test(tok)) return tok;
//       const w = tok.toLowerCase().replace(/[^a-z]/g, '');
//       if (w && MARATHI_MEANING_DICT[w]) return MARATHI_MEANING_DICT[w];
//       return transliterateEnglishToMarathi(tok);
//     })
//     .join('');
// }

// MyMemory Translation API — free, no API key required, supports CORS.
// https://mymemory.translated.net/doc/spec.php
const TRANSLATE_API_URL = 'https://api.mymemory.translated.net/get';

// Dynamic English -> Marathi translation for the Dynamic Template field
// editor's Marathi Name. Calls a real translation API so it works for any
// valid English field name (not just a fixed list of known words). If the
// API call fails (offline, rate-limited, etc.) it falls back to the
// phonetic transliteration engine above so the field still gets a value.
export async function translateEnglishToMarathi(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  try {
    const url = `${TRANSLATE_API_URL}?q=${encodeURIComponent(raw)}&langpair=en|mr`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translation request failed (' + res.status + ')');
    const data = await res.json();
    const translated = data && data.responseData && data.responseData.translatedText;
    if (translated && translated.trim() && translated.trim().toLowerCase() !== raw.toLowerCase()) {
      return translated.trim();
    }
  } catch (err) {
    // Network/API failure — fall through to transliteration below.
  }
  return transliterateEnglishToMarathi(raw);
}
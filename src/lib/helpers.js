import { DISTRICT_ROWS, DISTRICT_EN, DISTRICT_ALIASES } from './seed.js';

export function uid(p = 'id') {
  return p + '_' + Math.random().toString(36).slice(2, 9);
}

export function normKey(s) {
  return String(s || '').trim().toLowerCase();
}

/* Resolves an Excel-entered district value (English or Marathi, incl. known
   aliases) to the canonical Marathi district name. Returns null if unrecognized. */
export function resolveDistrict(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (DISTRICT_ROWS.some((r) => r[0] === raw)) return raw;
  const key = normKey(raw);
  for (const mr of Object.keys(DISTRICT_EN)) {
    if (normKey(DISTRICT_EN[mr]) === key) return mr;
  }
  if (DISTRICT_ALIASES[key]) return DISTRICT_ALIASES[key];
  return null;
}

export function districtsForUser(u) {
  if (!u) return [];
  if (u.role === 'admin') return DISTRICT_ROWS.map((r) => r[0]);
  return u.districts || [];
}

export function circleForDistrict(d) {
  const r = DISTRICT_ROWS.find((x) => x[0] === d);
  return r ? r[1] : '';
}

/* Removes duplicate submissions (defensive — keeps the first occurrence by id,
   then by content fingerprint). */
export function dedupeSubs(list) {
  const seenIds = new Set();
  const seenFp = new Set();
  const out = [];
  for (const s of list) {
    if (seenIds.has(s.id)) continue;
    const fp = s.date + '|' + s.district + '|' + JSON.stringify(s.data) + '|' + (s.submittedBy || '');
    if (seenFp.has(fp)) continue;
    seenIds.add(s.id);
    seenFp.add(fp);
    out.push(s);
  }
  return out;
}

export function schemeForComputerId(computerIds, cid) {
  const c = (computerIds || []).find((x) => x.computerId === cid);
  return c ? c.schemeName : '';
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// A simple 斗地主 player, used for empty seats, for 托管 (a player who dropped
// or timed out) and for the 提示 button. Not clever, just sensible:
// lead the lowest cards (runs and triples first), beat with the smallest
// card that works without breaking bombs, leave a teammate's play alone, and
// bomb when an opponent is about to go out.
import { ACE, legalPlay, value } from './cards.js';

function byRank(hand) {
  const m = new Map();
  for (const c of hand) { const v = value(c); if (!m.has(v)) m.set(v, []); m.get(v).push(c); }
  return m;
}
const take = (g, v, k) => g.get(v).slice(0, k);

// Hand strength for bidding: jokers, 2s, aces and bombs.
export function strength(hand) {
  const g = byRank(hand);
  let s = 0;
  if (g.has(17)) s += 4;
  if (g.has(16)) s += 3;
  s += 2 * (g.get(15)?.length || 0);
  s += g.get(14)?.length || 0;
  for (const [v, cs] of g) if (cs.length === 4 && v < 15) s += 4;
  return s;
}
export const wantsCall = hand => strength(hand) >= 7;
export const wantsGrab = hand => strength(hand) >= 9;

// Lowest run of `len` consecutive ranks (≤ A) each holding ≥ `per` cards,
// whose top is above `above`.
function run(g, per, len, above) {
  for (let top = Math.max(above + 1, 3 + len - 1); top <= ACE; top++) {
    let ok = true;
    for (let v = top - len + 1; v <= top; v++) if ((g.get(v)?.length || 0) < per) { ok = false; break; }
    if (ok) {
      const cards = [];
      for (let v = top - len + 1; v <= top; v++) cards.push(...take(g, v, per));
      return cards;
    }
  }
  return null;
}
// Smallest `k` kicker groups of size `size`, avoiding `skip` ranks and bombs.
function kickers(g, size, k, skip) {
  const out = [];
  const pool = [...g.keys()].filter(v => !skip.includes(v) && g.get(v).length >= size && g.get(v).length < 4)
    .sort((a, b) => ((a >= 15) - (b >= 15)) || (g.get(a).length - g.get(b).length) || a - b); // keep 2s and jokers
  for (const v of pool) { if (out.length === k) break; out.push(take(g, v, size)); }
  return out.length === k ? out.flat() : null;
}
// Smallest card group of `size` above `above`, preferring ranks with exactly that many.
function group(g, size, above) {
  const vs = [...g.keys()].filter(v => v > above && g.get(v).length >= size && g.get(v).length < 4).sort((a, b) => a - b);
  const exact = vs.find(v => g.get(v).length === size);
  const v = exact ?? vs[0];
  return v == null ? null : take(g, v, size);
}

// Cards of the same kind as `prev` that beat it, or null.
function follow(g, prev) {
  const { type, main, n } = prev;
  if (type === 'single') {
    // Prefer cards that aren't part of a pair/triple, and don't split the rocket unless it's the only way.
    const rocket = g.has(16) && g.has(17);
    const spare = x => g.get(x).length === 1 && !(rocket && x >= 16);
    const v = [...g.keys()].filter(x => x > main && g.get(x).length < 4).sort((a, b) => (spare(b) - spare(a)) || a - b)[0];
    return v == null ? null : take(g, v, 1);
  }
  if (type === 'pair') return group(g, 2, main);
  if (type === 'triple') return group(g, 3, main);
  if (type === 'triple1' || type === 'triple2') {
    const t = group(g, 3, main);
    if (!t) return null;
    const k = kickers(g, type === 'triple1' ? 1 : 2, 1, [value(t[0])]);
    return k ? t.concat(k) : null;
  }
  if (type === 'straight') return run(g, 1, n, main);
  if (type === 'pairs') return run(g, 2, n / 2, main);
  if (type === 'plane') return run(g, 3, n / 3, main);
  if (type === 'plane1' || type === 'plane2') {
    const k = n / (type === 'plane1' ? 4 : 5), p = run(g, 3, k, main);
    if (!p) return null;
    const w = kickers(g, type === 'plane1' ? 1 : 2, k, [...new Set(p.map(value))]);
    return w ? p.concat(w) : null;
  }
  return null; // four2 / four22 / bomb: only a bomb or the rocket can answer
}
function bombOver(g, prev) {
  const above = prev && prev.type === 'bomb' ? prev.main : 0;
  const v = [...g.keys()].filter(x => g.get(x).length === 4 && x > above).sort((a, b) => a - b)[0];
  if (v != null && !(prev && prev.type === 'rocket')) return take(g, v, 4);
  if (g.has(16) && g.has(17)) return [g.get(16)[0], g.get(17)[0]];
  return null;
}

function lead(hand, g, ctx) {
  if (legalPlay(hand, null)) return hand.slice(); // whole hand in one go
  const ranks = [...g.keys()].sort((a, b) => a - b);
  const nonBomb = ranks.filter(v => g.get(v).length < 4 && v < 16);
  const v = nonBomb[0] ?? ranks.find(x => x < 16) ?? ranks[0];
  const c = g.get(v).length;
  if (c >= 4) return take(g, v, 4);
  // A lone opponent card: don't feed it a single if anything else will do.
  const avoidSingle = ctx.oppMin === 1;
  if (c === 3) {
    const plane = run(g, 3, 2, v - 1);
    if (plane && value(plane[0]) === v) { const w = kickers(g, 1, 2, [v, v + 1]); return w ? plane.concat(w) : plane; }
    const k = kickers(g, 1, 1, [v]) || kickers(g, 2, 1, [v]);
    return take(g, v, 3).concat(k || []);
  }
  if (c === 2) {
    const pairs = run(g, 2, 3, v - 1);
    return pairs && value(pairs[0]) === v ? pairs : take(g, v, 2);
  }
  for (let len = Math.min(12, ACE - v + 1); len >= 5; len--) {
    const s = run(g, 1, len, v + len - 2);
    if (s && value(s[0]) === v) return s;
  }
  if (avoidSingle) {
    const p = group(g, 2, 0) || group(g, 3, 0);
    if (p) return p;
  }
  return take(g, v, 1);
}

// The bot's move: an array of cards, or null to pass.
// ctx: { teammateLed, oppMin (fewest cards an opponent holds) }
export function choosePlay(hand, prev, ctx = {}) {
  const g = byRank(hand);
  if (!prev) return lead(hand, g, ctx);
  const whole = legalPlay(hand, prev);
  if (whole) return hand.slice(); // go out
  if (ctx.teammateLed) return null;
  const same = follow(g, prev);
  if (same && legalPlay(same, prev)) {
    // Spending a 2 or a joker on a small single early is wasteful.
    if (!(prev.type === 'single' && value(same[0]) >= 15 && prev.main < 11 && ctx.oppMin > 5)) return same;
  }
  if (ctx.oppMin <= 5 || hand.length <= 6) {
    const b = bombOver(g, prev);
    if (b && legalPlay(b, prev)) return b;
  }
  return null;
}

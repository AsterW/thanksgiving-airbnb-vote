// 提示: every play in a hand that beats the cards on the table, cheapest
// first. This is about what you CAN play — the bot (bot.js) decides what it
// WOULD play, and sometimes passes on purpose (a teammate led, no bombs this
// early, no 2 on a small single), which is no answer to "can I beat this?".
// Pressing 提示 again steps to the next option (game.js).
//
// Order: plays of the same kind by how much they break up (a lone card or an
// exact pair first, then splitting a pair/triple, then splitting a bomb),
// then by rank; after those, bombs from small to big, then the rocket.
// Every option is checked with legalPlay, the same rule a real play goes through.
import { ACE, legalPlay, value } from './cards.js';

function byRank(hand) {
  const m = new Map();
  for (const c of hand) { const v = value(c); if (!m.has(v)) m.set(v, []); m.get(v).push(c); }
  return m;
}

export function beatOptions(hand, prev) {
  if (!prev || prev.type === 'rocket') return [];
  const g = byRank(hand);
  const ranks = [...g.keys()].sort((a, b) => a - b);
  const size = v => g.get(v)?.length || 0;
  const take = (v, k) => g.get(v).slice(0, k);
  const rocket = g.has(16) && g.has(17);
  // what taking k cards of rank v breaks: nothing, a pair/triple, or a bomb (or the rocket)
  const cost = (v, k) => (size(v) === 4 ? 2 : (v >= 16 && rocket) ? 2 : size(v) === k ? 0 : 1);
  const out = [], seen = new Set();
  const push = (cards, c) => {
    if (!cards) return;
    const key = cards.map(value).sort((a, b) => a - b).join(',');
    if (seen.has(key)) return;
    const p = legalPlay(cards, prev);
    if (!p) return;
    seen.add(key);
    out.push({ cards, cost: c, main: p.main });
  };
  // the cheapest `k` groups of `per` cards from ranks not in `skip` (kickers), with what they break
  const kick = (per, k, skip) => {
    const pool = ranks.filter(v => !skip.includes(v) && size(v) >= per)
      .map(v => ({ v, c: cost(v, per) })).sort((a, b) => a.c - b.c || a.v - b.v).slice(0, k);
    return pool.length === k ? { cards: pool.flatMap(x => take(x.v, per)), c: Math.max(0, ...pool.map(x => x.c)) } : null;
  };
  // runs of `len` consecutive ranks (up to A) holding `per` each, topping above `main`
  const runs = (per, len) => {
    const found = [];
    for (let top = Math.max(prev.main + 1, 3 + len - 1); top <= ACE; top++) {
      const vs = Array.from({ length: len }, (_, i) => top - len + 1 + i);
      if (vs.every(v => size(v) >= per)) found.push({ vs, cards: vs.flatMap(v => take(v, per)), c: Math.max(...vs.map(v => cost(v, per))) });
    }
    return found;
  };
  const { type, main, n } = prev;
  if (type === 'single' || type === 'pair' || type === 'triple') {
    const k = type === 'single' ? 1 : type === 'pair' ? 2 : 3;
    for (const v of ranks) if (v > main && size(v) >= k) push(take(v, k), cost(v, k));
  }
  if (type === 'triple1' || type === 'triple2') {
    for (const v of ranks) if (v > main && size(v) >= 3) {
      const w = kick(type === 'triple1' ? 1 : 2, 1, [v]);
      if (w) push(take(v, 3).concat(w.cards), Math.max(cost(v, 3), w.c));
    }
  }
  if (type === 'straight') for (const r of runs(1, n)) push(r.cards, r.c);
  if (type === 'pairs') for (const r of runs(2, n / 2)) push(r.cards, r.c);
  if (type === 'plane') for (const r of runs(3, n / 3)) push(r.cards, r.c);
  if (type === 'plane1' || type === 'plane2') {
    const k = n / (type === 'plane1' ? 4 : 5);
    for (const r of runs(3, k)) {
      const w = kick(type === 'plane1' ? 1 : 2, k, r.vs);
      if (w) push(r.cards.concat(w.cards), Math.max(r.c, w.c));
    }
  }
  if (type === 'four2' || type === 'four22') {
    for (const v of ranks) if (v > main && size(v) === 4) {
      const w = kick(type === 'four2' ? 1 : 2, 2, [v]);
      if (w) push(take(v, 4).concat(w.cards), 2);
    }
  }
  out.sort((a, b) => a.cost - b.cost || a.main - b.main);
  // then bombs, small to big (legalPlay drops the ones a bomb on the table already beats), then the rocket
  const bombs = [];
  for (const v of ranks) if (size(v) === 4 && legalPlay(take(v, 4), prev)) bombs.push({ cards: take(v, 4), cost: 3, main: v });
  if (rocket) bombs.push({ cards: [g.get(16)[0], g.get(17)[0]], cost: 4, main: 17 });
  return out.concat(bombs).map(o => o.cards);
}

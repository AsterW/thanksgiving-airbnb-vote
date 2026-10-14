// 川麻 bots: 换三张, 定缺, what to discard, and whether to 碰 / 杠.
// (胡 is always taken.) Discards keep the hand as close to ready as
// possible (向听), and among equals keep the most live tiles that would
// improve it; the 缺 suit always goes first.
import { SUITS, suitOf, numOf, idx, kindAt, counts } from './tiles.js';
import { shanten } from './hand.js';

const bySuit = hand => SUITS.map(s => hand.filter(k => suitOf(k) === s));
// How much a tile is worth keeping: copies of it and neighbours close by.
function worth(hand, k) {
  const c = counts(hand), i = idx(k), n = numOf(k);
  let w = (c[i] - 1) * 3;
  for (const d of [-2, -1, 1, 2]) { const m = n + d; if (m >= 1 && m <= 9) w += c[i + d] * (Math.abs(d) === 1 ? 2 : 1); }
  return w + (n === 1 || n === 9 ? 0 : 0.5);
}

// 换三张: three tiles of one suit, from the suit we care least about.
export function chooseSwap(hand) {
  const groups = bySuit(hand).filter(g => g.length >= 3);
  const g = groups.reduce((a, b) => (b.length < a.length || (b.length === a.length && value(b, hand) < value(a, hand)) ? b : a));
  return g.slice().sort((a, b) => worth(hand, a) - worth(hand, b)).slice(0, 3);
}
const value = (group, hand) => group.reduce((a, k) => a + worth(hand, k), 0);
// 定缺: the suit with the fewest tiles (then the least useful one).
export function chooseLack(hand) {
  const groups = bySuit(hand);
  let best = 0;
  for (let s = 1; s < 3; s++) {
    const a = groups[best], b = groups[s];
    if (b.length < a.length || (b.length === a.length && value(b, hand) < value(a, hand))) best = s;
  }
  return SUITS[best];
}

// Live tiles that bring the hand closer to ready (`seen`: counts of tiles everyone can see).
function liveOuts(c, melds, lack, seen, base) {
  let n = 0;
  for (let i = 0; i < 27; i++) {
    if (suitOf(kindAt(i)) === lack || c[i] >= 4) continue;
    c[i]++;
    if (shanten(c, melds) < base) n += Math.max(0, 4 - seen[i] - (c[i] - 1));
    c[i]--;
  }
  return n;
}
export function chooseDiscard(hand, melds, lack, seen) {
  const lacking = hand.filter(k => suitOf(k) === lack);
  if (lacking.length) return lacking.sort((a, b) => worth(hand, a) - worth(hand, b))[0];
  const c = counts(hand);
  let best = null;
  for (const k of new Set(hand)) {
    c[idx(k)]--;
    const s = shanten(c, melds.length);
    const outs = liveOuts(c, melds.length, lack, seen, s);
    c[idx(k)]++;
    const score = [s, -outs, worth(hand, k)];
    if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && (score[1] < best.score[1] || (score[1] === best.score[1] && score[2] < best.score[2])))) best = { k, score };
  }
  return best.k;
}
// Best 向听 after throwing one tile away.
function afterDiscard(c, melds, lack) {
  let best = 9;
  for (let i = 0; i < 27; i++) {
    if (!c[i]) continue;
    c[i]--;
    const lackLeft = lack && c.slice(SUITS.indexOf(lack) * 9, SUITS.indexOf(lack) * 9 + 9).some(Boolean);
    best = Math.min(best, shanten(c, melds) + (lackLeft ? 1 : 0));
    c[i]++;
  }
  return best;
}
// 碰 when it gets the hand closer to ready than it is now.
export function wantPong(hand, melds, lack, kind) {
  const c = counts(hand), now = shanten(c, melds.length);
  c[idx(kind)] -= 2;
  return afterDiscard(c, melds.length + 1, lack) < now;
}
// 杠 (from a discard, or four in hand) when it doesn't set the hand back.
export function wantKong(hand, melds, kind, fromHand) {
  const c = counts(hand);
  const now = fromHand ? Math.min(...[...new Set(hand)].map(k => { c[idx(k)]--; const s = shanten(c, melds.length); c[idx(k)]++; return s; })) : shanten(c, melds.length);
  c[idx(kind)] -= fromHand ? 4 : 3;
  return shanten(c, melds.length + 1) <= now;
}
// 补杠: only if that tile isn't doing anything for the hand anyway.
export function wantAddKong(hand, melds, kind) {
  const c = counts(hand);
  const without = k => { c[idx(k)]--; const s = shanten(c, melds.length); c[idx(k)]++; return s; };
  return without(kind) <= Math.min(...[...new Set(hand)].map(without));
}

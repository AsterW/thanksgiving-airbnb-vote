// 斗地主 cards and plays. A card is a string: rank + suit ('3♠', '10♥', 'A♦',
// '2♣'), or 'sj' / 'bj' for the small / big joker. Card order for play:
// 3 < 4 < … < K < A < 2 < small joker < big joker.
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const SUITS = ['♠', '♥', '♣', '♦'];
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i + 3])); // 3..15
export const ACE = 14; // straights, pairs runs and planes stop at A

export const value = c => (c === 'sj' ? 16 : c === 'bj' ? 17 : RANK_VALUE[c.slice(0, -1)]);

export function deck() {
  const cards = [];
  for (const r of RANKS) for (const s of SUITS) cards.push(r + s);
  return cards.concat('sj', 'bj');
}
export function shuffle(cards, rand) {
  for (let i = cards.length - 1; i > 0; i--) {
    const k = Math.floor(rand() * (i + 1));
    [cards[i], cards[k]] = [cards[k], cards[i]];
  }
  return cards;
}
// Big to small, the way the hand is shown.
export const sortHand = cards => cards.slice().sort((a, b) => value(b) - value(a) || a.localeCompare(b));

function counts(cards) {
  const m = new Map();
  for (const c of cards) { const v = value(c); m.set(v, (m.get(v) || 0) + 1); }
  return m;
}
const isRun = vals => vals.every((v, i) => i === 0 || v === vals[i - 1] + 1);

// Every way these cards form a legal play: [{ type, main, n }], where `main`
// is the rank compared against and `n` the number of cards. Most plays have
// one reading; a few (e.g. 333444555666) have several, and the caller picks
// the one that fits the trick. Empty if the cards aren't a play.
export function readPlay(cards) {
  const n = cards.length;
  if (!n) return [];
  const cnt = counts(cards);
  const ranks = [...cnt.keys()].sort((a, b) => a - b);
  const top = ranks[ranks.length - 1];
  const all = c => ranks.every(r => cnt.get(r) === c);
  const out = [];
  const add = (type, main) => { if (!out.some(p => p.type === type && p.main >= main)) out.push({ type, main, n }); };

  if (n === 2 && cnt.get(16) === 1 && cnt.get(17) === 1) return [{ type: 'rocket', main: 17, n }];
  if (n === 1) add('single', top);
  if (n === 2 && all(2)) add('pair', top);
  if (n === 3 && all(3)) add('triple', top);
  if (n === 4 && all(4)) add('bomb', top);
  if (n === 4 && ranks.length === 2) { const t = ranks.find(r => cnt.get(r) === 3); if (t) add('triple1', t); }
  if (n === 5 && ranks.length === 2) {
    const t = ranks.find(r => cnt.get(r) === 3);
    if (t && ranks.some(r => cnt.get(r) === 2)) add('triple2', t);
  }
  if (n >= 5 && all(1) && isRun(ranks) && top <= ACE) add('straight', top);
  if (n >= 6 && all(2) && isRun(ranks) && top <= ACE) add('pairs', top);
  if (n >= 6 && all(3) && isRun(ranks) && top <= ACE) add('plane', top);
  // Four with two: 4 + any 2 cards, or 4 + 2 pairs.
  for (const f of ranks.filter(r => cnt.get(r) === 4)) {
    if (n === 6) add('four2', f);
    if (n === 8 && ranks.every(r => r === f || cnt.get(r) % 2 === 0)) add('four22', f);
  }
  // Planes with wings: k ≥ 2 consecutive triples (up to A) plus k single
  // cards (plane1) or k pairs (plane2).
  const triples = ranks.filter(r => cnt.get(r) >= 3 && r <= ACE);
  for (let i = 0; i < triples.length; i++) {
    for (let j = i + 1; j < triples.length && triples[j] === triples[j - 1] + 1; j++) {
      const k = j - i + 1, run = triples.slice(i, j + 1);
      if (n === 4 * k) add('plane1', run[k - 1]);
      if (n === 5 * k) {
        const rest = new Map(cnt);
        for (const r of run) rest.set(r, rest.get(r) - 3);
        if ([...rest.values()].every(c => c % 2 === 0)) add('plane2', run[k - 1]);
      }
    }
  }
  return out;
}

// Does play `a` beat play `b` (the play currently on the table)?
export function beats(a, b) {
  if (!b) return true;
  if (a.type === 'rocket') return true;
  if (b.type === 'rocket') return false;
  if (a.type === 'bomb') return b.type !== 'bomb' || a.main > b.main;
  if (b.type === 'bomb') return false;
  return a.type === b.type && a.n === b.n && a.main > b.main;
}

// The reading of `cards` that can be played now: on a fresh lead the first
// reading, otherwise one that beats `prev`. Null if there is none.
export function legalPlay(cards, prev) {
  const reads = readPlay(cards);
  return prev ? reads.find(p => beats(p, prev)) || null : reads[0] || null;
}

export const isBombish = p => p.type === 'bomb' || p.type === 'rocket';

// Remove `cards` from `hand`; null if the hand doesn't hold them all.
export function takeFrom(hand, cards) {
  const left = hand.slice();
  for (const c of cards) {
    const i = left.indexOf(c);
    if (i < 0) return null;
    left.splice(i, 1);
  }
  return left;
}

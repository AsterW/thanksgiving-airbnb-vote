// 掼蛋 cards and plays. Two decks (108 cards), four players in two teams.
// A card id is rank + suit + which deck: '10♥1', 'A♠2'; the jokers are
// 'sj1' / 'sj2' (小王) and 'bj1' / 'bj2' (大王).
// The level (级牌, 2..14) changes from hand to hand. In singles, pairs,
// triples, 三带二 and bombs it ranks just above A; in 顺子 / 三连对 / 钢板 /
// 同花顺 it stays in its natural place. Its two red hearts are wild (逢人配):
// they stand in for any card except a joker.
export const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const ACE = 14, SJ = 16, BJ = 17;
const FACE = { J: 11, Q: 12, K: 13, A: 14 };

export function rankOf(id) {
  const f = id.slice(0, -1);
  if (f === 'sj') return SJ;
  if (f === 'bj') return BJ;
  const r = f.slice(0, -1);
  return FACE[r] || Number(r);
}
export const suitOf = id => (rankOf(id) >= SJ ? '' : id.slice(-2, -1));
export const isJoker = id => rankOf(id) >= SJ;
export const isWild = (id, level) => rankOf(id) === level && suitOf(id) === '♥';
// Order in singles / pairs / triples / 三带二 / bombs: the level rank is 15, above A.
export const rankValue = (r, level) => (r === level ? 15 : r);
export const value = (id, level) => rankValue(rankOf(id), level);
export const rankName = r => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 16: '小王', 17: '大王' })[r] || String(r);

export function deck() {
  const d = [];
  for (const k of [1, 2]) {
    for (const r of RANKS) for (const s of SUITS) d.push(r + s + k);
    d.push('sj' + k, 'bj' + k);
  }
  return d;
}
export function shuffle(cards, rand) {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Big to small; the wild hearts sit with the other level cards.
export const sortHand = (cards, level) => cards.slice().sort((a, b) =>
  value(b, level) - value(a, level) || SUITS.indexOf(suitOf(a)) - SUITS.indexOf(suitOf(b)) || a.localeCompare(b));
// Remove `cards` from `hand`; null if the hand doesn't hold all of them.
export function takeFrom(hand, cards) {
  const left = hand.slice();
  for (const c of cards) { const i = left.indexOf(c); if (i < 0) return null; left.splice(i, 1); }
  return left;
}

// A play: { type, main, n? }. Types: single, pair, triple, full (三带二),
// straight (5), tube (三连对, 3 pairs in a row), plate (钢板, 2 triples in a row),
// bomb (4-10 of a rank, n = size), sflush (同花顺), jokers (天王炸, all four jokers).
// Plays of the same type compare by main; every non-bomb type has a fixed size.
const BOMB_TYPES = new Set(['bomb', 'sflush', 'jokers']);
export const isBomb = p => BOMB_TYPES.has(p.type);
// Bomb order: 4 < 5 < 同花顺 < 6 < 7 < 8 < 9 < 10 < 天王炸; same size by rank.
export function power(p) {
  if (p.type === 'jokers') return 10000;
  if (p.type === 'sflush') return 550 + p.main;
  return p.n * 100 + p.main;
}
export function beats(a, b) {
  if (!b) return true;
  if (isBomb(a) || isBomb(b)) return isBomb(a) && (!isBomb(b) || power(a) > power(b));
  return a.type === b.type && a.main > b.main;
}

// In a run the A can be low (A2345, AA2233, AAA222) or high (10JQKA).
// Do the plain cards (counts by rank) plus `wild` wild cards make `len` ranks
// in a row ending at `top`, `each` cards of every rank? Rank 1 means the A.
function runFits(cnt, wild, len, each, top) {
  let need = 0, inRun = 0;
  for (let r = top - len + 1; r <= top; r++) {
    const have = cnt.get(r === 1 ? ACE : r) || 0;
    if (have > each) return false;
    need += each - have; inRun += have;
  }
  let total = 0;
  for (const v of cnt.values()) total += v;
  return inRun === total && need === wild;
}

// Every way these cards can be read as one play (wild cards make several possible).
export function readPlays(cards, level) {
  const n = cards.length, out = [];
  if (!n) return out;
  let wild = 0, sj = 0, bj = 0;
  const plain = [], cnt = new Map();
  for (const c of cards) {
    if (isWild(c, level)) wild++;
    else if (rankOf(c) === SJ) sj++;
    else if (rankOf(c) === BJ) bj++;
    else { plain.push(c); cnt.set(rankOf(c), (cnt.get(rankOf(c)) || 0) + 1); }
  }
  const jokers = sj + bj;
  if (n === 1) return [{ type: 'single', main: value(cards[0], level) }];
  if (n === 4 && sj === 2 && bj === 2) out.push({ type: 'jokers', main: BJ, n: 4 });
  if (n === 2) {
    if (sj === 2 || bj === 2) out.push({ type: 'pair', main: sj === 2 ? SJ : BJ });
    else if (!jokers && cnt.size <= 1) out.push({ type: 'pair', main: cnt.size ? rankValue([...cnt.keys()][0], level) : 15 });
  }
  // all one rank (wild cards join it): 三张, or a bomb from four up
  if (!jokers && cnt.size === 1 && n >= 3) {
    const r = [...cnt.keys()][0];
    if (n === 3) out.push({ type: 'triple', main: rankValue(r, level) });
    else out.push({ type: 'bomb', main: rankValue(r, level), n });
  }
  if (n === 5) {
    // 三带二: jokers can only be the pair
    if ((sj === 2 && !bj) || (bj === 2 && !sj)) {
      if (cnt.size === 1) { const [r, c] = [...cnt][0]; if (c + wild === 3) out.push({ type: 'full', main: rankValue(r, level) }); }
    } else if (!jokers) {
      for (const [x, cx] of cnt) {
        const others = [...cnt].filter(([r]) => r !== x);
        if (cx > 3 || others.length > 1) continue;
        const cy = others.length ? others[0][1] : 0;
        if (cy <= 2 && (3 - cx) + (2 - cy) === wild) out.push({ type: 'full', main: rankValue(x, level) });
      }
      const oneSuit = new Set(plain.map(suitOf)).size <= 1;
      for (let top = 5; top <= ACE; top++) {
        if (!runFits(cnt, wild, 5, 1, top)) continue;
        out.push({ type: 'straight', main: top });
        if (oneSuit) out.push({ type: 'sflush', main: top, n: 5 });
      }
    }
  }
  if (n === 6 && !jokers) {
    for (let top = 3; top <= ACE; top++) if (runFits(cnt, wild, 3, 2, top)) out.push({ type: 'tube', main: top });
    for (let top = 2; top <= ACE; top++) if (runFits(cnt, wild, 2, 3, top)) out.push({ type: 'plate', main: top });
  }
  return out;
}

// The same cards are always worth playing as their strongest reading
// (a bomb over 三带二, the highest straight); on a lead, ties between
// different shapes go to the longer-looking one.
const SHAPE = { single: 1, pair: 2, triple: 3, full: 4, straight: 5, tube: 6, plate: 7 };
const strength = p => (isBomb(p) ? 1e6 + power(p) : SHAPE[p.type] * 100 + p.main);
export function legalPlay(cards, prev, level) {
  const ok = readPlays(cards, level).filter(p => beats(p, prev));
  return ok.length ? ok.reduce((a, b) => (strength(b) > strength(a) ? b : a)) : null;
}

const TYPE_NAME = { single: '单张', pair: '对子', triple: '三张', full: '三带二', straight: '顺子', tube: '三连对', plate: '钢板', sflush: '同花顺', jokers: '天王炸' };
export const playName = p => (p.type === 'bomb' ? p.n + ' 张炸弹' : TYPE_NAME[p.type]);

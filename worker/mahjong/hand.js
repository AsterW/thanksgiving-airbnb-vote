// 川麻 hand maths: is it a winning hand, how many 番, how far from ready
// (向听, for the bots), and which tiles a ready hand waits on (for 查叫).
// Hands are count arrays over the 27 kinds (see tiles.js); melds are the
// exposed / concealed 碰 and 杠 sets: [{ kind, type: 'pong' | 'kong' }].
import { idx, kindAt, suitOf, numOf, SUITS } from './tiles.js';

// ---- 向听 (tiles away from ready; -1 = complete) ----
// Each suit is solved on its own (memoised) into its best mixes of
// sets / partial sets / a pair, then the three suits are combined.
const memo = new Map();
function suitOptions(c) {
  const key = c.join('');
  if (memo.has(key)) return memo.get(key);
  const best = new Map(); // `${pair}` -> list of [sets, partials] not dominated
  const scan = (i, sets, parts, pair) => {
    while (i < 9 && !c[i]) i++;
    if (i === 9) {
      const list = best.get(pair) || [];
      if (!list.some(([s, p]) => s >= sets && p >= parts)) best.set(pair, list.filter(([s, p]) => !(sets >= s && parts >= p)).concat([[sets, parts]]));
      return;
    }
    if (!pair && c[i] >= 2) { c[i] -= 2; scan(i, sets, parts, 1); c[i] += 2; }
    if (c[i] >= 3) { c[i] -= 3; scan(i, sets + 1, parts, pair); c[i] += 3; }
    if (i <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; scan(i, sets + 1, parts, pair); c[i]++; c[i + 1]++; c[i + 2]++; }
    if (c[i] >= 2) { c[i] -= 2; scan(i, sets, parts + 1, pair); c[i] += 2; }
    if (i <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; scan(i, sets, parts + 1, pair); c[i]++; c[i + 1]++; }
    if (i <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; scan(i, sets, parts + 1, pair); c[i]++; c[i + 2]++; }
    c[i]--; scan(i, sets, parts, pair); c[i]++; // a loose tile
  };
  scan(0, 0, 0, 0);
  const out = [];
  for (const [pair, list] of best) for (const [s, p] of list) out.push([s, p, pair]);
  memo.set(key, out);
  return out;
}
export function shanten(c, melds = 0) {
  let best = 8;
  const [a, b, d] = [0, 1, 2].map(s => suitOptions(c.slice(s * 9, s * 9 + 9)));
  for (const x of a) for (const y of b) for (const z of d) {
    const pair = x[2] + y[2] + z[2];
    if (pair > 1) continue;
    const sets = melds + x[0] + y[0] + z[0];
    const parts = Math.min(x[1] + y[1] + z[1], 4 - sets);
    best = Math.min(best, 8 - 2 * sets - parts - pair);
  }
  if (!melds) { // 七对 (four of a kind counts as two pairs: 龙七对)
    let pairs = 0;
    for (const n of c) pairs += n >> 1;
    best = Math.min(best, 6 - Math.min(pairs, 7));
  }
  return best;
}

// ---- winning hands ----
// All ways to read a complete hand as sets + one pair: [{ pair, sets: [{ kind, type: 'pung' | 'chow' }] }].
export function decompositions(c) {
  const out = [];
  const total = c.reduce((a, n) => a + n, 0);
  if (total % 3 !== 2) return out;
  const sets = [];
  const walk = (i, pair) => {
    while (i < 27 && !c[i]) i++;
    if (i === 27) { if (pair >= 0) out.push({ pair: kindAt(pair), sets: sets.slice() }); return; }
    if (pair < 0 && c[i] >= 2) { c[i] -= 2; walk(i, i); c[i] += 2; }
    if (c[i] >= 3) { c[i] -= 3; sets.push({ kind: kindAt(i), type: 'pung' }); walk(i, pair); sets.pop(); c[i] += 3; }
    if (i % 9 <= 6 && c[i + 1] && c[i + 2]) {
      c[i]--; c[i + 1]--; c[i + 2]--; sets.push({ kind: kindAt(i), type: 'chow' });
      walk(i, pair);
      sets.pop(); c[i]++; c[i + 1]++; c[i + 2]++;
    }
  };
  walk(0, -1);
  return out;
}
const isSevenPairs = (c, melds) => !melds.length && c.reduce((a, n) => a + n, 0) === 14 && c.every(n => n % 2 === 0);
export const holdsSuit = (c, suit) => c.slice(SUITS.indexOf(suit) * 9, SUITS.indexOf(suit) * 9 + 9).some(Boolean);
// A winning hand: complete, and nothing left of the suit you gave up (定缺).
export function isWin(c, melds, lack) {
  if (lack && holdsSuit(c, lack)) return false;
  return isSevenPairs(c, melds) || decompositions(c).length > 0;
}

// ---- 番 ----
// 平胡 0 · 对对胡 1 · 清一色 2 · 七对 2 · 带幺九 2 · 将对 +2 (on 对对胡) · 金钩钓 +1
// 根 +1 each (four of a kind anywhere) · 杠上花 / 杠上炮 / 抢杠 / 海底 +1 · 天胡 +3 · 地胡 +2.
// No cap. Scored as base × 2^番 (自摸: every other player also adds one base).
export function fan(c, melds, flags = {}) {
  const all = c.slice();
  for (const m of melds) all[idx(m.kind)] += m.type === 'kong' ? 4 : 3;
  const suits = new Set(); all.forEach((n, i) => { if (n) suits.add(SUITS[Math.floor(i / 9)]); });
  const roots = all.filter(n => n === 4).length; // 根
  const extras = [];
  if (flags.gangFlower) extras.push(['杠上花', 1]);
  if (flags.gangShot) extras.push(['杠上炮', 1]);
  if (flags.robKong) extras.push(['抢杠', 1]);
  if (flags.lastTile) extras.push([flags.self ? '海底捞月' : '海底炮', 1]);
  if (flags.heaven) extras.push(['天胡', 3]);
  if (flags.earth) extras.push(['地胡', 2]);
  if (suits.size === 1) extras.push(['清一色', 2]);
  if (roots) extras.push([roots > 1 ? '根 ×' + roots : '根', roots]);
  const shapes = [];
  if (isSevenPairs(c, melds)) shapes.push([['七对', 2]]);
  for (const d of decompositions(c)) {
    const sets = d.sets.concat(melds.map(m => ({ kind: m.kind, type: 'pung' })));
    const parts = [];
    const pungs = sets.every(s => s.type === 'pung');
    if (pungs) parts.push(['对对胡', 1]);
    const has19 = s => (s.type === 'pung' ? [1, 9].includes(numOf(s.kind)) : numOf(s.kind) === 1 || numOf(s.kind) === 7);
    if (sets.every(has19) && [1, 9].includes(numOf(d.pair))) parts.push(['带幺九', 2]);
    if (pungs && sets.every(s => [2, 5, 8].includes(numOf(s.kind))) && [2, 5, 8].includes(numOf(d.pair))) parts.push(['将对', 2]);
    if (melds.length === 4) parts.push(['金钩钓', 1]);
    shapes.push(parts.length ? parts : [['平胡', 0]]);
  }
  if (!shapes.length) return null;
  const sum = list => list.reduce((a, [, n]) => a + n, 0);
  const shape = shapes.reduce((a, b) => (sum(b) > sum(a) ? b : a));
  const names = shape.filter(([, n]) => n).concat(extras);
  return { fan: sum(names), names: names.length ? names.map(([n]) => n) : ['平胡'] };
}

// Tiles that would complete this hand (13 - 3×melds tiles), and the most 番 any of them gives.
export function waits(c, melds, lack) {
  const out = [];
  for (let i = 0; i < 27; i++) {
    if (c[i] >= 4 || (lack && suitOf(kindAt(i)) === lack)) continue;
    c[i]++;
    if (isWin(c, melds, lack)) out.push({ kind: kindAt(i), fan: fan(c, melds).fan });
    c[i]--;
  }
  return out;
}

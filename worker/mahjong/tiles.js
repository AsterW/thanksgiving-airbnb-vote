// 川麻 tiles: 108 of them, three suits (no winds or dragons), 1-9, four of each.
// A tile is its kind: 'm1'..'m9' (万), 's1'..'s9' (条), 'p1'..'p9' (筒).
// Copies are identical, so hands are just arrays of kinds.
export const SUITS = ['m', 's', 'p'];
export const SUIT_NAME = { m: '万', s: '条', p: '筒' };
export const KINDS = SUITS.flatMap(s => Array.from({ length: 9 }, (_, i) => s + (i + 1)));
export const suitOf = k => k[0];
export const numOf = k => Number(k[1]);
export const idx = k => SUITS.indexOf(k[0]) * 9 + Number(k[1]) - 1;
export const kindAt = i => SUITS[Math.floor(i / 9)] + ((i % 9) + 1);

export function wall() { return KINDS.flatMap(k => [k, k, k, k]); }
export function shuffle(tiles, rand) {
  const a = tiles.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 万 条 筒, small to big; the suit you've given up (定缺) goes last.
export const sortTiles = (tiles, lack) => tiles.slice().sort((a, b) =>
  ((suitOf(a) === lack) - (suitOf(b) === lack)) || idx(a) - idx(b));
export function counts(tiles) { const c = new Array(27).fill(0); for (const k of tiles) c[idx(k)]++; return c; }
export function take(hand, kind, n = 1) {
  const left = hand.slice();
  for (let i = 0; i < n; i++) { const j = left.indexOf(kind); if (j < 0) return null; left.splice(j, 1); }
  return left;
}
export const tileName = k => (suitOf(k) === 'm' ? '一二三四五六七八九'[numOf(k) - 1] + '万' : numOf(k) + SUIT_NAME[suitOf(k)]);

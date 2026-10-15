// Table reactions: a seated player taps an emoji or a preset taunt line
// (给阿姨倒一杯卡布奇诺 and friends) and it pops next to their seat for
// everyone at the table. Shared by the TableHall games and Blackjack.
// Only values on these lists are accepted — clients can't inject
// arbitrary text. A reaction lives 4 seconds; one per player per 800ms.
// Keep the lists in sync with web/src/features/games/Reactions.jsx.
export const REACTION_EMOJIS = ['😏', '🤣', '😂', '🙄', '🥱', '😴', '😤', '🐢', '💩', '🤡', '👎', '👍', '🔥', '💣', '⏰', '😱', '😭', '🤑', '🐶', '👻'];
export const REACTION_PHRASES = [
  '给阿姨倒一杯卡布奇诺 ☕',
  '快点吧，我等到花儿都谢了',
  '就这？就这？',
  '你这牌打得也太好了吧',
  '我要报警了',
  '感谢老板，老板大气',
  '这把我稳了',
  '不服来战',
  '溜了溜了',
  '再来一把！',
];
const ALL = new Set([...REACTION_EMOJIS, ...REACTION_PHRASES]);
export const REACTION_TTL_MS = 4000;
const MIN_GAP_MS = 800;

// Record a reaction in map (key -> { v, at }); false when the value is
// not allowed or the player is tapping too fast.
export function noteReaction(map, key, value, now) {
  if (!ALL.has(value)) return false;
  const prev = map.get(key);
  if (prev && now - prev.at < MIN_GAP_MS) return false;
  map.set(key, { v: value, at: now });
  return true;
}

// The still-fresh reactions as { key: value }, pruning stale entries.
export function freshReactions(map, now) {
  const out = {};
  for (const [k, r] of map) {
    if (now - r.at <= REACTION_TTL_MS) out[k] = r.v;
    else map.delete(k);
  }
  return out;
}

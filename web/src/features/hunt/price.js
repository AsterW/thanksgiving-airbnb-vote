// 价格：优先用 Airbnb 实时报价（按当前行程的日期和人数）
export const liveOf = (l, T) => (l.live && l.live.checkIn === T.checkIn && l.live.checkOut === T.checkOut ? l.live : null);
export const isBooked = (l, T) => { const v = liveOf(l, T); return !!(v && !v.available); };
// 用来排序/地图的价格：有实时价用实时价，否则退回手动添加时填的价格
export function effPrice(l, T) {
  const v = liveOf(l, T);
  if (v) return v.available ? v.total : null;
  return l.priceNights ? l.priceUSD || null : null;
}
export const UNAVAILABLE = { DATE: '这几天已经被订了', GUEST: '住不下这么多人，Airbnb 不给报价', MIN_NIGHTS: '不满足最少入住晚数', MAX_NIGHTS: '超过最多入住晚数' };

// 排序：票数（同票按价格）、价格（订满的没有价格，自然排到最后）、添加时间（最新在前）
export function sortListings(list, sortBy, T) {
  const p = l => effPrice(l, T) || 1e9;
  const out = list.slice();
  if (sortBy === 'votes') out.sort((a, b) => (b.votes || []).length - (a.votes || []).length || p(a) - p(b));
  else if (sortBy === 'added') out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else out.sort((a, b) => p(a) - p(b));
  return out;
}

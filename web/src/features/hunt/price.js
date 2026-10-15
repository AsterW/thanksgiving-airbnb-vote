// 价格：优先用 Airbnb 实时报价（按当前行程的日期和人数）
export const liveOf = (l, T) => (l.live && l.live.checkIn === T.checkIn && l.live.checkOut === T.checkOut ? l.live : null);
export const isBooked = (l, T) => { const v = liveOf(l, T); return !!(v && !v.available); };
// 酒店按「每间每晚」报价（Google 参考价或手填的）：估这群人要几间（每间住 ROOM_SLEEPS 人）、乘晚数，
// 才能和 Airbnb 的整套总价放在一起比。之前从 Booking.com 拉过价格的酒店存的已经是整趟总价。
export const ROOM_SLEEPS = 4;
export const roomsFor = T => Math.ceil(T.people / ROOM_SLEEPS);
export function hotelTotal(l, T) {
  if (l.rate && l.rate.nightly) return l.rate.nightly * roomsFor(T) * T.nights;
  return l.priceNights ? l.priceUSD || null : null;
}
// 用来排序/地图的价格：有实时价用实时价，否则退回手动添加时填的价格；酒店用上面的估价
export function effPrice(l, T) {
  if (l.kind === 'hotel') return hotelTotal(l, T);
  const v = liveOf(l, T);
  if (v) return v.available ? v.total : null;
  return l.priceNights ? l.priceUSD || null : null;
}
export const UNAVAILABLE = { DATE: '这几天已经被订了', GUEST: '住不下这么多人，Airbnb 不给报价', MIN_NIGHTS: '不满足最少入住晚数', MAX_NIGHTS: '超过最多入住晚数' };

// 排序：先按所选方式排，订满的（实时报价显示这几天订不了）一律沉到最后，
// 组内仍保持所选排序。没有实时报价的房源不算订满，照常参与排序。
export function sortListings(list, sortBy, T) {
  const p = l => effPrice(l, T) || 1e9;
  const byMode = (a, b) => sortBy === 'votes'
    ? (b.votes || []).length - (a.votes || []).length || p(a) - p(b)
    : sortBy === 'added'
      ? (b.createdAt || 0) - (a.createdAt || 0)
      : p(a) - p(b);
  return list.slice().sort((a, b) => (isBooked(a, T) ? 1 : 0) - (isBooked(b, T) ? 1 : 0) || byMode(a, b));
}

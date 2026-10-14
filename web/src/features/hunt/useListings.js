import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';

// 当前行程的房源：加载、补抓缺的信息、刷新实时价。切了行程时丢掉旧行程还没回来的结果。
export function useListings(trip, token) {
  const [listings, setListings] = useState([]);
  const tripRef = useRef(trip);
  tripRef.current = trip;

  const patch = useCallback((id, fn) => setListings(ls => ls.map(l => (l.id === id ? fn(l) : l))), []);

  const refresh = useCallback(async () => {
    const t = trip;
    let s;
    try { s = await api('/api/state?trip=' + t); } catch (e) { return; }
    if (t !== tripRef.current) return;
    setListings(s.listings || []);
    enrichMissing(t, s.listings || []);
    refreshPrices(t);
  }, [trip]); // eslint-disable-line react-hooks/exhaustive-deps -- helpers below only use stable setters

  // 没照片、没评分、照片太少或还没查过位置的房源，一间间去补抓
  async function enrichMissing(t, list) {
    for (const l of list) {
      if (t !== tripRef.current) return;
      if (l.image && l.rating != null && l.images && l.images.length >= 2 && 'lat' in l) continue;
      try {
        const r = await api('/api/enrich', 'POST', { trip: t, id: l.id });
        if (t === tripRef.current && r.ok && r.listing) patch(l.id, () => r.listing);
      } catch (e) {}
    }
  }
  // 让后端去 Airbnb 查过期（>6 小时）的实时价
  async function refreshPrices(t) {
    let r;
    try { r = await api('/api/prices', 'POST', { trip: t }); } catch (e) { return; }
    if (t !== tripRef.current || !r.ok || !r.updated) return;
    setListings(ls => ls.map(l => (r.live[l.id] ? { ...l, live: r.live[l.id] } : l)));
  }

  // 换行程：清空重新加载
  useEffect(() => { setListings([]); refresh(); }, [refresh]);
  // 换了登录的人：重新加载（登录时后端可能把这台设备的票合并过去了）
  const firstToken = useRef(token);
  useEffect(() => { if (token !== firstToken.current) { firstToken.current = token; refresh(); } }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { listings, refresh, patch };
}

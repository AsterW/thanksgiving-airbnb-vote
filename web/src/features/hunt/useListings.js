import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';

// 当前行程的房源：加载、补抓缺的信息、刷新实时价。切了行程时丢掉旧行程还没回来的结果。
export function useListings(trip, token) {
  const [listings, setListings] = useState([]);
  const [vote, setVote] = useState(null); // 投票截止时间、选定的房子、订房状态（后端算好的）
  const [loaded, setLoaded] = useState(false); // 本行程的 state 回来过没有（横幅占位要分清「没数据」和「还在加载」）
  const tripRef = useRef(trip);
  tripRef.current = trip;

  const patch = useCallback((id, fn) => setListings(ls => ls.map(l => (l.id === id ? fn(l) : l))), []);

  const refresh = useCallback(async () => {
    const t = trip;
    let s;
    try { s = await api('/api/state?trip=' + t); } catch (e) { return; }
    if (t !== tripRef.current) return;
    setListings(s.listings || []);
    setVote(s.vote || null);
    setLoaded(true);
    refreshPrices(t);
    await assignZones(t, s.listings || []); // 先按位置分好区域，再去补抓（补抓到位置的那间后端会顺手分区）
    enrichMissing(t, s.listings || []);
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
  // 有位置但还没区域的房源：后端按位置分区（必要时查城镇名，会多出新标签页）
  async function assignZones(t, list) {
    if (!list.some(l => !l.area && !l.areaManual && l.lat != null)) return;
    let r;
    try { r = await api('/api/zones', 'POST', { trip: t }); } catch (e) { return; }
    if (t !== tripRef.current || !r.ok) return;
    setListings(ls => ls.map(l => (r.areas[l.id] && r.areas[l.id] !== l.area ? { ...l, area: r.areas[l.id] } : l)));
  }
  // 让后端去 Airbnb 查过期（>6 小时）的实时价
  async function refreshPrices(t) {
    let r;
    try { r = await api('/api/prices', 'POST', { trip: t }); } catch (e) { return; }
    if (t !== tripRef.current || !r.ok || !r.updated) return;
    setListings(ls => ls.map(l => (r.live[l.id] ? { ...l, live: r.live[l.id] } : l)));
  }

  // 换行程：清空重新加载
  useEffect(() => { setListings([]); setVote(null); setLoaded(false); refresh(); }, [refresh]);
  // 换了登录的人：重新加载（登录时后端可能把这台设备的票合并过去了）
  const firstToken = useRef(token);
  useEffect(() => { if (token !== firstToken.current) { firstToken.current = token; refresh(); } }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { listings, refresh, patch, vote, setVote, loaded };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';

// 当前行程的餐厅清单。只在这页打开时加载（回到这页时刷新，看到别人刚加的）；
// 切了行程就丢掉旧行程还没回来的结果。places 为 null 表示还在加载。
export function useFood(trip, active) {
  const [places, setPlaces] = useState(null);
  const tripRef = useRef(trip);
  tripRef.current = trip;

  const refresh = useCallback(async () => {
    const t = trip;
    let r;
    try { r = await api('/api/food?trip=' + t); } catch (e) { return; }
    if (t !== tripRef.current || !r.ok) return;
    setPlaces(r.places);
    // 照片功能之前加的店还没有 images：一家家去补一次
    for (const p of r.places) {
      if (Array.isArray(p.images)) continue;
      let x;
      try { x = await api('/api/food/photos', 'POST', { trip: t, id: p.id }); } catch (e) { continue; }
      if (t !== tripRef.current) return;
      if (x.ok) setPlaces(ps => ps && ps.map(q => (q.id === p.id ? { ...q, images: x.images } : q)));
    }
    // 地址功能之前加的店：用现在的读法把链接重读一次（名字里带的地址拆出来、补上位置），每家只做一次
    for (const p of r.places) {
      if (p.located) continue;
      let x;
      try { x = await api('/api/food/locate', 'POST', { trip: t, id: p.id }); } catch (e) { continue; }
      if (t !== tripRef.current) return;
      if (x.ok && x.place) {
        const { name, address, lat, lng, placeId, located } = x.place;
        setPlaces(ps => ps && ps.map(q => (q.id === p.id ? { ...q, name, address, lat, lng, placeId, located } : q)));
      }
    }
  }, [trip]);

  useEffect(() => { setPlaces(null); }, [trip]);
  useEffect(() => { if (active) refresh(); }, [active, refresh]);

  const patch = useCallback((id, fn) => setPlaces(ps => ps && ps.map(p => (p.id === id ? fn(p) : p))), []);
  return { places, setPlaces, patch, tripRef };
}

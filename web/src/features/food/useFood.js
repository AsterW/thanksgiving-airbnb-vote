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
    if (t === tripRef.current && r.ok) setPlaces(r.places);
  }, [trip]);

  useEffect(() => { setPlaces(null); }, [trip]);
  useEffect(() => { if (active) refresh(); }, [active, refresh]);

  const patch = useCallback((id, fn) => setPlaces(ps => ps && ps.map(p => (p.id === id ? fn(p) : p))), []);
  return { places, setPlaces, patch, tripRef };
}

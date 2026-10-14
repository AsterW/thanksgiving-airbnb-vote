import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { esc } from '../../lib/format.js';

// 餐厅地图：链接里带坐标的店都钉上。Leaflet 是命令式的，这里用 effect 同步。
function pinHtml(p, token) {
  const n = (p.votes || []).length;
  const mine = (p.votes || []).some(v => v.token === token);
  const label = p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name;
  return '<div class="fpin' + (mine ? ' mine' : '') + '">🍜 ' + esc(label) + (n ? '<span class="fpin-votes">♥' + n + '</span>' : '') + '</div>';
}
function popupEl(p, onFocus) {
  const el = document.createElement('div');
  el.innerHTML = '<div style="padding:10px 12px 12px"><div style="font-weight:700;line-height:1.3;margin-bottom:4px">' + esc(p.name) + '</div>'
    + (p.note ? '<div style="color:#64748b;font-size:12px;margin-bottom:8px">' + esc(p.note) + '</div>' : '')
    + '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" style="display:block;text-align:center;background:#4f46e5;color:#fff;font-weight:700;border-radius:10px;padding:6px 0;margin-bottom:6px">在 Google 地图打开 ↗</a>'
    + '<button style="width:100%;border:2px solid #e2e8f0;color:#475569;font-weight:600;border-radius:10px;padding:4px 0">看这家 ↓</button></div>';
  el.querySelector('button').addEventListener('click', () => onFocus(p.id));
  return el;
}

export default function FoodMap({ items, token, fitKey, visible, hotId, onFocus }) {
  const box = useRef(null);
  const map = useRef(null), layer = useRef(null), pins = useRef(new Map()), fitted = useRef('');
  const focus = useRef(onFocus);
  focus.current = onFocus;

  // 第一次看得见的时候才建地图（藏着的时候量不到尺寸）
  useEffect(() => {
    if (!visible || map.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false, zoomSnap: 0.25 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.setView([39.2, -105.3], 7);
    m.on('click', () => m.scrollWheelZoom.enable()); // 点一下地图之后才允许滚轮缩放
    m.on('mouseout', () => m.scrollWheelZoom.disable());
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
  }, [visible]);
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);
  useEffect(() => { if (visible) fitted.current = ''; }, [visible]);

  useEffect(() => {
    if (!visible || !map.current) return;
    layer.current.clearLayers();
    pins.current.clear();
    const pts = [];
    for (const p of items) {
      if (p.lat == null || p.lng == null) continue;
      const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'fpin-wrap', html: pinHtml(p, token), iconSize: [0, 0] }), riseOnHover: true })
        .bindPopup(popupEl(p, id => focus.current(id)), { maxWidth: 240, minWidth: 220, autoPanPadding: [20, 20] })
        .addTo(layer.current);
      pins.current.set(p.id, mk);
      pts.push([p.lat, p.lng]);
    }
    // 只有店的集合变了（换行程、加/删店）才重新取景，投票不动地图
    if (fitKey !== fitted.current) {
      fitted.current = fitKey;
      map.current.invalidateSize();
      if (pts.length === 1) map.current.setView(pts[0], 14, { animate: false });
      else if (pts.length) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 14, animate: false });
    }
  }, [items, token, fitKey, visible]);

  // 鼠标停在卡片上时，对应的钉子跟着高亮
  useEffect(() => {
    const mk = hotId && pins.current.get(hotId);
    const el = mk && mk.getElement() && mk.getElement().querySelector('.fpin');
    if (!el) return;
    el.classList.add('hot'); mk.setZIndexOffset(1000);
    return () => { el.classList.remove('hot'); mk.setZIndexOffset(0); };
  }, [hotId, items]);

  const missing = items.filter(p => p.lat == null).length;
  return (
    <section className="food-map-box glass-card rounded-2xl overflow-hidden mb-5">
      <div className="food-map" ref={box}></div>
      {missing > 0 && <div className="absolute left-3 bottom-3 z-[1000] bg-white/90 backdrop-blur text-xs text-slate-600 rounded-full px-3 py-1 shadow">{missing} 家的链接没带位置，没钉在地图上</div>}
    </section>
  );
}

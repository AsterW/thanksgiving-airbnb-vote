import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { addSatellite } from '../../lib/tiles.js';
import { esc } from '../../lib/format.js';

// 活动地图：有地点的卡都钉上，钉子是活动的 emoji + 短标题。点钉子可以
// 在 Google 地图打开，或者跳回下面那张卡。和餐厅地图一样，Leaflet 是
// 命令式的，用 effect 同步。
function pinHtml(a, token) {
  const n = (a.votes || []).length;
  const mine = (a.votes || []).some(v => v.token === token);
  const label = a.title.length > 12 ? a.title.slice(0, 11) + '…' : a.title;
  return '<div class="apin' + (mine ? ' mine' : '') + '">' + esc(a.emoji || '📍') + ' ' + esc(label) + (n ? '<span class="apin-votes">♥' + n + '</span>' : '') + '</div>';
}
function popupEl(a, onFocus) {
  const el = document.createElement('div');
  const gmaps = 'https://www.google.com/maps/search/?api=1&query=' + a.lat + ',' + a.lng;
  el.innerHTML = '<div style="padding:10px 12px 12px"><div style="font-weight:700;line-height:1.3;margin-bottom:4px">' + esc(a.title) + '</div>'
    + (a.place ? '<div style="color:#64748b;font-size:12px;margin-bottom:8px">📍 ' + esc(a.place) + '</div>' : '')
    + '<a href="' + gmaps + '" target="_blank" rel="noopener" style="display:block;text-align:center;background:#4f46e5;color:#fff;font-weight:700;border-radius:10px;padding:6px 0;margin-bottom:6px">在 Google 地图打开 ↗</a>'
    + '<button style="width:100%;border:2px solid #e2e8f0;color:#475569;font-weight:600;border-radius:10px;padding:4px 0">看这张卡 ↓</button></div>';
  el.querySelector('button').addEventListener('click', () => onFocus(a.id));
  return el;
}

export default function ActivitiesMap({ items, token, visible, onFocus }) {
  const box = useRef(null);
  const map = useRef(null), layer = useRef(null), fitted = useRef('');
  const focus = useRef(onFocus);
  focus.current = onFocus;

  const fitKey = items.filter(a => a.lat != null).map(a => a.id).sort().join(',');

  useEffect(() => {
    if (!visible || map.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false, zoomSnap: 0.25 });
    addSatellite(m);
    m.setView([39.2, -105.3], 7);
    m.on('click', () => m.scrollWheelZoom.enable());
    m.on('mouseout', () => m.scrollWheelZoom.disable());
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
  }, [visible]);
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);
  useEffect(() => { if (visible) fitted.current = ''; }, [visible]);

  useEffect(() => {
    if (!visible || !map.current) return;
    layer.current.clearLayers();
    const pts = [];
    for (const a of items) {
      if (a.lat == null || a.lng == null) continue;
      L.marker([a.lat, a.lng], { icon: L.divIcon({ className: 'apin-wrap', html: pinHtml(a, token), iconSize: [0, 0] }), riseOnHover: true })
        .bindPopup(popupEl(a, id => focus.current(id)), { maxWidth: 240, minWidth: 220, autoPanPadding: [20, 20] })
        .addTo(layer.current);
      pts.push([a.lat, a.lng]);
    }
    if (fitKey !== fitted.current) {
      fitted.current = fitKey;
      map.current.invalidateSize();
      if (pts.length === 1) map.current.setView(pts[0], 13, { animate: false });
      else if (pts.length) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 12, animate: false });
    }
  }, [items, token, fitKey, visible]);

  const missing = items.filter(a => a.lat == null).length;
  return (
    <section className="act-map-box glass-card rounded-2xl overflow-hidden mb-5">
      <div className="act-map" ref={box}></div>
      {missing > 0 && <div className="absolute left-3 bottom-3 z-[1000] bg-white/90 backdrop-blur text-xs text-slate-600 rounded-full px-3 py-1 shadow">{missing} 个活动还没加地点，点卡片上的「📍 加地点」就能钉上来</div>}
    </section>
  );
}

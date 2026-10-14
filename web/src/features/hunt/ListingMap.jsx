import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { esc, statsLine } from '../../lib/format.js';
import { effPrice, isBooked } from './price.js';

// 地图：当前筛选下的房源都钉在上面。Leaflet 是命令式的，这里用 effect 同步。
function pinHtml(l, T, token) {
  const n = (l.votes || []).length;
  const mine = (l.votes || []).some(v => v.token === token);
  const booked = isBooked(l, T), p = effPrice(l, T);
  const label = booked ? '已订满' : p ? '$' + p.toLocaleString() : '🏠';
  return '<div class="pin' + (mine ? ' mine' : '') + (booked ? ' booked' : '') + '">' + label + (n ? '<span class="pin-votes">♥' + n + '</span>' : '') + '</div>';
}
function popupEl(l, onFocus) {
  const pic = (l.images && l.images[0]) || l.image;
  const n = (l.votes || []).length;
  const el = document.createElement('div');
  el.innerHTML = (pic ? '<img src="' + esc(pic) + '" style="width:100%;aspect-ratio:16/10;object-fit:cover" alt="">' : '')
    + '<div style="padding:10px 12px 12px"><div style="font-weight:700;line-height:1.3;margin-bottom:4px">' + esc(l.title || '未命名房源') + '</div>'
    + '<div style="color:#64748b;font-size:12px;margin-bottom:8px">' + esc(statsLine(l)) + (n ? ' · ♥ ' + n + ' 票' : '') + '</div>'
    + '<button style="width:100%;background:#4f46e5;color:#fff;font-weight:700;border-radius:10px;padding:6px 0">看这间 ↓</button></div>';
  el.querySelector('button').addEventListener('click', () => onFocus(l.id));
  return el;
}

export default function ListingMap({ items, T, token, fitKey, visible, hotId, onFocus }) {
  const box = useRef(null);
  const map = useRef(null), layer = useRef(null), pins = useRef(new Map()), fitted = useRef('');
  const focus = useRef(onFocus);
  focus.current = onFocus;

  // 第一次看得见的时候才建地图（藏着的时候量不到尺寸）
  useEffect(() => {
    if (!visible || map.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, zoomSnap: 0.25 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, className: 'osm-tiles',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.setView([39.2, -105.3], 7); // 科罗拉多中部，等房源坐标来了再缩放
    m.on('click', () => m.scrollWheelZoom.enable()); // 点一下地图之后才允许滚轮缩放，免得滚页面时误缩放
    m.on('mouseout', () => m.scrollWheelZoom.disable());
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
  }, [visible]);
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  // 回到这个页面 / 重新显示地图：尺寸可能变了，重新取景
  useEffect(() => { if (visible) fitted.current = ''; }, [visible]);

  // 钉子跟着房源数据走
  useEffect(() => {
    if (!visible || !map.current) return;
    layer.current.clearLayers();
    pins.current.clear();
    const pts = [];
    for (const l of items) {
      if (l.lat == null || l.lng == null) continue;
      const mk = L.marker([l.lat, l.lng], { icon: L.divIcon({ className: 'pin-wrap', html: pinHtml(l, T, token), iconSize: [0, 0] }), riseOnHover: true })
        .bindPopup(popupEl(l, id => focus.current(id)), { maxWidth: 240, minWidth: 230, closeButton: true, autoPanPadding: [20, 20] })
        .addTo(layer.current);
      pins.current.set(l.id, mk);
      pts.push([l.lat, l.lng]);
    }
    // 只有房源集合变了（换行程/筛选/新加房源）才重新取景，投票重排不动地图。
    // 不做动画：坐标是一间间陆续到的，连续的缩放动画会互相打断，停在半路
    if (fitKey !== fitted.current) {
      fitted.current = fitKey;
      map.current.invalidateSize();
      if (pts.length === 1) map.current.setView(pts[0], 12, { animate: false });
      else if (pts.length) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 13, animate: false });
    }
  }, [items, T, token, fitKey, visible]);

  // 鼠标停在卡片上时，对应的钉子跟着高亮
  useEffect(() => {
    const mk = hotId && pins.current.get(hotId);
    const el = mk && mk.getElement() && mk.getElement().querySelector('.pin');
    if (!el) return;
    el.classList.add('hot'); mk.setZIndexOffset(1000);
    return () => { el.classList.remove('hot'); mk.setZIndexOffset(0); };
  }, [hotId, items]);

  const missing = items.filter(l => l.lat == null || l.lng == null).length;
  return (
    <section id="mapBox" className="bg-white rounded-2xl shadow overflow-hidden mb-5">
      <div id="map" ref={box}></div>
      {missing > 0 && <div className="absolute left-3 bottom-3 z-[1000] bg-white/90 backdrop-blur text-xs text-slate-600 rounded-full px-3 py-1 shadow">{missing} 间还在获取位置…</div>}
    </section>
  );
}

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { esc } from '../../lib/format.js';
import { duration, localTime } from './plan.js';

const COLORS = ['#4f46e5', '#e11d48', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#2563eb'];

// 大圆航线上的点（经度展开成连续的，跨太平洋的线不会绕地球另一边）
function arc(a, b, n = 64) {
  const r = Math.PI / 180, toV = p => [Math.cos(p.lat * r) * Math.cos(p.lng * r), Math.cos(p.lat * r) * Math.sin(p.lng * r), Math.sin(p.lat * r)];
  const A = toV(a), B = toV(b);
  const w = Math.acos(Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
  const pts = [];
  let prevLng = a.lng;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = w ? Math.sin((1 - t) * w) / Math.sin(w) : 1 - t, s2 = w ? Math.sin(t * w) / Math.sin(w) : t;
    const v = [0, 1, 2].map(k => s1 * A[k] + s2 * B[k]);
    let lng = Math.atan2(v[1], v[0]) / r;
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    prevLng = lng;
    pts.push([Math.atan2(v[2], Math.hypot(v[0], v[1])) / r, lng]);
  }
  return pts;
}

// 大家的航线：到达 / 离开分开看。同一条航线的人合成一条线，线越粗人越多
export default function FlightMap({ people, mode }) {
  const box = useRef(null), map = useRef(null), layer = useRef(null);

  useEffect(() => {
    const m = L.map(box.current, { scrollWheelZoom: false, worldCopyJump: true, zoomSnap: 0.25 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, className: 'osm-tiles',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · 机场数据 <a href="https://openflights.org/data">OpenFlights</a>' }).addTo(m);
    m.setView([39.86, -104.67], 4);
    m.on('click', () => m.scrollWheelZoom.enable());
    m.on('mouseout', () => m.scrollWheelZoom.disable());
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    const legs = people.map(p => ({ name: p.name, f: mode === 'arrival' ? p.arrival : p.departure })).filter(x => x.f);
    const routes = new Map();
    for (const x of legs) {
      const k = x.f.from.iata + '-' + x.f.to.iata;
      if (!routes.has(k)) routes.set(k, { from: x.f.from, to: x.f.to, legs: [] });
      routes.get(k).legs.push(x);
    }
    const bounds = [];
    const airports = new Map();
    [...routes.values()].forEach((rt, i) => {
      // 让「我们这头」（到达看落地机场，离开看起飞机场）落在 -180°~180° 的主地图上，
      // 所有航线在丹佛这边汇合，跨太平洋的从左边飞进来，而不是画到右边另一个世界副本里
      let pts = arc(rt.from, rt.to);
      const homeLng = mode === 'arrival' ? pts[pts.length - 1][1] : pts[0][1];
      const shift = Math.round(homeLng / 360) * 360;
      if (shift) pts = pts.map(([la, lo]) => [la, lo - shift]);
      bounds.push(...pts);
      const tip = '<b>' + rt.from.iata + ' → ' + rt.to.iata + '</b><br>' + rt.legs.map(x => esc(x.name) + ' · ' + esc(x.f.flight) + ' · '
        + localTime(x.f.depUtc, rt.from.tz) + ' → ' + localTime(x.f.arrUtc, rt.to.tz, false) + '（' + duration(x.f.minutes) + '）').join('<br>');
      L.polyline(pts, { color: COLORS[i % COLORS.length], weight: 2 + Math.min(4, rt.legs.length), opacity: 0.85, dashArray: mode === 'departure' ? '8 6' : null })
        .bindTooltip(tip, { sticky: true }).addTo(layer.current);
      // 端点：一个机场只画一个点，记下在这儿上下飞机的人
      for (const [ap, end] of [[rt.from, pts[0]], [rt.to, pts[pts.length - 1]]]) {
        const a = airports.get(ap.iata) || { ap, at: end, names: new Set() };
        rt.legs.forEach(x => a.names.add(x.name));
        airports.set(ap.iata, a);
      }
    });
    // 人最多的那个机场（一般是 DEN）是汇合点：换个颜色，画在最上面
    const hub = [...airports.values()].sort((a, b) => b.names.size - a.names.size)[0];
    for (const a of airports.values()) {
      const { ap, at, names } = a;
      L.marker(at, { zIndexOffset: a === hub ? 1000 : 0, icon: L.divIcon({ className: 'pin-wrap', html: '<div class="ap-pin' + (a === hub ? ' hub' : '') + '">' + ap.iata + '</div>', iconSize: [0, 0] }) })
        .bindTooltip('<b>' + esc(ap.iata) + '</b> ' + esc(ap.city) + '<br>' + [...names].map(esc).join('、'), { direction: 'top' }).addTo(layer.current);
    }
    m.invalidateSize();
    if (bounds.length) m.fitBounds(bounds, { padding: [30, 30], maxZoom: 6, animate: false });
  }, [people, mode]);

  return <div ref={box} className="flight-map"></div>;
}

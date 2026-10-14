import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { esc } from '../../lib/format.js';
import { reduceMotion } from '../../lib/motion.js';
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

// 机头朝上的小飞机，转到航向
const PLANE = color => '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="' + color + '" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" '
  + 'd="M12 1.5c.9 0 1.6 1 1.6 2.3v5.7l7.9 4.6v2.2l-7.9-2.3v4.6l2.3 1.7v1.8L12 21l-3.9 1.1v-1.8l2.3-1.7v-4.6l-7.9 2.3v-2.2l7.9-4.6V3.8c0-1.3.7-2.3 1.6-2.3z"/></svg>';

// 航线在当前缩放下的像素折线，带累计长度：飞机按像素距离走，屏幕上匀速，不会忽快忽慢
function project(m, pts) {
  const lp = pts.map(ll => m.latLngToLayerPoint(ll));
  const cum = [0];
  for (let i = 1; i < lp.length; i++) cum.push(cum[i - 1] + lp[i].distanceTo(lp[i - 1]));
  return { lp, cum, total: cum[cum.length - 1] };
}
// 折线上走了 d 像素的那个点（不取整，子像素位置）
function pointAt({ lp, cum, total }, d) {
  d = Math.max(0, Math.min(total, d));
  let k = 1;
  while (k < cum.length - 1 && cum[k] < d) k++;
  const seg = cum[k] - cum[k - 1] || 1, f = (d - cum[k - 1]) / seg;
  return { x: lp[k - 1].x + (lp[k].x - lp[k - 1].x) * f, y: lp[k - 1].y + (lp[k].y - lp[k - 1].y) * f };
}

// 动起来：每条航线先顺着飞行方向画出来（到达从外地画进丹佛，离开从丹佛画出去），
// 然后线上的虚线一直往前流，小飞机沿着航线慢慢绕圈飞。系统开了「减少动态效果」就不动。
// instant=true 时不重播画线动画：只是数据刷新（别人刚填了航班）时，线和飞机直接到位，
// 不然每次有人保存，整张图都要闪一遍、飞机全部从头飞。
//
// 飞机不用 Leaflet 的 marker：marker 每次移动都会把位置取整到整像素，飞得慢时就一顿一顿地抖。
// 这里自己放在一个图层里，用不取整的 translate3d 定位；机头方向取前后各 12 像素的连线，再平滑地转过去。
function animate(m, group, drawn, instant) {
  const timers = [], planes = [];
  const pane = m.getPane('flPlanes') || m.createPane('flPlanes');
  pane.style.zIndex = 650; pane.style.pointerEvents = 'none';
  const reproject = () => planes.forEach(p => { p.path = project(m, p.pts); });
  const hide = () => { pane.style.visibility = 'hidden'; };
  const show = () => { reproject(); pane.style.visibility = ''; };
  m.on('zoomstart', hide); m.on('zoomend viewreset', show);

  const spawn = ({ flow, pts, color, minutes }, i) => {
    flow.addTo(group);
    const el = document.createElement('div');
    el.className = 'fl-plane'; el.innerHTML = PLANE(color);
    pane.appendChild(el);
    // 飞得慢一点、稳一点：时长按真实飞行时间拉长（2 小时约 13 秒一圈，13 小时封顶 30 秒），
    // 每架错开相位起飞，不会齐刷刷从起点排队出发
    const period = Math.min(30000, Math.max(9000, 6000 + minutes * 45));
    planes.push({ el, pts, period, start: performance.now() - (i * 0.37 % 1) * period, path: project(m, pts), ang: null });
  };
  drawn.forEach((d, i) => {
    if (instant) { spawn(d, i); return; }
    const el = d.line.getElement();
    if (!el) { spawn(d, i); return; }
    const len = el.getTotalLength();
    const delay = i * 250;
    el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1.3s ease-in-out ' + delay + 'ms';
    el.style.strokeDashoffset = 0;
    timers.push(setTimeout(() => {
      el.style.transition = ''; el.style.strokeDasharray = ''; el.style.strokeDashoffset = '';
      spawn(d, i);
    }, delay + 1300));
  });

  let raf = 0;
  const tick = now => {
    for (const p of planes) {
      // rAF 给的时间可能比加飞机那一刻还早一点，别让进度变成负数
      const t = (Math.max(0, now - p.start) % p.period) / p.period;
      const d = t * p.path.total;
      const pos = pointAt(p.path, d), a = pointAt(p.path, d - 12), b = pointAt(p.path, d + 12);
      const target = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
      // 平滑转向：每帧只转差值的一部分（走最短的那个方向），回到起点时直接对准
      if (p.ang === null || t < 0.01) p.ang = target;
      else p.ang += ((((target - p.ang) % 360) + 540) % 360 - 180) * 0.2;
      p.el.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0) translate(-50%,-50%) rotate(' + p.ang + 'deg)';
      // 一圈的头尾各淡入淡出一下：飞到终点先淡出、回到起点再淡入，不会「啪」地瞬移回去
      p.el.style.opacity = String(Math.max(0, Math.min(1, t / 0.07, (1 - t) / 0.07)));
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    timers.forEach(clearTimeout); cancelAnimationFrame(raf);
    planes.forEach(p => p.el.remove());
    m.off('zoomstart', hide); m.off('zoomend viewreset', show);
    pane.style.visibility = '';
  };
}

// 大家的航线：到达 / 离开分开看。同一条航线的人合成一条线，线越粗人越多
export default function FlightMap({ people, mode }) {
  const box = useRef(null), map = useRef(null), layer = useRef(null);
  const shownMode = useRef(null); // 画线动画只在第一次看这个模式时播，之后的数据刷新直接到位

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
    const drawn = [];
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
      const color = COLORS[i % COLORS.length], weight = 2 + Math.min(4, rt.legs.length);
      const line = L.polyline(pts, { color, weight, opacity: 0.85 }).bindTooltip(tip, { sticky: true }).addTo(layer.current);
      // 往前流的白色虚线（线画完之后才加进图层组，切换时跟着一起清掉），方向就是飞行方向
      const flow = L.polyline(pts, { color: '#fff', weight: Math.max(1.5, weight - 2), opacity: 0.9, className: 'fl-flow', interactive: false });
      drawn.push({ line, flow, pts, color, minutes: Math.max(...rt.legs.map(x => x.f.minutes)) });
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
    if (reduceMotion) { drawn.forEach(d => d.flow.addTo(layer.current)); return; }
    const instant = shownMode.current === mode;
    shownMode.current = mode;
    return animate(m, layer.current, drawn, instant);
  }, [people, mode]);

  return <div ref={box} className="flight-map"></div>;
}

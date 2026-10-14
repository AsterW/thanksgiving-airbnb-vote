import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { addSatellite } from '../../lib/tiles.js';

// Pick a card's location on a map: search a place name (OpenStreetMap's
// Nominatim, the same source the worker uses for listing zones), click
// a result — or just tap the map / drag the pin — then save. The name
// field is what the card shows; clicking the map pre-fills it from a
// reverse lookup unless the user has typed their own.
const DENVER = [39.75, -104.99];

export default function LocationPicker({ initial, onSave, onClose }) {
  const box = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const nameDirty = useRef(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [name, setName] = useState(initial && initial.lat != null ? (initial.place || '') : '');
  const [pin, setPin] = useState(initial && initial.lat != null ? { lat: initial.lat, lng: initial.lng } : null);
  const pinRef = useRef(pin);
  pinRef.current = pin;

  function dropPin(lat, lng, zoom) {
    const m = map.current;
    if (!m) return;
    setPin({ lat, lng });
    if (marker.current) marker.current.setLatLng([lat, lng]);
    else {
      marker.current = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({ className: 'loc-pin-wrap', html: '<div class="loc-pin">📍</div>', iconSize: [34, 34], iconAnchor: [17, 30] }),
      }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng();
        setPin({ lat: p.lat, lng: p.lng });
        reverseName(p.lat, p.lng);
      });
    }
    if (zoom) m.setView([lat, lng], zoom);
  }

  async function reverseName(lat, lng) {
    if (nameDirty.current) return;
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=zh,en&lat=' + lat + '&lon=' + lng);
      const d = await r.json();
      const a = d.address || {};
      const guess = d.name || a.attraction || a.tourism || a.amenity || a.leisure || a.road || '';
      if (guess && !nameDirty.current) setName(guess);
      else if (!guess && d.display_name && !nameDirty.current) setName(d.display_name.split(',').slice(0, 2).join(', '));
    } catch (e) { /* name stays whatever it was */ }
  }

  useEffect(() => {
    const m = L.map(box.current, { scrollWheelZoom: true, zoomSnap: 0.25 });
    addSatellite(m);
    map.current = m;
    if (initial && initial.lat != null) m.setView([initial.lat, initial.lng], 13);
    else m.setView(DENVER, 9);
    m.on('click', e => { dropPin(e.latlng.lat, e.latlng.lng); reverseName(e.latlng.lat, e.latlng.lng); });
    if (initial && initial.lat != null) dropPin(initial.lat, initial.lng);
    return () => { m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e) {
    e.preventDefault();
    const query = q.trim();
    if (!query || searching) return;
    setSearching(true); setSearchError(''); setResults([]);
    try {
      const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=zh,en'
        + '&viewbox=-109.2,41.1,-101.9,36.9&bounded=0&q=' + encodeURIComponent(query);
      const r = await fetch(u);
      const d = await r.json();
      if (!Array.isArray(d) || !d.length) setSearchError('没搜到这个地方，换个名字试试，或者直接在地图上点');
      setResults(Array.isArray(d) ? d : []);
    } catch (err) { setSearchError('搜索暂时用不了，可以直接在地图上点位置'); }
    setSearching(false);
  }

  function pick(r) {
    const lat = Number(r.lat), lng = Number(r.lon);
    setResults([]);
    nameDirty.current = false;
    setName(r.name || (r.display_name || '').split(',')[0] || '');
    dropPin(lat, lng, 14);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="glass-sheet w-full max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="font-bold">📍 选地点</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2">✕</button>
        </div>
        <form onSubmit={search} className="px-4 pb-2 flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜地方名：比如 Red Rocks、Bear Lake、餐厅名…"
            className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          <button disabled={searching} className="bg-indigo-600 text-white font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            {searching ? '搜索中…' : '搜索'}
          </button>
        </form>
        {searchError && <p className="px-4 pb-1 text-xs text-amber-600">{searchError}</p>}
        {results.length > 0 && (
          <ul className="mx-4 mb-2 border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
            {results.map(r => (
              <li key={r.place_id}>
                <button onClick={() => pick(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0">
                  <span className="font-medium">{r.name || r.display_name.split(',')[0]}</span>
                  <span className="block text-xs text-slate-400 truncate">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="loc-map" ref={box}></div>
        <div className="px-4 py-3 flex flex-col gap-2">
          <input value={name} onChange={e => { nameDirty.current = true; setName(e.target.value); }}
            placeholder={pin ? '地点名（卡片上显示这个）' : '先在地图上点一下，或者搜个地方'}
            className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex-1">{pin ? '已定位：' + pin.lat.toFixed(5) + ', ' + pin.lng.toFixed(5) + '（可以拖动图钉微调）' : '还没有定位'}</span>
            {(initial && initial.lat != null) || pin
              ? <button onClick={() => onSave(null)} className="text-sm text-red-500 font-medium px-2 py-2">清除地点</button> : null}
            <button onClick={onClose} className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-600">取消</button>
            <button disabled={!pin} onClick={() => onSave({ place: name.trim(), lat: pin.lat, lng: pin.lng })}
              className="bg-indigo-600 text-white font-bold rounded-xl px-5 py-2 text-sm disabled:opacity-50">保存地点</button>
          </div>
        </div>
      </div>
    </div>
  );
}

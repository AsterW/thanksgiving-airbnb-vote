import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';

// 机场输入：打代码、城市或机场名，下拉选。value / onChange 都是 IATA 代码
export default function AirportInput({ value, label, onChange }) {
  const [text, setText] = useState(value || '');
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null); // 选中机场的全名，显示在下面
  const seq = useRef(0);

  useEffect(() => { setText(value || ''); }, [value]);
  useEffect(() => { // 有初始值时把机场名查出来
    if (!value) { setPicked(null); return; }
    api('/api/airports?q=' + encodeURIComponent(value)).then(r => { const a = r.airports?.find(x => x.iata === value); setPicked(a || null); }).catch(() => {});
  }, [value]);

  async function search(q) {
    setText(q); setOpen(true);
    const n = ++seq.current;
    if (!q.trim()) { setHits([]); return; }
    try { const r = await api('/api/airports?q=' + encodeURIComponent(q.trim())); if (n === seq.current) setHits(r.airports || []); } catch (e) {}
  }
  const choose = a => { setOpen(false); setText(a.iata); setPicked(a); onChange(a.iata); };

  return (
    <label className="block relative">
      <span className="text-xs text-slate-500">{label}</span>
      <input value={text} onChange={e => search(e.target.value)} onFocus={() => text && search(text)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === 'Enter' && hits[0]) { e.preventDefault(); choose(hits[0]); } }}
        placeholder="代码或城市，如 PVG / Shanghai" className="w-full border rounded-lg px-3 py-2 uppercase placeholder:normal-case" />
      <span className="block text-[11px] text-slate-400 truncate h-4">{picked ? picked.city + ' · ' + picked.name : ''}</span>
      {open && hits.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-[3.6rem] bg-white rounded-xl shadow-xl border text-sm max-h-64 overflow-auto">
          {hits.map(a => (
            <button type="button" key={a.iata} onMouseDown={e => { e.preventDefault(); choose(a); }} className="block w-full text-left px-3 py-2 hover:bg-indigo-50">
              <b>{a.iata}</b> <span className="text-slate-600">{a.city}</span> <span className="text-slate-400 text-xs">· {a.name} · {a.country}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

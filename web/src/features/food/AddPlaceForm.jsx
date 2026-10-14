import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';

// 加餐厅：粘贴从 Google 地图复制的链接（店铺页或 maps.app.goo.gl 分享链接）。
// 店名和位置都从链接里读；读不出来就告诉你找不到这家。
export default function AddPlaceForm({ trip, onAdded }) {
  const { name: me } = useSession();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', tone: 'text-slate-500' });

  useEffect(() => { setMsg({ text: '', tone: 'text-slate-500' }); }, [trip]);

  async function add() {
    if (busy || !url.trim()) return;
    setBusy(true);
    setMsg({ text: '正在读取 Google 地图链接…', tone: 'text-slate-500' });
    let r;
    try { r = await api('/api/food/add', 'POST', { trip, url: url.trim(), note: note.trim(), addedBy: me }); }
    catch (e) { r = { ok: false, error: '网络有点问题，稍后再试' }; }
    setBusy(false);
    if (!r.ok) { setMsg({ text: r.error || '没加上', tone: 'text-amber-600' }); return; }
    setUrl(''); setNote('');
    setMsg({ text: r.deduped ? '「' + r.place.name + '」已经在清单里了' : '加上了「' + r.place.name + '」🎉', tone: 'text-green-600' });
    onAdded(r);
  }

  const onEnter = e => { if (e.key === 'Enter') add(); };
  const input = 'border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="font-bold text-lg mb-3">➕ 添加餐厅</h2>
      <input type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={onEnter} className={input + ' w-full'}
        placeholder="粘贴 Google 地图链接：在店铺页点“分享”→ 复制链接（maps.app.goo.gl/… 或 google.com/maps/place/…）" />
      <div className="flex flex-col md:flex-row gap-3 mt-3">
        <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={onEnter} maxLength={120} className={input + ' flex-1'}
          placeholder="一句话：吃什么、为什么想去（可选）" />
        <button onClick={add} disabled={busy || !url.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl px-6 py-3">
          {busy ? '读取中…' : '加入清单'}
        </button>
      </div>
      <p className={'text-sm mt-2 min-h-[1.25rem] ' + msg.tone}>{msg.text}</p>
    </section>
  );
}

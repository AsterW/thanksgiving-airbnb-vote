import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import LocationPicker from './LocationPicker.jsx';

// Paste a link, get a card: the worker reads the page and fills in its
// title and description. A title typed here wins over the page's own.
// A location is optional — picked on the map here, or left for later
// (the card has a 📍 button too). A pasted Google Maps link brings its
// own pin; the worker reads it from the link.
export default function AddActivityForm({ onAdded }) {
  const { ensureName } = useSession();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const u = url.trim();
    if (!u || busy) return;
    ensureName(async me => {
      setBusy(true); setError('');
      const r = await api('/api/activity-add', 'POST', { url: u, title: title.trim(), name: me.name, place });
      setBusy(false);
      if (!r.ok) { setError(r.error || '加不了，稍后再试'); return; }
      setUrl(''); setTitle(''); setPlace(null);
      onAdded(r.activity);
      toast(r.parsed === false
        ? '🔗 加好了（网页没读到，用了网址当标题，可以删掉重加）'
        : '🎉 加好了：「' + r.activity.title + '」');
    });
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow p-4 mb-6">
      <p className="font-bold mb-2">➕ 推荐个活动</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="粘个链接：官网、攻略、小红书、Reddit 都行"
          className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题（可选，留空自动读网页）"
          className="sm:w-56 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <button disabled={busy} className="bg-indigo-600 text-white font-bold rounded-xl px-5 py-2 text-sm disabled:opacity-50">
          {busy ? '读取网页中…' : '做成卡片'}
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {place ? (
          <span className="inline-flex items-center gap-1.5 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">
            📍 {place.place || '地图上的位置'}
            <button type="button" onClick={() => setPicking(true)} className="text-emerald-500 hover:text-emerald-700">✎</button>
            <button type="button" onClick={() => setPlace(null)} className="text-emerald-500 hover:text-red-500">✕</button>
          </span>
        ) : (
          <button type="button" onClick={() => setPicking(true)}
            className="text-xs text-slate-400 hover:text-indigo-600 border border-dashed border-slate-300 hover:border-indigo-400 rounded-full px-2.5 py-1">
            📍 加地点（可选，在地图上选）
          </button>
        )}
        {!place && <span className="text-xs text-slate-300">粘 Google 地图链接的话会自动带地点</span>}
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      {picking && <LocationPicker initial={place} onSave={p => { setPlace(p); setPicking(false); }} onClose={() => setPicking(false)} />}
    </form>
  );
}

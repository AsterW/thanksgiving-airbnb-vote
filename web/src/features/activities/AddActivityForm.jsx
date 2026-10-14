import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';

// Paste a link, get a card: the worker reads the page and fills in its
// title and description. A title typed here wins over the page's own.
export default function AddActivityForm({ onAdded }) {
  const { ensureName } = useSession();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const u = url.trim();
    if (!u || busy) return;
    ensureName(async me => {
      setBusy(true); setError('');
      const r = await api('/api/activity-add', 'POST', { url: u, title: title.trim(), name: me.name });
      setBusy(false);
      if (!r.ok) { setError(r.error || '加不了，稍后再试'); return; }
      setUrl(''); setTitle('');
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
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </form>
  );
}

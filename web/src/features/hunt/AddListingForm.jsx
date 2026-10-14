import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const EMPTY = { url: '', title: '', image: '', price: '', bedrooms: '', beds: '', baths: '', sleeps: '', area: '', note: '' };
const num = v => (v ? Number(v) : null);

// 加房源：贴链接自动抓取；抓不到就展开手动表单（链接已预填）
export default function AddListingForm({ trip, T, onAdded }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', tone: 'text-slate-500' });
  const [manualOpen, setManualOpen] = useState(false);
  const [m, setM] = useState(EMPTY);
  const field = k => ({ value: m[k], onChange: e => setM({ ...m, [k]: e.target.value }) });

  // 换行程：区域选项不一样了，别把上一段行程选的区域带过去；上一段的提示也清掉
  useEffect(() => { setM(m => ({ ...m, area: '' })); setMsg({ text: '', tone: 'text-slate-500' }); }, [trip]);

  async function add() {
    const u = url.trim();
    if (!u) return;
    setBusy(true);
    setMsg({ text: '正在读取 Airbnb 房源信息…', tone: 'text-slate-500' });
    try {
      const r = await api('/api/add', 'POST', { trip, url: u });
      if (r.ok) {
        setUrl('');
        setMsg({ text: r.deduped ? '这间已经在清单里了' : '已加入清单 🎉', tone: 'text-green-600' });
        await onAdded();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMsg({ text: '自动抓取失败：' + (r.error || '未知错误') + '，可以用下面的手动添加', tone: 'text-amber-600' });
        setM({ ...m, url: u });
        setManualOpen(true);
      }
    } catch (e) {
      setMsg({ text: '网络有点问题，稍后再试', tone: 'text-red-500' });
    }
    setBusy(false);
  }

  async function addManual() {
    const body = { trip, url: m.url.trim(), title: m.title.trim(), image: m.image.trim(), priceUSD: num(m.price), priceNights: T.nights,
      bedrooms: num(m.bedrooms), beds: num(m.beds), bathrooms: num(m.baths), sleeps: num(m.sleeps), area: m.area, note: m.note.trim() };
    if (!body.url || !body.title) { alert('链接和标题是必填的'); return; }
    const r = await api('/api/add-manual', 'POST', body);
    if (r.ok) { setM(EMPTY); setManualOpen(false); await onAdded(); }
    else alert('添加失败：' + (r.error || ''));
  }

  const input = 'border rounded-lg px-3 py-2';
  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="font-bold text-lg mb-3">➕ 添加候选房源</h2>
      <div className="flex flex-col md:flex-row gap-3">
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="粘贴 Airbnb 房源链接，例如 https://www.airbnb.com/rooms/123456…"
          className="flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={add} disabled={busy} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-3">{busy ? '抓取中…' : '加入清单'}</button>
      </div>
      <p className={'text-sm mt-2 ' + msg.tone}>{msg.text}</p>
      <details open={manualOpen} onToggle={e => setManualOpen(e.currentTarget.open)} className="mt-3 text-sm">
        <summary className="cursor-pointer text-indigo-600 font-medium">自动抓取失败？点这里手动添加</summary>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <input className={input} placeholder="房源链接 *" {...field('url')} />
          <input className={input} placeholder="房源标题 *" {...field('title')} />
          <input className={input} placeholder="照片链接（可选）" {...field('image')} />
          <input className={input} type="number" placeholder={T.nights + '晚总价 USD（可选）'} {...field('price')} />
          <input className={input} type="number" placeholder="卧室数" {...field('bedrooms')} />
          <input className={input} type="number" placeholder="床位数" {...field('beds')} />
          <input className={input} placeholder="浴室数（可填 2.5）" {...field('baths')} />
          <input className={input} type="number" placeholder="可住人数" {...field('sleeps')} />
          <select className={input} {...field('area')}>
            <option value="">区域（可选）</option>
            {T.areas.concat('其他').map(a => <option key={a}>{a}</option>)}
          </select>
          <input className={input} placeholder="一句话亮点（可选）" {...field('note')} />
        </div>
        <button onClick={addManual} className="mt-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-5 py-2">手动加入</button>
      </details>
    </section>
  );
}

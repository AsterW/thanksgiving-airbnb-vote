import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';

const EMPTY = { url: '', title: '', image: '', price: '', bedrooms: '', beds: '', baths: '', sleeps: '', area: '', note: '' };
const num = v => (v ? Number(v) : null);
// 酒店：Google 地图（或 Apple 地图）里那家酒店的分享链接
const isMapLink = u => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|((www|maps)\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.apple\.com)/i.test(u.trim());

// 加房源：贴 Airbnb 链接自动抓取，或贴酒店的地图链接（名字、地址、位置从链接读，价格自动查 Google 参考价，
// 也可以自己填每间每晚的价格）；抓不到就展开手动表单（链接已预填）
export default function AddListingForm({ trip, T, zones, closed, onAdded }) {
  const { name } = useSession();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [nightly, setNightly] = useState('');
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
    const map = isMapLink(u);
    setBusy(true);
    setMsg({ text: map ? '正在读取地图链接、查 Google 上的价格…' : '正在读取 Airbnb 房源信息…', tone: 'text-slate-500' });
    try {
      const r = await api('/api/add', 'POST', { trip, url: u, addedBy: name, ...(map && nightly.trim() ? { nightly: nightly.trim() } : {}) });
      if (r.ok) {
        setUrl(''); setNightly('');
        const l = r.listing || {};
        const found = map && !r.deduped
          ? '：' + l.title + (l.address ? ' · ' + l.address : '') + (l.rate ? ' · $' + l.rate.nightly + '/间/晚' + (l.rate.source === 'google' ? '（Google 参考价）' : '') : ' · 没查到价格，可以在卡片上填')
          : '';
        setMsg({ text: (r.deduped ? '这间已经在清单里了' : '已加入清单 🎉') + found, tone: 'text-green-600' });
        await onAdded();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (map) {
        setMsg({ text: r.error || '没读出来这个地图链接', tone: 'text-amber-600' });
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
    const body = { trip, addedBy: name, url: m.url.trim(), title: m.title.trim(), image: m.image.trim(), priceUSD: num(m.price), priceNights: T.nights,
      bedrooms: num(m.bedrooms), beds: num(m.beds), bathrooms: num(m.baths), sleeps: num(m.sleeps), area: m.area, note: m.note.trim() };
    if (!body.url || !body.title) { toast('链接和标题是必填的'); return; }
    const r = await api('/api/add-manual', 'POST', body);
    if (r.ok) { setM(EMPTY); setManualOpen(false); await onAdded(); }
    else toast('添加失败：' + (r.error || ''));
  }

  const input = 'border rounded-lg px-3 py-2';
  if (closed) return null; // 投票截止后不能再加房源（上面的结果面板会说明）
  return (
    <section className="glass-card rounded-2xl p-5 mb-6">
      <h2 className="font-bold text-lg mb-3">➕ 添加候选房源</h2>
      <div className="flex flex-col md:flex-row gap-3">
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="粘贴 Airbnb 房源链接，或者酒店在 Google 地图里的分享链接"
          className="flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {isMapLink(url) && <input type="number" min="1" value={nightly} onChange={e => setNightly(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="每间每晚 $（可不填）" aria-label="每间每晚的价格，美元，可不填（不填就查 Google 参考价）"
          className="md:w-44 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />}
        <button onClick={add} disabled={busy} className="btn-primary font-bold rounded-xl px-6 py-3">{busy ? '抓取中…' : '加入清单'}</button>
      </div>
      {isMapLink(url) && <p className="text-xs text-slate-500 mt-1">🏨 地图链接按酒店加：名字、地址、位置从链接读；价格不填就查 Google 的参考价（那是 Google 自己挑的某一晚，不一定是行程那几天）</p>}
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
          {/* 可以选已有区域，也可以直接打一个新的；不填的话按位置自动分 */}
          <input className={input} list="zoneOptions" placeholder="区域（可选，不填按位置自动分）" maxLength={30} {...field('area')} />
          <datalist id="zoneOptions">{zones.map(a => <option key={a} value={a} />)}</datalist>
          <input className={input} placeholder="一句话亮点（可选）" {...field('note')} />
        </div>
        <button onClick={addManual} className="mt-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-5 py-2">手动加入</button>
      </details>
    </section>
  );
}

import { ago } from '../../lib/format.js';
import { liveOf, UNAVAILABLE } from './price.js';
import { perPerson } from './deadline.js';

export default function PriceBlock({ l, T }) {
  const v = liveOf(l, T);
  if (v && !v.available) return (
    <>
      <div className="inline-flex items-center gap-1 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">❌ {UNAVAILABLE[v.reason] || '这几天订不了'}</div>
      <div className="text-xs text-slate-400 mt-1">Airbnb 实时查询 · {ago(v.at)}</div>
    </>
  );
  if (v && v.total) return (
    <>
      <div className="text-lg font-bold text-slate-800">
        ${v.total.toLocaleString()}
        {v.original > v.total && <> <s className="text-sm font-normal text-slate-400">${v.original.toLocaleString()}</s></>}
        {' '}<span className="text-xs font-normal text-slate-500">/ {v.nights}晚总价</span>
      </div>
      {(() => { const pp = perPerson(v.total, T); return <div className="text-sm font-bold text-indigo-700 mt-0.5">每人约 ${pp.each.toLocaleString()} <span className="font-normal text-xs text-slate-500">（{T.people} 人分 · 每人每晚 ${pp.perNight}）</span></div>; })()}
      <div className="text-xs text-emerald-700 mt-0.5">✓ Airbnb 实时价{v.guests < T.people ? ' · 按 ' + v.guests + ' 人计' : ''} · {ago(v.at)}</div>
    </>
  );
  // 酒店：没有 Airbnb 实时价，显示从 Booking 拉取的价格快照（带拉取时间）
  if (l.kind === 'hotel') {
    if (l.priceUSD && l.priceNights) return (
      <>
        <div className="text-lg font-bold text-slate-800">
          ${Number(l.priceUSD).toLocaleString()}
          {' '}<span className="text-xs font-normal text-slate-500">/ {l.priceNights}晚总价</span>
        </div>
        {(() => { const pp = perPerson(l.priceUSD, T); return <div className="text-sm font-bold text-indigo-700 mt-0.5">每人约 ${pp.each.toLocaleString()} <span className="font-normal text-xs text-slate-500">（{T.people} 人分 · 每人每晚 ${pp.perNight}）</span></div>; })()}
        <div className="text-xs text-sky-700 mt-0.5">🏨 Booking.com 拉取价{l.priceAt ? ' · ' + ago(l.priceAt) : ''}</div>
      </>
    );
    return <div className="text-sm text-slate-500">🏨 价格见 Booking 链接（尚未拉取）</div>;
  }
  // 还没查到实时价：手动添加时填过价格的先显示那个
  if (l.priceUSD && l.priceNights) return (
    <>
      <div className="text-lg font-bold text-slate-500">约 ${Number(l.priceUSD).toLocaleString()} <span className="text-xs font-normal">/ {l.priceNights}晚</span></div>
      <div className="text-xs text-slate-400 mt-0.5">手动填的价格 · 实时价查询中…</div>
    </>
  );
  return <div className="text-sm text-slate-500">实时价查询中…</div>;
}

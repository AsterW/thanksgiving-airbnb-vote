import Carousel from '../../components/Carousel.jsx';
import { ago } from '../../lib/format.js';
import { useSession } from '../../session/SessionContext.jsx';

// 导航到链接里的位置（链接没带位置的店不显示导航，直接用 Google 地图链接）
const directionsLink = p => 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng;

export default function PlaceCard({ p, token, cardRef, pop, onVote, onRemove }) {
  const votes = p.votes || [];
  const { name: myName } = useSession();
  const voted = votes.some(v => v.token === token || (!!myName && String(v.name || '').toLowerCase() === myName.toLowerCase()));
  return (
    <article ref={cardRef} data-id={p.id} className="glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="relative car-wrap">
        <Carousel pics={p.images || []} placeholder="🍜" />
        <button onClick={() => onRemove(p)} title="删除这家" className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-full">✕</button>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold leading-snug break-words">{p.name}</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {(p.addedBy ? p.addedBy + ' 加的 · ' : '') + ago(p.createdAt) + (p.lat == null ? ' · 地图上没有位置' : '')}
        </p>
        {p.note && <p className="text-sm text-slate-600 mt-2">💡 {p.note}</p>}
        {votes.length
          ? <div className="mt-2">{votes.map(v => <span key={v.token} className="chip">{v.name || '匿名'}</span>)}</div>
          : <div className="mt-2 text-xs text-slate-400">还没人说想去</div>}
        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          <button onClick={e => onVote(p, e.currentTarget)}
            className={'flex-1 min-w-[7rem] border-2 font-bold rounded-xl py-2 ' + (voted ? 'bg-rose-600 border-rose-600 text-white' : 'border-rose-500 text-rose-600 hover:bg-rose-50') + (pop ? ' vote-pop' : '')}>
            {(voted ? '❤️ 想去 · ' : '🤍 想去 · ') + votes.length}
          </button>
          <a href={p.url} target="_blank" rel="noopener"
            className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400">📍 Google 地图 ↗</a>
          {p.lat != null && (
            <a href={directionsLink(p)} target="_blank" rel="noopener"
              className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400">🧭 导航 ↗</a>
          )}
        </div>
      </div>
    </article>
  );
}

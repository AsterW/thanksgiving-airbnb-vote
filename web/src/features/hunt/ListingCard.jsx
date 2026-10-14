import { statsLine } from '../../lib/format.js';
import Carousel from './Carousel.jsx';
import PriceBlock from './PriceBlock.jsx';
import { isBooked } from './price.js';

// 按当前行程的日期和人数打开 Airbnb，直接看到实时总价
const airbnbLink = (l, T) => 'https://www.airbnb.com/rooms/' + l.roomId + '?adults=' + T.people + '&check_in=' + T.checkIn + '&check_out=' + T.checkOut;

export default function ListingCard({ l, T, token, glow, cardRef, onVote, onRemove }) {
  const votes = l.votes || [];
  const voted = votes.some(v => v.token === token);
  const pics = l.images && l.images.length ? l.images : l.image ? [l.image] : [];
  return (
    <article ref={cardRef} data-id={l.id}
      className={'bg-white rounded-2xl shadow overflow-hidden flex flex-col' + (isBooked(l, T) ? ' opacity-60 grayscale-[40%] hover:opacity-100 hover:grayscale-0 transition' : '') + (glow ? ' just-voted' : '')}>
      <div className="relative car-wrap">
        <Carousel pics={pics} />
        {l.area && <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{l.area}</span>}
        <button onClick={() => onRemove(l)} title="删除这个房源" className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-full">✕</button>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold leading-snug mb-1">{l.title || '未命名房源'}</h3>
        <p className="text-sm text-slate-500 mb-2">{statsLine(l)}</p>
        {l.sleeps && l.sleeps < T.people ? <p className="text-sm text-amber-600 mb-2">⚠️ 最多住 {l.sleeps} 人，不够 {T.people} 人</p> : null}
        <div className="mb-1"><PriceBlock l={l} T={T} /></div>
        <div className="mb-2">{l.rating ? <span className="text-sm">⭐ {l.rating}{l.reviews ? '（' + l.reviews + '条评价）' : ''}</span> : null}</div>
        {l.note && <p className="text-sm text-slate-600 mb-2">💡 {l.note}</p>}
        {votes.length
          ? <div className="mb-3">{votes.map(v => <span key={v.token} className="chip">{v.name || '匿名'}</span>)}</div>
          : <div className="mb-3 text-xs text-slate-400">还没有人投票，来当第一个吧</div>}
        <div className="mt-auto flex gap-2">
          <button onClick={e => onVote(l, e.currentTarget)} className={'vote-btn flex-1 border-2 border-rose-500 text-rose-600 font-bold rounded-xl py-2 ' + (voted ? 'voted' : '')}>
            {(voted ? '❤️ 已投 · ' : '🤍 投票 · ') + votes.length}
          </button>
          <a href={airbnbLink(l, T)} target="_blank" rel="noopener" title={'按 ' + T.date + ' · ' + T.people + '人查看实时价格'}
            className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400">去 Airbnb ↗</a>
        </div>
      </div>
    </article>
  );
}

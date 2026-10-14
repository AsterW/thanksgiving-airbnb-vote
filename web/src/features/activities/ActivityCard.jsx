// One activity candidate: banner with its emoji, what/where blurb, who
// voted, a vote toggle and a link out to the venue's own website. When
// the card has a location pin, the place name links to Google Maps and
// the ✎ opens the map picker; without one, the card offers to add it.
export default function ActivityCard({ a, token, banner, onVote, onRemove, onSetPlace }) {
  const votes = a.votes || [];
  const voted = votes.some(v => v.token === token);
  const hasPin = a.lat != null && a.lng != null;
  const gmaps = hasPin ? 'https://www.google.com/maps/search/?api=1&query=' + a.lat + ',' + a.lng : null;
  return (
    <article data-id={a.id} className="bg-white rounded-2xl shadow overflow-hidden flex flex-col">
      <div className="relative h-20 flex items-center justify-center text-4xl" style={{ background: banner }}>
        <span aria-hidden="true">{a.emoji}</span>
        <button onClick={() => onRemove(a)} title="删除这个活动" className="absolute top-2 right-2 bg-black/40 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-full">✕</button>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold leading-snug mb-1">{a.title}</h3>
        <p className="text-xs text-slate-400 mb-2">{a.area} · 推荐来源：{a.source}</p>
        <p className="text-sm text-slate-600 mb-3">{a.blurb}</p>
        <div className="flex items-center gap-2 mb-3">
          {hasPin ? (
            <>
              <a href={gmaps} target="_blank" rel="noopener" title="在 Google 地图打开这个地点"
                className="text-sm text-indigo-600 font-medium hover:underline truncate">📍 {a.place || '地图上的位置'} ↗</a>
              <button onClick={() => onSetPlace(a)} title="换个地点" className="text-xs text-slate-400 hover:text-indigo-600 shrink-0">✎ 改</button>
            </>
          ) : (
            <button onClick={() => onSetPlace(a)} className="text-xs text-slate-400 hover:text-indigo-600 border border-dashed border-slate-300 hover:border-indigo-400 rounded-full px-2.5 py-1">📍 加地点</button>
          )}
        </div>
        {votes.length
          ? <div className="mb-3">{votes.map(v => <span key={v.token} className="chip">{v.name || '匿名'}</span>)}</div>
          : <div className="mb-3 text-xs text-slate-400">还没有人投票，来当第一个吧</div>}
        <div className="mt-auto flex gap-2">
          <button onClick={() => onVote(a)} className={'act-vote-btn flex-1 border-2 border-rose-500 text-rose-600 font-bold rounded-xl py-2 ' + (voted ? 'voted' : '')}>
            {(voted ? '❤️ 已投 · ' : '🤍 投票 · ') + votes.length}
          </button>
          <a href={a.url} target="_blank" rel="noopener" title="打开官方网站"
            className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400">去官网 ↗</a>
        </div>
      </div>
    </article>
  );
}

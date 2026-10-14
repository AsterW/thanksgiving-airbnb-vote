import DdzCard from './DdzCard.jsx';

// 一个座位：名字、地主/农民、剩几张、豆子，以及这一轮说了什么 / 出了什么。
export function Said({ said }) {
  if (!said) return <div className="dz-said" />;
  if (typeof said === 'string') return <div className="dz-said"><span className="dz-bubble">{said}</span></div>;
  return <div className="dz-said">{said.cards.map(c => <DdzCard key={c} card={c} size="sm" />)}</div>;
}

export default function SeatBox({ s, idx, t, timer, compact }) {
  if (!s) return <div className="dz-seat empty">空位</div>;
  const turn = t.turn === idx && (t.phase === 'bidding' || t.phase === 'playing');
  const role = t.landlord < 0 ? null : t.landlord === idx ? '👑 地主' : '农民';
  return (
    <div className={'dz-seat' + (turn ? ' turn' : '') + (s.connected ? '' : ' away') + (compact ? ' compact' : '')}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold truncate">{s.name}{s.me ? '（你）' : ''}</span>
        {role && <span className={'dz-role' + (t.landlord === idx ? ' lord' : '')}>{role}</span>}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs mt-1 text-emerald-50/90">
        <span>🂠 {s.count} 张</span>
        {s.points != null && <span className="tabular-nums">🫘 {s.points.toLocaleString()}</span>}
      </div>
      <div className="text-xs mt-1 min-h-[1rem] text-amber-200">
        {turn ? '思考中' + (timer ? ' · ' + timer : '…') : s.auto ? '托管中' : s.leaving ? '这局后离开' : !s.connected ? '掉线了' : ''}
      </div>
    </div>
  );
}

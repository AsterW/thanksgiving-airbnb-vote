import { useState } from 'react';
import { useSession } from '../../session/SessionContext.jsx';

const CHIPS = [[10, '#64748b'], [25, '#dc2626'], [100, '#0f172a'], [500, '#7c3aed']];

export default function Controls({ t, me, live, send, sit, standUp }) {
  const { name } = useSession();
  const [bet, setBet] = useState(0);
  if (!live) return null;
  if (!me) {
    const full = t.seats.length >= t.rules.seats;
    return <button onClick={sit} className="bj-btn bg-amber-400 text-slate-900" disabled={full}>🪑 {full ? '桌子满了' : name ? '坐下（' + name + '）' : '登录后坐下'}</button>;
  }
  const stand = <button onClick={standUp} className="bj-btn bg-white/15 text-white ml-auto">站起来</button>;
  if (t.phase === 'waiting' || t.phase === 'betting') {
    const cap = Math.min(t.rules.maxBet, me.chips);
    const amount = bet > cap ? 0 : bet;
    return (
      <>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {CHIPS.map(([v, c]) => <button key={v} className="bj-chip" style={{ background: c }} onClick={() => setBet(amount + v)} disabled={amount + v > cap}>{v}</button>)}
          <button onClick={() => setBet(0)} className="text-sm text-emerald-100 underline ml-1">清零</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => send({ type: 'bet', amount })} className="bj-btn bg-amber-400 text-slate-900" disabled={amount < t.rules.minBet}>
            {(me.status === 'bet' ? '改成 ' : '下注 ') + amount}
          </button>
          <span className="text-sm text-emerald-100">{me.status === 'bet' ? '已下注 ' + me.bet + '，等其他人…' : '点筹码凑注，' + t.rules.minBet + '–' + t.rules.maxBet}</span>
          {stand}
        </div>
      </>
    );
  }
  if (t.phase === 'playing' && t.turn === me.key) {
    const canDouble = me.cards.length === 2 && me.chips >= me.bet * 2;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => send({ type: 'hit' })} className="bj-btn bg-amber-400 text-slate-900">要牌 Hit</button>
        <button onClick={() => send({ type: 'stand' })} className="bj-btn bg-white text-emerald-800">停牌 Stand</button>
        <button onClick={() => send({ type: 'double' })} className="bj-btn bg-fuchsia-500 text-white" disabled={!canDouble}>加倍 Double</button>
        {stand}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-emerald-100">{t.phase === 'result' ? '这局结束，马上开下一局' : me.status === 'out' ? '这局你没下注，等下一局' : '等别人…'}</span>
      {stand}
    </div>
  );
}

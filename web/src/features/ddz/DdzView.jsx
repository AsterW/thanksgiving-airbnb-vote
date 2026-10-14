import { useEffect, useState } from 'react';
import { confetti, CONFETTI_COLORS } from '../../lib/confetti.js';
import { reduceMotion } from '../../lib/motion.js';
import { useDdz } from './useDdz.js';
import DdzCard from './DdzCard.jsx';
import SeatBox, { Said } from './SeatBox.jsx';
import Hand from './Hand.jsx';
import DdzBoard from './DdzBoard.jsx';
import './ddz.css';

// 倒计时用服务器给的时间算；只在这页开着、连着的时候走
function useCountdown(st, running) {
  const [, tick] = useState(0);
  const t = st?.table;
  useEffect(() => {
    if (!running || !t?.deadline) return;
    const id = setInterval(() => tick(n => n + 1), 250);
    return () => clearInterval(id);
  }, [running, t?.deadline]);
  if (!t?.deadline) return '';
  return Math.max(0, Math.ceil((t.deadline - t.now - (Date.now() - st.at)) / 1000)) + 's';
}

const PHASE = { waiting: '等人开始', bidding: '叫地主中', playing: '对局中', result: '这局结束' };

export default function DdzView({ active }) {
  const { st, live, msg, hint, setHint, room, watch, send, sit, standUp } = useDdz(active);
  const timer = useCountdown(st, active && live);
  const t = st?.table;
  const me = t ? t.you : -1;
  const mySeat = me >= 0 ? t.seats[me] : null;
  const myCards = mySeat?.cards || [];
  const [sel, setSel] = useState(() => new Set());

  // 出了牌 / 新的一局：清掉选中的牌；提示回来了：选上建议的牌
  const handKey = (t?.round || 0) + ':' + myCards.length;
  useEffect(() => { setSel(new Set()); }, [handKey]);
  useEffect(() => { if (hint) { setSel(new Set(hint)); setHint(null); } }, [hint, setHint]);
  // 自己这边赢了撒点彩带
  const won = t?.phase === 'result' && me >= 0 && t.result?.deltas[me] > 0;
  const round = t?.round;
  useEffect(() => {
    if (won && !reduceMotion) confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
  }, [won, round]);

  // 点一张或者划过一串：每张都翻一下
  const flip = list => setSel(s => { const n = new Set(s); for (const c of list) { if (n.has(c)) n.delete(c); else n.add(c); } return n; });
  const deal = label => <button onClick={() => send({ type: 'start' })} className="dz-btn bg-amber-400 text-slate-900">{label}</button>;
  const bottom = me >= 0 ? me : 0, right = (bottom + 1) % 3, left = (bottom + 2) % 3;
  const myTurn = me >= 0 && t.turn === me;
  const leading = myTurn && t.phase === 'playing' && (t.trickBy === -1 || t.trickBy === me);
  const status = !t ? '连接中…' : !live ? '断线了，重连中…' : '桌 ' + room + ' · ' + PHASE[t.phase];
  const odds = t ? t.multiplier * 2 ** t.bombs : 1;
  const here = st?.lobby?.[room - 1];
  const seatedElsewhere = st?.seatedAt && st.seatedAt !== room;

  function controls() {
    if (!live || !t) return null;
    if (seatedElsewhere) return <button onClick={() => watch(st.seatedAt)} className="dz-btn bg-amber-400 text-slate-900">回到我坐的桌 {st.seatedAt}</button>;
    if (t.waiting) return <>
      {t.phase === 'waiting' ? deal('开始游戏') : <span className="text-sm text-emerald-100">{t.phase === 'result' ? '点「再来一局」就坐下' : '已经排上了，这局打完就坐下'}</span>}
      <button onClick={standUp} className="dz-btn bg-white/15 text-white ml-auto">不等了</button>
    </>;
    if (me < 0) {
      const full = (here?.people.length || 0) >= 3;
      return <button onClick={sit} disabled={full} className="dz-btn bg-amber-400 text-slate-900">{full ? '这桌满了' : '🪑 坐下'}</button>;
    }
    const stand = <button onClick={standUp} className="dz-btn bg-white/15 text-white ml-auto">站起来</button>;
    const auto = mySeat.auto
      ? <button onClick={() => send({ type: 'auto', on: false })} className="dz-btn bg-fuchsia-500 text-white">取消托管</button>
      : t.phase === 'playing' || t.phase === 'bidding' ? <button onClick={() => send({ type: 'auto', on: true })} className="dz-btn bg-white/15 text-white">托管</button> : null;
    if (t.phase === 'waiting') return <>{deal('开始游戏')}<span className="text-sm text-emerald-100">空位由机器人补上</span>{stand}</>;
    if (t.phase === 'result') return stand; // 再来一局 is in the result banner
    if (!myTurn || mySeat.auto) return <><span className="text-sm text-emerald-100">{t.phase === 'bidding' ? '等别人叫地主…' : '等别人出牌…'}</span>{auto}{stand}</>;
    if (t.phase === 'bidding') {
      const call = t.bidStage === 'call';
      return <>
        <button onClick={() => send({ type: 'bid', yes: true })} className="dz-btn bg-amber-400 text-slate-900">{call ? '叫地主' : '抢地主'}</button>
        <button onClick={() => send({ type: 'bid', yes: false })} className="dz-btn bg-white text-emerald-800">{call ? '不叫' : '不抢'}</button>
        <span className="text-sm text-amber-200">{timer}</span>{auto}{stand}
      </>;
    }
    return <>
      <button onClick={() => send({ type: 'pass' })} disabled={leading} className="dz-btn bg-white text-emerald-800">不出</button>
      <button onClick={() => send({ type: 'hint' })} className="dz-btn bg-sky-400 text-slate-900">提示</button>
      <button onClick={() => send({ type: 'play', cards: [...sel] })} disabled={!sel.size} className="dz-btn bg-amber-400 text-slate-900">出牌</button>
      <span className="text-sm text-amber-200">{timer}</span>{auto}{stand}
    </>;
  }

  const result = t?.phase === 'result' && t.result;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {(st?.lobby || [1, 2, 3].map(r => ({ room: r, people: [], bots: 0, phase: 'waiting' }))).map(l => (
          <button key={l.room} onClick={() => watch(l.room)}
            className={'rounded-2xl px-4 py-2 text-left border-2 ' + (l.room === room ? 'bg-white border-indigo-500 shadow' : 'bg-white/70 border-transparent hover:border-indigo-200')}>
            <div className="font-bold text-sm">桌 {l.room}{st?.seatedAt === l.room ? ' · 你在这' : ''}</div>
            <div className="text-xs text-slate-500">{l.people.length ? l.people.join('、') : '空着'}{l.bots ? ' + ' + l.bots + ' 🤖' : ''} · {PHASE[l.phase]}</div>
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 dz-felt rounded-2xl shadow-xl p-3 md:p-5 text-white">
          <div className="flex items-center justify-between gap-3 mb-3 text-sm">
            <span className="font-medium text-emerald-100">{status}</span>
            {t && t.landlord >= 0 && <span className="font-bold text-amber-200">倍数 ×{odds}{t.bombs ? '（炸弹 ' + t.bombs + '）' : ''}</span>}
          </div>
          {t && (
            <>
              <div className="dz-top">
                <div className="dz-side"><SeatBox s={t.seats[left]} idx={left} t={t} timer={timer} compact /><Said said={t.said[left]} /></div>
                <div className="dz-center">
                  <div className="text-[11px] tracking-widest text-emerald-200 mb-1">底牌</div>
                  <div className="flex justify-center gap-1">{(t.bottom.length ? t.bottom : [null, null, null]).map((c, i) => <DdzCard key={i + ':' + c} card={c} size="sm" />)}</div>
                </div>
                <div className="dz-side right"><SeatBox s={t.seats[right]} idx={right} t={t} timer={timer} compact /><Said said={t.said[right]} /></div>
              </div>
              {result && (
                <div className="dz-result">
                  <div className="text-lg font-extrabold">{result.landlordWin ? '👑 地主赢了！' : '🌾 农民赢了！'}{result.spring ? (result.landlordWin ? ' · 春天 ×2' : ' · 反春 ×2') : ''}</div>
                  <div className="text-sm mt-1">倍数 ×{result.factor} · {result.names.map((n, k) => n + ' ' + (result.deltas[k] > 0 ? '+' : '') + result.deltas[k]).join(' · ')}</div>
                  {[left, right].filter(k => t.seats[k]?.cards?.length).map(k => (
                    <div key={k} className="flex items-center justify-center gap-2 mt-2 text-xs">
                      <span className="shrink-0 text-emerald-100">{result.names[k]} 剩</span>
                      <div className="dz-said dz-left">{t.seats[k].cards.map(c => <DdzCard key={c} card={c} size="sm" />)}</div>
                    </div>
                  ))}
                  {live && (me >= 0 || t.waiting) && !seatedElsewhere && <div className="mt-3">{deal('🔁 再来一局')}</div>}
                </div>
              )}
              <div className="mt-2 dz-mine"><Said said={t.said[bottom]} /></div>
              <div className="mt-2"><SeatBox s={t.seats[bottom]} idx={bottom} t={t} timer={timer} /></div>
              <Hand cards={t.seats[bottom]?.cards || Array.from({ length: t.seats[bottom]?.count || 0 }, () => null)}
                sel={sel} onToggle={flip} pickable={me >= 0 && t.phase === 'playing'} />
            </>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-4">{controls()}</div>
          <p className="text-sm mt-2 min-h-[1.25rem] text-amber-200">{msg}</p>
        </section>
        <DdzBoard rows={st?.board || []} />
      </div>
    </div>
  );
}

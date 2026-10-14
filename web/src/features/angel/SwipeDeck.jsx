import { useRef, useState } from 'react';
import { reduceMotion } from '../../lib/motion.js';

// 一叠礼物卡片：往右滑 = 想要 💖，往左滑 = 不要 🙅，下面三个按钮也行（随便 = 跳过）。
// onPick(id, 'love' | 'nope' | null)，全部滑完调用 onDone。
const THRESHOLD = 90;

export default function SwipeDeck({ cards, onPick, onDone }) {
  const [i, setI] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [fly, setFly] = useState(null); // 正在飞走的那张：{ dir }
  const start = useRef(null);

  const card = cards[i];
  function decide(value) {
    if (!card || fly) return;
    const dir = value === 'love' ? 1 : value === 'nope' ? -1 : 0;
    setFly({ dir });
    setTimeout(() => {
      onPick(card.id, value);
      setFly(null); setDrag({ x: 0, y: 0, active: false });
      if (i + 1 >= cards.length) onDone(); else setI(i + 1);
    }, reduceMotion ? 0 : 280);
  }

  const onDown = e => { if (fly) return; start.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0, active: true }); };
  const onMove = e => { if (!start.current) return; setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true }); };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    if (drag.x > THRESHOLD) decide('love');
    else if (drag.x < -THRESHOLD) decide('nope');
    else setDrag({ x: 0, y: 0, active: false });
  };

  if (!card) return null;
  const x = fly ? fly.dir * 600 : drag.x;
  const y = fly ? (fly.dir ? drag.y : -500) : drag.y * 0.3;
  const lean = Math.max(-1, Math.min(1, x / THRESHOLD));
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-slate-500 mb-3">{i + 1} / {cards.length} · 往右滑想要，往左滑不要</div>
      <div className="angel-deck">
        {cards.slice(i + 1, i + 3).reverse().map((c, k, arr) => (
          <div key={c.id} className="angel-card under" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})`, transform: `translateY(${(arr.length - k) * 10}px) scale(${1 - (arr.length - k) * 0.05})` }} />
        ))}
        <div key={card.id} className={'angel-card top' + (drag.active ? '' : ' settle')}
          style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})`, transform: `translate(${x}px, ${y}px) rotate(${x / 18}deg)` }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="angel-stamp love" style={{ opacity: Math.max(0, lean) }}>想要 💖</div>
          <div className="angel-stamp nope" style={{ opacity: Math.max(0, -lean) }}>不要 🙅</div>
          <div className="text-7xl mb-4 select-none">{card.emoji}</div>
          <div className="text-2xl font-black select-none">{card.name}</div>
          <div className="text-sm opacity-90 mt-2 select-none">{card.hint}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-6">
        <button onClick={() => decide('nope')} className="angel-round glass-pill text-2xl" aria-label="不要">🙅</button>
        <button onClick={() => decide(null)} className="angel-round small bg-white text-sm font-bold text-slate-500" aria-label="随便">随便</button>
        <button onClick={() => decide('love')} className="angel-round glass-pill text-2xl" aria-label="想要">💖</button>
      </div>
    </div>
  );
}

import { useLayoutEffect, useRef, useState } from 'react';
import PlayingCard from './PlayingCard.jsx';

// 手牌（斗地主、掼蛋）。点一张，或者按住划过一串：划过的牌高亮，松手时一起翻
// （没选的选上，选了的取消）。鼠标和手指都走 pointer 事件；竖着划还是滚动页面。
// 手机竖着拿时一行放不下就分成几行（每行压在上一行下面，牌角还看得到），牌就不用挤得太窄。
const MIN_STRIP = 0.45; // 一张牌至少露出牌宽的这么多，不然就换行

export default function CardHand({ cards, sel, onToggle, pickable, isWild }) {
  const box = useRef(null);
  const drag = useRef(null);
  const [sweep, setSweep] = useState(null); // [from, to] while dragging
  const [rows, setRows] = useState(1);

  // 量一下能放几张，决定分几行
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const card = el.querySelector('.pc'), W = el.clientWidth;
      if (!card || !W) return;
      const w = card.getBoundingClientRect().width;
      const per = Math.max(1, Math.floor((W - w) / (w * MIN_STRIP)) + 1);
      setRows(Math.max(1, Math.ceil(cards.length / per)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cards.length]);

  // 手指下面是哪张：行是叠着的，取上沿在手指上面的最下一行；同一行里牌也是叠着的，
  // 取左边缘在手指左边的最后一张
  const at = (x, y) => {
    const lines = box.current.querySelectorAll('.pc-row');
    let line = lines[0];
    for (const l of lines) if (l.getBoundingClientRect().top <= y) line = l;
    const els = line.children;
    let i = 0;
    for (let k = 0; k < els.length; k++) if (els[k].getBoundingClientRect().left <= x) i = k;
    return Number(els[i].dataset.i);
  };
  const down = e => {
    if (!pickable || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = e.target.closest('[data-i]');
    if (!el) return;
    e.preventDefault();
    box.current.setPointerCapture(e.pointerId);
    const i = Number(el.dataset.i);
    drag.current = { id: e.pointerId, from: i, to: i };
    setSweep([i, i]);
  };
  const move = e => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const i = at(e.clientX, e.clientY);
    if (i !== d.to) { d.to = i; setSweep([d.from, i]); }
  };
  const up = e => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setSweep(null);
    onToggle(cards.slice(Math.min(d.from, d.to), Math.max(d.from, d.to) + 1));
  };
  const cancel = () => { drag.current = null; setSweep(null); };

  const lo = sweep ? Math.min(...sweep) : -1, hi = sweep ? Math.max(...sweep) : -1;
  const per = Math.ceil(cards.length / rows) || 1;
  const lines = [];
  for (let i = 0; i < cards.length; i += per) lines.push(i);
  return (
    <div ref={box} className={'pc-hand' + (pickable ? ' pickable' : '')}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      {lines.map(start => {
        const row = cards.slice(start, start + per);
        return (
          <div key={start} className="pc-row" style={{ '--n': Math.max(2, row.length) }}>
            {row.map((c, k) => {
              const i = start + k;
              return <PlayingCard key={c || 'b' + i} card={c} data-i={i} selected={c && sel.has(c)} wild={c && isWild?.(c)}
                className={(pickable ? 'pick' : '') + (i >= lo && i <= hi ? ' sweep' : '')} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

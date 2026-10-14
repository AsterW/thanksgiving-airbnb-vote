import { useRef, useState } from 'react';
import DdzCard from './DdzCard.jsx';

// 手牌。点一张，或者按住横着划过一串：划过的牌高亮，松手时一起翻
// （没选的选上，选了的取消）。鼠标和手指都走 pointer 事件；竖着划还是滚动页面。
export default function Hand({ cards, sel, onToggle, pickable }) {
  const box = useRef(null);
  const drag = useRef(null);
  const [sweep, setSweep] = useState(null); // [from, to] while dragging

  // 牌是叠着的，只看横坐标：左边缘在手指左边的最后一张就是手指下面那张
  const at = x => {
    const els = box.current.children;
    let i = 0;
    for (let k = 0; k < els.length; k++) if (els[k].getBoundingClientRect().left <= x) i = k;
    return i;
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
    const i = at(e.clientX);
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
  return (
    <div ref={box} className={'dz-hand' + (pickable ? ' pickable' : '')} style={{ '--n': Math.max(2, cards.length) }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      {cards.map((c, i) => (
        <DdzCard key={c || 'b' + i} card={c} data-i={i} selected={c && sel.has(c)}
          className={(pickable ? 'pick' : '') + (i >= lo && i <= hi ? ' sweep' : '')} />
      ))}
    </div>
  );
}

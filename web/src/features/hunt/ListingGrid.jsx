import { useLayoutEffect, useRef } from 'react';
import { reduceMotion } from '../../lib/motion.js';
import ListingCard from './ListingCard.jsx';

// The card grid. When the order changes, cards glide to their new spots (FLIP).
// If anchorId is set, the page scrolls so that card stays where it was on screen.
export default function ListingGrid({ items, T, token, glowId, anchorId, emptyText, zones, onVote, onRemove, onSetArea, onHover }) {
  const nodes = useRef(new Map());
  const orderKey = items.map(l => l.id).join(',');
  const lastKey = useRef(orderKey);
  const before = useRef(null);

  // Measure where the cards are now, before React moves them (render runs before commit).
  if (orderKey !== lastKey.current && !before.current) {
    before.current = new Map();
    for (const [id, el] of nodes.current) before.current.set(id, el.getBoundingClientRect());
  }

  useLayoutEffect(() => {
    if (orderKey === lastKey.current) return;
    lastKey.current = orderKey;
    const prev = before.current;
    before.current = null;
    if (!prev) return;
    const anchor = anchorId && nodes.current.get(anchorId);
    if (anchor && prev.has(anchorId)) window.scrollBy(0, anchor.getBoundingClientRect().top - prev.get(anchorId).top);
    for (const [id, el] of nodes.current) {
      // A moved card's carousel can lose its scroll position: put it back on the photo it was showing.
      const c = el.querySelector('.carousel');
      if (c && Number(c.dataset.idx)) c.scrollLeft = Number(c.dataset.idx) * c.clientWidth;
      const a = prev.get(id);
      if (!a || reduceMotion) continue;
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }, [orderKey, anchorId]);

  const ref = id => el => { if (el) nodes.current.set(id, el); else nodes.current.delete(id); };

  return (
    <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
      onMouseOver={e => onHover(e.target.closest('article[data-id]')?.dataset.id || null)} onMouseLeave={() => onHover(null)}>
      {items.length
        ? items.map(l => <ListingCard key={l.id} l={l} T={T} token={token} glow={glowId === l.id} cardRef={ref(l.id)} zones={zones} onVote={onVote} onRemove={onRemove} onSetArea={onSetArea} />)
        : <p className="text-slate-400 col-span-full text-center py-10">{emptyText}</p>}
    </section>
  );
}

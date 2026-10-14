import { useRef, useState } from 'react';
import { reduceMotion } from '../../lib/motion.js';

// 封面照片：可以左右滑，下面的小圆点表示第几张。当前是第几张记在 data-idx 上，
// 卡片换位置后 ListingGrid 用它把滚动位置恢复回来。
export default function Carousel({ pics }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  if (!pics.length) return <div className="card-img w-full rounded-t-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-4xl">🏠</div>;
  if (pics.length === 1) return <img src={pics[0]} className="card-img w-full rounded-t-2xl" loading="lazy" alt="" />;
  const go = i => { const c = ref.current; c.scrollTo({ left: i * c.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' }); };
  return (
    <>
      <div ref={ref} className="carousel rounded-t-2xl" data-idx={idx}
        onScroll={e => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {pics.map(u => <img key={u} src={u} className="card-img" loading="lazy" alt="" />)}
      </div>
      <button className="car-arrow left-2" onClick={() => go(idx - 1)} aria-label="上一张" disabled={idx <= 0}>‹</button>
      <button className="car-arrow right-2" onClick={() => go(idx + 1)} aria-label="下一张" disabled={idx >= pics.length - 1}>›</button>
      <div className="car-dots">
        {pics.map((_, i) => <button key={i} className={i === idx ? 'on' : ''} onClick={() => go(i)} aria-label={'第' + (i + 1) + '张'} />)}
      </div>
    </>
  );
}

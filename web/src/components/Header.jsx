import { useLayoutEffect, useRef, useState } from 'react';
import { TRIPS, VIEWS } from '../lib/config.js';
import { reduceMotion } from '../lib/motion.js';
import './header.css';

// 页面标题。按行程分的页面（选房）才显示行程标签页和日期人数；分账、21 点是全员的
export default function Header({ view, trip, onTrip }) {
  const V = VIEWS[view], T = TRIPS[trip];
  const navRef = useRef(null);
  const [lens, setLens] = useState(null); // 行程分段控件里那片滑动的玻璃透镜 {x, w}
  const [lensReady, setLensReady] = useState(false); // 量好位置之后才允许滑动，免得进页面先飘一下

  // 透镜跟随选中项：量出当前按钮的位置/宽度，剩下的交给 CSS 弹簧过渡
  useLayoutEffect(() => {
    if (!V.tripScoped) return;
    const measure = () => {
      const nav = navRef.current, btn = nav?.querySelector('[data-trip="' + trip + '"]');
      if (!nav || !btn) return;
      setLens({ x: btn.offsetLeft, w: btn.offsetWidth });
      setLensReady(true);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [trip, view, V.tripScoped]);

  return (
    <header className="app-header px-6 py-7 md:py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold">{V.title}</h1>
        <p className="mt-2 text-slate-600">{(V.tripScoped ? T.date + ' · ' + T.people + '人 · 住' + T.nights + '晚 · ' : '') + V.sub}</p>
        {V.tripScoped && (
          <nav ref={navRef} className="trip-nav mt-5" aria-label="行程">
            {lens && <span className={'trip-lens' + (lensReady && !reduceMotion ? ' gliding' : '')} style={{ transform: 'translateX(' + lens.x + 'px)', width: lens.w }} aria-hidden="true" />}
            {Object.entries(TRIPS).map(([k, t]) => (
              <button key={k} data-trip={k} className={'trip-tab rounded-full px-5 py-2 font-bold' + (k === trip ? ' active' : '')} aria-current={k === trip ? 'true' : undefined} onClick={() => onTrip(k)}>
                {t.date} <span className="font-normal text-sm opacity-80">· {t.people}人 · {t.nights}晚</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

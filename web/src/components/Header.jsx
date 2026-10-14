import { TRIPS, VIEWS } from '../lib/config.js';
import './header.css';

// 页面标题。按行程分的页面（选房）才显示行程标签页和日期人数；分账、21 点是全员的
export default function Header({ view, trip, onTrip }) {
  const V = VIEWS[view], T = TRIPS[trip];
  return (
    <header className="app-header px-6 py-7 md:py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold">{V.title}</h1>
        <p className="mt-2 text-slate-600">{(V.tripScoped ? T.date + ' · ' + T.people + '人 · 住' + T.nights + '晚 · ' : '') + V.sub}</p>
        {V.tripScoped && (
          <nav className="mt-5 flex flex-wrap gap-2">
            {Object.entries(TRIPS).map(([k, t]) => (
              <button key={k} className={'trip-tab rounded-full px-5 py-2 font-bold' + (k === trip ? ' active' : '')} onClick={() => onTrip(k)}>
                {t.date} <span className="font-normal text-sm opacity-80">· {t.people}人 · {t.nights}晚</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

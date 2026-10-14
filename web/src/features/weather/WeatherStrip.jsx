import { useEffect, useState } from 'react';
import { load as loadPref, save as savePref } from '../../lib/storage.js';
import { KINDS, placeWeather } from './weather.js';
import './weather.css';

const WEEK = '日一二三四五六';
const fmtTemp = (c, unit) => Math.round(unit === 'F' ? c * 9 / 5 + 32 : c) + '°';

// 选中区域那几天的天气：一行，每天一个天气 emoji（放在地图正上方）
export default function WeatherStrip({ trip, name, lat, lng }) {
  const [days, setDays] = useState(null);
  const [failed, setFailed] = useState(false);
  const [unit, setUnit] = useState(() => loadPref('tempUnit', 'C'));

  useEffect(() => {
    let live = true;
    setDays(null); setFailed(false);
    placeWeather(trip, lat, lng).then(d => { if (live) setDays(d); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [trip, lat, lng]);

  const toggle = () => { const u = unit === 'C' ? 'F' : 'C'; setUnit(u); savePref('tempUnit', u); };
  const anyHistory = days?.some(w => w.source === 'history');
  return (
    <section className="wx-bar">
      <div className="text-sm font-bold text-slate-700 shrink-0">🌤️ {name} 天气</div>
      {failed || (days && days.every(w => !w.kind)) ? <span className="text-xs text-slate-400">暂时查不到</span>
        : !days ? <span className="text-xs text-slate-400">加载中…</span>
        : (
          <div className="wx-days" style={{ '--n': days.length }}>
            {days.map(w => {
              const k = w.kind && KINDS[w.kind];
              const d = new Date(w.date + 'T12:00:00Z');
              const tip = !k ? '没有数据' : w.source === 'forecast' ? k.label + ' · 天气预报'
                : '往年同期：' + k.label + (w.snowYears ? ' · 过去 ' + w.years + ' 年里有 ' + w.snowYears + ' 年这天下雪' : '');
              return (
                <div key={w.date} className={'wx-day' + (w.source === 'history' ? ' history' : '')} title={tip}>
                  <span className="text-[11px] text-slate-500">{(d.getUTCMonth() + 1) + '/' + d.getUTCDate()} 周{WEEK[d.getUTCDay()]}</span>
                  <span className="text-xl leading-none my-0.5">{k ? k.emoji : '—'}</span>
                  {k && <span className="text-[11px] tabular-nums text-slate-600">{fmtTemp(w.lo, unit)} / {fmtTemp(w.hi, unit)}</span>}
                </div>
              );
            })}
          </div>
        )}
      <div className="text-[11px] text-slate-400 md:ml-auto md:text-right leading-snug">
        {anyHistory && <span title="离出发 16 天内会自动换成天气预报">虚线 = 往年同期 · </span>}
        <button onClick={toggle} className="underline hover:text-slate-600">{unit === 'C' ? '°F' : '°C'}</button>
        {' · '}<a href="https://open-meteo.com/" target="_blank" rel="noopener" className="underline hover:text-slate-600">Open-Meteo</a>
      </div>
    </section>
  );
}

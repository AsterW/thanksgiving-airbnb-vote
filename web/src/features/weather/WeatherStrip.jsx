import { useEffect, useState } from 'react';
import { load as loadPref, save as savePref } from '../../lib/storage.js';
import { KINDS, tripWeather } from './weather.js';
import './weather.css';

const WEEK = '日一二三四五六';
const fmtTemp = (c, unit) => Math.round(unit === 'F' ? c * 9 / 5 + 32 : c) + '°';

// 行程标签页下面的天气：每个地点一行，每天一个天气 emoji
export default function WeatherStrip({ trip }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [unit, setUnit] = useState(() => loadPref('tempUnit', 'C'));

  useEffect(() => {
    let live = true;
    setRows(null); setFailed(false);
    tripWeather(trip).then(r => { if (live) setRows(r.map(x => ({ place: x.place, ws: x.days }))); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [trip]);

  if (failed || (rows && rows.every(r => r.ws.every(w => !w.kind)))) return <p className="mt-4 text-xs text-indigo-100/80">天气暂时查不到</p>;
  if (!rows) return <p className="mt-4 text-xs text-indigo-100/80">天气加载中…</p>;
  const anyHistory = rows.some(r => r.ws.some(w => w.source === 'history'));
  const toggle = () => { const u = unit === 'C' ? 'F' : 'C'; setUnit(u); savePref('tempUnit', u); };

  return (
    <div className="mt-4">
      <div className="space-y-2">
        {rows.map(({ place, ws }) => (
          <div key={place} className="md:flex md:items-center md:gap-2">
            {rows.length > 1 && <div className="text-xs font-bold text-indigo-100 mb-1 md:mb-0 md:w-16 md:shrink-0">{place}</div>}
            {/* 手机上每天平分一行的宽度，桌面上固定宽度排一排 */}
            <div className="wx-days" style={{ '--n': ws.length }}>
            {ws.map(w => {
              const k = w.kind && KINDS[w.kind];
              const d = new Date(w.date + 'T12:00:00Z');
              const tip = !k ? '没有数据' : w.source === 'forecast' ? k.label + ' · 天气预报'
                : '往年同期：' + k.label + (w.snowYears ? ' · 过去 ' + w.years + ' 年里有 ' + w.snowYears + ' 年这天下雪' : '');
              return (
                <div key={w.date} className={'wx-day' + (w.source === 'history' ? ' history' : '')} title={tip}>
                  <span className="text-[11px] opacity-80">{(d.getUTCMonth() + 1) + '/' + d.getUTCDate()} 周{WEEK[d.getUTCDay()]}</span>
                  <span className="text-2xl leading-none my-0.5">{k ? k.emoji : '—'}</span>
                  {k && <span className="text-[11px] tabular-nums">{fmtTemp(w.lo, unit)} / {fmtTemp(w.hi, unit)}</span>}
                </div>
              );
            })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-indigo-100/80">
        {anyHistory ? '虚线框是往年同期（过去 5 年这几天的天气），离出发 16 天内会自动换成天气预报 · ' : '天气预报 · '}
        <button onClick={toggle} className="underline">{unit === 'C' ? '换成 °F' : '换成 °C'}</button>
        {' · '}<a href="https://open-meteo.com/" target="_blank" rel="noopener" className="underline">Open-Meteo</a>
      </p>
    </div>
  );
}

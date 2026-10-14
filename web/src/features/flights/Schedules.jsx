import { useSession } from '../../session/SessionContext.jsx';
import { CURB_MIN, AIRPORT_EARLY_MIN, duration, localTime } from './plan.js';

const leg = (f, tz, field) => localTime(f[field], tz, false);

// 🛬 接机提醒：每一趟去哪个机场、几点到、接谁；可以认领「我来接」
export function Pickups({ runs, onClaim }) {
  const { name } = useSession();
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-bold text-lg">🛬 接机提醒</h2>
      <p className="text-xs text-slate-500 mb-3">建议时间 = 落地后到路边（国内约 {CURB_MIN.domestic} 分钟拿行李，国际约 {CURB_MIN.international} 分钟过海关）；同一机场一小时内陆续到的人合成一趟</p>
      {!runs.length && <p className="text-sm text-slate-400">还没有人填到达航班</p>}
      <div className="space-y-3">
        {runs.map(r => {
          const drivers = [...new Set(r.items.map(i => i.pickupBy).filter(Boolean))];
          const mine = drivers.includes(name);
          return (
            <div key={r.airport.iata + r.first} className={'rounded-xl border-l-4 p-3 ' + (drivers.length ? 'border-emerald-500 bg-emerald-50/50' : 'border-amber-400 bg-amber-50/60')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-lg tabular-nums">{localTime(r.pickupAt, r.airport.tz)}</span>
                <span className="text-sm">到 <b>{r.airport.iata}</b> {r.airport.city} 接 {r.items.length} 人</span>
                <span className="ml-auto text-sm">{drivers.length ? '🚗 ' + drivers.join('、') : '⚠️ 还没人认领'}</span>
                {name && <button onClick={() => onClaim(r.items.map(i => i.name), !mine)} className={'text-sm font-bold rounded-full px-3 py-1 ' + (mine ? 'bg-white border text-slate-600' : 'bg-emerald-600 text-white')}>{mine ? '取消认领' : '我来接'}</button>}
              </div>
              <ul className="mt-2 text-sm space-y-1">
                {r.items.map(i => (
                  <li key={i.name} className="flex flex-wrap gap-x-2">
                    <b>{i.name}</b>
                    <span className="text-slate-600">{i.f.flight} · {i.f.from.iata} {localTime(i.f.depUtc, i.f.from.tz)} 起飞 → {leg(i.f, r.airport.tz, 'arrUtc')} 落地</span>
                    <span className="text-slate-400">飞 {duration(i.f.minutes)}{i.f.international ? ' · 国际' : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 🛫 送机：每个人最晚几点到机场，时间相近的可以拼车
export function Departures({ runs }) {
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-bold text-lg">🛫 离开：建议到机场时间</h2>
      <p className="text-xs text-slate-500 mb-3">国内航班起飞前 {AIRPORT_EARLY_MIN.domestic / 60} 小时到机场，国际 {AIRPORT_EARLY_MIN.international / 60} 小时（DEN 安检常常排长队）；时间接近的放在一组，可以拼一辆车。从住的地方出发还要加上开车时间</p>
      {!runs.length && <p className="text-sm text-slate-400">还没有人填离开航班</p>}
      <div className="space-y-3">
        {runs.map(r => (
          <div key={r.airport.iata + r.first} className="rounded-xl border-l-4 border-indigo-400 bg-indigo-50/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-lg tabular-nums">{localTime(r.arriveBy, r.airport.tz)}</span>
              <span className="text-sm">前到 <b>{r.airport.iata}</b> {r.airport.city}{r.items.length > 1 ? ' · 🚗 ' + r.items.length + ' 人可以拼车' : ''}</span>
            </div>
            <ul className="mt-2 text-sm space-y-1">
              {r.items.map(i => (
                <li key={i.name} className="flex flex-wrap gap-x-2">
                  <b>{i.name}</b>
                  <span className="text-slate-600">{i.f.flight} {leg(i.f, r.airport.tz, 'depUtc')} 起飞 → {i.f.to.iata} {i.f.to.city} {leg(i.f, i.f.to.tz, 'arrUtc')}</span>
                  <span className="text-slate-400">最晚 {localTime(i.t, r.airport.tz, false)} 到 · 飞 {duration(i.f.minutes)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

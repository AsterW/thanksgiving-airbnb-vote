import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import AirportInput from './AirportInput.jsx';

const HOME = 'DEN'; // 默认飞到 / 飞离丹佛
const blank = kind => ({ flight: '', date: kind === 'arrival' ? '2026-11-25' : '2026-11-29', from: kind === 'arrival' ? '' : HOME, to: kind === 'arrival' ? HOME : '', dep: '', arr: '' });
const toForm = (f, kind) => (f ? { flight: f.flight, date: f.date, from: f.from.iata, to: f.to.iata, dep: f.dep, arr: f.arr } : blank(kind));
const filled = f => !!f.flight.trim(); // 没填航班号的那一段不存
const lookup = f => 'https://www.google.com/search?q=' + encodeURIComponent(f.flight + ' ' + f.date + ' flight');

function Leg({ title, kind, f, set }) {
  const field = k => ({ value: f[k], onChange: e => set({ ...f, [k]: k === 'flight' ? e.target.value.toUpperCase() : e.target.value }) });
  const input = 'w-full border rounded-lg px-3 py-2';
  return (
    <div className="rounded-2xl border-2 border-slate-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">{title}</h3>
        {f.flight && f.date && <a href={lookup(f)} target="_blank" rel="noopener" className="text-xs text-indigo-600 underline">查航班时间 ↗</a>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-xs text-slate-500">航班号</span><input className={input + ' uppercase'} placeholder="UA1234" maxLength={8} {...field('flight')} /></label>
        <label className="block"><span className="text-xs text-slate-500">起飞日期（当地）</span><input type="date" className={input} {...field('date')} /></label>
        <AirportInput label="出发机场" value={f.from} onChange={v => set({ ...f, from: v })} />
        <AirportInput label="到达机场" value={f.to} onChange={v => set({ ...f, to: v })} />
        <label className="block"><span className="text-xs text-slate-500">起飞时间（出发地时间）</span><input type="time" className={input} {...field('dep')} /></label>
        <label className="block"><span className="text-xs text-slate-500">到达时间（到达地时间）</span><input type="time" className={input} {...field('arr')} /></label>
      </div>
    </div>
  );
}

// 填航班：默认填自己的，也可以帮没用这个网站的朋友填
export default function FlightForm({ people, onSaved }) {
  const { name, token, users, openLogin } = useSession();
  const [who, setWho] = useState(name);
  const [arrival, setArrival] = useState(blank('arrival'));
  const [departure, setDeparture] = useState(blank('departure'));
  const [noFlight, setNoFlight] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: false });

  useEffect(() => { if (name && !who) setWho(name); }, [name, who]);
  const mine = people.find(p => p.name === who);
  useEffect(() => { // 切换填谁 / 数据回来时，把已存的航班载入表单
    setArrival(toForm(mine?.arrival, 'arrival')); setDeparture(toForm(mine?.departure, 'departure')); setNoFlight(!!mine?.noFlight); setMsg({ text: '', ok: false });
  }, [who, mine?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!name) return (
    <section className="bg-white rounded-2xl shadow p-6 text-center">
      <p className="text-slate-600 mb-3">登录后填你的航班</p>
      <button onClick={() => openLogin()} className="bg-indigo-600 text-white font-bold rounded-xl px-6 py-2">登录</button>
    </section>
  );

  async function save() {
    const legOrNull = f => (filled(f) ? f : null);
    const r = await api('/api/flights', 'POST', { name, token, for: who, noFlight, arrival: noFlight ? null : legOrNull(arrival), departure: noFlight ? null : legOrNull(departure) });
    if (r.ok) { setMsg({ text: '保存好了 ✈️', ok: true }); onSaved(r); } else setMsg({ text: r.error || '保存失败', ok: false });
  }

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-bold text-lg">🧳 填航班</h2>
        <select value={who} onChange={e => setWho(e.target.value)} className="border rounded-full px-3 py-1 text-sm">
          {users.map(u => <option key={u.name} value={u.name}>{u.name === name ? u.name + '（我）' : '帮 ' + u.name + ' 填'}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={noFlight} onChange={e => setNoFlight(e.target.checked)} /> 不坐飞机（开车来 / 本来就在当地）</label>
      </div>
      {!noFlight && (
        <div className="grid md:grid-cols-2 gap-4">
          <Leg title="🛬 到达航班" kind="arrival" f={arrival} set={setArrival} />
          <Leg title="🛫 离开航班" kind="departure" f={departure} set={setDeparture} />
        </div>
      )}
      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-2">保存</button>
        <span className={'text-sm ' + (msg.ok ? 'text-emerald-600' : 'text-rose-600')}>{msg.text}</span>
        <span className="text-xs text-slate-400 ml-auto">时间都填机场当地时间（登机牌上的时间），跨时区和红眼航班会自动算</span>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import FlightForm from './FlightForm.jsx';
import FlightMap from './FlightMap.jsx';
import { Departures, Pickups } from './Schedules.jsx';
import { departureRuns, pickupRuns, reminderText } from './plan.js';
import './flights.css';

// ✈️ 航班：每人填到达和离开航班 → 航线地图（到达 / 离开分开看）、接机提醒、建议到机场时间
export default function FlightsView({ active }) {
  const { name, token } = useSession();
  const toast = useToast();
  const [people, setPeople] = useState([]);
  const [mode, setMode] = useState('arrival');
  const [manualCopy, setManualCopy] = useState(''); // 浏览器不让写剪贴板时，把文字摆出来让人自己复制

  const load = useCallback(async () => {
    try { const r = await api('/api/flights'); if (r.ok) setPeople(r.people); } catch (e) {}
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);

  const travelers = people.filter(p => !p.noFlight);
  const pickups = useMemo(() => pickupRuns(travelers), [travelers]);
  const departures = useMemo(() => departureRuns(travelers), [travelers]);
  const missing = travelers.filter(p => !p.arrival || !p.departure);
  const legs = travelers.filter(p => (mode === 'arrival' ? p.arrival : p.departure)).length;

  async function claim(who, on) {
    const r = await api('/api/flights/pickup', 'POST', { name, token, who, claim: on });
    if (r.ok) setPeople(r.people);
  }
  async function copy() {
    const text = reminderText(pickups, departures);
    try { await navigator.clipboard.writeText(text); setManualCopy(''); toast('接送机安排复制好了，贴到群里吧 📋'); }
    catch (e) { setManualCopy(text); }
  }

  return (
    <div className="space-y-5">
      <FlightForm people={people} onSaved={r => setPeople(r.people)} />

      <section className="glass-card rounded-2xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <h2 className="font-bold text-lg mr-2">🗺️ 大家的航线</h2>
          {[['arrival', '🛬 到达'], ['departure', '🛫 离开']].map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)} className={'filter-chip glass-pill rounded-full px-4 py-1.5 text-sm' + (mode === k ? ' active' : '')}>{label}</button>
          ))}
          <span className="text-sm text-slate-500">{legs} 人 · 鼠标放在航线上看航班和时间</span>
          {(pickups.length > 0 || departures.length > 0) && <button onClick={copy} className="ml-auto text-sm border-2 border-slate-200 hover:border-indigo-400 rounded-full px-4 py-1.5">📋 复制接送机安排</button>}
        </div>
        {manualCopy && (
          <div className="px-4 pb-4">
            <p className="text-xs text-slate-500 mb-1">浏览器没让自动复制，文字在这里（已经全选，长按或 Ctrl+C 复制）：</p>
            <textarea readOnly value={manualCopy} rows={Math.min(12, manualCopy.split('\n').length)} ref={el => el && el.select()}
              className="w-full border rounded-xl p-3 text-sm font-mono bg-slate-50" onBlur={() => setManualCopy('')} />
          </div>
        )}
        <div className="map-box"><FlightMap people={travelers} mode={mode} /></div>
      </section>

      {missing.length > 0 && (
        <section className="glass-warn rounded-2xl p-4 text-sm">
          <b>还没填全（{missing.length}）：</b>
          {missing.map(p => <span key={p.name} className="chip">{p.name}{!p.arrival && !p.departure ? '' : !p.arrival ? ' · 缺到达' : ' · 缺离开'}</span>)}
          <span className="text-slate-500 ml-1">不坐飞机的人在上面勾「不坐飞机」就不会出现在这里</span>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Pickups runs={pickups} onClaim={claim} />
        <Departures runs={departures} />
      </div>
    </div>
  );
}

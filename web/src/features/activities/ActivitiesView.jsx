import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { celebrateVote } from '../../lib/celebrate.js';
import { reduceMotion } from '../../lib/motion.js';
import ActivityCard from './ActivityCard.jsx';
import AddActivityForm from './AddActivityForm.jsx';
import ActivitiesMap from './ActivitiesMap.jsx';
import LocationPicker from './LocationPicker.jsx';
import { AREA_ORDER } from './areas.js';
import './activities.css';

// Banner gradient per area, so the three bases read as three colours.
const BANNERS = {
  'Denver 市区': 'linear-gradient(135deg,#f59e0b,#ef4444)',
  'Denver 周边': 'linear-gradient(135deg,#0ea5e9,#6366f1)',
  '落基山 · Estes Park': 'linear-gradient(135deg,#059669,#0d9488)',
  'Colorado Springs · 南下顺路': 'linear-gradient(135deg,#db2777,#f59e0b)',
  '大沙丘区域': 'linear-gradient(135deg,#d97706,#92400e)',
};
const bannerOf = area => BANNERS[area] || 'linear-gradient(135deg,#64748b,#334155)';

// Most votes first; ties keep the curated seed order.
const byVotes = (a, b) => (b.votes || []).length - (a.votes || []).length;

export default function ActivitiesView({ active }) {
  const { token, ensureName } = useSession();
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [area, setArea] = useState('all');
  const [mapOpen, setMapOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);
  const [popId, setPopId] = useState(null);
  const popTimer = useRef(null);

  const load = useCallback(async () => {
    try { const r = await api('/api/activities'); if (r.ok) setActivities(r.activities || []); } catch (e) {}
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]); // 每次进来拿最新票数，别人可能刚投了

  const areas = useMemo(() => {
    const present = AREA_ORDER.filter(x => activities.some(a => a.area === x));
    activities.forEach(a => { if (!present.includes(a.area)) present.push(a.area); });
    return present;
  }, [activities]);

  const groups = useMemo(() => areas
    .filter(x => area === 'all' || x === area)
    .map(x => ({ area: x, items: activities.filter(a => a.area === x).sort(byVotes) }))
    .filter(g => g.items.length), [activities, areas, area]);

  // 地图和下面列表看同一批活动：选了某个区域组，地图就只钉那一组并重新取景
  //（之前地图永远收到全量活动，和分组筛选脱节）
  const mapItems = useMemo(() => groups.flatMap(g => g.items), [groups]);

  // 和 Airbnb 房源投票完全一致：成功投出 → 🎉 toast + 按钮弹跳 + 彩带庆祝；
  // 取消投票安安静静，不庆祝。
  async function vote(a, btn) {
    if ((a.votes || []).some(v => v.token === token)) {
      const r = await api('/api/activity-vote', 'POST', { id: a.id, token, name: null });
      if (r.ok) setActivities(prev => prev.map(x => x.id === a.id ? { ...x, votes: r.votes } : x));
      return;
    }
    ensureName(async me => {
      const r = await api('/api/activity-vote', 'POST', { id: a.id, token: me.token, name: me.name });
      if (!r.ok) return;
      setActivities(prev => prev.map(x => x.id === a.id ? { ...x, votes: r.votes } : x));
      toast('🎉 投票成功！给「' + a.title + '」+1');
      if (!reduceMotion) {
        setPopId(a.id);
        clearTimeout(popTimer.current);
        popTimer.current = setTimeout(() => setPopId(null), 450);
      }
      celebrateVote(btn);
    });
  }

  async function remove(a) {
    if (!confirm('确定要删除「' + a.title + '」吗？删掉后大家就看不到了。')) return;
    const r = await api('/api/activity-remove', 'POST', { id: a.id });
    if (r.ok) setActivities(prev => prev.filter(x => x.id !== a.id));
    else alert('删除失败，稍后再试');
  }

  async function savePlace(place) {
    const a = pickerFor;
    setPickerFor(null);
    if (!a) return;
    const r = await api('/api/activity-place', 'POST', { id: a.id, place });
    if (r.ok) {
      setActivities(prev => prev.map(x => x.id === a.id ? r.activity : x));
      toast(place ? '📍 地点已保存' : '📍 地点已清除');
    } else alert('地点保存失败，稍后再试');
  }

  function focusCard(id) {
    setArea('all');
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-id="' + id + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return (
    <div>
      <AddActivityForm onAdded={act => { setActivities(prev => [...prev, act]); setArea('all'); }} />
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setArea('all')}
          className={'px-3 py-1.5 rounded-full text-sm font-medium border ' + (area === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'glass-pill text-slate-600')}>
          全部 · {activities.length}
        </button>
        {areas.map(x => (
          <button key={x} onClick={() => setArea(x)}
            className={'px-3 py-1.5 rounded-full text-sm font-medium border ' + (area === x ? 'bg-indigo-600 text-white border-indigo-600' : 'glass-pill text-slate-600')}>
            {x} · {activities.filter(a => a.area === x).length}
          </button>
        ))}
        <button onClick={() => setMapOpen(o => !o)}
          className={'px-3 py-1.5 rounded-full text-sm font-medium border ' + (mapOpen ? 'bg-emerald-600 text-white border-emerald-600' : 'glass-pill text-slate-600')}>
          🗺️ 活动地图
        </button>
      </div>
      {mapOpen && <ActivitiesMap items={mapItems} token={token} visible={mapOpen} onFocus={focusCard} />}
      {groups.map(g => (
        <section key={g.area} className="mb-8">
          <h2 className="font-bold text-lg mb-3">{g.area}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(a => <ActivityCard key={a.id} a={a} token={token} banner={bannerOf(a.area)} pop={popId === a.id} onVote={vote} onRemove={remove} onSetPlace={setPickerFor} />)}
          </div>
        </section>
      ))}
      {!activities.length && <p className="text-slate-400 text-sm">活动加载中…</p>}
      {pickerFor && <LocationPicker initial={pickerFor} onSave={savePlace} onClose={() => setPickerFor(null)} />}
    </div>
  );
}

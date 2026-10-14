import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import ActivityCard from './ActivityCard.jsx';
import AddActivityForm from './AddActivityForm.jsx';
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

  async function vote(a) {
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
    });
  }

  async function remove(a) {
    if (!confirm('确定要删除「' + a.title + '」吗？删掉后大家就看不到了。')) return;
    const r = await api('/api/activity-remove', 'POST', { id: a.id });
    if (r.ok) setActivities(prev => prev.filter(x => x.id !== a.id));
    else alert('删除失败，稍后再试');
  }

  return (
    <div>
      <AddActivityForm onAdded={act => { setActivities(prev => [...prev, act]); setArea('all'); }} />
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setArea('all')}
          className={'px-3 py-1.5 rounded-full text-sm font-medium border ' + (area === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200')}>
          全部 · {activities.length}
        </button>
        {areas.map(x => (
          <button key={x} onClick={() => setArea(x)}
            className={'px-3 py-1.5 rounded-full text-sm font-medium border ' + (area === x ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200')}>
            {x} · {activities.filter(a => a.area === x).length}
          </button>
        ))}
      </div>
      {groups.map(g => (
        <section key={g.area} className="mb-8">
          <h2 className="font-bold text-lg mb-3">{g.area}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(a => <ActivityCard key={a.id} a={a} token={token} banner={bannerOf(a.area)} onVote={vote} onRemove={remove} />)}
          </div>
        </section>
      ))}
      {!activities.length && <p className="text-slate-400 text-sm">活动加载中…</p>}
    </div>
  );
}

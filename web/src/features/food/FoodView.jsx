import { useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { load, save } from '../../lib/storage.js';
import { reduceMotion } from '../../lib/motion.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { celebrateVote } from '../../lib/celebrate.js';
import AddPlaceForm from './AddPlaceForm.jsx';
import PlaceCard from './PlaceCard.jsx';
import FoodMap from './FoodMap.jsx';
import { useFood } from './useFood.js';
import './food.css';

// Restaurant hunting：每段行程一份餐厅清单。贴 Google 地图链接加店，大家点“想去”，
// 每家都能一键在 Google 地图打开、导航过去。
export default function FoodView({ trip, active }) {
  const { token, ensureName } = useSession();
  const toast = useToast();
  const { places, setPlaces, patch, tripRef } = useFood(trip, active);
  const [sortBy, setSortBy] = useState('votes');
  const [showMap, setShowMap] = useState(() => load('showFoodMap') !== '0');
  const [hotId, setHotId] = useState(null);
  const [popId, setPopId] = useState(null);
  const popTimer = useRef(null);
  const grid = useRef(null);

  const list = useMemo(() => {
    const ps = (places || []).slice();
    const newest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
    return sortBy === 'votes' ? ps.sort((a, b) => (b.votes || []).length - (a.votes || []).length || newest(a, b)) : ps.sort(newest);
  }, [places, sortBy]);

  // 和 Airbnb 房源投票完全一致：成功投出 → 🎉 toast + 按钮弹跳 + 彩带庆祝；
  // 取消投票安安静静，不庆祝。
  async function vote(p, btn) {
    const t = trip;
    const mine = (p.votes || []).some(v => v.token === token);
    const send = async me => {
      let r;
      try { r = await api('/api/food/vote', 'POST', { trip: t, id: p.id, token: me.token, name: mine ? null : me.name }); } catch (e) { return; }
      if (t !== tripRef.current) return; // 等待期间切了行程
      if (!r.ok) { alert(r.error || '没投上，稍后再试'); return; }
      patch(p.id, x => ({ ...x, votes: r.votes }));
      if (mine) return;
      toast('🎉 投票成功！给「' + p.name + '」+1');
      if (!reduceMotion) {
        setPopId(p.id);
        clearTimeout(popTimer.current);
        popTimer.current = setTimeout(() => setPopId(null), 450);
      }
      celebrateVote(btn);
    };
    if (mine) send({ token }); else ensureName(send);
  }

  async function remove(p) {
    if (!confirm('确定要删除「' + p.name + '」吗？')) return;
    const t = trip;
    let r;
    try { r = await api('/api/food/remove', 'POST', { trip: t, id: p.id }); } catch (e) { r = { ok: false }; }
    if (t !== tripRef.current) return;
    if (r.ok) setPlaces(r.places); else alert(r.error || '删除失败，稍后再试');
  }

  function focusCard(id) {
    const el = grid.current?.querySelector('article[data-id="' + CSS.escape(id) + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('food-flash'); void el.offsetWidth; el.classList.add('food-flash');
  }

  const fitKey = trip + '|' + list.map(p => p.id).sort().join(',');
  return (
    <>
      <AddPlaceForm trip={trip} onAdded={r => { if (tripRef.current === trip) setPlaces(r.places); }} />
      <section className="flex flex-wrap items-center gap-2 mb-4">
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="glass-pill rounded-full px-4 py-1.5 text-sm">
          <option value="votes">按想去的人数</option>
          <option value="added">按添加时间（最新在前）</option>
        </select>
        <button onClick={() => { save('showFoodMap', showMap ? '0' : '1'); setShowMap(!showMap); }}
          className="glass-pill rounded-full px-4 py-1.5 text-sm hover:brightness-110">{showMap ? '🗺️ 隐藏地图' : '🗺️ 显示地图'}</button>
        <span className="text-sm text-slate-500 ml-auto">{places && places.length ? '共 ' + places.length + ' 家' : ''}</span>
      </section>
      {showMap && <FoodMap items={list} token={token} fitKey={fitKey} visible={active} hotId={hotId} onFocus={focusCard} />}
      <div ref={grid} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        onMouseOver={e => setHotId(e.target.closest('article[data-id]')?.dataset.id || null)} onMouseLeave={() => setHotId(null)}>
        {places === null
          ? <p className="text-slate-400 col-span-full text-center py-10">加载中…</p>
          : list.length
            ? list.map(p => <PlaceCard key={p.id} p={p} token={token} pop={popId === p.id} onVote={vote} onRemove={remove} />)
            : <p className="text-slate-400 col-span-full text-center py-10">还没有餐厅，贴个 Google 地图链接进来吧 👆</p>}
      </div>
    </>
  );
}

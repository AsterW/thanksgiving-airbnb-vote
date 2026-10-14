import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { TRIPS } from '../../lib/config.js';
import { load, save } from '../../lib/storage.js';
import { reduceMotion } from '../../lib/motion.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import AddListingForm from './AddListingForm.jsx';
import Toolbar from './Toolbar.jsx';
import ListingMap from './ListingMap.jsx';
import ListingGrid from './ListingGrid.jsx';
import { celebrateVote } from './celebrate.js';
import { sortListings } from './price.js';
import { inZone, NO_AREA, zoneTabs } from './zones.js';
import { useListings } from './useListings.js';
import './hunt.css';

const REORDER_DELAY = 700; // 投票后先在原位更新，过一会儿再按新票数重排

export default function HuntView({ trip, active }) {
  const T = TRIPS[trip];
  const { token, ensureName } = useSession();
  const toast = useToast();
  const { listings, refresh, patch } = useListings(trip, token);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('votes');
  const [showMap, setShowMap] = useState(() => load('showMap') !== '0');
  const [hotId, setHotId] = useState(null);
  const [frozen, setFrozen] = useState(null); // 投票后暂时保持的顺序
  const [anchorId, setAnchorId] = useState(null);
  const [glowId, setGlowId] = useState(null);
  const timers = useRef([]);
  const gridBox = useRef(null);

  useEffect(() => { setFilter('all'); setFrozen(null); timers.current.forEach(clearTimeout); }, [trip]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // 锚点只用一次：网格（子组件的 layout effect 先跑）重排完就清掉，免得之后换排序时又跳回这间
  useEffect(() => { if (anchorId) setAnchorId(null); }, [anchorId]);

  const visible = useMemo(() => {
    return sortListings(listings.filter(l => inZone(l, filter)), sortBy, T);
  }, [listings, filter, sortBy, T]);

  // 冻结期间按冻结时的顺序显示（新出现的房源排在后面），数据照常更新
  const items = useMemo(() => {
    if (!frozen) return visible;
    const byId = new Map(visible.map(l => [l.id, l]));
    const kept = frozen.filter(id => byId.has(id)).map(id => byId.get(id));
    return kept.concat(visible.filter(l => !frozen.includes(l.id)));
  }, [visible, frozen]);

  const tabs = useMemo(() => zoneTabs(T, listings), [T, listings]);
  const zoneNames = tabs.map(t => t.name).filter(n => n !== NO_AREA);
  // 选中的区域标签没了（比如最后一间被改到别的区域）：回到「全部」
  useEffect(() => { if (filter !== 'all' && listings.length && !tabs.some(t => t.name === filter)) setFilter('all'); }, [tabs, filter, listings.length]);

  async function setArea(l, area) {
    const r = await api('/api/area', 'POST', { trip, id: l.id, area });
    if (r.ok) patch(l.id, () => r.listing); else alert('改区域失败：' + (r.error || ''));
  }

  function afterVote(id, votes) {
    if (sortBy === 'votes') setFrozen(f => f || items.map(l => l.id));
    patch(id, l => ({ ...l, votes }));
    timers.current.forEach(clearTimeout);
    timers.current = [setTimeout(() => {
      setAnchorId(id); setFrozen(null); setGlowId(id);
      timers.current.push(setTimeout(() => setGlowId(null), 1200));
    }, sortBy === 'votes' ? REORDER_DELAY : 0)];
  }

  async function vote(l, btn) {
    const t = trip;
    if ((l.votes || []).some(v => v.token === token)) {
      const r = await api('/api/vote', 'POST', { trip: t, id: l.id, token, name: null });
      if (r.ok && t === trip) afterVote(l.id, r.votes);
      return;
    }
    ensureName(async me => {
      const r = await api('/api/vote', 'POST', { trip: t, id: l.id, token: me.token, name: me.name });
      if (!r.ok || t !== trip) return;
      afterVote(l.id, r.votes);
      toast('🎉 投票成功！给「' + (l.title || '未命名房源') + '」+1');
      celebrateVote(btn);
    });
  }

  async function remove(l) {
    if (!confirm('确定要删除「' + (l.title || '未命名房源') + '」吗？删掉后大家就看不到了。')) return;
    const r = await api('/api/remove', 'POST', { trip, id: l.id });
    if (r.ok) await refresh(); else alert('删除失败，稍后再试');
  }

  function focusCard(id) {
    const el = gridBox.current?.querySelector('article[data-id="' + CSS.escape(id) + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  const fitKey = trip + '|' + filter + '|' + visible.map(l => l.id + (l.lat != null ? '@' : '')).sort().join(',');
  return (
    <>
      <AddListingForm trip={trip} T={T} zones={zoneNames} onAdded={refresh} />
      <Toolbar tabs={tabs} filter={filter} onFilter={setFilter} sortBy={sortBy} onSort={setSortBy} count={listings.length}
        showMap={showMap} onToggleMap={() => { save('showMap', showMap ? '0' : '1'); setShowMap(!showMap); }} />
      {showMap && <ListingMap items={visible} T={T} token={token} fitKey={fitKey} visible={active} hotId={hotId} onFocus={focusCard} />}
      <div ref={gridBox}>
        <ListingGrid items={items} T={T} token={token} glowId={glowId} anchorId={anchorId}
          emptyText={(filter === 'all' ? '还没有候选' : '这个区域还没有候选') + '，贴个 Airbnb 链接进来吧 👆'}
          zones={zoneNames} onVote={vote} onRemove={remove} onSetArea={setArea} onHover={setHotId} />
      </div>
    </>
  );
}

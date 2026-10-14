import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { TRIPS } from '../../lib/config.js';
import { load, save } from '../../lib/storage.js';
import { reduceMotion } from '../../lib/motion.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import AddListingForm from './AddListingForm.jsx';
import VoteBanner from './VoteBanner.jsx';
import DecisionPanel from './DecisionPanel.jsx';
import Toolbar from './Toolbar.jsx';
import ListingMap from './ListingMap.jsx';
import ListingGrid from './ListingGrid.jsx';
import { celebrateVote } from '../../lib/celebrate.js';
import { sortListings } from './price.js';
import { inZone, NO_AREA, zoneTabs } from './zones.js';
import { useListings } from './useListings.js';
import WeatherStrip from '../weather/WeatherStrip.jsx';
import './hunt.css';

const REORDER_DELAY = 700; // 投票后先在原位更新，过一会儿再按新票数重排

export default function HuntView({ trip, active }) {
  const T = TRIPS[trip];
  const { token, name, ensureName } = useSession();
  const toast = useToast();
  const { listings, refresh, patch, vote: voteInfo, setVote, loaded } = useListings(trip, token);
  const closed = !!voteInfo && !voteInfo.open;
  const isAdmin = String(name).toLowerCase() === 'aster';
  // 页面开着的时候到了截止时间：重新拉一次，切到结果面板
  useEffect(() => {
    if (!voteInfo || !voteInfo.open || !voteInfo.voteEndsAt) return;
    const ms = Date.parse(voteInfo.voteEndsAt) - Date.now() + 1500;
    if (ms > 2147483647) return; // setTimeout 等不了那么久，下次打开页面再说
    const id = setTimeout(refresh, Math.max(0, ms));
    return () => clearTimeout(id);
  }, [voteInfo, refresh]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('votes');
  const [showMap, setShowMap] = useState(() => load('showMap') !== '0');
  const [hotId, setHotId] = useState(null);
  const [frozen, setFrozen] = useState(null); // 投票后暂时保持的顺序
  const [anchorId, setAnchorId] = useState(null);
  const [glowId, setGlowId] = useState(null);
  const [popId, setPopId] = useState(null); // 刚投票的按钮弹一下
  const timers = useRef([]);
  const gridBox = useRef(null);
  const tripRef = useRef(trip); // 投票请求回来时用来判断是不是已经切到别的行程了
  tripRef.current = trip;

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
      if (r.ok && t === tripRef.current) afterVote(l.id, r.votes);
      return;
    }
    ensureName(async me => {
      const r = await api('/api/vote', 'POST', { trip: t, id: l.id, token: me.token, name: me.name });
      if (!r.ok) { if (r.error) { toast(r.error); refresh(); } return; }
      if (t !== tripRef.current) return; // 等待期间切了行程：这间已经不在页面上了
      afterVote(l.id, r.votes);
      toast('🎉 投票成功！给「' + (l.title || '未命名房源') + '」+1');
      if (!reduceMotion) { setPopId(l.id); timers.current.push(setTimeout(() => setPopId(null), 450)); }
      celebrateVote(btn);
    });
  }

  async function remove(l) {
    if (!confirm('确定要删除「' + (l.title || '未命名房源') + '」吗？删掉后大家就看不到了。')) return;
    const r = await api('/api/remove', 'POST', { trip, id: l.id });
    if (r.ok) await refresh(); else alert('删除失败：' + (r.error || '稍后再试'));
  }

  async function choose(l) {
    if (!confirm('把「' + (l.title || '未命名房源') + '」定为 ' + T.date + ' 的房子？')) return;
    ensureName(async me => {
      const r = await api('/api/decision', 'POST', { trip, name: me.name, token: me.token, listingId: l.id });
      if (r.ok) { setVote(r.vote); window.scrollTo({ top: 0, behavior: 'smooth' }); } else alert(r.error || '没成功');
    });
  }

  function focusCard(id) {
    const el = gridBox.current?.querySelector('article[data-id="' + CSS.escape(id) + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  // 选了某个区域时，在地图上方显示那里的天气（地点 = 这个区域房源位置的平均值）；「全部」「未分区」不显示
  const region = useMemo(() => {
    if (filter === 'all' || filter === NO_AREA) return null;
    const pts = visible.filter(l => l.lat != null && l.lng != null);
    if (!pts.length) return null;
    const avg = f => pts.reduce((t, l) => t + l[f], 0) / pts.length;
    return { name: filter, lat: Math.round(avg('lat') * 10) / 10, lng: Math.round(avg('lng') * 10) / 10 };
  }, [filter, visible]);

  const fitKey = trip + '|' + filter + '|' + visible.map(l => l.id + (l.lat != null ? '@' : '')).sort().join(',');
  return (
    <>
      {/* 切行程转场的分工（见 styles.css）：顶部小块 .trip-blur 带模糊，
          地图和房源网格 .trip-fade 只淡入，不参与模糊渲染。
          横幅是一个常驻的「槽」：投票数据要等 /api/state 回来才能知道
          显示倒计时还是结果面板，要是等数据到了才把整块挂上去，它会
          比不依赖数据的表单/工具条晚一拍单独动画着插进来（就是那种
          「别人都渲染好了它才出现」的感觉）。所以加载中先放一块同高
          的占位，槽从第一帧就在、动画只跑一次，数据到了原地换内容。 */}
      <div className="trip-blur">
        {!loaded ? (
          <VoteBanner vote={null} listings={listings} T={T} />
        ) : voteInfo && voteInfo.open && voteInfo.voteEndsAt ? (
          <VoteBanner vote={voteInfo} listings={listings} T={T} />
        ) : closed ? (
          <DecisionPanel trip={trip} T={T} vote={voteInfo} listings={listings} onVote={setVote} />
        ) : null}
      </div>
      <div className="trip-blur"><AddListingForm trip={trip} T={T} zones={zoneNames} closed={closed} onAdded={refresh} /></div>
      <div className="trip-blur">
        <Toolbar tabs={tabs} filter={filter} onFilter={setFilter} sortBy={sortBy} onSort={setSortBy} count={listings.length}
          showMap={showMap} onToggleMap={() => { save('showMap', showMap ? '0' : '1'); setShowMap(!showMap); }} />
        {region && <WeatherStrip trip={trip} name={region.name} lat={region.lat} lng={region.lng} />}
      </div>
      {showMap && <div className="trip-fade"><ListingMap items={visible} T={T} token={token} fitKey={fitKey} visible={active} hotId={hotId} onFocus={focusCard} /></div>}
      <div ref={gridBox} className="trip-fade">
        <ListingGrid items={items} T={T} token={token} glowId={glowId} popId={popId} anchorId={anchorId}
          emptyText={(filter === 'all' ? '还没有候选' : '这个区域还没有候选') + '，贴个 Airbnb 链接进来吧 👆'}
          zones={zoneNames} closed={closed} chosenId={voteInfo?.chosenId} onChoose={closed && isAdmin ? choose : null}
          onVote={vote} onRemove={remove} onSetArea={setArea} onHover={setHotId} />
      </div>
    </>
  );
}

import { NO_AREA } from './zones.js';

// 区域筛选（带房源数）、排序、地图开关、房源数
export default function Toolbar({ tabs, filter, onFilter, sortBy, onSort, showMap, onToggleMap, count }) {
  const chip = (key, label, n) => (
    <button key={key} onClick={() => onFilter(key)} className={'filter-chip glass-pill rounded-full px-4 py-1.5 text-sm' + (key === filter ? ' active' : '')}>
      {label}{n != null && <span className="ml-1 opacity-60">{n}</span>}
    </button>
  );
  return (
    <section className="flex flex-wrap items-center gap-2 mb-4">
      {chip('all', '全部')}
      {tabs.map(t => chip(t.name, t.name === NO_AREA ? '未分区' : t.name, t.count))}
      <select value={sortBy} onChange={e => onSort(e.target.value)} className="ml-auto glass-pill rounded-full px-4 py-1.5 text-sm">
        <option value="votes">按票数排序</option>
        <option value="price">按价格从低到高</option>
        <option value="added">按添加时间（最新在前）</option>
      </select>
      <button onClick={onToggleMap} className="glass-pill rounded-full px-4 py-1.5 text-sm hover:brightness-110">{showMap ? '🗺️ 隐藏地图' : '🗺️ 显示地图'}</button>
      <span className="text-sm text-slate-500 w-full md:w-auto">{count ? '共 ' + count + ' 间候选' : ''}</span>
    </section>
  );
}

// 区域筛选、排序、地图开关、房源数
export default function Toolbar({ T, filter, onFilter, sortBy, onSort, showMap, onToggleMap, count }) {
  return (
    <section className="flex flex-wrap items-center gap-2 mb-4">
      {['all'].concat(T.areas).map(a => (
        <button key={a} onClick={() => onFilter(a)} className={'filter-chip border rounded-full px-4 py-1.5 text-sm bg-white' + (a === filter ? ' active' : '')}>
          {a === 'all' ? '全部' : a}
        </button>
      ))}
      <select value={sortBy} onChange={e => onSort(e.target.value)} className="ml-auto border rounded-full px-4 py-1.5 text-sm bg-white">
        <option value="votes">按票数排序</option>
        <option value="price">按价格从低到高</option>
        <option value="added">按添加时间（最新在前）</option>
      </select>
      <button onClick={onToggleMap} className="border rounded-full px-4 py-1.5 text-sm bg-white hover:border-indigo-400">{showMap ? '🗺️ 隐藏地图' : '🗺️ 显示地图'}</button>
      <span className="text-sm text-slate-500 w-full md:w-auto">{count ? '共 ' + count + ' 间候选' : ''}</span>
    </section>
  );
}

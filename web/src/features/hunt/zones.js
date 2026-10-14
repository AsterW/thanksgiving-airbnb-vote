// 区域标签页：行程配置里的区域（固定顺序，一直显示），加上房源里实际出现的其他区域
// （后端按位置自动分的，或者有人手动改的；按房源数排）。没有区域的房源归到「未分区」。
export const NO_AREA = '__none';

export function zoneTabs(T, listings) {
  const counts = new Map();
  for (const l of listings) { const a = l.area || NO_AREA; counts.set(a, (counts.get(a) || 0) + 1); }
  const extra = [...counts.keys()].filter(a => a !== NO_AREA && !T.areas.includes(a))
    .sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));
  const tabs = T.areas.concat(extra).map(name => ({ name, count: counts.get(name) || 0 }));
  if (counts.get(NO_AREA)) tabs.push({ name: NO_AREA, count: counts.get(NO_AREA) });
  return tabs;
}

export const inZone = (l, filter) => filter === 'all' || (filter === NO_AREA ? !l.area : l.area === filter);

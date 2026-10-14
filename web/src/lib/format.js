export function statsLine(l) {
  const parts = [];
  if (l.bedrooms) parts.push(l.bedrooms + '卧');
  if (l.beds) parts.push(l.beds + '床');
  if (l.bathrooms) parts.push(l.bathrooms + '卫');
  if (l.sleeps) parts.push('可住' + l.sleeps + '人');
  return parts.length ? parts.join(' · ') : '户型信息待补充';
}

export function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? '刚刚' : m < 60 ? m + ' 分钟前' : m < 1440 ? Math.round(m / 60) + ' 小时前' : Math.round(m / 1440) + ' 天前';
}

export function fmtMoney(cents) {
  return '$' + (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const sameName = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// For the few places that build HTML strings (Leaflet pins and popups).
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

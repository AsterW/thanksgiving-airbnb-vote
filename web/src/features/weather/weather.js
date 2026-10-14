import { api } from '../../lib/api.js';

// 天气类别 → emoji 和中文（数据在后端：worker/weather，按地点和日期缓存，大家共用）
export const KINDS = {
  sun: { emoji: '☀️', label: '晴' },
  mostly: { emoji: '🌤️', label: '晴间多云' },
  partly: { emoji: '⛅', label: '多云' },
  cloud: { emoji: '☁️', label: '阴' },
  fog: { emoji: '🌫️', label: '雾' },
  drizzle: { emoji: '🌦️', label: '小雨' },
  rain: { emoji: '🌧️', label: '雨' },
  snow: { emoji: '❄️', label: '雪' },
  storm: { emoji: '⛈️', label: '雷雨' },
};

const cache = new Map(); // 这次打开页面里每个行程只查一次
export function tripWeather(trip) {
  if (!cache.has(trip)) cache.set(trip, api('/api/weather?trip=' + trip).then(r => {
    if (!r.ok) throw new Error('weather');
    if (r.rows.some(x => x.days.some(d => !d.kind))) cache.delete(trip); // 有几天没查到：下次显示时再问一次
    return r.rows;
  }).catch(e => { cache.delete(trip); throw e; }));
  return cache.get(trip);
}

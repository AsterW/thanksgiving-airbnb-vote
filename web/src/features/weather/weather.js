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

const round = x => Math.round(x * 10) / 10; // 和后端一样按 0.1°（约 10 km）取整，附近的地点共用一份
const cache = new Map(); // 这次打开页面里同一个行程 + 地点只查一次
export function placeWeather(trip, lat, lng) {
  const key = trip + '|' + round(lat) + ',' + round(lng);
  if (!cache.has(key)) cache.set(key, api('/api/weather?trip=' + trip + '&lat=' + round(lat) + '&lng=' + round(lng)).then(r => {
    if (!r.ok) throw new Error('weather');
    if (r.days.some(d => !d.kind)) cache.delete(key); // 有几天没查到：下次显示时再问一次
    return r.days;
  }).catch(e => { cache.delete(key); throw e; }));
  return cache.get(key);
}

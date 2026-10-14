// Weather from Open-Meteo (free, no key). Forecasts only reach 16 days out;
// days further away use the same dates over the past 5 years ("history").
const TZ = 'America/Denver';
const HISTORY_YEARS = 5;
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min';

// WMO weather code -> kind. rank: worse weather wins history ties.
const RANK = { sun: 0, mostly: 1, partly: 2, cloud: 3, fog: 4, drizzle: 5, rain: 6, snow: 7, storm: 8 };
export function kindOf(code) {
  if (code === 0) return 'sun';
  if (code === 1) return 'mostly';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloud';
}

// Every day of a stay, check-in to check-out inclusive.
export function stayDays(checkIn, checkOut) {
  const out = [];
  for (let d = new Date(checkIn + 'T12:00:00Z'); d <= new Date(checkOut + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'thanksgiving-airbnb-vote/1.0' } });
  if (!r.ok) throw new Error('open-meteo ' + r.status);
  return r.json();
}
const byDate = daily => Object.fromEntries(daily.time.map((t, i) => [t, { code: daily.weather_code[i], hi: daily.temperature_2m_max[i], lo: daily.temperature_2m_min[i] }]));
const query = p => '?latitude=' + p.lat + '&longitude=' + p.lng + '&timezone=' + encodeURIComponent(TZ) + '&daily=' + DAILY;

// { date: { kind, hi, lo } } for the days Open-Meteo forecasts (next 16).
export async function fetchForecast(place) {
  const days = byDate((await getJson('https://api.open-meteo.com/v1/forecast' + query(place) + '&forecast_days=16')).daily);
  return Object.fromEntries(Object.entries(days).filter(([, d]) => d.code != null)
    .map(([date, d]) => [date, { kind: kindOf(d.code), hi: d.hi, lo: d.lo }]));
}

// { date: { kind, hi, lo, snowYears, years } }: the most common weather on that
// date over the past 5 years, and average highs and lows.
export async function fetchHistory(place, days) {
  const year = Number(days[0].slice(0, 4));
  const md = d => d.slice(4); // "-11-26"
  // One year at a time: bursts of parallel requests get rate-limited, and this runs once per place (it's cached).
  const years = [];
  for (let y = year - 1; y >= year - HISTORY_YEARS; y--) {
    const r = await getJson('https://archive-api.open-meteo.com/v1/archive' + query(place) + '&start_date=' + y + md(days[0]) + '&end_date=' + y + md(days[days.length - 1]));
    years.push({ y, days: byDate(r.daily) });
  }
  const out = {};
  for (const d of days) {
    const samples = years.map(({ y, days: ds }) => ds[y + md(d)]).filter(s => s && s.code != null);
    if (!samples.length) continue;
    const counts = {};
    for (const s of samples) { const k = kindOf(s.code); counts[k] = (counts[k] || 0) + 1; }
    const kind = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || RANK[b] - RANK[a])[0];
    const avg = f => samples.reduce((t, s) => t + s[f], 0) / samples.length;
    out[d] = { kind, hi: avg('hi'), lo: avg('lo'), snowYears: counts.snow || 0, years: samples.length };
  }
  return out;
}

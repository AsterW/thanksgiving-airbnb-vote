// GET /api/weather?trip=…: each weather place of the trip, one entry per day.
// Cached in KV for everyone: history never changes (kept for good), the
// forecast is refreshed at most every 3 hours. So Open-Meteo sees a few calls
// a day no matter how many people open the page.
import { j } from '../lib/http.js';
import { tripOf } from '../config/trips.js';
import { fetchForecast, fetchHistory, stayDays } from './openmeteo.js';

const FORECAST_TTL_MS = 3 * 60 * 60 * 1000;

async function placeWeather(env, place, days) {
  const key = 'weather:v1:' + place.lat + ',' + place.lng + ':' + days[0] + ':' + days[days.length - 1];
  const raw = await env.VOTES_KV.get(key);
  const c = raw ? JSON.parse(raw) : {};
  let changed = false;
  if (!c.forecast || c.forecastAt < Date.now() - FORECAST_TTL_MS) {
    try { c.forecast = await fetchForecast(place); c.forecastAt = Date.now(); changed = true; } catch (e) { /* keep the old one */ }
  }
  const forecast = c.forecast || {};
  const missing = days.filter(d => !forecast[d] && !(c.history && c.history[d]));
  if (missing.length) {
    try { c.history = { ...c.history, ...(await fetchHistory(place, missing)) }; changed = true; } catch (e) { /* try again next time */ }
  }
  if (changed) await env.VOTES_KV.put(key, JSON.stringify(c));
  return days.map(d => forecast[d] ? { date: d, ...forecast[d], source: 'forecast' }
    : c.history && c.history[d] ? { date: d, ...c.history[d], source: 'history' } : { date: d, kind: null });
}

async function handleWeather(req, env, url) {
  const trip = tripOf(url.searchParams.get('trip'));
  const days = stayDays(trip.checkIn, trip.checkOut);
  const rows = await Promise.all((trip.weatherAt || []).map(async p => ({ place: p.name, days: await placeWeather(env, p, days) })));
  return j({ ok: true, rows });
}

export const routes = { 'GET /api/weather': handleWeather };
